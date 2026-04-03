package operato.wms.fulfillment.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import operato.wms.fulfillment.entity.PackingOrder;
import operato.wms.fulfillment.entity.PackingOrderItem;
import operato.wms.fulfillment.entity.PickingTask;
import operato.wms.fulfillment.entity.PickingTaskItem;
import operato.wms.oms.entity.ShipmentOrder;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.anythings.sys.util.AnyOrmUtil;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 풀필먼트 트랜잭션 서비스
 *
 * OMS 웨이브 릴리스에서 피킹/패킹까지의 오케스트레이션을 담당한다.
 *
 * @author HatioLab
 */
@Component
public class FulfillmentTransactionService extends AbstractQueryService {
	/**
	 * Logger
	 */
	private Logger logger = LoggerFactory.getLogger(FulfillmentTransactionService.class);
	/**
	 * Picking Transaction Service
	 */
	@Autowired
	private FulfillmentPickingService pickingService;
	/**
	 * Packing Transaction Service
	 */
	@Autowired
	private FulfillmentPackingService packingService;
	/**
	 * Shipping Transaction Service
	 */
	@Autowired
	private FulfillmentShippingService shippingService;
	/**
	 * Dashboard Service
	 */
	@Autowired
	private FulfillmentDashboardService dashboardService;

	/**
	 * 피킹 지시 생성 (OMS 웨이브 릴리스에서 호출)
	 *
	 * 웨이브의 주문/할당 정보를 기반으로 피킹 지시를 생성한다.
	 * pick_type에 따라 개별 피킹(INDIVIDUAL) 또는 총량 피킹(TOTAL) 지시를 생성한다.
	 *
	 * @param params { wave_no, pick_type, pick_method, orders }
	 * @return { pick_task_count, item_count, pick_tasks: [...] }
	 */
	public Map<String, Object> createPickingTasks(Map<String, Object> params) {
		Long domainId = Domain.currentDomainId();
		String today = DateUtil.todayStr();

		String waveNo = params.get("wave_no") != null ? params.get("wave_no").toString() : null;
		String pickType = params.get("pick_type") != null ? params.get("pick_type").toString() : "INDIVIDUAL";

		if (ValueUtil.isEmpty(waveNo)) {
			throw new ElidomValidationException("wave_no는 필수 파라미터입니다");
		}

		// 웨이브에 포함된 RELEASED 상태의 주문 조회
		String orderSql = "SELECT * FROM shipment_orders WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :status ORDER BY priority_cd, shipment_no";
		Map<String, Object> orderParams = ValueUtil.newMap("domainId,waveNo,status", domainId, waveNo,
				ShipmentOrder.STATUS_RELEASED);
		List<ShipmentOrder> orders = this.queryManager.selectListBySql(orderSql, orderParams, ShipmentOrder.class, 0,
				0);

		if (orders.isEmpty()) {
			throw new ElidomValidationException("웨이브 [" + waveNo + "]에 릴리스된 주문이 없습니다");
		}

		// 당일 최대 pick_task_no 시퀀스 조회
		String seqSql = "SELECT COUNT(*) FROM picking_tasks WHERE domain_id = :domainId AND order_date = :orderDate";
		Map<String, Object> seqParams = ValueUtil.newMap("domainId,orderDate", domainId, today);
		Integer existCount = this.queryManager.selectBySql(seqSql, seqParams, Integer.class);
		int nextSeq = (existCount != null ? existCount : 0) + 1;

		int pickTaskCount = 0;
		int totalItemCount = 0;
		List<Map<String, Object>> pickTaskResults = new ArrayList<>();

		if ("INDIVIDUAL".equals(pickType)) {
			// 개별 피킹: 주문 1건 = 피킹 지시 1건
			for (ShipmentOrder order : orders) {
				String pickTaskNo = "PICK-" + today.replace("-", "").substring(2) + "-"
						+ String.format("%04d", nextSeq);

				// 주문별 할당 정보 조회
				String allocSql = "SELECT sa.*, soi.sku_cd, soi.sku_nm FROM stock_allocations sa"
						+ " INNER JOIN shipment_order_items soi ON soi.domain_id = sa.domain_id AND soi.id = sa.shipment_order_item_id"
						+ " WHERE sa.domain_id = :domainId AND sa.shipment_order_id = :orderId AND sa.status IN ('SOFT','HARD')"
						+ " ORDER BY soi.line_no";
				Map<String, Object> allocParams = ValueUtil.newMap("domainId,orderId", domainId, order.getId());
				List<Map> allocations = this.queryManager.selectListBySql(allocSql, allocParams, Map.class, 0, 0);

				// PickingTask 헤더 생성
				PickingTask task = new PickingTask();
				task.setDomainId(domainId);
				task.setPickTaskNo(pickTaskNo);
				task.setWaveNo(waveNo);
				task.setShipmentOrderId(order.getId());
				task.setShipmentNo(order.getShipmentNo());
				task.setOrderDate(today);
				task.setComCd(order.getComCd());
				task.setWhCd(ValueUtil.isNotEmpty(order.getWhCd()) ? order.getWhCd() : "DEFAULT");
				task.setPickType(pickType);
				task.setPriorityCd(order.getPriorityCd());
				task.setPlanOrder(1);
				task.setPlanItem(allocations.size());

				double planTotal = 0;
				for (Map alloc : allocations) {
					Object allocQty = alloc.get("alloc_qty");
					planTotal += allocQty != null ? Double.parseDouble(allocQty.toString()) : 0;
				}
				task.setPlanTotal(planTotal);
				task.setResultOrder(0);
				task.setResultItem(0);
				task.setResultTotal(0.0);
				task.setShortTotal(0.0);
				task.setStatus(PickingTask.STATUS_CREATED);
				this.queryManager.insert(task);

				// PickingTaskItem 상세 생성
				int rank = 1;
				List<PickingTaskItem> items = new ArrayList<>();
				for (Map alloc : allocations) {
					PickingTaskItem item = new PickingTaskItem();
					item.setDomainId(domainId);
					item.setPickTaskId(task.getId());
					item.setShipmentOrderId(order.getId());
					item.setShipmentOrderItemId(
							alloc.get("shipment_order_item_id") != null ? alloc.get("shipment_order_item_id").toString()
									: null);
					item.setStockAllocationId(alloc.get("id") != null ? alloc.get("id").toString() : null);
					item.setInventoryId(
							alloc.get("inventory_id") != null ? alloc.get("inventory_id").toString() : null);
					item.setRank(rank);
					item.setSkuCd(alloc.get("sku_cd") != null ? alloc.get("sku_cd").toString() : null);
					item.setSkuNm(alloc.get("sku_nm") != null ? alloc.get("sku_nm").toString() : null);
					item.setBarcode(alloc.get("barcode") != null ? alloc.get("barcode").toString() : null);
					item.setFromLocCd(alloc.get("loc_cd") != null ? alloc.get("loc_cd").toString() : "UNKNOWN");
					item.setLotNo(alloc.get("lot_no") != null ? alloc.get("lot_no").toString() : null);
					item.setExpiredDate(
							alloc.get("expired_date") != null ? alloc.get("expired_date").toString() : null);

					Object allocQty = alloc.get("alloc_qty");
					item.setOrderQty(allocQty != null ? Double.parseDouble(allocQty.toString()) : 0);
					item.setPickQty(0.0);
					item.setShortQty(0.0);
					item.setStatus(PickingTaskItem.STATUS_WAIT);
					items.add(item);
					rank++;
					totalItemCount++;
				}

				if (!items.isEmpty()) {
					AnyOrmUtil.insertBatch(items, 100);
				}

				// 주문 상태를 PICKING으로 변경
				String updOrderSql = "UPDATE shipment_orders SET status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
				Map<String, Object> updOrderParams = ValueUtil.newMap("status,domainId,id",
						ShipmentOrder.STATUS_PICKING, domainId, order.getId());
				this.queryManager.executeBySql(updOrderSql, updOrderParams);

				Map<String, Object> taskInfo = new HashMap<>();
				taskInfo.put("pick_task_no", pickTaskNo);
				taskInfo.put("shipment_no", order.getShipmentNo());
				taskInfo.put("item_count", items.size());
				taskInfo.put("plan_total", planTotal);
				pickTaskResults.add(taskInfo);

				pickTaskCount++;
				nextSeq++;
			}
		} else {
			// 총량 피킹(TOTAL): 웨이브 전체를 하나의 피킹 지시로 생성
			String pickTaskNo = "PICK-" + today.replace("-", "") + "-" + String.format("%04d", nextSeq);

			// 웨이브 내 전체 할당 정보를 SKU+로케이션 기준으로 합산 조회
			String allocSql = "SELECT sa.inventory_id, sa.loc_cd, sa.lot_no, sa.expired_date, sa.barcode,"
					+ " soi.sku_cd, soi.sku_nm, SUM(sa.alloc_qty) AS alloc_qty"
					+ " FROM stock_allocations sa"
					+ " INNER JOIN shipment_order_items soi ON soi.domain_id = sa.domain_id AND soi.id = sa.shipment_order_item_id"
					+ " INNER JOIN shipment_orders so ON so.domain_id = sa.domain_id AND so.id = sa.shipment_order_id"
					+ " WHERE sa.domain_id = :domainId AND so.wave_no = :waveNo AND sa.status IN ('SOFT','HARD')"
					+ " GROUP BY sa.inventory_id, sa.loc_cd, sa.lot_no, sa.expired_date, sa.barcode, soi.sku_cd, soi.sku_nm"
					+ " ORDER BY sa.loc_cd, soi.sku_cd";
			Map<String, Object> allocParams = ValueUtil.newMap("domainId,waveNo", domainId, waveNo);
			List<Map> allocations = this.queryManager.selectListBySql(allocSql, allocParams, Map.class, 0, 0);

			// PickingTask 헤더 생성
			PickingTask task = new PickingTask();
			task.setDomainId(domainId);
			task.setPickTaskNo(pickTaskNo);
			task.setWaveNo(waveNo);
			task.setOrderDate(today);
			task.setComCd(orders.get(0).getComCd());
			task.setWhCd(ValueUtil.isNotEmpty(orders.get(0).getWhCd()) ? orders.get(0).getWhCd() : "DEFAULT");
			task.setPickType(pickType);
			task.setPlanOrder(orders.size());
			task.setPlanItem(allocations.size());

			double planTotal = 0;
			for (Map alloc : allocations) {
				Object allocQty = alloc.get("alloc_qty");
				planTotal += allocQty != null ? Double.parseDouble(allocQty.toString()) : 0;
			}
			task.setPlanTotal(planTotal);
			task.setResultOrder(0);
			task.setResultItem(0);
			task.setResultTotal(0.0);
			task.setShortTotal(0.0);
			task.setStatus(PickingTask.STATUS_CREATED);
			this.queryManager.insert(task);

			// PickingTaskItem 상세 생성
			int rank = 1;
			List<PickingTaskItem> items = new ArrayList<>();
			for (Map alloc : allocations) {
				PickingTaskItem item = new PickingTaskItem();
				item.setDomainId(domainId);
				item.setPickTaskId(task.getId());
				item.setInventoryId(alloc.get("inventory_id") != null ? alloc.get("inventory_id").toString() : null);
				item.setRank(rank);
				item.setSkuCd(alloc.get("sku_cd") != null ? alloc.get("sku_cd").toString() : null);
				item.setSkuNm(alloc.get("sku_nm") != null ? alloc.get("sku_nm").toString() : null);
				item.setBarcode(alloc.get("barcode") != null ? alloc.get("barcode").toString() : null);
				item.setFromLocCd(alloc.get("loc_cd") != null ? alloc.get("loc_cd").toString() : "UNKNOWN");
				item.setLotNo(alloc.get("lot_no") != null ? alloc.get("lot_no").toString() : null);
				item.setExpiredDate(alloc.get("expired_date") != null ? alloc.get("expired_date").toString() : null);

				Object allocQty = alloc.get("alloc_qty");
				item.setOrderQty(allocQty != null ? Double.parseDouble(allocQty.toString()) : 0);
				item.setPickQty(0.0);
				item.setShortQty(0.0);
				item.setStatus(PickingTaskItem.STATUS_WAIT);
				items.add(item);
				rank++;
				totalItemCount++;
			}

			if (!items.isEmpty()) {
				AnyOrmUtil.insertBatch(items, 100);
			}

			// 모든 주문 상태를 PICKING으로 변경
			for (ShipmentOrder order : orders) {
				String updOrderSql = "UPDATE shipment_orders SET status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
				Map<String, Object> updOrderParams = ValueUtil.newMap("status,domainId,id",
						ShipmentOrder.STATUS_PICKING, domainId, order.getId());
				this.queryManager.executeBySql(updOrderSql, updOrderParams);
			}

			Map<String, Object> taskInfo = new HashMap<>();
			taskInfo.put("pick_task_no", pickTaskNo);
			taskInfo.put("order_count", orders.size());
			taskInfo.put("item_count", items.size());
			taskInfo.put("plan_total", planTotal);
			pickTaskResults.add(taskInfo);

			pickTaskCount = 1;
		}

		Map<String, Object> result = new HashMap<>();
		result.put("pick_task_count", pickTaskCount);
		result.put("item_count", totalItemCount);
		result.put("pick_tasks", pickTaskResults);
		return result;
	}

	/**
	 * 패킹 지시 생성 (개별 피킹 완료 후)
	 *
	 * 개별 피킹 완료 시 해당 주문에 대해 패킹 지시를 1건 생성한다.
	 *
	 * @param pickTaskId 피킹 지시 ID
	 * @return { pack_order_no, item_count }
	 */
	public Map<String, Object> createPackingOrders(String pickTaskId) {
		Long domainId = Domain.currentDomainId();
		String today = DateUtil.todayStr();

		PickingTask task = this.findPickingTask(domainId, pickTaskId);

		if (!PickingTask.STATUS_COMPLETED.equals(task.getStatus())) {
			throw new ElidomValidationException(
					"피킹 지시 상태가 [" + task.getStatus() + "]이므로 패킹 지시를 생성할 수 없습니다 (COMPLETED 상태만 가능)");
		}

		if (!"INDIVIDUAL".equals(task.getPickType())) {
			throw new ElidomValidationException(
					"개별 피킹만 이 메서드로 패킹 지시를 생성할 수 있습니다. 총량 피킹은 createPackingOrdersFromBatch를 사용하세요");
		}

		// 출하 주문 조회
		ShipmentOrder order = this.findShipmentOrder(domainId, task.getShipmentOrderId());

		// 패킹 지시 번호 채번
		String seqSql = "SELECT COUNT(*) FROM packing_orders WHERE domain_id = :domainId AND order_date = :orderDate";
		Map<String, Object> seqParams = ValueUtil.newMap("domainId,orderDate", domainId, today);
		Integer existCount = this.queryManager.selectBySql(seqSql, seqParams, Integer.class);
		int nextSeq = (existCount != null ? existCount : 0) + 1;
		String packOrderNo = "PACK-" + today.replace("-", "") + "-" + String.format("%04d", nextSeq);

		// PackingOrder 생성
		PackingOrder packOrder = new PackingOrder();
		packOrder.setDomainId(domainId);
		packOrder.setPackOrderNo(packOrderNo);
		packOrder.setPickTaskNo(task.getPickTaskNo());
		packOrder.setShipmentOrderId(task.getShipmentOrderId());
		packOrder.setShipmentNo(task.getShipmentNo());
		packOrder.setWaveNo(task.getWaveNo());
		packOrder.setOrderDate(today);
		packOrder.setComCd(task.getComCd());
		packOrder.setWhCd(task.getWhCd());
		packOrder.setCarrierCd(order != null ? order.getCarrierCd() : null);
		packOrder.setTotalBox(0);
		packOrder.setStatus(PackingOrder.STATUS_CREATED);
		this.queryManager.insert(packOrder);

		// 피킹 실적에서 PackingOrderItem 생성
		String pickItemSql = "SELECT * FROM picking_task_items WHERE domain_id = :domainId AND pick_task_id = :pickTaskId AND status = :status ORDER BY rank";
		Map<String, Object> pickItemParams = ValueUtil.newMap("domainId,pickTaskId,status", domainId, pickTaskId,
				PickingTaskItem.STATUS_PICKED);
		List<PickingTaskItem> pickedItems = this.queryManager.selectListBySql(pickItemSql, pickItemParams,
				PickingTaskItem.class, 0, 0);

		List<PackingOrderItem> packItems = new ArrayList<>();
		for (PickingTaskItem pti : pickedItems) {
			PackingOrderItem poi = new PackingOrderItem();
			poi.setDomainId(domainId);
			poi.setPackingOrderId(packOrder.getId());
			poi.setShipmentOrderItemId(pti.getShipmentOrderItemId());
			poi.setSkuCd(pti.getSkuCd());
			poi.setSkuNm(pti.getSkuNm());
			poi.setBarcode(pti.getBarcode());
			poi.setLotNo(pti.getLotNo());
			poi.setExpiredDate(pti.getExpiredDate());
			poi.setOrderQty(pti.getPickQty());
			poi.setInspQty(0.0);
			poi.setPackQty(0.0);
			poi.setShortQty(0.0);
			poi.setStatus(PackingOrderItem.STATUS_WAIT);
			packItems.add(poi);
		}

		if (!packItems.isEmpty()) {
			AnyOrmUtil.insertBatch(packItems, 100);
		}

		// 출하 주문 상태를 PACKING으로 변경
		if (order != null) {
			String updOrderSql = "UPDATE shipment_orders SET status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> updOrderParams = ValueUtil.newMap("status,domainId,id", ShipmentOrder.STATUS_PACKING,
					domainId, order.getId());
			this.queryManager.executeBySql(updOrderSql, updOrderParams);
		}

		Map<String, Object> result = new HashMap<>();
		result.put("pack_order_no", packOrderNo);
		result.put("item_count", packItems.size());
		return result;
	}

	/**
	 * 패킹 지시 생성 (배치/총량 피킹 완료 후)
	 *
	 * 총량 피킹 완료 시 웨이브에 포함된 각 주문별로 패킹 지시를 생성한다.
	 *
	 * @param pickTaskId 피킹 지시 ID
	 * @return { pack_order_count, total_item_count, pack_orders: [...] }
	 */
	public Map<String, Object> createPackingOrdersFromBatch(String pickTaskId) {
		Long domainId = Domain.currentDomainId();
		String today = DateUtil.todayStr();

		PickingTask task = this.findPickingTask(domainId, pickTaskId);

		if (!PickingTask.STATUS_COMPLETED.equals(task.getStatus())) {
			throw new ElidomValidationException(
					"피킹 지시 상태가 [" + task.getStatus() + "]이므로 패킹 지시를 생성할 수 없습니다 (COMPLETED 상태만 가능)");
		}

		// 웨이브에 포함된 주문 목록 조회
		String orderSql = "SELECT * FROM shipment_orders WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :status ORDER BY shipment_no";
		Map<String, Object> orderParams = ValueUtil.newMap("domainId,waveNo,status", domainId, task.getWaveNo(),
				ShipmentOrder.STATUS_PICKING);
		List<ShipmentOrder> orders = this.queryManager.selectListBySql(orderSql, orderParams, ShipmentOrder.class, 0,
				0);

		if (orders.isEmpty()) {
			throw new ElidomValidationException("웨이브 [" + task.getWaveNo() + "]에 PICKING 상태 주문이 없습니다");
		}

		// 패킹 지시 번호 시퀀스 조회
		String seqSql = "SELECT COUNT(*) FROM packing_orders WHERE domain_id = :domainId AND order_date = :orderDate";
		Map<String, Object> seqParams = ValueUtil.newMap("domainId,orderDate", domainId, today);
		Integer existCount = this.queryManager.selectBySql(seqSql, seqParams, Integer.class);
		int nextSeq = (existCount != null ? existCount : 0) + 1;

		int packOrderCount = 0;
		int totalItemCount = 0;
		List<Map<String, Object>> packOrderResults = new ArrayList<>();

		for (ShipmentOrder order : orders) {
			String packOrderNo = "PACK-" + today.replace("-", "") + "-" + String.format("%04d", nextSeq);

			// 주문별 할당 정보 조회
			String allocSql = "SELECT sa.*, soi.sku_cd, soi.sku_nm, soi.id AS soi_id"
					+ " FROM stock_allocations sa"
					+ " INNER JOIN shipment_order_items soi ON soi.domain_id = sa.domain_id AND soi.id = sa.shipment_order_item_id"
					+ " WHERE sa.domain_id = :domainId AND sa.shipment_order_id = :orderId AND sa.status IN ('SOFT','HARD')"
					+ " ORDER BY soi.line_no";
			Map<String, Object> allocParams = ValueUtil.newMap("domainId,orderId", domainId, order.getId());
			List<Map> allocations = this.queryManager.selectListBySql(allocSql, allocParams, Map.class, 0, 0);

			// PackingOrder 생성
			PackingOrder packOrder = new PackingOrder();
			packOrder.setDomainId(domainId);
			packOrder.setPackOrderNo(packOrderNo);
			packOrder.setPickTaskNo(task.getPickTaskNo());
			packOrder.setShipmentOrderId(order.getId());
			packOrder.setShipmentNo(order.getShipmentNo());
			packOrder.setWaveNo(task.getWaveNo());
			packOrder.setOrderDate(today);
			packOrder.setComCd(order.getComCd());
			packOrder.setWhCd(ValueUtil.isNotEmpty(order.getWhCd()) ? order.getWhCd() : "DEFAULT");
			packOrder.setCarrierCd(order.getCarrierCd());
			packOrder.setTotalBox(0);
			packOrder.setStatus(PackingOrder.STATUS_CREATED);
			this.queryManager.insert(packOrder);

			// PackingOrderItem 생성
			List<PackingOrderItem> packItems = new ArrayList<>();
			for (Map alloc : allocations) {
				PackingOrderItem poi = new PackingOrderItem();
				poi.setDomainId(domainId);
				poi.setPackingOrderId(packOrder.getId());
				poi.setShipmentOrderItemId(alloc.get("soi_id") != null ? alloc.get("soi_id").toString() : null);
				poi.setSkuCd(alloc.get("sku_cd") != null ? alloc.get("sku_cd").toString() : null);
				poi.setSkuNm(alloc.get("sku_nm") != null ? alloc.get("sku_nm").toString() : null);
				poi.setBarcode(alloc.get("barcode") != null ? alloc.get("barcode").toString() : null);
				poi.setLotNo(alloc.get("lot_no") != null ? alloc.get("lot_no").toString() : null);
				poi.setExpiredDate(alloc.get("expired_date") != null ? alloc.get("expired_date").toString() : null);

				Object allocQty = alloc.get("alloc_qty");
				poi.setOrderQty(allocQty != null ? Double.parseDouble(allocQty.toString()) : 0);
				poi.setInspQty(0.0);
				poi.setPackQty(0.0);
				poi.setShortQty(0.0);
				poi.setStatus(PackingOrderItem.STATUS_WAIT);
				packItems.add(poi);
				totalItemCount++;
			}

			if (!packItems.isEmpty()) {
				AnyOrmUtil.insertBatch(packItems, 100);
			}

			// 주문 상태를 PACKING으로 변경
			String updOrderSql = "UPDATE shipment_orders SET status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> updOrderParams = ValueUtil.newMap("status,domainId,id", ShipmentOrder.STATUS_PACKING,
					domainId, order.getId());
			this.queryManager.executeBySql(updOrderSql, updOrderParams);

			Map<String, Object> packInfo = new HashMap<>();
			packInfo.put("pack_order_no", packOrderNo);
			packInfo.put("shipment_no", order.getShipmentNo());
			packInfo.put("item_count", packItems.size());
			packOrderResults.add(packInfo);

			packOrderCount++;
			nextSeq++;
		}

		Map<String, Object> result = new HashMap<>();
		result.put("pack_order_count", packOrderCount);
		result.put("total_item_count", totalItemCount);
		result.put("pack_orders", packOrderResults);
		return result;
	}

	/**
	 * 웨이브별 피킹 지시 삭제 (웨이브 확정 취소 시)
	 *
	 * 웨이브 확정 취소 시 해당 웨이브의 모든 피킹 지시를 삭제한다.
	 *
	 * 삭제 조건:
	 * - 모든 피킹 지시가 WAIT 상태여야 함
	 * - 하나라도 IN_PROGRESS/COMPLETED 상태면 예외 발생
	 *
	 * @param params { wave_no }
	 * @return { deleted_task_count, deleted_item_count }
	 */
	public Map<String, Object> deletePickingTasksByWave(Map<String, Object> params) {
		Long domainId = Domain.currentDomainId();
		String waveNo = params.get("wave_no") != null ? params.get("wave_no").toString() : null;

		if (ValueUtil.isEmpty(waveNo)) {
			throw new ElidomValidationException("wave_no는 필수 파라미터입니다");
		}

		// 1. 웨이브에 속한 모든 피킹 지시 조회
		String findTasksSql = "SELECT * FROM picking_tasks WHERE domain_id = :domainId AND wave_no = :waveNo";
		Map<String, Object> findParams = ValueUtil.newMap("domainId,waveNo", domainId, waveNo);
		List<PickingTask> tasks = this.queryManager.selectListBySql(findTasksSql, findParams, PickingTask.class, 0, 0);

		if (tasks.isEmpty()) {
			// 피킹 지시가 없으면 정상 처리 (이미 삭제되었거나 아직 생성 전)
			Map<String, Object> result = new HashMap<>();
			result.put("deleted_task_count", 0);
			result.put("deleted_item_count", 0);
			return result;
		}

		// 2. 모든 피킹 지시가 WAIT 상태인지 확인
		for (PickingTask task : tasks) {
			if (!PickingTask.STATUS_CREATED.equals(task.getStatus())) {
				throw new ElidomValidationException(String.format(
						"피킹 지시 [%s]가 WAIT 상태가 아니므로 삭제할 수 없습니다 (현재 상태: %s)",
						task.getPickTaskNo(), task.getStatus()));
			}
		}

		// 3. 피킹 지시 아이템 개수 조회 (삭제 전 카운트)
		String countItemsSql = "SELECT COUNT(*) FROM picking_task_items WHERE domain_id = :domainId AND pick_task_id IN ("
				+
				tasks.stream().map(t -> "'" + t.getId() + "'").collect(java.util.stream.Collectors.joining(",")) + ")";
		Integer itemCount = this.queryManager.selectBySql(countItemsSql, ValueUtil.newMap("domainId", domainId),
				Integer.class);

		// 4. 피킹 지시 아이템 삭제
		String delItemsSql = "DELETE FROM picking_task_items WHERE domain_id = :domainId AND pick_task_id IN (" +
				tasks.stream().map(t -> "'" + t.getId() + "'").collect(java.util.stream.Collectors.joining(",")) + ")";
		this.queryManager.executeBySql(delItemsSql, ValueUtil.newMap("domainId", domainId));

		// 5. 피킹 지시 삭제
		String delTasksSql = "DELETE FROM picking_tasks WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :status";
		Map<String, Object> delParams = ValueUtil.newMap("domainId,waveNo,status", domainId, waveNo,
				PickingTask.STATUS_CREATED);
		this.queryManager.executeBySql(delTasksSql, delParams);

		// 6. 주문 상태 원복: PICKING → CREATED
		String updOrdersSql = "UPDATE shipment_orders SET status = :newStatus, updated_at = now() " +
				"WHERE domain_id = :domainId AND wave_no = :waveNo AND status IN (:oldStatuses)";
		Map<String, Object> updOrdersParams = ValueUtil.newMap("domainId,waveNo,oldStatuses,newStatus",
				domainId, waveNo, java.util.Arrays.asList(ShipmentOrder.STATUS_RELEASED, ShipmentOrder.STATUS_PICKING),
				ShipmentOrder.STATUS_WAVED);
		this.queryManager.executeBySql(updOrdersSql, updOrdersParams);

		Map<String, Object> result = new HashMap<>();
		result.put("deleted_task_count", tasks.size());
		result.put("deleted_item_count", itemCount != null ? itemCount : 0);
		return result;
	}

	/**
	 * 피킹 지시 완료 및 포장 지시 자동 생성
	 *
	 * 피킹 지시를 완료(COMPLETED)하고, 해당 웨이브의 insp_flag가 true이면
	 * 포장 지시(PackingOrder)를 자동 생성한다.
	 *
	 * @param pickTaskId 피킹 지시 ID
	 * @return { success, pick_task_no, status, packing_created, pack_order_no, ...
	 *         }
	 */
	public Map<String, Object> completePickingTaskWithPacking(String pickTaskId) {
		Long domainId = Domain.currentDomainId();

		// 1. 피킹 지시 완료
		Map<String, Object> result = this.pickingService.completePickingTask(pickTaskId);

		// 2. 피킹 지시에서 wave_no, pick_type 조회
		PickingTask task = this.findPickingTask(domainId, pickTaskId);

		// 3. 웨이브의 insp_flag 확인
		boolean inspFlag = false;
		if (ValueUtil.isNotEmpty(task.getWaveNo())) {
			String waveSql = "SELECT insp_flag FROM shipment_waves WHERE domain_id = :domainId AND wave_no = :waveNo";
			Map<String, Object> waveParams = ValueUtil.newMap("domainId,waveNo", domainId, task.getWaveNo());
			Boolean flag = this.queryManager.selectBySql(waveSql, waveParams, Boolean.class);
			inspFlag = flag != null && flag;
		}

		// 4. insp_flag가 true이면 포장 지시 자동 생성
		if (inspFlag) {
			try {
				if ("INDIVIDUAL".equals(task.getPickType())) {
					Map<String, Object> packResult = this.createPackingOrders(pickTaskId);
					result.put("packing_created", true);
					result.put("pack_order_no", packResult.get("pack_order_no"));
					result.put("pack_item_count", packResult.get("item_count"));
				} else {
					Map<String, Object> packResult = this.createPackingOrdersFromBatch(pickTaskId);
					result.put("packing_created", true);
					result.put("pack_order_count", packResult.get("pack_order_count"));
					result.put("pack_total_item_count", packResult.get("total_item_count"));
				}

				this.logger.info(String.format(
						"[Fulfillment] 피킹 완료 → 포장 지시 자동 생성 - pick_task_no: %s, wave_no: %s",
						task.getPickTaskNo(), task.getWaveNo()));
			} catch (Exception e) {
				this.logger.error(String.format(
						"[Fulfillment] 포장 지시 자동 생성 실패 - pick_task_no: %s, error: %s",
						task.getPickTaskNo(), e.getMessage()));
				result.put("packing_created", false);
				result.put("packing_error", e.getMessage());
			}
		} else {
			result.put("packing_created", false);
		}

		return result;
	}

	/**
	 * 피킹 완료 후 취소 (COMPLETED → CANCELLED)
	 *
	 * 피킹 완료 상태의 피킹 지시를 취소하고, 자동 생성된 포장 지시도 함께 삭제한다.
	 *
	 * 취소 조건:
	 * - 피킹 지시가 COMPLETED 상태여야 함
	 * - 해당 웨이브가 COMPLETED 상태가 아니어야 함
	 * - 관련 포장 지시가 모두 CREATED 상태여야 함 (IN_PROGRESS 이후는 취소 불가)
	 *
	 * 취소 시 처리:
	 * 1. 관련 포장 지시 아이템/포장 지시 삭제
	 * 2. 피킹 지시 아이템 상태 → CANCEL, 실적 수량 초기화
	 * 3. 피킹 지시 상태 → CANCELLED
	 * 4. 출하 주문 상태 → RELEASED (재피킹 가능)
	 *
	 * @param pickTaskId 피킹 지시 ID
	 * @return { success, pick_task_no, cancelled_pack_order_count,
	 *         reverted_order_count }
	 */
	public Map<String, Object> cancelCompletedPickingTask(String pickTaskId) {
		Long domainId = Domain.currentDomainId();

		// 1. 피킹 지시 조회 및 상태 확인
		PickingTask task = this.findPickingTask(domainId, pickTaskId);

		if (!PickingTask.STATUS_COMPLETED.equals(task.getStatus())) {
			throw new ElidomValidationException(
					"피킹 지시 상태가 [" + task.getStatus() + "]이므로 완료 후 취소할 수 없습니다 (COMPLETED 상태만 가능)");
		}

		// 2. 웨이브 상태 확인 (COMPLETED이면 취소 불가)
		if (ValueUtil.isNotEmpty(task.getWaveNo())) {
			String waveSql = "SELECT status FROM shipment_waves WHERE domain_id = :domainId AND wave_no = :waveNo";
			Map<String, Object> waveParams = ValueUtil.newMap("domainId,waveNo", domainId, task.getWaveNo());
			String waveStatus = this.queryManager.selectBySql(waveSql, waveParams, String.class);

			if ("COMPLETED".equals(waveStatus)) {
				throw new ElidomValidationException("웨이브 [" + task.getWaveNo() + "]가 이미 완료되어 피킹을 취소할 수 없습니다");
			}
		}

		// 3. 관련 포장 지시 조회 및 상태 확인
		String packSql = "SELECT * FROM packing_orders WHERE domain_id = :domainId AND pick_task_no = :pickTaskNo";
		Map<String, Object> packParams = ValueUtil.newMap("domainId,pickTaskNo", domainId, task.getPickTaskNo());
		List<PackingOrder> packOrders = this.queryManager.selectListBySql(packSql, packParams, PackingOrder.class, 0,
				0);

		for (PackingOrder po : packOrders) {
			if (!PackingOrder.STATUS_CREATED.equals(po.getStatus())) {
				throw new ElidomValidationException(
						"포장 지시 [" + po.getPackOrderNo() + "]가 이미 처리 중이므로 피킹을 취소할 수 없습니다 (현재 상태: " + po.getStatus()
								+ ")");
			}
		}

		// 4. 포장 지시 아이템 및 포장 지시 삭제
		int cancelledPackOrderCount = 0;
		int cancelledPackItemCount = 0;

		for (PackingOrder po : packOrders) {
			String countSql = "SELECT COUNT(*) FROM packing_order_items WHERE domain_id = :domainId AND packing_order_id = :packingOrderId";
			Map<String, Object> countParams = ValueUtil.newMap("domainId,packingOrderId", domainId, po.getId());
			Integer itemCount = this.queryManager.selectBySql(countSql, countParams, Integer.class);
			cancelledPackItemCount += (itemCount != null ? itemCount : 0);

			String delItemsSql = "DELETE FROM packing_order_items WHERE domain_id = :domainId AND packing_order_id = :packingOrderId";
			this.queryManager.executeBySql(delItemsSql, countParams);

			String delPackSql = "DELETE FROM packing_orders WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> delPackParams = ValueUtil.newMap("domainId,id", domainId, po.getId());
			this.queryManager.executeBySql(delPackSql, delPackParams);

			cancelledPackOrderCount++;
		}

		// 5. 피킹 지시 아이템 상태 변경 (PICKED/SHORT → CANCEL, 실적 초기화)
		String updItemsSql = "UPDATE picking_task_items SET status = :newStatus, pick_qty = 0, short_qty = 0, picked_at = NULL, updated_at = now()"
				+ " WHERE domain_id = :domainId AND pick_task_id = :pickTaskId AND status IN (:s1, :s2)";
		Map<String, Object> updItemsParams = ValueUtil.newMap("newStatus,domainId,pickTaskId,s1,s2",
				PickingTaskItem.STATUS_CANCEL, domainId, pickTaskId,
				PickingTaskItem.STATUS_PICKED, PickingTaskItem.STATUS_SHORT);
		this.queryManager.executeBySql(updItemsSql, updItemsParams);

		// 6. 피킹 지시 상태 변경 (COMPLETED → CANCELLED, 실적 초기화)
		String updTaskSql = "UPDATE picking_tasks SET status = :status,"
				+ " result_order = 0, result_item = 0, result_total = 0, short_total = 0,"
				+ " completed_at = NULL, updated_at = now()"
				+ " WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updTaskParams = ValueUtil.newMap("status,domainId,id",
				PickingTask.STATUS_CANCELLED, domainId, pickTaskId);
		this.queryManager.executeBySql(updTaskSql, updTaskParams);

		// 7. 출하 주문 상태 원복 (PACKING/PICKING → RELEASED)
		int revertedOrderCount = 0;
		if ("INDIVIDUAL".equals(task.getPickType())) {
			if (ValueUtil.isNotEmpty(task.getShipmentOrderId())) {
				String updOrderSql = "UPDATE shipment_orders SET status = :newStatus, updated_at = now()"
						+ " WHERE domain_id = :domainId AND id = :orderId AND status IN (:s1, :s2)";
				Map<String, Object> updOrderParams = ValueUtil.newMap("newStatus,domainId,orderId,s1,s2",
						ShipmentOrder.STATUS_RELEASED, domainId, task.getShipmentOrderId(),
						ShipmentOrder.STATUS_PICKING, ShipmentOrder.STATUS_PACKING);
				this.queryManager.executeBySql(updOrderSql, updOrderParams);
				revertedOrderCount = 1;
			}
		} else {
			String updOrdersSql = "UPDATE shipment_orders SET status = :newStatus, updated_at = now()"
					+ " WHERE domain_id = :domainId AND wave_no = :waveNo AND status IN (:s1, :s2)";
			Map<String, Object> updOrdersParams = ValueUtil.newMap("newStatus,domainId,waveNo,s1,s2",
					ShipmentOrder.STATUS_RELEASED, domainId, task.getWaveNo(),
					ShipmentOrder.STATUS_PICKING, ShipmentOrder.STATUS_PACKING);
			this.queryManager.executeBySql(updOrdersSql, updOrdersParams);

			String countOrdersSql = "SELECT COUNT(*) FROM shipment_orders WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :status";
			Map<String, Object> countOrdersParams = ValueUtil.newMap("domainId,waveNo,status",
					domainId, task.getWaveNo(), ShipmentOrder.STATUS_RELEASED);
			Integer orderCount = this.queryManager.selectBySql(countOrdersSql, countOrdersParams, Integer.class);
			revertedOrderCount = orderCount != null ? orderCount : 0;
		}

		this.logger.info(String.format(
				"[Fulfillment] 피킹 완료 후 취소 - pick_task_no: %s, cancelled_pack_orders: %d, reverted_orders: %d",
				task.getPickTaskNo(), cancelledPackOrderCount, revertedOrderCount));

		Map<String, Object> result = ValueUtil.newMap("success", true);
		result.put("pick_task_no", task.getPickTaskNo());
		result.put("cancelled_pack_order_count", cancelledPackOrderCount);
		result.put("cancelled_pack_item_count", cancelledPackItemCount);
		result.put("reverted_order_count", revertedOrderCount);
		return result;
	}

	/*
	 * ============================================================
	 * 내부 유틸리티
	 * ============================================================
	 */

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

	/**
	 * 출하 주문 단건 조회
	 */
	private ShipmentOrder findShipmentOrder(Long domainId, String id) {
		if (ValueUtil.isEmpty(id)) {
			return null;
		}
		String sql = "SELECT * FROM shipment_orders WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("domainId,id", domainId, id);
		List<ShipmentOrder> list = this.queryManager.selectListBySql(sql, params, ShipmentOrder.class, 0, 1);
		return list.isEmpty() ? null : list.get(0);
	}
}
