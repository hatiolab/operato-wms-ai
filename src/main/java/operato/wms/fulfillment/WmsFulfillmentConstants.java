package operato.wms.fulfillment;

/**
 * WMS Fulfillment 모듈 상수 정의
 *
 * @author HatioLab
 */
public class WmsFulfillmentConstants {

	// === 피킹 지시 생성 ===
	/** 커스텀 서비스 - 피킹 지시 생성 전 처리 */
	public static final String TRX_FUL_PRE_CREATE_PICKING = "diy-ful-pre-create-picking-tasks";
	/** 커스텀 서비스 - 피킹 지시 생성 후 처리 */
	public static final String TRX_FUL_POST_CREATE_PICKING = "diy-ful-post-create-picking-tasks";

	// === 피킹 시작 ===
	/** 커스텀 서비스 - 피킹 시작 전 처리 */
	public static final String TRX_FUL_PRE_START_PICKING = "diy-ful-pre-start-picking-task";
	/** 커스텀 서비스 - 피킹 시작 후 처리 */
	public static final String TRX_FUL_POST_START_PICKING = "diy-ful-post-start-picking-task";

	// === 아이템 피킹 확인 ===
	/** 커스텀 서비스 - 아이템 피킹 확인 전 처리 */
	public static final String TRX_FUL_PRE_PICK_ITEM = "diy-ful-pre-pick-item";
	/** 커스텀 서비스 - 아이템 피킹 확인 후 처리 */
	public static final String TRX_FUL_POST_PICK_ITEM = "diy-ful-post-pick-item";

	// === 피킹 부족 처리 ===
	/** 커스텀 서비스 - 피킹 부족 처리 전 처리 */
	public static final String TRX_FUL_PRE_SHORT_ITEM = "diy-ful-pre-short-item";
	/** 커스텀 서비스 - 피킹 부족 처리 후 처리 */
	public static final String TRX_FUL_POST_SHORT_ITEM = "diy-ful-post-short-item";

	// === 피킹 완료 ===
	/** 커스텀 서비스 - 피킹 완료 전 처리 */
	public static final String TRX_FUL_PRE_COMPLETE_PICKING = "diy-ful-pre-complete-picking-task";
	/** 커스텀 서비스 - 피킹 완료 후 처리 */
	public static final String TRX_FUL_POST_COMPLETE_PICKING = "diy-ful-post-complete-picking-task";

	// === 피킹 취소 ===
	/** 커스텀 서비스 - 피킹 취소 전 처리 */
	public static final String TRX_FUL_PRE_CANCEL_PICKING = "diy-ful-pre-cancel-picking-task";
	/** 커스텀 서비스 - 피킹 취소 후 처리 */
	public static final String TRX_FUL_POST_CANCEL_PICKING = "diy-ful-post-cancel-picking-task";

	// === 포장 지시 생성 ===
	/** 커스텀 서비스 - 포장 지시 생성 전 처리 */
	public static final String TRX_FUL_PRE_CREATE_PACKING = "diy-ful-pre-create-packing-order";
	/** 커스텀 서비스 - 포장 지시 생성 후 처리 */
	public static final String TRX_FUL_POST_CREATE_PACKING = "diy-ful-post-create-packing-order";

	// === 포장 시작 ===
	/** 커스텀 서비스 - 포장 시작 전 처리 */
	public static final String TRX_FUL_PRE_START_PACKING = "diy-ful-pre-start-packing-order";
	/** 커스텀 서비스 - 포장 시작 후 처리 */
	public static final String TRX_FUL_POST_START_PACKING = "diy-ful-post-start-packing-order";

	// === 아이템 검수 ===
	/** 커스텀 서비스 - 아이템 검수 전 처리 */
	public static final String TRX_FUL_PRE_INSPECT_ITEM = "diy-ful-pre-inspect-item";
	/** 커스텀 서비스 - 아이템 검수 후 처리 */
	public static final String TRX_FUL_POST_INSPECT_ITEM = "diy-ful-post-inspect-item";

	// === 아이템 포장 ===
	/** 커스텀 서비스 - 아이템 포장 전 처리 */
	public static final String TRX_FUL_PRE_PACK_ITEM = "diy-ful-pre-pack-item";
	/** 커스텀 서비스 - 아이템 포장 후 처리 */
	public static final String TRX_FUL_POST_PACK_ITEM = "diy-ful-post-pack-item";

	// === 포장 완료 ===
	/** 커스텀 서비스 - 포장 완료 전 처리 */
	public static final String TRX_FUL_PRE_COMPLETE_PACKING = "diy-ful-pre-complete-packing-order";
	/** 커스텀 서비스 - 포장 완료 후 처리 */
	public static final String TRX_FUL_POST_COMPLETE_PACKING = "diy-ful-post-complete-packing-order";

	// === 포장 취소 ===
	/** 커스텀 서비스 - 포장 취소 전 처리 */
	public static final String TRX_FUL_PRE_CANCEL_PACKING = "diy-ful-pre-cancel-packing-order";
	/** 커스텀 서비스 - 포장 취소 후 처리 */
	public static final String TRX_FUL_POST_CANCEL_PACKING = "diy-ful-post-cancel-packing-order";

	// === 운송장 라벨 출력 ===
	/** 커스텀 서비스 - 운송장 라벨 출력 전 처리 */
	public static final String TRX_FUL_PRE_PRINT_LABEL = "diy-ful-pre-print-label";
	/** 커스텀 서비스 - 운송장 라벨 출력 후 처리 */
	public static final String TRX_FUL_POST_PRINT_LABEL = "diy-ful-post-print-label";

	// === 적하 목록 전송 ===
	/** 커스텀 서비스 - 적하 목록 전송 전 처리 */
	public static final String TRX_FUL_PRE_CREATE_MANIFEST = "diy-ful-pre-create-manifest";
	/** 커스텀 서비스 - 적하 목록 전송 후 처리 */
	public static final String TRX_FUL_POST_CREATE_MANIFEST = "diy-ful-post-create-manifest";

	// === 출하 확정 ===
	/** 커스텀 서비스 - 출하 확정 전 처리 */
	public static final String TRX_FUL_PRE_CONFIRM_SHIPPING = "diy-ful-pre-confirm-shipping";
	/** 커스텀 서비스 - 출하 확정 후 처리 */
	public static final String TRX_FUL_POST_CONFIRM_SHIPPING = "diy-ful-post-confirm-shipping";

	// === 출하 취소 ===
	/** 커스텀 서비스 - 출하 취소 전 처리 */
	public static final String TRX_FUL_PRE_CANCEL_SHIPPING = "diy-ful-pre-cancel-shipping";
	/** 커스텀 서비스 - 출하 취소 후 처리 */
	public static final String TRX_FUL_POST_CANCEL_SHIPPING = "diy-ful-post-cancel-shipping";

	// === 박스 생성 ===
	/** 커스텀 서비스 - 박스 생성 전 처리 */
	public static final String TRX_FUL_PRE_CREATE_BOX = "diy-ful-pre-create-box";
	/** 커스텀 서비스 - 박스 생성 후 처리 */
	public static final String TRX_FUL_POST_CREATE_BOX = "diy-ful-post-create-box";

	// === 박스 닫기 ===
	/** 커스텀 서비스 - 박스 닫기 전 처리 */
	public static final String TRX_FUL_PRE_CLOSE_BOX = "diy-ful-pre-close-box";
	/** 커스텀 서비스 - 박스 닫기 후 처리 */
	public static final String TRX_FUL_POST_CLOSE_BOX = "diy-ful-post-close-box";

	// === 송장 번호 업데이트 ===
	/** 커스텀 서비스 - 박스 송장 번호 업데이트 전 처리 */
	public static final String TRX_FUL_PRE_UPDATE_BOX_INVOICE = "diy-ful-pre-update-box-invoice";
	/** 커스텀 서비스 - 박스 송장 번호 업데이트 후 처리 */
	public static final String TRX_FUL_POST_UPDATE_BOX_INVOICE = "diy-ful-post-update-box-invoice";

	// === 도크 배정 ===
	/** 커스텀 서비스 - 도크 배정 전 처리 */
	public static final String TRX_FUL_PRE_ASSIGN_DOCK = "diy-ful-pre-assign-dock";
	/** 커스텀 서비스 - 도크 배정 후 처리 */
	public static final String TRX_FUL_POST_ASSIGN_DOCK = "diy-ful-post-assign-dock";

	// === 송장번호로 출하 확정 ===
	/** 커스텀 서비스 - 송장번호 출하 확정 전 처리 */
	public static final String TRX_FUL_PRE_CONFIRM_BY_INVOICE = "diy-ful-pre-confirm-by-invoice";
	/** 커스텀 서비스 - 송장번호 출하 확정 후 처리 */
	public static final String TRX_FUL_POST_CONFIRM_BY_INVOICE = "diy-ful-post-confirm-by-invoice";

}
