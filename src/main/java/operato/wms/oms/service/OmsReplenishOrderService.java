package operato.wms.oms.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import operato.wms.oms.entity.ReplenishOrder;
import operato.wms.oms.entity.ReplenishOrderItem;
import operato.wms.oms.entity.ShipmentOrderItem;
import operato.wms.stock.entity.Inventory;
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

	/**
	 * BACK_ORDER 출하 주문 기반 보충 지시 자동 생성
	 *
	 * short_qty > 0인 주문 상세 항목을 조회하고, STORE (보관)존 에서 가용 재고가 있는
	 * SKU에 대해 ReplenishOrder + ReplenishOrderItem을 생성한다.
	 *
	 * @param domainId        도메인 ID
	 * @param shipmentOrderId 출하 주문 ID (BACK_ORDER 상태)
	 * @param comCd           회사 코드
	 * @param whCd            창고 코드
	 * @return { replenish_created, replenish_no, item_count, no_stock_skus }
	 */
	public Map<String, Object> createReplenishForOrder(Long domainId, String shipmentOrderId, String comCd,
			String whCd) {
		// short_qty > 0인 상세 항목 조회
		String itemSql = "SELECT * FROM shipment_order_items WHERE domain_id = :domainId AND shipment_order_id = :orderId AND short_qty > 0 ORDER BY line_no";
		Map<String, Object> itemParams = ValueUtil.newMap("domainId,orderId", domainId, shipmentOrderId);
		List<ShipmentOrderItem> shortItems = this.queryManager.selectListBySql(itemSql, itemParams,
				ShipmentOrderItem.class, 0, 0);

		if (shortItems.isEmpty()) {
			return ValueUtil.newMap("replenish_created,reason", false, "NO_SHORT_ITEMS");
		}

		ReplenishOrder replenishOrder = null;
		int itemCount = 0;
		int rank = 1;
		List<String> noStockSkus = new ArrayList<String>();

		for (ShipmentOrderItem shortItem : shortItems) {
			double needQty = shortItem.getShortQty() != null ? shortItem.getShortQty() : 0;
			if (needQty <= 0)
				continue;

			// STORE (보관)존에서 동일 창고/SKU 가용 재고 탐색
			String stockSql = """
					SELECT i.loc_cd, i.sku_nm, (i.inv_qty - COALESCE(i.reserved_qty, 0)) AS avail_qty
					FROM inventories i
					INNER JOIN locations l ON l.domain_id = i.domain_id AND l.loc_cd = i.loc_cd
					WHERE i.domain_id = :domainId AND i.com_cd = :comCd AND i.wh_cd = :whCd
					  AND i.sku_cd = :skuCd AND l.loc_type = 'STORE'
					  AND (i.inv_qty - COALESCE(i.reserved_qty, 0)) > 0
					ORDER BY (i.inv_qty - COALESCE(i.reserved_qty, 0)) DESC
					LIMIT 1
					""";
			Map<String, Object> stockParams = ValueUtil.newMap("domainId,comCd,whCd,skuCd",
					domainId, comCd, whCd, shortItem.getSkuCd());
			Inventory stock = this.queryManager.selectBySql(stockSql, stockParams, Inventory.class);

			if (stock == null) {
				noStockSkus.add(shortItem.getSkuCd());
				continue;
			}

			String fromLocCd = stock.getLocCd();
			String skuNm = stock.getSkuNm();

			// 도착 로케이션: 기존 할당에서 PICKABLE 위치 조회
			String toLocSql = """
					SELECT loc_cd FROM stock_allocations
					WHERE domain_id = :domainId AND shipment_order_item_id = :itemId
					  AND status NOT IN ('CANCELLED', 'RELEASED')
					LIMIT 1
					""";
			Map<String, Object> toLocParams = ValueUtil.newMap("domainId,itemId", domainId, shortItem.getId());
			Map toLocRow = this.queryManager.selectBySql(toLocSql, toLocParams, Map.class);
			// 기존 할당 레코드 없으면 null — PDA에서 작업자가 직접 to_loc 스캔
			String toLocCd = toLocRow == null ? null : (String) toLocRow.get("loc_cd");

			// ReplenishOrder 최초 아이템에서 헤더 생성
			if (replenishOrder == null) {
				replenishOrder = new ReplenishOrder();
				replenishOrder.setDomainId(domainId);
				replenishOrder.setComCd(comCd);
				replenishOrder.setWhCd(whCd);
				replenishOrder.setOrderDate(DateUtil.todayStr());
				replenishOrder.setStatus(ReplenishOrder.STATUS_CREATED);
				replenishOrder.setRemarks("shipment_order_id:" + shipmentOrderId);
				this.queryManager.insert(replenishOrder);
			}

			// ReplenishOrderItem 생성
			ReplenishOrderItem replenishItem = new ReplenishOrderItem();
			replenishItem.setDomainId(domainId);
			replenishItem.setReplenishOrderId(replenishOrder.getId());
			replenishItem.setRank(rank++);
			replenishItem.setSkuCd(shortItem.getSkuCd());
			replenishItem.setSkuNm(skuNm);
			replenishItem.setFromLocCd(fromLocCd);
			replenishItem.setToLocCd(toLocCd);
			replenishItem.setOrderQty(needQty);
			replenishItem.setRemarks("shipment_order_item_id:" + shortItem.getId());
			this.queryManager.insert(replenishItem);

			itemCount++;
		}

		if (replenishOrder == null) {
			return ValueUtil.newMap("replenish_created,reason,no_stock_skus", false, "NO_STOCK", noStockSkus);
		}

		// 헤더 planItem/planTotal 업데이트
		String updateSql = """
				UPDATE replenish_orders SET plan_item = :planItem,
				  plan_total = (SELECT COALESCE(SUM(order_qty), 0) FROM replenish_order_items WHERE domain_id = :domainId AND replenish_order_id = :orderId),
				  updated_at = now()
				WHERE domain_id = :domainId AND id = :orderId
				""";
		Map<String, Object> updateParams = ValueUtil.newMap("domainId,orderId,planItem", domainId,
				replenishOrder.getId(), itemCount);
		this.queryManager.executeBySql(updateSql, updateParams);

		Map<String, Object> result = ValueUtil.newMap("replenish_created,replenish_no,item_count", true,
				replenishOrder.getReplenishNo(), itemCount);
		if (!noStockSkus.isEmpty()) {
			result.put("no_stock_skus", noStockSkus);
		}
		return result;
	}

	/**
	 * 보충 아이템 단건 완료 처리
	 *
	 * result_qty를 기록하고, 보충 지시 내 모든 아이템이 완료되면 헤더를 자동 COMPLETED 처리한다.
	 * 재고 물리 이동은 PDA에서 move_inventory API를 별도 호출하므로 여기서는 수행하지 않는다.
	 *
	 * @param replenishOrderId 보충 지시 ID
	 * @param itemId           보충 상세 아이템 ID
	 * @param resultQty        실적 수량
	 * @return { success, item_id, result_qty, order_completed }
	 */
	public Map<String, Object> completeReplenishItem(String replenishOrderId, String itemId, double resultQty) {
		Long domainId = Domain.currentDomainId();

		ReplenishOrder order = this.findReplenishOrder(domainId, replenishOrderId);
		if (order == null) {
			throw new ElidomValidationException("보충 지시를 찾을 수 없습니다: " + replenishOrderId);
		}
		if (!ReplenishOrder.STATUS_IN_PROGRESS.equals(order.getStatus())) {
			throw new ElidomValidationException(
					"보충 지시 상태가 [" + order.getStatus() + "]이므로 완료 처리할 수 없습니다 (IN_PROGRESS 상태만 가능)");
		}

		// 아이템 조회
		String itemSql = "SELECT * FROM replenish_order_items WHERE domain_id = :domainId AND id = :itemId AND replenish_order_id = :orderId";
		Map<String, Object> itemParams = ValueUtil.newMap("domainId,itemId,orderId", domainId, itemId,
				replenishOrderId);
		List<ReplenishOrderItem> items = this.queryManager.selectListBySql(itemSql, itemParams,
				ReplenishOrderItem.class, 0, 1);
		if (items.isEmpty()) {
			throw new ElidomValidationException("보충 상세 항목을 찾을 수 없습니다: " + itemId);
		}

		// result_qty 업데이트
		String updateItemSql = "UPDATE replenish_order_items SET result_qty = :resultQty, updated_at = now() WHERE domain_id = :domainId AND id = :itemId";
		this.queryManager.executeBySql(updateItemSql,
				ValueUtil.newMap("domainId,itemId,resultQty", domainId, itemId, resultQty));

		// 미완료 아이템 수 확인 (result_qty IS NULL OR result_qty = 0)
		String remainSql = "SELECT COUNT(*) FROM replenish_order_items WHERE domain_id = :domainId AND replenish_order_id = :orderId AND (result_qty IS NULL OR result_qty = 0)";
		Long remainCount = this.queryManager.selectBySql(remainSql,
				ValueUtil.newMap("domainId,orderId", domainId, replenishOrderId), Long.class);

		boolean orderCompleted = false;
		if (remainCount != null && remainCount == 0) {
			this.completeReplenishOrder(replenishOrderId);
			orderCompleted = true;
		}

		return ValueUtil.newMap("success,item_id,result_qty,order_completed", true, itemId, resultQty, orderCompleted);
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
