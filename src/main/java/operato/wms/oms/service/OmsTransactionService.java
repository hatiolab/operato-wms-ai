package operato.wms.oms.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.annotation.JacksonInject.Value;

import operato.wms.base.entity.SKU;
import operato.wms.common.event.WaveCancelledEvent;
import operato.wms.common.event.WaveReleasedEvent;
import operato.wms.oms.entity.ImportShipmentOrder;
import operato.wms.oms.entity.ReplenishOrder;
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
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.exception.server.ElidomValidationException;
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

	@Autowired
	private ApplicationEventPublisher eventPublisher;

	/**
	 * 임포트 데이터 검증
	 *
	 * @param list    임포트 대상 데이터
	 * @param bizType 업무유형 (B2C_OUT / B2B_OUT)
	 * @return 검증 결과 { total, valid, error, rows: [ { ...fields, row_no, valid,
	 *         error_messages } ] }
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
				} else {
					row.setSkuNm(sku.getSkuNm());
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
			resultRow.put("row_no", i + 1);
			resultRow.put("ref_order_no", row.getRefOrderNo());
			resultRow.put("sku_cd", row.getSkuCd());
			resultRow.put("sku_nm", row.getSkuNm());
			resultRow.put("order_qty", row.getOrderQty());
			resultRow.put("order_date", row.getOrderDate());
			resultRow.put("ship_by_date", row.getShipByDate());
			resultRow.put("cust_cd", row.getCustCd()); // B2C : 판매처 코드
			resultRow.put("cust_nm", row.getOrdererNm()); // B2C : 주문자 명
			resultRow.put("receiver_nm", row.getReceiverNm());
			resultRow.put("biz_type", ValueUtil.isNotEmpty(row.getBizType()) ? row.getBizType() : bizType);

			if (errors.isEmpty()) {
				resultRow.put("valid", true);
				resultRow.put("error_messages", new ArrayList<>());
				validCount++;
			} else {
				resultRow.put("valid", false);
				resultRow.put("error_messages", errors);
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
	 * @return 처리 결과 { total_rows, order_count, item_count, delivery_count,
	 *         skippedRows
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
			order.setTotalItem(rows.size());
			order.setTotalOrder(totalQty);
			order.setTotalAlloc(0.0);
			order.setTotalShipped(0.0);

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
				newItems.add(item);
				lineSeq++;
				itemCount++;
			}

			// 3. ShipmentDelivery 배송정보 생성 (배송정보가 있는 경우)
			if (ValueUtil.isNotEmpty(firstRow.getReceiverNm())) {
				ShipmentDelivery delivery = new ShipmentDelivery();
				delivery.setDomainId(domainId);
				delivery.setShipmentOrderId(order.getId());
				delivery.setShipmentNo(order.getShipmentNo());
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
		result.put("total_rows", list.size());
		result.put("order_count", orderCount);
		result.put("item_count", itemCount);
		result.put("delivery_count", deliveryCount);
		return result;
	}

	/**
	 * 자동 웨이브 생성
	 *
	 * ALLOCATED 상태 주문을 그룹핑 기준에 따라 웨이브로 묶는다.
	 *
	 * @param params { group_by: ["carrier_cd", ...], pick_type, pick_method,
	 *               max_order_count, order_date }
	 * @return 처리 결과 { wave_count, total_orders, waves: [...] }
	 */
	@SuppressWarnings("unchecked")
	public Map<String, Object> createAutoWaves(Map<String, Object> params) {
		Long domainId = Domain.currentDomainId();
		String today = DateUtil.todayStr();

		List<String> groupBy = params.get("group_by") != null ? (List<String>) params.get("group_by")
				: new ArrayList<>();
		String pickType = ValueUtil.isNotEmpty(params.get("pick_type")) ? params.get("pick_type").toString() : "TOTAL";
		String pickMethod = ValueUtil.isNotEmpty(params.get("pick_method")) ? params.get("pick_method").toString()
				: "PICK";
		int maxOrderCount = params.get("max_order_count") != null
				? Integer.parseInt(params.get("max_order_count").toString())
				: 200;
		String orderDate = ValueUtil.isNotEmpty(params.get("order_date")) ? params.get("order_date").toString() : today;

		// 1. ALLOCATED 상태 주문 조회
		String orderSql = "SELECT * FROM shipment_orders WHERE domain_id = :domainId AND status = :status AND order_date = :orderDate ORDER BY priority_cd, created_at";
		Map<String, Object> orderParams = ValueUtil.newMap("domainId,status,orderDate", domainId,
				ShipmentOrder.STATUS_ALLOCATED, orderDate);
		List<ShipmentOrder> orders = this.queryManager.selectListBySql(orderSql, orderParams, ShipmentOrder.class, 0,
				0);

		if (orders.isEmpty()) {
			Map<String, Object> emptyResult = new HashMap<>();
			emptyResult.put("wave_count", 0);
			emptyResult.put("total_orders", 0);
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
		// String seqSql = "SELECT COALESCE(MAX(wave_seq), 0) FROM shipment_waves WHERE
		// domain_id = :domainId AND wave_date = :waveDate";
		// Map<String, Object> seqParams = ValueUtil.newMap("domainId,waveDate",
		// domainId, today);
		// Integer maxSeq = this.queryManager.selectBySql(seqSql, seqParams,
		// Integer.class);
		// int nextSeq = (maxSeq != null ? maxSeq : 0) + 1;

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
				// String waveNo = "WAVE-" + today.replace("-", "") + "-" +
				// String.format("%03d", nextSeq);

				// 계획 수량 집계
				int planOrderCnt = chunk.size();
				double planTotalQty = 0;
				int planItemCnt = 0;

				List<String> orderIds = new ArrayList<>();
				for (ShipmentOrder ord : chunk) {
					planTotalQty += (ord.getTotalOrder() != null ? ord.getTotalOrder() : 0);
					orderIds.add(ord.getId());
				}

				// SKU 종류 집계 (주문 품목 기준)
				String skuCountSql = "SELECT COUNT(DISTINCT sku_cd) FROM shipment_order_items WHERE domain_id = :domainId AND shipment_order_id IN (:orderIds)";
				Map<String, Object> skuCountParams = ValueUtil.newMap("domainId,orderIds", domainId, orderIds);
				Integer skuCnt = this.queryManager.selectBySql(skuCountSql, skuCountParams, Integer.class);
				planItemCnt = skuCnt != null ? skuCnt : 0;

				// 대표 택배사 (첫 번째 주문 기준)
				String carrierCd = chunk.get(0).getCarrierCd();

				// ShipmentWave 생성
				ShipmentWave wave = new ShipmentWave();
				wave.setDomainId(domainId);
				// wave.setWaveNo(waveNo);
				// wave.setWaveDate(today);
				// wave.setWaveSeq(nextSeq);
				wave.setPickType(pickType);
				wave.setPickMethod(pickMethod);
				wave.setCarrierCd(carrierCd);
				wave.setPlanOrder(planOrderCnt);
				wave.setPlanItem(planItemCnt);
				wave.setPlanTotal(planTotalQty);
				wave.setResultOrder(0);
				wave.setResultItem(0);
				wave.setResultTotal(0.0);
				wave.setStatus(ShipmentWave.STATUS_CREATED);
				this.queryManager.insert(wave);

				// 주문에 wave_no 업데이트 및 상태 변경
				for (ShipmentOrder ord : chunk) {
					String updateSql = "UPDATE shipment_orders SET wave_no = :waveNo, status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
					Map<String, Object> updateParams = ValueUtil.newMap("waveNo,status,domainId,id", wave.getWaveNo(),
							ShipmentOrder.STATUS_WAVED, domainId, ord.getId());
					this.queryManager.executeBySql(updateSql, updateParams);
				}

				// 결과 수집
				Map<String, Object> waveInfo = new HashMap<>();
				waveInfo.put("wave_no", wave.getWaveNo());
				waveInfo.put("wave_seq", wave.getWaveSeq());
				waveInfo.put("order_count", planOrderCnt);
				waveInfo.put("sku_count", planItemCnt);
				waveInfo.put("total_qty", planTotalQty);
				waveInfo.put("carrier_cd", carrierCd);
				waveResults.add(waveInfo);

				waveCount++;
				totalOrderCount += planOrderCnt;
				// nextSeq++;
			}
		}

		Map<String, Object> result = new HashMap<>();
		result.put("wave_count", waveCount);
		result.put("total_orders", totalOrderCount);
		result.put("waves", waveResults);
		return result;
	}

	/**
	 * 수동 웨이브 생성
	 *
	 * 화면에서 직접 선택한 주문 리스트를 하나의 웨이브로 묶는다.
	 * ALLOCATED 상태의 주문만 웨이브에 포함할 수 있다.
	 *
	 * @param params { orders: [{ id, ... }], pick_type, pick_method }
	 * @return { wave_no, wave_seq, order_count, sku_count, total_qty,
	 *         skipped_count, errors }
	 */
	@SuppressWarnings("unchecked")
	public Map<String, Object> createManualWave(Map<String, Object> params) {
		// 파라미터 추출
		List<Map<String, Object>> orders = params.get("orders") != null
				? (List<Map<String, Object>>) params.get("orders")
				: new ArrayList<>();
		String pickType = ValueUtil.isNotEmpty(params.get("pick_type")) ? params.get("pick_type").toString() : "TOTAL";
		String pickMethod = ValueUtil.isNotEmpty(params.get("pick_method")) ? params.get("pick_method").toString()
				: "PICK";

		if (orders.isEmpty()) {
			throw new ElidomValidationException("웨이브에 포함할 주문을 선택해 주세요");
		}

		// 주문 ID 추출하여 주문 리스트 구성
		List<ShipmentOrder> orderList = new ArrayList<ShipmentOrder>();
		for (Map<String, Object> orderMap : orders) {
			String orderId = orderMap.get("id") != null ? orderMap.get("id").toString() : null;
			orderList.add(new ShipmentOrder(orderId));
		}

		// 주문 리스트로 웨이브 생성
		return this.createWave(orderList, pickType, pickMethod);
	}

	/**
	 * 선택된 주문으로 웨이브 생성
	 * 
	 * @param list
	 * @param pickType
	 * @param pickMethod
	 * @return
	 */
	public Map<String, Object> createWave(List<ShipmentOrder> list, String pickType, String pickMethod) {
		Long domainId = Domain.currentDomainId();
		// String today = DateUtil.todayStr();

		if (ValueUtil.isEmpty(list)) {
			throw new ElidomValidationException("웨이브에 포함할 주문을 선택해 주세요");
		}

		// ALLOCATED 상태 주문만 필터링
		List<ShipmentOrder> validOrders = new ArrayList<ShipmentOrder>();
		List<String> errors = new ArrayList<String>();

		for (ShipmentOrder so : list) {
			ShipmentOrder order = this.findOrder(domainId, so.getId());
			if (order == null) {
				errors.add("주문을 찾을 수 없습니다: " + so.getId());
				continue;
			}

			if (!ShipmentOrder.STATUS_ALLOCATED.equals(order.getStatus())) {
				errors.add("주문 [" + order.getShipmentNo() + "] 상태가 [" + order.getStatus()
						+ "]이므로 웨이브에 포함할 수 없습니다 (ALLOCATED 상태만 가능)");
				continue;
			}

			validOrders.add(order);
		}

		if (validOrders.isEmpty()) {
			throw new ElidomValidationException("웨이브에 포함할 수 있는 주문이 없습니다 (ALLOCATED 상태의 주문만 가능)");
		}

		// 당일 최대 wave_seq 조회
		// String seqSql = "SELECT COALESCE(MAX(wave_seq), 0) FROM shipment_waves WHERE
		// domain_id = :domainId AND wave_date = :waveDate";
		// Map<String, Object> seqParams = ValueUtil.newMap("domainId,waveDate",
		// domainId, today);
		// Integer maxSeq = this.queryManager.selectBySql(seqSql, seqParams,
		// Integer.class);
		// int nextSeq = (maxSeq != null ? maxSeq : 0) + 1;

		// // 웨이브 번호 생성
		// String waveNo = "WAVE-" + today.replace("-", "") + "-" +
		// String.format("%03d", nextSeq);

		// 계획 수량 집계
		int planOrderCnt = validOrders.size();
		double planTotalQty = 0;
		List<String> validOrderIds = new ArrayList<>();
		for (ShipmentOrder ord : validOrders) {
			planTotalQty += (ord.getTotalOrder() != null ? ord.getTotalOrder() : 0);
			validOrderIds.add(ord.getId());
		}

		// SKU 종류 집계
		String skuCountSql = "SELECT COUNT(DISTINCT sku_cd) FROM shipment_order_items WHERE domain_id = :domainId AND shipment_order_id IN (:orderIds)";
		Map<String, Object> skuCountParams = ValueUtil.newMap("domainId,orderIds", domainId, validOrderIds);
		Integer skuCnt = this.queryManager.selectBySql(skuCountSql, skuCountParams, Integer.class);
		int planItemCnt = skuCnt != null ? skuCnt : 0;

		// 대표 택배사 (첫 번째 주문 기준)
		String carrierCd = validOrders.get(0).getCarrierCd();

		// ShipmentWave 생성
		ShipmentWave wave = new ShipmentWave();
		wave.setDomainId(domainId);
		// wave.setWaveNo(waveNo);
		// wave.setWaveDate(today);
		// wave.setWaveSeq(nextSeq);
		wave.setPickType(pickType);
		wave.setPickMethod(pickMethod);
		wave.setCarrierCd(carrierCd);
		wave.setPlanOrder(planOrderCnt);
		wave.setPlanItem(planItemCnt);
		wave.setPlanTotal(planTotalQty);
		wave.setResultOrder(0);
		wave.setResultItem(0);
		wave.setResultTotal(0.0);
		wave.setStatus(ShipmentWave.STATUS_CREATED);
		this.queryManager.insert(wave);

		// 주문에 wave_no 업데이트 및 상태 변경
		for (ShipmentOrder ord : validOrders) {
			String updateSql = "UPDATE shipment_orders SET wave_no = :waveNo, status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> updateParams = ValueUtil.newMap("waveNo,status,domainId,id", wave.getWaveNo(),
					ShipmentOrder.STATUS_WAVED, domainId, ord.getId());
			this.queryManager.executeBySql(updateSql, updateParams);
		}

		Map<String, Object> result = new HashMap<>();
		result.put("wave_no", wave.getWaveNo());
		result.put("wave_seq", wave.getWaveSeq());
		result.put("order_count", planOrderCnt);
		result.put("sku_count", planItemCnt);
		result.put("total_qty", planTotalQty);
		result.put("skipped_count", list.size() - validOrders.size());
		result.put("errors", errors);
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
	 * @return { total_orders }
	 */
	public Map<String, Object> previewAutoWaveTargets(String orderDate) {
		Long domainId = Domain.currentDomainId();
		String targetDate = ValueUtil.isNotEmpty(orderDate) ? orderDate : DateUtil.todayStr();

		String sql = "SELECT COUNT(*) FROM shipment_orders WHERE domain_id = :domainId AND status = :status AND order_date = :orderDate";
		Map<String, Object> params = ValueUtil.newMap("domainId,status,orderDate", domainId,
				ShipmentOrder.STATUS_ALLOCATED, targetDate);
		Integer count = this.queryManager.selectBySql(sql, params, Integer.class);

		Map<String, Object> result = new HashMap<>();
		result.put("total_orders", count != null ? count : 0);
		return result;
	}

	/*
	 * ============================================================
	 * 출하 주문 상태 변경
	 * ============================================================
	 */

	/**
	 * 출하 주문 확정 + 재고 할당 (단건)
	 *
	 * REGISTERED 상태 주문을 CONFIRMED로 확정한 뒤, 바로 재고 할당까지 수행한다.
	 * 전체 할당 시 ALLOCATED, 부분 할당 시 BACK_ORDER 상태가 된다.
	 *
	 * @param id 주문 ID
	 * @return { success, status, allocated_qty, back_order }
	 */
	public Map<String, Object> confirmAndAllocateShipmentOrder(String id) {
		Long domainId = Domain.currentDomainId();

		ShipmentOrder order = this.findOrder(domainId, id);
		if (order == null) {
			throw new ElidomValidationException("주문을 찾을 수 없습니다: " + id);
		}

		if (!ShipmentOrder.STATUS_REGISTERED.equals(order.getStatus())) {
			throw new ElidomValidationException(
					"주문 상태가 [" + order.getStatus() + "]이므로 확정+할당할 수 없습니다 (REGISTERED 상태만 가능)");
		}

		// 1. 확정 처리
		List<String> ids = new ArrayList<>();
		ids.add(id);
		Map<String, Object> confirmResult = this.confirmShipmentOrders(ids);

		int confirmSuccess = (int) confirmResult.getOrDefault("success_count", 0);
		if (confirmSuccess == 0) {
			@SuppressWarnings("unchecked")
			List<String> confirmErrors = (List<String>) confirmResult.getOrDefault("errors", new ArrayList<>());
			String errorMsg = confirmErrors.isEmpty() ? "확정 처리 실패" : confirmErrors.get(0);
			throw new ElidomRuntimeException(errorMsg);
		}

		// 2. 재고 할당 처리
		Map<String, Object> allocResult = this.allocateShipmentOrders(ids);

		int allocSuccess = (int) allocResult.getOrDefault("success_count", 0);
		int backOrderCount = (int) allocResult.getOrDefault("back_order_count", 0);

		// 최종 주문 상태 조회
		ShipmentOrder updatedOrder = this.findOrder(domainId, id);

		Map<String, Object> result = new HashMap<>();
		result.put("success", allocSuccess > 0);
		result.put("status", updatedOrder != null ? updatedOrder.getStatus() : null);
		result.put("allocated_qty", updatedOrder != null ? updatedOrder.getTotalAlloc() : 0);
		result.put("back_order", backOrderCount > 0);
		return result;
	}

	/**
	 * 출하 주문 확정 (REGISTERED → CONFIRMED)
	 *
	 * @param ids 주문 ID 리스트
	 * @return { success_count, fail_count, errors }
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
		result.put("success_count", successCount);
		result.put("fail_count", failCount);
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
	 * @return { success_count, allocated_count, back_order_count }
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
			List<ShipmentOrderItem> items = this.queryManager.selectListBySql(itemSql, itemParams,
					ShipmentOrderItem.class, 0, 0);

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
				List<Inventory> inventories = this.queryManager.selectListBySql(invSql, invParams, Inventory.class, 0,
						0);

				double itemAllocQty = existingAllocQty;

				for (Inventory inv : inventories) {
					if (needQty <= 0)
						break;

					double invQty = inv.getInvQty() != null ? inv.getInvQty() : 0;
					double reservedQty = inv.getReservedQty() != null ? inv.getReservedQty() : 0;
					double availQty = invQty - reservedQty;

					if (availQty <= 0)
						continue;

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
					Map<String, Object> updInvParams = ValueUtil.newMap("allocQty,domainId,invId", allocQty, domainId,
							inv.getId());
					this.queryManager.executeBySql(updInvSql, updInvParams);

					itemAllocQty += allocQty;
					needQty -= allocQty;
				}

				// ShipmentOrderItem 업데이트
				double shortQty = orderQty - itemAllocQty;
				String updItemSql = "UPDATE shipment_order_items SET alloc_qty = :allocQty, short_qty = :shortQty, updated_at = now() WHERE domain_id = :domainId AND id = :itemId";
				Map<String, Object> updItemParams = ValueUtil.newMap("allocQty,shortQty,domainId,itemId", itemAllocQty,
						shortQty, domainId, item.getId());
				this.queryManager.executeBySql(updItemSql, updItemParams);

				totalAllocQty += itemAllocQty;
				if (shortQty > 0)
					hasShort = true;
			}

			// 주문 헤더 상태 업데이트
			String newStatus = hasShort ? ShipmentOrder.STATUS_BACK_ORDER : ShipmentOrder.STATUS_ALLOCATED;
			String updOrderSql = "UPDATE shipment_orders SET status = :status, total_alloc = :totalAlloc, allocated_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> updOrderParams = ValueUtil.newMap("status,totalAlloc,now,domainId,id",
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
		result.put("success_count", successCount);
		result.put("allocated_count", allocatedCount);
		result.put("back_order_count", backOrderCount);
		result.put("errors", errors);
		return result;
	}

	/**
	 * 출하 주문 할당 해제 (ALLOCATED → CONFIRMED)
	 *
	 * @param id 주문 ID
	 * @return { success, released_count }
	 */
	public Map<String, Object> deallocateShipmentOrder(String id) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		ShipmentOrder order = this.findOrder(domainId, id);
		if (order == null) {
			throw new ElidomValidationException("주문을 찾을 수 없습니다: " + id);
		}

		if (!ShipmentOrder.STATUS_ALLOCATED.equals(order.getStatus())) {
			throw new ElidomValidationException("주문 상태가 [" + order.getStatus() + "]이므로 할당을 해제할 수 없습니다");
		}

		// 할당 레코드 조회
		String allocSql = "SELECT * FROM stock_allocations WHERE domain_id = :domainId AND shipment_order_id = :orderId AND status IN (:s1, :s2)";
		Map<String, Object> allocParams = ValueUtil.newMap("domainId,orderId,s1,s2",
				domainId, id, StockAllocation.STATUS_SOFT, StockAllocation.STATUS_HARD);
		List<StockAllocation> allocations = this.queryManager.selectListBySql(allocSql, allocParams,
				StockAllocation.class, 0, 0);

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
		String updOrderSql = "UPDATE shipment_orders SET status = :status, total_alloc = 0, allocated_at = null, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updOrderParams = ValueUtil.newMap("status,domainId,id",
				ShipmentOrder.STATUS_CONFIRMED, domainId, id);
		this.queryManager.executeBySql(updOrderSql, updOrderParams);

		Map<String, Object> result = new HashMap<>();
		result.put("success", true);
		result.put("released_count", allocations.size());
		return result;
	}

	/**
	 * 출하 주문 취소
	 *
	 * CLOSED/CANCELLED 상태가 아닌 모든 주문을 취소한다.
	 * 할당된 재고가 있으면 해제 처리한다.
	 *
	 * @param ids 주문 ID 리스트
	 * @return { success_count, fail_count }
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
				List<StockAllocation> allocations = this.queryManager.selectListBySql(allocSql, allocParams,
						StockAllocation.class, 0, 0);

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
		result.put("success_count", successCount);
		result.put("fail_count", failCount);
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
			throw new ElidomValidationException("주문을 찾을 수 없습니다: " + id);
		}

		if (!ShipmentOrder.STATUS_SHIPPED.equals(order.getStatus())) {
			throw new ElidomValidationException("주문 상태가 [" + order.getStatus() + "]이므로 마감할 수 없습니다");
		}

		String sql = "UPDATE shipment_orders SET status = :status, closed_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,now,domainId,id",
				ShipmentOrder.STATUS_CLOSED, now, domainId, id);
		this.queryManager.executeBySql(sql, params);

		// 결과 리턴
		return ValueUtil.newMap("success", true);
	}

	/*
	 * ============================================================
	 * 웨이브 상태 변경
	 * ============================================================
	 */

	/**
	 * 웨이브 확정/릴리스 (CREATED → RELEASED)
	 *
	 * 웨이브 상태를 RELEASED로 변경하고, 포함된 주문을 RELEASED 상태로 전환한다.
	 *
	 * @param id 웨이브 ID
	 * @return { success, order_count }
	 */
	public Map<String, Object> releaseWave(String id) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		ShipmentWave wave = this.findWave(domainId, id);
		if (wave == null) {
			throw new ElidomValidationException("웨이브를 찾을 수 없습니다: " + id);
		}

		if (!ShipmentWave.STATUS_CREATED.equals(wave.getStatus())) {
			throw new ElidomValidationException("웨이브 상태가 [" + wave.getStatus() + "]이므로 릴리스할 수 없습니다");
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

		// ===== 이벤트 발행: Fulfillment 모듈에 피킹 지시 생성 트리거 =====
		WaveReleasedEvent event = new WaveReleasedEvent(
				domainId,
				id,
				wave.getWaveNo(),
				wave.getPickType(),
				wave.getPickMethod(),
				orderCount != null ? orderCount : 0);
		this.eventPublisher.publishEvent(event);

		// 결과 리턴
		return ValueUtil.newMap("success,order_count", true, orderCount != null ? orderCount : 0);
	}

	/**
	 * 웨이브 확정 취소 (RELEASED → CREATED)
	 *
	 * 웨이브 확정을 취소하고, 피킹 지시를 삭제하며, 주문 상태를 원복한다.
	 *
	 * 취소 가능 조건:
	 * - 웨이브 상태 = RELEASED
	 * - 모든 피킹 지시 상태 = WAIT (아직 피킹 시작 전)
	 *
	 * @param id 웨이브 ID
	 * @return { success, wave_no }
	 */
	public Map<String, Object> cancelWaveRelease(String id) {
		Long domainId = Domain.currentDomainId();

		// 1. 웨이브 조회
		ShipmentWave wave = this.findWave(domainId, id);
		if (wave == null) {
			throw new ElidomValidationException("웨이브를 찾을 수 없습니다: " + id);
		}

		// 2. 웨이브 상태 확인 (RELEASED만 취소 가능)
		if (!ShipmentWave.STATUS_RELEASED.equals(wave.getStatus())) {
			throw new ElidomValidationException(
					"RELEASED 상태의 웨이브만 확정 취소할 수 있습니다 (현재 상태: " + wave.getStatus() + ")");
		}

		// 3. Fulfillment 모듈의 피킹 지시 상태 확인
		// (이벤트 발행 전 미리 확인하여 빠른 실패)
		String checkSql = "SELECT COUNT(*) FROM picking_tasks " +
				"WHERE domain_id = :domainId AND wave_no = :waveNo AND status not in ('CANCELLED', 'CREATED')";
		Map<String, Object> checkParams = ValueUtil.newMap("domainId,waveNo", domainId, wave.getWaveNo());
		Integer inProgressCount = this.queryManager.selectBySql(checkSql, checkParams, Integer.class);

		if (inProgressCount != null && inProgressCount > 0) {
			throw new ElidomValidationException(
					"피킹이 이미 진행 중인 주문이 있어 웨이브 확정을 취소할 수 없습니다 (" + inProgressCount + "건)");
		}

		// 4. 웨이브 상태 변경: RELEASED → CREATED
		String updWaveSql = "UPDATE shipment_waves SET status = :status, updated_at = now() " +
				"WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updWaveParams = ValueUtil.newMap("status,domainId,id",
				ShipmentWave.STATUS_CREATED, domainId, id);
		this.queryManager.executeBySql(updWaveSql, updWaveParams);

		// 5. 주문 상태 변경: RELEASED/PICKING → WAVED
		// (웨이브에는 여전히 포함되어 있으므로 WAVED 상태로 복원)
		String updOrdersSql = "UPDATE shipment_orders SET status = :newStatus, updated_at = now() " +
				"WHERE domain_id = :domainId AND wave_no = :waveNo AND status IN (:oldStatuses)";
		Map<String, Object> updOrdersParams = ValueUtil.newMap("domainId,waveNo,oldStatuses,newStatus",
				domainId, wave.getWaveNo(),
				java.util.Arrays.asList(ShipmentOrder.STATUS_RELEASED, ShipmentOrder.STATUS_PICKING),
				ShipmentOrder.STATUS_WAVED);
		this.queryManager.executeBySql(updOrdersSql, updOrdersParams);

		// 6. (선택) 재고 할당 상태 변경: HARD → SOFT
		// NOTE: 비즈니스 정책에 따라 생략 가능 (HARD 유지 또는 SOFT로 변경)
		// String updAllocSql = "UPDATE stock_allocations SET status = :newStatus,
		// updated_at = now() " +
		// "WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :oldStatus";
		// Map<String, Object> updAllocParams =
		// ValueUtil.newMap("domainId,waveNo,oldStatus,newStatus",
		// domainId, wave.getWaveNo(), StockAllocation.STATUS_HARD,
		// StockAllocation.STATUS_SOFT);
		// this.queryManager.executeBySql(updAllocSql, updAllocParams);

		// 7. ===== 이벤트 발행: Fulfillment 모듈에 피킹 지시 삭제 트리거 =====
		WaveCancelledEvent event = new WaveCancelledEvent(domainId, id, wave.getWaveNo());
		this.eventPublisher.publishEvent(event);

		// 8. 결과 리턴
		return ValueUtil.newMap("success,wave_no", true, wave.getWaveNo());
	}

	/**
	 * 웨이브 취소 (CREATED → CANCELLED)
	 *
	 * 웨이브를 취소하고, 포함된 주문을 ALLOCATED 상태로 복원한다.
	 *
	 * @param id 웨이브 ID
	 * @return { success, restored_order_count }
	 */
	public Map<String, Object> cancelWave(String id) {
		Long domainId = Domain.currentDomainId();

		ShipmentWave wave = this.findWave(domainId, id);
		if (wave == null) {
			throw new ElidomValidationException("웨이브를 찾을 수 없습니다: " + id);
		}

		if (!ShipmentWave.STATUS_CREATED.equals(wave.getStatus())) {
			throw new ElidomValidationException("웨이브 상태가 [" + wave.getStatus() + "]이므로 취소할 수 없습니다");
		}

		// 포함된 주문 상태 복원 (WAVED → ALLOCATED, wave_no 제거)
		String updOrdersSql = "UPDATE shipment_orders SET status = :status, wave_no = null, updated_at = now() WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :currentStatus";
		Map<String, Object> updOrdersParams = ValueUtil.newMap("status,domainId,waveNo,currentStatus",
				ShipmentOrder.STATUS_ALLOCATED, domainId, wave.getWaveNo(), ShipmentOrder.STATUS_WAVED);
		this.queryManager.executeBySql(updOrdersSql, updOrdersParams);

		// 복원된 주문 건수 조회
		// String countSql = "SELECT COUNT(*) FROM shipment_orders WHERE domain_id =
		// :domainId AND status = :status AND allocated_at IS NOT NULL AND wave_no IS
		// NULL";
		// Map<String, Object> countParams = ValueUtil.newMap("domainId,status",
		// domainId, ShipmentOrder.STATUS_ALLOCATED);
		// 웨이브 취소 시점에서 복원된 건수는 웨이브의 계획 주문수로 대체
		int restoredCount = wave.getPlanOrder() != null ? wave.getPlanOrder() : 0;

		// 웨이브 상태 변경
		String updWaveSql = "UPDATE shipment_waves SET status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updWaveParams = ValueUtil.newMap("status,domainId,id",
				ShipmentWave.STATUS_CANCELLED, domainId, id);
		this.queryManager.executeBySql(updWaveSql, updWaveParams);

		// 결과 리턴
		return ValueUtil.newMap("success,restored_order_count", true, restoredCount);
	}

	/*
	 * ============================================================
	 * 웨이브 상세 조회
	 * ============================================================
	 */

	/**
	 * 웨이브 포함 주문 목록 조회
	 *
	 * @param id 웨이브 ID
	 * @return 주문 목록
	 */
	public List<Map> getWaveOrders(String id) {
		Long domainId = Domain.currentDomainId();

		ShipmentWave wave = this.findWave(domainId, id);
		if (wave == null) {
			throw new RuntimeException("웨이브를 찾을 수 없습니다: " + id);
		}

		String sql = "SELECT id, shipment_no, ref_order_no AS ref_no, cust_cd, cust_nm, biz_type, ship_type, total_item, total_order, status"
				+ " FROM shipment_orders"
				+ " WHERE domain_id = :domainId AND wave_no = :waveNo"
				+ " ORDER BY shipment_no";
		Map<String, Object> params = ValueUtil.newMap("domainId,waveNo", domainId, wave.getWaveNo());
		return this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
	}

	/**
	 * 웨이브 SKU 합산 요약 조회
	 *
	 * 웨이브에 포함된 전체 주문의 품목을 SKU 기준으로 합산하여 반환한다.
	 *
	 * @param id 웨이브 ID
	 * @return SKU 합산 목록 [ { sku_cd, sku_nm, total_qty, order_count, loc_cd,
	 *         available_qty
	 *         } ]
	 */
	public List<Map> getWaveSummary(String id) {
		Long domainId = Domain.currentDomainId();

		ShipmentWave wave = this.findWave(domainId, id);
		if (wave == null) {
			throw new RuntimeException("웨이브를 찾을 수 없습니다: " + id);
		}

		String sql = "SELECT soi.sku_cd, soi.sku_nm,"
				+ " SUM(soi.order_qty) AS total_qty,"
				+ " COUNT(DISTINCT soi.shipment_order_id) AS order_count,"
				+ " MIN(sa.loc_cd) AS loc_cd,"
				+ " COALESCE(("
				+ "   SELECT SUM(i.inv_qty - COALESCE(i.reserved_qty, 0))"
				+ "   FROM inventories i"
				+ "   WHERE i.domain_id = :domainId AND i.sku_cd = soi.sku_cd"
				+ "     AND i.status = 'STORED' AND (i.del_flag IS NULL OR i.del_flag = false)"
				+ " ), 0) AS available_qty"
				+ " FROM shipment_order_items soi"
				+ " INNER JOIN shipment_orders so ON so.domain_id = soi.domain_id AND so.id = soi.shipment_order_id"
				+ " LEFT JOIN stock_allocations sa ON sa.domain_id = soi.domain_id AND sa.shipment_order_item_id = soi.id AND sa.status IN ('SOFT','HARD')"
				+ " WHERE soi.domain_id = :domainId AND so.wave_no = :waveNo"
				+ " GROUP BY soi.sku_cd, soi.sku_nm"
				+ " ORDER BY soi.sku_cd";
		Map<String, Object> params = ValueUtil.newMap("domainId,waveNo", domainId, wave.getWaveNo());
		return this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
	}

	/**
	 * 웨이브에 주문 추가
	 *
	 * ALLOCATED 상태의 주문을 지정 웨이브에 추가하고 WAVED 상태로 변경한다.
	 * 웨이브 헤더의 계획 수량도 갱신한다.
	 *
	 * @param waveId   웨이브 ID
	 * @param orderIds 추가할 주문 ID 리스트
	 * @return { added_count, wave_no }
	 */
	public Map<String, Object> addOrdersToWave(String waveId, List<String> orderIds) {
		Long domainId = Domain.currentDomainId();

		ShipmentWave wave = this.findWave(domainId, waveId);
		if (wave == null) {
			throw new ElidomValidationException("웨이브를 찾을 수 없습니다: " + waveId);
		}
		if (!ShipmentWave.STATUS_CREATED.equals(wave.getStatus())) {
			throw new ElidomValidationException(
					"웨이브 상태가 [" + wave.getStatus() + "]이므로 주문을 추가할 수 없습니다 (CREATED 상태만 가능)");
		}

		int addedCount = 0;
		for (String orderId : orderIds) {
			ShipmentOrder order = this.findOrder(domainId, orderId);
			if (order == null)
				continue;
			if (!ShipmentOrder.STATUS_ALLOCATED.equals(order.getStatus()))
				continue;

			String sql = "UPDATE shipment_orders SET wave_no = :waveNo, status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> params = ValueUtil.newMap("waveNo,status,domainId,id",
					wave.getWaveNo(), ShipmentOrder.STATUS_WAVED, domainId, orderId);
			this.queryManager.executeBySql(sql, params);
			addedCount++;
		}

		// 웨이브 헤더 계획 수량 재집계
		this.recalcWavePlanStats(domainId, waveId, wave.getWaveNo());

		// 결과 리턴
		return ValueUtil.newMap("added_count,wave_no", addedCount, wave.getWaveNo());
	}

	/**
	 * 웨이브에서 주문 제거
	 *
	 * 웨이브에 포함된 주문을 제거하고 ALLOCATED 상태로 복원한다.
	 * 웨이브 헤더의 계획 수량도 갱신한다.
	 *
	 * @param waveId   웨이브 ID
	 * @param orderIds 제거할 주문 ID 리스트
	 * @return { removed_count, wave_no }
	 */
	public Map<String, Object> removeOrdersFromWave(String waveId, List<String> orderIds) {
		Long domainId = Domain.currentDomainId();

		ShipmentWave wave = this.findWave(domainId, waveId);
		if (wave == null) {
			throw new ElidomValidationException("웨이브를 찾을 수 없습니다: " + waveId);
		}
		if (!ShipmentWave.STATUS_CREATED.equals(wave.getStatus())) {
			throw new ElidomValidationException(
					"웨이브 상태가 [" + wave.getStatus() + "]이므로 주문을 제거할 수 없습니다 (CREATED 상태만 가능)");
		}

		int removedCount = 0;
		for (String orderId : orderIds) {
			ShipmentOrder order = this.findOrder(domainId, orderId);
			if (order == null)
				continue;
			if (!ShipmentOrder.STATUS_WAVED.equals(order.getStatus()))
				continue;
			if (!wave.getWaveNo().equals(order.getWaveNo()))
				continue;

			String sql = "UPDATE shipment_orders SET wave_no = null, status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> params = ValueUtil.newMap("status,domainId,id",
					ShipmentOrder.STATUS_ALLOCATED, domainId, orderId);
			this.queryManager.executeBySql(sql, params);
			removedCount++;
		}

		// 웨이브 헤더 계획 수량 재집계
		this.recalcWavePlanStats(domainId, waveId, wave.getWaveNo());

		// 결과 리턴
		return ValueUtil.newMap("removed_count,wave_no", removedCount, wave.getWaveNo());
	}

	/**
	 * 웨이브 헤더 계획 수량 재집계
	 */
	private void recalcWavePlanStats(Long domainId, String waveId, String waveNo) {
		Map<String, Object> countParams = ValueUtil.newMap("domainId,waveNo", domainId, waveNo);

		String countSql = "SELECT COUNT(*) FROM shipment_orders WHERE domain_id = :domainId AND wave_no = :waveNo";
		Integer planOrder = this.queryManager.selectBySql(countSql, countParams, Integer.class);

		String qtySql = "SELECT COALESCE(SUM(total_order), 0) FROM shipment_orders WHERE domain_id = :domainId AND wave_no = :waveNo";
		Double planTotal = this.queryManager.selectBySql(qtySql, countParams, Double.class);

		String skuSql = "SELECT COUNT(DISTINCT soi.sku_cd) FROM shipment_order_items soi"
				+ " INNER JOIN shipment_orders so ON so.domain_id = soi.domain_id AND so.id = soi.shipment_order_id"
				+ " WHERE soi.domain_id = :domainId AND so.wave_no = :waveNo";
		Integer planItem = this.queryManager.selectBySql(skuSql, countParams, Integer.class);

		String updSql = "UPDATE shipment_waves SET plan_order = :planOrder, plan_item = :planItem, plan_total = :planTotal, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updParams = ValueUtil.newMap("planOrder,planItem,planTotal,domainId,id",
				planOrder != null ? planOrder : 0,
				planItem != null ? planItem : 0,
				planTotal != null ? planTotal : 0.0,
				domainId, waveId);
		this.queryManager.executeBySql(updSql, updParams);
	}

	/*
	 * ============================================================
	 * 보충 지시 상태 변경
	 * ============================================================
	 */

	/**
	 * 보충 지시 시작 (CREATED → IN_PROGRESS)
	 *
	 * @param id 보충 지시 ID
	 * @return { success }
	 */
	public Map<String, Object> startReplenishOrder(String id) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		ReplenishOrder order = this.findReplenishOrder(domainId, id);
		if (order == null) {
			throw new ElidomValidationException("보충 지시를 찾을 수 없습니다: " + id);
		}

		if (!ReplenishOrder.STATUS_CREATED.equals(order.getStatus())) {
			throw new ElidomValidationException(
					"보충 지시 상태가 [" + order.getStatus() + "]이므로 시작할 수 없습니다 (CREATED 상태만 가능)");
		}

		String sql = "UPDATE replenish_orders SET status = :status, started_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,now,domainId,id",
				ReplenishOrder.STATUS_IN_PROGRESS, now, domainId, id);
		this.queryManager.executeBySql(sql, params);

		// 결과 리턴
		return ValueUtil.newMap("success", true);
	}

	/**
	 * 보충 지시 완료 (IN_PROGRESS → COMPLETED)
	 *
	 * 상세 항목의 실적 수량을 합산하여 헤더의 resultTotal을 갱신한다.
	 *
	 * @param id 보충 지시 ID
	 * @return { success, result_total }
	 */
	public Map<String, Object> completeReplenishOrder(String id) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		ReplenishOrder order = this.findReplenishOrder(domainId, id);
		if (order == null) {
			throw new ElidomValidationException("보충 지시를 찾을 수 없습니다: " + id);
		}

		if (!ReplenishOrder.STATUS_IN_PROGRESS.equals(order.getStatus())) {
			throw new ElidomValidationException(
					"보충 지시 상태가 [" + order.getStatus() + "]이므로 완료할 수 없습니다 (IN_PROGRESS 상태만 가능)");
		}

		// 상세 항목의 실적 수량 합산
		String sumSql = "SELECT COALESCE(SUM(result_qty), 0) FROM replenish_order_items WHERE domain_id = :domainId AND replenish_order_id = :orderId";
		Map<String, Object> sumParams = ValueUtil.newMap("domainId,orderId", domainId, id);
		Double resultTotal = this.queryManager.selectBySql(sumSql, sumParams, Double.class);

		String sql = "UPDATE replenish_orders SET status = :status, result_total = :resultTotal, completed_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,resultTotal,now,domainId,id",
				ReplenishOrder.STATUS_COMPLETED, resultTotal, now, domainId, id);
		this.queryManager.executeBySql(sql, params);

		// 결과 리턴
		return ValueUtil.newMap("success,result_total", true, resultTotal);
	}

	/**
	 * 보충 지시 취소 (CREATED/IN_PROGRESS → CANCELLED)
	 *
	 * @param id 보충 지시 ID
	 * @return { success }
	 */
	public Map<String, Object> cancelReplenishOrder(String id) {
		Long domainId = Domain.currentDomainId();

		ReplenishOrder order = this.findReplenishOrder(domainId, id);
		if (order == null) {
			throw new ElidomValidationException("보충 지시를 찾을 수 없습니다: " + id);
		}

		String status = order.getStatus();
		if (ReplenishOrder.STATUS_COMPLETED.equals(status) || ReplenishOrder.STATUS_CANCELLED.equals(status)) {
			throw new ElidomValidationException("보충 지시 상태가 [" + status + "]이므로 취소할 수 없습니다");
		}

		String sql = "UPDATE replenish_orders SET status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,domainId,id",
				ReplenishOrder.STATUS_CANCELLED, domainId, id);
		this.queryManager.executeBySql(sql, params);

		// 결과 리턴
		return ValueUtil.newMap("success", true);
	}

	/*
	 * ============================================================
	 * 내부 유틸리티
	 * ============================================================
	 */

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

	/**
	 * 보충 지시 단건 조회
	 */
	private ReplenishOrder findReplenishOrder(Long domainId, String id) {
		String sql = "SELECT * FROM replenish_orders WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("domainId,id", domainId, id);
		List<ReplenishOrder> list = this.queryManager.selectListBySql(sql, params, ReplenishOrder.class, 0, 1);
		return list.isEmpty() ? null : list.get(0);
	}
}
