package operato.wms.fulfillment.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import operato.wms.fulfillment.entity.PackingBox;
import operato.wms.fulfillment.entity.PackingOrder;
import operato.wms.fulfillment.entity.PackingOrderItem;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.sys.entity.Domain;
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
			throw new RuntimeException("패킹 지시 상태가 [" + order.getStatus() + "]이므로 시작할 수 없습니다 (CREATED 상태만 가능)");
		}

		String sql = "UPDATE packing_orders SET status = :status, started_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,now,domainId,id",
				PackingOrder.STATUS_IN_PROGRESS, now, domainId, id);
		this.queryManager.executeBySql(sql, params);

		Map<String, Object> result = new HashMap<>();
		result.put("success", true);
		result.put("pack_order_no", order.getPackOrderNo());
		result.put("status", PackingOrder.STATUS_IN_PROGRESS);
		return result;
	}

	/**
	 * 패킹 지시 완료 (IN_PROGRESS -> COMPLETED)
	 *
	 * @param id 패킹 지시 ID
	 * @return { success, pack_order_no, status }
	 */
	public Map<String, Object> completePackingOrder(String id) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		PackingOrder order = this.findPackingOrder(domainId, id);

		if (!PackingOrder.STATUS_IN_PROGRESS.equals(order.getStatus())) {
			throw new RuntimeException("패킹 지시 상태가 [" + order.getStatus() + "]이므로 완료할 수 없습니다 (IN_PROGRESS 상태만 가능)");
		}

		// 박스 수 집계
		String boxCountSql = "SELECT COUNT(*) FROM packing_boxes WHERE domain_id = :domainId AND packing_order_id = :packingOrderId";
		Map<String, Object> boxCountParams = ValueUtil.newMap("domainId,packingOrderId", domainId, id);
		Integer totalBox = this.queryManager.selectBySql(boxCountSql, boxCountParams, Integer.class);

		// 총 중량 집계
		String wtSql = "SELECT COALESCE(SUM(box_wt), 0) FROM packing_boxes WHERE domain_id = :domainId AND packing_order_id = :packingOrderId";
		Double totalWt = this.queryManager.selectBySql(wtSql, boxCountParams, Double.class);

		String sql = "UPDATE packing_orders SET status = :status, completed_at = :now,"
				+ " total_box = :totalBox, total_wt = :totalWt, updated_at = now()"
				+ " WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,now,totalBox,totalWt,domainId,id",
				PackingOrder.STATUS_COMPLETED, now,
				totalBox != null ? totalBox : 0,
				totalWt != null ? totalWt : 0.0,
				domainId, id);
		this.queryManager.executeBySql(sql, params);

		Map<String, Object> result = new HashMap<>();
		result.put("success", true);
		result.put("pack_order_no", order.getPackOrderNo());
		result.put("status", PackingOrder.STATUS_COMPLETED);
		return result;
	}

	/**
	 * 패킹 지시 취소 (-> CANCELLED)
	 *
	 * SHIPPED 상태인 패킹 지시는 취소할 수 없다.
	 *
	 * @param id 패킹 지시 ID
	 * @return { success, pack_order_no }
	 */
	public Map<String, Object> cancelPackingOrder(String id) {
		Long domainId = Domain.currentDomainId();

		PackingOrder order = this.findPackingOrder(domainId, id);

		String status = order.getStatus();
		if (PackingOrder.STATUS_SHIPPED.equals(status)) {
			throw new RuntimeException("패킹 지시 상태가 [SHIPPED]이므로 취소할 수 없습니다");
		}
		if (PackingOrder.STATUS_CANCELLED.equals(status)) {
			throw new RuntimeException("패킹 지시가 이미 취소되었습니다");
		}

		// 패킹 상세 아이템 취소
		String itemSql = "UPDATE packing_order_items SET status = :status, updated_at = now() WHERE domain_id = :domainId AND packing_order_id = :packingOrderId AND status != :cancelStatus";
		Map<String, Object> itemParams = ValueUtil.newMap("status,domainId,packingOrderId,cancelStatus",
				PackingOrderItem.STATUS_CANCEL, domainId, id, PackingOrderItem.STATUS_CANCEL);
		this.queryManager.executeBySql(itemSql, itemParams);

		// 박스 상태도 취소 처리 (OPEN 박스만)
		String boxSql = "UPDATE packing_boxes SET status = 'CANCELLED', updated_at = now() WHERE domain_id = :domainId AND packing_order_id = :packingOrderId AND status = :openStatus";
		Map<String, Object> boxParams = ValueUtil.newMap("domainId,packingOrderId,openStatus",
				domainId, id, PackingBox.STATUS_OPEN);
		this.queryManager.executeBySql(boxSql, boxParams);

		// 패킹 지시 헤더 취소
		String sql = "UPDATE packing_orders SET status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,domainId,id",
				PackingOrder.STATUS_CANCELLED, domainId, id);
		this.queryManager.executeBySql(sql, params);

		Map<String, Object> result = new HashMap<>();
		result.put("success", true);
		result.put("pack_order_no", order.getPackOrderNo());
		return result;
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

		if (PackingOrder.STATUS_CANCELLED.equals(order.getStatus()) || PackingOrder.STATUS_SHIPPED.equals(order.getStatus())) {
			throw new RuntimeException("패킹 지시 상태가 [" + order.getStatus() + "]이므로 박스를 생성할 수 없습니다");
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

		Map<String, Object> result = new HashMap<>();
		result.put("success", true);
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
			throw new RuntimeException("박스 상태가 [" + box.getStatus() + "]이므로 마감할 수 없습니다 (OPEN 상태만 가능)");
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

		Map<String, Object> result = new HashMap<>();
		result.put("success", true);
		result.put("box_seq", box.getBoxSeq());
		result.put("total_item", totalItem);
		result.put("total_qty", totalQty);
		return result;
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

		if (!PackingOrderItem.STATUS_WAIT.equals(item.getStatus())) {
			throw new RuntimeException("포장 항목 상태가 [" + item.getStatus() + "]이므로 검수할 수 없습니다 (WAIT 상태만 가능)");
		}

		double inspQty = params.get("insp_qty") != null ? Double.parseDouble(params.get("insp_qty").toString()) : item.getOrderQty();

		String sql = "UPDATE packing_order_items SET insp_qty = :inspQty, status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updParams = ValueUtil.newMap("inspQty,status,domainId,id",
				inspQty, PackingOrderItem.STATUS_INSPECTED, domainId, itemId);
		this.queryManager.executeBySql(sql, updParams);

		Map<String, Object> result = new HashMap<>();
		result.put("success", true);
		result.put("item_id", itemId);
		result.put("sku_cd", item.getSkuCd());
		result.put("insp_qty", inspQty);
		result.put("status", PackingOrderItem.STATUS_INSPECTED);
		return result;
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

		if (!PackingOrderItem.STATUS_INSPECTED.equals(item.getStatus()) && !PackingOrderItem.STATUS_WAIT.equals(item.getStatus())) {
			throw new RuntimeException("포장 항목 상태가 [" + item.getStatus() + "]이므로 포장할 수 없습니다 (WAIT/INSPECTED 상태만 가능)");
		}

		double packQty = params.get("pack_qty") != null ? Double.parseDouble(params.get("pack_qty").toString()) : item.getOrderQty();
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

		Map<String, Object> result = new HashMap<>();
		result.put("success", true);
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
	 * 포장 항목 단건 조회
	 */
	private PackingOrderItem findPackingOrderItem(Long domainId, String id) {
		String sql = "SELECT * FROM packing_order_items WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("domainId,id", domainId, id);
		List<PackingOrderItem> list = this.queryManager.selectListBySql(sql, params, PackingOrderItem.class, 0, 1);
		if (list.isEmpty()) {
			throw new RuntimeException("포장 항목을 찾을 수 없습니다: " + id);
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
			throw new RuntimeException("패킹 지시를 찾을 수 없습니다: " + id);
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
			throw new RuntimeException("포장 박스를 찾을 수 없습니다: " + id);
		}
		return list.get(0);
	}
}
