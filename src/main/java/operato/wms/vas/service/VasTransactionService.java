package operato.wms.vas.service;

import java.time.LocalDate;
import java.util.Date;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import operato.wms.base.entity.VasBom;
import operato.wms.base.entity.VasBomItem;
import operato.wms.base.service.WmsBaseService;
import operato.wms.oms.entity.StockAllocation;
import operato.wms.stock.entity.Inventory;
import operato.wms.stock.service.StockTransactionService;
import operato.wms.vas.WmsVasConstants;
import operato.wms.vas.entity.VasOrder;
import operato.wms.vas.entity.VasOrderItem;
import operato.wms.vas.entity.VasResult;
import operato.wms.vas.service.VasSseService.VasEventData;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * VAS(Value-Added Service) 모듈 트랜잭션 처리 서비스
 *
 * 유통가공 프로세스:
 * 1. 작업 지시 생성 (PLAN) → createVasOrder()
 * 2. 작업 지시 승인 (APPROVED) → approveVasOrder()
 * 3. 자재 배정 및 피킹 (MATERIAL_READY) → allocateMaterials(), pickMaterials()
 * 4. 작업 시작 (IN_PROGRESS) → startVasWork()
 * 5. 실적 등록 (IN_PROGRESS) → registerResult()
 * 6. 작업 완료 (COMPLETED) → completeVasOrder()
 * 7. 작업 마감 (CLOSED) → closeVasOrder()
 * 8. 작업 취소 (CANCELLED) → cancelVasOrder()
 *
 * @author HatioLab
 */
@Component
public class VasTransactionService extends AbstractQueryService {

	/**
	 * WMS 기본 서비스
	 */
	@Autowired
	protected WmsBaseService wmsBaseSvc;

	/**
	 * SSE 이벤트 서비스
	 */
	@Autowired
	private VasSseService vasSseService;

	/**
	 * 재고 트랜잭션 서비스
	 */
	@Autowired
	private StockTransactionService stockTrxSvc;

	/********************************************************************************************************
	 * 1. 작업 지시 생성 및 승인
	 ********************************************************************************************************/

	/**
	 * 유통가공 작업 지시 생성 (BOM 기반 자재 자동 전개)
	 *
	 * @param vasOrder 작업 지시 정보
	 * @return 생성된 작업 지시
	 */
	@Transactional
	public VasOrder createVasOrder(VasOrder vasOrder) {
		// 1. 필수 필드 검증
		this.validateVasOrder(vasOrder);

		// 2. BOM 유효성 검증 (SET_ASSEMBLY, DISASSEMBLY인 경우)
		if (vasOrder.getVasBomId() != null) {
			VasBom bom = this.queryManager.select(VasBom.class, vasOrder.getVasBomId());
			if (bom == null || !WmsVasConstants.BOM_STATUS_ACTIVE.equals(bom.getStatus())) {
				throw new ElidomValidationException("유효한 BOM이 아닙니다. BOM ID: " + vasOrder.getVasBomId());
			}

			// BOM 유효기간 검증
			String today = DateUtil.todayStr();
			if (ValueUtil.isNotEmpty(bom.getValidFrom()) && today.compareTo(bom.getValidFrom()) < 0) {
				throw new ElidomValidationException(
						"BOM 유효 시작일 이전입니다. 유효 시작일: " + bom.getValidFrom());
			}
			if (ValueUtil.isNotEmpty(bom.getValidTo()) && today.compareTo(bom.getValidTo()) > 0) {
				throw new ElidomValidationException(
						"BOM 유효 종료일 이후입니다. 유효 종료일: " + bom.getValidTo());
			}

			// 세트 상품 코드 설정
			if (ValueUtil.isEmpty(vasOrder.getAttr01())) {
				vasOrder.setAttr01(bom.getSetSkuCd()); // set_sku_cd를 attr01에 저장
			}
		}

		// 3. 기본값 설정
		if (ValueUtil.isEmpty(vasOrder.getVasReqDate())) {
			vasOrder.setVasReqDate(DateUtil.todayStr());
		}

		if (vasOrder.getCompletedQty() == null) {
			vasOrder.setCompletedQty(0.0);
		}

		// 4. 작업 지시 생성
		this.queryManager.insert(vasOrder);

		// 5. BOM 기반 자재 전개 (vas_bom_items → vas_order_items)
		if (vasOrder.getVasBomId() != null) {
			this.expandBomToOrderItems(vasOrder);
		}

		return vasOrder;
	}

	/**
	 * BOM 기반 자재 전개
	 *
	 * vas_bom_items를 조회하여 vas_order_items에 자재 소요 계획 생성
	 * req_qty = plan_qty × component_qty
	 *
	 * @param vasOrder 작업 지시
	 */
	private void expandBomToOrderItems(VasOrder vasOrder) {
		Query query = new Query();
		query.addFilter("domainId", vasOrder.getDomainId());
		query.addFilter("vasBomId", vasOrder.getVasBomId());
		query.addOrder("bomSeq", true);

		List<VasBomItem> bomItems = this.queryManager.selectList(VasBomItem.class, query);

		if (bomItems.isEmpty()) {
			throw new ElidomValidationException(
					"BOM에 구성 품목이 없습니다. BOM ID: " + vasOrder.getVasBomId());
		}

		for (VasBomItem bomItem : bomItems) {
			VasOrderItem orderItem = new VasOrderItem();
			orderItem.setDomainId(vasOrder.getDomainId());
			orderItem.setVasOrderId(vasOrder.getId());
			orderItem.setSkuCd(bomItem.getSkuCd());
			orderItem.setSkuNm(bomItem.getSkuNm());
			orderItem.setReqQty(vasOrder.getPlanQty() * bomItem.getComponentQty());
			orderItem.setStatus(WmsVasConstants.ITEM_STATUS_PLANNED);
			orderItem.setWorkLocCd(vasOrder.getWorkLocCd());

			this.queryManager.insert(orderItem);
		}
	}

	/**
	 * 작업 지시 승인
	 *
	 * @param vasOrderId 작업 지시 ID
	 * @param approvedBy 승인자 ID
	 * @return 승인된 작업 지시
	 */
	@Transactional
	public VasOrder approveVasOrder(String vasOrderId, String approvedBy) {
		// 1. 작업 지시 조회
		VasOrder vasOrder = this.queryManager.select(VasOrder.class, vasOrderId);
		if (vasOrder == null) {
			throw new ElidomValidationException("작업 지시를 찾을 수 없습니다. ID: " + vasOrderId);
		}

		// 2. 상태 검증
		if (!WmsVasConstants.STATUS_PLAN.equals(vasOrder.getStatus())) {
			throw new ElidomValidationException(
					"승인 가능한 상태가 아닙니다. 현재 상태: " + vasOrder.getStatus());
		}

		// 3. 승인 처리
		vasOrder.setStatus(WmsVasConstants.STATUS_APPROVED);
		vasOrder.setApprovedBy(approvedBy);
		vasOrder.setApprovedAt(new Date());

		this.queryManager.update(vasOrder, "status", "approvedBy", "approvedAt");

		// SSE 이벤트 발행
		vasSseService.publish(vasOrder.getDomainId(), new VasEventData(
				"ORDER_APPROVED", vasOrder.getVasNo(), vasOrder.getId().toString(),
				WmsVasConstants.STATUS_PLAN, vasOrder.getStatus(), vasOrder.getVasType(),
				vasOrder.getVasNo() + " 승인 완료"));

		return vasOrder;
	}

	/**
	 * 작업 지시 취소
	 *
	 * @param vasOrderId   작업 지시 ID
	 * @param cancelReason 취소 사유
	 * @return 취소된 작업 지시
	 */
	@Transactional
	public VasOrder cancelVasOrder(String vasOrderId, String cancelReason) {
		// 1. 작업 지시 조회
		VasOrder vasOrder = this.queryManager.select(VasOrder.class, vasOrderId);
		if (vasOrder == null) {
			throw new ElidomValidationException("작업 지시를 찾을 수 없습니다. ID: " + vasOrderId);
		}

		// 2. 상태 검증 (승인 전까지만 취소 가능)
		if (!WmsVasConstants.STATUS_PLAN.equals(vasOrder.getStatus()) &&
				!WmsVasConstants.STATUS_APPROVED.equals(vasOrder.getStatus())) {
			throw new ElidomValidationException(
					"취소 가능한 상태가 아닙니다. 현재 상태: " + vasOrder.getStatus());
		}

		// 3. 취소 처리
		vasOrder.setStatus(WmsVasConstants.STATUS_CANCELLED);
		vasOrder.setRemarks(cancelReason);

		this.queryManager.update(vasOrder, "status", "remarks");

		// 4. 상세 항목 상태 업데이트
		String sql = "UPDATE vas_order_items SET status = :status " +
				"WHERE vas_order_id = :vasOrderId AND domain_id = :domainId";
		this.queryManager.executeBySql(sql, ValueUtil.newMap(
				"status,vasOrderId,domainId",
				WmsVasConstants.ITEM_STATUS_COMPLETED, vasOrderId, vasOrder.getDomainId()));

		// SSE 이벤트 발행
		vasSseService.publish(vasOrder.getDomainId(), new VasEventData(
				"ORDER_CANCELLED", vasOrder.getVasNo(), vasOrder.getId().toString(),
				null, vasOrder.getStatus(), vasOrder.getVasType(),
				vasOrder.getVasNo() + " 취소"));

		return vasOrder;
	}

	/********************************************************************************************************
	 * 2. 자재 배정 및 피킹
	 ********************************************************************************************************/

	/**
	 * 자재 배정
	 *
	 * 가용 재고를 FIFO 기준으로 조회하여 필요 수량을 분할 배정한다.
	 * 배정된 각 재고에 대해 stock_allocations(HARD)를 생성하고 reserved_qty를 증가시킨다.
	 * 재배정(ALLOCATED → ALLOCATED) 시 기존 할당을 먼저 해제한 후 새로 생성한다.
	 *
	 * @param vasOrderItemId 작업 지시 상세 ID
	 * @param allocQty       배정 수량
	 * @param srcLocCd       피킹 로케이션 (비어있으면 자동 조회)
	 * @param lotNo          로트 번호
	 * @return 업데이트된 작업 지시 상세
	 */
	@Transactional
	public VasOrderItem allocateMaterial(String vasOrderItemId, Double allocQty,
			String srcLocCd, String lotNo) {
		// 1. 작업 지시 상세 조회
		VasOrderItem item = this.queryManager.select(VasOrderItem.class, vasOrderItemId);
		if (item == null) {
			throw new ElidomValidationException("작업 지시 상세를 찾을 수 없습니다. ID: " + vasOrderItemId);
		}

		// 2. 상태 검증
		if (!WmsVasConstants.ITEM_STATUS_PLANNED.equals(item.getStatus()) &&
				!WmsVasConstants.ITEM_STATUS_ALLOCATED.equals(item.getStatus())) {
			throw new ElidomValidationException(
					"배정 가능한 상태가 아닙니다. 현재 상태: " + item.getStatus());
		}

		// 3. 수량 검증
		if (allocQty > item.getReqQty()) {
			throw new ElidomValidationException(
					"배정 수량이 소요 수량을 초과합니다. 소요: " + item.getReqQty() + ", 배정: " + allocQty);
		}

		// 4. 재배정 시 기존 stock_allocations 해제
		if (WmsVasConstants.ITEM_STATUS_ALLOCATED.equals(item.getStatus())) {
			this.releaseVasItemAllocations(item);
		}

		// 5. 가용 재고 조회 (분할 배정 지원 — FIFO 기준)
		VasOrder order = this.queryManager.select(VasOrder.class, item.getVasOrderId());
		if (order == null) {
			throw new ElidomValidationException("작업 지시를 찾을 수 없습니다.");
		}

		List<Inventory> candidates;
		if (ValueUtil.isNotEmpty(srcLocCd)) {
			// 특정 로케이션 지정 시 해당 로케이션의 재고만 조회 (loc_type 무관)
			String locSql = "SELECT * FROM inventories " +
					"WHERE domain_id = :domainId AND com_cd = :comCd AND sku_cd = :skuCd " +
					"AND loc_cd = :locCd AND status = :status " +
					"AND (del_flag IS NULL OR del_flag = false) " +
					"AND (inv_qty - COALESCE(reserved_qty, 0)) > 0 " +
					"ORDER BY created_at ASC";
			Map<String, Object> locParams = ValueUtil.newMap("domainId,comCd,skuCd,locCd,status",
					item.getDomainId(), order.getComCd(), item.getSkuCd(), srcLocCd,
					Inventory.STATUS_STORED);
			if (ValueUtil.isNotEmpty(order.getWhCd())) {
				locSql = locSql.replace("AND loc_cd = :locCd",
						"AND wh_cd = :whCd AND loc_cd = :locCd");
				locParams.put("whCd", order.getWhCd());
			}
			candidates = this.queryManager.selectListBySql(locSql, locParams, Inventory.class, 0, 0);
		} else {
			// 자동 배정: loc_type 제한 없이 STORED 재고 전체 대상 (출고용 searchAvailableInventory와 다름)
			// wh_cd가 비어있으면 창고 조건 없이 화주사 전체 재고에서 조회
			String autoSql = "SELECT * FROM inventories " +
					"WHERE domain_id = :domainId AND com_cd = :comCd AND sku_cd = :skuCd " +
					"AND status = :status " +
					"AND (del_flag IS NULL OR del_flag = false) " +
					"AND (inv_qty - COALESCE(reserved_qty, 0)) > 0 " +
					"ORDER BY created_at ASC";
			Map<String, Object> autoParams = ValueUtil.newMap("domainId,comCd,skuCd,status",
					item.getDomainId(), order.getComCd(), item.getSkuCd(), Inventory.STATUS_STORED);
			if (ValueUtil.isNotEmpty(order.getWhCd())) {
				autoSql = autoSql.replace("AND status = :status",
						"AND wh_cd = :whCd AND status = :status");
				autoParams.put("whCd", order.getWhCd());
			}
			candidates = this.queryManager.selectListBySql(autoSql, autoParams, Inventory.class, 0, 0);
		}

		// 가용 재고 없으면 명확한 오류 반환
		if (candidates == null || candidates.isEmpty()) {
			String whInfo = ValueUtil.isNotEmpty(order.getWhCd()) ? order.getWhCd() : "전체창고";
			throw new ElidomValidationException(
					"배정 가능한 재고가 없습니다. [" + item.getSkuCd() + " / " + whInfo + "]");
		}

		// 6. 분할 배정 — 재고별 stock_allocations 생성 및 reserved_qty 증가
		String now = xyz.elidom.util.DateUtil.currentTimeStr();
		double remainQty = allocQty;
		String firstLocCd = null;
		String firstLotNo = null;

		for (Inventory inv : candidates) {
			if (remainQty <= 0) break;

			double avail = inv.getInvQty() - (inv.getReservedQty() == null ? 0 : inv.getReservedQty());
			if (avail <= 0) continue;

			double thisQty = Math.min(avail, remainQty);

			// stock_allocations 생성 (HARD)
			operato.wms.oms.entity.StockAllocation alloc = new operato.wms.oms.entity.StockAllocation();
			alloc.setDomainId(item.getDomainId());
			alloc.setShipmentOrderId(order.getId());
			alloc.setShipmentOrderItemId(item.getId());
			alloc.setInventoryId(inv.getId());
			alloc.setSkuCd(item.getSkuCd());
			alloc.setBarcode(inv.getBarcode());
			alloc.setLocCd(inv.getLocCd());
			alloc.setLotNo(ValueUtil.isNotEmpty(lotNo) ? lotNo : inv.getLotNo());
			alloc.setExpiredDate(inv.getExpiredDate());
			alloc.setAllocQty(thisQty);
			alloc.setAllocType(operato.wms.oms.entity.StockAllocation.ALLOC_TYPE_VAS);
			alloc.setStatus(operato.wms.oms.entity.StockAllocation.STATUS_HARD);
			alloc.setAllocatedAt(now);
			this.queryManager.insert(alloc);

			// reserved_qty 증가
			this.stockTrxSvc.allocateInventory(inv, thisQty);

			if (firstLocCd == null) {
				firstLocCd = inv.getLocCd();
				firstLotNo = ValueUtil.isNotEmpty(lotNo) ? lotNo : inv.getLotNo();
			}
			remainQty -= thisQty;
		}

		// 필요 수량만큼 재고가 없으면 오류 (부분 배정 허용 불가)
		if (remainQty > 0) {
			// 이미 생성된 stock_allocations 롤백 (트랜잭션 내이므로 전체 롤백됨)
			throw new ElidomValidationException(
					"재고 수량 부족입니다. [" + item.getSkuCd() + "] 필요: " + allocQty + ", 가용: " + (allocQty - remainQty));
		}

		// 7. vas_order_items 업데이트 (대표 로케이션은 첫 번째 재고 기준)
		item.setAllocQty(allocQty - remainQty);
		item.setSrcLocCd(firstLocCd);
		item.setLotNo(firstLotNo);
		item.setStatus(WmsVasConstants.ITEM_STATUS_ALLOCATED);

		this.queryManager.update(item, "allocQty", "srcLocCd", "lotNo", "status");

		return item;
	}

	/**
	 * VAS 자재 아이템의 기존 stock_allocations 해제 (재배정 시 호출)
	 *
	 * @param item 작업 지시 상세
	 */
	private void releaseVasItemAllocations(VasOrderItem item) {
		String sql = "SELECT * FROM stock_allocations " +
				"WHERE domain_id = :domainId AND shipment_order_item_id = :itemId " +
				"AND alloc_type = :allocType AND status = :status";
		List<operato.wms.oms.entity.StockAllocation> existing = this.queryManager.selectListBySql(sql,
				ValueUtil.newMap("domainId,itemId,allocType,status",
						item.getDomainId(), item.getId(),
						operato.wms.oms.entity.StockAllocation.ALLOC_TYPE_VAS,
						operato.wms.oms.entity.StockAllocation.STATUS_HARD),
				operato.wms.oms.entity.StockAllocation.class, 0, 0);

		for (operato.wms.oms.entity.StockAllocation alloc : existing) {
			this.stockTrxSvc.deallocateInventory(item.getDomainId(), alloc.getInventoryId(), alloc.getAllocQty());
			this.queryManager.delete(alloc);
		}
	}

	/**
	 * VAS 자재 아이템의 재고 할당 목록 조회
	 *
	 * @param vasOrderItemId 작업 지시 상세 ID
	 * @return 재고 할당 목록
	 */
	public List<operato.wms.oms.entity.StockAllocation> listVasItemAllocations(String vasOrderItemId) {
		String sql = "SELECT * FROM stock_allocations " +
				"WHERE domain_id = :domainId AND shipment_order_item_id = :itemId " +
				"AND alloc_type = :allocType ORDER BY created_at ASC";
		return this.queryManager.selectListBySql(sql,
				ValueUtil.newMap("domainId,itemId,allocType",
						xyz.elidom.sys.entity.Domain.currentDomainId(), vasOrderItemId,
						operato.wms.oms.entity.StockAllocation.ALLOC_TYPE_VAS),
				operato.wms.oms.entity.StockAllocation.class, 0, 0);
	}

	/**
	 * 자재 피킹 처리
	 *
	 * @param vasOrderItemId 작업 지시 상세 ID
	 * @param pickedQty      피킹 수량
	 * @return 업데이트된 작업 지시 상세
	 */
	@Transactional
	public VasOrderItem pickMaterial(String vasOrderItemId, Double pickedQty) {
		// 1. 작업 지시 상세 조회
		VasOrderItem item = this.queryManager.select(VasOrderItem.class, vasOrderItemId);
		if (item == null) {
			throw new ElidomValidationException("작업 지시 상세를 찾을 수 없습니다. ID: " + vasOrderItemId);
		}

		// 2. 상태 검증
		if (!WmsVasConstants.ITEM_STATUS_ALLOCATED.equals(item.getStatus())) {
			throw new ElidomValidationException(
					"피킹 가능한 상태가 아닙니다. 현재 상태: " + item.getStatus());
		}

		// 3. 수량 검증
		if (pickedQty > item.getAllocQty()) {
			throw new ElidomValidationException(
					"피킹 수량이 배정 수량을 초과합니다. 배정: " + item.getAllocQty() + ", 피킹: " + pickedQty);
		}

		// 4. 피킹 처리
		item.setPickedQty(pickedQty);
		item.setStatus(WmsVasConstants.ITEM_STATUS_PICKED);

		this.queryManager.update(item, "pickedQty", "status");

		// 5. 헤더 상태 자동 업데이트
		this.updateVasOrderStatus(item.getVasOrderId());

		return item;
	}

	/********************************************************************************************************
	 * 3. 작업 시작 및 진행
	 ********************************************************************************************************/

	/**
	 * 작업 시작
	 *
	 * @param vasOrderId 작업 지시 ID
	 * @param workerId   작업자 ID
	 * @return 작업 시작된 작업 지시
	 */
	@Transactional
	public VasOrder startVasWork(String vasOrderId, String workerId) {
		return this.startVasWork(vasOrderId, workerId, null);
	}

	/**
	 * 작업 시작
	 *
	 * @param vasOrderId 작업 지시 ID
	 * @param workerId   작업자 ID
	 * @param items      투입 수량이 포함된 작업 지시 상세 목록
	 * @return 작업 시작된 작업 지시
	 */
	@Transactional
	public VasOrder startVasWork(String vasOrderId, String workerId, List<Map<String, Object>> items) {
		// 1. 작업 지시 조회
		VasOrder vasOrder = this.queryManager.select(VasOrder.class, vasOrderId);
		if (vasOrder == null) {
			throw new ElidomValidationException("작업 지시를 찾을 수 없습니다. ID: " + vasOrderId);
		}

		// 2. 상태 검증
		if (!WmsVasConstants.STATUS_MATERIAL_READY.equals(vasOrder.getStatus())) {
			throw new ElidomValidationException(
					"작업 시작 가능한 상태가 아닙니다. 현재 상태: " + vasOrder.getStatus());
		}

		// 3. 작업 시작 처리
		vasOrder.setStatus(WmsVasConstants.STATUS_IN_PROGRESS);
		vasOrder.setWorkerId(workerId);
		vasOrder.setStartedAt(new Date());

		this.queryManager.update(vasOrder, "status", "workerId", "startedAt");

		// 4. 작업자가 확인한 투입 수량 업데이트
		this.updateUsedQuantities(vasOrder, items);

		// 5. 상세 항목 상태 업데이트
		String sql = "UPDATE vas_order_items SET status = :status, " +
				"used_qty = COALESCE(used_qty, picked_qty, alloc_qty, req_qty) " +
				"WHERE vas_order_id = :vasOrderId AND domain_id = :domainId " +
				"AND status = :prevStatus";
		this.queryManager.executeBySql(sql, ValueUtil.newMap(
				"status,vasOrderId,domainId,prevStatus",
				WmsVasConstants.ITEM_STATUS_IN_USE, vasOrderId, vasOrder.getDomainId(),
				WmsVasConstants.ITEM_STATUS_PICKED));

		// 6. SSE 이벤트 발행
		vasSseService.publish(vasOrder.getDomainId(), new VasEventData(
				"WORK_STARTED", vasOrder.getVasNo(), vasOrder.getId().toString(),
				WmsVasConstants.STATUS_MATERIAL_READY, vasOrder.getStatus(), vasOrder.getVasType(),
				vasOrder.getVasNo() + " 작업 시작"));

		return vasOrder;
	}

	/**
	 * 투입 수량 업데이트
	 *
	 * @param vasOrder 작업 지시
	 * @param items    itemId, usedQty를 포함한 상세 목록
	 */
	private void updateUsedQuantities(VasOrder vasOrder, List<Map<String, Object>> items) {
		if (items == null || items.isEmpty()) {
			return;
		}

		String sql = "UPDATE vas_order_items SET used_qty = :usedQty " +
				"WHERE id = :itemId AND vas_order_id = :vasOrderId AND domain_id = :domainId";

		for (Map<String, Object> item : items) {
			String itemId = (String) item.get("itemId");
			Double usedQty = ValueUtil.toDouble(item.get("usedQty"));

			if (ValueUtil.isEmpty(itemId) || usedQty == null) {
				continue;
			}

			this.queryManager.executeBySql(sql, ValueUtil.newMap(
					"usedQty,itemId,vasOrderId,domainId",
					usedQty, itemId, vasOrder.getId(), vasOrder.getDomainId()));
		}
	}

	/********************************************************************************************************
	 * 4. 실적 등록
	 ********************************************************************************************************/

	/**
	 * 실적 등록
	 *
	 * @param vasOrderId 작업 지시 ID
	 * @param result     실적 정보
	 * @return 생성된 실적
	 */
	@Transactional
	public VasResult registerResult(String vasOrderId, VasResult result) {
		// 1. 작업 지시 조회
		VasOrder vasOrder = this.queryManager.select(VasOrder.class, vasOrderId);
		if (vasOrder == null) {
			throw new ElidomValidationException("작업 지시를 찾을 수 없습니다. ID: " + vasOrderId);
		}

		// 2. 상태 검증
		if (!WmsVasConstants.STATUS_IN_PROGRESS.equals(vasOrder.getStatus())) {
			throw new ElidomValidationException(
					"실적 등록 가능한 상태가 아닙니다. 현재 상태: " + vasOrder.getStatus());
		}

		if (result.getResultQty() == null || result.getResultQty() <= 0) {
			throw new ElidomValidationException("완성 수량은 0보다 커야 합니다.");
		}

		if (result.getDefectQty() == null) {
			result.setDefectQty(0.0);
		}

		// 3. 실적 기록 생성 또는 갱신
		result.setVasOrderId(vasOrderId);
		result.setVasNo(vasOrder.getVasNo());
		result.setResultType(vasOrder.getVasType());
		result.setDomainId(vasOrder.getDomainId());

		String setBomId = vasOrder.getVasBomId();
		if (ValueUtil.isNotEmpty(setBomId)) {
			VasBom vasBom = this.queryManager.select(VasBom.class, setBomId);
			result.setSetSkuCd(vasBom.getSetSkuCd());
			result.setSetSkuNm(vasBom.getSetSkuNm());
		}

		if (ValueUtil.isEmpty(result.getWorkDate())) {
			result.setWorkDate(DateUtil.todayStr());
		}

		VasResult savedResult = this.findFirstVasResult(vasOrder);
		boolean created = savedResult == null;
		if (created) {
			this.queryManager.insert(result);
			savedResult = result;
		} else {
			savedResult.setResultQty(result.getResultQty());
			savedResult.setDefectQty(result.getDefectQty());
			savedResult.setResultType(result.getResultType());
			savedResult.setSetSkuCd(result.getSetSkuCd());
			savedResult.setSetSkuNm(result.getSetSkuNm());
			savedResult.setWorkDate(result.getWorkDate());
			savedResult.setWorkerId(result.getWorkerId());
			savedResult.setDestLocCd(result.getDestLocCd());
			savedResult.setLotNo(result.getLotNo());
			savedResult.setRemarks(result.getRemarks());
			this.queryManager.update(savedResult, "resultQty", "defectQty", "resultType", "setSkuCd", "setSkuNm",
					"workDate", "workerId", "destLocCd", "lotNo", "remarks");
		}

		// 4. completed_qty 갱신 업데이트
		vasOrder.setCompletedQty(result.getResultQty());
		this.queryManager.update(vasOrder, "completedQty");

		// 5. 디테일 손실 수량 갱신
		this.updateLossQuantities(vasOrder, result.getDefectQty());

		// SSE 이벤트 발행
		vasSseService.publish(vasOrder.getDomainId(), new VasEventData(
				"RESULTS_REGISTERED", vasOrder.getVasNo(), vasOrder.getId().toString(),
				vasOrder.getStatus(), vasOrder.getStatus(), vasOrder.getVasType(),
				vasOrder.getVasNo() + " 실적 등록 (" + result.getResultQty() + " EA)"));

		return savedResult;
	}

	/**
	 * 작업 지시의 첫 번째 실적 조회
	 *
	 * @param vasOrder 작업 지시
	 * @return 첫 번째 실적
	 */
	private VasResult findFirstVasResult(VasOrder vasOrder) {
		Query query = new Query();
		query.addFilter("domainId", vasOrder.getDomainId());
		query.addFilter("vasOrderId", vasOrder.getId());
		query.addOrder("resultSeq", true);

		List<VasResult> results = this.queryManager.selectList(VasResult.class, query);
		return results.isEmpty() ? null : results.get(0);
	}

	/**
	 * 불량 수량을 자재별 손실 수량으로 환산하여 갱신
	 *
	 * @param vasOrder  작업 지시
	 * @param defectQty 불량 수량
	 */
	private void updateLossQuantities(VasOrder vasOrder, Double defectQty) {
		double safeDefectQty = defectQty != null ? defectQty : 0.0;
		double planQty = vasOrder.getPlanQty() != null ? vasOrder.getPlanQty() : 0.0;

		Query query = new Query();
		query.addFilter("domainId", vasOrder.getDomainId());
		query.addFilter("vasOrderId", vasOrder.getId());
		List<VasOrderItem> items = this.queryManager.selectList(VasOrderItem.class, query);

		for (VasOrderItem item : items) {
			double reqQty = item.getReqQty() != null ? item.getReqQty() : 0.0;
			double lossQty = planQty > 0 ? safeDefectQty * (reqQty / planQty) : safeDefectQty;
			item.setLossQty(lossQty);
			this.queryManager.update(item, "lossQty");
		}
	}

	/********************************************************************************************************
	 * 5. 작업 완료 및 마감
	 ********************************************************************************************************/

	/**
	 * 작업 완료 처리
	 *
	 * @param vasOrderId 작업 지시 ID
	 * @return 완료된 작업 지시
	 */
	@Transactional
	public VasOrder completeVasOrder(String vasOrderId) {
		return this.completeVasOrder(vasOrderId, null);
	}

	/**
	 * 작업 완료 처리
	 *
	 * @param vasOrderId 작업 지시 ID
	 * @param destLocCd  완성품 적치 로케이션
	 * @return 완료된 작업 지시
	 */
	@Transactional
	public VasOrder completeVasOrder(String vasOrderId, String destLocCd) {
		return this.completeVasOrder(vasOrderId, destLocCd, null);
	}

	/**
	 * 작업 완료 처리
	 *
	 * @param vasOrderId  작업 지시 ID
	 * @param destLocCd   완성품 적치 로케이션
	 * @param expiredDate 완성품 유통기한
	 * @return 완료된 작업 지시
	 */
	@Transactional
	public VasOrder completeVasOrder(String vasOrderId, String destLocCd, String expiredDate) {
		// 1. 작업 지시 조회
		VasOrder vasOrder = this.queryManager.select(VasOrder.class, vasOrderId);
		if (vasOrder == null) {
			throw new ElidomValidationException("작업 지시를 찾을 수 없습니다. ID: " + vasOrderId);
		}

		// 2. 상태 검증
		if (!WmsVasConstants.STATUS_IN_PROGRESS.equals(vasOrder.getStatus())) {
			throw new ElidomValidationException(
					"완료 가능한 상태가 아닙니다. 현재 상태: " + vasOrder.getStatus());
		}

		// 3. 실적 수량 검증 (선택적)
		if (vasOrder.getCompletedQty() < vasOrder.getPlanQty()) {
			// 경고만 출력 (부분 완료 허용)
			this.logger.warn("완성 수량이 계획 수량보다 적습니다. 계획: {}, 완성: {}",
					vasOrder.getPlanQty(), vasOrder.getCompletedQty());
		}

		// 4. 완료 시점에 할당 원재고 차감 및 예약 해소
		this.consumeVasAllocatedInventoriesIfNeeded(vasOrder);

		// 5. 완료 시점에 재고 생성 및 적치 로케이션 이동
		this.createVasResultInventoriesIfNeeded(vasOrder, expiredDate);
		this.moveVasResultInventories(vasOrder, destLocCd);

		// 6. 완료 처리
		vasOrder.setStatus(WmsVasConstants.STATUS_COMPLETED);
		vasOrder.setCompletedAt(new Date());
		vasOrder.setVasEndDate(DateUtil.todayStr());

		this.queryManager.update(vasOrder, "status", "completedAt", "vasEndDate");

		// 7. 상세 항목 유통기한 업데이트 — 완료 시점에 할당 바코드 중 가장 임박한 유통기한 반영
		String expiredDateSql = "UPDATE vas_order_items voi " +
				"SET expired_date = subq.min_exp " +
				"FROM ( " +
				"    SELECT shipment_order_item_id, MIN(NULLIF(expired_date, '')) AS min_exp " +
				"    FROM stock_allocations " +
				"    WHERE domain_id = :domainId " +
				"      AND shipment_order_id = :vasOrderId " +
				"      AND alloc_type = :allocType " +
				"    GROUP BY shipment_order_item_id " +
				") subq " +
				"WHERE voi.id = subq.shipment_order_item_id " +
				"  AND voi.vas_order_id = :vasOrderId " +
				"  AND voi.domain_id = :domainId " +
				"  AND subq.min_exp IS NOT NULL";
		this.queryManager.executeBySql(expiredDateSql, ValueUtil.newMap(
				"domainId,vasOrderId,allocType",
				vasOrder.getDomainId(), vasOrderId, StockAllocation.ALLOC_TYPE_VAS));

		// 8. 상세 항목 상태 업데이트
		String sql = "UPDATE vas_order_items SET status = :status " +
				"WHERE vas_order_id = :vasOrderId AND domain_id = :domainId";
		this.queryManager.executeBySql(sql, ValueUtil.newMap(
				"status,vasOrderId,domainId",
				WmsVasConstants.ITEM_STATUS_COMPLETED, vasOrderId, vasOrder.getDomainId()));

		// SSE 이벤트 발행
		vasSseService.publish(vasOrder.getDomainId(), new VasEventData(
				"WORK_COMPLETED", vasOrder.getVasNo(), vasOrder.getId().toString(),
				WmsVasConstants.STATUS_IN_PROGRESS, vasOrder.getStatus(), vasOrder.getVasType(),
				vasOrder.getVasNo() + " 작업 완료"));

		return vasOrder;
	}

	/**
	 * 완성품 유통기한 기본값 조회
	 *
	 * @param vasOrderId 작업 지시 ID
	 * @return 할당 자재 중 가장 빠른 유통기한 또는 내일 날짜
	 */
	public String getDefaultExpiredDate(String vasOrderId) {
		VasOrder vasOrder = this.queryManager.select(VasOrder.class, vasOrderId);
		if (vasOrder == null) {
			throw new ElidomValidationException("작업 지시를 찾을 수 없습니다. ID: " + vasOrderId);
		}

		String sql = "SELECT MIN(expired_date) FROM stock_allocations " +
				"WHERE domain_id = :domainId AND shipment_order_id = :vasOrderId " +
				"AND alloc_type = :allocType AND expired_date IS NOT NULL AND expired_date <> ''";
		String expiredDate = this.queryManager.selectBySql(sql,
				ValueUtil.newMap("domainId,vasOrderId,allocType",
						vasOrder.getDomainId(), vasOrderId, StockAllocation.ALLOC_TYPE_VAS),
				String.class);

		return ValueUtil.isNotEmpty(expiredDate) ? expiredDate : LocalDate.now().plusDays(1).toString();
	}

	/**
	 * VAS 완료 시점에 완성품/결과품 재고 생성
	 *
	 * @param vasOrder    작업 지시
	 * @param expiredDate 완성품 유통기한
	 */
	private void createVasResultInventoriesIfNeeded(VasOrder vasOrder, String expiredDate) {
		if (!this.hasVasResultInventoryTransaction(vasOrder)) {
			return;
		}

		List<Inventory> inventories = this.findVasResultInventories(vasOrder);
		if (!inventories.isEmpty()) {
			this.updateVasResultInventoryExpiredDate(inventories, expiredDate);
			return;
		}

		VasResult result = this.findFirstVasResult(vasOrder);
		if (result == null) {
			throw new ElidomValidationException("작업 실적을 먼저 등록해야 완료할 수 있습니다.");
		}

		this.processInventoryByVasType(vasOrder, result, expiredDate);
	}

	/**
	 * VAS 결과 재고의 유통기한 갱신
	 *
	 * @param inventories 결과 재고 목록
	 * @param expiredDate 완성품 유통기한
	 */
	private void updateVasResultInventoryExpiredDate(List<Inventory> inventories, String expiredDate) {
		for (Inventory inventory : inventories) {
			inventory.setExpiredDate(expiredDate);
			this.queryManager.update(inventory, "expiredDate");
		}
	}

	/**
	 * VAS 완료 시 할당된 원재고를 소비하고 예약 수량을 해소
	 *
	 * @param vasOrder 작업 지시
	 */
	private void consumeVasAllocatedInventoriesIfNeeded(VasOrder vasOrder) {
		if (!this.hasVasResultInventoryTransaction(vasOrder)) {
			return;
		}

		Query query = new Query();
		query.addFilter("domainId", vasOrder.getDomainId());
		query.addFilter("vasOrderId", vasOrder.getId());
		query.addOrder("vasSeq", true);
		List<VasOrderItem> items = this.queryManager.selectList(VasOrderItem.class, query);

		for (VasOrderItem item : items) {
			this.consumeVasItemAllocations(vasOrder, item);
		}
	}

	/**
	 * VAS 자재 상세에 연결된 HARD 할당을 실제 소비 처리
	 *
	 * @param vasOrder 작업 지시
	 * @param item     작업 지시 상세
	 */
	private void consumeVasItemAllocations(VasOrder vasOrder, VasOrderItem item) {
		double targetQty = this.getVasItemConsumeQty(item);
		if (targetQty <= 0) {
			return;
		}

		String sql = "SELECT * FROM stock_allocations " +
				"WHERE domain_id = :domainId AND shipment_order_id = :vasOrderId " +
				"AND shipment_order_item_id = :itemId AND alloc_type = :allocType " +
				"AND status = :status ORDER BY created_at ASC";
		List<StockAllocation> allocations = this.queryManager.selectListBySql(sql,
				ValueUtil.newMap("domainId,vasOrderId,itemId,allocType,status",
						vasOrder.getDomainId(), vasOrder.getId(), item.getId(),
						StockAllocation.ALLOC_TYPE_VAS, StockAllocation.STATUS_HARD),
				StockAllocation.class, 0, 0);

		double remainConsumeQty = targetQty;
		String now = DateUtil.currentTimeStr();

		for (StockAllocation allocation : allocations) {
			double allocQty = allocation.getAllocQty() != null ? allocation.getAllocQty() : 0.0;
			double consumeQty = Math.min(allocQty, remainConsumeQty);

			this.consumeAllocatedInventory(vasOrder, allocation, consumeQty, allocQty);

			allocation.setStatus(StockAllocation.STATUS_RELEASED);
			allocation.setReleasedAt(now);
			this.queryManager.update(allocation, "status", "releasedAt");

			remainConsumeQty -= consumeQty;
			if (remainConsumeQty <= 0.0001) {
				remainConsumeQty = 0.0;
			}
		}

		if (remainConsumeQty > 0.0001) {
			throw new ElidomValidationException(
					"할당 재고 수량이 투입 수량보다 부족합니다. SKU: " + item.getSkuCd() +
							", 투입: " + targetQty + ", 부족: " + remainConsumeQty);
		}
	}

	/**
	 * VAS 자재 상세의 실제 소비 수량 결정
	 *
	 * @param item 작업 지시 상세
	 * @return 소비 수량
	 */
	private double getVasItemConsumeQty(VasOrderItem item) {
		if (item.getUsedQty() != null && item.getUsedQty() > 0) {
			return item.getUsedQty();
		}
		if (item.getPickedQty() != null && item.getPickedQty() > 0) {
			return item.getPickedQty();
		}
		if (item.getAllocQty() != null && item.getAllocQty() > 0) {
			return item.getAllocQty();
		}
		return item.getReqQty() != null ? item.getReqQty() : 0.0;
	}

	/**
	 * 할당 원재고의 재고 수량과 예약 수량을 갱신
	 *
	 * @param vasOrder   작업 지시
	 * @param allocation 재고 할당
	 * @param consumeQty 실제 차감 수량
	 * @param releaseQty 예약 해소 수량
	 */
	private void consumeAllocatedInventory(
			VasOrder vasOrder,
			StockAllocation allocation,
			double consumeQty,
			double releaseQty) {

		Inventory inventory = this.queryManager.select(Inventory.class, allocation.getInventoryId());
		if (inventory == null || !ValueUtil.isEqual(inventory.getDomainId(), vasOrder.getDomainId())) {
			throw new ElidomValidationException("할당 원재고를 찾을 수 없습니다. ID: " + allocation.getInventoryId());
		}

		double invQty = inventory.getInvQty() != null ? inventory.getInvQty() : 0.0;
		double reservedQty = inventory.getReservedQty() != null ? inventory.getReservedQty() : 0.0;

		if (consumeQty > invQty + 0.0001) {
			throw new ElidomValidationException(
					"할당 원재고 수량이 부족합니다. SKU: " + allocation.getSkuCd() +
							", 재고: " + invQty + ", 차감: " + consumeQty);
		}

		inventory.setInvQty(Math.max(invQty - consumeQty, 0.0));
		inventory.setReservedQty(Math.max(reservedQty - releaseQty, 0.0));
		inventory.setLastTranCd(Inventory.TRANSACTION_VAS_OUT);
		inventory.setUpdatedAt(new Date());
		this.queryManager.update(inventory);
	}

	/**
	 * VAS 작업장에 생성된 완성품 재고를 적치 로케이션으로 이동
	 *
	 * @param vasOrder  작업 지시
	 * @param destLocCd 적치 로케이션
	 */
	private void moveVasResultInventories(VasOrder vasOrder, String destLocCd) {
		if (!this.hasVasResultInventoryTransaction(vasOrder)) {
			return;
		}

		if (ValueUtil.isEmpty(destLocCd)) {
			return;
		}

		String workLocCd = vasOrder.getWorkLocCd();
		if (ValueUtil.isEmpty(workLocCd) || ValueUtil.isEqualIgnoreCase(workLocCd, destLocCd)) {
			return;
		}

		List<Inventory> inventories = this.findVasResultInventories(vasOrder);
		if (inventories.isEmpty()) {
			this.logger.warn("VAS 완성품 이동 대상 재고 없음: vasNo={}, fromLoc={}, toLoc={}",
					vasOrder.getVasNo(), workLocCd, destLocCd);
			return;
		}

		for (Inventory inventory : inventories) {
			if (ValueUtil.isEqualIgnoreCase(inventory.getLocCd(), destLocCd)) {
				continue;
			}

			this.stockTrxSvc.moveInventory(inventory, destLocCd, "VAS 완성품 적치 이동: " + vasOrder.getVasNo());
		}

		VasResult result = this.findFirstVasResult(vasOrder);
		if (result != null) {
			result.setDestLocCd(destLocCd);
			this.queryManager.update(result, "destLocCd");
		}
	}

	/**
	 * VAS 유형별 결과 재고 생성/이동 대상 여부
	 *
	 * @param vasOrder 작업 지시
	 * @return 결과 재고 트랜잭션 여부
	 */
	private boolean hasVasResultInventoryTransaction(VasOrder vasOrder) {
		return WmsVasConstants.VAS_TYPE_SET_ASSEMBLY.equals(vasOrder.getVasType()) ||
				WmsVasConstants.VAS_TYPE_DISASSEMBLY.equals(vasOrder.getVasType());
	}

	/**
	 * 완성품 바코드 목록 조회 (완료/마감 주문용 API)
	 *
	 * @param vasOrderId 작업 지시 ID
	 * @return 완성품 바코드 목록
	 */
	public List<String> getResultBarcodes(String vasOrderId) {
		VasOrder vasOrder = this.queryManager.select(VasOrder.class, vasOrderId);
		if (vasOrder == null) {
			return List.of();
		}

		// 완료 후 재고는 destLocCd로 이동되므로, loc_cd 제한 없이 remarks로 검색
		String sql = "SELECT * FROM inventories " +
				"WHERE domain_id = :domainId " +
				"AND com_cd = :comCd " +
				"AND wh_cd = :whCd " +
				"AND (del_flag IS NULL OR del_flag = false) " +
				"AND remarks LIKE :remarks " +
				"ORDER BY created_at ASC";

		Map<String, Object> params = ValueUtil.newMap(
				"domainId,comCd,whCd,remarks",
				vasOrder.getDomainId(), vasOrder.getComCd(), vasOrder.getWhCd(),
				"%" + vasOrder.getVasNo() + "%");

		List<Inventory> inventories = this.queryManager.selectListBySql(sql, params, Inventory.class, 0, 0);

		// remarks 조회 실패 시 vas_results의 dest_loc_cd + sku_cd 기반 fallback
		if (inventories.isEmpty()) {
			VasResult result = this.findFirstVasResult(vasOrder);
			if (result != null && ValueUtil.isNotEmpty(result.getSetSkuCd()) && ValueUtil.isNotEmpty(result.getDestLocCd())) {
				String fallbackSql = "SELECT * FROM inventories " +
						"WHERE domain_id = :domainId " +
						"AND com_cd = :comCd " +
						"AND wh_cd = :whCd " +
						"AND loc_cd = :destLocCd " +
						"AND sku_cd = :setSkuCd " +
						"AND (del_flag IS NULL OR del_flag = false) " +
						"AND inv_qty = :resultQty " +
						"ORDER BY created_at DESC";

				Map<String, Object> fallbackParams = ValueUtil.newMap(
						"domainId,comCd,whCd,destLocCd,setSkuCd,resultQty",
						vasOrder.getDomainId(), vasOrder.getComCd(), vasOrder.getWhCd(),
						result.getDestLocCd(), result.getSetSkuCd(), result.getResultQty());

				inventories = this.queryManager.selectListBySql(fallbackSql, fallbackParams, Inventory.class, 0, 0);
			}
		}

		return inventories.stream()
				.map(Inventory::getBarcode)
				.filter(b -> b != null && !b.isEmpty())
				.toList();
	}

	/**
	 * VAS 작업으로 생성된 재고 조회
	 *
	 * @param vasOrder 작업 지시
	 * @return 생성 재고 목록
	 */
	private List<Inventory> findVasResultInventories(VasOrder vasOrder) {
		String sql = "SELECT * FROM inventories " +
				"WHERE domain_id = :domainId " +
				"AND com_cd = :comCd " +
				"AND wh_cd = :whCd " +
				"AND loc_cd = :workLocCd " +
				"AND status = :status " +
				"AND (del_flag IS NULL OR del_flag = false) " +
				"AND remarks LIKE :remarks " +
				"ORDER BY created_at ASC";

		Map<String, Object> params = ValueUtil.newMap(
				"domainId,comCd,whCd,workLocCd,status,remarks",
				vasOrder.getDomainId(), vasOrder.getComCd(), vasOrder.getWhCd(), vasOrder.getWorkLocCd(),
				Inventory.STATUS_STORED, "%" + vasOrder.getVasNo() + "%");

		List<Inventory> inventories = this.queryManager.selectListBySql(sql, params, Inventory.class, 0, 0);
		if (!inventories.isEmpty()) {
			return inventories;
		}

		VasResult result = this.findFirstVasResult(vasOrder);
		if (result == null || ValueUtil.isEmpty(result.getSetSkuCd())) {
			return inventories;
		}

		String fallbackSql = "SELECT * FROM inventories " +
				"WHERE domain_id = :domainId " +
				"AND com_cd = :comCd " +
				"AND wh_cd = :whCd " +
				"AND loc_cd = :workLocCd " +
				"AND sku_cd = :setSkuCd " +
				"AND status = :status " +
				"AND (del_flag IS NULL OR del_flag = false) " +
				"AND inv_qty = :resultQty " +
				"ORDER BY created_at DESC";

		Map<String, Object> fallbackParams = ValueUtil.newMap(
				"domainId,comCd,whCd,workLocCd,setSkuCd,status,resultQty",
				vasOrder.getDomainId(), vasOrder.getComCd(), vasOrder.getWhCd(), vasOrder.getWorkLocCd(),
				result.getSetSkuCd(), Inventory.STATUS_STORED, result.getResultQty());

		return this.queryManager.selectListBySql(fallbackSql, fallbackParams, Inventory.class, 0, 1);
	}

	/**
	 * 작업 마감 처리
	 *
	 * @param vasOrderId 작업 지시 ID
	 * @return 마감된 작업 지시
	 */
	@Transactional
	public VasOrder closeVasOrder(String vasOrderId) {
		// 1. 작업 지시 조회
		VasOrder vasOrder = this.queryManager.select(VasOrder.class, vasOrderId);
		if (vasOrder == null) {
			throw new ElidomValidationException("작업 지시를 찾을 수 없습니다. ID: " + vasOrderId);
		}

		// 2. 상태 검증
		if (!WmsVasConstants.STATUS_COMPLETED.equals(vasOrder.getStatus())) {
			throw new ElidomValidationException(
					"마감 가능한 상태가 아닙니다. 현재 상태: " + vasOrder.getStatus());
		}

		// 3. 마감 처리
		vasOrder.setStatus(WmsVasConstants.STATUS_CLOSED);
		this.queryManager.update(vasOrder, "status");

		// SSE 이벤트 발행
		vasSseService.publish(vasOrder.getDomainId(), new VasEventData(
				"ORDER_CLOSED", vasOrder.getVasNo(), vasOrder.getId().toString(),
				WmsVasConstants.STATUS_COMPLETED, vasOrder.getStatus(), vasOrder.getVasType(),
				vasOrder.getVasNo() + " 마감"));

		return vasOrder;
	}

	/********************************************************************************************************
	 * 6. 조회 메서드
	 ********************************************************************************************************/

	/**
	 * 작업 지시 목록 조회
	 *
	 * @param comCd     화주사 코드
	 * @param status    상태
	 * @param vasType   유통가공 유형
	 * @param startDate 시작일
	 * @param endDate   종료일
	 * @return 작업 지시 목록
	 */
	public List<VasOrder> listVasOrders(String comCd, String status, String vasType,
			String startDate, String endDate) {
		Query query = new Query();
		query.addFilter("domainId", Domain.currentDomainId());

		if (ValueUtil.isNotEmpty(comCd)) {
			query.addFilter("comCd", comCd);
		}
		if (ValueUtil.isNotEmpty(status)) {
			query.addFilter("status", status);
		}
		if (ValueUtil.isNotEmpty(vasType)) {
			query.addFilter("vasType", vasType);
		}
		if (ValueUtil.isNotEmpty(startDate)) {
			query.addFilter("vasReqDate", ">=", startDate);
		}
		if (ValueUtil.isNotEmpty(endDate)) {
			query.addFilter("vasReqDate", "<=", endDate);
		}

		query.addOrder("vasReqDate", false);
		query.addOrder("vasNo", false);

		return this.queryManager.selectList(VasOrder.class, query);
	}

	/**
	 * 작업 지시 상세 목록 조회 (재고 바코드 포함)
	 *
	 * stock_allocations 테이블을 LEFT JOIN하여
	 * 각 항목의 할당 재고 바코드(inv_barcds), 수량(inv_alloc_qtys),
	 * 로케이션(inv_loc_cds)을 쉼표 구분 문자열로 함께 반환.
	 * 멀티 로케이션 배정(분할 배정) 시 복수 바코드 지원.
	 *
	 * @param vasOrderId 작업 지시 ID
	 * @return 작업 지시 상세 목록 (inv_barcds/inv_alloc_qtys/inv_loc_cds 포함)
	 */
	@SuppressWarnings({ "unchecked", "rawtypes" })
	public List<Map<String, Object>> listVasOrderItems(String vasOrderId) {
		Long domainId = Domain.currentDomainId();
		String sql =
			"SELECT voi.*, " +
			"  allocs.inv_barcds, allocs.inv_alloc_qtys, allocs.inv_loc_cds " +
			"FROM vas_order_items voi " +
			"LEFT JOIN ( " +
			"  SELECT shipment_order_item_id, " +
			"    STRING_AGG(barcode, ',' ORDER BY created_at ASC) AS inv_barcds, " +
			"    STRING_AGG(CAST(alloc_qty AS TEXT), ',' ORDER BY created_at ASC) AS inv_alloc_qtys, " +
			"    STRING_AGG(loc_cd, ',' ORDER BY created_at ASC) AS inv_loc_cds " +
			"  FROM stock_allocations " +
			"  WHERE domain_id = :domainId AND alloc_type = 'VAS' " +
			"  GROUP BY shipment_order_item_id " +
			") allocs ON allocs.shipment_order_item_id = voi.id " +
			"WHERE voi.domain_id = :domainId AND voi.vas_order_id = :vasOrderId " +
			"ORDER BY voi.vas_seq ASC";

		List result = this.queryManager.selectListBySql(sql,
				ValueUtil.newMap("domainId,vasOrderId", domainId, vasOrderId),
				Map.class, 0, 0);
		return (List<Map<String, Object>>) result;
	}

	/**
	 * 실적 목록 조회
	 *
	 * @param vasOrderId 작업 지시 ID
	 * @return 실적 목록
	 */
	public List<VasResult> listVasResults(String vasOrderId) {
		Query query = new Query();
		query.addFilter("domainId", Domain.currentDomainId());
		query.addFilter("vasOrderId", vasOrderId);
		query.addOrder("resultSeq", true);

		return this.queryManager.selectList(VasResult.class, query);
	}

	/**
	 * BOM 구성 품목 조회
	 *
	 * @param vasBomId BOM ID
	 * @return BOM 구성 품목 목록
	 */
	public List<VasBomItem> listBomItems(String vasBomId) {
		Query query = new Query();
		query.addFilter("domainId", Domain.currentDomainId());
		query.addFilter("vasBomId", vasBomId);
		query.addOrder("bomSeq", true);

		return this.queryManager.selectList(VasBomItem.class, query);
	}

	/********************************************************************************************************
	 * 7. 유틸리티 메서드
	 ********************************************************************************************************/

	/**
	 * 작업 지시 검증
	 *
	 * @param vasOrder 작업 지시
	 */
	private void validateVasOrder(VasOrder vasOrder) {
		if (ValueUtil.isEmpty(vasOrder.getComCd())) {
			throw new ElidomValidationException("화주사 코드는 필수입니다.");
		}
		if (ValueUtil.isEmpty(vasOrder.getVasType())) {
			throw new ElidomValidationException("유통가공 유형은 필수입니다.");
		}
		if (vasOrder.getPlanQty() == null || vasOrder.getPlanQty() <= 0) {
			throw new ElidomValidationException("계획 수량은 0보다 커야 합니다.");
		}

		// SET_ASSEMBLY, DISASSEMBLY 유형은 BOM 필수
		if ((WmsVasConstants.VAS_TYPE_SET_ASSEMBLY.equals(vasOrder.getVasType()) ||
				WmsVasConstants.VAS_TYPE_DISASSEMBLY.equals(vasOrder.getVasType())) &&
				ValueUtil.isEmpty(vasOrder.getVasBomId())) {
			throw new ElidomValidationException(
					vasOrder.getVasType() + " 유형은 BOM이 필수입니다.");
		}
	}

	/**
	 * 작업 지시 상태 자동 업데이트
	 *
	 * 상세 항목의 상태에 따라 헤더 상태를 자동으로 업데이트
	 *
	 * @param vasOrderId 작업 지시 ID
	 */
	private void updateVasOrderStatus(String vasOrderId) {
		// 1. 작업 지시 조회
		VasOrder vasOrder = this.queryManager.select(VasOrder.class, vasOrderId);
		if (vasOrder == null) {
			return;
		}

		// 2. 상세 항목 상태 집계
		String sql = "SELECT status, COUNT(*) as cnt FROM vas_order_items " +
				"WHERE vas_order_id = :vasOrderId AND domain_id = :domainId " +
				"GROUP BY status";

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> statusCounts = (List<Map<String, Object>>) (List<?>) this.queryManager
				.selectListBySql(sql,
						ValueUtil.newMap("vasOrderId,domainId", vasOrderId, vasOrder.getDomainId()),
						Map.class, 0, 0);

		if (statusCounts.isEmpty()) {
			return;
		}

		// 3. 상태 판정
		String newStatus = vasOrder.getStatus();

		boolean allPicked = true;

		for (Map<String, Object> statusCount : statusCounts) {
			String status = (String) statusCount.get("status");

			if (!WmsVasConstants.ITEM_STATUS_PICKED.equals(status)) {
				allPicked = false;
			}
		}

		// 4. 상태 결정 (모든 자재가 PICKED 상태이면 MATERIAL_READY로 전환)
		if (allPicked && WmsVasConstants.STATUS_APPROVED.equals(vasOrder.getStatus())) {
			newStatus = WmsVasConstants.STATUS_MATERIAL_READY;
		}

		// 5. 상태 업데이트
		if (!newStatus.equals(vasOrder.getStatus())) {
			String prevStatus = vasOrder.getStatus();
			vasOrder.setStatus(newStatus);
			this.queryManager.update(vasOrder, "status");

			// SSE 이벤트 발행 (MATERIAL_READY 전환)
			if (WmsVasConstants.STATUS_MATERIAL_READY.equals(newStatus)) {
				vasSseService.publish(vasOrder.getDomainId(), new VasEventData(
						"MATERIAL_READY", vasOrder.getVasNo(), vasOrder.getId().toString(),
						prevStatus, newStatus, vasOrder.getVasType(),
						vasOrder.getVasNo() + " 자재 준비 완료"));
			}
		}
	}

	/********************************************************************************************************
	 * 8. 모니터링 API
	 ********************************************************************************************************/

	/**
	 * 작업 진행 모니터링 - 주문 목록 조회 (자재 진행 요약 포함)
	 *
	 * @param statuses   조회할 상태 목록 (null이면 IN_PROGRESS, APPROVED, MATERIAL_READY)
	 * @param targetDate 기준일 (null이면 오늘. 형식: yyyy-MM-dd)
	 * @return 주문 목록 (자재 진행 요약 포함)
	 */
	public List<Map<String, Object>> getMonitorOrders(List<String> statuses, String targetDate) {
		if (statuses == null || statuses.isEmpty()) {
			statuses = java.util.Arrays.asList(
					WmsVasConstants.STATUS_IN_PROGRESS,
					WmsVasConstants.STATUS_APPROVED,
					WmsVasConstants.STATUS_MATERIAL_READY);
		}

		String date = ValueUtil.isNotEmpty(targetDate) ? targetDate : DateUtil.todayStr();

		String sql = "SELECT vo.id, vo.vas_no, vo.vas_type, vo.status, " +
				"vo.plan_qty, vo.completed_qty, vo.com_cd, vo.wh_cd, " +
				"vo.worker_id, vo.priority, vo.work_loc_cd, " +
				"vo.started_at, vo.approved_at, vo.vas_req_date, " +
				"vo.vas_bom_id, vo.remarks, " +
				"COALESCE(mi.total_items, 0) as total_items, " +
				"COALESCE(mi.picked_items, 0) as picked_items, " +
				"COALESCE(mi.total_req_qty, 0) as total_req_qty, " +
				"COALESCE(mi.total_picked_qty, 0) as total_picked_qty, " +
				"vr.dest_loc_cd " +
				"FROM vas_orders vo " +
				"LEFT JOIN ( " +
				"  SELECT vas_order_id, " +
				"    COUNT(*) as total_items, " +
				"    SUM(CASE WHEN status IN ('PICKED','IN_USE','COMPLETED') THEN 1 ELSE 0 END) as picked_items, " +
				"    SUM(COALESCE(req_qty, 0)) as total_req_qty, " +
				"    SUM(COALESCE(picked_qty, 0)) as total_picked_qty " +
				"  FROM vas_order_items " +
				"  WHERE domain_id = :domainId " +
				"  GROUP BY vas_order_id " +
				") mi ON vo.id = mi.vas_order_id " +
				"LEFT JOIN ( " +
				"  SELECT DISTINCT ON (vas_order_id) vas_order_id, dest_loc_cd " +
				"  FROM vas_results " +
				"  WHERE domain_id = :domainId AND dest_loc_cd IS NOT NULL " +
				"  ORDER BY vas_order_id, result_seq DESC " +
				") vr ON vo.id = vr.vas_order_id " +
				"WHERE vo.domain_id = :domainId " +
				"AND vo.status IN (:statuses) " +
				"AND vo.vas_req_date = :targetDate " +
				"ORDER BY " +
				"  CASE vo.priority WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 WHEN 'LOW' THEN 3 ELSE 4 END, " +
				"  vo.started_at DESC NULLS LAST, vo.approved_at DESC NULLS LAST";

		Map<String, Object> params = new java.util.HashMap<>();
		params.put("domainId", Domain.currentDomainId());
		params.put("statuses", statuses);
		params.put("targetDate", date);

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
				sql, params, Map.class, 0, 0);

		return results;
	}

	/**
	 * 주문번호(vas_no)로 작업 지시 단건 조회 — 날짜 무관 (PDA 바코드 스캔용)
	 *
	 * getMonitorOrders()와 동일한 응답 구조를 반환하되, targetDate 조건 없이 vas_no로만 조회.
	 *
	 * @param vasNo 작업 지시 번호
	 * @return 주문 정보 Map (없으면 null)
	 */
	public Map<String, Object> findOrderByVasNo(String vasNo) {
		if (ValueUtil.isEmpty(vasNo)) {
			return null;
		}

		String sql = "SELECT vo.id, vo.vas_no, vo.vas_type, vo.status, " +
				"vo.plan_qty, vo.completed_qty, vo.com_cd, vo.wh_cd, " +
				"vo.worker_id, vo.priority, vo.work_loc_cd, " +
				"vo.started_at, vo.approved_at, vo.vas_req_date, " +
				"vo.vas_bom_id, vo.remarks, " +
				"COALESCE(mi.total_items, 0) as total_items, " +
				"COALESCE(mi.picked_items, 0) as picked_items, " +
				"COALESCE(mi.total_req_qty, 0) as total_req_qty, " +
				"COALESCE(mi.total_picked_qty, 0) as total_picked_qty, " +
				"vr.dest_loc_cd " +
				"FROM vas_orders vo " +
				"LEFT JOIN ( " +
				"  SELECT vas_order_id, " +
				"    COUNT(*) as total_items, " +
				"    SUM(CASE WHEN status IN ('PICKED','IN_USE','COMPLETED') THEN 1 ELSE 0 END) as picked_items, " +
				"    SUM(COALESCE(req_qty, 0)) as total_req_qty, " +
				"    SUM(COALESCE(picked_qty, 0)) as total_picked_qty " +
				"  FROM vas_order_items " +
				"  WHERE domain_id = :domainId " +
				"  GROUP BY vas_order_id " +
				") mi ON vo.id = mi.vas_order_id " +
				"LEFT JOIN ( " +
				"  SELECT DISTINCT ON (vas_order_id) vas_order_id, dest_loc_cd " +
				"  FROM vas_results " +
				"  WHERE domain_id = :domainId AND dest_loc_cd IS NOT NULL " +
				"  ORDER BY vas_order_id, result_seq DESC " +
				") vr ON vo.id = vr.vas_order_id " +
				"WHERE vo.domain_id = :domainId " +
				"AND vo.vas_no = :vasNo";

		Map<String, Object> params = new java.util.HashMap<>();
		params.put("domainId", Domain.currentDomainId());
		params.put("vasNo", vasNo);

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
				sql, params, Map.class, 0, 1);

		return results.isEmpty() ? null : results.get(0);
	}

	/********************************************************************************************************
	 * 9. 대시보드 통계 API
	 ********************************************************************************************************/

	/**
	 * 대시보드 - 상태별 건수 조회
	 *
	 * @param comCd      화주사 코드 (optional)
	 * @param whCd       창고 코드 (optional)
	 * @param targetDate 기준일 (optional, 기본값: 오늘)
	 * @return 상태별 건수 Map { status: count }
	 */
	public Map<String, Object> getDashboardStatusCounts(String comCd, String whCd, String targetDate) {
		String date = ValueUtil.isNotEmpty(targetDate) ? targetDate : DateUtil.todayStr();

		String sql = "SELECT status, COUNT(*) as count " +
				"FROM vas_orders " +
				"WHERE domain_id = :domainId " +
				"AND vas_req_date = :targetDate ";

		Map<String, Object> params = ValueUtil.newMap("domainId,targetDate", Domain.currentDomainId(), date);

		if (ValueUtil.isNotEmpty(comCd)) {
			sql += "AND com_cd = :comCd ";
			params.put("comCd", comCd);
		}
		if (ValueUtil.isNotEmpty(whCd)) {
			sql += "AND wh_cd = :whCd ";
			params.put("whCd", whCd);
		}

		sql += "GROUP BY status";

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
				sql, params, Map.class, 0, 0);

		// 원시 상태별 집계
		Map<String, Long> raw = new java.util.HashMap<>();
		for (Map<String, Object> row : results) {
			String status = (String) row.get("status");
			Long count = ((Number) row.get("count")).longValue();
			raw.put(status, count);
		}

		// 대시보드 카드 기준으로 합산하여 반환
		// 승인완료 = APPROVED + MATERIAL_READY
		// 완료     = COMPLETED + CLOSED
		Map<String, Object> statusCounts = new java.util.HashMap<>();
		statusCounts.put("PLAN", raw.getOrDefault("PLAN", 0L));
		statusCounts.put("APPROVED", raw.getOrDefault("APPROVED", 0L) + raw.getOrDefault("MATERIAL_READY", 0L));
		statusCounts.put("IN_PROGRESS", raw.getOrDefault("IN_PROGRESS", 0L));
		statusCounts.put("COMPLETED", raw.getOrDefault("COMPLETED", 0L) + raw.getOrDefault("CLOSED", 0L));

		return statusCounts;
	}

	/**
	 * 대시보드 - VAS 유형별 통계 조회
	 *
	 * @param comCd     화주사 코드 (optional)
	 * @param whCd      창고 코드 (optional)
	 * @param startDate 시작일 (optional, 기본값: 오늘)
	 * @param endDate   종료일 (optional, 기본값: 오늘)
	 * @return 유형별 건수 Map { vasType: count }
	 */
	public Map<String, Object> getDashboardTypeStats(String comCd, String whCd, String startDate, String endDate) {
		String start = ValueUtil.isNotEmpty(startDate) ? startDate : DateUtil.todayStr();
		String end = ValueUtil.isNotEmpty(endDate) ? endDate : DateUtil.todayStr();

		String sql = "SELECT vas_type, COUNT(*) as count " +
				"FROM vas_orders " +
				"WHERE domain_id = :domainId " +
				"AND vas_req_date >= :startDate " +
				"AND vas_req_date <= :endDate ";

		Map<String, Object> params = ValueUtil.newMap("domainId,startDate,endDate",
				Domain.currentDomainId(), start, end);

		if (ValueUtil.isNotEmpty(comCd)) {
			sql += "AND com_cd = :comCd ";
			params.put("comCd", comCd);
		}
		if (ValueUtil.isNotEmpty(whCd)) {
			sql += "AND wh_cd = :whCd ";
			params.put("whCd", whCd);
		}

		sql += "GROUP BY vas_type";

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
				sql, params, Map.class, 0, 0);

		// 결과를 Map으로 변환 (키는 DB vas_type 값과 일치시킴)
		Map<String, Object> typeStats = new java.util.HashMap<>();
		typeStats.put("SET_ASSEMBLY", 0);
		typeStats.put("DISASSEMBLY", 0);
		typeStats.put("REPACK", 0);
		typeStats.put("LABEL", 0);
		typeStats.put("CUSTOM", 0);

		for (Map<String, Object> row : results) {
			String vasType = (String) row.get("vas_type");
			Object count = row.get("count");
			typeStats.put(vasType, count);
		}

		return typeStats;
	}

	/**
	 * 대시보드 - 알림 데이터 조회
	 *
	 * @param comCd 화주사 코드 (optional)
	 * @param whCd  창고 코드 (optional)
	 * @return 알림 목록 List<Map<String, Object>>
	 */
	public List<Map<String, Object>> getDashboardAlerts(String comCd, String whCd) {
		List<Map<String, Object>> alerts = new java.util.ArrayList<>();

		// 1. 배정 필요 알림 (디테일 배정수량 미달 주문)
		String sql1 = "SELECT DISTINCT vo.vas_no " +
				"FROM vas_order_items voi " +
				"INNER JOIN vas_orders vo ON voi.vas_order_id = vo.id " +
				"WHERE voi.domain_id = :domainId " +
				"AND voi.status IN (:statuses) " +
				"AND (voi.alloc_qty IS NULL OR voi.alloc_qty < voi.req_qty) " +
				"ORDER BY vo.vas_no";

		Map<String, Object> params1 = ValueUtil.newMap("domainId", Domain.currentDomainId());
		params1.put("statuses", java.util.Arrays.asList(
				WmsVasConstants.ITEM_STATUS_PLANNED,
				WmsVasConstants.ITEM_STATUS_ALLOCATED));

		if (ValueUtil.isNotEmpty(comCd)) {
			sql1 += " AND vo.com_cd = :comCd";
			params1.put("comCd", comCd);
		}
		if (ValueUtil.isNotEmpty(whCd)) {
			sql1 += " AND vo.wh_cd = :whCd";
			params1.put("whCd", whCd);
		}

		@SuppressWarnings("unchecked")
		List<String> pendingVasNos = (List<String>) (List<?>) this.queryManager.selectListBySql(
				sql1, params1, String.class, 0, 0);

		if (!pendingVasNos.isEmpty()) {
			Map<String, Object> alert = new java.util.HashMap<>();
			alert.put("type", "warning");
			alert.put("icon", "📦");
			alert.put("message", "배정 필요: " + pendingVasNos.size() + "건 (" + String.join(", ", pendingVasNos) + ")");
			alerts.add(alert);
		}

		// 2. 작업 지연 알림 (승인 후 24시간 이상 진행 없음)
		String sql2 = "SELECT COUNT(*) as count " +
				"FROM vas_orders " +
				"WHERE domain_id = :domainId " +
				"AND status = :status " +
				"AND approved_at < (NOW() - INTERVAL '24 hours')";

		Map<String, Object> params2 = ValueUtil.newMap("domainId,status",
				Domain.currentDomainId(), WmsVasConstants.STATUS_APPROVED);

		if (ValueUtil.isNotEmpty(comCd)) {
			sql2 += " AND com_cd = :comCd";
			params2.put("comCd", comCd);
		}
		if (ValueUtil.isNotEmpty(whCd)) {
			sql2 += " AND wh_cd = :whCd";
			params2.put("whCd", whCd);
		}

		Integer delayedWorkCount = this.queryManager.selectBySql(sql2, params2, Integer.class);
		if (delayedWorkCount != null && delayedWorkCount > 0) {
			Map<String, Object> alert = new java.util.HashMap<>();
			alert.put("type", "warning");
			alert.put("icon", "⏰");
			alert.put("message", "작업 지연: " + delayedWorkCount + "건 (24시간 이상 대기)");
			alerts.add(alert);
		}

		return alerts;
	}

	/********************************************************************************************************
	 * 10. VAS 재고 처리
	 ********************************************************************************************************/

	/**
	 * VAS 유형별 재고 처리
	 *
	 * SET_ASSEMBLY : 구성품 재고 차감 → 세트 SKU 재고 생성
	 * DISASSEMBLY : 세트 SKU 재고 차감 → 구성품 재고 생성
	 * 기타(REPACK/LABEL/CUSTOM) : 수량 변화 없음 — 스킵
	 *
	 * @param vasOrder 작업 지시
	 * @param result   실적 정보
	 */
	private void processInventoryByVasType(VasOrder vasOrder, VasResult result) {
		this.processInventoryByVasType(vasOrder, result, null);
	}

	/**
	 * VAS 유형별 재고 처리
	 *
	 * @param vasOrder    작업 지시
	 * @param result      실적 정보
	 * @param expiredDate 완성품 유통기한
	 */
	private void processInventoryByVasType(VasOrder vasOrder, VasResult result, String expiredDate) {
		String vasType = vasOrder.getVasType();

		if (WmsVasConstants.VAS_TYPE_SET_ASSEMBLY.equals(vasType)) {
			// 할당 원재고 차감은 완료 처리 초입에서 수행하고, 여기서는 결과 재고만 생성한다.
			this.createSetSkuInventory(vasOrder, result, expiredDate);

		} else if (WmsVasConstants.VAS_TYPE_DISASSEMBLY.equals(vasType)) {
			// 할당 원재고 차감은 완료 처리 초입에서 수행하고, 여기서는 결과 재고만 생성한다.
			if (ValueUtil.isNotEmpty(vasOrder.getVasBomId())) {
				this.createComponentInventories(vasOrder, result, expiredDate);
			}
		}
		// REPACK, LABEL, CUSTOM: 재고 수량 변화 없음 — 스킵
	}

	/**
	 * SET_ASSEMBLY 시 BOM 구성품 재고 차감
	 *
	 * BOM item별 소비량 = resultQty × componentQty
	 * FIFO 순(created_at ASC)으로 재고를 조회하여 소비량만큼 차감
	 *
	 * @param vasOrder 작업 지시
	 * @param result   실적 정보
	 */
	private void consumeComponentInventories(VasOrder vasOrder, VasResult result) {
		Query bomQuery = new Query();
		bomQuery.addFilter("domainId", vasOrder.getDomainId());
		bomQuery.addFilter("vasBomId", vasOrder.getVasBomId());
		bomQuery.addOrder("bomSeq", true);
		List<VasBomItem> bomItems = this.queryManager.selectList(VasBomItem.class, bomQuery);

		for (VasBomItem bomItem : bomItems) {
			double usedQty = result.getResultQty() * bomItem.getComponentQty();
			this.deductInventory(vasOrder.getDomainId(), vasOrder.getComCd(), vasOrder.getWhCd(),
					bomItem.getSkuCd(), usedQty, vasOrder.getVasNo());
		}
	}

	/**
	 * DISASSEMBLY 시 세트 SKU 재고 차감
	 *
	 * @param vasOrder 작업 지시
	 * @param result   실적 정보
	 */
	private void consumeSetSkuInventory(VasOrder vasOrder, VasResult result) {
		this.deductInventory(vasOrder.getDomainId(), vasOrder.getComCd(), vasOrder.getWhCd(),
				result.getSetSkuCd(), result.getResultQty(), vasOrder.getVasNo());
	}

	/**
	 * 창고 내 특정 SKU 재고에서 qty 차감 (FIFO 순)
	 *
	 * 재고 부족 시 경고 로그만 남기고 계속 진행 (실적은 이미 등록된 상태)
	 *
	 * @param domainId 도메인 ID
	 * @param comCd    화주사 코드
	 * @param whCd     창고 코드
	 * @param skuCd    상품 코드
	 * @param qty      차감할 수량
	 * @param vasNo    작업 지시 번호 (로그용)
	 */
	private void deductInventory(Long domainId, String comCd, String whCd, String skuCd, double qty, String vasNo) {
		String sql = "SELECT * FROM inventories " +
				"WHERE domain_id = :domainId AND com_cd = :comCd AND wh_cd = :whCd AND sku_cd = :skuCd " +
				"AND (del_flag IS NULL OR del_flag = false) AND inv_qty > 0 " +
				"ORDER BY created_at ASC";
		List<Inventory> invList = this.queryManager.selectListBySql(sql,
				ValueUtil.newMap("domainId,comCd,whCd,skuCd", domainId, comCd, whCd, skuCd),
				Inventory.class, 0, 0);

		if (invList.isEmpty()) {
			this.logger.warn("VAS 재고 차감 실패 - 가용 재고 없음: vasNo={}, skuCd={}, qty={}", vasNo, skuCd, qty);
			return;
		}

		double remainQty = qty;
		for (Inventory inv : invList) {
			if (remainQty <= 0.0001)
				break;
			double deductQty = Math.min(inv.getInvQty(), remainQty);
			String deductSql = "UPDATE inventories " +
					"SET inv_qty = inv_qty - :deductQty, last_tran_cd = :tranCd, updated_at = now() " +
					"WHERE id = :invId AND domain_id = :domainId AND inv_qty >= :deductQty";
			this.queryManager.executeBySql(deductSql, ValueUtil.newMap(
					"deductQty,tranCd,invId,domainId",
					deductQty, Inventory.TRANSACTION_VAS_OUT, inv.getId(), domainId));
			remainQty -= deductQty;
		}

		if (remainQty > 0.0001) {
			this.logger.warn("VAS 재고 부분 차감: vasNo={}, skuCd={}, 차감={}/{}", vasNo, skuCd, qty - remainQty, qty);
		}
	}

	/**
	 * SET_ASSEMBLY 완성품(세트 SKU) 재고 생성
	 *
	 * 작업 완료 전에는 작업장 로케이션에 생성하고, 완료 시 적치 로케이션으로 이동한다.
	 *
	 * @param vasOrder 작업 지시
	 * @param result   실적 정보
	 */
	private void createSetSkuInventory(VasOrder vasOrder, VasResult result, String expiredDate) {
		String workLocCd = vasOrder.getWorkLocCd();
		if (ValueUtil.isEmpty(workLocCd)) {
			this.logger.warn("VAS 세트 재고 생성 실패 - workLocCd 없음: vasNo={}", vasOrder.getVasNo());
			return;
		}

		Inventory newInv = new Inventory();
		newInv.setDomainId(vasOrder.getDomainId());
		newInv.setComCd(vasOrder.getComCd());
		newInv.setWhCd(vasOrder.getWhCd());
		newInv.setLocCd(workLocCd);
		newInv.setSkuCd(result.getSetSkuCd());
		newInv.setInvQty(result.getResultQty());
		newInv.setLotNo(result.getLotNo());
		newInv.setExpiredDate(expiredDate);
		newInv.setStatus(Inventory.STATUS_STORED);
		newInv.setRemarks("VAS 완성품 재고 생성: " + vasOrder.getVasNo());
		this.stockTrxSvc.createInventory(vasOrder.getDomainId(), newInv);
	}

	/**
	 * DISASSEMBLY 시 BOM 구성품 재고 생성
	 *
	 * 구성품별 생성 수량 = resultQty × componentQty
	 * 작업 완료 전에는 작업장 로케이션에 생성하고, 완료 시 적치 로케이션으로 이동한다.
	 *
	 * @param vasOrder 작업 지시
	 * @param result   실적 정보
	 */
	private void createComponentInventories(VasOrder vasOrder, VasResult result, String expiredDate) {
		String workLocCd = vasOrder.getWorkLocCd();
		if (ValueUtil.isEmpty(workLocCd)) {
			this.logger.warn("VAS 구성품 재고 생성 실패 - workLocCd 없음: vasNo={}", vasOrder.getVasNo());
			return;
		}

		Query bomQuery = new Query();
		bomQuery.addFilter("domainId", vasOrder.getDomainId());
		bomQuery.addFilter("vasBomId", vasOrder.getVasBomId());
		bomQuery.addOrder("bomSeq", true);
		List<VasBomItem> bomItems = this.queryManager.selectList(VasBomItem.class, bomQuery);

		for (VasBomItem bomItem : bomItems) {
			double compQty = result.getResultQty() * bomItem.getComponentQty();

			Inventory newInv = new Inventory();
			newInv.setDomainId(vasOrder.getDomainId());
			newInv.setComCd(vasOrder.getComCd());
			newInv.setWhCd(vasOrder.getWhCd());
			newInv.setLocCd(workLocCd);
			newInv.setSkuCd(bomItem.getSkuCd());
			newInv.setInvQty(compQty);
			newInv.setExpiredDate(expiredDate);
			newInv.setStatus(Inventory.STATUS_STORED);
			newInv.setRemarks("VAS 해체 구성품 재고 생성: " + vasOrder.getVasNo());

			this.stockTrxSvc.createInventory(vasOrder.getDomainId(), newInv);
		}
	}
}
