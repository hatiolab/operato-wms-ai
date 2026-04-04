package operato.wms.fulfillment.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import operato.wms.fulfillment.entity.PackingBox;
import operato.wms.fulfillment.entity.PackingOrder;
import operato.wms.oms.entity.ShipmentOrder;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 풀필먼트 출하 서비스
 *
 * 라벨 출력, 적하 목록 전송, 출하 확정, 출하 취소 등 출하 관련 트랜잭션을 담당한다.
 *
 * @author HatioLab
 */
@Component
public class FulfillmentShippingService extends AbstractQueryService {

	/**
	 * 라벨 출력 (COMPLETED -> LABEL_PRINTED)
	 *
	 * 패킹 완료 후 송장 라벨을 출력한다.
	 * 패킹 지시에 연결된 박스의 라벨 출력 플래그도 갱신한다.
	 *
	 * @param packingOrderId 패킹 지시 ID
	 * @return { success, pack_order_no, status }
	 */
	public Map<String, Object> printLabel(String packingOrderId) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		PackingOrder order = this.findPackingOrder(domainId, packingOrderId);

		if (!PackingOrder.STATUS_COMPLETED.equals(order.getStatus())) {
			throw new ElidomValidationException(
					"패킹 지시 상태가 [" + order.getStatus() + "]이므로 라벨을 출력할 수 없습니다 (COMPLETED 상태만 가능)");
		}

		// 패킹 지시 상태 변경
		String sql = "UPDATE packing_orders SET status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,domainId,id",
				PackingOrder.STATUS_LABEL_PRINTED, domainId, packingOrderId);
		this.queryManager.executeBySql(sql, params);

		// 박스 라벨 출력 플래그 갱신
		String boxSql = "UPDATE packing_boxes SET label_printed_flag = true, label_printed_at = :now, updated_at = now() WHERE domain_id = :domainId AND packing_order_id = :packingOrderId AND status = :closedStatus";
		Map<String, Object> boxParams = ValueUtil.newMap("now,domainId,packingOrderId,closedStatus",
				now, domainId, packingOrderId, PackingBox.STATUS_CLOSED);
		this.queryManager.executeBySql(boxSql, boxParams);

		// 결과 리턴
		return ValueUtil.newMap("success,pack_order_no,status", true, order.getPackOrderNo(),
				PackingOrder.STATUS_LABEL_PRINTED);
	}

	/**
	 * 적하 목록 전송 (LABEL_PRINTED -> MANIFESTED)
	 *
	 * 택배사에 적하 목록(manifest)을 전송하고 상태를 변경한다.
	 *
	 * @param packingOrderId 패킹 지시 ID
	 * @return { success, pack_order_no, status }
	 */
	public Map<String, Object> createManifest(String packingOrderId) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		PackingOrder order = this.findPackingOrder(domainId, packingOrderId);

		if (!PackingOrder.STATUS_LABEL_PRINTED.equals(order.getStatus())) {
			throw new ElidomValidationException(
					"패킹 지시 상태가 [" + order.getStatus() + "]이므로 적하 목록을 전송할 수 없습니다 (LABEL_PRINTED 상태만 가능)");
		}

		String sql = "UPDATE packing_orders SET status = :status, manifested_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,now,domainId,id",
				PackingOrder.STATUS_MANIFESTED, now, domainId, packingOrderId);
		this.queryManager.executeBySql(sql, params);

		// 결과 리턴
		return ValueUtil.newMap("success,pack_order_no,status", true, order.getPackOrderNo(),
				PackingOrder.STATUS_MANIFESTED);
	}

	/**
	 * 출하 확정 (COMPLETED|LABEL_PRINTED|MANIFESTED -> SHIPPED)
	 *
	 * 출하를 확정하고, 연결된 박스 상태도 SHIPPED로 변경한다.
	 * 연결된 출하 주문도 SHIPPED 상태로 갱신한다.
	 *
	 * @param packingOrderId 패킹 지시 ID
	 * @return { success, pack_order_no, status }
	 */
	public Map<String, Object> confirmShipping(String packingOrderId) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		PackingOrder order = this.findPackingOrder(domainId, packingOrderId);

		String status = order.getStatus();
		if (!PackingOrder.STATUS_COMPLETED.equals(status)
				&& !PackingOrder.STATUS_LABEL_PRINTED.equals(status)
				&& !PackingOrder.STATUS_MANIFESTED.equals(status)) {
			throw new ElidomValidationException(
					"패킹 지시 상태가 [" + status + "]이므로 출하 확정할 수 없습니다 (COMPLETED/LABEL_PRINTED/MANIFESTED 상태만 가능)");
		}

		// 패킹 지시 상태 변경
		String sql = "UPDATE packing_orders SET status = :status, shipped_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,now,domainId,id",
				PackingOrder.STATUS_SHIPPED, now, domainId, packingOrderId);
		this.queryManager.executeBySql(sql, params);

		// 박스 상태를 SHIPPED로 변경
		String boxSql = "UPDATE packing_boxes SET status = :status, shipped_at = :now, updated_at = now() WHERE domain_id = :domainId AND packing_order_id = :packingOrderId AND status IN (:s1, :s2)";
		Map<String, Object> boxParams = ValueUtil.newMap("status,now,domainId,packingOrderId,s1,s2",
				PackingBox.STATUS_SHIPPED, now, domainId, packingOrderId, PackingBox.STATUS_OPEN,
				PackingBox.STATUS_CLOSED);
		this.queryManager.executeBySql(boxSql, boxParams);

		// 연결된 출하 주문 상태를 SHIPPED로 갱신
		if (ValueUtil.isNotEmpty(order.getShipmentOrderId())) {
			String updOrderSql = "UPDATE shipment_orders SET status = :status, shipped_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id AND status != :shippedStatus";
			Map<String, Object> updOrderParams = ValueUtil.newMap("status,now,domainId,id,shippedStatus",
					ShipmentOrder.STATUS_SHIPPED, now, domainId, order.getShipmentOrderId(),
					ShipmentOrder.STATUS_SHIPPED);
			this.queryManager.executeBySql(updOrderSql, updOrderParams);
		}

		// 결과 리턴
		return ValueUtil.newMap("success,pack_order_no,status", true, order.getPackOrderNo(),
				PackingOrder.STATUS_SHIPPED);
	}

	/**
	 * 출하 확정 일괄 처리
	 *
	 * 여러 패킹 지시를 일괄 출하 확정한다.
	 *
	 * @param ids 패킹 지시 ID 리스트
	 * @return { success_count, fail_count, results: [...] }
	 */
	public Map<String, Object> confirmShippingBatch(List<String> ids) {
		int successCount = 0;
		int failCount = 0;
		List<Map<String, Object>> results = new ArrayList<>();

		for (String id : ids) {
			Map<String, Object> itemResult = ValueUtil.newMap("id", id);
			try {
				Map<String, Object> shipResult = this.confirmShipping(id);
				itemResult.put("success", true);
				itemResult.put("pack_order_no", shipResult.get("pack_order_no"));
				itemResult.put("status", shipResult.get("status"));
				successCount++;
			} catch (Exception e) {
				itemResult.put("success", false);
				itemResult.put("error", e.getMessage());
				failCount++;
			}
			results.add(itemResult);
		}

		// 결과 리턴
		return ValueUtil.newMap("success_count,fail_count,results", successCount, failCount, results);
	}

	/**
	 * 출하 취소 (SHIPPED -> CANCELLED)
	 *
	 * 출하 확정 후 취소 처리를 수행한다.
	 * 연결된 박스를 CLOSED 상태로 복원하고, 재고를 복원한다.
	 *
	 * @param packingOrderId 패킹 지시 ID
	 * @return { success, pack_order_no, restored_box_count }
	 */
	public Map<String, Object> cancelShipping(String packingOrderId) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		PackingOrder order = this.findPackingOrder(domainId, packingOrderId);

		if (!PackingOrder.STATUS_SHIPPED.equals(order.getStatus())) {
			throw new ElidomValidationException(
					"패킹 지시 상태가 [" + order.getStatus() + "]이므로 출하 취소할 수 없습니다 (SHIPPED 상태만 가능)");
		}

		// 박스 상태를 CLOSED로 복원
		String boxCountSql = "SELECT COUNT(*) FROM packing_boxes WHERE domain_id = :domainId AND packing_order_id = :packingOrderId AND status = :shippedStatus";
		Map<String, Object> boxCountParams = ValueUtil.newMap("domainId,packingOrderId,shippedStatus",
				domainId, packingOrderId, PackingBox.STATUS_SHIPPED);
		Integer restoredBoxCount = this.queryManager.selectBySql(boxCountSql, boxCountParams, Integer.class);

		String boxSql = "UPDATE packing_boxes SET status = :status, shipped_at = null, updated_at = now() WHERE domain_id = :domainId AND packing_order_id = :packingOrderId AND status = :shippedStatus";
		Map<String, Object> boxParams = ValueUtil.newMap("status,domainId,packingOrderId,shippedStatus",
				PackingBox.STATUS_CLOSED, domainId, packingOrderId, PackingBox.STATUS_SHIPPED);
		this.queryManager.executeBySql(boxSql, boxParams);

		// 패킹 지시 상태를 CANCELLED로 변경
		String sql = "UPDATE packing_orders SET status = :status, shipped_at = null, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,domainId,id",
				PackingOrder.STATUS_CANCELLED, domainId, packingOrderId);
		this.queryManager.executeBySql(sql, params);

		// 연결된 출하 주문의 재고 복원 처리
		if (ValueUtil.isNotEmpty(order.getShipmentOrderId())) {
			// 재고 할당의 reserved_qty 복원 (stock_allocations 기반)
			String allocSql = "SELECT * FROM stock_allocations WHERE domain_id = :domainId AND shipment_order_id = :orderId AND status IN ('SOFT','HARD')";
			Map<String, Object> allocParams = ValueUtil.newMap("domainId,orderId", domainId,
					order.getShipmentOrderId());
			List<Map> allocations = this.queryManager.selectListBySql(allocSql, allocParams, Map.class, 0, 0);

			for (Map alloc : allocations) {
				Object allocQty = alloc.get("alloc_qty");
				String inventoryId = alloc.get("inventory_id") != null ? alloc.get("inventory_id").toString() : null;
				if (allocQty != null && inventoryId != null) {
					// 재고 복원 (inv_qty 증가, reserved_qty 해제)
					String updInvSql = "UPDATE inventories SET reserved_qty = GREATEST(COALESCE(reserved_qty, 0) - :allocQty, 0), updated_at = now() WHERE domain_id = :domainId AND id = :invId";
					Map<String, Object> updInvParams = ValueUtil.newMap("allocQty,domainId,invId",
							Double.parseDouble(allocQty.toString()), domainId, inventoryId);
					this.queryManager.executeBySql(updInvSql, updInvParams);
				}

				// 할당 상태 취소
				String allocId = alloc.get("id") != null ? alloc.get("id").toString() : null;
				if (allocId != null) {
					String updAllocSql = "UPDATE stock_allocations SET status = 'CANCELLED', released_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :allocId";
					Map<String, Object> updAllocParams = ValueUtil.newMap("now,domainId,allocId", now, domainId,
							allocId);
					this.queryManager.executeBySql(updAllocSql, updAllocParams);
				}
			}

			// 출하 주문 상태를 CANCELLED로 변경
			String updOrderSql = "UPDATE shipment_orders SET status = :status, shipped_at = null, updated_at = now() WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> updOrderParams = ValueUtil.newMap("status,domainId,id",
					ShipmentOrder.STATUS_CANCELLED, domainId, order.getShipmentOrderId());
			this.queryManager.executeBySql(updOrderSql, updOrderParams);
		}

		// 결과 리턴
		return ValueUtil.newMap("success,pack_order_no,restored_box_count", true, order.getPackOrderNo(),
				restoredBoxCount != null ? restoredBoxCount : 0);
	}

	/**
	 * 박스 송장 번호 업데이트
	 *
	 * @param boxId     박스 ID
	 * @param invoiceNo 송장 번호
	 * @return { success, box_seq, invoice_no }
	 */
	public Map<String, Object> updateBoxInvoice(String boxId, String invoiceNo) {
		Long domainId = Domain.currentDomainId();

		PackingBox box = this.findPackingBox(domainId, boxId);

		if (ValueUtil.isEmpty(invoiceNo)) {
			throw new ElidomValidationException("송장 번호(invoice_no)는 필수 파라미터입니다");
		}

		String sql = "UPDATE packing_boxes SET invoice_no = :invoiceNo, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("invoiceNo,domainId,id", invoiceNo, domainId, boxId);
		this.queryManager.executeBySql(sql, params);

		// 결과 리턴
		return ValueUtil.newMap("success,box_seq,invoice_no", true, box.getBoxSeq(), invoiceNo);
	}

	// ==================== PDA 출하 확정 API ====================

	/**
	 * 도크 목록 조회 (공통코드 DOCK_CODE 기반 + 대기 건수)
	 *
	 * @return [{ dock_cd, dock_nm, waiting_count, total_box_count }]
	 */
	@SuppressWarnings("rawtypes")
	public List<Map> getDockList() {
		Long domainId = Domain.currentDomainId();

		String sql = "SELECT ccd.name AS dock_cd, ccd.description AS dock_nm,"
				+ " COALESCE(wc.waiting_count, 0) AS waiting_count,"
				+ " COALESCE(wc.total_box_count, 0) AS total_box_count"
				+ " FROM common_code_details ccd"
				+ " JOIN common_codes cc ON cc.id = ccd.parent_id AND cc.domain_id = ccd.domain_id"
				+ " LEFT JOIN ("
				+ "   SELECT dock_cd, COUNT(*) AS waiting_count, SUM(COALESCE(total_box, 0)) AS total_box_count"
				+ "   FROM packing_orders"
				+ "   WHERE domain_id = :domainId AND status IN ('COMPLETED', 'LABEL_PRINTED', 'MANIFESTED')"
				+ "   AND dock_cd IS NOT NULL GROUP BY dock_cd"
				+ " ) wc ON wc.dock_cd = ccd.name"
				+ " WHERE cc.domain_id = :domainId AND cc.name = 'DOCK_CODE'"
				+ " ORDER BY ccd.rank, ccd.name";

		return this.queryManager.selectListBySql(sql, ValueUtil.newMap("domainId", domainId), Map.class, 0, 0);
	}

	/**
	 * 도크별 출하 대기 목록 조회
	 *
	 * @param dockCd 도크 코드
	 * @return { summary: { waiting_count, total_box_count }, items: [...] }
	 */
	@SuppressWarnings("rawtypes")
	public Map<String, Object> getWaitingList(String dockCd) {
		Long domainId = Domain.currentDomainId();

		String orderSql = "SELECT po.id, po.pack_order_no, po.shipment_no, po.wave_no,"
				+ " po.carrier_cd, po.total_box, po.total_wt, po.status, po.shipment_order_id"
				+ " FROM packing_orders po"
				+ " WHERE po.domain_id = :domainId AND po.dock_cd = :dockCd"
				+ " AND po.status IN ('COMPLETED', 'LABEL_PRINTED', 'MANIFESTED')"
				+ " ORDER BY po.carrier_cd, po.pack_order_no";

		List<Map> orders = this.queryManager.selectListBySql(orderSql,
				ValueUtil.newMap("domainId,dockCd", domainId, dockCd), Map.class, 0, 0);

		int totalBoxCount = 0;
		for (Map order : orders) {
			String orderId = order.get("id").toString();
			String boxSql = "SELECT pb.id AS box_id, pb.box_seq, pb.invoice_no, pb.status"
					+ " FROM packing_boxes pb"
					+ " WHERE pb.domain_id = :domainId AND pb.packing_order_id = :orderId"
					+ " AND pb.status IN ('OPEN', 'CLOSED')"
					+ " ORDER BY pb.box_seq";
			List<Map> boxes = this.queryManager.selectListBySql(boxSql,
					ValueUtil.newMap("domainId,orderId", domainId, orderId), Map.class, 0, 0);
			order.put("boxes", boxes);
			totalBoxCount += boxes.size();
		}

		Map<String, Object> summary = ValueUtil.newMap("waiting_count,total_box_count", orders.size(),
				totalBoxCount);
		return ValueUtil.newMap("summary,items", summary, orders);
	}

	/**
	 * 송장번호로 출하 확정 (PDA 스캔)
	 *
	 * 1. 송장번호로 박스 조회
	 * 2. 도크 일치 검증
	 * 3. 박스 SHIPPED 처리
	 * 4. 모든 박스 스캔 완료 시 포장 지시 출하 확정
	 *
	 * @param dockCd    도크 코드
	 * @param invoiceNo 송장 번호
	 * @return { success, pack_order_no, shipment_no, carrier_cd, status,
	 *         scanned_box, remaining_boxes,
	 *         all_boxes_scanned }
	 */
	@SuppressWarnings("rawtypes")
	public Map<String, Object> confirmShippingByInvoice(String dockCd, String invoiceNo) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		// 1. 송장번호로 박스 조회
		String boxSql = "SELECT pb.id, pb.packing_order_id, pb.box_seq, pb.status"
				+ " FROM packing_boxes pb"
				+ " WHERE pb.domain_id = :domainId AND pb.invoice_no = :invoiceNo";
		List<Map> boxList = this.queryManager.selectListBySql(boxSql,
				ValueUtil.newMap("domainId,invoiceNo", domainId, invoiceNo), Map.class, 0, 1);

		if (boxList.isEmpty()) {
			throw new ElidomValidationException("해당 송장번호의 출하 건을 찾을 수 없습니다: " + invoiceNo);
		}

		Map box = boxList.get(0);
		String boxId = box.get("id").toString();
		String packingOrderId = box.get("packing_order_id").toString();
		String boxStatus = box.get("status") != null ? box.get("status").toString() : "";

		if (PackingBox.STATUS_SHIPPED.equals(boxStatus)) {
			throw new ElidomValidationException("이미 출하 확정된 송장입니다: " + invoiceNo);
		}

		// 2. 포장 지시 조회 및 도크 검증
		PackingOrder order = this.findPackingOrder(domainId, packingOrderId);

		if (ValueUtil.isNotEmpty(dockCd) && ValueUtil.isNotEmpty(order.getDockCd())
				&& !dockCd.equals(order.getDockCd())) {
			throw new ElidomValidationException("이 송장은 " + order.getDockCd() + " 도크에 배정되어 있습니다");
		}

		String orderStatus = order.getStatus();
		if (!PackingOrder.STATUS_COMPLETED.equals(orderStatus)
				&& !PackingOrder.STATUS_LABEL_PRINTED.equals(orderStatus)
				&& !PackingOrder.STATUS_MANIFESTED.equals(orderStatus)) {
			throw new ElidomValidationException(
					"포장 지시 상태가 [" + orderStatus + "]이므로 출하 확정할 수 없습니다");
		}

		// 3. 박스 SHIPPED 처리
		String updBoxSql = "UPDATE packing_boxes SET status = :status, shipped_at = :now, updated_at = now()"
				+ " WHERE domain_id = :domainId AND id = :boxId";
		this.queryManager.executeBySql(updBoxSql,
				ValueUtil.newMap("status,now,domainId,boxId", PackingBox.STATUS_SHIPPED, now, domainId, boxId));

		// 4. 잔여 미출하 박스 수 확인
		String countSql = "SELECT COUNT(*) FROM packing_boxes"
				+ " WHERE domain_id = :domainId AND packing_order_id = :packingOrderId"
				+ " AND status IN ('OPEN', 'CLOSED')";
		Integer remainingBoxes = this.queryManager.selectBySql(countSql,
				ValueUtil.newMap("domainId,packingOrderId", domainId, packingOrderId), Integer.class);

		boolean allBoxesScanned = (remainingBoxes == null || remainingBoxes == 0);

		// 5. 모든 박스 스캔 완료 시 포장 지시 출하 확정
		if (allBoxesScanned) {
			this.confirmShipping(packingOrderId);
		}

		// 6. 결과 반환
		Map<String, Object> result = ValueUtil.newMap("success,pack_order_no,shipment_no,carrier_cd,status", true,
				order.getPackOrderNo(), order.getShipmentNo(), order.getCarrierCd(),
				allBoxesScanned ? PackingOrder.STATUS_SHIPPED : orderStatus);
		result.put("scanned_box", ValueUtil.newMap("box_seq,invoice_no", box.get("box_seq"), invoiceNo));
		result.put("remaining_boxes", remainingBoxes != null ? remainingBoxes : 0);
		result.put("all_boxes_scanned", allBoxesScanned);
		return result;
	}

	/*
	 * ============================================================
	 * 내부 유틸리티
	 * ============================================================
	 */

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
