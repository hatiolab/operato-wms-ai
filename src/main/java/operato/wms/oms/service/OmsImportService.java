package operato.wms.oms.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import org.springframework.stereotype.Component;

import operato.wms.oms.entity.ImportShipmentOrder;
import operato.wms.oms.entity.ShipmentDelivery;
import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.oms.entity.ShipmentOrderItem;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.anythings.sys.util.AnyOrmUtil;
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
		return this.validateImportData(list, bizType, false);
	}

	/**
	 * 임포트 데이터를 일괄 조회 방식으로 검증한다.
	 *
	 * @param list              임포트 대상 데이터
	 * @param bizType           업무유형 (B2C_OUT / B2B_OUT)
	 * @param requireRefOrderNo 참조 주문번호 필수 여부
	 * @return 검증 결과
	 */
	public Map<String, Object> validateImportData(
			List<ImportShipmentOrder> list,
			String bizType,
			boolean requireRefOrderNo) {
		Long domainId = Domain.currentDomainId();
		int total = list.size();
		int validCount = 0;
		int errorCount = 0;
		List<Map<String, Object>> rows = new ArrayList<>();
		boolean isB2C = "B2C_OUT".equals(bizType);

		Set<String> skuCodes = new LinkedHashSet<>();
		Set<String> warehouseCodes = new LinkedHashSet<>();
		Set<String> companyCodes = new LinkedHashSet<>();
		Set<String> customerCodes = new LinkedHashSet<>();
		Set<String> referenceOrderNos = new LinkedHashSet<>();

		for (ImportShipmentOrder row : list) {
			this.addNotEmpty(skuCodes, row.getSkuCd());
			this.addNotEmpty(warehouseCodes, row.getWhCd());
			this.addNotEmpty(companyCodes, row.getComCd());
			this.addNotEmpty(customerCodes, row.getCustCd());
			this.addNotEmpty(referenceOrderNos, row.getRefOrderNo());
		}

		Map<String, String> skuNames = this.loadSkuNames(domainId, companyCodes, skuCodes);
		Set<String> existingWarehouses = this.loadExistingCodes(
				"warehouses", "wh_cd", domainId, warehouseCodes);
		Set<String> existingCompanies = this.loadExistingCodes(
				"companies", "com_cd", domainId, companyCodes);
		Set<String> existingCustomers = isB2C
				? new HashSet<>()
				: this.loadExistingCompositeCodes("customers", "com_cd", "cust_cd",
						domainId, companyCodes, customerCodes);
		Set<String> existingReferenceOrderNos = this.loadExistingCodes(
				"shipment_orders", "ref_order_no", domainId, referenceOrderNos);
		Map<String, List<String>> groupErrors = this.validateGroups(list);

		for (int i = 0; i < list.size(); i++) {
			ImportShipmentOrder row = list.get(i);
			List<String> errors = new ArrayList<String>();
			String compositeSkuKey = this.compositeKey(row.getComCd(), row.getSkuCd());
			String compositeCustomerKey = this.compositeKey(row.getComCd(), row.getCustCd());

			// 1. 필수 주문 정보 검증
			if (requireRefOrderNo && ValueUtil.isEmpty(row.getRefOrderNo())) {
				errors.add("참조 주문번호(ref_order_no)가 누락되었습니다");
			}
			if (ValueUtil.isEmpty(row.getComCd())) {
				errors.add("화주사 코드(com_cd)가 누락되었습니다");
			}
			if (ValueUtil.isEmpty(row.getWhCd())) {
				errors.add("창고 코드(wh_cd)가 누락되었습니다");
			}
			if (ValueUtil.isEmpty(row.getSkuCd())) {
				errors.add("상품코드(sku_cd)가 누락되었습니다");
			}
			if (row.getOrderQty() == null || row.getOrderQty() <= 0) {
				errors.add("주문 수량이 누락되었거나 숫자가 아니거나 1보다 작습니다.");
			}

			// 2. SKU 존재 여부 검증
			if (ValueUtil.isNotEmpty(row.getComCd()) && ValueUtil.isNotEmpty(row.getSkuCd())) {
				String skuName = skuNames.get(compositeSkuKey);
				if (skuName == null) {
					errors.add("화주사 [" + row.getComCd() + "]의 SKU [" + row.getSkuCd() + "]가 존재하지 않습니다");
				} else {
					row.setSkuNm(skuName);
				}
			}

			// 3. 창고 존재 여부 검증 (값이 있을 때만)
			if (ValueUtil.isNotEmpty(row.getWhCd()) && !existingWarehouses.contains(row.getWhCd())) {
				errors.add("창고 [" + row.getWhCd() + "]가 존재하지 않습니다");
			}

			// 4. 화주사 존재 여부 검증 (값이 있을 때만)
			if (ValueUtil.isNotEmpty(row.getComCd()) && !existingCompanies.contains(row.getComCd())) {
				errors.add("화주사 [" + row.getComCd() + "]가 존재하지 않습니다");
			}

			// 6. 날짜 형식 검증
			if (ValueUtil.isNotEmpty(row.getOrderDate()) && !row.getOrderDate().matches("\\d{4}-\\d{2}-\\d{2}")) {
				errors.add("주문일 날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)");
			}
			if (ValueUtil.isNotEmpty(row.getShipByDate()) && !row.getShipByDate().matches("\\d{4}-\\d{2}-\\d{2}")) {
				errors.add("출하기한 날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)");
			}

			// 7. 참조번호 중복 검증 (기존 데이터)
			if (ValueUtil.isNotEmpty(row.getRefOrderNo())
					&& existingReferenceOrderNos.contains(row.getRefOrderNo())) {
				errors.add("참조 주문번호 [" + row.getRefOrderNo() + "]가 이미 존재합니다");
			}

			// 8. B2B인 경우 거래처 존재 여부 검증 (값이 있을 때만)
			if (!isB2C && ValueUtil.isNotEmpty(row.getComCd()) && ValueUtil.isNotEmpty(row.getCustCd())
					&& !existingCustomers.contains(compositeCustomerKey)) {
				errors.add("화주사 [" + row.getComCd() + "]의 거래처 [" + row.getCustCd() + "]가 존재하지 않습니다");
			}

			List<String> currentGroupErrors = groupErrors.get(row.getRefOrderNo());
			if (currentGroupErrors != null) {
				errors.addAll(currentGroupErrors);
			}

			// 9. 결과 행 구성
			Map<String, Object> resultRow = this.toResultRow(row, i + 1, bizType, isB2C);

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

		return ValueUtil.newMap("total,valid,error,rows", total, validCount, errorCount, rows);
	}

	/**
	 * 문자열 값이 비어있지 않은 경우 집합에 추가한다.
	 *
	 * @param target 대상 집합
	 * @param value  추가할 값
	 */
	private void addNotEmpty(Set<String> target, String value) {
		if (ValueUtil.isNotEmpty(value)) {
			target.add(value);
		}
	}

	/**
	 * 화주사와 코드로 복합 조회 키를 생성한다.
	 *
	 * @param first  첫 번째 키
	 * @param second 두 번째 키
	 * @return 복합 키
	 */
	private String compositeKey(String first, String second) {
		return ValueUtil.toString(first) + "\u0000" + ValueUtil.toString(second);
	}

	/**
	 * SKU 코드를 한 번에 조회하여 화주사+SKU별 상품명 맵을 생성한다.
	 *
	 * @param domainId    도메인 ID
	 * @param companyCds  화주사 코드 집합
	 * @param skuCds      SKU 코드 집합
	 * @return 복합 키별 상품명
	 */
	@SuppressWarnings({ "rawtypes", "unchecked" })
	private Map<String, String> loadSkuNames(Long domainId, Set<String> companyCds, Set<String> skuCds) {
		Map<String, String> result = new HashMap<>();
		if (companyCds.isEmpty() || skuCds.isEmpty()) {
			return result;
		}

		String sql = "SELECT com_cd, sku_cd, sku_nm FROM sku "
				+ "WHERE domain_id = :domainId AND com_cd IN (:companyCds) AND sku_cd IN (:skuCds)";
		Map<String, Object> params = new HashMap<>();
		params.put("domainId", domainId);
		params.put("companyCds", companyCds);
		params.put("skuCds", skuCds);
		List<Map> found = this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
		for (Map row : found) {
			String comCd = ValueUtil.toString(row.get("com_cd"));
			String skuCd = ValueUtil.toString(row.get("sku_cd"));
			result.put(this.compositeKey(comCd, skuCd), ValueUtil.toString(row.get("sku_nm")));
		}
		return result;
	}

	/**
	 * 단일 코드 컬럼의 존재 값을 집합 조회한다.
	 *
	 * @param tableName  테이블명
	 * @param columnName 코드 컬럼명
	 * @param domainId   도메인 ID
	 * @param codes      조회할 코드
	 * @return 존재하는 코드 집합
	 */
	private Set<String> loadExistingCodes(
			String tableName,
			String columnName,
			Long domainId,
			Set<String> codes) {
		Set<String> result = new HashSet<>();
		if (codes.isEmpty()) {
			return result;
		}

		String sql = "SELECT DISTINCT " + columnName + " FROM " + tableName
				+ " WHERE domain_id = :domainId AND " + columnName + " IN (:codes)";
		Map<String, Object> params = new HashMap<>();
		params.put("domainId", domainId);
		params.put("codes", codes);
		List<String> found = this.queryManager.selectListBySql(sql, params, String.class, 0, 0);
		result.addAll(found);
		return result;
	}

	/**
	 * 화주사 코드와 업무 코드를 함께 사용하는 마스터의 존재 값을 집합 조회한다.
	 *
	 * @param tableName   테이블명
	 * @param firstColumn 첫 번째 컬럼명
	 * @param secondColumn 두 번째 컬럼명
	 * @param domainId    도메인 ID
	 * @param firstCodes  첫 번째 코드 집합
	 * @param secondCodes 두 번째 코드 집합
	 * @return 복합 코드 집합
	 */
	@SuppressWarnings({ "rawtypes", "unchecked" })
	private Set<String> loadExistingCompositeCodes(
			String tableName,
			String firstColumn,
			String secondColumn,
			Long domainId,
			Set<String> firstCodes,
			Set<String> secondCodes) {
		Set<String> result = new HashSet<>();
		if (firstCodes.isEmpty() || secondCodes.isEmpty()) {
			return result;
		}

		String sql = "SELECT DISTINCT " + firstColumn + ", " + secondColumn + " FROM " + tableName
				+ " WHERE domain_id = :domainId AND " + firstColumn + " IN (:firstCodes)"
				+ " AND " + secondColumn + " IN (:secondCodes)";
		Map<String, Object> params = new HashMap<>();
		params.put("domainId", domainId);
		params.put("firstCodes", firstCodes);
		params.put("secondCodes", secondCodes);
		List<Map> found = this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
		for (Map row : found) {
			result.add(this.compositeKey(
					ValueUtil.toString(row.get(firstColumn)),
					ValueUtil.toString(row.get(secondColumn))));
		}
		return result;
	}

	/**
	 * 동일 참조 주문번호 그룹의 헤더 필드와 라인 번호 일관성을 검증한다.
	 *
	 * @param list 임포트 행 목록
	 * @return 참조 주문번호별 오류 메시지
	 */
	private Map<String, List<String>> validateGroups(List<ImportShipmentOrder> list) {
		Map<String, ImportShipmentOrder> firstRows = new LinkedHashMap<>();
		Map<String, Set<String>> lineNumbers = new HashMap<>();
		Map<String, List<String>> errors = new HashMap<>();

		for (ImportShipmentOrder row : list) {
			if (ValueUtil.isEmpty(row.getRefOrderNo())) {
				continue;
			}

			String key = row.getRefOrderNo();
			ImportShipmentOrder first = firstRows.putIfAbsent(key, row);
			if (first != null && (!Objects.equals(first.getComCd(), row.getComCd())
					|| !Objects.equals(first.getWhCd(), row.getWhCd())
					|| !Objects.equals(first.getCustCd(), row.getCustCd())
					|| !Objects.equals(first.getOrderDate(), row.getOrderDate()))) {
				this.addGroupError(errors, key, "동일 참조 주문번호의 화주사·창고·거래처·주문일자가 일치하지 않습니다");
			}

			if (ValueUtil.isNotEmpty(row.getLineNo())) {
				Set<String> groupLines = lineNumbers.computeIfAbsent(key, ignored -> new HashSet<>());
				if (!groupLines.add(row.getLineNo())) {
					this.addGroupError(errors, key, "동일 참조 주문번호 안에 중복된 라인 번호가 있습니다: " + row.getLineNo());
				}
			}
		}

		return errors;
	}

	/**
	 * 주문 그룹 오류를 중복 없이 추가한다.
	 *
	 * @param errors 오류 맵
	 * @param key    참조 주문번호
	 * @param message 오류 메시지
	 */
	private void addGroupError(Map<String, List<String>> errors, String key, String message) {
		List<String> messages = errors.computeIfAbsent(key, ignored -> new ArrayList<>());
		if (!messages.contains(message)) {
			messages.add(message);
		}
	}

	/**
	 * 검증 결과 화면에 반환할 행 데이터를 생성한다.
	 *
	 * @param row     임포트 행
	 * @param rowNo   원본 행 번호
	 * @param bizType 업무 유형
	 * @param isB2C   B2C 여부
	 * @return 검증 결과 행
	 */
	private Map<String, Object> toResultRow(
			ImportShipmentOrder row,
			int rowNo,
			String bizType,
			boolean isB2C) {
		Map<String, Object> resultRow = ValueUtil.newMap("row_no", rowNo);
		resultRow.put("biz_type", ValueUtil.isNotEmpty(row.getBizType()) ? row.getBizType() : bizType);
		resultRow.put("ref_order_no", row.getRefOrderNo());
		resultRow.put("wave_no", row.getWaveNo());
		resultRow.put("sku_cd", row.getSkuCd());
		resultRow.put("sku_nm", row.getSkuNm());
		resultRow.put("order_qty", row.getOrderQty());
		resultRow.put("order_date", row.getOrderDate());
		resultRow.put("ship_by_date", row.getShipByDate());
		resultRow.put("cust_cd", row.getCustCd());
		resultRow.put("cust_nm", row.getCustNm());
		resultRow.put("wh_cd", row.getWhCd());
		resultRow.put("com_cd", row.getComCd());
		resultRow.put("dlv_type", row.getDlvType());
		resultRow.put("carrier_service_type", row.getCarrierServiceType());
		resultRow.put("carrier_cd", row.getCarrierCd());
		resultRow.put("priority_cd", row.getPriorityCd());
		resultRow.put("remarks", row.getRemarks());

		if (isB2C) {
			resultRow.put("orderer_nm", row.getOrdererNm());
			resultRow.put("receiver_nm", row.getReceiverNm());
			resultRow.put("sender_nm", row.getSenderNm());
			resultRow.put("sender_phone", row.getSenderPhone());
			resultRow.put("sender_zip_cd", row.getSenderZipCd());
			resultRow.put("sender_addr", row.getSenderAddr());
			resultRow.put("receiver_phone", row.getReceiverPhone());
			resultRow.put("receiver_zip_cd", row.getReceiverZipCd());
			resultRow.put("receiver_addr", row.getReceiverAddr());
			resultRow.put("receiver_addr2", row.getReceiverAddr2());
			resultRow.put("delivery_memo", row.getDeliveryMemo());
		}

		return resultRow;
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
			order.setWaveNo(firstRow.getWaveNo());
			order.setOrderDate(ValueUtil.isNotEmpty(firstRow.getOrderDate()) ? firstRow.getOrderDate() : today);
			order.setShipByDate(firstRow.getShipByDate());
			order.setComCd(firstRow.getComCd());
			order.setCustCd(firstRow.getCustCd());
			order.setCustNm(firstRow.getCustNm());
			order.setOrdererNm(firstRow.getOrdererNm());
			order.setReceiverNm(firstRow.getReceiverNm());
			order.setWhCd(ValueUtil.isNotEmpty(firstRow.getWhCd()) ? firstRow.getWhCd() : "DEFAULT");
			order.setBizType(firstRow.getBizType());
			order.setShipType(firstRow.getShipType());
			order.setDlvType(firstRow.getDlvType());
			order.setCarrierCd(firstRow.getCarrierCd());
			order.setCarrierServiceType(firstRow.getCarrierServiceType());
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

		return ValueUtil.newMap("total_rows,order_count,item_count,delivery_count", list.size(), orderCount, itemCount,
				deliveryCount);
	}
}
