package operato.wms.oms.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.annotation.JacksonInject.Value;

import operato.wms.base.entity.SKU;
import operato.wms.oms.entity.ImportShipmentOrder;
import operato.wms.oms.entity.ShipmentDelivery;
import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.oms.entity.ShipmentOrderItem;
import operato.wms.oms.entity.ShipmentWave;
import operato.wms.oms.entity.StockAllocation;
import operato.wms.stock.entity.Inventory;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.anythings.sys.util.AnyOrmUtil;
import xyz.elidom.dbist.dml.Filter;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * OMS 트랜잭션 서비스
 *
 * 출하 주문 임포트(검증/등록) 처리를 담당한다.
 *
 * @author HatioLab
 */
@Component
public class OmsTransactionService extends AbstractQueryService {

	/**
	 * 임포트 데이터 검증
	 *
	 * @param list    임포트 대상 데이터
	 * @param bizType 업무유형 (B2C_OUT / B2B_OUT)
	 * @return 검증 결과 { total, valid, error, rows: [ { ...fields, rowNo, valid,
	 *         errorMessages } ] }
	 */
	public Map<String, Object> validateImportData(List<ImportShipmentOrder> list, String bizType) {
		Long domainId = Domain.currentDomainId();
		int total = list.size();
		int validCount = 0;
		int errorCount = 0;
		List<Map<String, Object>> rows = new ArrayList<>();

		for (int i = 0; i < list.size(); i++) {
			ImportShipmentOrder row = list.get(i);
			List<String> errors = new ArrayList<>();

			// 1. 필수 필드 검증
			if (ValueUtil.isEmpty(row.getRefOrderNo())) {
				errors.add("참조 주문번호(ref_order_no)가 누락되었습니다");
			}
			if (ValueUtil.isEmpty(row.getSkuCd())) {
				errors.add("상품코드(sku_cd)가 누락되었습니다");
			}
			if (row.getOrderQty() == null || row.getOrderQty() <= 0) {
				errors.add("주문 수량은 양수여야 합니다");
			}

			// 2. SKU 존재 여부 검증
			if (ValueUtil.isNotEmpty(row.getSkuCd())) {
				Query skuQuery = new Query();
				skuQuery.addFilter(new Filter("domainId", domainId));
				skuQuery.addFilter(new Filter("skuCd", row.getSkuCd()));
				SKU sku = this.queryManager.selectByCondition(SKU.class, skuQuery);
				if (sku == null) {
					errors.add("SKU [" + row.getSkuCd() + "]가 존재하지 않습니다");
				}
			}

			// 3. 날짜 형식 검증
			if (ValueUtil.isNotEmpty(row.getOrderDate()) && !row.getOrderDate().matches("\\d{4}-\\d{2}-\\d{2}")) {
				errors.add("주문일 날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)");
			}
			if (ValueUtil.isNotEmpty(row.getShipByDate()) && !row.getShipByDate().matches("\\d{4}-\\d{2}-\\d{2}")) {
				errors.add("출하기한 날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)");
			}

			// 4. 참조번호 중복 검증 (기존 데이터)
			if (ValueUtil.isNotEmpty(row.getRefOrderNo())) {
				String sqlDup = "SELECT COUNT(*) FROM shipment_orders WHERE domain_id = :domainId AND ref_order_no = :refOrderNo";
				Map<String, Object> dupParams = ValueUtil.newMap("domainId,refOrderNo", domainId, row.getRefOrderNo());
				Integer dupCount = this.queryManager.selectBySql(sqlDup, dupParams, Integer.class);
				if (dupCount != null && dupCount > 0) {
					errors.add("참조 주문번호 [" + row.getRefOrderNo() + "]가 이미 존재합니다");
				}
			}

			// 결과 행 구성
			Map<String, Object> resultRow = new HashMap<>();
			resultRow.put("rowNo", i + 1);
			resultRow.put("refOrderNo", row.getRefOrderNo());
			resultRow.put("skuCd", row.getSkuCd());
			resultRow.put("skuNm", row.getSkuNm());
			resultRow.put("orderQty", row.getOrderQty());
			resultRow.put("orderDate", row.getOrderDate());
			resultRow.put("shipByDate", row.getShipByDate());
			resultRow.put("custCd", row.getCustCd());
			resultRow.put("custNm", row.getCustNm());
			resultRow.put("carrierCd", row.getCarrierCd());
			resultRow.put("receiverNm", row.getReceiverNm());
			resultRow.put("bizType", ValueUtil.isNotEmpty(row.getBizType()) ? row.getBizType() : bizType);

			if (errors.isEmpty()) {
				resultRow.put("valid", true);
				resultRow.put("errorMessages", new ArrayList<>());
				validCount++;
			} else {
				resultRow.put("valid", false);
				resultRow.put("errorMessages", errors);
				errorCount++;
			}
			rows.add(resultRow);
		}

		Map<String, Object> result = new HashMap<>();
		result.put("total", total);
		result.put("valid", validCount);
		result.put("error", errorCount);
		result.put("rows", rows);
		return result;
	}

	/**
	 * 출하 주문 임포트 확정 처리
	 *
	 * ImportShipmentOrder 리스트를 ref_order_no 기준으로 그룹핑하여
	 * ShipmentOrder(헤더) + ShipmentOrderItem(상세) + ShipmentDelivery(배송) 생성
	 *
	 * @param list 임포트 확정 대상 데이터
	 * @return 처리 결과 { totalRows, orderCount, itemCount, deliveryCount, skippedRows
	 *         }
	 */
	public Map<String, Object> importShipmentOrders(List<ImportShipmentOrder> list) {
		Long domainId = Domain.currentDomainId();
		String today = DateUtil.todayStr();

		// ref_order_no 기준으로 그룹핑
		Map<String, List<ImportShipmentOrder>> grouped = new LinkedHashMap<>();
		for (ImportShipmentOrder row : list) {
			String key = ValueUtil.isNotEmpty(row.getRefOrderNo()) ? row.getRefOrderNo()
					: ("AUTO-" + System.nanoTime());
			grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(row);
		}

		int orderCount = 0;
		int itemCount = 0;
		int deliveryCount = 0;
		List<ShipmentOrder> newOrders = new ArrayList<>();
		List<ShipmentOrderItem> newItems = new ArrayList<>();
		List<ShipmentDelivery> newDeliveries = new ArrayList<>();

		for (Map.Entry<String, List<ImportShipmentOrder>> entry : grouped.entrySet()) {
			List<ImportShipmentOrder> rows = entry.getValue();
			ImportShipmentOrder firstRow = rows.get(0);

			// 1. ShipmentOrder 헤더 생성
			ShipmentOrder order = new ShipmentOrder();
			order.setDomainId(domainId);
			order.setRefOrderNo(firstRow.getRefOrderNo());
			order.setOrderDate(ValueUtil.isNotEmpty(firstRow.getOrderDate()) ? firstRow.getOrderDate() : today);
			order.setShipByDate(firstRow.getShipByDate());
			order.setComCd(firstRow.getComCd());
			order.setCustCd(firstRow.getCustCd());
			order.setCustNm(firstRow.getCustNm());
			order.setWhCd(ValueUtil.isNotEmpty(firstRow.getWhCd()) ? firstRow.getWhCd() : "DEFAULT");
			order.setBizType(firstRow.getBizType());
			order.setShipType(firstRow.getShipType());
			order.setDlvType(firstRow.getDlvType());
			order.setPriorityCd(ValueUtil.isNotEmpty(firstRow.getPriorityCd()) ? firstRow.getPriorityCd() : "NORMAL");
			order.setCarrierCd(firstRow.getCarrierCd());
			order.setRemarks(firstRow.getRemarks());
			order.setAttr01(firstRow.getAttr01());
			order.setAttr02(firstRow.getAttr02());
			order.setAttr03(firstRow.getAttr03());
			order.setAttr04(firstRow.getAttr04());
			order.setAttr05(firstRow.getAttr05());
			order.setStatus(ShipmentOrder.STATUS_REGISTERED);

			// 주문수량 합산
			double totalQty = 0;
			for (ImportShipmentOrder row : rows) {
				totalQty += (row.getOrderQty() != null ? row.getOrderQty() : 0);
			}
			order.setTotalItemCount(rows.size());
			order.setTotalOrderQty(totalQty);
			order.setTotalAllocQty(0.0);
			order.setTotalShippedQty(0.0);

			// shipmentNo는 beforeCreate()에서 자동 생성
			this.queryManager.insert(order);
			newOrders.add(order);
			orderCount++;

			// 2. ShipmentOrderItem 상세 생성
			int lineSeq = 1;
			for (ImportShipmentOrder row : rows) {
				ShipmentOrderItem item = new ShipmentOrderItem();
				item.setDomainId(domainId);
				item.setShipmentOrderId(order.getId());
				item.setLineNo(ValueUtil.isNotEmpty(row.getLineNo()) ? row.getLineNo() : String.valueOf(lineSeq));
				item.setSkuCd(row.getSkuCd());
				item.setSkuNm(row.getSkuNm());
				item.setOrderQty(row.getOrderQty());
				item.setBarcode(row.getBarcode());
				item.setExpiredDate(row.getExpiredDate());
				item.setLotNo(row.getLotNo());
				item.setUnitPrice(row.getUnitPrice());
				item.setStatus(ShipmentOrderItem.STATUS_REGISTERED);
				newItems.add(item);
				lineSeq++;
				itemCount++;
			}

			// 3. ShipmentDelivery 배송정보 생성 (배송정보가 있는 경우)
			if (ValueUtil.isNotEmpty(firstRow.getReceiverNm()) || ValueUtil.isNotEmpty(firstRow.getCarrierCd())) {
				ShipmentDelivery delivery = new ShipmentDelivery();
				delivery.setDomainId(domainId);
				delivery.setShipmentOrderId(order.getId());
				delivery.setShipmentNo(order.getShipmentNo());
				delivery.setDlvType(firstRow.getDlvType());
				delivery.setCarrierCd(firstRow.getCarrierCd());
				delivery.setCarrierServiceType(firstRow.getCarrierServiceType());
				delivery.setSenderNm(firstRow.getSenderNm());
				delivery.setSenderPhone(firstRow.getSenderPhone());
				delivery.setSenderZipCd(firstRow.getSenderZipCd());
				delivery.setSenderAddr(firstRow.getSenderAddr());
				delivery.setOrdererNm(firstRow.getOrdererNm());
				delivery.setReceiverNm(firstRow.getReceiverNm());
				delivery.setReceiverPhone(firstRow.getReceiverPhone());
				delivery.setReceiverZipCd(firstRow.getReceiverZipCd());
				delivery.setReceiverAddr(firstRow.getReceiverAddr());
				delivery.setReceiverAddr2(firstRow.getReceiverAddr2());
				delivery.setDeliveryMemo(firstRow.getDeliveryMemo());
				newDeliveries.add(delivery);
				deliveryCount++;
			}
		}

		// 일괄 insert (헤더는 이미 개별 insert 완료)
		if (!newItems.isEmpty()) {
			AnyOrmUtil.insertBatch(newItems, 100);
		}
		if (!newDeliveries.isEmpty()) {
			AnyOrmUtil.insertBatch(newDeliveries, 100);
		}

		Map<String, Object> result = new HashMap<>();
		result.put("totalRows", list.size());
		result.put("orderCount", orderCount);
		result.put("itemCount", itemCount);
		result.put("deliveryCount", deliveryCount);
		return result;
	}

	/**
	 * 자동 웨이브 생성
	 *
	 * ALLOCATED 상태 주문을 그룹핑 기준에 따라 웨이브로 묶는다.
	 *
	 * @param params { groupBy: ["carrier_cd", ...], pickType, exeType,
	 *               maxOrderCount, orderDate }
	 * @return 처리 결과 { waveCount, totalOrders, waves: [...] }
	 */
	@SuppressWarnings("unchecked")
	public Map<String, Object> createAutoWaves(Map<String, Object> params) {
		Long domainId = Domain.currentDomainId();
		String today = DateUtil.todayStr();

		List<String> groupBy = params.get("groupBy") != null ? (List<String>) params.get("groupBy") : new ArrayList<>();
		String pickType = ValueUtil.isNotEmpty(params.get("pickType")) ? params.get("pickType").toString() : "TOTAL";
		String exeType = ValueUtil.isNotEmpty(params.get("exeType")) ? params.get("exeType").toString() : "BATCH";
		int maxOrderCount = params.get("maxOrderCount") != null
				? Integer.parseInt(params.get("maxOrderCount").toString())
				: 200;
		String orderDate = ValueUtil.isNotEmpty(params.get("orderDate")) ? params.get("orderDate").toString() : today;

		// 1. ALLOCATED 상태 주문 조회
		String orderSql = "SELECT * FROM shipment_orders WHERE domain_id = :domainId AND status = :status AND order_date = :orderDate ORDER BY priority_cd, created_at";
		Map<String, Object> orderParams = ValueUtil.newMap("domainId,status,orderDate", domainId,
				ShipmentOrder.STATUS_ALLOCATED, orderDate);
		List<ShipmentOrder> orders = this.queryManager.selectListBySql(orderSql, orderParams, ShipmentOrder.class, 0,
				0);

		if (orders.isEmpty()) {
			Map<String, Object> emptyResult = new HashMap<>();
			emptyResult.put("waveCount", 0);
			emptyResult.put("totalOrders", 0);
			emptyResult.put("waves", new ArrayList<>());
			return emptyResult;
		}

		// 2. 그룹핑 기준에 따라 주문 분류
		Map<String, List<ShipmentOrder>> grouped = new LinkedHashMap<>();
		for (ShipmentOrder order : orders) {
			String groupKey = this.buildGroupKey(order, groupBy);
			grouped.computeIfAbsent(groupKey, k -> new ArrayList<>()).add(order);
		}

		// 3. 당일 최대 wave_seq 조회
		String seqSql = "SELECT COALESCE(MAX(wave_seq), 0) FROM shipment_waves WHERE domain_id = :domainId AND wave_date = :waveDate";
		Map<String, Object> seqParams = ValueUtil.newMap("domainId,waveDate", domainId, today);
		Integer maxSeq = this.queryManager.selectBySql(seqSql, seqParams, Integer.class);
		int nextSeq = (maxSeq != null ? maxSeq : 0) + 1;

		// 4. 그룹별 웨이브 생성
		int waveCount = 0;
		int totalOrderCount = 0;
		List<Map<String, Object>> waveResults = new ArrayList<>();

		for (Map.Entry<String, List<ShipmentOrder>> entry : grouped.entrySet()) {
			List<ShipmentOrder> groupOrders = entry.getValue();

			// maxOrderCount 기준으로 분할
			for (int i = 0; i < groupOrders.size(); i += maxOrderCount) {
				List<ShipmentOrder> chunk = groupOrders.subList(i, Math.min(i + maxOrderCount, groupOrders.size()));

				// 웨이브 번호 생성
				String waveNo = "WAVE-" + today.replace("-", "") + "-" + String.format("%03d", nextSeq);

				// 계획 수량 집계
				int planOrderCnt = chunk.size();
				double planTotalQty = 0;
				int planSkuCnt = 0;

				List<String> orderIds = new ArrayList<>();
				for (ShipmentOrder ord : chunk) {
					planTotalQty += (ord.getTotalOrderQty() != null ? ord.getTotalOrderQty() : 0);
					orderIds.add(ord.getId());
				}

				// SKU 종류 집계 (주문 품목 기준)
				String skuCountSql = "SELECT COUNT(DISTINCT sku_cd) FROM shipment_order_items WHERE domain_id = :domainId AND shipment_order_id IN (:orderIds)";
				Map<String, Object> skuCountParams = ValueUtil.newMap("domainId,orderIds", domainId, orderIds);
				Integer skuCnt = this.queryManager.selectBySql(skuCountSql, skuCountParams, Integer.class);
				planSkuCnt = skuCnt != null ? skuCnt : 0;

				// 대표 택배사 (첫 번째 주문 기준)
				String carrierCd = chunk.get(0).getCarrierCd();

				// ShipmentWave 생성
				ShipmentWave wave = new ShipmentWave();
				wave.setDomainId(domainId);
				wave.setWaveNo(waveNo);
				wave.setWaveDate(today);
				wave.setWaveSeq(nextSeq);
				wave.setPickType(pickType);
				wave.setExeType(exeType);
				wave.setCarrierCd(carrierCd);
				wave.setPlanOrderCount(planOrderCnt);
				wave.setPlanSkuCount(planSkuCnt);
				wave.setPlanTotalQty(planTotalQty);
				wave.setResultOrderCount(0);
				wave.setResultSkuCount(0);
				wave.setResultTotalQty(0.0);
				wave.setStatus(ShipmentWave.STATUS_CREATED);
				this.queryManager.insert(wave);

				// 주문에 wave_no 업데이트 및 상태 변경
				for (ShipmentOrder ord : chunk) {
					String updateSql = "UPDATE shipment_orders SET wave_no = :waveNo, status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
					Map<String, Object> updateParams = ValueUtil.newMap("waveNo,status,domainId,id", waveNo,
							ShipmentOrder.STATUS_WAVED, domainId, ord.getId());
					this.queryManager.executeBySql(updateSql, updateParams);
				}

				// 결과 수집
				Map<String, Object> waveInfo = new HashMap<>();
				waveInfo.put("waveNo", waveNo);
				waveInfo.put("waveSeq", nextSeq);
				waveInfo.put("orderCount", planOrderCnt);
				waveInfo.put("skuCount", planSkuCnt);
				waveInfo.put("totalQty", planTotalQty);
				waveInfo.put("carrierCd", carrierCd);
				waveResults.add(waveInfo);

				waveCount++;
				totalOrderCount += planOrderCnt;
				nextSeq++;
			}
		}

		Map<String, Object> result = new HashMap<>();
		result.put("waveCount", waveCount);
		result.put("totalOrders", totalOrderCount);
		result.put("waves", waveResults);
		return result;
	}

	/**
	 * 그룹핑 키 생성
	 */
	private String buildGroupKey(ShipmentOrder order, List<String> groupBy) {
		if (groupBy.isEmpty()) {
			return "ALL";
		}

		StringBuilder sb = new StringBuilder();
		for (String field : groupBy) {
			if (sb.length() > 0)
				sb.append("||");
			switch (field) {
				case "carrier_cd":
					sb.append(ValueUtil.isNotEmpty(order.getCarrierCd()) ? order.getCarrierCd() : "NONE");
					break;
				case "cust_cd":
					sb.append(ValueUtil.isNotEmpty(order.getCustCd()) ? order.getCustCd() : "NONE");
					break;
				case "biz_type":
					sb.append(ValueUtil.isNotEmpty(order.getBizType()) ? order.getBizType() : "NONE");
					break;
				case "ship_type":
					sb.append(ValueUtil.isNotEmpty(order.getShipType()) ? order.getShipType() : "NONE");
					break;
				default:
					sb.append("UNKNOWN");
					break;
			}
		}
		return sb.toString();
	}

	/**
	 * 자동 웨이브 대상 건수 미리보기
	 *
	 * @param orderDate 주문일자
	 * @return { totalOrders }
	 */
	public Map<String, Object> previewAutoWaveTargets(String orderDate) {
		Long domainId = Domain.currentDomainId();
		String targetDate = ValueUtil.isNotEmpty(orderDate) ? orderDate : DateUtil.todayStr();

		String sql = "SELECT COUNT(*) FROM shipment_orders WHERE domain_id = :domainId AND status = :status AND order_date = :orderDate";
		Map<String, Object> params = ValueUtil.newMap("domainId,status,orderDate", domainId,
				ShipmentOrder.STATUS_ALLOCATED, targetDate);
		Integer count = this.queryManager.selectBySql(sql, params, Integer.class);

		Map<String, Object> result = new HashMap<>();
		result.put("totalOrders", count != null ? count : 0);
		return result;
	}

	/* ============================================================
	 * 출하 주문 상태 변경
	 * ============================================================ */

	/**
	 * 출하 주문 확정 (REGISTERED → CONFIRMED)
	 *
	 * @param ids 주문 ID 리스트
	 * @return { successCount, failCount, errors }
	 */
	public Map<String, Object> confirmShipmentOrders(List<String> ids) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();
		int successCount = 0;
		int failCount = 0;
		List<String> errors = new ArrayList<>();

		for (String id : ids) {
			ShipmentOrder order = this.findOrder(domainId, id);
			if (order == null) {
				errors.add("주문을 찾을 수 없습니다: " + id);
				failCount++;
				continue;
			}

			if (!ShipmentOrder.STATUS_REGISTERED.equals(order.getStatus())) {
				errors.add("주문 [" + order.getShipmentNo() + "] 상태가 [" + order.getStatus() + "]이므로 확정할 수 없습니다");
				failCount++;
				continue;
			}

			String sql = "UPDATE shipment_orders SET status = :status, confirmed_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> params = ValueUtil.newMap("status,now,domainId,id",
					ShipmentOrder.STATUS_CONFIRMED, now, domainId, id);
			this.queryManager.executeBySql(sql, params);
			successCount++;
		}

		Map<String, Object> result = new HashMap<>();
		result.put("successCount", successCount);
		result.put("failCount", failCount);
		result.put("errors", errors);
		return result;
	}

	/**
	 * 출하 주문 재고 할당 (CONFIRMED/BACK_ORDER → ALLOCATED 또는 BACK_ORDER)
	 *
	 * 각 주문 상세의 SKU를 기준으로 가용 재고를 조회하여 FEFO 순서로 할당한다.
	 * 전체 할당 완료 시 ALLOCATED, 부분 할당 시 BACK_ORDER로 상태 변경.
	 *
	 * @param ids 주문 ID 리스트
	 * @return { successCount, allocatedCount, backOrderCount }
	 */
	public Map<String, Object> allocateShipmentOrders(List<String> ids) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();
		int successCount = 0;
		int allocatedCount = 0;
		int backOrderCount = 0;
		List<String> errors = new ArrayList<>();

		for (String orderId : ids) {
			ShipmentOrder order = this.findOrder(domainId, orderId);
			if (order == null) {
				errors.add("주문을 찾을 수 없습니다: " + orderId);
				continue;
			}

			if (!ShipmentOrder.STATUS_CONFIRMED.equals(order.getStatus())
					&& !ShipmentOrder.STATUS_BACK_ORDER.equals(order.getStatus())) {
				errors.add("주문 [" + order.getShipmentNo() + "] 상태가 [" + order.getStatus() + "]이므로 할당할 수 없습니다");
				continue;
			}

			// 주문 상세 조회
			String itemSql = "SELECT * FROM shipment_order_items WHERE domain_id = :domainId AND shipment_order_id = :orderId ORDER BY line_no";
			Map<String, Object> itemParams = ValueUtil.newMap("domainId,orderId", domainId, orderId);
			List<ShipmentOrderItem> items = this.queryManager.selectListBySql(itemSql, itemParams, ShipmentOrderItem.class, 0, 0);

			if (items.isEmpty()) {
				errors.add("주문 [" + order.getShipmentNo() + "]에 상세 항목이 없습니다");
				continue;
			}

			double totalAllocQty = 0;
			double totalOrderQty = 0;
			boolean hasShort = false;

			for (ShipmentOrderItem item : items) {
				double orderQty = item.getOrderQty() != null ? item.getOrderQty() : 0;
				double existingAllocQty = item.getAllocQty() != null ? item.getAllocQty() : 0;
				double needQty = orderQty - existingAllocQty;
				totalOrderQty += orderQty;

				if (needQty <= 0) {
					totalAllocQty += existingAllocQty;
					continue;
				}

				// 가용 재고 조회 (FEFO: 유통기한 임박순)
				String invSql = "SELECT * FROM inventories WHERE domain_id = :domainId AND sku_cd = :skuCd"
						+ " AND status = :status AND (del_flag IS NULL OR del_flag = false)"
						+ " AND (inv_qty - COALESCE(reserved_qty, 0)) > 0"
						+ " ORDER BY expired_date ASC NULLS LAST, created_at ASC";
				Map<String, Object> invParams = ValueUtil.newMap("domainId,skuCd,status",
						domainId, item.getSkuCd(), Inventory.STATUS_STORED);
				List<Inventory> inventories = this.queryManager.selectListBySql(invSql, invParams, Inventory.class, 0, 0);

				double itemAllocQty = existingAllocQty;

				for (Inventory inv : inventories) {
					if (needQty <= 0) break;

					double invQty = inv.getInvQty() != null ? inv.getInvQty() : 0;
					double reservedQty = inv.getReservedQty() != null ? inv.getReservedQty() : 0;
					double availQty = invQty - reservedQty;

					if (availQty <= 0) continue;

					double allocQty = Math.min(needQty, availQty);

					// StockAllocation 생성
					StockAllocation alloc = new StockAllocation();
					alloc.setDomainId(domainId);
					alloc.setShipmentOrderId(orderId);
					alloc.setShipmentOrderItemId(item.getId());
					alloc.setInventoryId(inv.getId());
					alloc.setSkuCd(item.getSkuCd());
					alloc.setBarcode(inv.getBarcode());
					alloc.setLocCd(inv.getLocCd());
					alloc.setLotNo(inv.getLotNo());
					alloc.setExpiredDate(inv.getExpiredDate());
					alloc.setAllocQty(allocQty);
					alloc.setAllocStrategy("FEFO");
					alloc.setStatus(StockAllocation.STATUS_HARD);
					alloc.setAllocatedAt(now);
					this.queryManager.insert(alloc);

					// Inventory reserved_qty 증가
					String updInvSql = "UPDATE inventories SET reserved_qty = COALESCE(reserved_qty, 0) + :allocQty, updated_at = now() WHERE domain_id = :domainId AND id = :invId";
					Map<String, Object> updInvParams = ValueUtil.newMap("allocQty,domainId,invId", allocQty, domainId, inv.getId());
					this.queryManager.executeBySql(updInvSql, updInvParams);

					itemAllocQty += allocQty;
					needQty -= allocQty;
				}

				// ShipmentOrderItem 업데이트
				double shortQty = orderQty - itemAllocQty;
				String updItemSql = "UPDATE shipment_order_items SET alloc_qty = :allocQty, short_qty = :shortQty, updated_at = now() WHERE domain_id = :domainId AND id = :itemId";
				Map<String, Object> updItemParams = ValueUtil.newMap("allocQty,shortQty,domainId,itemId", itemAllocQty, shortQty, domainId, item.getId());
				this.queryManager.executeBySql(updItemSql, updItemParams);

				totalAllocQty += itemAllocQty;
				if (shortQty > 0) hasShort = true;
			}

			// 주문 헤더 상태 업데이트
			String newStatus = hasShort ? ShipmentOrder.STATUS_BACK_ORDER : ShipmentOrder.STATUS_ALLOCATED;
			String updOrderSql = "UPDATE shipment_orders SET status = :status, total_alloc_qty = :totalAllocQty, allocated_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> updOrderParams = ValueUtil.newMap("status,totalAllocQty,now,domainId,id",
					newStatus, totalAllocQty, now, domainId, orderId);
			this.queryManager.executeBySql(updOrderSql, updOrderParams);

			successCount++;
			if (hasShort) {
				backOrderCount++;
			} else {
				allocatedCount++;
			}
		}

		Map<String, Object> result = new HashMap<>();
		result.put("successCount", successCount);
		result.put("allocatedCount", allocatedCount);
		result.put("backOrderCount", backOrderCount);
		result.put("errors", errors);
		return result;
	}

	/**
	 * 출하 주문 할당 해제 (ALLOCATED → CONFIRMED)
	 *
	 * @param id 주문 ID
	 * @return { success, releasedCount }
	 */
	public Map<String, Object> deallocateShipmentOrder(String id) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		ShipmentOrder order = this.findOrder(domainId, id);
		if (order == null) {
			throw new RuntimeException("주문을 찾을 수 없습니다: " + id);
		}

		if (!ShipmentOrder.STATUS_ALLOCATED.equals(order.getStatus())) {
			throw new RuntimeException("주문 상태가 [" + order.getStatus() + "]이므로 할당을 해제할 수 없습니다");
		}

		// 할당 레코드 조회
		String allocSql = "SELECT * FROM stock_allocations WHERE domain_id = :domainId AND shipment_order_id = :orderId AND status IN (:s1, :s2)";
		Map<String, Object> allocParams = ValueUtil.newMap("domainId,orderId,s1,s2",
				domainId, id, StockAllocation.STATUS_SOFT, StockAllocation.STATUS_HARD);
		List<StockAllocation> allocations = this.queryManager.selectListBySql(allocSql, allocParams, StockAllocation.class, 0, 0);

		// 각 할당 해제
		for (StockAllocation alloc : allocations) {
			// Inventory reserved_qty 복원
			String updInvSql = "UPDATE inventories SET reserved_qty = GREATEST(COALESCE(reserved_qty, 0) - :allocQty, 0), updated_at = now() WHERE domain_id = :domainId AND id = :invId";
			Map<String, Object> updInvParams = ValueUtil.newMap("allocQty,domainId,invId",
					alloc.getAllocQty(), domainId, alloc.getInventoryId());
			this.queryManager.executeBySql(updInvSql, updInvParams);

			// StockAllocation 상태 변경
			String updAllocSql = "UPDATE stock_allocations SET status = :status, released_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :allocId";
			Map<String, Object> updAllocParams = ValueUtil.newMap("status,now,domainId,allocId",
					StockAllocation.STATUS_CANCELLED, now, domainId, alloc.getId());
			this.queryManager.executeBySql(updAllocSql, updAllocParams);
		}

		// ShipmentOrderItem alloc_qty 초기화
		String updItemsSql = "UPDATE shipment_order_items SET alloc_qty = 0, short_qty = order_qty, updated_at = now() WHERE domain_id = :domainId AND shipment_order_id = :orderId";
		Map<String, Object> updItemsParams = ValueUtil.newMap("domainId,orderId", domainId, id);
		this.queryManager.executeBySql(updItemsSql, updItemsParams);

		// 주문 헤더 상태 복원
		String updOrderSql = "UPDATE shipment_orders SET status = :status, total_alloc_qty = 0, allocated_at = null, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updOrderParams = ValueUtil.newMap("status,domainId,id",
				ShipmentOrder.STATUS_CONFIRMED, domainId, id);
		this.queryManager.executeBySql(updOrderSql, updOrderParams);

		Map<String, Object> result = new HashMap<>();
		result.put("success", true);
		result.put("releasedCount", allocations.size());
		return result;
	}

	/**
	 * 출하 주문 취소
	 *
	 * CLOSED/CANCELLED 상태가 아닌 모든 주문을 취소한다.
	 * 할당된 재고가 있으면 해제 처리한다.
	 *
	 * @param ids 주문 ID 리스트
	 * @return { successCount, failCount }
	 */
	public Map<String, Object> cancelShipmentOrders(List<String> ids) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();
		int successCount = 0;
		int failCount = 0;
		List<String> errors = new ArrayList<>();

		for (String id : ids) {
			ShipmentOrder order = this.findOrder(domainId, id);
			if (order == null) {
				errors.add("주문을 찾을 수 없습니다: " + id);
				failCount++;
				continue;
			}

			String status = order.getStatus();
			if (ShipmentOrder.STATUS_CLOSED.equals(status) || ShipmentOrder.STATUS_CANCELLED.equals(status)) {
				errors.add("주문 [" + order.getShipmentNo() + "] 상태가 [" + status + "]이므로 취소할 수 없습니다");
				failCount++;
				continue;
			}

			// 할당 레코드가 있으면 해제
			if (ShipmentOrder.STATUS_ALLOCATED.equals(status) || ShipmentOrder.STATUS_BACK_ORDER.equals(status)) {
				String allocSql = "SELECT * FROM stock_allocations WHERE domain_id = :domainId AND shipment_order_id = :orderId AND status IN (:s1, :s2)";
				Map<String, Object> allocParams = ValueUtil.newMap("domainId,orderId,s1,s2",
						domainId, id, StockAllocation.STATUS_SOFT, StockAllocation.STATUS_HARD);
				List<StockAllocation> allocations = this.queryManager.selectListBySql(allocSql, allocParams, StockAllocation.class, 0, 0);

				for (StockAllocation alloc : allocations) {
					// Inventory reserved_qty 복원
					String updInvSql = "UPDATE inventories SET reserved_qty = GREATEST(COALESCE(reserved_qty, 0) - :allocQty, 0), updated_at = now() WHERE domain_id = :domainId AND id = :invId";
					Map<String, Object> updInvParams = ValueUtil.newMap("allocQty,domainId,invId",
							alloc.getAllocQty(), domainId, alloc.getInventoryId());
					this.queryManager.executeBySql(updInvSql, updInvParams);

					// StockAllocation 취소
					String updAllocSql = "UPDATE stock_allocations SET status = :status, released_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :allocId";
					Map<String, Object> updAllocParams = ValueUtil.newMap("status,now,domainId,allocId",
							StockAllocation.STATUS_CANCELLED, now, domainId, alloc.getId());
					this.queryManager.executeBySql(updAllocSql, updAllocParams);
				}
			}

			// 주문 취소
			String updSql = "UPDATE shipment_orders SET status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> updParams = ValueUtil.newMap("status,domainId,id",
					ShipmentOrder.STATUS_CANCELLED, domainId, id);
			this.queryManager.executeBySql(updSql, updParams);
			successCount++;
		}

		Map<String, Object> result = new HashMap<>();
		result.put("successCount", successCount);
		result.put("failCount", failCount);
		result.put("errors", errors);
		return result;
	}

	/**
	 * 출하 주문 마감 (SHIPPED → CLOSED)
	 *
	 * @param id 주문 ID
	 * @return { success }
	 */
	public Map<String, Object> closeShipmentOrder(String id) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		ShipmentOrder order = this.findOrder(domainId, id);
		if (order == null) {
			throw new RuntimeException("주문을 찾을 수 없습니다: " + id);
		}

		if (!ShipmentOrder.STATUS_SHIPPED.equals(order.getStatus())) {
			throw new RuntimeException("주문 상태가 [" + order.getStatus() + "]이므로 마감할 수 없습니다");
		}

		String sql = "UPDATE shipment_orders SET status = :status, closed_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,now,domainId,id",
				ShipmentOrder.STATUS_CLOSED, now, domainId, id);
		this.queryManager.executeBySql(sql, params);

		Map<String, Object> result = new HashMap<>();
		result.put("success", true);
		return result;
	}

	/* ============================================================
	 * 웨이브 상태 변경
	 * ============================================================ */

	/**
	 * 웨이브 확정/릴리스 (CREATED → RELEASED)
	 *
	 * 웨이브 상태를 RELEASED로 변경하고, 포함된 주문을 RELEASED 상태로 전환한다.
	 *
	 * @param id 웨이브 ID
	 * @return { success, orderCount }
	 */
	public Map<String, Object> releaseWave(String id) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		ShipmentWave wave = this.findWave(domainId, id);
		if (wave == null) {
			throw new RuntimeException("웨이브를 찾을 수 없습니다: " + id);
		}

		if (!ShipmentWave.STATUS_CREATED.equals(wave.getStatus())) {
			throw new RuntimeException("웨이브 상태가 [" + wave.getStatus() + "]이므로 릴리스할 수 없습니다");
		}

		// 웨이브 상태 변경
		String updWaveSql = "UPDATE shipment_waves SET status = :status, released_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updWaveParams = ValueUtil.newMap("status,now,domainId,id",
				ShipmentWave.STATUS_RELEASED, now, domainId, id);
		this.queryManager.executeBySql(updWaveSql, updWaveParams);

		// 포함된 주문 상태 변경 (WAVED → RELEASED)
		String updOrdersSql = "UPDATE shipment_orders SET status = :status, released_at = :now, updated_at = now() WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :currentStatus";
		Map<String, Object> updOrdersParams = ValueUtil.newMap("status,now,domainId,waveNo,currentStatus",
				ShipmentOrder.STATUS_RELEASED, now, domainId, wave.getWaveNo(), ShipmentOrder.STATUS_WAVED);
		this.queryManager.executeBySql(updOrdersSql, updOrdersParams);

		// 변경된 주문 건수 조회
		String countSql = "SELECT COUNT(*) FROM shipment_orders WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :status";
		Map<String, Object> countParams = ValueUtil.newMap("domainId,waveNo,status",
				domainId, wave.getWaveNo(), ShipmentOrder.STATUS_RELEASED);
		Integer orderCount = this.queryManager.selectBySql(countSql, countParams, Integer.class);

		Map<String, Object> result = new HashMap<>();
		result.put("success", true);
		result.put("orderCount", orderCount != null ? orderCount : 0);
		return result;
	}

	/**
	 * 웨이브 취소 (CREATED → CANCELLED)
	 *
	 * 웨이브를 취소하고, 포함된 주문을 ALLOCATED 상태로 복원한다.
	 *
	 * @param id 웨이브 ID
	 * @return { success, restoredOrderCount }
	 */
	public Map<String, Object> cancelWave(String id) {
		Long domainId = Domain.currentDomainId();

		ShipmentWave wave = this.findWave(domainId, id);
		if (wave == null) {
			throw new RuntimeException("웨이브를 찾을 수 없습니다: " + id);
		}

		if (!ShipmentWave.STATUS_CREATED.equals(wave.getStatus())) {
			throw new RuntimeException("웨이브 상태가 [" + wave.getStatus() + "]이므로 취소할 수 없습니다");
		}

		// 포함된 주문 상태 복원 (WAVED → ALLOCATED, wave_no 제거)
		String updOrdersSql = "UPDATE shipment_orders SET status = :status, wave_no = null, updated_at = now() WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :currentStatus";
		Map<String, Object> updOrdersParams = ValueUtil.newMap("status,domainId,waveNo,currentStatus",
				ShipmentOrder.STATUS_ALLOCATED, domainId, wave.getWaveNo(), ShipmentOrder.STATUS_WAVED);
		this.queryManager.executeBySql(updOrdersSql, updOrdersParams);

		// 복원된 주문 건수 조회
		String countSql = "SELECT COUNT(*) FROM shipment_orders WHERE domain_id = :domainId AND status = :status AND allocated_at IS NOT NULL AND wave_no IS NULL";
		Map<String, Object> countParams = ValueUtil.newMap("domainId,status", domainId, ShipmentOrder.STATUS_ALLOCATED);
		// 웨이브 취소 시점에서 복원된 건수는 웨이브의 계획 주문수로 대체
		int restoredCount = wave.getPlanOrderCount() != null ? wave.getPlanOrderCount() : 0;

		// 웨이브 상태 변경
		String updWaveSql = "UPDATE shipment_waves SET status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updWaveParams = ValueUtil.newMap("status,domainId,id",
				ShipmentWave.STATUS_CANCELLED, domainId, id);
		this.queryManager.executeBySql(updWaveSql, updWaveParams);

		Map<String, Object> result = new HashMap<>();
		result.put("success", true);
		result.put("restoredOrderCount", restoredCount);
		return result;
	}

	/* ============================================================
	 * 내부 유틸리티
	 * ============================================================ */

	/**
	 * 주문 단건 조회
	 */
	private ShipmentOrder findOrder(Long domainId, String id) {
		String sql = "SELECT * FROM shipment_orders WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("domainId,id", domainId, id);
		List<ShipmentOrder> list = this.queryManager.selectListBySql(sql, params, ShipmentOrder.class, 0, 1);
		return list.isEmpty() ? null : list.get(0);
	}

	/**
	 * 웨이브 단건 조회
	 */
	private ShipmentWave findWave(Long domainId, String id) {
		String sql = "SELECT * FROM shipment_waves WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("domainId,id", domainId, id);
		List<ShipmentWave> list = this.queryManager.selectListBySql(sql, params, ShipmentWave.class, 0, 1);
		return list.isEmpty() ? null : list.get(0);
	}
}
