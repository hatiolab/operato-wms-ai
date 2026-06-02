package operato.wms.rwa.service;

import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import org.apache.commons.lang.StringUtils;

import operato.wms.base.entity.Location;
import operato.wms.base.entity.SKU;
import operato.wms.base.service.RuntimeConfigService;
import operato.wms.base.service.WmsBaseService;
import operato.wms.rwa.WmsRwaConfigConstants;
import operato.wms.rwa.WmsRwaConstants;
import operato.wms.rwa.entity.RwaDisposition;
import operato.wms.rwa.entity.RwaInspection;
import operato.wms.rwa.entity.RwaOrder;
import operato.wms.rwa.entity.RwaOrderItem;
import operato.wms.stock.entity.Inventory;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.anythings.sys.service.ICustomService;
import xyz.elidom.dev.entity.RangedSeq;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.entity.User;
import xyz.elidom.sys.util.ThrowUtil;
import xyz.elidom.util.BeanUtil;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * RWA(Return Warehouse Authorization) 모듈 트랜잭션 처리 서비스
 *
 * 반품 프로세스:
 * 1. 반품 요청 등록 (REQUEST) → createRwaOrder()       — rwa_req_no 자동 채번
 * 2. 반품 승인 (APPROVED)     → approveRwaOrder()      — rwa_no 자동 채번
 * 3. 반품 거부 (REJECTED)     → rejectRwaOrder()       — 승인 전 단계에서만 가능
 * 4. 반품 취소 (CANCELLED)    → cancelRwaOrder()       — 완료 전 어느 단계든 가능
 * 5. 반품 입고 (RECEIVING/RECEIVED) → receiveRwaItem() — 아이템별 입고, 전체 완료 시 RECEIVED
 * 6. 반품 검수 완료 → inspectRwaItem() + completeInspection()
 *    — 양품: RETURN-GOOD 로케이션 재고 생성, 불량: RETURN-DEF 로케이션 재고 생성
 *    — 전체 완료 시 자동으로 COMPLETED (처분 단계 없음)
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
	 * @param items    반품 상세 항목 목록
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

		// 3. 반품 번호 채번 (rwa_no) — 승인 시점에 부여
		if (ValueUtil.isEmpty(rwaOrder.getRwaNo())) {
			String rwaNo = (String) BeanUtil.get(ICustomService.class).doCustomService(
					rwaOrder.getDomainId(), "diy-generate-rwa-no", new HashMap<String, Object>());
			rwaOrder.setRwaNo(rwaNo);
		}

		// 4. 승인 처리
		rwaOrder.setStatus(WmsRwaConstants.STATUS_APPROVED);
		rwaOrder.setApprovedBy(approvedBy);
		rwaOrder.setApprovedAt(new Date());

		this.queryManager.update(rwaOrder, "status", "approvedBy", "approvedAt", "rwaNo");

		// 5. 상세 항목 상태 업데이트
		String sql = "UPDATE rwa_order_items SET status = :status WHERE rwa_order_id = :rwaOrderId AND domain_id = :domainId";
		this.queryManager.executeBySql(sql, ValueUtil.newMap(
				"status,rwaOrderId,domainId",
				WmsRwaConstants.STATUS_APPROVED, rwaOrderId, rwaOrder.getDomainId()));

		return rwaOrder;
	}

	/**
	 * 반품 지시 거부
	 *
	 * @param rwaOrderId   반품 지시 ID
	 * @param rejectedBy   거부자 ID
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

	/**
	 * 반품 지시 취소
	 *
	 * 완료(COMPLETED) 전 어느 단계에서든 취소 가능.
	 * 단, REJECTED/CANCELLED 상태는 재취소 불가.
	 *
	 * @param rwaOrderId   반품 지시 ID
	 * @param cancelReason 취소 사유
	 * @return 취소된 반품 지시
	 */
	@Transactional
	public RwaOrder cancelRwaOrder(String rwaOrderId, String cancelReason) {
		// 1. 반품 지시 조회
		RwaOrder rwaOrder = this.queryManager.select(RwaOrder.class, rwaOrderId);
		if (rwaOrder == null) {
			throw ThrowUtil.newValidationErrorWithNoLog("반품 지시를 찾을 수 없습니다. ID: " + rwaOrderId);
		}

		// 2. 상태 검증 — COMPLETED, REJECTED, CANCELLED 는 취소 불가
		String currentStatus = rwaOrder.getStatus();
		if (WmsRwaConstants.STATUS_COMPLETED.equals(currentStatus)
				|| WmsRwaConstants.STATUS_REJECTED.equals(currentStatus)
				|| WmsRwaConstants.STATUS_CANCELLED.equals(currentStatus)) {
			throw ThrowUtil.newValidationErrorWithNoLog(
					"취소할 수 없는 상태입니다. 현재 상태: " + currentStatus);
		}

		// 3. 취소 처리
		rwaOrder.setStatus(WmsRwaConstants.STATUS_CANCELLED);
		if (ValueUtil.isNotEmpty(cancelReason)) {
			rwaOrder.setRemarks(cancelReason);
		}
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
	 * @param rwaQty         실제 입고 수량
	 * @param locCd          입고 로케이션
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
				!WmsRwaConstants.STATUS_RECEIVED.equals(item.getStatus())) {
			throw ThrowUtil.newValidationErrorWithNoLog(
					"입고 가능한 상태가 아닙니다. 현재 상태: " + item.getStatus());
		}

		// 3. 입고 처리 — 아이템 단위 입고 완료
		item.setRwaQty(rwaQty);
		item.setLocCd(locCd);
		item.setStatus(WmsRwaConstants.STATUS_RECEIVED);

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
	 * @param inspection     검수 정보
	 * @return 생성된 검수 기록
	 */
	@Transactional
	public RwaInspection inspectRwaItem(String rwaOrderItemId, RwaInspection inspection) {
		// 1. 반품 상세 조회
		RwaOrderItem item = this.queryManager.select(RwaOrderItem.class, rwaOrderItemId);
		if (item == null) {
			throw ThrowUtil.newValidationErrorWithNoLog("반품 상세를 찾을 수 없습니다. ID: " + rwaOrderItemId);
		}

		// 2. 상태 검증 (재검수를 위해 COMPLETED도 허용)
		if (!WmsRwaConstants.STATUS_RECEIVED.equals(item.getStatus()) &&
				!WmsRwaConstants.STATUS_INSPECTING.equals(item.getStatus()) &&
				!WmsRwaConstants.STATUS_INSPECTED.equals(item.getStatus()) &&
				!WmsRwaConstants.STATUS_COMPLETED.equals(item.getStatus())) {
			throw ThrowUtil.newValidationErrorWithNoLog(
					"검수 가능한 상태가 아닙니다. 현재 상태: " + item.getStatus());
		}

		// 3. 검수 기록 생성
		inspection.setRwaOrderItemId(rwaOrderItemId);
		inspection.setDomainId(item.getDomainId());

		// 검수자 자동 설정 (프론트에서 미전달 시 현재 로그인 사용자로 설정)
		if (ValueUtil.isEmpty(inspection.getInspBy())) {
			String userId = User.currentUser() != null ? User.currentUser().getId() : "system";
			inspection.setInspBy(userId);
		}

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

		// 재검수 여부: status가 아닌 RETURN-GOOD 재고 실존 여부로 판단
		// (RwaInspection.afterCreate()가 inspectedQty >= rwaQty 시 status를 INSPECTED로 선제 변경하므로
		//  status 기반 판단은 첫 검수도 재검수로 오판하는 버그 발생)
		boolean isReInspect = false;
		if (ValueUtil.isNotEmpty(item.getBarcode())) {
			String checkSql = "SELECT COUNT(*) FROM inventories " +
					"WHERE domain_id = :domainId AND barcode = :barcode AND last_tran_cd = 'RWA_GOOD'";
			Integer goodCount = this.queryManager.selectBySql(checkSql,
					ValueUtil.newMap("domainId,barcode", item.getDomainId(), item.getBarcode()), Integer.class);
			isReInspect = goodCount != null && goodCount > 0;
		}

		// 3. 아이템 상태를 COMPLETED로 직접 전환 (INSPECTED/DISPOSING 단계 생략)
		item.setStatus(WmsRwaConstants.STATUS_COMPLETED);
		this.queryManager.update(item, "status");

		// 4. 검수 분류 재고 처리 (RETURN-GOOD / RETURN-DEF)
		RwaOrder order = this.queryManager.select(RwaOrder.class, item.getRwaOrderId());
		if (order != null) {
			if (isReInspect) {
				this.updateInspectionInventories(item, order);
			} else {
				this.assignBatchBarcodes(item, order);
			}
		}

		// 5. 헤더 상태 업데이트
		this.updateRwaOrderStatus(item.getRwaOrderId());

		return item;
	}

	/**
	 * 검수 완료 시 재고를 RETURN-GOOD / RETURN-DEF 로케이션으로 분류 등록
	 *
	 * 흐름:
	 * 1. 입고(receive) 단계에서 생성된 RETURN 위치 임시 재고 삭제
	 * 2. 양품 수량 > 0 → loc_type=RETURN-GOOD 로케이션에 재고 생성
	 * 3. 불량 수량 > 0 → loc_type=RETURN-DEF  로케이션에 재고 생성
	 *
	 * @param item  반품 상세
	 * @param order 반품 지시
	 */
	private void assignBatchBarcodes(RwaOrderItem item, RwaOrder order) {
		double goodQty = item.getGoodQty() != null ? item.getGoodQty() : 0;
		double defectQty = item.getDefectQty() != null ? item.getDefectQty() : 0;

		if (goodQty <= 0 && defectQty <= 0) {
			return;
		}

		// 1. 입고 단계 RETURN 임시 재고 삭제
		if (ValueUtil.isNotEmpty(item.getBarcode())) {
			String delSql = "DELETE FROM inventories WHERE domain_id = :domainId AND barcode = :barcode";
			this.queryManager.executeBySql(delSql,
					ValueUtil.newMap("domainId,barcode", order.getDomainId(), item.getBarcode()));
		}

		// 2. RETURN-GOOD / RETURN-DEF 로케이션 조회
		String goodLocCd = findLocCdByType(order.getDomainId(), order.getWhCd(), "RETURN-GOOD");
		String defectLocCd = findLocCdByType(order.getDomainId(), order.getWhCd(), "RETURN-DEF");

		if (ValueUtil.isEmpty(goodLocCd))   goodLocCd   = "RETURN-GOOD";
		if (ValueUtil.isEmpty(defectLocCd)) defectLocCd = "RETURN-DEF";

		String goodBarcode = null;
		String defectBarcode = null;

		// 3. 양품 재고 생성 (barcode=null → beforeCreate()에서 입고 형식으로 자동 채번)
		if (goodQty > 0) {
			Inventory inv = buildReturnInventory(item, order, null, goodQty,
					goodLocCd, Inventory.STATUS_STORED, "RWA_GOOD");
			inv.setRemarks("RWA 반품 양품 - " + order.getRwaNo());
			this.queryManager.insert(inv);
			goodBarcode = inv.getBarcode(); // beforeCreate()에서 채번된 바코드
		}

		// 4. 불량 재고 생성 (barcode=null → beforeCreate()에서 입고 형식으로 자동 채번)
		if (defectQty > 0) {
			Inventory inv = buildReturnInventory(item, order, null, defectQty,
					defectLocCd, Inventory.STATUS_BAD, "RWA_DEFECT");
			inv.setRemarks("RWA 반품 불량 - " + order.getRwaNo());
			this.queryManager.insert(inv);
			defectBarcode = inv.getBarcode(); // beforeCreate()에서 채번된 바코드
		}

		// 5. 대표 바코드 저장 (양품 우선)
		if (ValueUtil.isNotEmpty(goodBarcode)) {
			item.setBarcode(goodBarcode);
		} else if (ValueUtil.isNotEmpty(defectBarcode)) {
			item.setBarcode(defectBarcode);
		}
		this.queryManager.update(item, "barcode");
	}

	/**
	 * 재검수 시 기존 RETURN-GOOD / RETURN-DEF 재고 수량 업데이트
	 *
	 * @param item  반품 상세
	 * @param order 반품 지시
	 */
	private void updateInspectionInventories(RwaOrderItem item, RwaOrder order) {
		double goodQty = item.getGoodQty() != null ? item.getGoodQty() : 0;
		double defectQty = item.getDefectQty() != null ? item.getDefectQty() : 0;

		// 기존 RETURN-GOOD 재고 수량 업데이트 (item.barcode = 양품 바코드)
		if (ValueUtil.isNotEmpty(item.getBarcode())) {
			String updGood = "UPDATE inventories SET inv_qty = :qty, updated_at = now() " +
					"WHERE domain_id = :domainId AND barcode = :barcode AND last_tran_cd = 'RWA_GOOD'";
			int updated = this.queryManager.executeBySql(updGood,
					ValueUtil.newMap("qty,domainId,barcode", goodQty, order.getDomainId(), item.getBarcode()));

			// 기존 양품 재고가 없고 수량이 생긴 경우 새로 생성
			if (updated == 0 && goodQty > 0) {
				String goodLocCd = findLocCdByType(order.getDomainId(), order.getWhCd(), "RETURN-GOOD");
				if (ValueUtil.isEmpty(goodLocCd)) goodLocCd = "RETURN-GOOD";
				Inventory inv = buildReturnInventory(item, order, item.getBarcode(), goodQty,
						goodLocCd, Inventory.STATUS_STORED, "RWA_GOOD");
				inv.setRemarks("RWA 반품 양품 - " + order.getRwaNo());
				this.queryManager.insert(inv);
			}
		}

		// 기존 RETURN-DEF 재고 수량 업데이트 (remarks로 조회)
		String updDef = "UPDATE inventories SET inv_qty = :qty, updated_at = now() " +
				"WHERE domain_id = :domainId AND wh_cd = :whCd AND sku_cd = :skuCd " +
				"AND last_tran_cd = 'RWA_DEFECT' AND remarks = :remarks";
		String defRemarks = "RWA 반품 불량 - " + order.getRwaNo();
		int updatedDef = this.queryManager.executeBySql(updDef,
				ValueUtil.newMap("qty,domainId,whCd,skuCd,remarks",
						defectQty, order.getDomainId(), order.getWhCd(), item.getSkuCd(), defRemarks));

		// 기존 불량 재고가 없고 수량이 생긴 경우 새로 생성 (barcode=null → 입고 형식 자동 채번)
		if (updatedDef == 0 && defectQty > 0) {
			String defectLocCd = findLocCdByType(order.getDomainId(), order.getWhCd(), "RETURN-DEF");
			if (ValueUtil.isEmpty(defectLocCd)) defectLocCd = "RETURN-DEF";
			Inventory inv = buildReturnInventory(item, order, null, defectQty,
					defectLocCd, Inventory.STATUS_BAD, "RWA_DEFECT");
			inv.setRemarks(defRemarks);
			this.queryManager.insert(inv);
		}
	}

	/**
	 * loc_type으로 로케이션 코드 조회 (loc_cd 오름차순 첫 번째)
	 *
	 * @param domainId 도메인 ID
	 * @param whCd     창고 코드
	 * @param locType  로케이션 유형 (예: RETURN-GOOD, RETURN-DEF)
	 * @return 로케이션 코드, 없으면 null
	 */
	private String findLocCdByType(Long domainId, String whCd, String locType) {
		xyz.elidom.dbist.dml.Query q = new xyz.elidom.dbist.dml.Query();
		q.addFilter("domainId", domainId);
		q.addFilter("whCd", whCd);
		q.addFilter("locType", locType);
		q.addOrder("locCd", true);
		q.setPageSize(1);
		List<Location> locs = this.queryManager.selectList(Location.class, q);
		return (locs != null && !locs.isEmpty()) ? locs.get(0).getLocCd() : null;
	}

	/**
	 * RWA 반품 배치 바코드 채번
	 * 형식: RWAB{G/D}{domainId}-{yyMMdd}-{seq:05d}
	 *
	 * @param domainId 도메인 ID
	 * @param type     "G"(양품) 또는 "D"(불량)
	 * @return 채번된 바코드 문자열
	 */
	private String generateRwaBatchBarcode(Long domainId, String type) {
		String dateStr = DateUtil.todayStr("yyMMdd");
		String seqKey = "RWA_BATCH_BCD_" + type;
		Integer seq = xyz.elidom.dev.entity.RangedSeq.increaseSequence(
				domainId, seqKey, seqKey, "DATE", dateStr, null, null);
		String serialNo = org.apache.commons.lang.StringUtils.leftPad(String.valueOf(seq), 5, "0");
		return "RWAB" + type + domainId + "-" + dateStr + "-" + serialNo;
	}

	/**
	 * 반품 재고 Inventory 객체 생성 (공통 필드 세팅)
	 *
	 * @param item      반품 상세
	 * @param order     반품 지시
	 * @param barcode   배치 바코드
	 * @param qty       수량
	 * @param locCd     로케이션
	 * @param status    재고 상태
	 * @param tranCd    트랜잭션 코드
	 * @return Inventory 객체
	 */
	private Inventory buildReturnInventory(RwaOrderItem item, RwaOrder order,
			String barcode, double qty, String locCd, String status, String tranCd) {
		Inventory inv = new Inventory();
		inv.setDomainId(order.getDomainId());
		inv.setWhCd(order.getWhCd());
		inv.setComCd(order.getComCd());
		inv.setSkuCd(item.getSkuCd());
		inv.setSkuNm(item.getSkuNm());
		inv.setLocCd(locCd);
		inv.setBarcode(barcode);
		inv.setInvQty(qty);
		inv.setStatus(status);
		inv.setLastTranCd(tranCd);
		inv.setLotNo(item.getLotNo());
		inv.setExpiredDate(item.getExpiredDate());
		inv.setProdDate(item.getPrdDate()); // RwaOrderItem.prdDate → Inventory.prodDate
		inv.setRcvNo(order.getRwaNo());    // 입고번호에 반품번호 기록
		return inv;
	}

	/********************************************************************************************************
	 * 4. 반품 처분
	 ********************************************************************************************************/

	/**
	 * 반품 처분 처리
	 *
	 * @param rwaOrderItemId 반품 상세 ID
	 * @param disposition    처분 정보
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
		disposition.setDisposedBy(User.currentUser() != null ? User.currentUser().getId() : "system");
		this.queryManager.insert(disposition);

		// 5. Entity의 afterCreate()에서 자동으로 rwa_order_items 업데이트 수행

		// 6. 처분 시점 자동 재고 처리 (설정에 따라)
		RwaOrder orderForStock = this.queryManager.select(RwaOrder.class, item.getRwaOrderId());
		if (orderForStock != null) {
			String autoFlag = this.runtimeConfSvc.getRuntimeConfigValue(
					orderForStock.getComCd(), orderForStock.getWhCd(),
					WmsRwaConfigConstants.RWA_DISPOSITION_AUTO_STOCK_FLAG);
			if (ValueUtil.toBoolean(autoFlag, false)
					&& Boolean.TRUE.equals(disposition.getStockImpactFlag())) {
				String txnId = this.processStockForDisposition(disposition, item, orderForStock);
				if (ValueUtil.isNotEmpty(txnId)) {
					disposition.setStockTxnId(txnId);
					this.queryManager.update(disposition, "stockTxnId");
				}
			}
		}

		// 7. 헤더 상태 업데이트
		this.updateRwaOrderStatus(item.getRwaOrderId());

		return disposition;
	}

	/********************************************************************************************************
	 * 4-2. 반품 처분 일괄 완료 (양품/불량 분리 처분)
	 ********************************************************************************************************/

	/**
	 * 반품 처분 일괄 완료 처리 (양품/불량 분리 처분 + 재고 일괄 처리 + 주문 완료)
	 *
	 * "반품 완료" 버튼 클릭 시 호출.
	 * - 각 아이템의 양품(GOOD) / 불량(DEFECT) 처분을 별도 RwaDisposition 레코드로 생성
	 * - qty_type = GOOD / DEFECT 로 구분
	 * - RESTOCK 처분 시 즉시 재고 생성
	 * - 모든 처리 후 주문 상태를 COMPLETED로 전환
	 *
	 * @param rwaOrderId 반품 지시 ID
	 * @param decisions  처분 결정 목록 (각 항목: item_id, good_disposition, defect_disposition)
	 * @return 완료된 반품 지시
	 */
	@Transactional
	public RwaOrder finalizeOrderWithDispositions(String rwaOrderId, List<Map<String, Object>> decisions) {
		RwaOrder order = this.queryManager.select(RwaOrder.class, rwaOrderId);
		if (order == null) {
			throw ThrowUtil.newValidationErrorWithNoLog("반품 지시를 찾을 수 없습니다. ID: " + rwaOrderId);
		}

		String disposedBy = User.currentUser() != null ? User.currentUser().getId() : "system";
		Date now = new Date();

		for (Map<String, Object> decision : decisions) {
			String itemId = (String) decision.get("item_id");
			RwaOrderItem item = this.queryManager.select(RwaOrderItem.class, itemId);
			if (item == null) continue;

			@SuppressWarnings("unchecked")
			Map<String, Object> goodDisp = (Map<String, Object>) decision.get("good_disposition");
			@SuppressWarnings("unchecked")
			Map<String, Object> defectDisp = (Map<String, Object>) decision.get("defect_disposition");

			// 양품 처분
			if (goodDisp != null && item.getGoodQty() != null && item.getGoodQty() > 0) {
				RwaDisposition disp = buildDisposition(item, order, goodDisp, "GOOD",
						item.getGoodQty(), disposedBy, now);
				this.queryManager.insert(disp); // afterCreate()는 qty_type=GOOD이므로 item 자동업데이트 생략

				if (Boolean.TRUE.equals(disp.getStockImpactFlag())) {
					String txnId = this.processStockForDisposition(disp, item, order);
					if (ValueUtil.isNotEmpty(txnId)) {
						disp.setStockTxnId(txnId);
						this.queryManager.update(disp, "stockTxnId");
					}
				}

				// RESTOCK 유통기한 item 반영
				if (WmsRwaConstants.DISPOSITION_TYPE_RESTOCK.equals(disp.getDispositionType())
						&& ValueUtil.isNotEmpty(disp.getRestockExpiredDate())) {
					item.setExpiredDate(disp.getRestockExpiredDate());
				}
			}

			// 불량 처분
			if (defectDisp != null && item.getDefectQty() != null && item.getDefectQty() > 0) {
				RwaDisposition disp = buildDisposition(item, order, defectDisp, "DEFECT",
						item.getDefectQty(), disposedBy, now);
				this.queryManager.insert(disp);
				// 불량 처분은 보통 SCRAP/REPAIR 등이므로 재고 처리 없음 (stockImpactFlag=false)
			}

			// item 상태 DISPOSED, disposition_type(양품 우선)
			String primaryType = goodDisp != null ? (String) goodDisp.get("disposition_type")
					: (defectDisp != null ? (String) defectDisp.get("disposition_type") : null);
			item.setStatus(WmsRwaConstants.STATUS_DISPOSED);
			if (ValueUtil.isNotEmpty(primaryType)) {
				item.setDispositionType(primaryType);
			}
			this.queryManager.update(item, "status", "dispositionType", "expiredDate");
		}

		// 주문 완료 처리
		order.setStatus(WmsRwaConstants.STATUS_COMPLETED);
		order.setRwaEndDate(DateUtil.todayStr());
		this.queryManager.update(order, "status", "rwaEndDate");

		String sql = "UPDATE rwa_order_items SET status = :status WHERE rwa_order_id = :rwaOrderId AND domain_id = :domainId";
		this.queryManager.executeBySql(sql, ValueUtil.newMap(
				"status,rwaOrderId,domainId",
				WmsRwaConstants.STATUS_COMPLETED, rwaOrderId, order.getDomainId()));

		return order;
	}

	/**
	 * 처분 결정 Map → RwaDisposition 빌더
	 */
	@SuppressWarnings("unchecked")
	private RwaDisposition buildDisposition(RwaOrderItem item, RwaOrder order,
			Map<String, Object> dispMap, String qtyType, double qty, String disposedBy, Date now) {
		RwaDisposition disp = new RwaDisposition();
		disp.setDomainId(item.getDomainId());
		disp.setRwaOrderItemId(item.getId());
		disp.setQtyType(qtyType);
		disp.setDispositionType((String) dispMap.get("disposition_type"));
		disp.setDispositionQty(qty);
		disp.setDisposedBy(disposedBy);
		disp.setDisposedAt(now);

		// 처분 유형별 필드 설정
		switch (ValueUtil.toString(disp.getDispositionType())) {
			case WmsRwaConstants.DISPOSITION_TYPE_RESTOCK:
				disp.setRestockLocCd((String) dispMap.get("restock_loc_cd"));
				disp.setRestockExpiredDate((String) dispMap.get("restock_expired_date"));
				disp.setStockImpactFlag(true);
				disp.setRestockAt(now);
				break;
			case WmsRwaConstants.DISPOSITION_TYPE_SCRAP:
				disp.setScrapMethod((String) dispMap.get("scrap_method"));
				disp.setStockImpactFlag(false);
				disp.setScrapAt(now);
				break;
			case WmsRwaConstants.DISPOSITION_TYPE_REPAIR:
				disp.setRepairStatus(WmsRwaConstants.REPAIR_STATUS_REQUESTED);
				disp.setStockImpactFlag(false);
				break;
			case WmsRwaConstants.DISPOSITION_TYPE_RETURN_VENDOR:
				disp.setStockImpactFlag(false);
				disp.setReturnShippedAt(now);
				break;
			default:
				disp.setStockImpactFlag(false);
		}
		return disp;
	}

	/********************************************************************************************************
	 * 5. 반품 완료 (내부 자동 처리)
	 ********************************************************************************************************/

	/**
	 * 반품 지시 자동 완료 처리
	 *
	 * 모든 아이템의 처분이 완료되면 updateRwaOrderStatus()에서 자동 호출.
	 * 재고 처리 후 마스터 상태를 COMPLETED로, 전체 아이템도 COMPLETED로 전환.
	 *
	 * @param rwaOrder 반품 지시
	 */
	@Transactional
	private void autoCompleteRwaOrder(RwaOrder rwaOrder) {
		// 1. 재고 처리 (auto stock flag=false 인 경우 여기서 일괄 처리)
		String autoFlag = this.runtimeConfSvc.getRuntimeConfigValue(
				rwaOrder.getComCd(), rwaOrder.getWhCd(),
				WmsRwaConfigConstants.RWA_DISPOSITION_AUTO_STOCK_FLAG);
		boolean autoAtDisposition = ValueUtil.toBoolean(autoFlag, false);

		if (!autoAtDisposition) {
			List<RwaOrderItem> items = this.listRwaOrderItems(rwaOrder.getId());
			for (RwaOrderItem item : items) {
				RwaDisposition dispCond = new RwaDisposition();
				dispCond.setDomainId(rwaOrder.getDomainId());
				dispCond.setRwaOrderItemId(item.getId());
				RwaDisposition disp = this.queryManager.selectByCondition(RwaDisposition.class, dispCond);

				if (disp != null && Boolean.TRUE.equals(disp.getStockImpactFlag())
						&& ValueUtil.isEmpty(disp.getStockTxnId())) {
					String txnId = this.processStockForDisposition(disp, item, rwaOrder);
					if (ValueUtil.isNotEmpty(txnId)) {
						disp.setStockTxnId(txnId);
						this.queryManager.update(disp, "stockTxnId");
					}
				}
			}
		}

		// 2. 마스터 완료 처리
		rwaOrder.setStatus(WmsRwaConstants.STATUS_COMPLETED);
		rwaOrder.setRwaEndDate(DateUtil.todayStr());
		this.queryManager.update(rwaOrder, "status", "rwaEndDate");

		// 3. 전체 아이템도 COMPLETED로 전환
		String sql = "UPDATE rwa_order_items SET status = :status WHERE rwa_order_id = :rwaOrderId AND domain_id = :domainId";
		this.queryManager.executeBySql(sql, ValueUtil.newMap(
				"status,rwaOrderId,domainId",
				WmsRwaConstants.STATUS_COMPLETED, rwaOrder.getId(), rwaOrder.getDomainId()));
	}

	/**
	 * 처분 유형별 재고 처리
	 *
	 * RESTOCK: Inventory 생성 (invQty=dispositionQty, locCd=restockLocCd,
	 * status=STORED)
	 * DONATION: 기록만 (실제 재고 차감은 미구현)
	 * SCRAP/REPAIR/RETURN_VENDOR: 재고 영향 없음
	 *
	 * @param disposition 처분 정보
	 * @param item        반품 상세
	 * @param order       반품 지시
	 * @return 생성된 Inventory ID (재고 생성 시), null (재고 미영향 시)
	 */
	private String processStockForDisposition(RwaDisposition disposition, RwaOrderItem item, RwaOrder order) {
		if (disposition.getStockImpactFlag() == null || !disposition.getStockImpactFlag()) {
			return null;
		}

		if (WmsRwaConstants.DISPOSITION_TYPE_RESTOCK.equals(disposition.getDispositionType())) {
			Inventory inv = new Inventory();
			inv.setDomainId(order.getDomainId());
			inv.setWhCd(order.getWhCd());
			inv.setComCd(order.getComCd());
			inv.setSkuCd(item.getSkuCd());
			inv.setSkuNm(item.getSkuNm());
			inv.setLocCd(disposition.getRestockLocCd());
			inv.setInvQty(disposition.getDispositionQty());
			inv.setStatus(Inventory.STATUS_STORED);
			inv.setLastTranCd(Inventory.TRANSACTION_IN);
			inv.setRcvNo(order.getRwaNo());
			inv.setLotNo(item.getLotNo());
			// 소비기한: 처분 시 입력된 값 우선, 없으면 기존 아이템 소비기한 사용
			String expiredDate = ValueUtil.isNotEmpty(disposition.getRestockExpiredDate())
					? disposition.getRestockExpiredDate()
					: item.getExpiredDate();
			inv.setExpiredDate(expiredDate);
			inv.setProdDate(item.getPrdDate());
			inv.setRcvNo(order.getOrderNo());
			inv.setRcvSeq(item.getRwaSeq());
			inv.setRemarks("RWA 반품 재입고 - " + order.getRwaNo());
			// beforeCreate()에서 입고 프로세스와 동일한 방식으로 바코드 자동 채번 (diy-generate-inv-barcode)
			this.queryManager.insert(inv);

			// rwa_order_items.barcode를 채번된 바코드로 업데이트
			item.setBarcode(inv.getBarcode());
			this.queryManager.update(item, "barcode");

			return inv.getId();
		}

		return null;
	}

	/********************************************************************************************************
	 * 6. 조회 메서드
	 ********************************************************************************************************/

	/**
	 * 반품 지시 목록 조회
	 *
	 * @param comCd     화주사 코드
	 * @param status    상태
	 * @param rwaType   반품 유형
	 * @param startDate 시작일
	 * @param endDate   종료일
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
		List<Map<String, Object>> statusCounts = (List<Map<String, Object>>) (List<?>) this.queryManager
				.selectListBySql(sql,
						ValueUtil.newMap("rwaOrderId,domainId", rwaOrderId, rwaOrder.getDomainId()),
						Map.class, 0, 0);

		if (statusCounts.isEmpty()) {
			return;
		}

		// 3. 상태 판정
		// 단순화된 아이템 상태 진행 순서: APPROVED → RECEIVED → COMPLETED
		// 마스터 상태 자동 전환 규칙:
		//   일부 RECEIVED 이상 → RECEIVING
		//   전체 RECEIVED 이상 → RECEIVED
		//   일부 COMPLETED → INSPECTING (검수 진행중)
		//   전체 COMPLETED → autoCompleteRwaOrder() (→ COMPLETED)

		boolean allReceived = true;
		boolean anyReceived = false;
		boolean allCompleted = true;
		boolean anyCompleted = false;

		for (Map<String, Object> statusCount : statusCounts) {
			String status = (String) statusCount.get("status");

			// RECEIVED 이상: RECEIVED, COMPLETED (하위 호환: INSPECTED, DISPOSED 포함)
			boolean isReceivedOrAbove = WmsRwaConstants.STATUS_RECEIVED.equals(status)
					|| WmsRwaConstants.STATUS_INSPECTED.equals(status)
					|| WmsRwaConstants.STATUS_DISPOSED.equals(status)
					|| WmsRwaConstants.STATUS_COMPLETED.equals(status);
			if (!isReceivedOrAbove) allReceived = false;
			if (isReceivedOrAbove) anyReceived = true;

			// COMPLETED 이상
			boolean isCompletedOrAbove = WmsRwaConstants.STATUS_COMPLETED.equals(status);
			if (!isCompletedOrAbove) allCompleted = false;
			if (isCompletedOrAbove) anyCompleted = true;
		}

		// 4. 상태 결정 및 업데이트
		if (allCompleted) {
			// 전체 검수 완료 → 자동 완료 처리 (status=COMPLETED, 완료일 기록)
			autoCompleteRwaOrder(rwaOrder);
			return;
		}

		String newStatus = rwaOrder.getStatus();
		if (anyCompleted) {
			newStatus = WmsRwaConstants.STATUS_INSPECTING;
		} else if (allReceived) {
			newStatus = WmsRwaConstants.STATUS_RECEIVED;
		} else if (anyReceived) {
			newStatus = WmsRwaConstants.STATUS_RECEIVING;
		}

		// 5. 상태 업데이트
		if (!newStatus.equals(rwaOrder.getStatus())) {
			rwaOrder.setStatus(newStatus);
			this.queryManager.update(rwaOrder, "status");
		}
	}

	/********************************************************************************************************
	 * 8. 대시보드 통계 API
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
				"FROM rwa_orders " +
				"WHERE domain_id = :domainId " +
				"AND rwa_req_date = :targetDate ";

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

		// 결과를 Map으로 변환 (신규 상태값 기준)
		Map<String, Object> statusCounts = ValueUtil.newMap("REQUEST", 0);
		statusCounts.put("APPROVED", 0);
		statusCounts.put("RECEIVING", 0);
		statusCounts.put("RECEIVED", 0);
		statusCounts.put("INSPECTING", 0);
		statusCounts.put("INSPECTED", 0);
		statusCounts.put("DISPOSING", 0);
		statusCounts.put("COMPLETED", 0);
		statusCounts.put("REJECTED", 0);
		statusCounts.put("CANCELLED", 0);

		for (Map<String, Object> row : results) {
			String status = (String) row.get("status");
			Object count = row.get("count");
			statusCounts.put(status, count);
		}

		return statusCounts;
	}

	/**
	 * 대시보드 - 반품 유형별 통계 조회
	 *
	 * @param comCd     화주사 코드 (optional)
	 * @param whCd      창고 코드 (optional)
	 * @param startDate 시작일 (optional, 기본값: 오늘)
	 * @param endDate   종료일 (optional, 기본값: 오늘)
	 * @return 유형별 건수 Map { rwaType: count }
	 */
	public Map<String, Object> getDashboardTypeStats(String comCd, String whCd, String startDate, String endDate) {
		String start = ValueUtil.isNotEmpty(startDate) ? startDate : DateUtil.todayStr();
		String end = ValueUtil.isNotEmpty(endDate) ? endDate : DateUtil.todayStr();

		String sql = "SELECT rwa_type, COUNT(*) as count " +
				"FROM rwa_orders " +
				"WHERE domain_id = :domainId " +
				"AND rwa_req_date >= :startDate " +
				"AND rwa_req_date <= :endDate ";

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

		sql += "GROUP BY rwa_type";

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
				sql, params, Map.class, 0, 0);

		// 공통코드 RWA_ORDER_RWA_TYPE에서 반품 유형 목록을 조회하여 기본값 0으로 초기화
		String codeSql = "SELECT ccd.name " +
				"FROM common_codes cc " +
				"INNER JOIN common_code_details ccd ON ccd.domain_id = cc.domain_id AND ccd.parent_id = cc.id " +
				"WHERE cc.domain_id = :domainId AND cc.name = 'RWA_ORDER_RWA_TYPE' " +
				"ORDER BY COALESCE(ccd.rank, 999999), ccd.name";

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> codeList = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
				codeSql, ValueUtil.newMap("domainId", Domain.currentDomainId()), Map.class, 0, 0);

		Map<String, Object> typeStats = new java.util.LinkedHashMap<>();
		for (Map<String, Object> code : codeList) {
			String typeName = (String) code.get("name");
			if (ValueUtil.isNotEmpty(typeName) && !typeStats.containsKey(typeName)) {
				typeStats.put(typeName, 0);
			}
		}

		// 공통코드가 없으면 기본값 fallback
		if (typeStats.isEmpty()) {
			typeStats.put(WmsRwaConstants.RWA_TYPE_CUSTOMER_RETURN, 0);
			typeStats.put(WmsRwaConstants.RWA_TYPE_VENDOR_RETURN, 0);
			typeStats.put(WmsRwaConstants.RWA_TYPE_DEFECT_RETURN, 0);
			typeStats.put(WmsRwaConstants.RWA_TYPE_STOCK_ADJUST, 0);
			typeStats.put(WmsRwaConstants.RWA_TYPE_EXPIRED_RETURN, 0);
		}

		// 실제 건수로 덮어쓰기
		for (Map<String, Object> row : results) {
			String rwaType = (String) row.get("rwa_type");
			Object count = row.get("count");
			if (ValueUtil.isNotEmpty(rwaType)) {
				typeStats.put(rwaType, count);
			}
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

		// 1. 검수 지연 알림 (24시간 이상 대기)
		String sql1 = "SELECT COUNT(*) as count " +
				"FROM rwa_order_items " +
				"WHERE domain_id = :domainId " +
				"AND status = :status " +
				"AND updated_at < (NOW() - INTERVAL '24 hours')";

		Map<String, Object> params1 = ValueUtil.newMap("domainId,status",
				Domain.currentDomainId(), WmsRwaConstants.STATUS_RECEIVING);

		if (ValueUtil.isNotEmpty(comCd)) {
			sql1 += " AND com_cd = :comCd";
			params1.put("comCd", comCd);
		}
		if (ValueUtil.isNotEmpty(whCd)) {
			sql1 += " AND wh_cd = :whCd";
			params1.put("whCd", whCd);
		}

		Integer delayedInspectionCount = this.queryManager.selectBySql(sql1, params1, Integer.class);
		if (delayedInspectionCount != null && delayedInspectionCount > 0) {
			Map<String, Object> alert = ValueUtil.newMap("type", "warning");
			alert.put("icon", "⏰");
			alert.put("message", "검수 지연: " + delayedInspectionCount + "건 (24시간 이상 대기)");
			alerts.add(alert);
		}

		// 2. 처분 대기 알림 (48시간 이상 대기)
		String sql2 = "SELECT COUNT(*) as count " +
				"FROM rwa_order_items " +
				"WHERE domain_id = :domainId " +
				"AND status = :status " +
				"AND updated_at < (NOW() - INTERVAL '48 hours')";

		Map<String, Object> params2 = ValueUtil.newMap("domainId,status",
				Domain.currentDomainId(), WmsRwaConstants.STATUS_INSPECTED);

		if (ValueUtil.isNotEmpty(comCd)) {
			sql2 += " AND com_cd = :comCd";
			params2.put("comCd", comCd);
		}
		if (ValueUtil.isNotEmpty(whCd)) {
			sql2 += " AND wh_cd = :whCd";
			params2.put("whCd", whCd);
		}

		Integer delayedDispositionCount = this.queryManager.selectBySql(sql2, params2, Integer.class);
		if (delayedDispositionCount != null && delayedDispositionCount > 0) {
			Map<String, Object> alert = ValueUtil.newMap("type", "warning");
			alert.put("icon", "⚠️");
			alert.put("message", "처분 대기: " + delayedDispositionCount + "건 (48시간 이상 대기)");
			alerts.add(alert);
		}

		return alerts;
	}

	/**
	 * SKU 검색 — sku_cd 또는 sku_nm에 대한 LIKE 검색
	 *
	 * @param keyword 검색어 (null/빈값이면 전체 조회)
	 * @param comCd   화주사 코드 (null이면 전체)
	 * @param page    페이지 번호 (1부터)
	 * @param limit   페이지 크기
	 * @return { items: [...], total: N }
	 */
	public Map<String, Object> searchSku(String keyword, String comCd, int page, int limit) {
		StringBuilder sql = new StringBuilder(
				"SELECT sku_cd, sku_nm, sku_barcd, com_cd " +
				"FROM sku " +
				"WHERE domain_id = :domainId " +
				"AND del_flag = false"
		);

		Map<String, Object> params = ValueUtil.newMap("domainId", Domain.currentDomainId());

		if (ValueUtil.isNotEmpty(keyword)) {
			String likeKeyword = "%" + keyword.trim() + "%";
			sql.append(" AND (sku_cd ILIKE :keyword OR sku_nm ILIKE :keyword)");
			params.put("keyword", likeKeyword);
		}

		if (ValueUtil.isNotEmpty(comCd)) {
			sql.append(" AND com_cd = :comCd");
			params.put("comCd", comCd);
		}

		// 전체 건수
		String countSql = "SELECT COUNT(*) FROM (" + sql + ") t";
		Integer total = this.queryManager.selectBySql(countSql, params, Integer.class);

		// 페이지 데이터
		sql.append(" ORDER BY sku_cd LIMIT :limit OFFSET :offset");
		params.put("limit", limit);
		params.put("offset", (page - 1) * limit);

		List<Map<String, Object>> items =
				(List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
						sql.toString(), params, Map.class, 0, 0);

		Map<String, Object> result = new HashMap<>();
		result.put("items", items != null ? items : new java.util.ArrayList<>());
		result.put("total", total != null ? total : 0);
		return result;
	}

}
