package operato.wms.oms.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 입출고 현황 서비스
 *
 * 기간별 입출고 KPI 요약 및 상세 내역 조회 기능을 제공한다.
 *
 * @author HatioLab
 */
@Component
public class InoutStatusService extends AbstractQueryService {

	private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

	/**
	 * 입출고 KPI 요약 조회
	 *
	 * 현재 기간 입고·출고·반품·재고변동 합계와 이전 동일 기간 대비 증감률을 반환한다.
	 *
	 * @param fromDate 시작일 (yyyy-MM-dd)
	 * @param toDate   종료일 (yyyy-MM-dd)
	 * @param comCd    화주사 코드 (optional)
	 * @param whCd     창고 코드 (optional)
	 * @return KPI 요약 Map
	 */
	@SuppressWarnings("unchecked")
	public Map<String, Object> getSummary(String fromDate, String toDate, String comCd, String whCd) {
		Long domainId = Domain.currentDomainId();

		String today = DateUtil.todayStr();
		String from = ValueUtil.isNotEmpty(fromDate) ? fromDate : today;
		String to = ValueUtil.isNotEmpty(toDate) ? toDate : today;

		Map<String, Object> current = querySummary(domainId, from, to, comCd, whCd);

		// 이전 기간 계산
		LocalDate fromLocal = LocalDate.parse(from, DATE_FMT);
		LocalDate toLocal = LocalDate.parse(to, DATE_FMT);
		long periodDays = ChronoUnit.DAYS.between(fromLocal, toLocal) + 1;
		LocalDate prevTo = fromLocal.minusDays(1);
		LocalDate prevFrom = prevTo.minusDays(periodDays - 1);

		Map<String, Object> prev = querySummary(domainId, prevFrom.format(DATE_FMT), prevTo.format(DATE_FMT), comCd, whCd);

		// 증감률 계산
		Map<String, Object> result = ValueUtil.newMap(
				"total_in_qty,total_out_qty,total_return_qty,total_stock_change,total_count",
				toLong(current.get("total_in_qty")),
				toLong(current.get("total_out_qty")),
				toLong(current.get("total_return_qty")),
				toLong(current.get("total_stock_change")),
				toLong(current.get("total_count")));

		result.put("in_qty_rate", calcRate(toLong(current.get("total_in_qty")), toLong(prev.get("total_in_qty"))));
		result.put("out_qty_rate", calcRate(toLong(current.get("total_out_qty")), toLong(prev.get("total_out_qty"))));
		result.put("return_qty_rate", calcRate(toLong(current.get("total_return_qty")), toLong(prev.get("total_return_qty"))));
		result.put("stock_change_rate", calcRate(toLong(current.get("total_stock_change")), toLong(prev.get("total_stock_change"))));
		result.put("count_rate", calcRate(toLong(current.get("total_count")), toLong(prev.get("total_count"))));

		return result;
	}

	/**
	 * 입출고 상세 내역 페이지네이션 조회
	 *
	 * @param fromDate  시작일
	 * @param toDate    종료일
	 * @param comCd     화주사 코드 (optional)
	 * @param whCd      창고 코드 (optional)
	 * @param skuCd     상품 코드 (optional)
	 * @param category  구분 — 입고/출고/반품 (optional)
	 * @param tranType  입출고 구분 — tran_type 값 (optional)
	 * @param docStatus 상태 (optional)
	 * @param page      페이지 번호 (1-based)
	 * @param limit     페이지 크기
	 * @return { total_count, items, page, limit }
	 */
	@SuppressWarnings("unchecked")
	public Map<String, Object> getList(String fromDate, String toDate, String comCd, String whCd,
			String skuCd, String category, String tranType, String docStatus,
			Integer page, Integer limit) {

		Long domainId = Domain.currentDomainId();
		String today = DateUtil.todayStr();
		String from = ValueUtil.isNotEmpty(fromDate) ? fromDate : today;
		String to = ValueUtil.isNotEmpty(toDate) ? toDate : today;

		StringBuilder where = new StringBuilder()
				.append(" WHERE it.domain_id = :domainId")
				.append(" AND it.tran_date >= :fromDate AND it.tran_date <= :toDate");

		Map<String, Object> params = ValueUtil.newMap("domainId,fromDate,toDate", domainId, from, to);

		if (ValueUtil.isNotEmpty(comCd)) {
			where.append(" AND it.com_cd = :comCd");
			params.put("comCd", comCd);
		}
		if (ValueUtil.isNotEmpty(whCd)) {
			where.append(" AND it.wh_cd = :whCd");
			params.put("whCd", whCd);
		}
		if (ValueUtil.isNotEmpty(skuCd)) {
			where.append(" AND it.sku_cd ILIKE :skuCd");
			params.put("skuCd", "%" + skuCd + "%");
		}
		if (ValueUtil.isNotEmpty(category)) {
			switch (category) {
				case "입고":
					where.append(" AND it.direction = 'IN' AND it.tran_type != 'RWA_RESTOCK'");
					break;
				case "출고":
					where.append(" AND it.direction = 'OUT' AND it.tran_type != 'RWA_RESTOCK'");
					break;
				case "반품":
					where.append(" AND it.tran_type = 'RWA_RESTOCK'");
					break;
			}
		}
		if (ValueUtil.isNotEmpty(tranType)) {
			where.append(" AND it.tran_type = :tranType");
			params.put("tranType", tranType);
		}

		String joins = " LEFT JOIN receivings r ON r.domain_id = it.domain_id AND r.rcv_no = it.ref_doc_no" +
				" LEFT JOIN vendors v ON v.domain_id = it.domain_id AND v.vend_cd = r.vend_cd AND v.com_cd = r.com_cd" +
				" LEFT JOIN shipment_orders so ON so.domain_id = it.domain_id AND so.shipment_no = it.ref_doc_no";

		String countSql = "SELECT COUNT(*) FROM inventory_trans it" + joins + where;
		Integer totalCount = this.queryManager.selectBySql(countSql, params, Integer.class);

		String dataSql = "SELECT" +
				" it.tran_date," +
				" CASE" +
				"   WHEN it.tran_type = 'RWA_RESTOCK' THEN '반품'" +
				"   WHEN it.direction = 'IN' THEN '입고'" +
				"   WHEN it.direction = 'OUT' THEN '출고'" +
				"   ELSE '기타' END AS category," +
				" it.tran_type," +
				" COALESCE(r.vend_cd, so.cust_cd, '') AS partner_cd," +
				" COALESCE(v.vend_nm, so.cust_nm, '') AS partner_nm," +
				" it.sku_cd, it.sku_nm," +
				" COALESCE(it.lot_no, '') AS option_val," +
				" 'EA' AS unit_cd," +
				" CASE WHEN it.direction = 'IN' AND it.tran_type != 'RWA_RESTOCK' THEN it.tran_qty ELSE 0 END AS in_qty," +
				" CASE WHEN it.direction = 'OUT' AND it.tran_type != 'RWA_RESTOCK' THEN ABS(it.tran_qty) ELSE 0 END AS out_qty," +
				" CASE WHEN it.tran_type = 'RWA_RESTOCK' THEN it.tran_qty ELSE 0 END AS return_qty," +
				" it.tran_qty AS stock_change_qty," +
				" COALESCE(it.ref_doc_no, '') AS partner_order_no," +
				" COALESCE(r.status, so.status, '') AS doc_status," +
				" COALESCE(it.remarks, '') AS remarks" +
				" FROM inventory_trans it" + joins + where +
				" ORDER BY it.tran_date DESC, it.tran_at DESC";

		List<Map<String, Object>> items = (List<Map<String, Object>>) (List<?>) this.queryManager
				.selectListBySql(dataSql, params, Map.class, page - 1, limit);

		return ValueUtil.newMap("total_count,items,page,limit",
				totalCount != null ? totalCount : 0, items, page, limit);
	}

	/**
	 * 기간 내 입출고 통계 집계
	 */
	@SuppressWarnings("unchecked")
	private Map<String, Object> querySummary(Long domainId, String from, String to, String comCd, String whCd) {
		StringBuilder where = new StringBuilder()
				.append(" WHERE domain_id = :domainId")
				.append(" AND tran_date >= :fromDate AND tran_date <= :toDate");

		Map<String, Object> params = ValueUtil.newMap("domainId,fromDate,toDate", domainId, from, to);

		if (ValueUtil.isNotEmpty(comCd)) {
			where.append(" AND com_cd = :comCd");
			params.put("comCd", comCd);
		}
		if (ValueUtil.isNotEmpty(whCd)) {
			where.append(" AND wh_cd = :whCd");
			params.put("whCd", whCd);
		}

		String sql = "SELECT" +
				" COALESCE(SUM(CASE WHEN direction = 'IN' AND tran_type != 'RWA_RESTOCK' THEN tran_qty ELSE 0 END), 0) AS total_in_qty," +
				" COALESCE(SUM(CASE WHEN direction = 'OUT' AND tran_type != 'RWA_RESTOCK' THEN ABS(tran_qty) ELSE 0 END), 0) AS total_out_qty," +
				" COALESCE(SUM(CASE WHEN tran_type = 'RWA_RESTOCK' THEN tran_qty ELSE 0 END), 0) AS total_return_qty," +
				" COALESCE(SUM(tran_qty), 0) AS total_stock_change," +
				" COUNT(*) AS total_count" +
				" FROM inventory_trans" + where;

		Map<String, Object> result = (Map<String, Object>) this.queryManager.selectBySql(sql, params, Map.class);
		return result != null ? result : ValueUtil.newMap(
				"total_in_qty,total_out_qty,total_return_qty,total_stock_change,total_count", 0L, 0L, 0L, 0L, 0L);
	}

	/**
	 * 증감률 계산 (%)
	 */
	private double calcRate(long current, long previous) {
		if (previous == 0) return current > 0 ? 100.0 : 0.0;
		return Math.round(((double)(current - previous) / previous) * 1000.0) / 10.0;
	}

	private long toLong(Object val) {
		if (val == null) return 0L;
		if (val instanceof Long) return (Long) val;
		if (val instanceof Number) return ((Number) val).longValue();
		return 0L;
	}
}
