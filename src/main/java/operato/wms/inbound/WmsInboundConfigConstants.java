package operato.wms.inbound;

/**
 * 입고 모듈 환경설정 항목 명에 대한 상수값 정의
 * 
 * @author shortstop
 */
public class WmsInboundConfigConstants {

    /**
     * 입고 지시서 출력 템플릿
     */
    public static final String RECEIPT_ORDER_SHEET_TEMPLATE = "in.receipt.order.sheet.template";
    /**
     * 입고 처리 완료시 자동으로 이동될 로케이션
     */
    public static final String RECEIPT_FINISH_LOCATION = "in.receipt.finish.location";
    /**
     * 입고 적치 전략 - DISTANCE (잘 나가는 상품이 가까운 곳에 위치), FIXED (고정식)
     */
    public static final String RECEIPT_LOAD_STRATEGY = "in.putaway.strategy";
    /**
     * 입고 자동 완료 - TRUE : 모든 상품 입고 작업 완료시 자동 완료 (상태 : START > END), FALSE : 현재 상태 유지 (상태 : START) 
     */
    public static final String RECEIPT_FINISH_AUTO_FLAG = "in.receipt.finish.auto.flag";
    /**
     * 입수 수량 자동 계산 - TRUE : 팔레트, 박스, 낱개 수량 자동 계산, FALSE : 팔레트, 박스, 낱개 수량 계산 안함  
     */
    public static final String RECEIPT_QTY_AUTO_SETTING_FLAG = "in.receipt.qty.auto.setting.flag";
}
