package operato.wms.rwa;

/**
 * WMS RWA(Return Warehouse Authorization) 모듈 상수 정의
 *
 * @author HatioLab
 */
public class WmsRwaConstants {

	// ========== 반품 지시 상태 (rwa_orders.status) ==========

	/**
	 * 상태: 반품 요청
	 */
	public static final String STATUS_REQUEST = "REQUEST";

	/**
	 * 상태: 승인됨
	 */
	public static final String STATUS_APPROVED = "APPROVED";

	/**
	 * 상태: 입고 중
	 */
	public static final String STATUS_RECEIVING = "RECEIVING";

	/**
	 * 상태: 검수 중
	 */
	public static final String STATUS_INSPECTING = "INSPECTING";

	/**
	 * 상태: 검수 완료
	 */
	public static final String STATUS_INSPECTED = "INSPECTED";

	/**
	 * 상태: 처분 완료
	 */
	public static final String STATUS_DISPOSED = "DISPOSED";

	/**
	 * 상태: 완료
	 */
	public static final String STATUS_COMPLETED = "COMPLETED";

	/**
	 * 상태: 마감
	 */
	public static final String STATUS_CLOSED = "CLOSED";

	/**
	 * 상태: 거부됨
	 */
	public static final String STATUS_REJECTED = "REJECTED";

	/**
	 * 상태: 취소됨
	 */
	public static final String STATUS_CANCELLED = "CANCELLED";

	// ========== 반품 유형 (rwa_orders.rwa_type) ==========

	/**
	 * 반품 유형: 고객 반품
	 */
	public static final String RWA_TYPE_CUSTOMER_RETURN = "CUSTOMER_RETURN";

	/**
	 * 반품 유형: 공급업체 반품 (불량품 반송)
	 */
	public static final String RWA_TYPE_VENDOR_RETURN = "VENDOR_RETURN";

	/**
	 * 반품 유형: 불량품 반품
	 */
	public static final String RWA_TYPE_DEFECT_RETURN = "DEFECT_RETURN";

	/**
	 * 반품 유형: 재고 조정 반품
	 */
	public static final String RWA_TYPE_STOCK_ADJUST = "STOCK_ADJUST";

	/**
	 * 반품 유형: 유통기한 임박 반품
	 */
	public static final String RWA_TYPE_EXPIRED_RETURN = "EXPIRED_RETURN";

	// ========== 검수 유형 (rwa_inspections.insp_type) ==========

	/**
	 * 검수 유형: 육안 검사
	 */
	public static final String INSP_TYPE_VISUAL = "VISUAL";

	/**
	 * 검수 유형: 기능 검사
	 */
	public static final String INSP_TYPE_FUNCTIONAL = "FUNCTIONAL";

	/**
	 * 검수 유형: 전수 검사
	 */
	public static final String INSP_TYPE_FULL = "FULL";

	// ========== 검수 결과 (rwa_inspections.insp_result) ==========

	/**
	 * 검수 결과: 합격 (전량 양품)
	 */
	public static final String INSP_RESULT_PASS = "PASS";

	/**
	 * 검수 결과: 불합격 (전량 불량)
	 */
	public static final String INSP_RESULT_FAIL = "FAIL";

	/**
	 * 검수 결과: 부분 합격 (양품 + 불량 혼재)
	 */
	public static final String INSP_RESULT_PARTIAL = "PARTIAL";

	// ========== 불량 유형 (rwa_inspections.defect_type) ==========

	/**
	 * 불량 유형: 파손
	 */
	public static final String DEFECT_TYPE_DAMAGED = "DAMAGED";

	/**
	 * 불량 유형: 유통기한 초과
	 */
	public static final String DEFECT_TYPE_EXPIRED = "EXPIRED";

	/**
	 * 불량 유형: 상품 오류 (잘못된 상품)
	 */
	public static final String DEFECT_TYPE_WRONG_ITEM = "WRONG_ITEM";

	/**
	 * 불량 유형: 부품 누락
	 */
	public static final String DEFECT_TYPE_MISSING_PARTS = "MISSING_PARTS";

	/**
	 * 불량 유형: 기능 결함
	 */
	public static final String DEFECT_TYPE_FUNCTIONAL_DEFECT = "FUNCTIONAL_DEFECT";

	// ========== 불량 등급 (rwa_inspections.defect_grade) ==========

	/**
	 * 불량 등급: A (경미한 불량)
	 */
	public static final String DEFECT_GRADE_A = "A";

	/**
	 * 불량 등급: B (보통 불량)
	 */
	public static final String DEFECT_GRADE_B = "B";

	/**
	 * 불량 등급: C (심각한 불량)
	 */
	public static final String DEFECT_GRADE_C = "C";

	// ========== 처분 유형 (rwa_dispositions.disposition_type) ==========

	/**
	 * 처분 유형: 재입고 (양품)
	 */
	public static final String DISPOSITION_TYPE_RESTOCK = "RESTOCK";

	/**
	 * 처분 유형: 폐기
	 */
	public static final String DISPOSITION_TYPE_SCRAP = "SCRAP";

	/**
	 * 처분 유형: 수리/재가공
	 */
	public static final String DISPOSITION_TYPE_REPAIR = "REPAIR";

	/**
	 * 처분 유형: 공급업체 반송
	 */
	public static final String DISPOSITION_TYPE_RETURN_VENDOR = "RETURN_VENDOR";

	/**
	 * 처분 유형: 기부
	 */
	public static final String DISPOSITION_TYPE_DONATION = "DONATION";

	// ========== 폐기 방법 (rwa_dispositions.scrap_method) ==========

	/**
	 * 폐기 방법: 소각
	 */
	public static final String SCRAP_METHOD_INCINERATION = "INCINERATION";

	/**
	 * 폐기 방법: 매립
	 */
	public static final String SCRAP_METHOD_LANDFILL = "LANDFILL";

	/**
	 * 폐기 방법: 재활용
	 */
	public static final String SCRAP_METHOD_RECYCLE = "RECYCLE";

	// ========== 수리 상태 (rwa_dispositions.repair_status) ==========

	/**
	 * 수리 상태: 수리 요청
	 */
	public static final String REPAIR_STATUS_REQUESTED = "REQUESTED";

	/**
	 * 수리 상태: 수리 중
	 */
	public static final String REPAIR_STATUS_IN_REPAIR = "IN_REPAIR";

	/**
	 * 수리 상태: 수리 완료
	 */
	public static final String REPAIR_STATUS_COMPLETED = "COMPLETED";

	// ========== 기타 상수 ==========

	/**
	 * 반품 번호 접두사
	 */
	public static final String RWA_NO_PREFIX = "RWA-";

	/**
	 * 기본 검수 플래그 값
	 */
	public static final boolean DEFAULT_INSP_FLAG = true;

	/**
	 * 기본 재고 영향 플래그 값
	 */
	public static final boolean DEFAULT_STOCK_IMPACT_FLAG = true;
}
