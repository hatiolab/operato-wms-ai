package operato.wms.oms;

/**
 * WMS Oms 모듈 설정 상수 정의
 *
 * @author HatioLab
 */
public class WmsOmsConfigConstants {
    /**
     * 출고 주문 비지니스 유형 - B2C 출고
     */
    public static final String SHIPMENT_ORDER_BIZ_TYPE_B2C_OUT = "B2C_OUT";
    /**
     * 출고 주문 비지니스 유형 - B2B 출고
     */
    public static final String SHIPMENT_ORDER_BIZ_TYPE_B2B_OUT = "B2B_OUT";
    /**
     * 출고 주문 비지니스 유형 - B2C 반품
     */
    public static final String SHIPMENT_ORDER_BIZ_TYPE_B2C_RTN = "B2C_RTN";
    /**
     * 출고 주문 비지니스 유형 - B2B 반품
     */
    public static final String SHIPMENT_ORDER_BIZ_TYPE_B2B_RTN = "B2B_RTN";

    /**
     * 자동 웨이브 생성 - 그룹핑 기준 (쉼표 구분, 예: com_cd,carrier_cd)
     */
    public static final String WAVE_AUTO_GROUP_BY = "oms.wave.auto.group_by";

    /**
     * 자동 웨이브 생성 - 피킹 유형 (TOTAL/ZONE/INDIVIDUAL, 기본 TOTAL)
     */
    public static final String WAVE_AUTO_PICK_TYPE = "oms.wave.auto.pick_type";

    /**
     * 자동 웨이브 생성 - 웨이브당 최대 주문 건수 (기본 200)
     */
    public static final String WAVE_AUTO_MAX_ORDER_COUNT = "oms.wave.auto.max_order_count";
}
