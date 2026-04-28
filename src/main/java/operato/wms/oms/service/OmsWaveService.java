package operato.wms.oms.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import operato.wms.common.event.WaveCancelledEvent;
import operato.wms.common.event.WaveReleasedEvent;
import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.oms.entity.ShipmentWave;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * OMS 웨이브 서비스
 *
 * 웨이브 생성, 상태 변경, 조회 등 웨이브 관련 트랜잭션을 담당한다.
 *
 * @author HatioLab
 */
@Component
public class OmsWaveService extends AbstractQueryService {

	@Autowired
	private ApplicationEventPublisher eventPublisher;

	/**
	 * 자동 웨이브 생성
	 *
	 * ALLOCATED 상태 주문을 그룹핑 기준에 따라 웨이브로 묶는다.
	 *
	 * @param params { group_by: ["carrier_cd", ...], pick_type, pick_method,
	 *               max_order_count, order_date }
	 * @return 처리 결과 { wave_count, total_orders, waves: [...] }
	 */
	@SuppressWarnings("unchecked")
	public Map<String, Object> createAutoWaves(Map<String, Object> params) {
		Long domainId = Domain.currentDomainId();
		String today = DateUtil.todayStr();

		List<String> groupBy = params.get("group_by") != null ? (List<String>) params.get("group_by")
				: new ArrayList<>();
		String pickType = ValueUtil.isNotEmpty(params.get("pick_type")) ? params.get("pick_type").toString() : "TOTAL";
		int maxOrderCount = params.get("max_order_count") != null
				? Integer.parseInt(params.get("max_order_count").toString())
				: 200;
		String orderDate = ValueUtil.isNotEmpty(params.get("order_date")) ? params.get("order_date").toString() : today;
		String whCd = ValueUtil.isNotEmpty(params.get("wh_cd")) ? params.get("wh_cd").toString() : null;
		String comCd = ValueUtil.isNotEmpty(params.get("com_cd")) ? params.get("com_cd").toString() : null;

		// 1. ALLOCATED 상태 주문 조회 (창고/화주사 필터 선택 적용)
		String orderSql = "SELECT * FROM shipment_orders WHERE domain_id = :domainId AND status = :status AND order_date = :orderDate"
				+ (whCd != null ? " AND wh_cd = :whCd" : "")
				+ (comCd != null ? " AND com_cd = :comCd" : "")
				+ " ORDER BY priority_cd, created_at";
		Map<String, Object> orderParams = ValueUtil.newMap("domainId,status,orderDate", domainId,
				ShipmentOrder.STATUS_ALLOCATED, orderDate);
		if (whCd != null) orderParams.put("whCd", whCd);
		if (comCd != null) orderParams.put("comCd", comCd);
		List<ShipmentOrder> orders = this.queryManager.selectListBySql(orderSql, orderParams, ShipmentOrder.class, 0,
				0);

		if (orders.isEmpty()) {
			Map<String, Object> emptyResult = ValueUtil.newMap("wave_count", 0);
			emptyResult.put("total_orders", 0);
			emptyResult.put("waves", new ArrayList<>());
			return emptyResult;
		}

		// 2. 그룹핑 기준에 따라 주문 분류
		Map<String, List<ShipmentOrder>> grouped = new LinkedHashMap<>();
		for (ShipmentOrder order : orders) {
			String groupKey = this.buildGroupKey(order, groupBy);
			grouped.computeIfAbsent(groupKey, k -> new ArrayList<>()).add(order);
		}

		// 3. 그룹별 웨이브 생성
		int waveCount = 0;
		int totalOrderCount = 0;
		List<Map<String, Object>> waveResults = new ArrayList<>();

		for (Map.Entry<String, List<ShipmentOrder>> entry : grouped.entrySet()) {
			List<ShipmentOrder> groupOrders = entry.getValue();

			// maxOrderCount 기준으로 분할
			for (int i = 0; i < groupOrders.size(); i += maxOrderCount) {
				List<ShipmentOrder> chunk = groupOrders.subList(i, Math.min(i + maxOrderCount, groupOrders.size()));

				// 계획 수량 집계
				int planOrderCnt = chunk.size();
				double planTotalQty = 0;

				List<String> orderIds = new ArrayList<>();
				for (ShipmentOrder ord : chunk) {
					planTotalQty += (ord.getTotalOrder() != null ? ord.getTotalOrder() : 0);
					orderIds.add(ord.getId());
				}

				// SKU 종류 집계 (주문 품목 기준)
				String skuCountSql = "SELECT COUNT(DISTINCT sku_cd) FROM shipment_order_items WHERE domain_id = :domainId AND shipment_order_id IN (:orderIds)";
				Map<String, Object> skuCountParams = ValueUtil.newMap("domainId,orderIds", domainId, orderIds);
				Integer skuCnt = this.queryManager.selectBySql(skuCountSql, skuCountParams, Integer.class);
				int planItemCnt = skuCnt != null ? skuCnt : 0;

				// 대표 택배사 (첫 번째 주문 기준)
				String carrierCd = chunk.get(0).getCarrierCd();

				// ShipmentWave 생성
				ShipmentWave wave = new ShipmentWave();
				wave.setDomainId(domainId);
				wave.setPickType(pickType);
				wave.setCarrierCd(carrierCd);
				wave.setPlanOrder(planOrderCnt);
				wave.setPlanItem(planItemCnt);
				wave.setPlanTotal(planTotalQty);
				wave.setResultOrder(0);
				wave.setResultItem(0);
				wave.setResultTotal(0.0);
				wave.setStatus(ShipmentWave.STATUS_CREATED);
				this.queryManager.insert(wave);

				// 주문에 wave_no 업데이트 및 상태 변경
				for (ShipmentOrder ord : chunk) {
					String updateSql = "UPDATE shipment_orders SET wave_no = :waveNo, status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
					Map<String, Object> updateParams = ValueUtil.newMap("waveNo,status,domainId,id", wave.getWaveNo(),
							ShipmentOrder.STATUS_WAVED, domainId, ord.getId());
					this.queryManager.executeBySql(updateSql, updateParams);
				}

				// 결과 수집
				Map<String, Object> waveInfo = ValueUtil.newMap("wave_no", wave.getWaveNo());
				waveInfo.put("wave_seq", wave.getWaveSeq());
				waveInfo.put("order_count", planOrderCnt);
				waveInfo.put("sku_count", planItemCnt);
				waveInfo.put("total_qty", planTotalQty);
				waveInfo.put("carrier_cd", carrierCd);
				waveResults.add(waveInfo);

				waveCount++;
				totalOrderCount += planOrderCnt;
			}
		}

		Map<String, Object> result = ValueUtil.newMap("wave_count", waveCount);
		result.put("total_orders", totalOrderCount);
		result.put("waves", waveResults);
		return result;
	}

	/**
	 * 수동 웨이브 생성
	 *
	 * 화면에서 직접 선택한 주문 리스트를 하나의 웨이브로 묶는다.
	 * ALLOCATED 상태의 주문만 웨이브에 포함할 수 있다.
	 *
	 * @param params { orders: [{ id, ... }], pick_type, pick_method }
	 * @return { wave_no, wave_seq, order_count, sku_count, total_qty,
	 *         skipped_count, errors }
	 */
	@SuppressWarnings("unchecked")
	public Map<String, Object> createManualWave(Map<String, Object> params) {
		// 파라미터 추출
		List<Map<String, Object>> orders = params.get("orders") != null
				? (List<Map<String, Object>>) params.get("orders")
				: new ArrayList<>();
		String pickType = ValueUtil.isNotEmpty(params.get("pick_type")) ? params.get("pick_type").toString() : "TOTAL";
		String pickMethod = ValueUtil.isNotEmpty(params.get("pick_method")) ? params.get("pick_method").toString()
				: "PICK";

		if (orders.isEmpty()) {
			throw new ElidomValidationException("웨이브에 포함할 주문을 선택해 주세요");
		}

		// 주문 ID 추출하여 주문 리스트 구성
		List<ShipmentOrder> orderList = new ArrayList<ShipmentOrder>();
		for (Map<String, Object> orderMap : orders) {
			String orderId = orderMap.get("id") != null ? orderMap.get("id").toString() : null;
			orderList.add(new ShipmentOrder(orderId));
		}

		// 주문 리스트로 웨이브 생성
		return this.createWave(orderList, pickType, pickMethod);
	}

	/**
	 * 선택된 주문으로 웨이브 생성
	 *
	 * @param list
	 * @param pickType
	 * @param pickMethod
	 * @return
	 */
	public Map<String, Object> createWave(List<ShipmentOrder> list, String pickType, String pickMethod) {
		Long domainId = Domain.currentDomainId();

		if (ValueUtil.isEmpty(list)) {
			throw new ElidomValidationException("웨이브에 포함할 주문을 선택해 주세요");
		}

		// ALLOCATED 상태 주문만 필터링
		List<ShipmentOrder> validOrders = new ArrayList<ShipmentOrder>();
		List<String> errors = new ArrayList<String>();

		for (ShipmentOrder so : list) {
			ShipmentOrder order = this.findOrder(domainId, so.getId());
			if (order == null) {
				errors.add("주문을 찾을 수 없습니다: " + so.getId());
				continue;
			}

			if (!ShipmentOrder.STATUS_ALLOCATED.equals(order.getStatus())) {
				errors.add("주문 [" + order.getShipmentNo() + "] 상태가 [" + order.getStatus()
						+ "]이므로 웨이브에 포함할 수 없습니다 (ALLOCATED 상태만 가능)");
				continue;
			}

			validOrders.add(order);
		}

		if (validOrders.isEmpty()) {
			throw new ElidomValidationException("웨이브에 포함할 수 있는 주문이 없습니다 (ALLOCATED 상태의 주문만 가능)");
		}

		// 계획 수량 집계
		int planOrderCnt = validOrders.size();
		double planTotalQty = 0;
		List<String> validOrderIds = new ArrayList<>();
		for (ShipmentOrder ord : validOrders) {
			planTotalQty += (ord.getTotalOrder() != null ? ord.getTotalOrder() : 0);
			validOrderIds.add(ord.getId());
		}

		// SKU 종류 집계
		String skuCountSql = "SELECT COUNT(DISTINCT sku_cd) FROM shipment_order_items WHERE domain_id = :domainId AND shipment_order_id IN (:orderIds)";
		Map<String, Object> skuCountParams = ValueUtil.newMap("domainId,orderIds", domainId, validOrderIds);
		Integer skuCnt = this.queryManager.selectBySql(skuCountSql, skuCountParams, Integer.class);
		int planItemCnt = skuCnt != null ? skuCnt : 0;

		// 대표 택배사 (첫 번째 주문 기준)
		String carrierCd = validOrders.get(0).getCarrierCd();

		// ShipmentWave 생성
		ShipmentWave wave = new ShipmentWave();
		wave.setDomainId(domainId);
		wave.setPickType(pickType);
		wave.setCarrierCd(carrierCd);
		wave.setPlanOrder(planOrderCnt);
		wave.setPlanItem(planItemCnt);
		wave.setPlanTotal(planTotalQty);
		wave.setResultOrder(0);
		wave.setResultItem(0);
		wave.setResultTotal(0.0);
		wave.setStatus(ShipmentWave.STATUS_CREATED);
		this.queryManager.insert(wave);

		// 주문에 wave_no 업데이트 및 상태 변경
		for (ShipmentOrder ord : validOrders) {
			String updateSql = "UPDATE shipment_orders SET wave_no = :waveNo, status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> updateParams = ValueUtil.newMap("waveNo,status,domainId,id", wave.getWaveNo(),
					ShipmentOrder.STATUS_WAVED, domainId, ord.getId());
			this.queryManager.executeBySql(updateSql, updateParams);
		}

		Map<String, Object> result = ValueUtil.newMap("wave_no", wave.getWaveNo());
		result.put("wave_seq", wave.getWaveSeq());
		result.put("order_count", planOrderCnt);
		result.put("sku_count", planItemCnt);
		result.put("total_qty", planTotalQty);
		result.put("skipped_count", list.size() - validOrders.size());
		result.put("errors", errors);
		return result;
	}

	/**
	 * 자동 웨이브 대상 건수 미리보기
	 *
	 * @param orderDate 주문일자
	 * @return { total_orders }
	 */
	public Map<String, Object> previewAutoWaveTargets(String orderDate) {
		Long domainId = Domain.currentDomainId();
		String targetDate = ValueUtil.isNotEmpty(orderDate) ? orderDate : DateUtil.todayStr();

		String sql = "SELECT COUNT(*) FROM shipment_orders WHERE domain_id = :domainId AND status = :status AND order_date = :orderDate";
		Map<String, Object> params = ValueUtil.newMap("domainId,status,orderDate", domainId,
				ShipmentOrder.STATUS_ALLOCATED, targetDate);
		Integer count = this.queryManager.selectBySql(sql, params, Integer.class);

		return ValueUtil.newMap("total_orders", count != null ? count : 0);
	}

	/**
	 * 웨이브 확정/릴리스 (CREATED → RELEASED)
	 *
	 * 웨이브 상태를 RELEASED로 변경하고, 포함된 주문을 RELEASED 상태로 전환한다.
	 *
	 * @param id 웨이브 ID
	 * @return { success, order_count }
	 */
	public Map<String, Object> releaseWave(String id) {
		Long domainId = Domain.currentDomainId();
		String now = DateUtil.currentTimeStr();

		ShipmentWave wave = this.findWave(domainId, id);
		if (wave == null) {
			throw new ElidomValidationException("웨이브를 찾을 수 없습니다: " + id);
		}

		if (!ShipmentWave.STATUS_CREATED.equals(wave.getStatus())) {
			throw new ElidomValidationException("웨이브 상태가 [" + wave.getStatus() + "]이므로 릴리스할 수 없습니다");
		}

		// 웨이브 상태 변경
		String updWaveSql = "UPDATE shipment_waves SET status = :status, released_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updWaveParams = ValueUtil.newMap("status,now,domainId,id",
				ShipmentWave.STATUS_RELEASED, now, domainId, id);
		this.queryManager.executeBySql(updWaveSql, updWaveParams);

		// 포함된 주문 상태 변경 (WAVED → RELEASED)
		String updOrdersSql = "UPDATE shipment_orders SET status = :status, released_at = :now, updated_at = now() WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :currentStatus";
		Map<String, Object> updOrdersParams = ValueUtil.newMap("status,now,domainId,waveNo,currentStatus",
				ShipmentOrder.STATUS_RELEASED, now, domainId, wave.getWaveNo(), ShipmentOrder.STATUS_WAVED);
		this.queryManager.executeBySql(updOrdersSql, updOrdersParams);

		// 변경된 주문 건수 조회
		String countSql = "SELECT COUNT(*) FROM shipment_orders WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :status";
		Map<String, Object> countParams = ValueUtil.newMap("domainId,waveNo,status",
				domainId, wave.getWaveNo(), ShipmentOrder.STATUS_RELEASED);
		Integer orderCount = this.queryManager.selectBySql(countSql, countParams, Integer.class);

		// ===== 이벤트 발행: Fulfillment 모듈에 피킹 지시 생성 트리거 =====
		WaveReleasedEvent event = new WaveReleasedEvent(
				domainId,
				id,
				wave.getWaveNo(),
				wave.getPickType(),
				wave.getWcsFlag(),
				wave.getInspFlag(),
				orderCount != null ? orderCount : 0);
		this.eventPublisher.publishEvent(event);

		// 결과 리턴
		return ValueUtil.newMap("success,order_count", true, orderCount != null ? orderCount : 0);
	}

	/**
	 * 웨이브 확정 취소 (RELEASED → CREATED)
	 *
	 * 웨이브 확정을 취소하고, 피킹 지시를 삭제하며, 주문 상태를 원복한다.
	 *
	 * 취소 가능 조건:
	 * - 웨이브 상태 = RELEASED
	 * - 모든 피킹 지시 상태 = WAIT (아직 피킹 시작 전)
	 *
	 * @param id 웨이브 ID
	 * @return { success, wave_no }
	 */
	public Map<String, Object> cancelWaveRelease(String id) {
		Long domainId = Domain.currentDomainId();

		// 1. 웨이브 조회
		ShipmentWave wave = this.findWave(domainId, id);
		if (wave == null) {
			throw new ElidomValidationException("웨이브를 찾을 수 없습니다: " + id);
		}

		// 2. 웨이브 상태 확인 (RELEASED만 취소 가능)
		if (!ShipmentWave.STATUS_RELEASED.equals(wave.getStatus())) {
			throw new ElidomValidationException(
					"RELEASED 상태의 웨이브만 확정 취소할 수 있습니다 (현재 상태: " + wave.getStatus() + ")");
		}

		// 3. Fulfillment 모듈의 피킹 지시 상태 확인
		String checkSql = "SELECT COUNT(*) FROM picking_tasks " +
				"WHERE domain_id = :domainId AND wave_no = :waveNo AND status not in ('CANCELLED', 'CREATED')";
		Map<String, Object> checkParams = ValueUtil.newMap("domainId,waveNo", domainId, wave.getWaveNo());
		Integer inProgressCount = this.queryManager.selectBySql(checkSql, checkParams, Integer.class);

		if (inProgressCount != null && inProgressCount > 0) {
			throw new ElidomValidationException(
					"피킹이 이미 진행 중인 주문이 있어 웨이브 확정을 취소할 수 없습니다 (" + inProgressCount + "건)");
		}

		// 4. 웨이브 상태 변경: RELEASED → CREATED
		String updWaveSql = "UPDATE shipment_waves SET status = :status, updated_at = now() " +
				"WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updWaveParams = ValueUtil.newMap("status,domainId,id",
				ShipmentWave.STATUS_CREATED, domainId, id);
		this.queryManager.executeBySql(updWaveSql, updWaveParams);

		// 5. 주문 상태 변경: RELEASED/PICKING → WAVED
		String updOrdersSql = "UPDATE shipment_orders SET status = :newStatus, updated_at = now() " +
				"WHERE domain_id = :domainId AND wave_no = :waveNo AND status IN (:oldStatuses)";
		Map<String, Object> updOrdersParams = ValueUtil.newMap("domainId,waveNo,oldStatuses,newStatus",
				domainId, wave.getWaveNo(),
				java.util.Arrays.asList(ShipmentOrder.STATUS_RELEASED, ShipmentOrder.STATUS_PICKING),
				ShipmentOrder.STATUS_WAVED);
		this.queryManager.executeBySql(updOrdersSql, updOrdersParams);

		// 6. ===== 이벤트 발행: Fulfillment 모듈에 피킹 지시 삭제 트리거 =====
		WaveCancelledEvent event = new WaveCancelledEvent(domainId, id, wave.getWaveNo());
		this.eventPublisher.publishEvent(event);

		// 7. 결과 리턴
		return ValueUtil.newMap("success,wave_no", true, wave.getWaveNo());
	}

	/**
	 * 웨이브 취소 (CREATED → CANCELLED)
	 *
	 * 웨이브를 취소하고, 포함된 주문을 ALLOCATED 상태로 복원한다.
	 *
	 * @param id 웨이브 ID
	 * @return { success, restored_order_count }
	 */
	public Map<String, Object> cancelWave(String id) {
		Long domainId = Domain.currentDomainId();

		ShipmentWave wave = this.findWave(domainId, id);
		if (wave == null) {
			throw new ElidomValidationException("웨이브를 찾을 수 없습니다: " + id);
		}

		if (!ShipmentWave.STATUS_CREATED.equals(wave.getStatus())) {
			throw new ElidomValidationException("웨이브 상태가 [" + wave.getStatus() + "]이므로 취소할 수 없습니다");
		}

		// 포함된 주문 상태 복원 (WAVED → ALLOCATED, wave_no 제거)
		String updOrdersSql = "UPDATE shipment_orders SET status = :status, wave_no = null, updated_at = now() WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :currentStatus";
		Map<String, Object> updOrdersParams = ValueUtil.newMap("status,domainId,waveNo,currentStatus",
				ShipmentOrder.STATUS_ALLOCATED, domainId, wave.getWaveNo(), ShipmentOrder.STATUS_WAVED);
		this.queryManager.executeBySql(updOrdersSql, updOrdersParams);

		int restoredCount = wave.getPlanOrder() != null ? wave.getPlanOrder() : 0;

		// 웨이브 상태 변경
		String updWaveSql = "UPDATE shipment_waves SET status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updWaveParams = ValueUtil.newMap("status,domainId,id",
				ShipmentWave.STATUS_CANCELLED, domainId, id);
		this.queryManager.executeBySql(updWaveSql, updWaveParams);

		// 결과 리턴
		return ValueUtil.newMap("success,restored_order_count", true, restoredCount);
	}

	/**
	 * 웨이브 포함 주문 목록 조회
	 *
	 * @param id 웨이브 ID
	 * @return 주문 목록
	 */
	public List<Map> getWaveOrders(String id) {
		Long domainId = Domain.currentDomainId();

		ShipmentWave wave = this.findWave(domainId, id);
		if (wave == null) {
			throw new ElidomValidationException("웨이브를 찾을 수 없습니다: " + id);
		}

		String sql = "SELECT id, shipment_no, ref_order_no AS ref_no, cust_cd, cust_nm, biz_type, ship_type, total_item, total_order, status"
				+ " FROM shipment_orders"
				+ " WHERE domain_id = :domainId AND wave_no = :waveNo"
				+ " ORDER BY shipment_no";
		Map<String, Object> params = ValueUtil.newMap("domainId,waveNo", domainId, wave.getWaveNo());
		return this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
	}

	/**
	 * 웨이브 SKU 합산 요약 조회
	 *
	 * 웨이브에 포함된 전체 주문의 품목을 SKU 기준으로 합산하여 반환한다.
	 *
	 * @param id 웨이브 ID
	 * @return SKU 합산 목록 [ { sku_cd, sku_nm, total_qty, order_count, loc_cd,
	 *         available_qty } ]
	 */
	public List<Map> getWaveSummary(String id) {
		Long domainId = Domain.currentDomainId();

		ShipmentWave wave = this.findWave(domainId, id);
		if (wave == null) {
			throw new ElidomValidationException("웨이브를 찾을 수 없습니다: " + id);
		}

		String sql = "SELECT soi.sku_cd, soi.sku_nm,"
				+ " SUM(soi.order_qty) AS total_qty,"
				+ " COUNT(DISTINCT soi.shipment_order_id) AS order_count,"
				+ " MIN(sa.loc_cd) AS loc_cd,"
				+ " COALESCE(("
				+ "   SELECT SUM(i.inv_qty - COALESCE(i.reserved_qty, 0))"
				+ "   FROM inventories i"
				+ "   WHERE i.domain_id = :domainId AND i.sku_cd = soi.sku_cd"
				+ "     AND i.status = 'STORED' AND (i.del_flag IS NULL OR i.del_flag = false)"
				+ " ), 0) AS available_qty"
				+ " FROM shipment_order_items soi"
				+ " INNER JOIN shipment_orders so ON so.domain_id = soi.domain_id AND so.id = soi.shipment_order_id"
				+ " LEFT JOIN stock_allocations sa ON sa.domain_id = soi.domain_id AND sa.shipment_order_item_id = soi.id AND sa.status IN ('SOFT','HARD')"
				+ " WHERE soi.domain_id = :domainId AND so.wave_no = :waveNo"
				+ " GROUP BY soi.sku_cd, soi.sku_nm"
				+ " ORDER BY soi.sku_cd";
		Map<String, Object> params = ValueUtil.newMap("domainId,waveNo", domainId, wave.getWaveNo());
		return this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
	}

	/**
	 * 웨이브에 주문 추가
	 *
	 * ALLOCATED 상태의 주문을 지정 웨이브에 추가하고 WAVED 상태로 변경한다.
	 * 웨이브 헤더의 계획 수량도 갱신한다.
	 *
	 * @param waveId   웨이브 ID
	 * @param orderIds 추가할 주문 ID 리스트
	 * @return { added_count, wave_no }
	 */
	public Map<String, Object> addOrdersToWave(String waveId, List<String> orderIds) {
		Long domainId = Domain.currentDomainId();

		ShipmentWave wave = this.findWave(domainId, waveId);
		if (wave == null) {
			throw new ElidomValidationException("웨이브를 찾을 수 없습니다: " + waveId);
		}
		if (!ShipmentWave.STATUS_CREATED.equals(wave.getStatus())) {
			throw new ElidomValidationException(
					"웨이브 상태가 [" + wave.getStatus() + "]이므로 주문을 추가할 수 없습니다 (CREATED 상태만 가능)");
		}

		int addedCount = 0;
		for (String orderId : orderIds) {
			ShipmentOrder order = this.findOrder(domainId, orderId);
			if (order == null)
				continue;
			if (!ShipmentOrder.STATUS_ALLOCATED.equals(order.getStatus()))
				continue;

			String sql = "UPDATE shipment_orders SET wave_no = :waveNo, status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> params = ValueUtil.newMap("waveNo,status,domainId,id",
					wave.getWaveNo(), ShipmentOrder.STATUS_WAVED, domainId, orderId);
			this.queryManager.executeBySql(sql, params);
			addedCount++;
		}

		// 웨이브 헤더 계획 수량 재집계
		this.recalcWavePlanStats(domainId, waveId, wave.getWaveNo());

		// 결과 리턴
		return ValueUtil.newMap("added_count,wave_no", addedCount, wave.getWaveNo());
	}

	/**
	 * 웨이브에서 주문 제거
	 *
	 * 웨이브에 포함된 주문을 제거하고 ALLOCATED 상태로 복원한다.
	 * 웨이브 헤더의 계획 수량도 갱신한다.
	 *
	 * @param waveId   웨이브 ID
	 * @param orderIds 제거할 주문 ID 리스트
	 * @return { removed_count, wave_no }
	 */
	public Map<String, Object> removeOrdersFromWave(String waveId, List<String> orderIds) {
		Long domainId = Domain.currentDomainId();

		ShipmentWave wave = this.findWave(domainId, waveId);
		if (wave == null) {
			throw new ElidomValidationException("웨이브를 찾을 수 없습니다: " + waveId);
		}
		if (!ShipmentWave.STATUS_CREATED.equals(wave.getStatus())) {
			throw new ElidomValidationException(
					"웨이브 상태가 [" + wave.getStatus() + "]이므로 주문을 제거할 수 없습니다 (CREATED 상태만 가능)");
		}

		int removedCount = 0;
		for (String orderId : orderIds) {
			ShipmentOrder order = this.findOrder(domainId, orderId);
			if (order == null)
				continue;
			if (!ShipmentOrder.STATUS_WAVED.equals(order.getStatus()))
				continue;
			if (!wave.getWaveNo().equals(order.getWaveNo()))
				continue;

			String sql = "UPDATE shipment_orders SET wave_no = null, status = :status, updated_at = now() WHERE domain_id = :domainId AND id = :id";
			Map<String, Object> params = ValueUtil.newMap("status,domainId,id",
					ShipmentOrder.STATUS_ALLOCATED, domainId, orderId);
			this.queryManager.executeBySql(sql, params);
			removedCount++;
		}

		// 웨이브 헤더 계획 수량 재집계
		this.recalcWavePlanStats(domainId, waveId, wave.getWaveNo());

		// 결과 리턴
		return ValueUtil.newMap("removed_count,wave_no", removedCount, wave.getWaveNo());
	}

	/*
	 * ============================================================
	 * 내부 유틸리티
	 * ============================================================
	 */

	/**
	 * 그룹핑 키 생성
	 */
	private String buildGroupKey(ShipmentOrder order, List<String> groupBy) {
		if (groupBy.isEmpty()) {
			return "ALL";
		}

		StringBuilder sb = new StringBuilder();
		for (String field : groupBy) {
			if (sb.length() > 0)
				sb.append("||");
			switch (field) {
				case "com_cd":
					sb.append(ValueUtil.isNotEmpty(order.getComCd()) ? order.getComCd() : "NONE");
					break;
				case "carrier_cd":
					sb.append(ValueUtil.isNotEmpty(order.getCarrierCd()) ? order.getCarrierCd() : "NONE");
					break;
				case "cust_cd":
					sb.append(ValueUtil.isNotEmpty(order.getCustCd()) ? order.getCustCd() : "NONE");
					break;
				case "biz_type":
					sb.append(ValueUtil.isNotEmpty(order.getBizType()) ? order.getBizType() : "NONE");
					break;
				case "ship_type":
					sb.append(ValueUtil.isNotEmpty(order.getShipType()) ? order.getShipType() : "NONE");
					break;
				case "dlv_type":
					sb.append(ValueUtil.isNotEmpty(order.getDlvType()) ? order.getDlvType() : "NONE");
					break;
				case "ship_by_date":
					sb.append(ValueUtil.isNotEmpty(order.getShipByDate()) ? order.getShipByDate() : "NONE");
					break;
				default:
					sb.append("UNKNOWN");
					break;
			}
		}
		return sb.toString();
	}

	/**
	 * 웨이브 헤더 계획 수량 재집계
	 */
	private void recalcWavePlanStats(Long domainId, String waveId, String waveNo) {
		Map<String, Object> countParams = ValueUtil.newMap("domainId,waveNo", domainId, waveNo);

		String countSql = "SELECT COUNT(*) FROM shipment_orders WHERE domain_id = :domainId AND wave_no = :waveNo";
		Integer planOrder = this.queryManager.selectBySql(countSql, countParams, Integer.class);

		String qtySql = "SELECT COALESCE(SUM(total_order), 0) FROM shipment_orders WHERE domain_id = :domainId AND wave_no = :waveNo";
		Double planTotal = this.queryManager.selectBySql(qtySql, countParams, Double.class);

		String skuSql = "SELECT COUNT(DISTINCT soi.sku_cd) FROM shipment_order_items soi"
				+ " INNER JOIN shipment_orders so ON so.domain_id = soi.domain_id AND so.id = soi.shipment_order_id"
				+ " WHERE soi.domain_id = :domainId AND so.wave_no = :waveNo";
		Integer planItem = this.queryManager.selectBySql(skuSql, countParams, Integer.class);

		String updSql = "UPDATE shipment_waves SET plan_order = :planOrder, plan_item = :planItem, plan_total = :planTotal, updated_at = now() WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> updParams = ValueUtil.newMap("planOrder,planItem,planTotal,domainId,id",
				planOrder != null ? planOrder : 0,
				planItem != null ? planItem : 0,
				planTotal != null ? planTotal : 0.0,
				domainId, waveId);
		this.queryManager.executeBySql(updSql, updParams);
	}

	/**
	 * 주문 단건 조회
	 */
	private ShipmentOrder findOrder(Long domainId, String id) {
		String sql = "SELECT * FROM shipment_orders WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("domainId,id", domainId, id);
		List<ShipmentOrder> list = this.queryManager.selectListBySql(sql, params, ShipmentOrder.class, 0, 1);
		return list.isEmpty() ? null : list.get(0);
	}

	/**
	 * 웨이브 단건 조회
	 */
	private ShipmentWave findWave(Long domainId, String id) {
		String sql = "SELECT * FROM shipment_waves WHERE domain_id = :domainId AND id = :id";
		Map<String, Object> params = ValueUtil.newMap("domainId,id", domainId, id);
		List<ShipmentWave> list = this.queryManager.selectListBySql(sql, params, ShipmentWave.class, 0, 1);
		return list.isEmpty() ? null : list.get(0);
	}
}
