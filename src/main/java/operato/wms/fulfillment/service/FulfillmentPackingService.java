package operato.wms.fulfillment.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import operato.wms.fulfillment.entity.PackingBox;
import operato.wms.fulfillment.entity.PackingOrder;
import operato.wms.fulfillment.entity.PackingOrderItem;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.entity.User;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 풀필먼트 패킹 서비스
 *
 * 검수/포장 지시의 상태 전이, 박스 관리 및 관련 조회를 담당한다.
 *
 * @author HatioLab
 */
@Component
public class FulfillmentPackingService extends AbstractQueryService {

	/**
	 * 패킹 지시 시작 (CREATED -> IN_PROGRESS)
	 *
	 * @param id 패킹 지시 ID
	 * @return { success, pack_order_no, status }
	 */
	public Map<String, Object> startPackingOrder(String id) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		PackingOrder order = this.findPackingOrder(domainId, id);

		if (!PackingOrder.STATUS_CREATED.equals(order.getStatus())) {
			throw new ElidomValidationException("패킹 지시 상태가 [" + order.getStatus() + "]이므로 시작할 수 없습니다 (CREATED 상태만 가능)");
		}

		String sql = "UPDATE packing_orders SET status = :status, started_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,now,domainId,id",
				PackingOrder.STATUS_IN_PROGRESS, now, domainId, id);
		this.queryManager.executeBySql(sql, params);

		Map<String, Object> result = ValueUtil.newMap("success", true);
		result.put("pack_order_no", order.getPackOrderNo());
		result.put("status", PackingOrder.STATUS_IN_PROGRESS);
		return result;
	}

	/**
	 * 패킹 지시 완료 (IN_PROGRESS -> COMPLETED)
	 *
	 * 1. INSPECTED 아이템을 PACKED로 일괄 변경
	 * 2. 포장 박스 생성 (boxType, boxCount, boxWeight, trackingNo)
	 * - boxType이 없으면 주문 아이템 합산 중량·부피 기준으로 최적 BoxType 자동 선택 (sortNo 우선)
	 * 3. 패킹 지시 상태를 COMPLETED로 변경
	 *
	 * @param id     패킹 지시 ID
	 * @param params { boxType, boxCount, boxWeight, trackingNo }
	 * @return { success, pack_order_no, status }
	 */
	public Map<String, Object> completePackingOrder(String id, Map<String, Object> params) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		PackingOrder order = this.findPackingOrder(domainId, id);

		if (!PackingOrder.STATUS_IN_PROGRESS.equals(order.getStatus())) {
			throw new ElidomValidationException(
					"패킹 지시 상태가 [" + order.getStatus() + "]이므로 완료할 수 없습니다 (IN_PROGRESS 상태만 가능)");
		}

		// 1. INSPECTED 상태 아이템을 PACKED로 일괄 변경 (pack_qty = insp_qty)
		String packItemsSql = "UPDATE packing_order_items SET pack_qty = insp_qty, status = :packedStatus, updated_at = now()"
				+ " WHERE domain_id = :domainId AND packing_order_id = :packingOrderId AND status = :inspectedStatus";
		Map<String, Object> packItemsParams = ValueUtil.newMap("packedStatus,domainId,packingOrderId,inspectedStatus",
				PackingOrderItem.STATUS_PACKED, domainId, id, PackingOrderItem.STATUS_INSPECTED);
		this.queryManager.executeBySql(packItemsSql, packItemsParams);

		// 2. 포장 박스 생성
		String boxType = params.get("boxType") != null ? params.get("boxType").toString() : null;

		// boxType이 없으면 주문 아이템 기준으로 자동 선택
		if (ValueUtil.isEmpty(boxType)) {
			boxType = this.selectOptimalBoxType(domainId, id, order.getComCd(), order.getWhCd());
		}

		int boxCount = params.get("boxCount") != null ? Integer.parseInt(params.get("boxCount").toString()) : 1;
		double boxWeight = params.get("boxWeight") != null ? Double.parseDouble(params.get("boxWeight").toString())
				: 0.0;
		String trackingNo = params.get("trackingNo") != null ? params.get("trackingNo").toString().trim() : null;

		// 아이템 집계 (총 품목수, 총 수량)
		String aggSql = "SELECT COUNT(DISTINCT sku_cd) AS total_item, COALESCE(SUM(pack_qty), 0) AS total_qty"
				+ " FROM packing_order_items WHERE domain_id = :domainId AND packing_order_id = :packingOrderId AND status = :packedStatus";
		Map<String, Object> aggParams = ValueUtil.newMap("domainId,packingOrderId,packedStatus", domainId, id,
				PackingOrderItem.STATUS_PACKED);
		List<Map> aggList = this.queryManager.selectListBySql(aggSql, aggParams, Map.class, 0, 1);

		int totalItem = 0;
		double totalQty = 0;
		if (!aggList.isEmpty()) {
			Map aggRow = aggList.get(0);
			totalItem = aggRow.get("total_item") != null ? Integer.parseInt(aggRow.get("total_item").toString()) : 0;
			totalQty = aggRow.get("total_qty") != null ? Double.parseDouble(aggRow.get("total_qty").toString()) : 0;
		}

		double weightPerBox = boxCount > 0 ? boxWeight / boxCount : 0.0;

		String firstBoxId = null;

		for (int i = 1; i <= boxCount; i++) {
			PackingBox box = new PackingBox();
			box.setDomainId(domainId);
			box.setPackingOrderId(id);
			box.setBoxSeq(i);
			box.setBoxTypeCd(boxType);
			box.setBoxWt(Math.round(weightPerBox * 100.0) / 100.0);
			box.setInvoiceNo(trackingNo);
			box.setLabelPrintedFlag(false);
			box.setStatus(PackingBox.STATUS_CLOSED);

			// 첫 번째 박스에 전체 아이템 수/수량 집계
			if (i == 1) {
				box.setTotalItem(totalItem);
				box.setTotalQty(totalQty);
			} else {
				box.setTotalItem(0);
				box.setTotalQty(0.0);
			}

			this.queryManager.insert(box);

			if (i == 1) {
				firstBoxId = box.getId();
			}
		}

		// 2-1. PACKED 아이템에 첫 번째 박스 ID 할당
		if (firstBoxId != null) {
			String boxAssignSql = "UPDATE packing_order_items SET packing_box_id = :boxId, updated_at = now()"
					+ " WHERE domain_id = :domainId AND packing_order_id = :packingOrderId AND status = :packedStatus";
			Map<String, Object> boxAssignParams = ValueUtil.newMap("boxId,domainId,packingOrderId,packedStatus",
					firstBoxId, domainId, id, PackingOrderItem.STATUS_PACKED);
			this.queryManager.executeBySql(boxAssignSql, boxAssignParams);
		}

		// 3. 패킹 지시 완료 처리 (로그인 사용자를 작업자로 기록)
		String workerId = User.currentUser() != null ? User.currentUser().getId() : null;

		String sql = "UPDATE packing_orders SET status = :status, completed_at = :now,"
				+ " total_box = :totalBox, total_wt = :totalWt, worker_id = :workerId, updated_at = now()"
				+ " WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updParams = ValueUtil.newMap("status,now,totalBox,totalWt,workerId,domainId,id",
				PackingOrder.STATUS_COMPLETED, now, boxCount, boxWeight, workerId, domainId, id);
		this.queryManager.executeBySql(sql, updParams);

		Map<String, Object> results = ValueUtil.newMap("success", true);
		results.put("pack_order_no", order.getPackOrderNo());
		results.put("status", PackingOrder.STATUS_COMPLETED);
		return results;
	}

	/**
	 * 패킹 지시 리셋 (CREATED/IN_PROGRESS/COMPLETED → CREATED)
	 *
	 * 포장 실수·작업자 교대 등의 사유로 포장을 처음부터 다시 시작할 수 있도록 리셋한다.
	 * LABEL_PRINTED 이후(송장 발행 후)와 SHIPPED 상태는 리셋 불가.
	 * 박스는 물리적으로 해체되므로 삭제하고, ShipmentOrder는 PACKING 유지.
	 * 재고 할당(stock_allocations/reserved_qty)은 유지하므로 재할당 없이 즉시 재작업 가능하다.
	 *
	 * @param id 패킹 지시 ID
	 * @return { success, pack_order_no }
	 */
	public Map<String, Object> cancelPackingOrder(String id) {
		Long domainId = Domain.currentDomainId();

		PackingOrder order = this.findPackingOrder(domainId, id);

		String status = order.getStatus();
		if (PackingOrder.STATUS_SHIPPED.equals(status)) {
			throw new ElidomValidationException("패킹 지시 상태가 [SHIPPED]이므로 리셋할 수 없습니다");
		}
		if (PackingOrder.STATUS_LABEL_PRINTED.equals(status) || PackingOrder.STATUS_MANIFESTED.equals(status)) {
			throw new ElidomValidationException("패킹 지시 상태가 [" + status + "]이므로 리셋할 수 없습니다 (송장 취소 후 처리 필요)");
		}
		if (PackingOrder.STATUS_CREATED.equals(status)) {
			throw new ElidomValidationException("패킹 지시 상태가 이미 [CREATED]입니다");
		}

		// 박스 삭제 (물리적으로 해체되므로 레코드 제거)
		String delBoxSql = "DELETE FROM packing_boxes WHERE domain_id = :domainId AND packing_order_id = :packingOrderId";
		Map<String, Object> delBoxParams = ValueUtil.newMap("domainId,packingOrderId", domainId, id);
		this.queryManager.executeBySql(delBoxSql, delBoxParams);

		// 패킹 상세 아이템 리셋 (WAIT 복귀, 수량·박스 배정 초기화)
		String itemSql = "UPDATE packing_order_items"
				+ " SET status = :status, insp_qty = 0, pack_qty = 0, short_qty = 0, packing_box_id = null, updated_at = now()"
				+ " WHERE domain_id = :domainId AND packing_order_id = :packingOrderId";
		Map<String, Object> itemParams = ValueUtil.newMap("status,domainId,packingOrderId",
				PackingOrderItem.STATUS_WAIT, domainId, id);
		this.queryManager.executeBySql(itemSql, itemParams);

		// 패킹 지시 헤더 리셋 (CREATED 복귀, 작업자·시간·박스 정보 초기화)
		String sql = "UPDATE packing_orders"
				+ " SET status = :status, worker_id = null, started_at = null, completed_at = null,"
				+ " total_box = 0, total_wt = 0, updated_at = now()"
				+ " WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,domainId,id",
				PackingOrder.STATUS_CREATED, domainId, id);
		this.queryManager.executeBySql(sql, params);

		return ValueUtil.newMap("success,pack_order_no", true, order.getPackOrderNo());
	}

	/**
	 * 박스 생성
	 *
	 * 패킹 지시에 새 박스를 추가한다. box_seq는 자동으로 다음 순번을 부여한다.
	 *
	 * @param packingOrderId 패킹 지시 ID
	 * @return { success, box_id, box_seq }
	 */
	public Map<String, Object> createBox(String packingOrderId) {
		Long domainId = Domain.currentDomainId();

		PackingOrder order = this.findPackingOrder(domainId, packingOrderId);

		if (PackingOrder.STATUS_CANCELLED.equals(order.getStatus())
				|| PackingOrder.STATUS_SHIPPED.equals(order.getStatus())) {
			throw new ElidomValidationException("패킹 지시 상태가 [" + order.getStatus() + "]이므로 박스를 생성할 수 없습니다");
		}

		// 다음 box_seq 조회
		String seqSql = "SELECT COALESCE(MAX(box_seq), 0) FROM packing_boxes WHERE domain_id = :domainId AND packing_order_id = :packingOrderId";
		Map<String, Object> seqParams = ValueUtil.newMap("domainId,packingOrderId", domainId, packingOrderId);
		Integer maxSeq = this.queryManager.selectBySql(seqSql, seqParams, Integer.class);
		int nextSeq = (maxSeq != null ? maxSeq : 0) + 1;

		// PackingBox 생성
		PackingBox box = new PackingBox();
		box.setDomainId(domainId);
		box.setPackingOrderId(packingOrderId);
		box.setBoxSeq(nextSeq);
		box.setTotalItem(0);
		box.setTotalQty(0.0);
		box.setBoxWt(0.0);
		box.setLabelPrintedFlag(false);
		box.setStatus(PackingBox.STATUS_OPEN);
		this.queryManager.insert(box);

		Map<String, Object> result = ValueUtil.newMap("success", true);
		result.put("box_id", box.getId());
		result.put("box_seq", nextSeq);
		return result;
	}

	/**
	 * 박스 마감 (OPEN -> CLOSED)
	 *
	 * 박스에 포함된 아이템의 수량을 집계하고 상태를 CLOSED로 변경한다.
	 *
	 * @param boxId 박스 ID
	 * @return { success, box_seq, total_item, total_qty }
	 */
	public Map<String, Object> closeBox(String boxId) {
		Long domainId = Domain.currentDomainId();

		PackingBox box = this.findPackingBox(domainId, boxId);

		if (!PackingBox.STATUS_OPEN.equals(box.getStatus())) {
			throw new ElidomValidationException("박스 상태가 [" + box.getStatus() + "]이므로 마감할 수 없습니다 (OPEN 상태만 가능)");
		}

		// 박스 내 아이템 집계
		String aggSql = "SELECT COUNT(DISTINCT sku_cd) AS total_item, COALESCE(SUM(pack_qty), 0) AS total_qty"
				+ " FROM packing_order_items WHERE domain_id = :domainId AND packing_box_id = :boxId";
		Map<String, Object> aggParams = ValueUtil.newMap("domainId,boxId", domainId, boxId);
		List<Map> aggList = this.queryManager.selectListBySql(aggSql, aggParams, Map.class, 0, 1);

		int totalItem = 0;
		double totalQty = 0;
		if (!aggList.isEmpty()) {
			Map aggRow = aggList.get(0);
			totalItem = aggRow.get("total_item") != null ? Integer.parseInt(aggRow.get("total_item").toString()) : 0;
			totalQty = aggRow.get("total_qty") != null ? Double.parseDouble(aggRow.get("total_qty").toString()) : 0;
		}

		String sql = "UPDATE packing_boxes SET status = :status, total_item = :totalItem, total_qty = :totalQty, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,totalItem,totalQty,domainId,id",
				PackingBox.STATUS_CLOSED, totalItem, totalQty, domainId, boxId);
		this.queryManager.executeBySql(sql, params);

		Map<String, Object> result = ValueUtil.newMap("success", true);
		result.put("box_seq", box.getBoxSeq());
		result.put("total_item", totalItem);
		result.put("total_qty", totalQty);
		return result;
	}

	/**
	 * 대기중인 포장 주문 목록 조회
	 *
	 * @param orderDate 주문 날짜 (YYYY-MM-DD)
	 * @return 포장 주문 목록
	 */
	@SuppressWarnings("rawtypes")
	public List<Map> searchTodoPackingOrders(String orderDate) {
		Long domainId = Domain.currentDomainId();

		StringBuilder sql = new StringBuilder();
		sql.append("SELECT po.id, po.pack_order_no, po.wave_no, po.shipment_no, po.order_date, po.carrier_cd,");
		sql.append(" po.status, po.created_at, po.started_at, po.completed_at,");
		sql.append(" po.total_box, po.total_wt,");
		sql.append(
				" (SELECT SUM(poi.order_qty) FROM packing_order_items poi WHERE poi.domain_id = po.domain_id AND poi.packing_order_id = po.id) AS total_qty,");
		sql.append(
				" (SELECT COUNT(distinct(poi.sku_cd)) FROM packing_order_items poi WHERE poi.domain_id = po.domain_id AND poi.packing_order_id = po.id) AS total_items,");
		sql.append(
				" (SELECT SUM(poi.pack_qty) FROM packing_order_items poi WHERE poi.domain_id = po.domain_id AND poi.packing_order_id = po.id) AS packed_qty");
		sql.append(" FROM packing_orders po");
		sql.append(" WHERE po.domain_id = :domainId AND po.status in ('CREATED', 'IN_PROGRESS')");

		Map<String, Object> params = ValueUtil.newMap("domainId", domainId);

		if (orderDate != null && !orderDate.isEmpty()) {
			sql.append(" AND po.order_date = :orderDate");
			params.put("orderDate", orderDate);
		}

		// sql.append(
		// " ORDER BY CASE po.priority_cd WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN
		// 'NORMAL' THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END, po.created_at");

		return this.queryManager.selectListBySql(sql.toString(), params, Map.class, 0, 0);
	}

	/**
	 * 완료된 포장 주문 목록 조회
	 *
	 * @param orderDate 주문 날짜 (YYYY-MM-DD)
	 * @return 포장 주문 목록
	 */
	@SuppressWarnings("rawtypes")
	public List<Map> searchDonePackingOrders(String orderDate) {
		Long domainId = Domain.currentDomainId();

		StringBuilder sql = new StringBuilder();
		sql.append("SELECT po.id, po.pack_order_no, po.wave_no, po.shipment_no, po.order_date, po.carrier_cd,");
		sql.append(" po.status, po.created_at, po.started_at, po.completed_at,");
		sql.append(" po.total_box, po.total_wt,");
		sql.append(
				" (SELECT SUM(poi.order_qty) FROM packing_order_items poi WHERE poi.domain_id = po.domain_id AND poi.packing_order_id = po.id) AS total_qty,");
		sql.append(
				" (SELECT COUNT(distinct(poi.sku_cd)) FROM packing_order_items poi WHERE poi.domain_id = po.domain_id AND poi.packing_order_id = po.id) AS total_items,");
		sql.append(
				" (SELECT SUM(poi.pack_qty) FROM packing_order_items poi WHERE poi.domain_id = po.domain_id AND poi.packing_order_id = po.id) AS packed_qty");
		sql.append(" FROM packing_orders po");
		sql.append(" WHERE po.domain_id = :domainId AND po.status not in ('CREATED', 'IN_PROGRESS', 'CANCELLED')");

		Map<String, Object> params = ValueUtil.newMap("domainId", domainId);

		if (orderDate != null && !orderDate.isEmpty()) {
			sql.append(" AND po.order_date = :orderDate");
			params.put("orderDate", orderDate);
		}

		// sql.append(
		// " ORDER BY CASE po.priority_cd WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN
		// 'NORMAL' THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END, po.created_at");

		return this.queryManager.selectListBySql(sql.toString(), params, Map.class, 0, 0);
	}

	/**
	 * 포장 주문 목록 조회 (상태/날짜 필터)
	 *
	 * @param status    주문 상태 (INSPECTED, PACKING, COMPLETED 등)
	 * @param orderDate 주문 날짜 (YYYY-MM-DD)
	 * @return 포장 주문 목록
	 */
	@SuppressWarnings("rawtypes")
	public List<Map> searchPackingOrders(String status, String orderDate) {
		Long domainId = Domain.currentDomainId();

		StringBuilder sql = new StringBuilder();
		sql.append("SELECT po.id, po.pack_order_no, po.wave_no, po.shipment_no, po.order_date, po.carrier_cd,");
		sql.append(" po.status, po.created_at, po.started_at, po.completed_at,");
		sql.append(" po.total_box, po.total_wt,");
		sql.append(
				" (SELECT SUM(poi.order_qty) FROM packing_order_items poi WHERE poi.domain_id = po.domain_id AND poi.packing_order_id = po.id) AS total_qty,");
		sql.append(
				" (SELECT COUNT(distinct(poi.sku_cd)) FROM packing_order_items poi WHERE poi.domain_id = po.domain_id AND poi.packing_order_id = po.id) AS total_items,");
		sql.append(
				" (SELECT SUM(poi.pack_qty) FROM packing_order_items poi WHERE poi.domain_id = po.domain_id AND poi.packing_order_id = po.id) AS packed_qty");
		sql.append(" FROM packing_orders po");
		sql.append(" WHERE po.domain_id = :domainId");

		Map<String, Object> params = ValueUtil.newMap("domainId", domainId);

		if (status != null && !status.isEmpty()) {
			sql.append(" AND po.status = :status");
			params.put("status", status);
		}

		if (orderDate != null && !orderDate.isEmpty()) {
			sql.append(" AND po.order_date = :orderDate");
			params.put("orderDate", orderDate);
		}

		// sql.append(
		// " ORDER BY CASE po.priority_cd WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN
		// 'NORMAL' THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END, po.created_at");

		return this.queryManager.selectListBySql(sql.toString(), params, Map.class, 0, 0);
	}

	/**
	 * 패킹 지시 상세 아이템 조회
	 *
	 * @param id 패킹 지시 ID
	 * @return 패킹 상세 아이템 목록
	 */
	public List<Map> getPackingOrderItems(String id) {
		Long domainId = Domain.currentDomainId();

		// 패킹 지시 존재 확인
		this.findPackingOrder(domainId, id);

		String sql = "SELECT id, packing_order_id, shipment_order_item_id, packing_box_id,"
				+ " sku_cd, sku_nm, barcode, lot_no, expired_date,"
				+ " order_qty, insp_qty, pack_qty, short_qty, status"
				+ " FROM packing_order_items"
				+ " WHERE domain_id = :domainId AND packing_order_id = :packingOrderId"
				+ " ORDER BY sku_cd";
		Map<String, Object> params = ValueUtil.newMap("domainId,packingOrderId", domainId, id);
		return this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
	}

	/**
	 * 포장 아이템 조회 (packing_order_id로 필터)
	 *
	 * 프론트엔드 API 호환성을 위해 제공. getPackingOrderItems(id)와 동일한 기능.
	 *
	 * @param packingOrderId 포장 주문 ID
	 * @return 포장 아이템 목록
	 */
	@SuppressWarnings("rawtypes")
	public List<Map> getPackingOrderItemsByOrderId(String packingOrderId) {
		return this.getPackingOrderItems(packingOrderId);
	}

	/**
	 * 패킹 지시 박스 목록 조회
	 *
	 * @param id 패킹 지시 ID
	 * @return 박스 목록
	 */
	public List<Map> getPackingBoxes(String id) {
		Long domainId = Domain.currentDomainId();

		// 패킹 지시 존재 확인
		this.findPackingOrder(domainId, id);

		String sql = "SELECT id, packing_order_id, box_seq, box_type_cd, box_wt,"
				+ " total_item, total_qty, invoice_no, vehicle_no,"
				+ " label_printed_flag, label_printed_at, shipped_at, status"
				+ " FROM packing_boxes"
				+ " WHERE domain_id = :domainId AND packing_order_id = :packingOrderId"
				+ " ORDER BY box_seq";
		Map<String, Object> params = ValueUtil.newMap("domainId,packingOrderId", domainId, id);
		return this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
	}

	/**
	 * 아이템 검수 (수량 대조)
	 *
	 * 포장 항목의 insp_qty를 갱신하고 상태를 INSPECTED로 변경한다.
	 *
	 * @param itemId 포장 항목 ID
	 * @param params { insp_qty }
	 * @return { success, item_id, sku_cd, insp_qty, status }
	 */
	public Map<String, Object> inspectItem(String itemId, Map<String, Object> params) {
		Long domainId = Domain.currentDomainId();

		PackingOrderItem item = this.findPackingOrderItem(domainId, itemId);

		if (!PackingOrderItem.STATUS_WAIT.equals(item.getStatus())
				&& !PackingOrderItem.STATUS_INSPECTED.equals(item.getStatus())) {
			throw new ElidomValidationException("검수가 이미 종료되었습니다.");
		}

		double inspQty = params.get("insp_qty") != null ? Double.parseDouble(params.get("insp_qty").toString())
				: item.getOrderQty();

		String sql = "UPDATE packing_order_items SET insp_qty = :inspQty, status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updParams = ValueUtil.newMap("inspQty,status,domainId,id",
				inspQty, PackingOrderItem.STATUS_INSPECTED, domainId, itemId);
		this.queryManager.executeBySql(sql, updParams);

		Map<String, Object> result = ValueUtil.newMap("success", true);
		result.put("item_id", itemId);
		result.put("sku_cd", item.getSkuCd());
		result.put("insp_qty", inspQty);
		result.put("status", PackingOrderItem.STATUS_INSPECTED);
		return result;
	}

	/**
	 * 아이템 검수 완료 (finish)
	 *
	 * 검수 수량을 확정하고 상태를 INSPECTED로 변경한다.
	 * inspectItem과 동일한 기능이지만 프론트엔드 API 호환성을 위해 별도 메서드로 제공.
	 *
	 * @param itemId 포장 항목 ID
	 * @param params { insp_qty }
	 * @return { success, item_id, sku_cd, insp_qty, status }
	 */
	public Map<String, Object> finishPackingItem(String itemId, Map<String, Object> params) {
		return this.inspectItem(itemId, params);
	}

	/**
	 * 아이템 포장 (박스 투입)
	 *
	 * 포장 항목의 pack_qty를 갱신하고, 지정 박스에 배정하며 상태를 PACKED로 변경한다.
	 *
	 * @param itemId 포장 항목 ID
	 * @param params { pack_qty, packing_box_id }
	 * @return { success, item_id, sku_cd, pack_qty, packing_box_id, status }
	 */
	public Map<String, Object> packItem(String itemId, Map<String, Object> params) {
		Long domainId = Domain.currentDomainId();

		PackingOrderItem item = this.findPackingOrderItem(domainId, itemId);

		if (!PackingOrderItem.STATUS_INSPECTED.equals(item.getStatus())
				&& !PackingOrderItem.STATUS_WAIT.equals(item.getStatus())) {
			throw new ElidomValidationException(
					"포장 항목 상태가 [" + item.getStatus() + "]이므로 포장할 수 없습니다 (WAIT/INSPECTED 상태만 가능)");
		}

		double packQty = params.get("pack_qty") != null ? Double.parseDouble(params.get("pack_qty").toString())
				: item.getOrderQty();
		String boxId = params.get("packing_box_id") != null ? params.get("packing_box_id").toString() : null;

		String sql = "UPDATE packing_order_items SET pack_qty = :packQty, status = :status"
				+ (boxId != null ? ", packing_box_id = :boxId" : "")
				+ ", updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updParams = ValueUtil.newMap("packQty,status,domainId,id",
				packQty, PackingOrderItem.STATUS_PACKED, domainId, itemId);
		if (boxId != null) {
			updParams.put("boxId", boxId);
		}
		this.queryManager.executeBySql(sql, updParams);

		Map<String, Object> result = ValueUtil.newMap("success", true);
		result.put("item_id", itemId);
		result.put("sku_cd", item.getSkuCd());
		result.put("pack_qty", packQty);
		result.put("packing_box_id", boxId);
		result.put("status", PackingOrderItem.STATUS_PACKED);
		return result;
	}

	/*
	 * ============================================================
	 * 내부 유틸리티
	 * ============================================================
	 */

	/**
	 * 최적 BoxType 자동 선택
	 *
	 * 포장 아이템의 합산 중량·부피를 계산하고, 조건을 충족하는 BoxType 중
	 * sortNo가 가장 낮은 것을 반환한다.
	 *
	 * 조건: max_weight >= 총 중량, box_vol >= 총 부피 (NULL이면 무제한으로 간주)
	 *
	 * @param domainId       도메인 ID
	 * @param packingOrderId 패킹 지시 ID
	 * @param comCd          화주사 코드 (BoxType 필터링)
	 * @param whCd           창고 코드 (BoxType 필터링)
	 * @return 선택된 BoxType 코드, 없으면 null
	 */
	@SuppressWarnings("rawtypes")
	private String selectOptimalBoxType(Long domainId, String packingOrderId, String comCd, String whCd) {
		// 1. 포장 아이템의 합산 중량·부피 계산 (SKU 마스터 JOIN)
		String aggSql = "SELECT COALESCE(SUM(s.sku_wt * poi.pack_qty), 0) AS total_weight,"
				+ " COALESCE(SUM(s.sku_vol * poi.pack_qty), 0) AS total_volume"
				+ " FROM packing_order_items poi"
				+ " LEFT JOIN skus s ON s.domain_id = poi.domain_id AND s.com_cd = :comCd AND s.sku_cd = poi.sku_cd"
				+ " WHERE poi.domain_id = :domainId AND poi.packing_order_id = :packingOrderId AND poi.status = :packedStatus";
		Map<String, Object> aggParams = ValueUtil.newMap("domainId,packingOrderId,packedStatus,comCd",
				domainId, packingOrderId, PackingOrderItem.STATUS_PACKED, comCd);
		List<Map> aggList = this.queryManager.selectListBySql(aggSql, aggParams, Map.class, 0, 1);

		double totalWeight = 0;
		double totalVolume = 0;
		if (!aggList.isEmpty()) {
			Map row = aggList.get(0);
			totalWeight = row.get("total_weight") != null ? Double.parseDouble(row.get("total_weight").toString()) : 0;
			totalVolume = row.get("total_volume") != null ? Double.parseDouble(row.get("total_volume").toString()) : 0;
		}

		// 2. 조건을 충족하는 BoxType 중 sortNo가 가장 낮은 것 선택
		String boxSql = "SELECT box_type_cd FROM box_types"
				+ " WHERE domain_id = :domainId AND com_cd = :comCd AND wh_cd = :whCd"
				+ " AND (del_flag IS NULL OR del_flag = false)"
				+ " AND (max_weight IS NULL OR max_weight >= :totalWeight)"
				+ " AND (box_vol IS NULL OR box_vol >= :totalVolume)"
				+ " ORDER BY sort_no ASC NULLS LAST"
				+ " LIMIT 1";
		Map<String, Object> boxParams = ValueUtil.newMap("domainId,comCd,whCd,totalWeight,totalVolume",
				domainId, comCd, whCd, totalWeight, totalVolume);
		return this.queryManager.selectBySql(boxSql, boxParams, String.class);
	}

	/**
	 * 포장 항목 단건 조회
	 */
	private PackingOrderItem findPackingOrderItem(Long domainId, String id) {
		String sql = "SELECT * FROM packing_order_items WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("domainId,id", domainId, id);
		List<PackingOrderItem> list = this.queryManager.selectListBySql(sql, params, PackingOrderItem.class, 0, 1);
		if (list.isEmpty()) {
			throw new ElidomValidationException("포장 항목을 찾을 수 없습니다: " + id);
		}
		return list.get(0);
	}

	/**
	 * 패킹 지시 단건 조회
	 */
	private PackingOrder findPackingOrder(Long domainId, String id) {
		String sql = "SELECT * FROM packing_orders WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("domainId,id", domainId, id);
		List<PackingOrder> list = this.queryManager.selectListBySql(sql, params, PackingOrder.class, 0, 1);
		if (list.isEmpty()) {
			throw new ElidomValidationException("패킹 지시를 찾을 수 없습니다: " + id);
		}
		return list.get(0);
	}

	/**
	 * 포장 박스 단건 조회
	 */
	private PackingBox findPackingBox(Long domainId, String id) {
		String sql = "SELECT * FROM packing_boxes WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("domainId,id", domainId, id);
		List<PackingBox> list = this.queryManager.selectListBySql(sql, params, PackingBox.class, 0, 1);
		if (list.isEmpty()) {
			throw new ElidomValidationException("포장 박스를 찾을 수 없습니다: " + id);
		}
		return list.get(0);
	}
}
