package operato.wms.oms.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import operato.wms.base.entity.SKU;
import operato.wms.oms.entity.ImportShipmentOrder;
import operato.wms.oms.entity.ShipmentDelivery;
import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.oms.entity.ShipmentOrderItem;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.anythings.sys.util.AnyOrmUtil;
import xyz.elidom.dbist.dml.Filter;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * OMS 임포트 서비스
 *
 * 출하 주문 임포트(검증/등록) 처리를 담당한다.
 *
 * @author HatioLab
 */
@Component
public class OmsImportService extends AbstractQueryService {

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
			Map<String, Object> resultRow = ValueUtil.newMap("row_no", i + 1);
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

		Map<String, Object> result = ValueUtil.newMap("total", total);
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
	 * @return 처리 결과 { total_rows, order_count, item_count, delivery_count }
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
			order.setCustNm(firstRow.getOrdererNm());
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

		Map<String, Object> result = ValueUtil.newMap("total_rows", list.size());
		result.put("order_count", orderCount);
		result.put("item_count", itemCount);
		result.put("delivery_count", deliveryCount);
		return result;
	}
}
