package operato.wms.inbound;

/**
 * WMS Inbound 모듈 상수 정의
 * 
 * @author shortstop
 */
public class WmsInboundConstants {

	/**
	 * 상태 : 작성중
	 */
	public static final String STATUS_INWORK = "INWORK";

	/**
	 * 상태 : 요청
	 */
	public static final String STATUS_REQUEST = "REQUEST";

	/**
	 * 상태 : 대기
	 */
	public static final String STATUS_READY = "READY";

	/**
	 * 상태 : 작업중
	 */
	public static final String STATUS_START = "START";

	/**
	 * 상태 : 완료
	 */
	public static final String STATUS_END = "END";

	/**
	 * 상태 : 취소
	 */
	public static final String STATUS_CANCEL = "CANCEL";

	/**
	 * 상태 : 반려 (검수 반려)
	 */
	public static final String STATUS_REJECTED = "REJECTED";

	/**
	 * 상태 : 불량 (입고 작업 중 발생한 불량 수량 라인)
	 */
	public static final String STATUS_BAD = "BAD";

	/**
	 * 상태 : 검수 승인 (화주사 검수 후 승인)
	 */
	public static final String STATUS_APPROVED = "APPROVED";

	/**
	 * 상태 : 적치 중
	 */
	public static final String STATUS_PUTAWAY = "PUTAWAY";

	/**
	 * 상태 : 적치 완료
	 */
	public static final String STATUS_STORED = "STORED";

	/**
	 * 검수 결과 : 정상 (합)
	 */
	public static final String INSP_STATUS_PASS = "PASS";

	/**
	 * 검수 결과 : 불량 (불)
	 */
	public static final String INSP_STATUS_FAIL = "FAIL";

	/**
	 * 입고 유형 - 일반 입고
	 */
	public static final String RECEIVING_TYPE_NORMAL = "NORMAL";
	/**
	 * 입고 유형 - 반품
	 */
	public static final String RECEIVING_TYPE_RETURN = "RETURN";
	/**
	 * 입고 유형 - ETC
	 */
	public static final String RECEIVING_TYPE_ETC = "ETC";
}
