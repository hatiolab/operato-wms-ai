package operato.wms.fulfillment.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 풀필먼트 대시보드 서비스
 *
 * 피킹/패킹/출하 현황, 작업자 실적, 웨이브 진행 현황, 도크 현황 등
 * 대시보드에 필요한 집계 데이터를 제공한다.
 *
 * @author HatioLab
 */
@Component
public class FulfillmentDashboardService extends AbstractQueryService {

	/**
	 * 피킹 현황 조회
	 *
	 * 지정 일자의 피킹 지시 상태별 건수를 반환한다.
	 *
	 * @param orderDate 작업 일자 (YYYY-MM-DD, null이면 당일)
	 * @return { order_date, created, in_progress, completed, cancelled, total }
	 */
	public Map<String, Object> getPickingStatus(String orderDate) {
		Long domainId = Domain.currentDomainId();
		String date = ValueUtil.isNotEmpty(orderDate) ? orderDate : DateUtil.todayStr();

		String sql = "SELECT"
				+ " COALESCE(SUM(CASE WHEN status = 'CREATED' THEN 1 ELSE 0 END), 0) AS created,"
				+ " COALESCE(SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END), 0) AS in_progress,"
				+ " COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS completed,"
				+ " COALESCE(SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS cancelled,"
				+ " COUNT(*) AS total"
				+ " FROM picking_tasks"
				+ " WHERE domain_id = :domainId AND order_date = :orderDate";
		Map<String, Object> params = ValueUtil.newMap("domainId,orderDate", domainId, date);
		List<Map> rows = this.queryManager.selectListBySql(sql, params, Map.class, 0, 1);

		Map<String, Object> result = ValueUtil.newMap("order_date", date);

		if (!rows.isEmpty()) {
			Map row = rows.get(0);
			result.put("created", ValueUtil.toInteger(row.get("created")));
			result.put("in_progress", ValueUtil.toInteger(row.get("in_progress")));
			result.put("completed", ValueUtil.toInteger(row.get("completed")));
			result.put("cancelled", ValueUtil.toInteger(row.get("cancelled")));
			result.put("total", ValueUtil.toInteger(row.get("total")));
		} else {
			result.put("created", 0);
			result.put("in_progress", 0);
			result.put("completed", 0);
			result.put("cancelled", 0);
			result.put("total", 0);
		}

		return result;
	}

	/**
	 * 패킹 현황 조회
	 *
	 * 지정 일자의 패킹 지시 상태별 건수를 반환한다.
	 * 7가지 상태: CREATED, IN_PROGRESS, COMPLETED, LABEL_PRINTED, MANIFESTED, SHIPPED,
	 * CANCELLED
	 *
	 * @param orderDate 작업 일자 (YYYY-MM-DD, null이면 당일)
	 * @return { order_date, created, in_progress, completed, label_printed,
	 *         manifested, shipped, cancelled, total }
	 */
	public Map<String, Object> getPackingStatus(String orderDate) {
		Long domainId = Domain.currentDomainId();
		String date = ValueUtil.isNotEmpty(orderDate) ? orderDate : DateUtil.todayStr();

		String sql = "SELECT"
				+ " COALESCE(SUM(CASE WHEN status = 'CREATED' THEN 1 ELSE 0 END), 0) AS created,"
				+ " COALESCE(SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END), 0) AS in_progress,"
				+ " COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS completed,"
				+ " COALESCE(SUM(CASE WHEN status = 'LABEL_PRINTED' THEN 1 ELSE 0 END), 0) AS label_printed,"
				+ " COALESCE(SUM(CASE WHEN status = 'MANIFESTED' THEN 1 ELSE 0 END), 0) AS manifested,"
				+ " COALESCE(SUM(CASE WHEN status = 'SHIPPED' THEN 1 ELSE 0 END), 0) AS shipped,"
				+ " COALESCE(SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS cancelled,"
				+ " COUNT(*) AS total"
				+ " FROM packing_orders"
				+ " WHERE domain_id = :domainId AND order_date = :orderDate";
		Map<String, Object> params = ValueUtil.newMap("domainId,orderDate", domainId, date);
		List<Map> rows = this.queryManager.selectListBySql(sql, params, Map.class, 0, 1);

		Map<String, Object> result = ValueUtil.newMap("order_date", date);

		if (!rows.isEmpty()) {
			Map row = rows.get(0);
			result.put("created", ValueUtil.toInteger(row.get("created")));
			result.put("in_progress", ValueUtil.toInteger(row.get("in_progress")));
			result.put("completed", ValueUtil.toInteger(row.get("completed")));
			result.put("label_printed", ValueUtil.toInteger(row.get("label_printed")));
			result.put("manifested", ValueUtil.toInteger(row.get("manifested")));
			result.put("shipped", ValueUtil.toInteger(row.get("shipped")));
			result.put("cancelled", ValueUtil.toInteger(row.get("cancelled")));
			result.put("total", ValueUtil.toInteger(row.get("total")));
		} else {
			result.put("created", 0);
			result.put("in_progress", 0);
			result.put("completed", 0);
			result.put("label_printed", 0);
			result.put("manifested", 0);
			result.put("shipped", 0);
			result.put("cancelled", 0);
			result.put("total", 0);
		}

		return result;
	}

	/**
	 * 출하 현황 조회
	 *
	 * 지정 일자의 출하 집계 정보를 반환한다.
	 * 총 출하 건수, 박스 수, 중량, 미출하 건수, 시간대별 통계를 포함한다.
	 *
	 * @param orderDate 작업 일자 (YYYY-MM-DD, null이면 당일)
	 * @return { order_date, total_shipped, total_box, total_wt, pending_shipment,
	 *         hourly_stats }
	 */
	public Map<String, Object> getShippingStatus(String orderDate) {
		Long domainId = Domain.currentDomainId();
		String date = ValueUtil.isNotEmpty(orderDate) ? orderDate : DateUtil.todayStr();

		// 출하 완료 집계
		String shippedSql = "SELECT"
				+ " COALESCE(SUM(CASE WHEN status = 'SHIPPED' THEN 1 ELSE 0 END), 0) AS total_shipped,"
				+ " COALESCE(SUM(CASE WHEN status = 'SHIPPED' THEN COALESCE(total_box, 0) ELSE 0 END), 0) AS total_box,"
				+ " COALESCE(SUM(CASE WHEN status = 'SHIPPED' THEN COALESCE(total_wt, 0) ELSE 0 END), 0) AS total_wt,"
				+ " COALESCE(SUM(CASE WHEN status IN ('COMPLETED','LABEL_PRINTED','MANIFESTED') THEN 1 ELSE 0 END), 0) AS pending_shipment"
				+ " FROM packing_orders"
				+ " WHERE domain_id = :domainId AND order_date = :orderDate";
		Map<String, Object> shippedParams = ValueUtil.newMap("domainId,orderDate", domainId, date);
		List<Map> shippedRows = this.queryManager.selectListBySql(shippedSql, shippedParams, Map.class, 0, 1);

		Map<String, Object> result = ValueUtil.newMap("order_date", date);

		if (!shippedRows.isEmpty()) {
			Map row = shippedRows.get(0);
			result.put("total_shipped", ValueUtil.toInteger(row.get("total_shipped")));
			result.put("total_box", ValueUtil.toInteger(row.get("total_box")));
			result.put("total_wt", ValueUtil.toDouble(row.get("total_wt")));
			result.put("pending_shipment", ValueUtil.toInteger(row.get("pending_shipment")));
		} else {
			result.put("total_shipped", 0);
			result.put("total_box", 0);
			result.put("total_wt", 0.0);
			result.put("pending_shipment", 0);
		}

		// 시간대별 출하 통계
		String hourlySql = "SELECT"
				+ " SUBSTRING(shipped_at, 12, 2) AS hour,"
				+ " COUNT(*) AS shipped_count,"
				+ " COALESCE(SUM(total_box), 0) AS box_count"
				+ " FROM packing_orders"
				+ " WHERE domain_id = :domainId AND order_date = :orderDate AND status = 'SHIPPED' AND shipped_at IS NOT NULL"
				+ " GROUP BY SUBSTRING(shipped_at, 12, 2)"
				+ " ORDER BY hour";
		List<Map> hourlyStats = this.queryManager.selectListBySql(hourlySql, shippedParams, Map.class, 0, 0);
		result.put("hourly_stats", hourlyStats);
		return result;
	}

	/**
	 * 작업자 실적 조회
	 *
	 * 지정 일자의 작업자별 피킹/패킹 실적을 반환한다.
	 *
	 * @param orderDate 작업 일자 (YYYY-MM-DD, null이면 당일)
	 * @return 작업자 실적 목록 [ { worker_id, worker_nm, pick_count, pick_qty, pack_count
	 *         } ]
	 */
	public List<Map> getWorkerPerformance(String orderDate) {
		Long domainId = Domain.currentDomainId();
		String date = ValueUtil.isNotEmpty(orderDate) ? orderDate : DateUtil.todayStr();

		String sql = "SELECT"
				+ " w.worker_id,"
				+ " COALESCE(w.worker_nm, w.worker_id) AS worker_nm,"
				+ " COALESCE(w.pick_count, 0) AS pick_count,"
				+ " COALESCE(w.pick_qty, 0) AS pick_qty,"
				+ " COALESCE(p.pack_count, 0) AS pack_count"
				+ " FROM ("
				+ "   SELECT worker_id,"
				+ "     MAX(worker_id) AS worker_nm,"
				+ "     COUNT(*) AS pick_count,"
				+ "     COALESCE(SUM(result_total), 0) AS pick_qty"
				+ "   FROM picking_tasks"
				+ "   WHERE domain_id = :domainId AND order_date = :orderDate AND worker_id IS NOT NULL AND status IN ('COMPLETED','IN_PROGRESS')"
				+ "   GROUP BY worker_id"
				+ " ) w"
				+ " LEFT JOIN ("
				+ "   SELECT worker_id, COUNT(*) AS pack_count"
				+ "   FROM packing_orders"
				+ "   WHERE domain_id = :domainId AND order_date = :orderDate AND worker_id IS NOT NULL AND status IN ('COMPLETED','LABEL_PRINTED','MANIFESTED','SHIPPED')"
				+ "   GROUP BY worker_id"
				+ " ) p ON w.worker_id = p.worker_id"
				+ " ORDER BY w.pick_qty DESC";
		Map<String, Object> params = ValueUtil.newMap("domainId,orderDate", domainId, date);
		return this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
	}

	/**
	 * 웨이브 풀필먼트 진행 현황 조회
	 *
	 * 지정 웨이브의 피킹/패킹/출하 진행률을 반환한다.
	 *
	 * @param waveNo 웨이브 번호
	 * @return { wave_no, total_orders, pick_completed, pack_completed, shipped,
	 *         pick_rate, pack_rate, ship_rate }
	 */
	public Map<String, Object> getWaveProgress(String waveNo) {
		Long domainId = Domain.currentDomainId();

		if (ValueUtil.isEmpty(waveNo)) {
			throw new ElidomValidationException("wave_no는 필수 파라미터입니다");
		}

		// 웨이브의 총 주문 수 조회
		String orderCountSql = "SELECT COUNT(*) FROM shipment_orders WHERE domain_id = :domainId AND wave_no = :waveNo";
		Map<String, Object> baseParams = ValueUtil.newMap("domainId,waveNo", domainId, waveNo);
		Integer totalOrders = this.queryManager.selectBySql(orderCountSql, baseParams, Integer.class);
		int total = totalOrders != null ? totalOrders : 0;

		// 피킹 완료 건수 (피킹 지시 COMPLETED 기준으로 plan_order 합산)
		String pickSql = "SELECT COALESCE(SUM(plan_order), 0) FROM picking_tasks WHERE domain_id = :domainId AND wave_no = :waveNo AND status = 'COMPLETED'";
		Integer pickCompleted = this.queryManager.selectBySql(pickSql, baseParams, Integer.class);
		int pickComp = pickCompleted != null ? pickCompleted : 0;

		// 패킹 완료 건수 (COMPLETED 이상 상태)
		String packSql = "SELECT COUNT(*) FROM packing_orders WHERE domain_id = :domainId AND wave_no = :waveNo AND status IN ('COMPLETED','LABEL_PRINTED','MANIFESTED','SHIPPED')";
		Integer packCompleted = this.queryManager.selectBySql(packSql, baseParams, Integer.class);
		int packComp = packCompleted != null ? packCompleted : 0;

		// 출하 완료 건수
		String shipSql = "SELECT COUNT(*) FROM packing_orders WHERE domain_id = :domainId AND wave_no = :waveNo AND status = 'SHIPPED'";
		Integer shipped = this.queryManager.selectBySql(shipSql, baseParams, Integer.class);
		int shipComp = shipped != null ? shipped : 0;

		// 진행률 계산
		double pickRate = total > 0 ? Math.round((double) pickComp / total * 10000.0) / 100.0 : 0;
		double packRate = total > 0 ? Math.round((double) packComp / total * 10000.0) / 100.0 : 0;
		double shipRate = total > 0 ? Math.round((double) shipComp / total * 10000.0) / 100.0 : 0;

		Map<String, Object> result = ValueUtil.newMap("wave_no", waveNo);
		result.put("total_orders", total);
		result.put("pick_completed", pickComp);
		result.put("pack_completed", packComp);
		result.put("shipped", shipComp);
		result.put("pick_rate", pickRate);
		result.put("pack_rate", packRate);
		result.put("ship_rate", shipRate);
		return result;
	}

	/**
	 * 도크 현황 조회
	 *
	 * 지정 일자의 출하 도크별 대기/출하 현황을 반환한다.
	 *
	 * @param orderDate 작업 일자 (YYYY-MM-DD, null이면 당일)
	 * @return 도크 현황 목록 [ { dock_cd, carrier_cd, waiting_count, shipped_count } ]
	 */
	public List<Map> getDockStatus(String orderDate) {
		Long domainId = Domain.currentDomainId();
		String date = ValueUtil.isNotEmpty(orderDate) ? orderDate : DateUtil.todayStr();

		String sql = "SELECT"
				+ " COALESCE(dock_cd, 'UNASSIGNED') AS dock_cd,"
				+ " carrier_cd,"
				+ " COALESCE(SUM(CASE WHEN status IN ('COMPLETED','LABEL_PRINTED','MANIFESTED') THEN 1 ELSE 0 END), 0) AS waiting_count,"
				+ " COALESCE(SUM(CASE WHEN status = 'SHIPPED' THEN 1 ELSE 0 END), 0) AS shipped_count"
				+ " FROM packing_orders"
				+ " WHERE domain_id = :domainId AND order_date = :orderDate AND status NOT IN ('CREATED','IN_PROGRESS','CANCELLED')"
				+ " GROUP BY dock_cd, carrier_cd"
				+ " ORDER BY dock_cd, carrier_cd";
		Map<String, Object> params = ValueUtil.newMap("domainId,orderDate", domainId, date);
		return this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
	}
}
