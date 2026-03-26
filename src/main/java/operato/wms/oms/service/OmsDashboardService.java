package operato.wms.oms.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.oms.entity.ShipmentWave;
import operato.wms.oms.entity.StockAllocation;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * OMS 대시보드 서비스
 *
 * 대시보드 화면에 필요한 통계/현황 쿼리를 제공한다.
 *
 * @author HatioLab
 */
@Component
public class OmsDashboardService extends AbstractQueryService {

	/**
	 * 상태별 건수 조회
	 *
	 * @param orderDate 기준일 (optional, 기본값: 오늘)
	 * @return 상태별 건수 Map
	 */
	public Map<String, Object> getStatusCounts(String orderDate) {
		String date = ValueUtil.isNotEmpty(orderDate) ? orderDate : DateUtil.todayStr();
		Long domainId = Domain.currentDomainId();

		String sql = "SELECT status, COUNT(*) as count " +
				"FROM shipment_orders " +
				"WHERE domain_id = :domainId " +
				"AND order_date = :orderDate " +
				"GROUP BY status";

		Map<String, Object> params = ValueUtil.newMap("domainId,orderDate", domainId, date);

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
				sql, params, Map.class, 0, 0);

		// 11개 상태 초기화
		Map<String, Object> statusCounts = new HashMap<>();
		statusCounts.put(ShipmentOrder.STATUS_REGISTERED, 0);
		statusCounts.put(ShipmentOrder.STATUS_CONFIRMED, 0);
		statusCounts.put(ShipmentOrder.STATUS_ALLOCATED, 0);
		statusCounts.put(ShipmentOrder.STATUS_BACK_ORDER, 0);
		statusCounts.put(ShipmentOrder.STATUS_WAVED, 0);
		statusCounts.put(ShipmentOrder.STATUS_RELEASED, 0);
		statusCounts.put(ShipmentOrder.STATUS_PICKING, 0);
		statusCounts.put(ShipmentOrder.STATUS_PACKING, 0);
		statusCounts.put(ShipmentOrder.STATUS_SHIPPED, 0);
		statusCounts.put(ShipmentOrder.STATUS_CLOSED, 0);
		statusCounts.put(ShipmentOrder.STATUS_CANCELLED, 0);

		for (Map<String, Object> row : results) {
			String status = (String) row.get("status");
			Object countObj = row.get("count");
			int count = countObj instanceof Long ? ((Long) countObj).intValue() : ((Number) countObj).intValue();
			statusCounts.put(status, count);
		}

		return statusCounts;
	}

	/**
	 * 업무 유형별 통계 조회
	 *
	 * @param orderDate 기준일 (optional, 기본값: 오늘)
	 * @return 업무유형별 건수 Map (B2C_OUT, B2B_OUT, B2C_RTN, B2B_RTN)
	 */
	public Map<String, Object> getBizTypeStats(String orderDate) {
		String date = ValueUtil.isNotEmpty(orderDate) ? orderDate : DateUtil.todayStr();
		Long domainId = Domain.currentDomainId();

		String sql = "SELECT biz_type, COUNT(*) as count " +
				"FROM shipment_orders " +
				"WHERE domain_id = :domainId " +
				"AND order_date = :orderDate " +
				"AND status != :cancelStatus " +
				"GROUP BY biz_type";

		Map<String, Object> params = ValueUtil.newMap("domainId,orderDate,cancelStatus",
				domainId, date, ShipmentOrder.STATUS_CANCELLED);

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
				sql, params, Map.class, 0, 0);

		Map<String, Object> bizTypeStats = new HashMap<>();
		bizTypeStats.put("B2C_OUT", 0);
		bizTypeStats.put("B2B_OUT", 0);
		bizTypeStats.put("B2C_RTN", 0);
		bizTypeStats.put("B2B_RTN", 0);

		for (Map<String, Object> row : results) {
			String bizType = (String) row.get("biz_type");
			Object countObj = row.get("count");
			int count = countObj instanceof Long ? ((Long) countObj).intValue() : ((Number) countObj).intValue();
			if (bizType != null) {
				bizTypeStats.put(bizType, count);
			}
		}

		return bizTypeStats;
	}

	/**
	 * 채널(고객)별 통계 조회
	 *
	 * @param orderDate 기준일 (optional, 기본값: 오늘)
	 * @return 채널별 건수 리스트 [{ custCd, custNm, count }]
	 */
	public List<Map<String, Object>> getChannelStats(String orderDate) {
		String date = ValueUtil.isNotEmpty(orderDate) ? orderDate : DateUtil.todayStr();
		Long domainId = Domain.currentDomainId();

		String sql = "SELECT cust_cd, cust_nm, COUNT(*) as count " +
				"FROM shipment_orders " +
				"WHERE domain_id = :domainId " +
				"AND order_date = :orderDate " +
				"AND status != :cancelStatus " +
				"GROUP BY cust_cd, cust_nm " +
				"ORDER BY count DESC " +
				"LIMIT 10";

		Map<String, Object> params = ValueUtil.newMap("domainId,orderDate,cancelStatus",
				domainId, date, ShipmentOrder.STATUS_CANCELLED);

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
				sql, params, Map.class, 0, 0);

		List<Map<String, Object>> channelStats = new ArrayList<>();
		for (Map<String, Object> row : results) {
			Map<String, Object> channel = new HashMap<>();
			channel.put("custCd", row.get("cust_cd"));
			channel.put("custNm", row.get("cust_nm"));
			Object countObj = row.get("count");
			int count = countObj instanceof Long ? ((Long) countObj).intValue() : ((Number) countObj).intValue();
			channel.put("count", count);
			channelStats.add(channel);
		}

		return channelStats;
	}

	/**
	 * 웨이브 진행 현황 조회
	 *
	 * @param waveDate 기준일 (optional, 기본값: 오늘)
	 * @return 웨이브 상태별 건수 Map (CREATED, RELEASED, COMPLETED, CANCELLED)
	 */
	public Map<String, Object> getWaveStats(String waveDate) {
		String date = ValueUtil.isNotEmpty(waveDate) ? waveDate : DateUtil.todayStr();
		Long domainId = Domain.currentDomainId();

		String sql = "SELECT status, COUNT(*) as count " +
				"FROM shipment_waves " +
				"WHERE domain_id = :domainId " +
				"AND wave_date = :waveDate " +
				"GROUP BY status";

		Map<String, Object> params = ValueUtil.newMap("domainId,waveDate", domainId, date);

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
				sql, params, Map.class, 0, 0);

		Map<String, Object> waveStats = new HashMap<>();
		waveStats.put(ShipmentWave.STATUS_CREATED, 0);
		waveStats.put(ShipmentWave.STATUS_RELEASED, 0);
		waveStats.put(ShipmentWave.STATUS_COMPLETED, 0);
		waveStats.put(ShipmentWave.STATUS_CANCELLED, 0);

		for (Map<String, Object> row : results) {
			String status = (String) row.get("status");
			Object countObj = row.get("count");
			int count = countObj instanceof Long ? ((Long) countObj).intValue() : ((Number) countObj).intValue();
			waveStats.put(status, count);
		}

		return waveStats;
	}

	/**
	 * 할당 현황 통계 조회
	 *
	 * @return 할당 현황 Map (totalOrders, allocatedOrders, backOrders, allocRate, softAllocExpiringSoon)
	 */
	public Map<String, Object> getAllocationStats() {
		Long domainId = Domain.currentDomainId();
		String today = DateUtil.todayStr();

		Map<String, Object> stats = new HashMap<>();

		// 1. 총 주문 수 (취소/마감 제외, 오늘 주문)
		String sqlTotal = "SELECT COUNT(*) as count FROM shipment_orders " +
				"WHERE domain_id = :domainId AND order_date = :today " +
				"AND status NOT IN (:excludeStatuses)";
		Map<String, Object> paramsTotal = new HashMap<>();
		paramsTotal.put("domainId", domainId);
		paramsTotal.put("today", today);
		paramsTotal.put("excludeStatuses", Arrays.asList(
				ShipmentOrder.STATUS_CANCELLED, ShipmentOrder.STATUS_CLOSED));
		Integer totalOrders = this.queryManager.selectBySql(sqlTotal, paramsTotal, Integer.class);
		stats.put("totalOrders", totalOrders != null ? totalOrders : 0);

		// 2. 할당 완료 건수
		String sqlAllocated = "SELECT COUNT(*) as count FROM shipment_orders " +
				"WHERE domain_id = :domainId AND order_date = :today " +
				"AND status IN (:allocStatuses)";
		Map<String, Object> paramsAllocated = new HashMap<>();
		paramsAllocated.put("domainId", domainId);
		paramsAllocated.put("today", today);
		paramsAllocated.put("allocStatuses", Arrays.asList(
				ShipmentOrder.STATUS_ALLOCATED, ShipmentOrder.STATUS_WAVED,
				ShipmentOrder.STATUS_RELEASED, ShipmentOrder.STATUS_PICKING,
				ShipmentOrder.STATUS_PACKING, ShipmentOrder.STATUS_SHIPPED));
		Integer allocatedOrders = this.queryManager.selectBySql(sqlAllocated, paramsAllocated, Integer.class);
		stats.put("allocatedOrders", allocatedOrders != null ? allocatedOrders : 0);

		// 3. 백오더 건수
		String sqlBackOrder = "SELECT COUNT(*) as count FROM shipment_orders " +
				"WHERE domain_id = :domainId AND order_date = :today " +
				"AND status = :backOrderStatus";
		Map<String, Object> paramsBackOrder = ValueUtil.newMap("domainId,today,backOrderStatus",
				domainId, today, ShipmentOrder.STATUS_BACK_ORDER);
		Integer backOrders = this.queryManager.selectBySql(sqlBackOrder, paramsBackOrder, Integer.class);
		stats.put("backOrders", backOrders != null ? backOrders : 0);

		// 4. 할당율
		int total = (int) stats.get("totalOrders");
		int allocated = (int) stats.get("allocatedOrders");
		double allocRate = total > 0 ? Math.round((double) allocated / total * 1000.0) / 10.0 : 0.0;
		stats.put("allocRate", allocRate);

		// 5. SOFT 할당 만료 임박 건수 (30분 이내)
		String sqlSoftExpiring = "SELECT COUNT(*) as count FROM stock_allocations " +
				"WHERE domain_id = :domainId " +
				"AND status = :softStatus " +
				"AND expired_at IS NOT NULL " +
				"AND expired_at <= :expireThreshold";
		Map<String, Object> paramsSoft = ValueUtil.newMap("domainId,softStatus,expireThreshold",
				domainId, StockAllocation.STATUS_SOFT, new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date(System.currentTimeMillis() + 30 * 60 * 1000L)));
		Integer softExpiring = this.queryManager.selectBySql(sqlSoftExpiring, paramsSoft, Integer.class);
		stats.put("softAllocExpiringSoon", softExpiring != null ? softExpiring : 0);

		return stats;
	}

	/**
	 * 마감 임박/주의 알림 목록 조회
	 *
	 * @return 알림 목록 [{ type, message, count }]
	 */
	public List<Map<String, Object>> getCutoffAlerts() {
		List<Map<String, Object>> alerts = new ArrayList<>();
		Long domainId = Domain.currentDomainId();
		String today = DateUtil.todayStr();

		// 1. 마감 임박 주문 (ship_by_date = today, 아직 미출하)
		String sqlCutoff = "SELECT COUNT(*) as count FROM shipment_orders " +
				"WHERE domain_id = :domainId " +
				"AND ship_by_date = :today " +
				"AND cutoff_time IS NOT NULL " +
				"AND status NOT IN (:completedStatuses)";
		Map<String, Object> paramsCutoff = new HashMap<>();
		paramsCutoff.put("domainId", domainId);
		paramsCutoff.put("today", today);
		paramsCutoff.put("completedStatuses", Arrays.asList(
				ShipmentOrder.STATUS_SHIPPED, ShipmentOrder.STATUS_CLOSED, ShipmentOrder.STATUS_CANCELLED));
		Integer cutoffCount = this.queryManager.selectBySql(sqlCutoff, paramsCutoff, Integer.class);
		if (cutoffCount != null && cutoffCount > 0) {
			Map<String, Object> alert = new HashMap<>();
			alert.put("type", "danger");
			alert.put("message", "마감 임박 주문: " + cutoffCount + "건");
			alert.put("count", cutoffCount);
			alerts.add(alert);
		}

		// 2. 재고 부족 주문 (BACK_ORDER)
		String sqlBackOrder = "SELECT COUNT(*) as count FROM shipment_orders " +
				"WHERE domain_id = :domainId " +
				"AND status = :backOrderStatus";
		Map<String, Object> paramsBack = ValueUtil.newMap("domainId,backOrderStatus",
				domainId, ShipmentOrder.STATUS_BACK_ORDER);
		Integer backOrderCount = this.queryManager.selectBySql(sqlBackOrder, paramsBack, Integer.class);
		if (backOrderCount != null && backOrderCount > 0) {
			Map<String, Object> alert = new HashMap<>();
			alert.put("type", "warning");
			alert.put("message", "재고 부족 주문: " + backOrderCount + "건 (BACK_ORDER)");
			alert.put("count", backOrderCount);
			alerts.add(alert);
		}

		// 3. SOFT 할당 만료 임박
		String sqlSoft = "SELECT COUNT(*) as count FROM stock_allocations " +
				"WHERE domain_id = :domainId " +
				"AND status = :softStatus " +
				"AND expired_at IS NOT NULL " +
				"AND expired_at <= :expireThreshold";
		Map<String, Object> paramsSoft = ValueUtil.newMap("domainId,softStatus,expireThreshold",
				domainId, StockAllocation.STATUS_SOFT, new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date(System.currentTimeMillis() + 30 * 60 * 1000L)));
		Integer softCount = this.queryManager.selectBySql(sqlSoft, paramsSoft, Integer.class);
		if (softCount != null && softCount > 0) {
			Map<String, Object> alert = new HashMap<>();
			alert.put("type", "info");
			alert.put("message", "SOFT 할당 만료 예정: " + softCount + "건 (30분 이내)");
			alert.put("count", softCount);
			alerts.add(alert);
		}

		return alerts;
	}
}
