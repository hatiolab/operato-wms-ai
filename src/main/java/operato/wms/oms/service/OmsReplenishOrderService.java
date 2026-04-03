package operato.wms.oms.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import operato.wms.oms.entity.ReplenishOrder;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * OMS 보충 지시 서비스
 *
 * 보충 지시 시작, 완료, 취소 등 상태 변경을 담당한다.
 *
 * @author HatioLab
 */
@Component
public class OmsReplenishOrderService extends AbstractQueryService {

	/**
	 * 보충 지시 시작 (CREATED → IN_PROGRESS)
	 *
	 * @param id 보충 지시 ID
	 * @return { success }
	 */
	public Map<String, Object> startReplenishOrder(String id) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		ReplenishOrder order = this.findReplenishOrder(domainId, id);
		if (order == null) {
			throw new ElidomValidationException("보충 지시를 찾을 수 없습니다: " + id);
		}

		if (!ReplenishOrder.STATUS_CREATED.equals(order.getStatus())) {
			throw new ElidomValidationException(
					"보충 지시 상태가 [" + order.getStatus() + "]이므로 시작할 수 없습니다 (CREATED 상태만 가능)");
		}

		String sql = "UPDATE replenish_orders SET status = :status, started_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,now,domainId,id",
				ReplenishOrder.STATUS_IN_PROGRESS, now, domainId, id);
		this.queryManager.executeBySql(sql, params);

		// 결과 리턴
		return ValueUtil.newMap("success", true);
	}

	/**
	 * 보충 지시 완료 (IN_PROGRESS → COMPLETED)
	 *
	 * 상세 항목의 실적 수량을 합산하여 헤더의 resultTotal을 갱신한다.
	 *
	 * @param id 보충 지시 ID
	 * @return { success, result_total }
	 */
	public Map<String, Object> completeReplenishOrder(String id) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		ReplenishOrder order = this.findReplenishOrder(domainId, id);
		if (order == null) {
			throw new ElidomValidationException("보충 지시를 찾을 수 없습니다: " + id);
		}

		if (!ReplenishOrder.STATUS_IN_PROGRESS.equals(order.getStatus())) {
			throw new ElidomValidationException(
					"보충 지시 상태가 [" + order.getStatus() + "]이므로 완료할 수 없습니다 (IN_PROGRESS 상태만 가능)");
		}

		// 상세 항목의 실적 수량 합산
		String sumSql = "SELECT COALESCE(SUM(result_qty), 0) FROM replenish_order_items WHERE domain_id = :domainId AND replenish_order_id = :orderId";
		Map<String, Object> sumParams = ValueUtil.newMap("domainId,orderId", domainId, id);
		Double resultTotal = this.queryManager.selectBySql(sumSql, sumParams, Double.class);

		String sql = "UPDATE replenish_orders SET status = :status, result_total = :resultTotal, completed_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,resultTotal,now,domainId,id",
				ReplenishOrder.STATUS_COMPLETED, resultTotal, now, domainId, id);
		this.queryManager.executeBySql(sql, params);

		// 결과 리턴
		return ValueUtil.newMap("success,result_total", true, resultTotal);
	}

	/**
	 * 보충 지시 취소 (CREATED/IN_PROGRESS → CANCELLED)
	 *
	 * @param id 보충 지시 ID
	 * @return { success }
	 */
	public Map<String, Object> cancelReplenishOrder(String id) {
		Long domainId = Domain.currentDomainId();

		ReplenishOrder order = this.findReplenishOrder(domainId, id);
		if (order == null) {
			throw new ElidomValidationException("보충 지시를 찾을 수 없습니다: " + id);
		}

		String status = order.getStatus();
		if (ReplenishOrder.STATUS_COMPLETED.equals(status) || ReplenishOrder.STATUS_CANCELLED.equals(status)) {
			throw new ElidomValidationException("보충 지시 상태가 [" + status + "]이므로 취소할 수 없습니다");
		}

		String sql = "UPDATE replenish_orders SET status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,domainId,id",
				ReplenishOrder.STATUS_CANCELLED, domainId, id);
		this.queryManager.executeBySql(sql, params);

		// 결과 리턴
		return ValueUtil.newMap("success", true);
	}

	/*
	 * ============================================================
	 * 내부 유틸리티
	 * ============================================================
	 */

	/**
	 * 보충 지시 단건 조회
	 */
	private ReplenishOrder findReplenishOrder(Long domainId, String id) {
		String sql = "SELECT * FROM replenish_orders WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("domainId,id", domainId, id);
		List<ReplenishOrder> list = this.queryManager.selectListBySql(sql, params, ReplenishOrder.class, 0, 1);
		return list.isEmpty() ? null : list.get(0);
	}
}
