package operato.wms.stock.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 재고 이동 조회 서비스
 *
 * inventory_trans 테이블 기반 이동 이력 목록 조회, KPI 요약, 이동 흐름(timeline)을 제공한다.
 *
 * @author HatioLab
 */
@Component
public class InvMoveListService extends AbstractQueryService {

	/**
	 * KPI 요약 조회 (총 이동 / 입고 / 출고 / 로케이션이동 / 재고조정 수량·건수)
	 */
	@SuppressWarnings("unchecked")
	public Map<String, Object> getSummary(String fromDate, String toDate,
			String whCd, String comCd, String tranCategory,
			String skuCd, String locCd, String deviceCd, String workerId,
			String refDocNo, String lotNo) {

		Long domainId = Domain.currentDomainId();
		String today = DateUtil.todayStr();
		String from = ValueUtil.isNotEmpty(fromDate) ? fromDate : today;
		String to = ValueUtil.isNotEmpty(toDate) ? toDate : today;

		StringBuilder where = buildWhere(domainId, from, to, whCd, comCd, tranCategory,
				skuCd, locCd, deviceCd, workerId, refDocNo, lotNo);

		Map<String, Object> params = buildParams(domainId, from, to, whCd, comCd, tranCategory,
				skuCd, locCd, deviceCd, workerId, refDocNo, lotNo);

		String sql = "SELECT" +
				" COALESCE(SUM(ABS(it.tran_qty)), 0) AS total_ea_qty," +
				" COUNT(*) AS total_count," +
				" COALESCE(SUM(CASE WHEN it.tran_type IN ('IN','IN_INSP','IN_CANCEL','NEW') THEN ABS(it.tran_qty) ELSE 0 END), 0) AS in_ea_qty," +
				" COUNT(CASE WHEN it.tran_type IN ('IN','IN_INSP','IN_CANCEL','NEW') THEN 1 END) AS in_count," +
				" COALESCE(SUM(CASE WHEN it.tran_type IN ('OUT','OUT_CANCEL') THEN ABS(it.tran_qty) ELSE 0 END), 0) AS out_ea_qty," +
				" COUNT(CASE WHEN it.tran_type IN ('OUT','OUT_CANCEL') THEN 1 END) AS out_count," +
				" COALESCE(SUM(CASE WHEN it.tran_type IN ('MOVE_IN','MOVE_OUT','SPLIT','SPLIT_NEW','MERGE','MERGE_OUT') THEN ABS(it.tran_qty) ELSE 0 END), 0) AS loc_move_ea_qty," +
				" COUNT(CASE WHEN it.tran_type IN ('MOVE_IN','MOVE_OUT','SPLIT','SPLIT_NEW','MERGE','MERGE_OUT') THEN 1 END) AS loc_move_count," +
				" COALESCE(SUM(CASE WHEN it.tran_type IN ('ADJUST','SCRAP','COUNT','HOLD','RELEASE_HOLD') THEN ABS(it.tran_qty) ELSE 0 END), 0) AS adj_ea_qty," +
				" COUNT(CASE WHEN it.tran_type IN ('ADJUST','SCRAP','COUNT','HOLD','RELEASE_HOLD') THEN 1 END) AS adj_count" +
				" FROM inventory_trans it" + where;

		return (Map<String, Object>) this.queryManager.selectBySql(sql, params, Map.class);
	}

	/**
	 * 재고 이동 이력 목록 페이지네이션 조회
	 */
	@SuppressWarnings("unchecked")
	public Map<String, Object> getList(String fromDate, String toDate,
			String whCd, String comCd, String tranCategory,
			String skuCd, String locCd, String deviceCd, String workerId,
			String refDocNo, String lotNo, Integer page, Integer limit) {

		Long domainId = Domain.currentDomainId();
		String today = DateUtil.todayStr();
		String from = ValueUtil.isNotEmpty(fromDate) ? fromDate : today;
		String to = ValueUtil.isNotEmpty(toDate) ? toDate : today;

		StringBuilder where = buildWhere(domainId, from, to, whCd, comCd, tranCategory,
				skuCd, locCd, deviceCd, workerId, refDocNo, lotNo);

		Map<String, Object> params = buildParams(domainId, from, to, whCd, comCd, tranCategory,
				skuCd, locCd, deviceCd, workerId, refDocNo, lotNo);

		String countSql = "SELECT COUNT(*) FROM inventory_trans it" + where;
		Integer totalCount = this.queryManager.selectBySql(countSql, params, Integer.class);

		String dataSql = "SELECT" +
				" it.id," +
				" TO_CHAR(it.tran_at, 'YYYY-MM-DD HH24:MI:SS') AS tran_at," +
				" it.tran_type," +
				" CASE" +
				"   WHEN it.tran_type IN ('IN','IN_INSP','IN_CANCEL','NEW') THEN '입고'" +
				"   WHEN it.tran_type IN ('OUT','OUT_CANCEL') THEN '출고'" +
				"   WHEN it.tran_type IN ('MOVE_IN','MOVE_OUT','SPLIT','SPLIT_NEW','MERGE','MERGE_OUT') THEN '로케이션이동'" +
				"   WHEN it.tran_type IN ('ADJUST','SCRAP','COUNT','HOLD','RELEASE_HOLD') THEN '재고조정'" +
				"   ELSE it.tran_type" +
				" END AS tran_category," +
				" COALESCE(it.reason_cd, '') AS move_reason," +
				" it.sku_cd," +
				" COALESCE(it.sku_nm, '') AS sku_nm," +
				" it.tran_qty AS ea_qty," +
				" COALESCE(it.loc_cd, '') AS from_loc_cd," +
				" COALESCE(it.to_loc_cd, '') AS to_loc_cd," +
				" COALESCE(it.device_cd, '') AS device_cd," +
				" COALESCE(it.worker_id, '') AS worker_id," +
				" COALESCE(u.name, it.worker_id, '') AS worker_nm," +
				" COALESCE(it.ref_doc_no, '') AS ref_doc_no," +
				" COALESCE(it.lot_no, '') AS lot_no," +
				" COALESCE(it.expired_date, '') AS expired_date," +
				" COALESCE(it.remarks, '') AS remarks," +
				" COALESCE(it.group_id, '') AS group_id," +
				" it.direction" +
				" FROM inventory_trans it" +
				" LEFT JOIN users u ON u.domain_id = it.domain_id AND u.login = it.worker_id" +
				where +
				" ORDER BY it.tran_at DESC, it.id DESC";

		List<Map<String, Object>> items = (List<Map<String, Object>>) (List<?>) this.queryManager
				.selectListBySql(dataSql, params, Map.class, page - 1, limit);

		return ValueUtil.newMap("total_count,items,page,limit",
				totalCount != null ? totalCount : 0, items, page, limit);
	}

	/**
	 * group_id 기준 이동 흐름 타임라인 조회
	 */
	@SuppressWarnings("unchecked")
	public List<Map<String, Object>> getTimeline(String groupId) {
		Long domainId = Domain.currentDomainId();
		Map<String, Object> params = ValueUtil.newMap("domainId,groupId", domainId, groupId);

		String sql = "SELECT" +
				" it.tran_type," +
				" COALESCE(it.reason_cd, '') AS reason_cd," +
				" COALESCE(it.reason, '') AS reason," +
				" TO_CHAR(it.tran_at, 'YYYY-MM-DD HH24:MI:SS') AS tran_at," +
				" COALESCE(it.device_cd, '') AS device_cd," +
				" COALESCE(it.worker_id, '') AS worker_id," +
				" COALESCE(u.name, it.worker_id, '') AS worker_nm," +
				" it.loc_cd, COALESCE(it.to_loc_cd,'') AS to_loc_cd" +
				" FROM inventory_trans it" +
				" LEFT JOIN users u ON u.domain_id = it.domain_id AND u.login = it.worker_id" +
				" WHERE it.domain_id = :domainId AND it.group_id = :groupId" +
				" ORDER BY it.tran_at ASC";

		return (List<Map<String, Object>>) (List<?>) this.queryManager
				.selectListBySql(sql, params, Map.class, 0, 50);
	}

	/** WHERE 절 빌드 */
	private StringBuilder buildWhere(Long domainId, String from, String to,
			String whCd, String comCd, String tranCategory,
			String skuCd, String locCd, String deviceCd, String workerId,
			String refDocNo, String lotNo) {

		StringBuilder w = new StringBuilder()
				.append(" WHERE it.domain_id = :domainId")
				.append(" AND it.tran_date >= :fromDate AND it.tran_date <= :toDate");

		if (ValueUtil.isNotEmpty(whCd)) w.append(" AND it.wh_cd = :whCd");
		if (ValueUtil.isNotEmpty(comCd)) w.append(" AND it.com_cd = :comCd");

		if (ValueUtil.isNotEmpty(tranCategory)) {
			switch (tranCategory) {
				case "입고":
					w.append(" AND it.tran_type IN ('IN','IN_INSP','IN_CANCEL','NEW')"); break;
				case "출고":
					w.append(" AND it.tran_type IN ('OUT','OUT_CANCEL')"); break;
				case "로케이션이동":
					w.append(" AND it.tran_type IN ('MOVE_IN','MOVE_OUT','SPLIT','SPLIT_NEW','MERGE','MERGE_OUT')"); break;
				case "재고조정":
					w.append(" AND it.tran_type IN ('ADJUST','SCRAP','COUNT','HOLD','RELEASE_HOLD')"); break;
			}
		}

		if (ValueUtil.isNotEmpty(skuCd)) w.append(" AND (it.sku_cd ILIKE :skuCd OR it.sku_nm ILIKE :skuCd)");
		if (ValueUtil.isNotEmpty(locCd)) w.append(" AND (it.loc_cd ILIKE :locCd OR it.to_loc_cd ILIKE :locCd)");
		if (ValueUtil.isNotEmpty(deviceCd)) w.append(" AND it.device_cd = :deviceCd");
		if (ValueUtil.isNotEmpty(workerId)) w.append(" AND it.worker_id ILIKE :workerId");
		if (ValueUtil.isNotEmpty(refDocNo)) w.append(" AND it.ref_doc_no ILIKE :refDocNo");
		if (ValueUtil.isNotEmpty(lotNo)) w.append(" AND it.lot_no ILIKE :lotNo");

		return w;
	}

	/** 파라미터 Map 빌드 */
	private Map<String, Object> buildParams(Long domainId, String from, String to,
			String whCd, String comCd, String tranCategory,
			String skuCd, String locCd, String deviceCd, String workerId,
			String refDocNo, String lotNo) {

		Map<String, Object> p = ValueUtil.newMap("domainId,fromDate,toDate", domainId, from, to);
		if (ValueUtil.isNotEmpty(whCd)) p.put("whCd", whCd);
		if (ValueUtil.isNotEmpty(comCd)) p.put("comCd", comCd);
		if (ValueUtil.isNotEmpty(skuCd)) p.put("skuCd", "%" + skuCd + "%");
		if (ValueUtil.isNotEmpty(locCd)) p.put("locCd", "%" + locCd + "%");
		if (ValueUtil.isNotEmpty(deviceCd)) p.put("deviceCd", deviceCd);
		if (ValueUtil.isNotEmpty(workerId)) p.put("workerId", "%" + workerId + "%");
		if (ValueUtil.isNotEmpty(refDocNo)) p.put("refDocNo", "%" + refDocNo + "%");
		if (ValueUtil.isNotEmpty(lotNo)) p.put("lotNo", "%" + lotNo + "%");
		return p;
	}
}
