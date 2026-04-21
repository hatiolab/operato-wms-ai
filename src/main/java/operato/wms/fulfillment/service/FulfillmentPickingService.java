package operato.wms.fulfillment.service;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import operato.wms.base.service.RuntimeConfigService;
import operato.wms.base.service.WmsBaseService;
import operato.wms.fulfillment.WmsFulfillmentConfigConstants;
import operato.wms.fulfillment.entity.PickingTask;
import operato.wms.fulfillment.entity.PickingTaskItem;
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
	 * 피킹지시서 템플릿 이름 조회
	 * 
	 * @param comCd
	 * @param whCd
	 * @param exceptionWhenEmpty
	 * @return
	 */
	public String getPickingSheetTemplateName(String comCd, String whCd, boolean exceptionWhenEmpty) {
		String templateName = this.runtimeConfSvc.getRuntimeConfigValue(comCd, whCd,
				WmsFulfillmentConfigConstants.PICKING_TASK_SHEET_TEMPLATE);

		if (exceptionWhenEmpty && ValueUtil.isEmpty(templateName)) {
			throw new ElidomRuntimeException("피킹지시서 템플릿이 화주사-창고별 설정에 설정되지 않았습니다.");
		}

		return templateName;
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
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		PickingTask task = this.findPickingTask(domainId, id);

		if (PickingTask.STATUS_IN_PROGRESS.equals(task.getStatus())) {
			return ValueUtil.newMap("success,pick_task_no,status", true, task.getPickTaskNo(),
					PickingTask.STATUS_IN_PROGRESS);
		}

		if (!PickingTask.STATUS_CREATED.equals(task.getStatus())) {
			throw new ElidomValidationException("피킹 지시 상태가 [" + task.getStatus() + "]이므로 시작할 수 없습니다 (CREATED 상태만 가능)");
		}

		// 피킹 지시 상태 변경
		String sql = "UPDATE picking_tasks SET status = :status, started_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,now,domainId,id",
				PickingTask.STATUS_IN_PROGRESS, now, domainId, id);
		this.queryManager.executeBySql(sql, params);

		// 피킹 상세 아이템 상태를 RUN으로 변경
		String itemSql = "UPDATE picking_task_items SET status = :status, updated_at = now() WHERE domain_id = :domainId AND pick_task_id = :pickTaskId AND status = :currentStatus";
		Map<String, Object> itemParams = ValueUtil.newMap("status,domainId,pickTaskId,currentStatus",
				PickingTaskItem.STATUS_RUN, domainId, id, PickingTaskItem.STATUS_WAIT);
		this.queryManager.executeBySql(itemSql, itemParams);

		// 결과 리턴
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
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		PickingTask task = this.findPickingTask(domainId, id);

		if (!PickingTask.STATUS_IN_PROGRESS.equals(task.getStatus())) {
			throw new ElidomValidationException(
					"피킹 지시 상태가 [" + task.getStatus() + "]이므로 완료할 수 없습니다 (IN_PROGRESS 상태만 가능)");
		}

		// 실적 수량 합산
		String sumSql = "SELECT COALESCE(SUM(pick_qty), 0) AS result_total,"
				+ " COALESCE(SUM(short_qty), 0) AS short_total,"
				+ " COUNT(DISTINCT sku_cd) AS result_item,"
				+ " COUNT(DISTINCT shipment_order_id) AS result_order"
				+ " FROM picking_task_items WHERE domain_id = :domainId AND pick_task_id = :pickTaskId AND status IN (:s1, :s2)";
		Map<String, Object> sumParams = ValueUtil.newMap("domainId,pickTaskId,s1,s2",
				domainId, id, PickingTaskItem.STATUS_PICKED, PickingTaskItem.STATUS_SHORT);
		List<Map> sumList = this.queryManager.selectListBySql(sumSql, sumParams, Map.class, 0, 1);

		double resultTotal = 0;
		double shortTotal = 0;
		int resultItem = 0;
		int resultOrder = 0;

		if (!sumList.isEmpty()) {
			Map sumRow = sumList.get(0);
			resultTotal = sumRow.get("result_total") != null ? Double.parseDouble(sumRow.get("result_total").toString())
					: 0;
			shortTotal = sumRow.get("short_total") != null ? Double.parseDouble(sumRow.get("short_total").toString())
					: 0;
			resultItem = sumRow.get("result_item") != null ? Integer.parseInt(sumRow.get("result_item").toString()) : 0;
			resultOrder = sumRow.get("result_order") != null ? Integer.parseInt(sumRow.get("result_order").toString())
					: 0;
		}

		// 총량 피킹인 경우 result_order는 plan_order 사용
		if ("TOTAL".equals(task.getPickType())) {
			resultOrder = task.getPlanOrder() != null ? task.getPlanOrder() : 0;
		}

		// 로그인 사용자를 작업자로 기록
		String workerId = User.currentUser() != null ? User.currentUser().getId() : null;

		// 피킹 지시 헤더 업데이트
		String updSql = "UPDATE picking_tasks SET status = :status, completed_at = :now, worker_id = :workerId,"
				+ " result_order = :resultOrder, result_item = :resultItem, result_total = :resultTotal, short_total = :shortTotal,"
				+ " updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updParams = ValueUtil.newMap(
				"status,now,workerId,resultOrder,resultItem,resultTotal,shortTotal,domainId,id",
				PickingTask.STATUS_COMPLETED, now, workerId, resultOrder, resultItem, resultTotal, shortTotal, domainId,
				id);
		this.queryManager.executeBySql(updSql, updParams);

		return ValueUtil.newMap("success,pick_task_no,status,result_total,short_total", true, task.getPickTaskNo(),
				PickingTask.STATUS_COMPLETED, resultTotal, shortTotal);
	}

	/**
	 * 피킹 지시 취소 (-> CANCELLED)
	 *
	 * 피킹 지시를 취소하고, 모든 상세 항목도 함께 취소한다.
	 * COMPLETED 상태인 피킹 지시는 취소할 수 없다.
	 *
	 * @param id 피킹 지시 ID
	 * @return { success, pick_task_no }
	 */
	public Map<String, Object> cancelPickingTask(String id) {
		Long domainId = Domain.currentDomainId();

		PickingTask task = this.findPickingTask(domainId, id);

		String status = task.getStatus();
		if (PickingTask.STATUS_COMPLETED.equals(status) || PickingTask.STATUS_CANCELLED.equals(status)) {
			throw new ElidomValidationException("피킹 지시 상태가 [" + status + "]이므로 취소할 수 없습니다");
		}

		// 상세 아이템 전체 취소
		String itemSql = "UPDATE picking_task_items SET status = :status, updated_at = now() WHERE domain_id = :domainId AND pick_task_id = :pickTaskId AND status NOT IN (:s1, :s2)";
		Map<String, Object> itemParams = ValueUtil.newMap("status,domainId,pickTaskId,s1,s2",
				PickingTaskItem.STATUS_CANCEL, domainId, id, PickingTaskItem.STATUS_PICKED,
				PickingTaskItem.STATUS_CANCEL);
		this.queryManager.executeBySql(itemSql, itemParams);

		// 피킹 지시 헤더 취소
		String sql = "UPDATE picking_tasks SET status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,domainId,id",
				PickingTask.STATUS_CANCELLED, domainId, id);
		this.queryManager.executeBySql(sql, params);

		// TODO 피킹 지시 취소 시 할당 재고 RESERVE → 해제 로직이 맞는지 체크

		// 결과 리턴
		return ValueUtil.newMap("success,pick_task_no", true, task.getPickTaskNo());
	}

	/**
	 * 피킹 지시 목록 조회
	 *
	 * CREATED, IN_PROGRESS 상태의 피킹 지시 목록을 반환한다.
	 * 우선순위 순으로 정렬된다.
	 *
	 * @return 피킹 지시 목록
	 */
	public List<Map> searchTodoPickingTasks() {
		Long domainId = Domain.currentDomainId();

		String sql = "SELECT pt.id, pt.pick_task_no, pt.wave_no, pt.shipment_no, pt.order_date,"
				+ " pt.pick_type, pt.pick_method, pt.zone_cd, pt.priority_cd, pt.worker_id,"
				+ " pt.plan_order, pt.plan_item, pt.plan_total,"
				+ " pt.result_order, pt.result_item, pt.result_total, pt.short_total,"
				+ " pt.status, pt.created_at, pt.started_at, pt.completed_at,"
				+ " (SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id AND pti.pick_task_id = pt.id) AS total_items,"
				+ " (SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id AND pti.pick_task_id = pt.id AND pti.status = 'PICKED') AS picked_items"
				+ " FROM picking_tasks pt"
				+ " WHERE pt.domain_id = :domainId AND pt.status IN (:s1, :s2)"
				+ " ORDER BY CASE pt.priority_cd WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END, pt.created_at";
		Map<String, Object> params = ValueUtil.newMap("domainId,s1,s2",
				domainId, PickingTask.STATUS_CREATED, PickingTask.STATUS_IN_PROGRESS);
		return this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
	}

	/**
	 * 피킹 지시 목록 조회
	 *
	 * COMPLETED 상태의 피킹 지시 목록을 반환한다.
	 * 우선순위 순으로 정렬된다.
	 *
	 * @return 피킹 지시 목록
	 */
	public List<Map> searchDonePickingTasks() {
		Long domainId = Domain.currentDomainId();

		String sql = "SELECT pt.id, pt.pick_task_no, pt.wave_no, pt.shipment_no, pt.order_date,"
				+ " pt.pick_type, pt.pick_method, pt.zone_cd, pt.priority_cd, pt.worker_id,"
				+ " pt.plan_order, pt.plan_item, pt.plan_total,"
				+ " pt.result_order, pt.result_item, pt.result_total, pt.short_total,"
				+ " pt.status, pt.created_at, pt.started_at, pt.completed_at,"
				+ " (SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id AND pti.pick_task_id = pt.id) AS total_items,"
				+ " (SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id AND pti.pick_task_id = pt.id AND pti.status = 'PICKED') AS picked_items"
				+ " FROM picking_tasks pt"
				+ " WHERE pt.domain_id = :domainId AND pt.status = :status"
				+ " ORDER BY CASE pt.priority_cd WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END, pt.created_at";
		Map<String, Object> params = ValueUtil.newMap("domainId,status",
				domainId, PickingTask.STATUS_COMPLETED);
		return this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
	}

	/**
	 * 피킹 지시 상세 조회
	 *
	 * @param id 피킹 지시 ID
	 * @return 피킹 지시 상세 정보
	 */
	@SuppressWarnings({ "rawtypes", "unchecked" })
	public Map<String, Object> getPickingTask(String id) {
		Long domainId = Domain.currentDomainId();

		String sql = "SELECT pt.id, pt.pick_task_no, pt.wave_no, pt.shipment_no, pt.order_date,"
				+ " pt.pick_type, pt.pick_method, pt.zone_cd, pt.priority_cd, pt.worker_id,"
				+ " pt.plan_order, pt.plan_item, pt.plan_total,"
				+ " pt.result_order, pt.result_item, pt.result_total, pt.short_total,"
				+ " pt.status, pt.created_at, pt.started_at, pt.completed_at,"
				+ " (SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id AND pti.pick_task_id = pt.id) AS total_items,"
				+ " (SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id AND pti.pick_task_id = pt.id AND pti.status = 'PICKED') AS picked_items"
				+ " FROM picking_tasks pt"
				+ " WHERE pt.domain_id = :domainId AND pt.id = :id";
		Map<String, Object> params = ValueUtil.newMap("domainId,id", domainId, id);
		List<Map> list = this.queryManager.selectListBySql(sql, params, Map.class, 0, 1);

		if (list.isEmpty()) {
			throw new ElidomValidationException("피킹 지시를 찾을 수 없습니다: " + id);
		}

		return (Map<String, Object>) list.get(0);
	}

	/**
	 * 피킹 지시 상세 아이템 조회
	 *
	 * @param id 피킹 지시 ID
	 * @return 피킹 상세 아이템 목록
	 */
	public List<Map> getPickingTaskItems(String id) {
		Long domainId = Domain.currentDomainId();

		// 피킹 지시 존재 확인
		this.findPickingTask(domainId, id);

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
		Long domainId = Domain.currentDomainId();

		if (ValueUtil.isEmpty(workerCd)) {
			throw new ElidomValidationException("작업자 코드(worker_cd)는 필수 파라미터입니다");
		}

		String sql = "SELECT pt.id, pt.pick_task_no, pt.wave_no, pt.shipment_no, pt.order_date,"
				+ " pt.pick_type, pt.pick_method, pt.zone_cd, pt.priority_cd,"
				+ " pt.plan_order, pt.plan_item, pt.plan_total,"
				+ " pt.result_order, pt.result_item, pt.result_total, pt.short_total,"
				+ " pt.status, pt.started_at,"
				+ " (SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id AND pti.pick_task_id = pt.id) AS total_items,"
				+ " (SELECT COUNT(*) FROM picking_task_items pti WHERE pti.domain_id = pt.domain_id AND pti.pick_task_id = pt.id AND pti.status = 'PICKED') AS picked_items"
				+ " FROM picking_tasks pt"
				+ " WHERE pt.domain_id = :domainId AND pt.worker_id = :workerId AND pt.status IN (:s1, :s2)"
				+ " ORDER BY CASE pt.priority_cd WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END, pt.created_at";
		Map<String, Object> params = ValueUtil.newMap("domainId,workerId,s1,s2",
				domainId, workerCd, PickingTask.STATUS_CREATED, PickingTask.STATUS_IN_PROGRESS);
		return this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
	}

	/**
	 * 개별 아이템 피킹 확인 (스캔)
	 *
	 * 피킹 항목의 pick_qty를 갱신하고 상태를 PICKED로 변경한다.
	 *
	 * @param itemId 피킹 항목 ID
	 * @param params { pick_qty, loc_cd }
	 * @return { success, item_id, sku_cd, pick_qty, status }
	 */
	public Map<String, Object> pickItem(String itemId, Map<String, Object> params) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		PickingTaskItem item = this.findPickingTaskItem(domainId, itemId);

		if (!PickingTaskItem.STATUS_RUN.equals(item.getStatus())
				&& !PickingTaskItem.STATUS_WAIT.equals(item.getStatus())) {
			throw new ElidomValidationException("피킹 항목 상태가 [" + item.getStatus() + "]이므로 피킹할 수 없습니다 (WAIT/RUN 상태만 가능)");
		}

		double pickQty = params.get("pick_qty") != null ? Double.parseDouble(params.get("pick_qty").toString())
				: item.getOrderQty();
		String locCd = params.get("loc_cd") != null ? params.get("loc_cd").toString() : null;

		String sql = "UPDATE picking_task_items SET pick_qty = :pickQty, status = :status, picked_at = :now"
				+ (locCd != null ? ", from_loc_cd = :locCd" : "")
				+ ", updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updParams = ValueUtil.newMap("pickQty,status,now,domainId,id",
				pickQty, PickingTaskItem.STATUS_PICKED, now, domainId, itemId);
		if (locCd != null) {
			updParams.put("locCd", locCd);
		}
		this.queryManager.executeBySql(sql, updParams);

		return ValueUtil.newMap("success,item_id,sku_cd,pick_qty,status", true, itemId, item.getSkuCd(), pickQty,
				PickingTaskItem.STATUS_PICKED);
	}

	/**
	 * 피킹 부족 처리
	 *
	 * 피킹 항목의 short_qty를 갱신하고 상태를 SHORT로 변경한다.
	 *
	 * @param itemId 피킹 항목 ID
	 * @param params { short_qty, pick_qty, reason }
	 * @return { success, item_id, sku_cd, pick_qty, short_qty, status }
	 */
	public Map<String, Object> shortItem(String itemId, Map<String, Object> params) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		PickingTaskItem item = this.findPickingTaskItem(domainId, itemId);

		if (!PickingTaskItem.STATUS_RUN.equals(item.getStatus())
				&& !PickingTaskItem.STATUS_WAIT.equals(item.getStatus())) {
			throw new ElidomValidationException(
					"피킹 항목 상태가 [" + item.getStatus() + "]이므로 부족 처리할 수 없습니다 (WAIT/RUN 상태만 가능)");
		}

		double shortQty = params.get("short_qty") != null ? Double.parseDouble(params.get("short_qty").toString())
				: item.getOrderQty();
		double pickQty = params.get("pick_qty") != null ? Double.parseDouble(params.get("pick_qty").toString()) : 0;

		String sql = "UPDATE picking_task_items SET pick_qty = :pickQty, short_qty = :shortQty, status = :status, picked_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updParams = ValueUtil.newMap("pickQty,shortQty,status,now,domainId,id",
				pickQty, shortQty, PickingTaskItem.STATUS_SHORT, now, domainId, itemId);
		this.queryManager.executeBySql(sql, updParams);

		// 결과 리턴
		return ValueUtil.newMap("success,item_id,sku_cd,pick_qty,short_qty,status", true, itemId, item.getSkuCd(),
				pickQty, shortQty, PickingTaskItem.STATUS_SHORT);
	}

	/*
	 * ============================================================
	 * 내부 유틸리티
	 * ============================================================
	 */

	/**
	 * 피킹 항목 단건 조회
	 */
	private PickingTaskItem findPickingTaskItem(Long domainId, String id) {
		String sql = "SELECT * FROM picking_task_items WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("domainId,id", domainId, id);
		List<PickingTaskItem> list = this.queryManager.selectListBySql(sql, params, PickingTaskItem.class, 0, 1);
		if (list.isEmpty()) {
			throw new ElidomValidationException("피킹 항목을 찾을 수 없습니다: " + id);
		}
		return list.get(0);
	}

	/**
	 * 피킹 지시 단건 조회
	 */
	private PickingTask findPickingTask(Long domainId, String id) {
		String sql = "SELECT * FROM picking_tasks WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("domainId,id", domainId, id);
		List<PickingTask> list = this.queryManager.selectListBySql(sql, params, PickingTask.class, 0, 1);
		if (list.isEmpty()) {
			throw new ElidomValidationException("피킹 지시를 찾을 수 없습니다: " + id);
		}
		return list.get(0);
	}
}
