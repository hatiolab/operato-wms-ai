package operato.wms.oms;

/**
 * WMS Oms 모듈 상수 정의
 *
 * @author HatioLab
 */
public class WmsOmsConstants {

	// === 주문 임포트 ===
	/** 커스텀 서비스 - 출하 주문 임포트 전 처리 */
	public static final String TRX_OMS_PRE_IMPORT_SHIPMENT = "diy-oms-pre-import-shipment-orders";
	/** 커스텀 서비스 - 출하 주문 임포트 후 처리 */
	public static final String TRX_OMS_POST_IMPORT_SHIPMENT = "diy-oms-post-import-shipment-orders";

	// === 주문 확정 ===
	/** 커스텀 서비스 - 출하 주문 확정 전 처리 */
	public static final String TRX_OMS_PRE_CONFIRM_SHIPMENT = "diy-oms-pre-confirm-shipment-order";
	/** 커스텀 서비스 - 출하 주문 확정 후 처리 */
	public static final String TRX_OMS_POST_CONFIRM_SHIPMENT = "diy-oms-post-confirm-shipment-order";

	// === 재고 할당 ===
	/** 커스텀 서비스 - 재고 할당 전 처리 */
	public static final String TRX_OMS_PRE_ALLOCATE_SHIPMENT = "diy-oms-pre-allocate-shipment-order";
	/** 커스텀 서비스 - 재고 할당 후 처리 */
	public static final String TRX_OMS_POST_ALLOCATE_SHIPMENT = "diy-oms-post-allocate-shipment-order";

	// === 할당 해제 ===
	/** 커스텀 서비스 - 할당 해제 전 처리 */
	public static final String TRX_OMS_PRE_DEALLOCATE_SHIPMENT = "diy-oms-pre-deallocate-shipment-order";
	/** 커스텀 서비스 - 할당 해제 후 처리 */
	public static final String TRX_OMS_POST_DEALLOCATE_SHIPMENT = "diy-oms-post-deallocate-shipment-order";

	// === 확정+할당 (원클릭) ===
	/** 커스텀 서비스 - 확정+할당 전 처리 */
	public static final String TRX_OMS_PRE_CONFIRM_AND_ALLOCATE = "diy-oms-pre-confirm-and-allocate";
	/** 커스텀 서비스 - 확정+할당 후 처리 */
	public static final String TRX_OMS_POST_CONFIRM_AND_ALLOCATE = "diy-oms-post-confirm-and-allocate";

	// === 웨이브 생성 ===
	/** 커스텀 서비스 - 웨이브 생성 전 처리 */
	public static final String TRX_OMS_PRE_CREATE_WAVE = "diy-oms-pre-create-wave";
	/** 커스텀 서비스 - 웨이브 생성 후 처리 */
	public static final String TRX_OMS_POST_CREATE_WAVE = "diy-oms-post-create-wave";

	// === 웨이브 확정 (Fulfillment/WCS 인계) ===
	/** 커스텀 서비스 - 웨이브 확정(릴리스) 전 처리 */
	public static final String TRX_OMS_PRE_RELEASE_WAVE = "diy-oms-pre-release-wave";
	/** 커스텀 서비스 - 웨이브 확정(릴리스) 후 처리 */
	public static final String TRX_OMS_POST_RELEASE_WAVE = "diy-oms-post-release-wave";

	// === 주문 취소 ===
	/** 커스텀 서비스 - 출하 주문 취소 전 처리 */
	public static final String TRX_OMS_PRE_CANCEL_SHIPMENT = "diy-oms-pre-cancel-shipment-order";
	/** 커스텀 서비스 - 출하 주문 취소 후 처리 */
	public static final String TRX_OMS_POST_CANCEL_SHIPMENT = "diy-oms-post-cancel-shipment-order";

	// === 주문 마감 ===
	/** 커스텀 서비스 - 출하 주문 마감 전 처리 */
	public static final String TRX_OMS_PRE_CLOSE_SHIPMENT = "diy-oms-pre-close-shipment-order";
	/** 커스텀 서비스 - 출하 주문 마감 후 처리 */
	public static final String TRX_OMS_POST_CLOSE_SHIPMENT = "diy-oms-post-close-shipment-order";

	// === 웨이브 확정 취소 ===
	/** 커스텀 서비스 - 웨이브 확정 취소 전 처리 */
	public static final String TRX_OMS_PRE_CANCEL_RELEASE_WAVE = "diy-oms-pre-cancel-release-wave";
	/** 커스텀 서비스 - 웨이브 확정 취소 후 처리 */
	public static final String TRX_OMS_POST_CANCEL_RELEASE_WAVE = "diy-oms-post-cancel-release-wave";

	// === 웨이브 취소 ===
	/** 커스텀 서비스 - 웨이브 취소 전 처리 */
	public static final String TRX_OMS_PRE_CANCEL_WAVE = "diy-oms-pre-cancel-wave";
	/** 커스텀 서비스 - 웨이브 취소 후 처리 */
	public static final String TRX_OMS_POST_CANCEL_WAVE = "diy-oms-post-cancel-wave";

	// === 보충 지시 생성 ===
	/** 커스텀 서비스 - 보충 지시 생성 전 처리 */
	public static final String TRX_OMS_PRE_CREATE_REPLENISH = "diy-oms-pre-create-replenish-order";
	/** 커스텀 서비스 - 보충 지시 생성 후 처리 */
	public static final String TRX_OMS_POST_CREATE_REPLENISH = "diy-oms-post-create-replenish-order";

	// === 보충 지시 시작 ===
	/** 커스텀 서비스 - 보충 지시 시작 전 처리 */
	public static final String TRX_OMS_PRE_START_REPLENISH = "diy-oms-pre-start-replenish-order";
	/** 커스텀 서비스 - 보충 지시 시작 후 처리 */
	public static final String TRX_OMS_POST_START_REPLENISH = "diy-oms-post-start-replenish-order";

	// === 보충 지시 완료 ===
	/** 커스텀 서비스 - 보충 지시 완료 전 처리 */
	public static final String TRX_OMS_PRE_COMPLETE_REPLENISH = "diy-oms-pre-complete-replenish-order";
	/** 커스텀 서비스 - 보충 지시 완료 후 처리 */
	public static final String TRX_OMS_POST_COMPLETE_REPLENISH = "diy-oms-post-complete-replenish-order";

	// === 보충 지시 취소 ===
	/** 커스텀 서비스 - 보충 지시 취소 전 처리 */
	public static final String TRX_OMS_PRE_CANCEL_REPLENISH = "diy-oms-pre-cancel-replenish-order";
	/** 커스텀 서비스 - 보충 지시 취소 후 처리 */
	public static final String TRX_OMS_POST_CANCEL_REPLENISH = "diy-oms-post-cancel-replenish-order";

}
