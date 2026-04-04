package operato.wms.fulfillment.service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.ValueUtil;

/**
 * 풀필먼트 출고 추적 서비스
 *
 * 송장번호/출고번호/포장번호/피킹번호/웨이브번호/원주문번호 중 하나를 기준으로
 * 주문 → 웨이브 → 피킹 → 포장 → 박스/출하 전체 이력을 조회한다.
 *
 * @author HatioLab
 */
@Component
public class FulfillmentTrackingService extends AbstractQueryService {

	/**
	 * 출고 추적 조회
	 *
	 * @param keyword 검색어
	 * @param type    검색 유형 (auto/invoice/shipment/packing/picking/wave/ref_order)
	 * @return 전체 추적 데이터
	 */
	@SuppressWarnings("rawtypes")
	public Map<String, Object> trackByKeyword(String keyword, String type) {
		if (ValueUtil.isEmpty(keyword)) {
			throw new ElidomValidationException("검색어를 입력해주세요.");
		}

		Long domainId = Domain.currentDomainId();
		String resolvedType = (type == null || type.isEmpty() || "auto".equals(type))
				? this.detectType(domainId, keyword)
				: type;

		if (resolvedType == null) {
			throw new ElidomValidationException("'" + keyword + "'에 해당하는 출고 정보를 찾을 수 없습니다.");
		}

		// 1. shipmentOrderId 탐색
		Map<String, Object> resolved = this.resolveShipmentOrderId(domainId, keyword, resolvedType);
		String shipmentOrderId = (String) resolved.get("shipment_order_id");

		if (shipmentOrderId == null) {
			throw new ElidomValidationException("'" + keyword + "'에 해당하는 출고 주문을 찾을 수 없습니다.");
		}

		// 2. 출고 주문 정보
		Map shipmentOrder = this.findShipmentOrder(domainId, shipmentOrderId);
		String waveNo = shipmentOrder != null ? (String) shipmentOrder.get("wave_no") : null;

		// 3. 연관 데이터 조회
		List<Map> orderItems = this.findShipmentOrderItems(domainId, shipmentOrderId);
		List<Map> allocations = this.findStockAllocations(domainId, shipmentOrderId);
		Map wave = waveNo != null ? this.findWave(domainId, waveNo) : null;
		Map pickingTask = this.findPickingTask(domainId, shipmentOrderId, waveNo);

		String pickTaskId = pickingTask != null ? (String) pickingTask.get("id") : null;
		List<Map> pickingItems = pickTaskId != null
				? this.findPickingTaskItems(domainId, pickTaskId)
				: Collections.emptyList();

		Map packingOrder = this.findPackingOrder(domainId, shipmentOrderId, waveNo);
		String packingOrderId = packingOrder != null ? (String) packingOrder.get("id") : null;
		List<Map> packingItems = packingOrderId != null
				? this.findPackingOrderItems(domainId, packingOrderId)
				: Collections.emptyList();
		List<Map> packingBoxes = packingOrderId != null
				? this.findPackingBoxes(domainId, packingOrderId)
				: Collections.emptyList();

		// 4. 결과 조립
		Map<String, Object> result = ValueUtil.newMap("shipment_order", shipmentOrder);
		result.put("shipment_order_items", orderItems);
		result.put("stock_allocations", allocations);
		result.put("wave", wave);
		result.put("picking_task", pickingTask);
		result.put("picking_task_items", pickingItems);
		result.put("packing_order", packingOrder);
		result.put("packing_order_items", packingItems);
		result.put("packing_boxes", packingBoxes);
		return result;
	}

	// ==================== 검색 유형 자동 감지 ====================

	/**
	 * 키워드 접두사 기반 자동 감지, 없으면 순차 조회
	 */
	private String detectType(Long domainId, String keyword) {
		if (keyword.startsWith("W-"))
			return "wave";
		if (keyword.startsWith("PT-"))
			return "picking";
		if (keyword.startsWith("PO-"))
			return "packing";
		if (keyword.startsWith("SO-"))
			return "shipment";

		// 순차 fallback: invoice → shipment → ref_order
		if (this.existsInvoice(domainId, keyword))
			return "invoice";
		if (this.existsShipmentNo(domainId, keyword))
			return "shipment";
		if (this.existsRefOrderNo(domainId, keyword))
			return "ref_order";
		if (this.existsPackOrderNo(domainId, keyword))
			return "packing";
		if (this.existsPickTaskNo(domainId, keyword))
			return "picking";
		if (this.existsWaveNo(domainId, keyword))
			return "wave";

		return null;
	}

	private boolean existsInvoice(Long domainId, String keyword) {
		return this.countBySql(
				"SELECT COUNT(*) FROM packing_boxes WHERE domain_id = :domainId AND invoice_no = :keyword",
				domainId, keyword) > 0;
	}

	private boolean existsShipmentNo(Long domainId, String keyword) {
		return this.countBySql(
				"SELECT COUNT(*) FROM shipment_orders WHERE domain_id = :domainId AND shipment_no = :keyword",
				domainId, keyword) > 0;
	}

	private boolean existsRefOrderNo(Long domainId, String keyword) {
		return this.countBySql(
				"SELECT COUNT(*) FROM shipment_orders WHERE domain_id = :domainId AND ref_order_no = :keyword",
				domainId, keyword) > 0;
	}

	private boolean existsPackOrderNo(Long domainId, String keyword) {
		return this.countBySql(
				"SELECT COUNT(*) FROM packing_orders WHERE domain_id = :domainId AND pack_order_no = :keyword",
				domainId, keyword) > 0;
	}

	private boolean existsPickTaskNo(Long domainId, String keyword) {
		return this.countBySql(
				"SELECT COUNT(*) FROM picking_tasks WHERE domain_id = :domainId AND pick_task_no = :keyword",
				domainId, keyword) > 0;
	}

	private boolean existsWaveNo(Long domainId, String keyword) {
		return this.countBySql("SELECT COUNT(*) FROM shipment_waves WHERE domain_id = :domainId AND wave_no = :keyword",
				domainId, keyword) > 0;
	}

	private int countBySql(String sql, Long domainId, String keyword) {
		Map<String, Object> params = ValueUtil.newMap("domainId,keyword", domainId, keyword);
		Integer count = this.queryManager.selectBySql(sql, params, Integer.class);
		return count != null ? count : 0;
	}

	// ==================== shipmentOrderId 탐색 ====================

	@SuppressWarnings("rawtypes")
	private Map<String, Object> resolveShipmentOrderId(Long domainId, String keyword, String type) {
		Map<String, Object> result = ValueUtil.newMap("shipment_order_id", null);

		switch (type) {
			case "invoice": {
				// packing_boxes → packing_orders → shipment_order_id
				String sql = "SELECT pb.packing_order_id FROM packing_boxes pb"
						+ " WHERE pb.domain_id = :domainId AND pb.invoice_no = :keyword";
				List<Map> list = this.queryManager.selectListBySql(sql,
						ValueUtil.newMap("domainId,keyword", domainId, keyword), Map.class, 0, 1);
				if (!list.isEmpty()) {
					String packingOrderId = (String) list.get(0).get("packing_order_id");
					String sql2 = "SELECT shipment_order_id FROM packing_orders WHERE domain_id = :domainId AND id = :id";
					List<Map> list2 = this.queryManager.selectListBySql(sql2,
							ValueUtil.newMap("domainId,id", domainId, packingOrderId), Map.class, 0, 1);
					if (!list2.isEmpty()) {
						result.put("shipment_order_id", list2.get(0).get("shipment_order_id"));
					}
				}
				break;
			}
			case "shipment": {
				String sql = "SELECT id FROM shipment_orders WHERE domain_id = :domainId AND shipment_no = :keyword";
				List<Map> list = this.queryManager.selectListBySql(sql,
						ValueUtil.newMap("domainId,keyword", domainId, keyword), Map.class, 0, 1);
				if (!list.isEmpty()) {
					result.put("shipment_order_id", list.get(0).get("id"));
				}
				break;
			}
			case "packing": {
				String sql = "SELECT shipment_order_id, wave_no FROM packing_orders WHERE domain_id = :domainId AND pack_order_no = :keyword";
				List<Map> list = this.queryManager.selectListBySql(sql,
						ValueUtil.newMap("domainId,keyword", domainId, keyword), Map.class, 0, 1);
				if (!list.isEmpty()) {
					String soId = (String) list.get(0).get("shipment_order_id");
					if (soId != null) {
						result.put("shipment_order_id", soId);
					} else {
						// 토탈 피킹: wave_no로 첫 주문 찾기
						String waveNo = (String) list.get(0).get("wave_no");
						result.put("shipment_order_id", this.findFirstOrderIdByWave(domainId, waveNo));
					}
				}
				break;
			}
			case "picking": {
				String sql = "SELECT shipment_order_id, wave_no FROM picking_tasks WHERE domain_id = :domainId AND pick_task_no = :keyword";
				List<Map> list = this.queryManager.selectListBySql(sql,
						ValueUtil.newMap("domainId,keyword", domainId, keyword), Map.class, 0, 1);
				if (!list.isEmpty()) {
					String soId = (String) list.get(0).get("shipment_order_id");
					if (soId != null) {
						result.put("shipment_order_id", soId);
					} else {
						String waveNo = (String) list.get(0).get("wave_no");
						result.put("shipment_order_id", this.findFirstOrderIdByWave(domainId, waveNo));
					}
				}
				break;
			}
			case "wave": {
				result.put("shipment_order_id", this.findFirstOrderIdByWave(domainId, keyword));
				break;
			}
			case "ref_order": {
				String sql = "SELECT id FROM shipment_orders WHERE domain_id = :domainId AND ref_order_no = :keyword ORDER BY created_at DESC";
				List<Map> list = this.queryManager.selectListBySql(sql,
						ValueUtil.newMap("domainId,keyword", domainId, keyword), Map.class, 0, 1);
				if (!list.isEmpty()) {
					result.put("shipment_order_id", list.get(0).get("id"));
				}
				break;
			}
		}

		return result;
	}

	@SuppressWarnings("rawtypes")
	private String findFirstOrderIdByWave(Long domainId, String waveNo) {
		if (waveNo == null)
			return null;
		String sql = "SELECT id FROM shipment_orders WHERE domain_id = :domainId AND wave_no = :waveNo ORDER BY created_at";
		List<Map> list = this.queryManager.selectListBySql(sql, ValueUtil.newMap("domainId,waveNo", domainId, waveNo),
				Map.class, 0, 1);
		return list.isEmpty() ? null : (String) list.get(0).get("id");
	}

	// ==================== 개별 데이터 조회 ====================

	@SuppressWarnings("rawtypes")
	private Map findShipmentOrder(Long domainId, String id) {
		String sql = "SELECT id, shipment_no, ref_order_no, order_date, ship_by_date,"
				+ " wave_no, com_cd, cust_cd, cust_nm, wh_cd,"
				+ " biz_type, ship_type, dlv_type, carrier_cd, carrier_service_type,"
				+ " total_item, total_order, total_alloc, total_shipped,"
				+ " status, confirmed_at, allocated_at, released_at, shipped_at"
				+ " FROM shipment_orders WHERE domain_id = :domainId AND id = :id";
		List<Map> list = this.queryManager.selectListBySql(sql, ValueUtil.newMap("domainId,id", domainId, id),
				Map.class, 0, 1);
		return list.isEmpty() ? null : list.get(0);
	}

	@SuppressWarnings("rawtypes")
	private List<Map> findShipmentOrderItems(Long domainId, String shipmentOrderId) {
		String sql = "SELECT id, line_no, sku_cd, sku_nm, order_qty, alloc_qty, shipped_qty, short_qty,"
				+ " barcode, lot_no, expired_date"
				+ " FROM shipment_order_items WHERE domain_id = :domainId AND shipment_order_id = :shipmentOrderId"
				+ " ORDER BY line_no";
		return this.queryManager.selectListBySql(sql,
				ValueUtil.newMap("domainId,shipmentOrderId", domainId, shipmentOrderId), Map.class, 0, 0);
	}

	@SuppressWarnings("rawtypes")
	private List<Map> findStockAllocations(Long domainId, String shipmentOrderId) {
		String sql = "SELECT id, sku_cd, loc_cd, alloc_qty, alloc_strategy, status, allocated_at"
				+ " FROM stock_allocations WHERE domain_id = :domainId AND shipment_order_id = :shipmentOrderId"
				+ " ORDER BY allocated_at";
		return this.queryManager.selectListBySql(sql,
				ValueUtil.newMap("domainId,shipmentOrderId", domainId, shipmentOrderId), Map.class, 0, 0);
	}

	@SuppressWarnings("rawtypes")
	private Map findWave(Long domainId, String waveNo) {
		String sql = "SELECT id, wave_no, wave_date, wave_seq, pick_type, status,"
				+ " com_cd, wh_cd, carrier_cd, dlv_type,"
				+ " plan_order, plan_item, plan_total, result_order, result_item, result_total"
				+ " FROM shipment_waves WHERE domain_id = :domainId AND wave_no = :waveNo";
		List<Map> list = this.queryManager.selectListBySql(sql,
				ValueUtil.newMap("domainId,waveNo", domainId, waveNo), Map.class, 0, 1);
		return list.isEmpty() ? null : list.get(0);
	}

	@SuppressWarnings("rawtypes")
	private Map findPickingTask(Long domainId, String shipmentOrderId, String waveNo) {
		// 개별 피킹: shipment_order_id로 조회
		String sql1 = "SELECT id, pick_task_no, wave_no, shipment_no, pick_type, pick_method,"
				+ " worker_id, plan_order, plan_item, plan_total,"
				+ " result_order, result_item, result_total, short_total,"
				+ " status, started_at, completed_at"
				+ " FROM picking_tasks WHERE domain_id = :domainId AND shipment_order_id = :shipmentOrderId"
				+ " AND status != 'CANCELLED' ORDER BY created_at DESC";
		List<Map> list = this.queryManager.selectListBySql(sql1,
				ValueUtil.newMap("domainId,shipmentOrderId", domainId, shipmentOrderId), Map.class, 0, 1);
		if (!list.isEmpty())
			return list.get(0);

		// 토탈 피킹: wave_no로 조회
		if (waveNo != null) {
			String sql2 = "SELECT id, pick_task_no, wave_no, shipment_no, pick_type, pick_method,"
					+ " worker_id, plan_order, plan_item, plan_total,"
					+ " result_order, result_item, result_total, short_total,"
					+ " status, started_at, completed_at"
					+ " FROM picking_tasks WHERE domain_id = :domainId AND wave_no = :waveNo"
					+ " AND status != 'CANCELLED' ORDER BY created_at DESC";
			list = this.queryManager.selectListBySql(sql2,
					ValueUtil.newMap("domainId,waveNo", domainId, waveNo), Map.class, 0, 1);
			if (!list.isEmpty())
				return list.get(0);
		}

		return null;
	}

	@SuppressWarnings("rawtypes")
	private List<Map> findPickingTaskItems(Long domainId, String pickTaskId) {
		String sql = "SELECT id, rank, sku_cd, sku_nm, from_loc_cd, to_loc_cd,"
				+ " order_qty, pick_qty, short_qty, status, picked_at"
				+ " FROM picking_task_items WHERE domain_id = :domainId AND pick_task_id = :pickTaskId"
				+ " ORDER BY rank";
		return this.queryManager.selectListBySql(sql,
				ValueUtil.newMap("domainId,pickTaskId", domainId, pickTaskId), Map.class, 0, 0);
	}

	@SuppressWarnings("rawtypes")
	private Map findPackingOrder(Long domainId, String shipmentOrderId, String waveNo) {
		// 개별 포장: shipment_order_id로 조회
		String sql1 = "SELECT id, pack_order_no, pick_task_no, shipment_order_id, shipment_no,"
				+ " wave_no, insp_type, insp_result, station_cd, worker_id,"
				+ " total_box, total_wt, carrier_cd, status,"
				+ " started_at, completed_at, shipped_at"
				+ " FROM packing_orders WHERE domain_id = :domainId AND shipment_order_id = :shipmentOrderId"
				+ " AND status != 'CANCELLED' ORDER BY created_at DESC";
		List<Map> list = this.queryManager.selectListBySql(sql1,
				ValueUtil.newMap("domainId,shipmentOrderId", domainId, shipmentOrderId), Map.class, 0, 1);
		if (!list.isEmpty())
			return list.get(0);

		// 토탈 포장: wave_no로 조회
		if (waveNo != null) {
			String sql2 = "SELECT id, pack_order_no, pick_task_no, shipment_order_id, shipment_no,"
					+ " wave_no, insp_type, insp_result, station_cd, worker_id,"
					+ " total_box, total_wt, carrier_cd, status,"
					+ " started_at, completed_at, shipped_at"
					+ " FROM packing_orders WHERE domain_id = :domainId AND wave_no = :waveNo"
					+ " AND status != 'CANCELLED' ORDER BY created_at DESC";
			list = this.queryManager.selectListBySql(sql2,
					ValueUtil.newMap("domainId,waveNo", domainId, waveNo), Map.class, 0, 1);
			if (!list.isEmpty())
				return list.get(0);
		}

		return null;
	}

	@SuppressWarnings("rawtypes")
	private List<Map> findPackingOrderItems(Long domainId, String packingOrderId) {
		String sql = "SELECT id, sku_cd, sku_nm, order_qty, insp_qty, pack_qty, short_qty,"
				+ " packing_box_id, status"
				+ " FROM packing_order_items WHERE domain_id = :domainId AND packing_order_id = :packingOrderId"
				+ " ORDER BY id";
		return this.queryManager.selectListBySql(sql,
				ValueUtil.newMap("domainId,packingOrderId", domainId, packingOrderId), Map.class, 0, 0);
	}

	@SuppressWarnings("rawtypes")
	private List<Map> findPackingBoxes(Long domainId, String packingOrderId) {
		String sql = "SELECT id, box_seq, box_type_cd, box_wt, total_item, total_qty,"
				+ " invoice_no, label_printed_flag, status"
				+ " FROM packing_boxes WHERE domain_id = :domainId AND packing_order_id = :packingOrderId"
				+ " ORDER BY box_seq";
		return this.queryManager.selectListBySql(sql,
				ValueUtil.newMap("domainId,packingOrderId", domainId, packingOrderId), Map.class, 0, 0);
	}
}
