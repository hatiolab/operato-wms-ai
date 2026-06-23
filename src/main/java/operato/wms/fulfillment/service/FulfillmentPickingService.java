package operato.wms.fulfillment.service;

import java.util.List;
import java.util.Map;

import xyz.elidom.dbist.dml.Page;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import operato.wms.base.entity.StoragePolicy;
import operato.wms.base.service.RuntimeConfigService;
import operato.wms.base.service.WmsBaseService;
import operato.wms.fulfillment.entity.PickingTask;
import operato.wms.fulfillment.entity.PickingTaskItem;
import operato.wms.oms.entity.ReplenishOrder;
import operato.wms.oms.entity.ReplenishOrderItem;
import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.oms.entity.StockAllocation;
import operato.wms.stock.entity.Inventory;
import operato.wms.stock.service.StockTransactionService;
import xyz.anythings.sys.event.EventPublisher;
import xyz.anythings.sys.event.model.PrintEvent;
import xyz.anythings.sys.model.BaseResponse;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.entity.User;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 풀필먼트 피킹 서비스
 *
 * 피킹 지시의 상태 전이 및 피킹 작업 관련 조회를 담당한다.
 *
 * @author HatioLab
 */
@Component
public class FulfillmentPickingService extends AbstractQueryService {
	/**
	 * 화주사 - 창고별 설정 조회 서비스
	 */
	@Autowired
	protected RuntimeConfigService runtimeConfSvc;
	/**
	 * WMS 기본 서비스
	 */
	@Autowired
	protected WmsBaseService wmsBaseSvc;
	/**
	 * 이벤트 퍼블리셔
	 */
	@Autowired
	protected EventPublisher eventPublisher;
	/**
	 * 재고 트랜잭션 서비스
	 */
	@Autowired
	private StockTransactionService stockTransactionService;

	/**
	 * 피킹지시서 템플릿 이름 조회
	 * 
	 * @param comCd
	 * @param whCd
	 * @param exceptionWhenEmpty
	 * @return
	 */
	public String getPickingSheetTemplateName(String comCd, String whCd, boolean exceptionWhenEmpty) {
		StoragePolicy policy = this.wmsBaseSvc.findStoragePolicy(Domain.currentDomainId(), comCd, whCd);

		if (exceptionWhenEmpty && (policy == null || ValueUtil.isEmpty(policy.getPickingSheetTmpl()))) {
			throw new ElidomRuntimeException("피킹지시서 템플릿이 화주사-창고별 보관정책 설정에 설정되지 않았습니다.");
		}

		return policy.getPickingSheetTmpl();
	}

	/**
	 * 피킹지시로 피킹지시서 출력
	 * 
	 * @param pickingTask
	 * @param templateName
	 * @param printerId
	 * @return
	 */
	public BaseResponse printPickingSheet(PickingTask pickingTask, String templateName, String printerId) {
		if (ValueUtil.isEmpty(templateName)) {
			templateName = this.getPickingSheetTemplateName(pickingTask.getComCd(), pickingTask.getWhCd(), true);
		}

		if (ValueUtil.isEmpty(printerId)) {
			printerId = this.wmsBaseSvc.getDefaultNormalPrinter(pickingTask.getDomainId());
		}

		Map<String, Object> templateParams = ValueUtil.newMap("pickingTask", pickingTask);
		PrintEvent event = new PrintEvent(pickingTask.getDomainId(), "WMS", printerId, templateName, templateParams);
		event.setPrintType("normal");
		this.eventPublisher.publishEvent(event);
		return new BaseResponse(true, "ok");
	}

	/**
	 * 피킹 지시 시작 (CREATED -> IN_PROGRESS)
	 *
	 * @param id 피킹 지시 ID
	 * @return { success, pick_task_no, status }
	 */
	public Map<String, Object> startPickingTask(String id) {
		// 1. 피킹 정보 조회
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();
		PickingTask task = this.findPickingTask(domainId, id);

		// 2. 피킹 지시가 이미 작업 중이면 스킵
		if (PickingTask.STATUS_IN_PROGRESS.equals(task.getStatus())) {
			return ValueUtil.newMap("success,pick_task_no,status", true, task.getPickTaskNo(),
					PickingTask.STATUS_IN_PROGRESS);
		}

		// 3. 피킹 지시가 CREATED 상태가 아니면 에러
		if (!PickingTask.STATUS_CREATED.equals(task.getStatus())) {
			throw new ElidomValidationException("피킹 지시 상태가 [" + task.getStatus() + "]이므로 시작할 수 없습니다 (CREATED 상태만 가능)");
		}

		// 4. 피킹 지시 상태 변경
		task.setStatus(PickingTask.STATUS_IN_PROGRESS);
		task.setStartedAt(now);
		this.queryManager.update(task, "status", "startedAt", "updatedAt", "updaterId");

		// 5. 피킹 상세 아이템 상태를 RUN으로 변경
		String itemSql = "UPDATE picking_task_items SET status = :status, updated_at = now() WHERE domain_id = :domainId AND pick_task_id = :pickTaskId AND status = :currentStatus";
		Map<String, Object> itemParams = ValueUtil.newMap("status,domainId,pickTaskId,currentStatus",
				PickingTaskItem.STATUS_RUN, domainId, id, PickingTaskItem.STATUS_WAIT);
		this.queryManager.executeBySql(itemSql, itemParams);

		// 6. 결과 리턴
		return ValueUtil.newMap("success,pick_task_no,status", true, task.getPickTaskNo(),
				PickingTask.STATUS_IN_PROGRESS);
	}

	/**
	 * 피킹 지시 완료 (IN_PROGRESS -> COMPLETED)
	 *
	 * 상세 항목의 실적 수량을 합산하여 헤더의 결과 수량을 갱신한다.
	 *
	 * @param id 피킹 지시 ID
	 * @return { success, pick_task_no, status, result_total, short_total }
	 */
	public Map<String, Object> completePickingTask(String id) {
		// 1. 피킹 정보 조회
		Long domainId = Domain.currentDomainId();
		PickingTask task = this.findPickingTask(domainId, id);

		// 2. 피킹 상태 체크
		if (!PickingTask.STATUS_IN_PROGRESS.equals(task.getStatus())) {
			throw new ElidomValidationException(
					"피킹 지시 상태가 [" + task.getStatus() + "]이므로 완료할 수 없습니다 (IN_PROGRESS 상태만 가능)");
		}

		// 3. 실적 수량 합산을 위한 조회
		String sumSql = "SELECT COALESCE(SUM(pick_qty), 0) AS result_total,"
				+ " COALESCE(SUM(short_qty), 0) AS short_total,"
				+ " COUNT(DISTINCT sku_cd) AS result_item,"
				+ " COUNT(DISTINCT shipment_order_id) AS result_order"
				+ " FROM picking_task_items WHERE domain_id = :domainId AND pick_task_id = :pickTaskId AND status IN (:s1, :s2)";
		Map<String, Object> sumParams = ValueUtil.newMap("domainId,pickTaskId,s1,s2",
				domainId, id, PickingTaskItem.STATUS_PICKED, PickingTaskItem.STATUS_SHORT);
		List<Map> sumList = this.queryManager.selectListBySql(sumSql, sumParams, Map.class, 0, 1);

		// 4. 합산값 초기화
		double resultTotal = 0;
		double shortTotal = 0;
		int resultItem = 0;
		int resultOrder = 0;

		// 5. 합산값 할당
		if (!sumList.isEmpty()) {
			Map sumRow = sumList.get(0);
			resultTotal = ValueUtil.toDouble(sumRow.get("result_total"), 0.0);
			shortTotal = ValueUtil.toDouble(sumRow.get("short_total"), 0.0);
			resultItem = ValueUtil.toInteger(sumRow.get("result_item"), 0);
			resultOrder = ValueUtil.toInteger(sumRow.get("result_order"), 0);
		}

		// 6. 총량 피킹인 경우 result_order는 plan_order 사용
		if ("TOTAL".equals(task.getPickType())) {
			resultOrder = task.getPlanOrder() != null ? task.getPlanOrder() : 0;
		}

		// 7. 로그인 사용자를 작업자로 기록
		String workerId = User.currentUser() != null ? User.currentUser().getId() : null;

		// 8. 피킹 지시 헤더 업데이트
		task.setStatus(PickingTask.STATUS_COMPLETED);
		task.setCompletedAt(DateUtil.currentTimeStr());
		task.setWorkerId(workerId);
		task.setResultOrder(resultOrder);
		task.setResultItem(resultItem);
		task.setResultTotal(resultTotal);
		task.setShortTotal(shortTotal);
		this.queryManager.update(task);

		// 9. 피킹 완료 후 출하 주문 상태 복귀 처리
		this.updateShipmentOrdersAfterPicking(domainId, id);

		// 10. 결과 리턴
		return ValueUtil.newMap("success,pick_task_no,status,result_total,short_total", true, task.getPickTaskNo(),
				PickingTask.STATUS_COMPLETED, resultTotal, shortTotal);
	}

	/**
	 * TODO 로직 체크 필요
	 * 피킹 완료 후 출하 주문 상태 복귀 처리
	 *
	 * 피킹 지시 내 출하 주문을 순회하며:
	 * - 다른 피킹 지시에 아직 WAIT/RUN 항목이 있으면 건너뜀
	 * - pick_qty > 0 → PACKING (부분 SHORT 포함, 포장 진행 가능한 수량 존재)
	 * - pick_qty = 0, short_qty > 0 → BACK_ORDER (전량 실재고 없음)
	 * SHORT 수량이 있으면 ShipmentOrderItem.short_qty도 함께 갱신한다.
	 *
	 * @param domainId   도메인 ID
	 * @param pickTaskId 완료된 피킹 지시 ID
	 */
	@SuppressWarnings("rawtypes")
	private void updateShipmentOrdersAfterPicking(Long domainId, String pickTaskId) {
		// 이 피킹 지시에 포함된 출하 주문 ID 목록
		String orderIdSql = "SELECT DISTINCT shipment_order_id FROM picking_task_items"
				+ " WHERE domain_id = :domainId AND pick_task_id = :pickTaskId AND shipment_order_id IS NOT NULL";
		List<Map> orderIdRows = this.queryManager.selectListBySql(orderIdSql,
				ValueUtil.newMap("domainId,pickTaskId", domainId, pickTaskId), Map.class, 0, 0);

		for (Map row : orderIdRows) {
			String orderId = row.get("shipment_order_id") != null ? row.get("shipment_order_id").toString() : null;
			if (orderId == null)
				continue;

			// 이 주문에 대해 다른 피킹 지시에서 아직 미완료 항목이 있으면 건너뜀
			String pendingSql = "SELECT COUNT(*) AS cnt FROM picking_task_items"
					+ " WHERE domain_id = :domainId AND shipment_order_id = :orderId AND status IN (:s1, :s2)";
			List<Map> pendingRows = this.queryManager.selectListBySql(pendingSql,
					ValueUtil.newMap("domainId,orderId,s1,s2", domainId, orderId,
							PickingTaskItem.STATUS_WAIT, PickingTaskItem.STATUS_RUN),
					Map.class, 0, 1);
			int pendingCnt = (!pendingRows.isEmpty() && pendingRows.get(0).get("cnt") != null)
					? Integer.parseInt(pendingRows.get(0).get("cnt").toString())
					: 0;

			if (pendingCnt > 0)
				continue;

			// 이 주문의 전체 피킹 결과 집계
			String sumSql = "SELECT COALESCE(SUM(pick_qty), 0) AS total_pick, COALESCE(SUM(short_qty), 0) AS total_short"
					+ " FROM picking_task_items WHERE domain_id = :domainId AND shipment_order_id = :orderId"
					+ " AND status IN (:s1, :s2)";
			List<Map> sumRows = this.queryManager.selectListBySql(sumSql,
					ValueUtil.newMap("domainId,orderId,s1,s2", domainId, orderId,
							PickingTaskItem.STATUS_PICKED, PickingTaskItem.STATUS_SHORT),
					Map.class, 0, 1);

			double totalPick = 0;
			double totalShort = 0;
			if (!sumRows.isEmpty()) {
				Map s = sumRows.get(0);
				totalPick = s.get("total_pick") != null ? Double.parseDouble(s.get("total_pick").toString()) : 0;
				totalShort = s.get("total_short") != null ? Double.parseDouble(s.get("total_short").toString()) : 0;
			}

			// SHORT 수량이 있으면 ShipmentOrderItem.short_qty 갱신
			if (totalShort > 0) {
				String itemUpdSql = "UPDATE shipment_order_items"
						+ " SET short_qty = sub.item_short, updated_at = now()"
						+ " FROM (SELECT shipment_order_item_id, SUM(short_qty) AS item_short"
						+ "       FROM picking_task_items"
						+ "       WHERE domain_id = :domainId AND shipment_order_id = :orderId"
						+ "         AND status = :status AND shipment_order_item_id IS NOT NULL"
						+ "       GROUP BY shipment_order_item_id) sub"
						+ " WHERE shipment_order_items.domain_id = :domainId AND shipment_order_items.id = sub.shipment_order_item_id";
				this.queryManager.executeBySql(itemUpdSql,
						ValueUtil.newMap("domainId,orderId,status", domainId, orderId, PickingTaskItem.STATUS_SHORT));
			}

			// 출하 주문 상태 전환 (PICKING 상태인 주문만 처리)
			String newStatus = totalPick > 0 ? ShipmentOrder.STATUS_PACKING : ShipmentOrder.STATUS_BACK_ORDER;
			this.queryManager.executeBySql(
					"UPDATE shipment_orders SET status = :newStatus, updated_at = now()"
							+ " WHERE domain_id = :domainId AND id = :orderId AND status = :curStatus",
					ValueUtil.newMap("newStatus,domainId,orderId,curStatus",
							newStatus, domainId, orderId, ShipmentOrder.STATUS_PICKING));
		}
	}

	/**
	 * 피킹 지시 리셋 (CREATED/IN_PROGRESS → CREATED)
	 *
	 * 작업자 교대·작업 불가 등의 사유로 피킹을 처음부터 다시 시작할 수 있도록 리셋한다.
	 * COMPLETED 상태인 피킹 지시는 리셋할 수 없다.
	 * 재고 할당(stock_allocations/reserved_qty)은 유지하므로 재할당 없이 즉시 재작업 가능하다.
	 *
	 * @param id 피킹 지시 ID
	 * @return { success, pick_task_no }
	 */
	public Map<String, Object> cancelPickingTask(String id) {
		// 1. 피킹 정보 조회
		Long domainId = Domain.currentDomainId();
		PickingTask task = this.findPickingTask(domainId, id);

		// 2. 피킹 상태 체크
		String status = task.getStatus();

		// 3. 생성 상태이면 그냥 스킵
		if (PickingTask.STATUS_CREATED.equals(status)) {
			return ValueUtil.newMap("success,pick_task_no,msg", false, task.getPickTaskNo(),
					"피킹 지시가 생성 상태라 취소할 수 없습니다.");
		}

		// 4. 완료 상태면 에러
		if (PickingTask.STATUS_COMPLETED.equals(status)) {
			throw new ElidomValidationException("피킹이 이미 완료되었으므로 취소할 수 없습니다");
		}

		// 5. 진행 상태가 아니면 에러
		if (!PickingTask.STATUS_IN_PROGRESS.equals(status)) {
			throw new ElidomValidationException("진행 중인 피킹 지시만 시작 취소할 수 있습니다.");
		}

		// 6. 상세 아이템 전체 리셋 (WAIT 복귀, 실적 수량 초기화)
		StringBuffer itemSql = new StringBuffer("UPDATE picking_task_items");
		itemSql.append(" SET status = :status, pick_qty = 0, short_qty = 0, picked_at = null, updated_at = now()");
		itemSql.append(" WHERE domain_id = :domainId AND pick_task_id = :pickTaskId");
		this.queryManager.executeBySql(itemSql.toString(),
				ValueUtil.newMap("status,domainId,pickTaskId", PickingTaskItem.STATUS_WAIT, domainId, id));

		// 7. 피킹 지시 헤더 리셋 (CREATED 복귀, 작업자·시작일시·실적 초기화)
		task.setStatus(PickingTask.STATUS_CREATED);
		task.setWorkerId(null);
		task.setStartedAt(null);
		task.setResultOrder(0);
		task.setResultItem(0);
		task.setResultTotal(0.0);
		task.setShortTotal(0.0);
		this.queryManager.update(task, "status", "workerId", "startedAt", "resultOrder", "resultItem", "resultTotal",
				"shortTotal", "updatedAt", "updaterId");

		// 8. 결과 리턴
		return ValueUtil.newMap("success,pick_task_no", true, task.getPickTaskNo());
	}

	/**
	 * 피킹 지시 목록 조회 (대기 + 작업중)
	 *
	 * - 대기(CREATED): order_date = 오늘인 것만
	 * - 작업중(IN_PROGRESS): 날짜 무관하게 전체
	 *
	 * @return 피킹 지시 목록
	 */
	public List<Map> searchTodoPickingTasks() {
		StringBuffer sql = new StringBuffer();
		sql.append("SELECT");
		sql.append("	pt.id, pt.pick_task_no, pt.wave_no, pt.shipment_no, pt.order_date,");
		sql.append(" 	pt.pick_type, pt.pick_method, pt.zone_cd, pt.priority_cd, pt.worker_id,");
		sql.append(" 	pt.plan_order, pt.plan_item, pt.plan_total,");
		sql.append(" 	pt.result_order, pt.result_item, pt.result_total, pt.short_total,");
		sql.append(" 	pt.status, pt.created_at, pt.started_at, pt.completed_at,");
		sql.append(" 	(SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id");
		sql.append("	AND pti.pick_task_id = pt.id) AS total_items,");
		sql.append(" 	(SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id");
		sql.append(" 	AND pti.pick_task_id = pt.id AND pti.status = 'PICKED') AS picked_items");
		sql.append(" FROM picking_tasks pt");
		sql.append(" WHERE pt.domain_id = :domainId AND pt.status IN ('CREATED', 'IN_PROGRESS')");
		sql.append(" ORDER BY");
		sql.append("  		CASE pt.priority_cd WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL'");
		sql.append(" 		THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END, pt.created_at");
		Map<String, Object> params = ValueUtil.newMap("domainId", Domain.currentDomainId());
		return this.queryManager.selectListBySql(sql.toString(), params, Map.class, 0, 0);
	}

	/**
	 * 피킹 지시 건수 요약 조회
	 *
	 * 지정 일자의 전체/대기/완료 건수를 반환한다.
	 *
	 * @param orderDate 피킹 일자 (YYYY-MM-DD)
	 * @return { total, waiting, completed }
	 */
	@SuppressWarnings("rawtypes")
	public Map<String, Object> countPickingTasks(String orderDate) {
		StringBuilder sql = new StringBuilder();
		sql.append("SELECT");
		sql.append(" COUNT(*) AS total,");
		sql.append(" COUNT(*) FILTER (WHERE pt.status = 'CREATED') AS created,");
		sql.append(" COUNT(*) FILTER (WHERE pt.status = 'IN_PROGRESS') AS in_progress,");
		sql.append(" COUNT(*) FILTER (WHERE pt.status = 'COMPLETED') AS completed");
		sql.append(" FROM picking_tasks pt");
		sql.append(" WHERE pt.domain_id = :domainId");
		sql.append(" AND pt.status <> 'CANCELLED'");

		Map<String, Object> params = ValueUtil.newMap("domainId", Domain.currentDomainId());
		if (ValueUtil.isNotEmpty(orderDate)) {
			sql.append(" AND pt.order_date = :orderDate");
			params.put("orderDate", orderDate);
		}

		List<Map> rows = this.queryManager.selectListBySql(sql.toString(), params, Map.class, 0, 1);
		if (rows.isEmpty()) {
			return ValueUtil.newMap("total,created,in_progress,completed", 0L, 0L, 0L, 0L);
		}

		Map row = rows.get(0);
		long total = row.get("total") != null ? Long.parseLong(row.get("total").toString()) : 0L;
		long created = row.get("created") != null ? Long.parseLong(row.get("created").toString()) : 0L;
		long inProgress = row.get("in_progress") != null ? Long.parseLong(row.get("in_progress").toString()) : 0L;
		long completed = row.get("completed") != null ? Long.parseLong(row.get("completed").toString()) : 0L;
		return ValueUtil.newMap("total,created,in_progress,completed", total, created, inProgress, completed);
	}

	/**
	 * 피킹 지시 목록 페이지네이션 조회
	 *
	 * 지정 일자의 CREATED + IN_PROGRESS + COMPLETED 피킹 지시 목록을 페이지네이션으로 반환한다.
	 *
	 * @param orderDate 피킹 일자 (YYYY-MM-DD)
	 * @param page      페이지 번호 (1부터)
	 * @param size      페이지 크기
	 * @return { total: 전체 건수, items: 목록 }
	 */
	@SuppressWarnings("rawtypes")
	public Map<String, Object> pagePickingTasks(String orderDate, String status, String keyword, int page, int size) {
		StringBuilder sql = new StringBuilder();
		sql.append("SELECT ");
		sql.append("	pt.id, pt.pick_task_no, pt.wave_no, pt.shipment_no, pt.order_date,");
		sql.append(" 	pt.pick_type, pt.pick_method, pt.zone_cd, pt.priority_cd, pt.worker_id,");
		sql.append(" 	pt.plan_order, pt.plan_item, pt.plan_total,");
		sql.append(" 	pt.result_order, pt.result_item, pt.result_total, pt.short_total,");
		sql.append(" 	pt.status, pt.created_at, pt.started_at, pt.completed_at,");
		sql.append(" 	(SELECT COUNT(*) FROM picking_task_items pti");
		sql.append(" 	WHERE pti.domain_id = pt.domain_id AND pti.pick_task_id = pt.id) AS total_items,");
		sql.append(" 	(SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id AND");
		sql.append(" 	pti.pick_task_id = pt.id AND pti.status = 'PICKED') AS picked_items");
		sql.append(" FROM picking_tasks pt");
		sql.append(" WHERE pt.domain_id = :domainId");

		Map<String, Object> params = ValueUtil.newMap("domainId", Domain.currentDomainId());
		if (ValueUtil.isNotEmpty(status)) {
			if ("DONE".equals(status)) {
				sql.append(" AND pt.status NOT IN ('CREATED', 'IN_PROGRESS', 'CANCELLED')");
			} else {
				sql.append(" AND pt.status = :status");
				params.put("status", status);
			}
		} else {
			sql.append(" AND pt.status <> :cancelledStatus");
			params.put("cancelledStatus", PickingTask.STATUS_CANCELLED);
		}

		if (ValueUtil.isNotEmpty(orderDate)) {
			sql.append(" AND pt.order_date = :orderDate");
			params.put("orderDate", orderDate);
		}

		if (ValueUtil.isNotEmpty(keyword)) {
			sql.append(" AND (pt.pick_task_no ILIKE :kw OR pt.shipment_no ILIKE :kw OR pt.wave_no ILIKE :kw)");
			params.put("kw", "%" + keyword + "%");
		}

		sql.append(" ORDER BY ");
		sql.append(" 	CASE pt.status WHEN 'IN_PROGRESS' THEN 0 WHEN 'CREATED' THEN 1 ELSE 2 END,");
		sql.append(" 	CASE pt.priority_cd WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' ");
		sql.append("  	THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END,");
		sql.append(" pt.created_at");

		page = page < 1 ? 1 : page;
		Page<Map> result = this.queryManager.selectPageBySql(sql.toString(), params, Map.class, page, size);
		return ValueUtil.newMap("total,items", result.getTotalSize(), result.getList());
	}

	/**
	 * 바코드로 피킹 지시 단건 조회
	 *
	 * 피킹지시번호·주문번호·웨이브번호 중 하나와 일치하는 CANCELLED 제외 피킹 지시를 반환한다.
	 *
	 * @param barcode   스캔 바코드 (pick_task_no / shipment_no / wave_no)
	 * @param orderDate 피킹 일자 (선택, YYYY-MM-DD)
	 * @return 피킹 지시 Map (없으면 null)
	 */
	@SuppressWarnings("rawtypes")
	public Map findPickingTaskByBarcode(String barcode, String orderDate) {
		StringBuilder sql = new StringBuilder();
		sql.append("SELECT ");
		sql.append("	pt.id, pt.pick_task_no, pt.wave_no, pt.shipment_no, pt.order_date,");
		sql.append("	pt.pick_type, pt.pick_method, pt.zone_cd, pt.priority_cd, pt.worker_id,");
		sql.append("	pt.plan_order, pt.plan_item, pt.plan_total,");
		sql.append("	pt.result_order, pt.result_item, pt.result_total, pt.short_total,");
		sql.append("	pt.status, pt.created_at, pt.started_at, pt.completed_at,");
		sql.append("	(SELECT COUNT(*) FROM picking_task_items pti");
		sql.append("	WHERE pti.domain_id = pt.domain_id AND pti.pick_task_id = pt.id) AS total_items,");
		sql.append("	(SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id");
		sql.append("	AND pti.pick_task_id = pt.id AND pti.status = 'PICKED') AS picked_items");
		sql.append(" FROM picking_tasks pt");
		sql.append(" WHERE pt.domain_id = :domainId");
		sql.append(" AND pt.status <> 'CANCELLED'");
		sql.append(" AND (pt.pick_task_no = :barcode OR pt.shipment_no = :barcode OR pt.wave_no = :barcode)");
		Map<String, Object> params = ValueUtil.newMap("domainId,barcode", Domain.currentDomainId(), barcode);

		if (ValueUtil.isNotEmpty(orderDate)) {
			sql.append(" AND pt.order_date = :orderDate");
			params.put("orderDate", orderDate);
		}

		sql.append(" ORDER BY CASE pt.status WHEN 'IN_PROGRESS' THEN 0 WHEN 'CREATED' THEN 1 ELSE 2 END LIMIT 1");
		return this.queryManager.selectBySql(sql.toString(), params, Map.class);
	}

	/**
	 * 피킹 지시 완료 목록 조회
	 *
	 * completed_at = 오늘인 COMPLETED 상태 피킹 지시 목록을 반환한다.
	 *
	 * @return 피킹 지시 목록
	 */
	public List<Map> searchDonePickingTasks() {
		StringBuffer sql = new StringBuffer();
		sql.append("SELECT");
		sql.append("	pt.id, pt.pick_task_no, pt.wave_no, pt.shipment_no, pt.order_date,");
		sql.append(" 	pt.pick_type, pt.pick_method, pt.zone_cd, pt.priority_cd, pt.worker_id,");
		sql.append(" 	pt.plan_order, pt.plan_item, pt.plan_total,");
		sql.append(" 	pt.result_order, pt.result_item, pt.result_total, pt.short_total,");
		sql.append(" 	pt.status, pt.created_at, pt.started_at, pt.completed_at,");
		sql.append(" 	(SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id");
		sql.append(" 	AND pti.pick_task_id = pt.id) AS total_items,");
		sql.append(" 	(SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id");
		sql.append(" 	AND pti.pick_task_id = pt.id AND pti.status = 'PICKED') AS picked_items");
		sql.append(" FROM picking_tasks pt");
		sql.append(" WHERE pt.domain_id = :domainId AND pt.status = :status");
		sql.append(" ORDER BY");
		sql.append(" 	CASE pt.priority_cd WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3");
		sql.append(" 	WHEN 'LOW' THEN 4 ELSE 5 END, pt.created_at");
		Map<String, Object> params = ValueUtil.newMap("domainId,status",
				Domain.currentDomainId(), PickingTask.STATUS_COMPLETED);
		return this.queryManager.selectListBySql(sql.toString(), params, Map.class, 0, 0);
	}

	/**
	 * 피킹 지시 상세 조회
	 *
	 * @param id 피킹 지시 ID
	 * @return 피킹 지시 상세 정보
	 */
	@SuppressWarnings({ "rawtypes", "unchecked" })
	public Map<String, Object> getPickingTask(String id) {
		StringBuffer sql = new StringBuffer();
		sql.append("SELECT");
		sql.append("	pt.id, pt.pick_task_no, pt.wave_no, pt.shipment_no, pt.order_date,");
		sql.append(" 	pt.pick_type, pt.pick_method, pt.zone_cd, pt.priority_cd, pt.worker_id,");
		sql.append(" 	pt.plan_order, pt.plan_item, pt.plan_total,");
		sql.append(" 	pt.result_order, pt.result_item, pt.result_total, pt.short_total,");
		sql.append(" 	pt.status, pt.created_at, pt.started_at, pt.completed_at,");
		sql.append(" 	(SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id");
		sql.append("	AND pti.pick_task_id = pt.id) AS total_items,");
		sql.append(" 	(SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id");
		sql.append(" 	AND pti.pick_task_id = pt.id AND pti.status = 'PICKED') AS picked_items");
		sql.append(" FROM picking_tasks pt");
		sql.append(" WHERE pt.domain_id = :domainId AND pt.id = :id");
		Map<String, Object> params = ValueUtil.newMap("domainId,id", Domain.currentDomainId(), id);
		Map pickingTask = this.queryManager.selectByCondition(Map.class, params);

		if (pickingTask == null || pickingTask.isEmpty()) {
			throw new ElidomValidationException("피킹 지시를 찾을 수 없습니다: " + id);
		}

		return pickingTask;
	}

	/**
	 * 피킹 지시 상세 아이템 조회
	 *
	 * @param id 피킹 지시 ID
	 * @return 피킹 상세 아이템 목록
	 */
	public List<Map> getPickingTaskItems(String id) {
		// 피킹 지시 존재 확인
		Long domainId = Domain.currentDomainId();
		this.findPickingTask(domainId, id);

		// 피킹 지시 아이템 조회
		String sql = "SELECT id, pick_task_id, shipment_order_id, shipment_order_item_id, stock_allocation_id,"
				+ " inventory_id, rank, sku_cd, sku_nm, barcode, from_loc_cd, to_loc_cd,"
				+ " lot_no, serial_no, expired_date, order_qty, pick_qty, short_qty, status, picked_at"
				+ " FROM picking_task_items"
				+ " WHERE domain_id = :domainId AND pick_task_id = :pickTaskId"
				+ " ORDER BY rank";
		Map<String, Object> params = ValueUtil.newMap("domainId,pickTaskId", domainId, id);
		return this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
	}

	/**
	 * 작업자 할당 피킹 작업 조회
	 *
	 * 지정 작업자에게 할당된 피킹 지시 목록을 반환한다.
	 * CREATED, IN_PROGRESS 상태의 작업만 조회한다.
	 *
	 * @param workerCd 작업자 코드 (worker_id)
	 * @return 작업자 할당 피킹 지시 목록
	 */
	public List<Map> getWorkerTasks(String workerCd) {
		if (ValueUtil.isEmpty(workerCd)) {
			throw new ElidomValidationException("작업자 코드(worker_cd)는 필수 파라미터입니다");
		}

		String sql = "SELECT pt.id, pt.pick_task_no, pt.wave_no, pt.shipment_no, pt.order_date,"
				+ " pt.pick_type, pt.pick_method, pt.zone_cd, pt.priority_cd, pt.status, pt.started_at,"
				+ " pt.worker_id, pt.plan_order, pt.plan_item, pt.plan_total,"
				+ " pt.result_order, pt.result_item, pt.result_total, pt.short_total,"
				+ " (SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id AND pti.pick_task_id = pt.id) AS total_items,"
				+ " (SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id AND pti.pick_task_id = pt.id AND pti.status = 'PICKED') AS picked_items"
				+ " FROM picking_tasks pt"
				+ " WHERE pt.domain_id = :domainId AND pt.worker_id = :workerId AND pt.status IN (:s1, :s2)"
				+ " ORDER BY CASE pt.priority_cd WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END, pt.created_at";
		Map<String, Object> params = ValueUtil.newMap("domainId,workerId,s1,s2",
				Domain.currentDomainId(), workerCd, PickingTask.STATUS_CREATED, PickingTask.STATUS_IN_PROGRESS);
		return this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
	}

	/**
	 * 개별 아이템 피킹 확인 (스캔) 처리
	 *
	 * 피킹 항목의 pick_qty를 갱신하고 상태를 PICKED로 변경한다.
	 *
	 * @param itemId 피킹 항목 ID
	 * @param params { pick_qty, loc_cd }
	 * @return { success, item_id, sku_cd, pick_qty, status }
	 */
	public Map<String, Object> pickItem(String itemId, Map<String, Object> params) {
		// 1. 피킹 아이템 조회
		Long domainId = Domain.currentDomainId();
		PickingTaskItem item = this.findPickingTaskItem(domainId, itemId);

		// 2. 피킹 아이템 상태 체크
		if (!PickingTaskItem.STATUS_RUN.equals(item.getStatus())
				&& !PickingTaskItem.STATUS_WAIT.equals(item.getStatus())) {
			throw new ElidomValidationException("피킹 항목 상태가 [" + item.getStatus() + "]이므로 피킹할 수 없습니다 (WAIT/RUN 상태만 가능)");
		}

		// 3. 피킹 수량 및 로케이션 정보 체크
		double pickQty = params.get("pick_qty") != null ? Double.parseDouble(params.get("pick_qty").toString())
				: item.getOrderQty();
		String locCd = params.get("loc_cd") != null ? params.get("loc_cd").toString() : null;

		// 4. 피킹 수량 체크
		if (pickQty > item.getOrderQty()) {
			throw new ElidomValidationException(
					"입력한 피킹 수량[" + pickQty + "]이 주문 수량[" + item.getOrderQty() + "]보다 많습니다.");
		}

		// 5. 피킹 처리
		item.setPickQty(pickQty);
		item.setStatus(PickingTaskItem.STATUS_PICKED);
		item.setPickedAt(DateUtil.currentTimeStr());
		if (ValueUtil.isNotEmpty(locCd)) {
			item.setFromLocCd(locCd);
		}
		this.queryManager.update(item, "pickQty", "status", "pickedAt", "fromLocCd", "updatedAt", "updaterId");

		// 6. 결과 리턴
		return ValueUtil.newMap("success,item_id,sku_cd,pick_qty,status", true, itemId, item.getSkuCd(), pickQty,
				PickingTaskItem.STATUS_PICKED);
	}

	/**
	 * 피킹 부족 처리
	 *
	 * 피킹 항목의 short_qty를 갱신하고 상태를 SHORT로 변경한다.
	 *
	 * @param itemId 피킹 항목 ID
	 * @param params { short_qty, pick_qty, reason, auto_replenish }
	 * @return { success, item_id, sku_cd, pick_qty, short_qty, status }
	 */
	public Map<String, Object> shortItem(String itemId, Map<String, Object> params) {
		// 1. 피킹 아이템 조회
		Long domainId = Domain.currentDomainId();
		PickingTaskItem item = this.findPickingTaskItem(domainId, itemId);

		// 2. 피킹 아이템 상태 체크
		if (!PickingTaskItem.STATUS_RUN.equals(item.getStatus())
				&& !PickingTaskItem.STATUS_WAIT.equals(item.getStatus())) {
			throw new ElidomValidationException(
					"피킹 항목 상태가 [" + item.getStatus() + "]이므로 부족 처리할 수 없습니다 (WAIT/RUN 상태만 가능)");
		}

		// 3. 부족 수량, 피킹 수량 업데이트
		double shortQty = params.get("short_qty") != null ? Double.parseDouble(params.get("short_qty").toString())
				: item.getOrderQty();
		double pickQty = params.get("pick_qty") != null ? Double.parseDouble(params.get("pick_qty").toString()) : 0;

		// 부분 부족(pick_qty > 0)은 PICKED 유지 → 포장 지시 생성 대상 포함
		// 전량 부족(pick_qty = 0)은 SHORT → 포장 지시 생성 제외
		String newStatus = pickQty > 0 ? PickingTaskItem.STATUS_PICKED : PickingTaskItem.STATUS_SHORT;

		item.setPickQty(pickQty);
		item.setShortQty(shortQty);
		item.setStatus(newStatus);
		item.setPickedAt(DateUtil.currentTimeStr());
		this.queryManager.update(item, "pickQty", "shortQty", "status", "pickedAt", "updatedAt", "updaterId");

		// 4. 결과 생성
		Map<String, Object> result = ValueUtil.newMap("success,item_id,sku_cd,pick_qty,short_qty,status", true, itemId,
				item.getSkuCd(), pickQty, shortQty, newStatus);

		// 5. SHORT 수량만큼 stock_allocations 해제 (reserved_qty 환원)
		// 실 재고 없음이 확인된 수량은 즉시 예약을 풀어 다른 주문에 가용 재고로 반환한다
		if (shortQty > 0 && item.getShipmentOrderItemId() != null) {
			this.deallocateShortQty(domainId, item.getShipmentOrderItemId(), shortQty);
		}

		// 6. auto_replenish=true이면
		boolean autoReplenish = params.get("auto_replenish") != null
				&& Boolean.parseBoolean(params.get("auto_replenish").toString());

		// 7. 보충 지시 자동 생성
		if (autoReplenish && shortQty > 0) {
			Map<String, Object> replenishResult = this.createReplenishFromShortItem(itemId);
			result.put("replenish_created", replenishResult.get("replenish_created"));

			if (Boolean.TRUE.equals(replenishResult.get("replenish_created"))) {
				result.put("replenish_no", replenishResult.get("replenish_no"));
				result.put("replenish_from_loc_cd", replenishResult.get("from_loc_cd"));
			} else {
				result.put("replenish_reason", replenishResult.get("reason"));
			}
		}

		// 8. 결과 리턴
		return result;
	}

	/**
	 * SHORT 수량에 해당하는 재고 할당 해제
	 *
	 * short_qty만큼 stock_allocations를 순서대로 해제하여 inventories.reserved_qty를 환원한다.
	 * 할당 전체가 short_qty 이내이면 deallocateInventory()로 완전 삭제,
	 * 초과하면 alloc_qty를 줄이고 reserved_qty만 직접 감소시킨다.
	 *
	 * @param domainId            도메인 ID
	 * @param shipmentOrderItemId 출하 주문 상세 ID (PickingTaskItem.shipmentOrderItemId)
	 * @param shortQty            해제할 수량
	 */
	private void deallocateShortQty(Long domainId, String shipmentOrderItemId, double shortQty) {
		if (shortQty <= 0 || shipmentOrderItemId == null)
			return;

		// 1. 재고 할당 정보 조회
		String allocSql = "SELECT * FROM stock_allocations WHERE domain_id = :domainId AND shipment_order_item_id = :itemId AND status IN (:s1, :s2) ORDER BY alloc_qty DESC";
		Map<String, Object> allocParams = ValueUtil.newMap("domainId,itemId,s1,s2",
				domainId, shipmentOrderItemId, StockAllocation.STATUS_HARD, StockAllocation.STATUS_SOFT);
		List<StockAllocation> allocations = this.queryManager.selectListBySql(
				allocSql, allocParams, StockAllocation.class, 0, 0);
		double remainToRelease = shortQty;

		// 2. 조회한 할당 정보로 부터 재고 할당 해제 처리
		for (StockAllocation alloc : allocations) {
			// 2.1 할당 해제 처리해야 할 남은 수량이 없거나 해당 할당 건의 할당 수량이 0 이하라면 반복 중단
			if (remainToRelease <= 0 || alloc.getAllocQty() == null || alloc.getAllocQty() <= 0)
				break;

			// 2.2 할당 수량
			double allocQty = alloc.getAllocQty();

			if (allocQty <= remainToRelease) {
				// 2.3 할당 전체 해제 — deallocateInventory가 reserved_qty 환원 + stock_allocations 삭제 처리
				this.stockTransactionService.deallocateInventory(alloc);
				// 할당 해제 수량 만큼 잔여 수량 감소
				remainToRelease -= allocQty;
			} else {
				// 2.4 부분 할당 해제 - 남은 할당 해제 수량 만큼만 해제
				double releaseQty = remainToRelease;
				// 부분 할당 해제
				this.stockTransactionService.deallocatePartialInventory(alloc, releaseQty);
				// 할당 해제 수량 만큼 잔여 수량 감소
				remainToRelease = 0;
			}
		}
	}

	/**
	 * 피킹 부족 보충 지시 생성
	 *
	 * SHORT 처리된 피킹 항목의 부족 수량(short_qty)에 대해 STORAGE/BULK 존 재고에서
	 * PICKABLE 존으로 이동하는 보충 지시를 생성한다.
	 * 동일 창고 내 PICKABLE 외 존에서 같은 SKU 가용 재고를 탐색하여 보충 경로를 결정한다.
	 * 재고가 없으면 생성하지 않고 reason=NO_STOCK을 반환한다.
	 * 생성된 ReplenishOrderItem.attr01에 pick_task_item_id를 기록하여 연결을 유지한다.
	 *
	 * @param pickTaskItemId 피킹 항목 ID (SHORT 상태, short_qty > 0)
	 * @return { replenish_created, replenish_no, from_loc_cd, to_loc_cd, order_qty
	 *         }
	 *         또는 { replenish_created: false, reason }
	 */
	@SuppressWarnings("rawtypes")
	public Map<String, Object> createReplenishFromShortItem(String pickTaskItemId) {
		// 1. PickingTaskItem 조회
		Long domainId = Domain.currentDomainId();
		PickingTaskItem item = this.findPickingTaskItem(domainId, pickTaskItemId);

		// 2. 부족 수량이 0보다 큰 지 체크
		double shortQty = item.getShortQty() != null ? item.getShortQty() : 0;
		if (shortQty <= 0) {
			return ValueUtil.newMap("replenish_created,reason", false, "NO_SHORT_QTY");
		}

		// 3. PickingTask에서 comCd, whCd 조회
		PickingTask task = this.findPickingTask(domainId, item.getPickTaskId());
		String skuCd = item.getSkuCd();
		String whCd = task.getWhCd();
		String toLocCd = item.getFromLocCd(); // 원래 PICKABLE 피킹 위치

		// 4. PICKABLE 외 동일 창고 보관 존 로케이션에 있는 해당 SKU 가용 재고 탐색 (수량 많은 순)
		String stockSql = "SELECT i.loc_cd, i.sku_nm, (i.inv_qty - COALESCE(i.reserved_qty, 0)) AS avail_qty"
				+ " FROM inventories i"
				+ " INNER JOIN locations l ON l.domain_id = i.domain_id AND l.loc_cd = i.loc_cd AND l.wh_cd = :whCd"
				+ " WHERE i.domain_id = :domainId AND i.sku_cd = :skuCd"
				+ " AND l.loc_type = 'STORE' AND (l.del_flag IS NULL OR l.del_flag = false)"
				+ " AND (i.inv_qty - COALESCE(i.reserved_qty, 0)) > 0"
				+ " ORDER BY (i.inv_qty - COALESCE(i.reserved_qty, 0)) DESC";
		Map<String, Object> stockParams = ValueUtil.newMap("domainId,skuCd,whCd", domainId, skuCd, whCd);
		List<Map> stockList = this.queryManager.selectListBySql(stockSql, stockParams, Map.class, 0, 1);

		// 5. 가용 재고가 없으면 보충 지시 생성 불가
		if (stockList.isEmpty()) {
			return ValueUtil.newMap("replenish_created,reason", false, "NO_STOCK");
		}

		// 6. 보관 존의 가용 재고 정보 추출
		Map stockRow = stockList.get(0);
		String fromLocCd = stockRow.get("loc_cd").toString();
		String skuNm = stockRow.get("sku_nm") != null ? stockRow.get("sku_nm").toString() : null;

		// 7. ReplenishOrder 헤더 생성
		ReplenishOrder replenish = new ReplenishOrder();
		replenish.setDomainId(domainId);
		replenish.setOrderDate(DateUtil.todayStr());
		replenish.setComCd(task.getComCd());
		replenish.setWhCd(whCd);
		replenish.setPlanItem(1);
		replenish.setPlanTotal(shortQty);
		replenish.setStatus(ReplenishOrder.STATUS_CREATED);
		replenish.setRemarks("피킹 부족 자동 보충 [" + item.getPickTaskId() + "]");
		this.queryManager.insert(replenish);

		// 8. ReplenishOrderItem 상세 생성
		ReplenishOrderItem replenishItem = new ReplenishOrderItem();
		replenishItem.setDomainId(domainId);
		replenishItem.setReplenishOrderId(replenish.getId());
		replenishItem.setRank(1);
		replenishItem.setSkuCd(skuCd);
		replenishItem.setSkuNm(skuNm);
		replenishItem.setFromLocCd(fromLocCd);
		replenishItem.setToLocCd(toLocCd);
		replenishItem.setOrderQty(shortQty);
		replenishItem.setResultQty(0.0);
		replenishItem.setRemarks(pickTaskItemId); // 피킹 항목 연결 키
		this.queryManager.insert(replenishItem);

		// 9. 결과 리턴
		return ValueUtil.newMap("replenish_created,replenish_no,from_loc_cd,to_loc_cd,order_qty",
				true, replenish.getReplenishNo(), fromLocCd, toLocCd, shortQty);
	}

	/*
	 * ============================================================
	 * 내부 유틸리티
	 * ============================================================
	 */

	/**
	 * 피킹 항목 단건 조회
	 * 
	 * @param domainId
	 * @param id
	 * @return
	 */
	private PickingTaskItem findPickingTaskItem(Long domainId, String id) {
		PickingTaskItem item = this.queryManager.select(PickingTaskItem.class, id);

		if (item == null) {
			throw new ElidomValidationException("피킹 항목을 찾을 수 없습니다: " + id);
		}

		return item;
	}

	/**
	 * 피킹 지시 단건 조회
	 * 
	 * @param domainId
	 * @param id
	 * @return
	 */
	private PickingTask findPickingTask(Long domainId, String id) {
		PickingTask pickingTask = this.queryManager.select(PickingTask.class, id);

		if (pickingTask == null) {
			throw new ElidomValidationException("피킹 지시를 찾을 수 없습니다: " + id);
		}

		return pickingTask;
	}
}
