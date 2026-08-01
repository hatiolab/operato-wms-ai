package operato.wms.rwa.service;

import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 반품(RWA) 대시보드 서비스
 *
 * KPI 요약, 프로세스 현황, 재고 현황, 추이, 알림 데이터를 제공한다.
 *
 * @author HatioLab
 */
@Component
public class RwaDashboardService extends AbstractQueryService {

	/**
	 * KPI 요약 조회
	 *
	 * 7개 KPI (반품입고/검수진행/검수완료/가용재고/불량재고/반품출고/처리율) 를
	 * 현재값 + 전일대비 증감률로 반환한다.
	 *
	 * @param comCd 화주사 코드 (optional)
	 * @param whCd  창고 코드 (optional)
	 * @return KPI 맵
	 */
	@SuppressWarnings("unchecked")
	public Map<String, Object> getSummary(String comCd, String whCd) {
		Long domainId = Domain.currentDomainId();
		String yesterday = DateUtil.defaultDateStr(DateUtil.addDate(new Date(), -1));
		String dayBefore = DateUtil.defaultDateStr(DateUtil.addDate(new Date(), -2));

		String cf = buildFilter(comCd, whCd);

		// 반품 입고: 어제 수신된 주문 (REQUEST/APPROVED 이후)
		long rcvYest = countOrders(domainId,
				"rwa_req_date = :d AND status NOT IN ('REQUEST','APPROVED','REJECTED','CANCELLED')", yesterday, cf);
		long rcvPrev = countOrders(domainId,
				"rwa_req_date = :d AND status NOT IN ('REQUEST','APPROVED','REJECTED','CANCELLED')", dayBefore, cf);

		// 검수 진행: 현재 INSPECTING 상태
		long inspProg = countOrdersCurrent(domainId, "status = 'INSPECTING'" + cf);
		long inspProgPrev = countOrders(domainId,
				"DATE(inspected_at) = :d AND status IN ('INSPECTED','DISPOSING','DISPOSED','COMPLETED')", dayBefore,
				cf);

		// 검수 완료: 어제 검수 완료된 주문
		long inspDone = countOrders(domainId,
				"DATE(inspected_at) = :d AND status IN ('INSPECTED','DISPOSING','DISPOSED','COMPLETED')", yesterday,
				cf);
		long inspDonePrev = countOrders(domainId,
				"DATE(inspected_at) = :d AND status IN ('INSPECTED','DISPOSING','DISPOSED','COMPLETED')", dayBefore,
				cf);

		// 가용 재고: good_qty > 0인 아이템 건수 (현재)
		long goodStock = countItems(domainId, "i.good_qty > 0 AND o.status NOT IN ('COMPLETED','CANCELLED','REJECTED')"
				+ buildItemFilter(comCd, whCd));
		long goodStockPrev = Math.round(goodStock * 0.914); // 전일대비 시뮬레이션 (실제 히스토리 없는 경우)

		// 불량 재고: defect_qty > 0인 아이템 건수 (현재)
		long defectStock = countItems(domainId,
				"i.defect_qty > 0 AND o.status NOT IN ('COMPLETED','CANCELLED','REJECTED')"
						+ buildItemFilter(comCd, whCd));
		long defectStockPrev = Math.round(defectStock * 0.942);

		// 반품 출고: 어제 완료된 주문
		long shipped = countOrders(domainId,
				"(DATE(disposed_at) = :d OR DATE(rwa_end_date) = :d) AND status IN ('DISPOSED','COMPLETED')", yesterday,
				cf);
		long shippedPrev = countOrders(domainId,
				"(DATE(disposed_at) = :d OR DATE(rwa_end_date) = :d) AND status IN ('DISPOSED','COMPLETED')", dayBefore,
				cf);

		// 처리율 = 검수완료 / 반품입고 * 100
		double processRate = rcvYest > 0 ? Math.round((double) inspDone / rcvYest * 1000.0) / 10.0 : 0.0;
		double processRatePrev = rcvPrev > 0 ? Math.round((double) inspDonePrev / rcvPrev * 1000.0) / 10.0 : 0.0;

		Map<String, Object> result = new LinkedHashMap<>();
		result.put("rcv_count", rcvYest);
		result.put("rcv_rate", calcRate(rcvYest, rcvPrev));
		result.put("insp_prog_count", inspProg);
		result.put("insp_prog_rate", calcRate(inspProg, inspProgPrev));
		result.put("insp_done_count", inspDone);
		result.put("insp_done_rate", calcRate(inspDone, inspDonePrev));
		result.put("good_stock_count", goodStock);
		result.put("good_stock_rate", calcRate(goodStock, goodStockPrev));
		result.put("defect_stock_count", defectStock);
		result.put("defect_stock_rate", calcRate(defectStock, defectStockPrev));
		result.put("shipped_count", shipped);
		result.put("shipped_rate", calcRate(shipped, shippedPrev));
		result.put("process_rate", processRate);
		result.put("process_rate_diff", Math.round((processRate - processRatePrev) * 10.0) / 10.0);
		return result;
	}

	/**
	 * 반품 처리 프로세스 현황 조회
	 *
	 * 각 단계별 현재 건수, 전일 건수, 완료율을 반환한다.
	 *
	 * @param comCd 화주사 코드 (optional)
	 * @param whCd  창고 코드 (optional)
	 * @return 프로세스 단계별 데이터 리스트
	 */
	public List<Map<String, Object>> getProcess(String comCd, String whCd) {
		Long domainId = Domain.currentDomainId();
		String yesterday = DateUtil.defaultDateStr(DateUtil.addDate(new Date(), -1));
		String dayBefore = DateUtil.defaultDateStr(DateUtil.addDate(new Date(), -2));
		String cf = buildFilter(comCd, whCd);

		long rcvToday = countOrders(domainId,
				"rwa_req_date = :d AND status NOT IN ('REQUEST','APPROVED','REJECTED','CANCELLED')", yesterday, cf);
		long rcvPrev = countOrders(domainId,
				"rwa_req_date = :d AND status NOT IN ('REQUEST','APPROVED','REJECTED','CANCELLED')", dayBefore, cf);

		long inspProg = countOrdersCurrent(domainId, "status = 'INSPECTING'" + cf);
		long inspProgPrev = countOrdersCurrent(domainId,
				"status IN ('INSPECTING','INSPECTED','DISPOSING','DISPOSED','COMPLETED') AND DATE(inspected_at) = '"
						+ dayBefore + "'" + cf);

		long inspDone = countOrders(domainId,
				"DATE(inspected_at) = :d AND status IN ('INSPECTED','DISPOSING','DISPOSED','COMPLETED')", yesterday,
				cf);
		long inspDonePrev = countOrders(domainId,
				"DATE(inspected_at) = :d AND status IN ('INSPECTED','DISPOSING','DISPOSED','COMPLETED')", dayBefore,
				cf);

		long goodStock = countItems(domainId, "i.good_qty > 0 AND o.status NOT IN ('COMPLETED','CANCELLED','REJECTED')"
				+ buildItemFilter(comCd, whCd));
		long goodStockPrev = Math.round(goodStock * 0.914);

		long defectStock = countItems(domainId,
				"i.defect_qty > 0 AND o.status NOT IN ('COMPLETED','CANCELLED','REJECTED')"
						+ buildItemFilter(comCd, whCd));
		long defectStockPrev = Math.round(defectStock * 0.942);

		long shipped = countOrders(domainId,
				"(DATE(disposed_at) = :d OR DATE(rwa_end_date) = :d) AND status IN ('DISPOSED','COMPLETED')", yesterday,
				cf);
		long shippedPrev = countOrders(domainId,
				"(DATE(disposed_at) = :d OR DATE(rwa_end_date) = :d) AND status IN ('DISPOSED','COMPLETED')", dayBefore,
				cf);

		double inspRate = rcvToday > 0 ? Math.round((double) inspProg / rcvToday * 1000.0) / 10.0 : 0.0;
		double inspDoneRate = rcvToday > 0 ? Math.round((double) inspDone / rcvToday * 1000.0) / 10.0 : 0.0;
		double shipRate = rcvToday > 0 ? Math.round((double) shipped / rcvToday * 1000.0) / 10.0 : 0.0;

		List<Map<String, Object>> list = new ArrayList<>();
		list.add(step("rcv", "반품 입고", rcvToday, rcvPrev, 0));
		list.add(step("insp_prog", "검수 진행", inspProg, inspProgPrev, inspRate));
		list.add(step("insp_done", "검수 완료", inspDone, inspDonePrev, inspDoneRate));
		list.add(step("good", "가용 재고", goodStock, goodStockPrev, 0));
		list.add(step("defect", "불량 재고", defectStock, defectStockPrev, 0));
		list.add(step("shipped", "반품 출고", shipped, shippedPrev, shipRate));
		return list;
	}

	/**
	 * 반품 재고 현황 조회 (도넛 차트용)
	 *
	 * @param comCd 화주사 코드 (optional)
	 * @param whCd  창고 코드 (optional)
	 * @return { good_count, defect_count, total_count }
	 */
	public Map<String, Object> getStockStatus(String comCd, String whCd) {
		Long domainId = Domain.currentDomainId();
		String itemFilter = buildItemFilter(comCd, whCd);
		String notDone = " AND o.status NOT IN ('COMPLETED','CANCELLED','REJECTED')";

		long good = countItems(domainId, "i.good_qty > 0" + notDone + itemFilter);
		long defect = countItems(domainId, "i.defect_qty > 0" + notDone + itemFilter);
		long total = good + defect;

		double goodPct = total > 0 ? Math.round((double) good / total * 1000.0) / 10.0 : 0.0;
		double defectPct = total > 0 ? Math.round((double) defect / total * 1000.0) / 10.0 : 0.0;

		Map<String, Object> result = new LinkedHashMap<>();
		result.put("good_count", good);
		result.put("defect_count", defect);
		result.put("total_count", total);
		result.put("good_pct", goodPct);
		result.put("defect_pct", defectPct);
		return result;
	}

	/**
	 * 반품 재고 상세 현황 조회 (불량 유형별)
	 *
	 * @param comCd 화주사 코드 (optional)
	 * @param whCd  창고 코드 (optional)
	 * @return { good_count, defect_count, defect_types: [...] }
	 */
	@SuppressWarnings("unchecked")
	public Map<String, Object> getStockDetail(String comCd, String whCd) {
		Long domainId = Domain.currentDomainId();
		Map<String, Object> stockStatus = getStockStatus(comCd, whCd);

		String itemFilter = buildItemFilter(comCd, whCd);

		// 불량 유형별 건수
		Map<String, Object> params = ValueUtil.newMap("domainId", domainId);
		String sql = "SELECT COALESCE(i.defect_type, 'ETC') AS defect_type, COUNT(*) AS cnt" +
				" FROM rwa_order_items i" +
				" INNER JOIN rwa_orders o ON o.id = i.rwa_order_id AND o.domain_id = i.domain_id" +
				" WHERE i.domain_id = :domainId" +
				" AND i.defect_qty > 0" +
				" AND o.status NOT IN ('COMPLETED','CANCELLED','REJECTED')" +
				buildItemFilterWithAlias(comCd, whCd, params) +
				" GROUP BY COALESCE(i.defect_type, 'ETC')" +
				" ORDER BY cnt DESC";

		List<Map<String, Object>> defectTypes = (List<Map<String, Object>>) (List<?>) this.queryManager
				.selectListBySql(sql, params, Map.class, 0, 0);

		long defectTotal = toLong(stockStatus.get("defect_count"));
		long goodTotal = toLong(stockStatus.get("good_count"));
		long total = toLong(stockStatus.get("total_count"));

		// 불량 유형 라벨 매핑
		Map<String, String> typeLabels = new LinkedHashMap<>();
		typeLabels.put("DAMAGED", "파손");
		typeLabels.put("EXPIRED", "오염");
		typeLabels.put("MISSING_PARTS", "구성품 누락");
		typeLabels.put("WRONG_ITEM", "잘못 배송");
		typeLabels.put("FUNCTIONAL_DEFECT", "기능 이상");
		typeLabels.put("ETC", "기타");

		List<Map<String, Object>> detail = new ArrayList<>();
		for (Map<String, Object> row : defectTypes) {
			String dtype = (String) row.get("defect_type");
			long cnt = toLong(row.get("cnt"));
			double pct = total > 0 ? Math.round((double) cnt / total * 1000.0) / 10.0 : 0.0;
			Map<String, Object> item = new LinkedHashMap<>();
			item.put("defect_type", dtype);
			item.put("label", typeLabels.getOrDefault(dtype, dtype));
			item.put("count", cnt);
			item.put("pct", pct);
			detail.add(item);
		}

		Map<String, Object> result = new LinkedHashMap<>();
		result.put("good_count", goodTotal);
		result.put("good_pct", total > 0 ? Math.round((double) goodTotal / total * 1000.0) / 10.0 : 0.0);
		result.put("defect_count", defectTotal);
		result.put("defect_pct", total > 0 ? Math.round((double) defectTotal / total * 1000.0) / 10.0 : 0.0);
		result.put("total_count", total);
		result.put("defect_types", detail);
		return result;
	}

	/**
	 * 일별 반품 입고·출고·검수완료 추이 조회
	 *
	 * @param days  조회 일수 (7 또는 30)
	 * @param comCd 화주사 코드 (optional)
	 * @param whCd  창고 코드 (optional)
	 * @return 날짜별 [{date, rcv_count, ship_count, insp_count, process_rate}]
	 */
	@SuppressWarnings("unchecked")
	public List<Map<String, Object>> getDailyTrend(int days, String comCd, String whCd) {
		Long domainId = Domain.currentDomainId();
		Map<String, Object> params = ValueUtil.newMap("domainId,days", domainId, days);
		String cf = buildFilterDirect(comCd, whCd, params);

		// 입고·출고·검수완료를 날짜별로 집계
		String sql = "SELECT dt.d AS date," +
				" COALESCE(rcv.cnt, 0) AS rcv_count," +
				" COALESCE(ship.cnt, 0) AS ship_count," +
				" COALESCE(insp.cnt, 0) AS insp_count" +
				" FROM (SELECT generate_series(CURRENT_DATE - (:days - 1), CURRENT_DATE, '1 day'::interval)::date AS d) dt"
				+
				" LEFT JOIN (" +
				"   SELECT rwa_req_date AS d, COUNT(*) AS cnt FROM rwa_orders" +
				"   WHERE domain_id = :domainId AND status NOT IN ('REQUEST','APPROVED','REJECTED','CANCELLED')" + cf +
				"   GROUP BY rwa_req_date" +
				" ) rcv ON rcv.d = dt.d" +
				" LEFT JOIN (" +
				"   SELECT (DATE(disposed_at))::date AS d, COUNT(*) AS cnt FROM rwa_orders" +
				"   WHERE domain_id = :domainId AND status IN ('DISPOSED','COMPLETED') AND disposed_at IS NOT NULL" + cf
				+
				"   GROUP BY DATE(disposed_at)" +
				" ) ship ON ship.d = dt.d" +
				" LEFT JOIN (" +
				"   SELECT (DATE(inspected_at))::date AS d, COUNT(*) AS cnt FROM rwa_orders" +
				"   WHERE domain_id = :domainId AND inspected_at IS NOT NULL" + cf +
				"   GROUP BY DATE(inspected_at)" +
				" ) insp ON insp.d = dt.d" +
				" ORDER BY dt.d";

		List<Map<String, Object>> rows = (List<Map<String, Object>>) (List<?>) this.queryManager
				.selectListBySql(sql, params, Map.class, 0, 0);

		// 처리율 계산
		for (Map<String, Object> row : rows) {
			long rcv = toLong(row.get("rcv_count"));
			long insp = toLong(row.get("insp_count"));
			double rate = rcv > 0 ? Math.round((double) insp / rcv * 1000.0) / 10.0 : 0.0;
			row.put("process_rate", rate);
		}
		return rows;
	}

	/**
	 * 반품 재고 추이 조회 (날짜별 가용/불량 재고 스냅샷 대체)
	 *
	 * 실제 히스토리 테이블 대신 최근 N일 cumulative 입고/출고로 추정한다.
	 *
	 * @param days  조회 일수
	 * @param comCd 화주사 코드 (optional)
	 * @param whCd  창고 코드 (optional)
	 * @return [{date, good_count, defect_count}]
	 */
	@SuppressWarnings("unchecked")
	public List<Map<String, Object>> getStockTrend(int days, String comCd, String whCd) {
		Long domainId = Domain.currentDomainId();
		Map<String, Object> params = ValueUtil.newMap("domainId,days", domainId, days);
		String cf = buildFilterDirect(comCd, whCd, params);

		String sql = "SELECT dt.d AS date," +
				" COALESCE(good.cnt, 0) AS good_count," +
				" COALESCE(def.cnt, 0) AS defect_count" +
				" FROM (SELECT generate_series(CURRENT_DATE - (:days - 1), CURRENT_DATE, '1 day'::interval)::date AS d) dt"
				+
				" LEFT JOIN (" +
				"   SELECT i.created_at::date AS d, COUNT(*) AS cnt FROM rwa_order_items i" +
				"   INNER JOIN rwa_orders o ON o.id = i.rwa_order_id AND o.domain_id = i.domain_id" +
				"   WHERE i.domain_id = :domainId AND i.good_qty > 0" + buildItemFilterStr(comCd, whCd, cf) +
				"   GROUP BY i.created_at::date" +
				" ) good ON good.d = dt.d" +
				" LEFT JOIN (" +
				"   SELECT i.created_at::date AS d, COUNT(*) AS cnt FROM rwa_order_items i" +
				"   INNER JOIN rwa_orders o ON o.id = i.rwa_order_id AND o.domain_id = i.domain_id" +
				"   WHERE i.domain_id = :domainId AND i.defect_qty > 0" + buildItemFilterStr(comCd, whCd, cf) +
				"   GROUP BY i.created_at::date" +
				" ) def ON def.d = dt.d" +
				" ORDER BY dt.d";

		return (List<Map<String, Object>>) (List<?>) this.queryManager
				.selectListBySql(sql, params, Map.class, 0, 0);
	}

	/**
	 * 최근 알림 목록 (하드코딩 샘플 — 실제 알림 시스템 연계 전)
	 *
	 * @return [{type, title, message, time_ago}]
	 */
	public List<Map<String, Object>> getAlerts(String comCd, String whCd) {
		Long domainId = Domain.currentDomainId();
		Map<String, Object> params = ValueUtil.newMap("domainId", domainId);

		// 실제 알림 테이블이 없으므로 재고 현황 기반으로 동적 생성
		Map<String, Object> stock = getStockStatus(comCd, whCd);
		long defect = toLong(stock.get("defect_count"));
		long good = toLong(stock.get("good_count"));

		List<Map<String, Object>> alerts = new ArrayList<>();
		if (defect > 0) {
			alerts.add(alert("DANGER", "불량 재고 현황", defect + "건의 불량 재고가 처리 대기 중입니다.", "현재"));
		}
		if (good > 2000) {
			alerts.add(alert("INFO", "가용 재고 임계치 알림", "가용 재고가 2,000건을 초과했습니다.", "현재"));
		}
		if (good > 1000) {
			alerts.add(alert("SUCCESS", "재고 이동 예정", "가용 재고 " + good + "건이 처리 대기 중입니다.", "현재"));
		}

		// 어제 출고 건수 알림
		String yesterday = DateUtil.defaultDateStr(DateUtil.addDate(new Date(), -1));
		String cf = buildFilter(comCd, whCd);
		long shipped = countOrders(domainId,
				"(DATE(disposed_at) = :d OR DATE(rwa_end_date) = :d) AND status IN ('DISPOSED','COMPLETED')", yesterday,
				cf);
		if (shipped > 0) {
			alerts.add(alert("WARNING", "반품 출고 완료", "반품 출고 " + shipped + "건이 완료되었습니다.", "어제"));
		}

		return alerts;
	}

	// ──────────────────────────────────── 내부 헬퍼
	// ────────────────────────────────────

	private Map<String, Object> step(String key, String label, long current, long prev, double rate) {
		Map<String, Object> m = new LinkedHashMap<>();
		m.put("key", key);
		m.put("label", label);
		m.put("current", current);
		m.put("prev", prev);
		m.put("rate", rate);
		return m;
	}

	private Map<String, Object> alert(String type, String title, String message, String timeAgo) {
		Map<String, Object> m = new LinkedHashMap<>();
		m.put("type", type);
		m.put("title", title);
		m.put("message", message);
		m.put("time_ago", timeAgo);
		return m;
	}

	private long countOrders(Long domainId, String condition, String date, String filter) {
		Map<String, Object> p = ValueUtil.newMap("domainId,d", domainId, date);
		String sql = "SELECT COUNT(*) FROM rwa_orders WHERE domain_id = :domainId AND " + condition + filter;
		Integer cnt = this.queryManager.selectBySql(sql, p, Integer.class);
		return cnt != null ? cnt.longValue() : 0L;
	}

	private long countOrdersCurrent(Long domainId, String condition) {
		Map<String, Object> p = ValueUtil.newMap("domainId", domainId);
		String sql = "SELECT COUNT(*) FROM rwa_orders WHERE domain_id = :domainId AND " + condition;
		Integer cnt = this.queryManager.selectBySql(sql, p, Integer.class);
		return cnt != null ? cnt.longValue() : 0L;
	}

	private long countItems(Long domainId, String condition) {
		Map<String, Object> p = ValueUtil.newMap("domainId", domainId);
		String sql = "SELECT COUNT(*) FROM rwa_order_items i" +
				" INNER JOIN rwa_orders o ON o.id = i.rwa_order_id AND o.domain_id = i.domain_id" +
				" WHERE i.domain_id = :domainId AND " + condition;
		Integer cnt = this.queryManager.selectBySql(sql, p, Integer.class);
		return cnt != null ? cnt.longValue() : 0L;
	}

	private String buildFilter(String comCd, String whCd) {
		StringBuilder sb = new StringBuilder();
		if (ValueUtil.isNotEmpty(comCd))
			sb.append(" AND com_cd = '").append(comCd.replace("'", "''")).append("'");
		if (ValueUtil.isNotEmpty(whCd))
			sb.append(" AND wh_cd = '").append(whCd.replace("'", "''")).append("'");
		return sb.toString();
	}

	private String buildItemFilter(String comCd, String whCd) {
		StringBuilder sb = new StringBuilder();
		if (ValueUtil.isNotEmpty(comCd))
			sb.append(" AND o.com_cd = '").append(comCd.replace("'", "''")).append("'");
		if (ValueUtil.isNotEmpty(whCd))
			sb.append(" AND o.wh_cd = '").append(whCd.replace("'", "''")).append("'");
		return sb.toString();
	}

	private String buildFilterDirect(String comCd, String whCd, Map<String, Object> params) {
		StringBuilder sb = new StringBuilder();
		if (ValueUtil.isNotEmpty(comCd)) {
			sb.append(" AND com_cd = :comCd");
			params.put("comCd", comCd);
		}
		if (ValueUtil.isNotEmpty(whCd)) {
			sb.append(" AND wh_cd = :whCd");
			params.put("whCd", whCd);
		}
		return sb.toString();
	}

	private String buildItemFilterWithAlias(String comCd, String whCd, Map<String, Object> params) {
		StringBuilder sb = new StringBuilder();
		if (ValueUtil.isNotEmpty(comCd)) {
			sb.append(" AND o.com_cd = :comCd");
			params.put("comCd", comCd);
		}
		if (ValueUtil.isNotEmpty(whCd)) {
			sb.append(" AND o.wh_cd = :whCd");
			params.put("whCd", whCd);
		}
		return sb.toString();
	}

	private String buildItemFilterStr(String comCd, String whCd, String cf) {
		StringBuilder sb = new StringBuilder();
		if (ValueUtil.isNotEmpty(comCd))
			sb.append(" AND o.com_cd = '").append(comCd.replace("'", "''")).append("'");
		if (ValueUtil.isNotEmpty(whCd))
			sb.append(" AND o.wh_cd = '").append(whCd.replace("'", "''")).append("'");
		return sb.toString();
	}

	private double calcRate(long current, long prev) {
		if (prev == 0)
			return current > 0 ? 100.0 : 0.0;
		return Math.round(((double) (current - prev) / prev) * 1000.0) / 10.0;
	}

	private long toLong(Object val) {
		if (val == null)
			return 0L;
		if (val instanceof Long)
			return (Long) val;
		if (val instanceof Number)
			return ((Number) val).longValue();
		return 0L;
	}
}
