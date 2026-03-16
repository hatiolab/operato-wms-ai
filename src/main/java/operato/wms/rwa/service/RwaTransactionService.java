package operato.wms.rwa.service;

import java.util.Date;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import operato.wms.base.entity.SKU;
import operato.wms.base.service.RuntimeConfigService;
import operato.wms.base.service.WmsBaseService;
import operato.wms.rwa.WmsRwaConfigConstants;
import operato.wms.rwa.WmsRwaConstants;
import operato.wms.rwa.entity.RwaDisposition;
import operato.wms.rwa.entity.RwaInspection;
import operato.wms.rwa.entity.RwaOrder;
import operato.wms.rwa.entity.RwaOrderItem;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.util.ThrowUtil;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * RWA(Return Warehouse Authorization) 모듈 트랜잭션 처리 서비스
 *
 * 반품 프로세스:
 * 1. 반품 요청 (REQUEST) → createRwaOrder()
 * 2. 반품 승인 (APPROVED) → approveRwaOrder()
 * 3. 반품 입고 (RECEIVING) → receiveRwaItem()
 * 4. 반품 검수 (INSPECTING/INSPECTED) → inspectRwaItem()
 * 5. 반품 처분 (DISPOSED) → disposeRwaItem()
 * 6. 완료 (COMPLETED) → completeRwaOrder()
 *
 * @author HatioLab
 */
@Component
public class RwaTransactionService extends AbstractQueryService {

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

	/********************************************************************************************************
	 * 1. 반품 지시 생성 및 승인
	 ********************************************************************************************************/

	/**
	 * 반품 지시 생성
	 *
	 * @param rwaOrder 반품 지시 정보
	 * @return 생성된 반품 지시
	 */
	@Transactional
	public RwaOrder createRwaOrder(RwaOrder rwaOrder) {
		// 1. 필수 필드 검증
		this.validateRwaOrder(rwaOrder);

		// 2. 기본값 설정
		if (ValueUtil.isEmpty(rwaOrder.getRwaReqDate())) {
			rwaOrder.setRwaReqDate(DateUtil.todayStr());
		}

		if (rwaOrder.getInspFlag() == null) {
			// 설정값 조회 (기본: true)
			String inspRequiredStr = this.runtimeConfSvc.getRuntimeConfigValue(
				rwaOrder.getComCd(), rwaOrder.getWhCd(),
				WmsRwaConfigConstants.RWA_INSPECTION_REQUIRED_FLAG);
			boolean inspRequired = ValueUtil.toBoolean(inspRequiredStr, true);
			rwaOrder.setInspFlag(inspRequired);
		}

		// 3. 반품 지시 생성
		this.queryManager.insert(rwaOrder);

		return rwaOrder;
	}

	/**
	 * 반품 지시 생성 with 상세 항목
	 *
	 * @param rwaOrder 반품 지시 정보
	 * @param items 반품 상세 항목 목록
	 * @return 생성된 반품 지시
	 */
	@Transactional
	public RwaOrder createRwaOrderWithItems(RwaOrder rwaOrder, List<RwaOrderItem> items) {
		// 1. 반품 지시 생성
		rwaOrder = this.createRwaOrder(rwaOrder);

		// 2. 상세 항목 생성
		if (items != null && !items.isEmpty()) {
			int totalBox = 0;
			int totalPallet = 0;

			for (RwaOrderItem item : items) {
				item.setRwaOrderId(rwaOrder.getId());
				item.setDomainId(rwaOrder.getDomainId());

				// SKU 명 조회
				if (ValueUtil.isEmpty(item.getSkuNm()) && ValueUtil.isNotEmpty(item.getSkuCd())) {
					SKU sku = this.queryManager.selectByCondition(SKU.class,
						new SKU(rwaOrder.getDomainId(), rwaOrder.getComCd(), item.getSkuCd()));
					if (sku != null) {
						item.setSkuNm(sku.getSkuNm());
					}
				}

				this.queryManager.insert(item);

				// 총 박스/팔레트 수량 집계
				if (item.getBoxQty() != null) {
					totalBox += item.getBoxQty();
				}
				if (item.getPalletQty() != null) {
					totalPallet += item.getPalletQty();
				}
			}

			// 3. 반품 지시 헤더 총 수량 업데이트
			if (totalBox > 0 || totalPallet > 0) {
				rwaOrder.setTotalBox(totalBox);
				rwaOrder.setTotalPallet(totalPallet);
				this.queryManager.update(rwaOrder, "totalBox", "totalPallet");
			}
		}

		return rwaOrder;
	}

	/**
	 * 반품 지시 승인
	 *
	 * @param rwaOrderId 반품 지시 ID
	 * @param approvedBy 승인자 ID
	 * @return 승인된 반품 지시
	 */
	@Transactional
	public RwaOrder approveRwaOrder(String rwaOrderId, String approvedBy) {
		// 1. 반품 지시 조회
		RwaOrder rwaOrder = this.queryManager.select(RwaOrder.class, rwaOrderId);
		if (rwaOrder == null) {
			throw ThrowUtil.newValidationErrorWithNoLog("반품 지시를 찾을 수 없습니다. ID: " + rwaOrderId);
		}

		// 2. 상태 검증
		if (!WmsRwaConstants.STATUS_REQUEST.equals(rwaOrder.getStatus())) {
			throw ThrowUtil.newValidationErrorWithNoLog(
				"승인 가능한 상태가 아닙니다. 현재 상태: " + rwaOrder.getStatus());
		}

		// 3. 승인 처리
		rwaOrder.setStatus(WmsRwaConstants.STATUS_APPROVED);
		rwaOrder.setApprovedBy(approvedBy);
		rwaOrder.setApprovedAt(new Date());

		this.queryManager.update(rwaOrder, "status", "approvedBy", "approvedAt");

		// 4. 상세 항목 상태 업데이트
		String sql = "UPDATE rwa_order_items SET status = :status WHERE rwa_order_id = :rwaOrderId AND domain_id = :domainId";
		this.queryManager.executeBySql(sql, ValueUtil.newMap(
			"status,rwaOrderId,domainId",
			WmsRwaConstants.STATUS_APPROVED, rwaOrderId, rwaOrder.getDomainId()));

		return rwaOrder;
	}

	/**
	 * 반품 지시 거부
	 *
	 * @param rwaOrderId 반품 지시 ID
	 * @param rejectedBy 거부자 ID
	 * @param rejectReason 거부 사유
	 * @return 거부된 반품 지시
	 */
	@Transactional
	public RwaOrder rejectRwaOrder(String rwaOrderId, String rejectedBy, String rejectReason) {
		// 1. 반품 지시 조회
		RwaOrder rwaOrder = this.queryManager.select(RwaOrder.class, rwaOrderId);
		if (rwaOrder == null) {
			throw ThrowUtil.newValidationErrorWithNoLog("반품 지시를 찾을 수 없습니다. ID: " + rwaOrderId);
		}

		// 2. 상태 검증
		if (!WmsRwaConstants.STATUS_REQUEST.equals(rwaOrder.getStatus())) {
			throw ThrowUtil.newValidationErrorWithNoLog(
				"거부 가능한 상태가 아닙니다. 현재 상태: " + rwaOrder.getStatus());
		}

		// 3. 거부 처리
		rwaOrder.setStatus(WmsRwaConstants.STATUS_REJECTED);
		rwaOrder.setRemarks(rejectReason);

		this.queryManager.update(rwaOrder, "status", "remarks");

		return rwaOrder;
	}

	/********************************************************************************************************
	 * 2. 반품 입고
	 ********************************************************************************************************/

	/**
	 * 반품 입고 처리
	 *
	 * @param rwaOrderItemId 반품 상세 ID
	 * @param rwaQty 실제 입고 수량
	 * @param locCd 입고 로케이션
	 * @return 업데이트된 반품 상세
	 */
	@Transactional
	public RwaOrderItem receiveRwaItem(String rwaOrderItemId, Double rwaQty, String locCd) {
		// 1. 반품 상세 조회
		RwaOrderItem item = this.queryManager.select(RwaOrderItem.class, rwaOrderItemId);
		if (item == null) {
			throw ThrowUtil.newValidationErrorWithNoLog("반품 상세를 찾을 수 없습니다. ID: " + rwaOrderItemId);
		}

		// 2. 상태 검증
		if (!WmsRwaConstants.STATUS_APPROVED.equals(item.getStatus()) &&
			!WmsRwaConstants.STATUS_RECEIVING.equals(item.getStatus())) {
			throw ThrowUtil.newValidationErrorWithNoLog(
				"입고 가능한 상태가 아닙니다. 현재 상태: " + item.getStatus());
		}

		// 3. 입고 처리
		item.setRwaQty(rwaQty);
		item.setLocCd(locCd);
		item.setStatus(WmsRwaConstants.STATUS_RECEIVING);

		this.queryManager.update(item, "rwaQty", "locCd", "status");

		// 4. 헤더 상태 업데이트
		this.updateRwaOrderStatus(item.getRwaOrderId());

		return item;
	}

	/********************************************************************************************************
	 * 3. 반품 검수
	 ********************************************************************************************************/

	/**
	 * 반품 검수 처리
	 *
	 * @param rwaOrderItemId 반품 상세 ID
	 * @param inspection 검수 정보
	 * @return 생성된 검수 기록
	 */
	@Transactional
	public RwaInspection inspectRwaItem(String rwaOrderItemId, RwaInspection inspection) {
		// 1. 반품 상세 조회
		RwaOrderItem item = this.queryManager.select(RwaOrderItem.class, rwaOrderItemId);
		if (item == null) {
			throw ThrowUtil.newValidationErrorWithNoLog("반품 상세를 찾을 수 없습니다. ID: " + rwaOrderItemId);
		}

		// 2. 상태 검증
		if (!WmsRwaConstants.STATUS_RECEIVING.equals(item.getStatus()) &&
			!WmsRwaConstants.STATUS_INSPECTING.equals(item.getStatus())) {
			throw ThrowUtil.newValidationErrorWithNoLog(
				"검수 가능한 상태가 아닙니다. 현재 상태: " + item.getStatus());
		}

		// 3. 검수 기록 생성
		inspection.setRwaOrderItemId(rwaOrderItemId);
		inspection.setDomainId(item.getDomainId());
		this.queryManager.insert(inspection);

		// 4. Entity의 afterCreate()에서 자동으로 rwa_order_items 업데이트 수행

		// 5. 헤더 상태 업데이트
		this.updateRwaOrderStatus(item.getRwaOrderId());

		return inspection;
	}

	/**
	 * 반품 검수 완료 처리
	 *
	 * @param rwaOrderItemId 반품 상세 ID
	 * @return 업데이트된 반품 상세
	 */
	@Transactional
	public RwaOrderItem completeInspection(String rwaOrderItemId) {
		// 1. 반품 상세 조회
		RwaOrderItem item = this.queryManager.select(RwaOrderItem.class, rwaOrderItemId);
		if (item == null) {
			throw ThrowUtil.newValidationErrorWithNoLog("반품 상세를 찾을 수 없습니다. ID: " + rwaOrderItemId);
		}

		// 2. 검수 완료 여부 확인
		if (item.getInspectedQty() == null || item.getInspectedQty() < item.getRwaQty()) {
			throw ThrowUtil.newValidationErrorWithNoLog(
				"검수가 완료되지 않았습니다. 검수 수량: " + item.getInspectedQty() + " / 입고 수량: " + item.getRwaQty());
		}

		// 3. 상태 업데이트
		item.setStatus(WmsRwaConstants.STATUS_INSPECTED);
		this.queryManager.update(item, "status");

		// 4. 헤더 상태 업데이트
		this.updateRwaOrderStatus(item.getRwaOrderId());

		return item;
	}

	/********************************************************************************************************
	 * 4. 반품 처분
	 ********************************************************************************************************/

	/**
	 * 반품 처분 처리
	 *
	 * @param rwaOrderItemId 반품 상세 ID
	 * @param disposition 처분 정보
	 * @return 생성된 처분 기록
	 */
	@Transactional
	public RwaDisposition disposeRwaItem(String rwaOrderItemId, RwaDisposition disposition) {
		// 1. 반품 상세 조회
		RwaOrderItem item = this.queryManager.select(RwaOrderItem.class, rwaOrderItemId);
		if (item == null) {
			throw ThrowUtil.newValidationErrorWithNoLog("반품 상세를 찾을 수 없습니다. ID: " + rwaOrderItemId);
		}

		// 2. 상태 검증
		if (!WmsRwaConstants.STATUS_INSPECTED.equals(item.getStatus())) {
			throw ThrowUtil.newValidationErrorWithNoLog(
				"처분 가능한 상태가 아닙니다. 현재 상태: " + item.getStatus());
		}

		// 3. 처분 유형별 필수 필드 검증
		this.validateDisposition(disposition);

		// 4. 처분 기록 생성
		disposition.setRwaOrderItemId(rwaOrderItemId);
		disposition.setDomainId(item.getDomainId());
		this.queryManager.insert(disposition);

		// 5. Entity의 afterCreate()에서 자동으로 rwa_order_items 업데이트 수행

		// 6. 헤더 상태 업데이트
		this.updateRwaOrderStatus(item.getRwaOrderId());

		return disposition;
	}

	/********************************************************************************************************
	 * 5. 반품 완료 및 마감
	 ********************************************************************************************************/

	/**
	 * 반품 지시 완료 처리
	 *
	 * @param rwaOrderId 반품 지시 ID
	 * @return 완료된 반품 지시
	 */
	@Transactional
	public RwaOrder completeRwaOrder(String rwaOrderId) {
		// 1. 반품 지시 조회
		RwaOrder rwaOrder = this.queryManager.select(RwaOrder.class, rwaOrderId);
		if (rwaOrder == null) {
			throw ThrowUtil.newValidationErrorWithNoLog("반품 지시를 찾을 수 없습니다. ID: " + rwaOrderId);
		}

		// 2. 모든 상세 항목이 처분 완료 상태인지 확인
		String sql = "SELECT COUNT(*) FROM rwa_order_items WHERE rwa_order_id = :rwaOrderId " +
					 "AND domain_id = :domainId AND status != :status";
		int incompleteCount = this.queryManager.selectBySql(sql,
			ValueUtil.newMap("rwaOrderId,domainId,status",
				rwaOrderId, rwaOrder.getDomainId(), WmsRwaConstants.STATUS_DISPOSED),
			Integer.class);

		if (incompleteCount > 0) {
			throw ThrowUtil.newValidationErrorWithNoLog(
				"모든 상세 항목이 처분 완료되지 않았습니다. 미완료 항목: " + incompleteCount);
		}

		// 3. 완료 처리
		rwaOrder.setStatus(WmsRwaConstants.STATUS_COMPLETED);
		rwaOrder.setRwaEndDate(DateUtil.todayStr());
		this.queryManager.update(rwaOrder, "status", "rwaEndDate");

		return rwaOrder;
	}

	/**
	 * 반품 지시 마감 처리
	 *
	 * @param rwaOrderId 반품 지시 ID
	 * @return 마감된 반품 지시
	 */
	@Transactional
	public RwaOrder closeRwaOrder(String rwaOrderId) {
		// 1. 반품 지시 조회
		RwaOrder rwaOrder = this.queryManager.select(RwaOrder.class, rwaOrderId);
		if (rwaOrder == null) {
			throw ThrowUtil.newValidationErrorWithNoLog("반품 지시를 찾을 수 없습니다. ID: " + rwaOrderId);
		}

		// 2. 상태 검증
		if (!WmsRwaConstants.STATUS_COMPLETED.equals(rwaOrder.getStatus())) {
			throw ThrowUtil.newValidationErrorWithNoLog(
				"마감 가능한 상태가 아닙니다. 현재 상태: " + rwaOrder.getStatus());
		}

		// 3. 마감 처리
		rwaOrder.setStatus(WmsRwaConstants.STATUS_CLOSED);
		this.queryManager.update(rwaOrder, "status");

		return rwaOrder;
	}

	/********************************************************************************************************
	 * 6. 조회 메서드
	 ********************************************************************************************************/

	/**
	 * 반품 지시 목록 조회
	 *
	 * @param comCd 화주사 코드
	 * @param status 상태
	 * @param rwaType 반품 유형
	 * @param startDate 시작일
	 * @param endDate 종료일
	 * @return 반품 지시 목록
	 */
	public List<RwaOrder> listRwaOrders(String comCd, String status, String rwaType,
										 String startDate, String endDate) {
		Query query = new Query();
		query.addFilter("domainId", Domain.currentDomainId());

		if (ValueUtil.isNotEmpty(comCd)) {
			query.addFilter("comCd", comCd);
		}
		if (ValueUtil.isNotEmpty(status)) {
			query.addFilter("status", status);
		}
		if (ValueUtil.isNotEmpty(rwaType)) {
			query.addFilter("rwaType", rwaType);
		}
		if (ValueUtil.isNotEmpty(startDate)) {
			query.addFilter("rwaReqDate", ">=", startDate);
		}
		if (ValueUtil.isNotEmpty(endDate)) {
			query.addFilter("rwaReqDate", "<=", endDate);
		}

		query.addOrder("rwaReqDate", false);
		query.addOrder("rwaNo", false);

		return this.queryManager.selectList(RwaOrder.class, query);
	}

	/**
	 * 반품 상세 목록 조회
	 *
	 * @param rwaOrderId 반품 지시 ID
	 * @return 반품 상세 목록
	 */
	public List<RwaOrderItem> listRwaOrderItems(String rwaOrderId) {
		Query query = new Query();
		query.addFilter("domainId", Domain.currentDomainId());
		query.addFilter("rwaOrderId", rwaOrderId);
		query.addOrder("rwaSeq", true);

		return this.queryManager.selectList(RwaOrderItem.class, query);
	}

	/**
	 * 반품 검수 기록 조회
	 *
	 * @param rwaOrderItemId 반품 상세 ID
	 * @return 검수 기록 목록
	 */
	public List<RwaInspection> listRwaInspections(String rwaOrderItemId) {
		Query query = new Query();
		query.addFilter("domainId", Domain.currentDomainId());
		query.addFilter("rwaOrderItemId", rwaOrderItemId);
		query.addOrder("inspSeq", true);

		return this.queryManager.selectList(RwaInspection.class, query);
	}

	/********************************************************************************************************
	 * 7. 유틸리티 메서드
	 ********************************************************************************************************/

	/**
	 * 반품 지시 검증
	 *
	 * @param rwaOrder 반품 지시
	 */
	private void validateRwaOrder(RwaOrder rwaOrder) {
		if (ValueUtil.isEmpty(rwaOrder.getComCd())) {
			throw ThrowUtil.newValidationErrorWithNoLog("화주사 코드는 필수입니다.");
		}
		if (ValueUtil.isEmpty(rwaOrder.getWhCd())) {
			throw ThrowUtil.newValidationErrorWithNoLog("창고 코드는 필수입니다.");
		}
		if (ValueUtil.isEmpty(rwaOrder.getRwaType())) {
			throw ThrowUtil.newValidationErrorWithNoLog("반품 유형은 필수입니다.");
		}
	}

	/**
	 * 처분 정보 검증
	 *
	 * @param disposition 처분 정보
	 */
	private void validateDisposition(RwaDisposition disposition) {
		String dispositionType = disposition.getDispositionType();

		if (ValueUtil.isEmpty(dispositionType)) {
			throw ThrowUtil.newValidationErrorWithNoLog("처분 유형은 필수입니다.");
		}

		// 처분 유형별 필수 필드 검증
		switch (dispositionType) {
			case WmsRwaConstants.DISPOSITION_TYPE_RESTOCK:
				if (ValueUtil.isEmpty(disposition.getRestockLocCd())) {
					throw ThrowUtil.newValidationErrorWithNoLog("재입고 로케이션은 필수입니다.");
				}
				break;
			case WmsRwaConstants.DISPOSITION_TYPE_SCRAP:
				if (ValueUtil.isEmpty(disposition.getScrapMethod())) {
					throw ThrowUtil.newValidationErrorWithNoLog("폐기 방법은 필수입니다.");
				}
				break;
			case WmsRwaConstants.DISPOSITION_TYPE_REPAIR:
				if (ValueUtil.isEmpty(disposition.getRepairVendCd())) {
					throw ThrowUtil.newValidationErrorWithNoLog("수리 업체는 필수입니다.");
				}
				break;
			case WmsRwaConstants.DISPOSITION_TYPE_RETURN_VENDOR:
				if (ValueUtil.isEmpty(disposition.getReturnShipNo())) {
					throw ThrowUtil.newValidationErrorWithNoLog("반송 운송장 번호는 필수입니다.");
				}
				break;
		}
	}

	/**
	 * 반품 지시 상태 자동 업데이트
	 *
	 * 상세 항목의 상태에 따라 헤더 상태를 자동으로 업데이트
	 *
	 * @param rwaOrderId 반품 지시 ID
	 */
	private void updateRwaOrderStatus(String rwaOrderId) {
		// 1. 반품 지시 조회
		RwaOrder rwaOrder = this.queryManager.select(RwaOrder.class, rwaOrderId);
		if (rwaOrder == null) {
			return;
		}

		// 2. 상세 항목 상태 집계
		String sql = "SELECT status, COUNT(*) as cnt FROM rwa_order_items " +
					 "WHERE rwa_order_id = :rwaOrderId AND domain_id = :domainId " +
					 "GROUP BY status";

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> statusCounts = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql,
			ValueUtil.newMap("rwaOrderId,domainId", rwaOrderId, rwaOrder.getDomainId()),
			Map.class, 0, 0);

		if (statusCounts.isEmpty()) {
			return;
		}

		// 3. 상태 판정
		String newStatus = rwaOrder.getStatus();

		boolean allDisposed = true;
		boolean allInspected = true;
		boolean anyReceiving = false;
		boolean anyInspecting = false;

		for (Map<String, Object> statusCount : statusCounts) {
			String status = (String) statusCount.get("status");

			if (!WmsRwaConstants.STATUS_DISPOSED.equals(status)) {
				allDisposed = false;
			}
			if (!WmsRwaConstants.STATUS_INSPECTED.equals(status) &&
				!WmsRwaConstants.STATUS_DISPOSED.equals(status)) {
				allInspected = false;
			}
			if (WmsRwaConstants.STATUS_RECEIVING.equals(status)) {
				anyReceiving = true;
			}
			if (WmsRwaConstants.STATUS_INSPECTING.equals(status)) {
				anyInspecting = true;
			}
		}

		// 4. 상태 결정
		if (allDisposed) {
			newStatus = WmsRwaConstants.STATUS_DISPOSED;
		} else if (allInspected) {
			newStatus = WmsRwaConstants.STATUS_INSPECTED;
		} else if (anyInspecting) {
			newStatus = WmsRwaConstants.STATUS_INSPECTING;
		} else if (anyReceiving) {
			newStatus = WmsRwaConstants.STATUS_RECEIVING;
		}

		// 5. 상태 업데이트
		if (!newStatus.equals(rwaOrder.getStatus())) {
			rwaOrder.setStatus(newStatus);
			this.queryManager.update(rwaOrder, "status");
		}
	}
}
