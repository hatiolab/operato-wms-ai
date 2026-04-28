package operato.wms.inbound;

/**
 * 입고 모듈 환경설정 항목 명에 대한 상수값 정의
 * 
 * @author shortstop
 */
public class WmsInboundConfigConstants {
    /**
     * 입고 자동 완료 - TRUE : 모든 상품 입고 작업 완료시 자동 완료 (상태 : START > END), FALSE : 현재 상태 유지
     * (상태 : START)
     */
    public static final String RECEIPT_FINISH_AUTO_FLAG = "in.receipt.finish.auto.flag";
    /**
     * 입수 수량 자동 계산 - TRUE : 팔레트, 박스, 낱개 수량 자동 계산, FALSE : 팔레트, 박스, 낱개 수량 계산 안함
     */
    public static final String RECEIPT_QTY_AUTO_SETTING_FLAG = "in.receipt.qty.auto.setting.flag";
}
