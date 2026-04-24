package operato.wms.oms.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import operato.wms.base.entity.StoragePolicy;
import operato.wms.base.service.WmsBaseService;
import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.oms.entity.ShipmentOrderItem;
import operato.wms.oms.entity.StockAllocation;
import operato.wms.stock.entity.Inventory;
import operato.wms.stock.service.StockTransactionService;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * OMS 출하 주문 서비스
 *
 * 출하 주문 확정, 재고 할당, 할당 해제, 취소, 마감 등 상태 변경을 담당한다.
 *
 * @author HatioLab
 */
@Component
public class OmsShipmentOrderService extends AbstractQueryService {
	/**
	 * WMS Base Service
	 */
	@Autowired
	private WmsBaseService wmsBaseService;
	/**
	 * OMS, Fulfillment용 재고 트랜잭션 서비스
	 */
	@Autowired
	private StockTransactionService stockTransactionService;

	/**
	 * 출하 주문 확정 + 재고 할당 (단건)
	 *
	 * REGISTERED 상태 주문을 CONFIRMED로 확정한 뒤, 바로 재고 할당까지 수행한다.
	 * 전체 할당 시 ALLOCATED, 부분 할당 시 BACK_ORDER 상태가 된다.
	 *
	 * @param id 주문 ID
	 * @return { success, status, allocated_qty, back_order }
	 */
	public Map<String, Object> confirmAndAllocateShipmentOrder(String id) {
		Long domainId = Domain.currentDomainId();

		ShipmentOrder order = this.findOrder(domainId, id);
		if (order == null) {
			throw new ElidomValidationException("주문을 찾을 수 없습니다: " + id);
		}

		if (!ShipmentOrder.STATUS_REGISTERED.equals(order.getStatus())) {
			throw new ElidomValidationException(
					"주문 상태가 [" + order.getStatus() + "]이므로 확정+할당할 수 없습니다 (REGISTERED 상태만 가능)");
		}

		// 1. 확정 처리
		List<String> ids = new ArrayList<>();
		ids.add(id);
		Map<String, Object> confirmResult = this.confirmShipmentOrders(ids);

		int confirmSuccess = (int) confirmResult.getOrDefault("success_count", 0);
		if (confirmSuccess == 0) {
			@SuppressWarnings("unchecked")
			List<String> confirmErrors = (List<String>) confirmResult.getOrDefault("errors", new ArrayList<>());
			String errorMsg = confirmErrors.isEmpty() ? "확정 처리 실패" : confirmErrors.get(0);
			throw new ElidomRuntimeException(errorMsg);
		}

		// 2. 재고 할당 처리
		Map<String, Object> allocResult = this.allocateShipmentOrders(ids);
		int allocSuccess = (int) allocResult.getOrDefault("success_count", 0);
		int backOrderCount = (int) allocResult.getOrDefault("back_order_count", 0);

		// 최종 주문 상태 조회
		ShipmentOrder updatedOrder = this.findOrder(domainId, id);

		// 결과 리턴
		Map<String, Object> result = ValueUtil.newMap("success", allocSuccess > 0);
		result.put("status", updatedOrder != null ? updatedOrder.getStatus() : null);
		result.put("allocated_qty", updatedOrder != null ? updatedOrder.getTotalAlloc() : 0);
		result.put("back_order", backOrderCount > 0);
		return result;
	}

	/**
	 * 출하 주문 확정 (REGISTERED → CONFIRMED)
	 *
	 * @param ids 주문 ID 리스트
	 * @return { success_count, fail_count, errors }
	 */
	public Map<String, Object> confirmShipmentOrders(List<String> ids) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();
		int successCount = 0;
		int failCount = 0;
		List<String> errors = new ArrayList<>();

		for (String id : ids) {
			ShipmentOrder order = this.findOrder(domainId, id);
			if (order == null) {
				errors.add("주문을 찾을 수 없습니다: " + id);
				failCount++;
				continue;
			}

			if (!ShipmentOrder.STATUS_REGISTERED.equals(order.getStatus())) {
				errors.add("주문 [" + order.getShipmentNo() + "] 상태가 [" + order.getStatus() + "]이므로 확정할 수 없습니다");
				failCount++;
				continue;
			}

			String sql = "UPDATE shipment_orders SET status = :status, confirmed_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> params = ValueUtil.newMap("status,now,domainId,id",
					ShipmentOrder.STATUS_CONFIRMED, now, domainId, id);
			this.queryManager.executeBySql(sql, params);
			successCount++;
		}

		// 결과 리턴
		return ValueUtil.newMap("success_count,fail_count,errors", successCount, failCount, errors);
	}

	/**
	 * 출하 주문 확정 취소 (CONFIRMED → REGISTERED)
	 *
	 * @param ids 주문 ID 리스트
	 * @return { success_count, fail_count, errors }
	 */
	public Map<String, Object> cancelConfirmShipmentOrders(List<String> ids) {
		Long domainId = Domain.currentDomainId();
		int successCount = 0;
		int failCount = 0;
		List<String> errors = new ArrayList<>();

		for (String id : ids) {
			ShipmentOrder order = this.findOrder(domainId, id);
			if (order == null) {
				errors.add("주문을 찾을 수 없습니다: " + id);
				failCount++;
				continue;
			}

			if (!ShipmentOrder.STATUS_CONFIRMED.equals(order.getStatus())) {
				errors.add("주문 [" + order.getShipmentNo() + "] 상태가 [" + order.getStatus() + "]이므로 확정 취소할 수 없습니다 (CONFIRMED 상태만 가능)");
				failCount++;
				continue;
			}

			String sql = "UPDATE shipment_orders SET status = :status, confirmed_at = null, updated_at = now() WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> params = ValueUtil.newMap("status,domainId,id",
					ShipmentOrder.STATUS_REGISTERED, domainId, id);
			this.queryManager.executeBySql(sql, params);
			successCount++;
		}

		// 결과 리턴
		return ValueUtil.newMap("success_count,fail_count,errors", successCount, failCount, errors);
	}

	/**
	 * 출하 주문 재고 할당 (CONFIRMED/BACK_ORDER → ALLOCATED 또는 BACK_ORDER)
	 *
	 * 각 주문 상세의 SKU를 기준으로 가용 재고를 조회하여 FEFO 순서로 할당한다.
	 * 전체 할당 완료 시 ALLOCATED, 부분 할당 시 BACK_ORDER로 상태 변경.
	 *
	 * @param ids 주문 ID 리스트
	 * @return { success_count, allocated_count, back_order_count }
	 */
	public Map<String, Object> allocateShipmentOrders(List<String> ids) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();
		int successCount = 0;
		int allocatedCount = 0;
		int backOrderCount = 0;
		List<String> errors = new ArrayList<>();

		for (String orderId : ids) {
			ShipmentOrder order = this.findOrder(domainId, orderId);
			if (order == null) {
				errors.add("주문을 찾을 수 없습니다: " + orderId);
				continue;
			}

			if (!ShipmentOrder.STATUS_CONFIRMED.equals(order.getStatus())
					&& !ShipmentOrder.STATUS_BACK_ORDER.equals(order.getStatus())) {
				errors.add("주문 [" + order.getShipmentNo() + "] 상태가 [" + order.getStatus() + "]이므로 할당할 수 없습니다");
				continue;
			}

			// 주문 상세 조회
			String itemSql = "SELECT * FROM shipment_order_items WHERE domain_id = :domainId AND shipment_order_id = :orderId ORDER BY line_no";
			Map<String, Object> itemParams = ValueUtil.newMap("domainId,orderId", domainId, orderId);
			List<ShipmentOrderItem> items = this.queryManager.selectListBySql(itemSql, itemParams,
					ShipmentOrderItem.class, 0, 0);

			if (items.isEmpty()) {
				errors.add("주문 [" + order.getShipmentNo() + "]에 상세 항목이 없습니다");
				continue;
			}

			double totalAllocQty = 0;
			boolean hasShort = false;

			for (ShipmentOrderItem item : items) {
				double orderQty = item.getOrderQty() != null ? item.getOrderQty() : 0;
				double existingAllocQty = item.getAllocQty() != null ? item.getAllocQty() : 0;
				double needQty = orderQty - existingAllocQty;

				if (needQty <= 0) {
					totalAllocQty += existingAllocQty;
					continue;
				}

				/**
				 * 재고 할당 전략 조회
				 */
				StoragePolicy policy = this.wmsBaseService.findStoragePolicy(domainId, order.getComCd(),
						order.getWhCd());
				/**
				 * 가용 재고 조회 (StoragePolicy.releaseStrategy에 따라 정렬, needQty 충족분까지만 반환)
				 */
				List<Inventory> inventories = this.stockTransactionService.searchAvailableInventory(domainId,
						order.getComCd(), order.getWhCd(), item.getSkuCd(), needQty, policy.getReleaseStrategy());

				double itemAllocQty = existingAllocQty;

				for (Inventory inv : inventories) {
					if (needQty <= 0)
						break;

					double invQty = inv.getInvQty() != null ? inv.getInvQty() : 0;
					double reservedQty = inv.getReservedQty() != null ? inv.getReservedQty() : 0;
					double availQty = invQty - reservedQty;

					if (availQty <= 0)
						continue;

					double allocQty = Math.min(needQty, availQty);

					// StockAllocation 생성
					StockAllocation alloc = new StockAllocation();
					alloc.setDomainId(domainId);
					alloc.setShipmentOrderId(orderId);
					alloc.setShipmentOrderItemId(item.getId());
					alloc.setInventoryId(inv.getId());
					alloc.setSkuCd(item.getSkuCd());
					alloc.setBarcode(inv.getBarcode());
					alloc.setLocCd(inv.getLocCd());
					alloc.setLotNo(inv.getLotNo());
					alloc.setExpiredDate(inv.getExpiredDate());
					alloc.setAllocQty(allocQty);
					alloc.setAllocStrategy(policy.getReleaseStrategy());
					alloc.setStatus(StockAllocation.STATUS_HARD);
					alloc.setAllocatedAt(now);
					this.queryManager.insert(alloc);

					// 재고 예약 처리
					this.stockTransactionService.allocateInventory(inv, allocQty);

					itemAllocQty += allocQty;
					needQty -= allocQty;
				}

				// ShipmentOrderItem 업데이트
				double shortQty = orderQty - itemAllocQty;
				String updItemSql = "UPDATE shipment_order_items SET alloc_qty = :allocQty, short_qty = :shortQty, updated_at = now() WHERE domain_id = :domainId AND id = :itemId";
				Map<String, Object> updItemParams = ValueUtil.newMap("allocQty,shortQty,domainId,itemId", itemAllocQty,
						shortQty, domainId, item.getId());
				this.queryManager.executeBySql(updItemSql, updItemParams);

				totalAllocQty += itemAllocQty;
				if (shortQty > 0)
					hasShort = true;
			}

			// 주문 헤더 상태 업데이트
			String newStatus = hasShort ? ShipmentOrder.STATUS_BACK_ORDER : ShipmentOrder.STATUS_ALLOCATED;
			String updOrderSql = "UPDATE shipment_orders SET status = :status, total_alloc = :totalAlloc, allocated_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> updOrderParams = ValueUtil.newMap("status,totalAlloc,now,domainId,id",
					newStatus, totalAllocQty, now, domainId, orderId);
			this.queryManager.executeBySql(updOrderSql, updOrderParams);

			successCount++;
			if (hasShort) {
				backOrderCount++;
			} else {
				allocatedCount++;
			}
		}

		// 결과 리턴
		return ValueUtil.newMap("success_count,allocated_count,back_order_count,errors", successCount, allocatedCount,
				backOrderCount, errors);
	}

	/**
	 * 출하 주문 할당 해제 (ALLOCATED → CONFIRMED)
	 *
	 * @param id 주문 ID
	 * @return { success, released_count }
	 */
	public Map<String, Object> deallocateShipmentOrder(String id) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		ShipmentOrder order = this.findOrder(domainId, id);
		if (order == null) {
			throw new ElidomValidationException("주문을 찾을 수 없습니다: " + id);
		}

		if (!ShipmentOrder.STATUS_ALLOCATED.equals(order.getStatus())) {
			throw new ElidomValidationException("주문 상태가 [" + order.getStatus() + "]이므로 할당을 해제할 수 없습니다");
		}

		// 할당 레코드 조회
		String allocSql = "SELECT * FROM stock_allocations WHERE domain_id = :domainId AND shipment_order_id = :orderId AND status IN (:s1, :s2)";
		Map<String, Object> allocParams = ValueUtil.newMap("domainId,orderId,s1,s2",
				domainId, id, StockAllocation.STATUS_SOFT, StockAllocation.STATUS_HARD);
		List<StockAllocation> allocations = this.queryManager.selectListBySql(allocSql, allocParams,
				StockAllocation.class, 0, 0);

		// 각 할당 해제
		for (StockAllocation alloc : allocations) {
			// Inventory reserved_qty 복원
			this.stockTransactionService.deallocateInventory(alloc.getDomainId(), alloc.getInventoryId(),
					alloc.getAllocQty());

			// StockAllocation 상태 변경
			String updAllocSql = "UPDATE stock_allocations SET status = :status, released_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :allocId";
			Map<String, Object> updAllocParams = ValueUtil.newMap("status,now,domainId,allocId",
					StockAllocation.STATUS_CANCELLED, now, domainId, alloc.getId());
			this.queryManager.executeBySql(updAllocSql, updAllocParams);
		}

		// ShipmentOrderItem alloc_qty 초기화
		String updItemsSql = "UPDATE shipment_order_items SET alloc_qty = 0, short_qty = order_qty, updated_at = now() WHERE domain_id = :domainId AND shipment_order_id = :orderId";
		Map<String, Object> updItemsParams = ValueUtil.newMap("domainId,orderId", domainId, id);
		this.queryManager.executeBySql(updItemsSql, updItemsParams);

		// 주문 헤더 상태 복원
		String updOrderSql = "UPDATE shipment_orders SET status = :status, total_alloc = 0, allocated_at = null, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updOrderParams = ValueUtil.newMap("status,domainId,id",
				ShipmentOrder.STATUS_CONFIRMED, domainId, id);
		this.queryManager.executeBySql(updOrderSql, updOrderParams);

		// 결과 리턴
		return ValueUtil.newMap("success,released_count", true, allocations.size());
	}

	/**
	 * 출하 주문 취소 (REGISTERED/CONFIRMED/ALLOCATED/BACK_ORDER/WAVED/RELEASED 상태만 가능)
	 *
	 * 피킹 처리 이후(PICKING/PACKING/SHIPPED/CLOSED) 상태는 취소 불가.
	 * 상태별 추가 처리:
	 *   - ALLOCATED/BACK_ORDER: stock_allocations 해제
	 *   - CONFIRMED: confirmed_at 초기화
	 *   - WAVED/RELEASED: wave_no 초기화 (웨이브 정합성 유지)
	 *
	 * @param ids 주문 ID 리스트
	 * @return { success_count, fail_count, errors }
	 */
	public Map<String, Object> cancelShipmentOrders(List<String> ids) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();
		int successCount = 0;
		int failCount = 0;
		List<String> errors = new ArrayList<>();

		for (String id : ids) {
			ShipmentOrder order = this.findOrder(domainId, id);
			if (order == null) {
				errors.add("주문을 찾을 수 없습니다: " + id);
				failCount++;
				continue;
			}

			String status = order.getStatus();

			// 피킹 이후 상태는 취소 불가
			if (ShipmentOrder.STATUS_PICKING.equals(status)
					|| ShipmentOrder.STATUS_PACKING.equals(status)
					|| ShipmentOrder.STATUS_SHIPPED.equals(status)
					|| ShipmentOrder.STATUS_CLOSED.equals(status)
					|| ShipmentOrder.STATUS_CANCELLED.equals(status)) {
				errors.add("주문 [" + order.getShipmentNo() + "] 상태가 [" + status + "]이므로 취소할 수 없습니다");
				failCount++;
				continue;
			}

			// ALLOCATED/BACK_ORDER: stock_allocations 해제
			if (ShipmentOrder.STATUS_ALLOCATED.equals(status) || ShipmentOrder.STATUS_BACK_ORDER.equals(status)) {
				String allocSql = "SELECT * FROM stock_allocations WHERE domain_id = :domainId AND shipment_order_id = :orderId AND status IN (:s1, :s2)";
				Map<String, Object> allocParams = ValueUtil.newMap("domainId,orderId,s1,s2",
						domainId, id, StockAllocation.STATUS_SOFT, StockAllocation.STATUS_HARD);
				List<StockAllocation> allocations = this.queryManager.selectListBySql(allocSql, allocParams,
						StockAllocation.class, 0, 0);

				for (StockAllocation alloc : allocations) {
					this.stockTransactionService.deallocateInventory(domainId, alloc.getInventoryId(), alloc.getAllocQty());

					String updAllocSql = "UPDATE stock_allocations SET status = :status, released_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :allocId";
					Map<String, Object> updAllocParams = ValueUtil.newMap("status,now,domainId,allocId",
							StockAllocation.STATUS_CANCELLED, now, domainId, alloc.getId());
					this.queryManager.executeBySql(updAllocSql, updAllocParams);
				}
			}

			// 주문 취소 — 상태별 타임스탬프/wave_no 초기화 포함
			StringBuilder updSql = new StringBuilder(
					"UPDATE shipment_orders SET status = :status, updated_at = now()");
			if (ShipmentOrder.STATUS_CONFIRMED.equals(status)) {
				updSql.append(", confirmed_at = null");
			}
			if (ShipmentOrder.STATUS_WAVED.equals(status) || ShipmentOrder.STATUS_RELEASED.equals(status)) {
				updSql.append(", wave_no = null");
			}
			updSql.append(" WHERE domain_id = :domainId AND id = :id");

			Map<String, Object> updParams = ValueUtil.newMap("status,domainId,id",
					ShipmentOrder.STATUS_CANCELLED, domainId, id);
			this.queryManager.executeBySql(updSql.toString(), updParams);
			successCount++;
		}

		// 결과 리턴
		return ValueUtil.newMap("success_count,fail_count,errors", successCount, failCount, errors);
	}

	/**
	 * 출하 주문 마감 (SHIPPED → CLOSED)
	 *
	 * 재고 최종 차감: inv_qty 감소 + reserved_qty 해제 + stock_allocations RELEASED 처리
	 *
	 * @param id 주문 ID
	 * @return { success, released_count }
	 */
	public Map<String, Object> closeShipmentOrder(String id) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		ShipmentOrder order = this.findOrder(domainId, id);
		if (order == null) {
			throw new ElidomValidationException("주문을 찾을 수 없습니다: " + id);
		}

		if (!ShipmentOrder.STATUS_SHIPPED.equals(order.getStatus())) {
			throw new ElidomValidationException("주문 상태가 [" + order.getStatus() + "]이므로 마감할 수 없습니다");
		}

		// 할당 레코드 조회 후 재고 최종 차감
		String allocSql = "SELECT * FROM stock_allocations WHERE domain_id = :domainId AND shipment_order_id = :orderId AND status IN (:s1, :s2)";
		Map<String, Object> allocParams = ValueUtil.newMap("domainId,orderId,s1,s2",
				domainId, id, StockAllocation.STATUS_SOFT, StockAllocation.STATUS_HARD);
		List<StockAllocation> allocations = this.queryManager.selectListBySql(allocSql, allocParams,
				StockAllocation.class, 0, 0);

		for (StockAllocation alloc : allocations) {
			double allocQty = alloc.getAllocQty() != null ? alloc.getAllocQty() : 0;
			if (allocQty <= 0 || alloc.getInventoryId() == null)
				continue;

			// inv_qty 차감 + reserved_qty 해제
			this.stockTransactionService.closeShipmentInventory(alloc.getDomainId(), alloc.getInventoryId(), allocQty,
					order.getShipmentNo());

			// stock_allocations 상태 RELEASED로 변경
			String updAllocSql = "UPDATE stock_allocations SET status = :status, released_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :allocId";
			Map<String, Object> updAllocParams = ValueUtil.newMap("status,now,domainId,allocId",
					StockAllocation.STATUS_RELEASED, now, domainId, alloc.getId());
			this.queryManager.executeBySql(updAllocSql, updAllocParams);
		}

		// 주문 상태 마감으로 변경
		String sql = "UPDATE shipment_orders SET status = :status, closed_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,now,domainId,id",
				ShipmentOrder.STATUS_CLOSED, now, domainId, id);
		this.queryManager.executeBySql(sql, params);

		// 결과 리턴
		return ValueUtil.newMap("success,released_count", true, allocations.size());
	}

	/**
	 * 출하 주문 마감 취소 (CLOSED → SHIPPED)
	 *
	 * 마감으로 차감된 재고(inv_qty)를 복원하고 할당 예약(reserved_qty)을 재설정한다.
	 * stock_allocations는 RELEASED → HARD로 복귀하여 재마감이 가능하게 한다.
	 *
	 * @param id 주문 ID
	 * @return { success, restored_count }
	 */
	public Map<String, Object> cancelCloseShipmentOrder(String id) {
		Long domainId = Domain.currentDomainId();

		ShipmentOrder order = this.findOrder(domainId, id);
		if (order == null) {
			throw new ElidomValidationException("주문을 찾을 수 없습니다: " + id);
		}

		if (!ShipmentOrder.STATUS_CLOSED.equals(order.getStatus())) {
			throw new ElidomValidationException("주문 상태가 [" + order.getStatus() + "]이므로 마감 취소할 수 없습니다 (CLOSED 상태만 가능)");
		}

		// 마감 처리된 할당 레코드(RELEASED) 조회
		String allocSql = "SELECT * FROM stock_allocations WHERE domain_id = :domainId AND shipment_order_id = :orderId AND status = :status";
		Map<String, Object> allocParams = ValueUtil.newMap("domainId,orderId,status",
				domainId, id, StockAllocation.STATUS_RELEASED);
		List<StockAllocation> allocations = this.queryManager.selectListBySql(allocSql, allocParams,
				StockAllocation.class, 0, 0);

		for (StockAllocation alloc : allocations) {
			double allocQty = alloc.getAllocQty() != null ? alloc.getAllocQty() : 0;
			if (allocQty <= 0 || alloc.getInventoryId() == null) continue;

			// inv_qty 복원(증가) + reserved_qty 재설정
			String updInvSql = "UPDATE inventories"
					+ " SET inv_qty = inv_qty + :qty,"
					+ "     reserved_qty = COALESCE(reserved_qty, 0) + :qty,"
					+ "     updated_at = now()"
					+ " WHERE domain_id = :domainId AND id = :invId";
			Map<String, Object> updInvParams = ValueUtil.newMap("qty,domainId,invId", allocQty, domainId, alloc.getInventoryId());
			this.queryManager.executeBySql(updInvSql, updInvParams);

			// stock_allocations RELEASED → HARD 복귀 (재마감 가능)
			String updAllocSql = "UPDATE stock_allocations SET status = :status, released_at = null, updated_at = now() WHERE domain_id = :domainId AND id = :allocId";
			Map<String, Object> updAllocParams = ValueUtil.newMap("status,domainId,allocId",
					StockAllocation.STATUS_HARD, domainId, alloc.getId());
			this.queryManager.executeBySql(updAllocSql, updAllocParams);
		}

		// 주문 상태 SHIPPED로 복귀
		String sql = "UPDATE shipment_orders SET status = :status, closed_at = null, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("status,domainId,id",
				ShipmentOrder.STATUS_SHIPPED, domainId, id);
		this.queryManager.executeBySql(sql, params);

		// 결과 리턴
		return ValueUtil.newMap("success,restored_count", true, allocations.size());
	}

	/*
	 * ============================================================
	 * 내부 유틸리티
	 * ============================================================
	 */

	/**
	 * 주문 단건 조회
	 */
	private ShipmentOrder findOrder(Long domainId, String id) {
		ShipmentOrder condition = new ShipmentOrder(id);
		condition.setDomainId(domainId);
		return this.queryManager.select(condition);
	}
}
