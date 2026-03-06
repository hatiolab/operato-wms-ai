package operato.wms.outbound;

/**
 * 출고 모듈 환경설정 항목 명에 대한 상수값 정의
 * 
 * @author shortstop
 */
public class WmsOutboundConfigConstants {
    /**
     * 출고 대기 로케이션 - 재고가 출고 처리 확정 전 까지 임시로 머물 로케이션
     */
    public static final String RELEASE_WAITING_LOCATION = "out.release.waiting.location";
    /**
     * 출고 피킹 예약 방법 - INV_CHECK_ONLY : 가용 재고 체크만, QTY_ONLY : 수량만 할당, BARCODE : 바코드 별 할당
     */
    public static final String PICKING_RESERVE_METHOD = "out.picking.reservation.method";
    /**
     * 출고 피킹 예약 전략 - EXPIRED_DATE (유통기한 선입선출), FIFO (입고 시간 선입선출), MANUAL (작업자가 판단)
     */
    public static final String PICKING_RESERVE_STRATEGY = "out.picking.reservation.strategy";
    /**
     * 출고 피킹 완료 시 피킹 지시 자동 마감 사용 여부 - true (사용), false (사용 안 함)
     */
    public static final String PICKING_AUTO_CLOSING_ENABLED = "out.picking.order.auto-close.enabled";
    /**
     * 출고 피킹 시작 시 피킹 지시 자동 시작 여부 - true (사용), false (사용 안 함)
     */
    public static final String PICKING_AUTO_START_ENABLED = "out.picking.auto-start.release-order.started";
    /**
     * 출고 지시서 출력 템플릿
     */
    public static final String PICKING_ORDER_SHEET_TEMPLATE = "out.picking.order.sheet.template";
    /**
     * 거래명세서 템플릿 명
     */
    public static final String RELEASE_TRADE_STMT_TEMPLATE = "out.release.order.sheet.template";
    /**
     * 출고 라벨 출력 템플릿 명
     */
    public static final String RELEASE_LABEL_TEMPLATE = "out.release.label.template";
    
    /**
     * 출고 피킹 예약 방법 - INV_CHECK_ONLY (가용 재고 체크만 하고 피킹 예약을 하지 않는다.) 
     */
    public static final String PICKING_RESERVE_METHOD_INV_CHECK_ONLY = "INV_CHECK_ONLY";
    /**
     * 출고 피킹 예약 방법 - QTY_ONLY (가용 재고 체크 하고 상품별로 수량으로만 피킹 예약을 하되 바코드 자체에 피킹 예약을 하지 않는다.) 
     */
    public static final String PICKING_RESERVE_METHOD_QTY_ONLY = "QTY_ONLY"; 
    /**
     * 출고 피킹 예약 방법 - BARCODE (가용 재고 체크를 하고 개별 바코드에 피킹 예약을 건다.) 
     */
    public static final String PICKING_RESERVE_METHOD_BARCODE = "BARCODE";
    
    /**
     * 출고 피킹 예약 전략 - EXPIRED_DATE (유통기한 선입선출) 
     */
    public static final String PICKING_RESERVE_STRATEGY_EXPIRED_DATE = "EXPIRED_DATE";
    /**
     * 출고 피킹 예약 전략 - FIFO (입고 시간 선입선출) 
     */
    public static final String PICKING_RESERVE_STRATEGY_FIFO = "FIFO";
    /**
     * 출고 피킹 예약 전략 - MANUAL (작업자가 판단) 
     */
    public static final String PICKING_RESERVE_STRATEGY_MANUAL = "MANUAL";
}
