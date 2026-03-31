package operato.wms.fulfillment.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import operato.wms.fulfillment.entity.PackingOrder;
import operato.wms.fulfillment.entity.PackingOrderItem;
import operato.wms.fulfillment.entity.PickingTask;
import operato.wms.fulfillment.entity.PickingTaskItem;
import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.oms.entity.ShipmentOrderItem;
import operato.wms.oms.entity.StockAllocation;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.anythings.sys.util.AnyOrmUtil;
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

	@Autowired
	private FulfillmentPickingService pickingService;

	@Autowired
	private FulfillmentPackingService packingService;

	@Autowired
	private FulfillmentShippingService shippingService;

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
	@SuppressWarnings("unchecked")
	public Map<String, Object> createPickingTasks(Map<String, Object> params) {
		Long domainId = Domain.currentDomainId();
		String today = DateUtil.todayStr();
		String now = DateUtil.currentTimeStr();

		String waveNo = params.get("wave_no") != null ? params.get("wave_no").toString() : null;
		String pickType = params.get("pick_type") != null ? params.get("pick_type").toString() : "INDIVIDUAL";
		String pickMethod = params.get("pick_method") != null ? params.get("pick_method").toString() : "PICK";

		if (ValueUtil.isEmpty(waveNo)) {
			throw new RuntimeException("wave_no는 필수 파라미터입니다");
		}

		// 웨이브에 포함된 RELEASED 상태의 주문 조회
		String orderSql = "SELECT * FROM shipment_orders WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :status ORDER BY priority_cd, shipment_no";
		Map<String, Object> orderParams = ValueUtil.newMap("domainId,waveNo,status", domainId, waveNo,
				ShipmentOrder.STATUS_RELEASED);
		List<ShipmentOrder> orders = this.queryManager.selectListBySql(orderSql, orderParams, ShipmentOrder.class, 0,
				0);

		if (orders.isEmpty()) {
			throw new RuntimeException("웨이브 [" + waveNo + "]에 릴리스된 주문이 없습니다");
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
				task.setPickMethod(pickMethod);
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
			task.setPickMethod(pickMethod);
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
			throw new RuntimeException("피킹 지시 상태가 [" + task.getStatus() + "]이므로 패킹 지시를 생성할 수 없습니다 (COMPLETED 상태만 가능)");
		}

		if (!"INDIVIDUAL".equals(task.getPickType())) {
			throw new RuntimeException("개별 피킹만 이 메서드로 패킹 지시를 생성할 수 있습니다. 총량 피킹은 createPackingOrdersFromBatch를 사용하세요");
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
			throw new RuntimeException("피킹 지시 상태가 [" + task.getStatus() + "]이므로 패킹 지시를 생성할 수 없습니다 (COMPLETED 상태만 가능)");
		}

		// 웨이브에 포함된 주문 목록 조회
		String orderSql = "SELECT * FROM shipment_orders WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :status ORDER BY shipment_no";
		Map<String, Object> orderParams = ValueUtil.newMap("domainId,waveNo,status", domainId, task.getWaveNo(),
				ShipmentOrder.STATUS_PICKING);
		List<ShipmentOrder> orders = this.queryManager.selectListBySql(orderSql, orderParams, ShipmentOrder.class, 0,
				0);

		if (orders.isEmpty()) {
			throw new RuntimeException("웨이브 [" + task.getWaveNo() + "]에 PICKING 상태 주문이 없습니다");
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
			throw new RuntimeException("피킹 지시를 찾을 수 없습니다: " + id);
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
