package operato.wms.vas;

/**
 * WMS VAS(Value-Added Service) 모듈 상수 정의
 *
 * @author HatioLab
 */
public class WmsVasConstants {

	// ========== BOM 상태 (vas_boms.status) ==========

	/**
	 * BOM 상태: 활성
	 */
	public static final String BOM_STATUS_ACTIVE = "ACTIVE";

	/**
	 * BOM 상태: 비활성
	 */
	public static final String BOM_STATUS_INACTIVE = "INACTIVE";

	// ========== 작업 지시 상태 (vas_orders.status) ==========

	/**
	 * 상태: 계획
	 */
	public static final String STATUS_PLAN = "PLAN";

	/**
	 * 상태: 승인됨
	 */
	public static final String STATUS_APPROVED = "APPROVED";

	/**
	 * 상태: 자재 준비 완료
	 */
	public static final String STATUS_MATERIAL_READY = "MATERIAL_READY";

	/**
	 * 상태: 작업 중
	 */
	public static final String STATUS_IN_PROGRESS = "IN_PROGRESS";

	/**
	 * 상태: 완료
	 */
	public static final String STATUS_COMPLETED = "COMPLETED";

	/**
	 * 상태: 마감
	 */
	public static final String STATUS_CLOSED = "CLOSED";

	/**
	 * 상태: 취소됨
	 */
	public static final String STATUS_CANCELLED = "CANCELLED";

	// ========== 작업 지시 상세 상태 (vas_order_items.status) ==========

	/**
	 * 상세 상태: 계획됨
	 */
	public static final String ITEM_STATUS_PLANNED = "PLANNED";

	/**
	 * 상세 상태: 배정됨
	 */
	public static final String ITEM_STATUS_ALLOCATED = "ALLOCATED";

	/**
	 * 상세 상태: 피킹 중
	 */
	public static final String ITEM_STATUS_PICKING = "PICKING";

	/**
	 * 상세 상태: 피킹 완료
	 */
	public static final String ITEM_STATUS_PICKED = "PICKED";

	/**
	 * 상세 상태: 사용 중
	 */
	public static final String ITEM_STATUS_IN_USE = "IN_USE";

	/**
	 * 상세 상태: 완료
	 */
	public static final String ITEM_STATUS_COMPLETED = "COMPLETED";

	// ========== 유통가공 유형 (vas_orders.vas_type, vas_boms.vas_type) ==========

	/**
	 * 유통가공 유형: 세트 구성
	 */
	public static final String VAS_TYPE_SET_ASSEMBLY = "SET_ASSEMBLY";

	/**
	 * 유통가공 유형: 세트 해체
	 */
	public static final String VAS_TYPE_DISASSEMBLY = "DISASSEMBLY";

	/**
	 * 유통가공 유형: 재포장
	 */
	public static final String VAS_TYPE_REPACK = "REPACK";

	/**
	 * 유통가공 유형: 라벨링
	 */
	public static final String VAS_TYPE_LABEL = "LABEL";

	/**
	 * 유통가공 유형: 기타 가공
	 */
	public static final String VAS_TYPE_CUSTOM = "CUSTOM";

	// ========== 실적 유형 (vas_results.result_type) ==========

	/**
	 * 실적 유형: 조립 (세트 구성)
	 */
	public static final String RESULT_TYPE_ASSEMBLY = "ASSEMBLY";

	/**
	 * 실적 유형: 해체 (세트 해체)
	 */
	public static final String RESULT_TYPE_DISASSEMBLY = "DISASSEMBLY";

	// ========== 우선순위 (vas_orders.priority) ==========

	/**
	 * 우선순위: 높음
	 */
	public static final String PRIORITY_HIGH = "HIGH";

	/**
	 * 우선순위: 보통
	 */
	public static final String PRIORITY_NORMAL = "NORMAL";

	/**
	 * 우선순위: 낮음
	 */
	public static final String PRIORITY_LOW = "LOW";

	// ========== 기타 상수 ==========

	/**
	 * 유통가공 번호 접두사
	 */
	public static final String VAS_NO_PREFIX = "VAS-";

	/**
	 * BOM 번호 접두사
	 */
	public static final String BOM_NO_PREFIX = "BOM-";
}
