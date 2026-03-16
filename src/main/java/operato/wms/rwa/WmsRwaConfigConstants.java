package operato.wms.rwa;

/**
 * RWA(Return Warehouse Authorization) 모듈 환경설정 항목 명에 대한 상수값 정의
 *
 * @author HatioLab
 */
public class WmsRwaConfigConstants {

	/**
	 * 반품 지시서 출력 템플릿
	 */
	public static final String RWA_ORDER_SHEET_TEMPLATE = "rwa.order.sheet.template";

	/**
	 * 반품 검수 완료 시 자동 상태 변경 여부
	 * - TRUE: 검수 완료 시 자동으로 INSPECTED 상태로 변경
	 * - FALSE: 수동으로 상태 변경
	 */
	public static final String RWA_INSPECTION_AUTO_STATUS_FLAG = "rwa.inspection.auto.status.flag";

	/**
	 * 반품 처분 완료 시 자동 재고 처리 여부
	 * - TRUE: 처분 유형에 따라 자동으로 재고 증감 처리
	 * - FALSE: 수동으로 재고 처리
	 */
	public static final String RWA_DISPOSITION_AUTO_STOCK_FLAG = "rwa.disposition.auto.stock.flag";

	/**
	 * 반품 입고 시 임시 보관 로케이션
	 * - 반품 입고 시 검수 전까지 임시로 보관할 로케이션
	 */
	public static final String RWA_TEMP_LOCATION = "rwa.temp.location";

	/**
	 * 반품 재입고(RESTOCK) 시 기본 로케이션 전략
	 * - ORIGINAL: 원래 로케이션으로 복원
	 * - OPTIMAL: 최적 로케이션 자동 할당
	 * - FIXED: 고정 로케이션 할당
	 */
	public static final String RWA_RESTOCK_LOCATION_STRATEGY = "rwa.restock.location.strategy";

	/**
	 * 반품 폐기 시 기본 폐기 로케이션
	 */
	public static final String RWA_SCRAP_LOCATION = "rwa.scrap.location";

	/**
	 * 반품 폐기 시 기본 폐기 방법
	 * - INCINERATION: 소각
	 * - LANDFILL: 매립
	 * - RECYCLE: 재활용
	 */
	public static final String RWA_SCRAP_DEFAULT_METHOD = "rwa.scrap.default.method";

	/**
	 * 반품 검수 필수 여부
	 * - TRUE: 모든 반품 항목에 대해 검수 필수
	 * - FALSE: 검수 생략 가능
	 */
	public static final String RWA_INSPECTION_REQUIRED_FLAG = "rwa.inspection.required.flag";

	/**
	 * 반품 품질 검사(QC) 필수 여부
	 * - TRUE: 검수 외 별도 품질 검사 필수
	 * - FALSE: 검수만으로 처리
	 */
	public static final String RWA_QC_REQUIRED_FLAG = "rwa.qc.required.flag";

	/**
	 * 반품 사진 촬영 필수 여부
	 * - TRUE: 검수 시 불량 사진 필수
	 * - FALSE: 사진 선택적
	 */
	public static final String RWA_PHOTO_REQUIRED_FLAG = "rwa.photo.required.flag";

	/**
	 * 반품 승인 워크플로우 사용 여부
	 * - TRUE: 반품 요청 시 승인 프로세스 진행
	 * - FALSE: 자동 승인
	 */
	public static final String RWA_APPROVAL_WORKFLOW_FLAG = "rwa.approval.workflow.flag";

	/**
	 * 반품 승인 권한자 역할
	 * - 반품 승인 권한을 가진 역할 (예: MANAGER, SUPERVISOR)
	 */
	public static final String RWA_APPROVAL_ROLE = "rwa.approval.role";

	/**
	 * 반품 번호 자동 채번 형식
	 * - 기본값: RWA-YYYYMMDD-XXXXX
	 */
	public static final String RWA_NO_FORMAT = "rwa.no.format";

	/**
	 * 반품 번호 일련번호 자릿수
	 * - 기본값: 5
	 */
	public static final String RWA_NO_SEQ_DIGITS = "rwa.no.seq.digits";

	/**
	 * 반품 처분 후 자동 완료 처리 여부
	 * - TRUE: 모든 항목 처분 완료 시 자동으로 COMPLETED 상태로 변경
	 * - FALSE: 수동으로 완료 처리
	 */
	public static final String RWA_AUTO_COMPLETE_FLAG = "rwa.auto.complete.flag";

	/**
	 * 반품 완료 후 자동 마감 처리 일수
	 * - 완료 후 N일 경과 시 자동으로 CLOSED 상태로 변경
	 * - 0: 자동 마감 비활성화
	 */
	public static final String RWA_AUTO_CLOSE_DAYS = "rwa.auto.close.days";

	/**
	 * 반품 수리 요청 시 기본 수리 업체
	 */
	public static final String RWA_DEFAULT_REPAIR_VENDOR = "rwa.default.repair.vendor";

	/**
	 * 고객 반품 시 재고 복원 여부
	 * - TRUE: 양품은 자동으로 재고 복원
	 * - FALSE: 수동으로 재고 처리
	 */
	public static final String RWA_CUSTOMER_RETURN_AUTO_RESTOCK_FLAG = "rwa.customer.return.auto.restock.flag";

	/**
	 * 공급업체 반품 시 자동 반송 처리 여부
	 * - TRUE: 불량품을 자동으로 공급업체 반송 처리
	 * - FALSE: 수동으로 반송 처리
	 */
	public static final String RWA_VENDOR_RETURN_AUTO_PROCESS_FLAG = "rwa.vendor.return.auto.process.flag";

	/**
	 * 반품 처리 알림 발송 여부
	 * - TRUE: 반품 상태 변경 시 관련자에게 알림 발송
	 * - FALSE: 알림 발송 안 함
	 */
	public static final String RWA_NOTIFICATION_FLAG = "rwa.notification.flag";

	/**
	 * 반품 처리 알림 수신자
	 * - 반품 상태 변경 시 알림 받을 이메일/전화번호 (쉼표 구분)
	 */
	public static final String RWA_NOTIFICATION_RECIPIENTS = "rwa.notification.recipients";

	/**
	 * 반품 데이터 보관 기간 (일)
	 * - 마감 후 N일 경과 시 아카이브 처리
	 * - 0: 무제한 보관
	 */
	public static final String RWA_DATA_RETENTION_DAYS = "rwa.data.retention.days";
}
