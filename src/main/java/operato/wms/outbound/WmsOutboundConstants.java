package operato.wms.outbound;

/**
 * WMS Outbound 모듈 상수 정의
 * 
 * @author shortstop
 */
public class WmsOutboundConstants {

    /**
     * 출고 유형 - 일반 출고
     */
    public static final String RELEASE_TYPE_NORMAL = "NORMAL";
    /**
     * 출고 유형 - 반품 출고
     */
    public static final String RELEASE_TYPE_RETURN = "RETURN";
    /**
     * 출고 유형 - 창고 이동
     */
    public static final String RELEASE_TYPE_TRANSFER = "TRANSFER";
    /**
     * 출고 유형 - 폐기
     */
    public static final String RELEASE_TYPE_SCRAP = "SCRAP";
    /**
     * 출고 유형 - 기타 출고
     */
    public static final String RELEASE_TYPE_ETC = "ETC";
    
    /**
     * 출고 실행 유형 - 개별 출고
     */
    public static final String RLS_EXE_TYPE_INDIVIDUAL = "INDIVIDUAL";
    /**
     * 출고 실행 유형 - 일괄 출고
     */
    public static final String RLS_EXE_TYPE_BATCH = "BATCH";
    /**
     * 출고 실행 유형 - 설비 출고
     */
    public static final String RLS_EXE_TYPE_EQUIPMENT = "EQUIPMENT";
    
    /**
     * 비지니스 유형 - B2B 출고
     */
    public static final String BIZ_TYPE_B2B_OUT = "B2B_OUT";
    /**
     * 비지니스 유형 - B2C 출고
     */
    public static final String BIZ_TYPE_B2C_OUT = "B2C_OUT";
    /**
     * 비지니스 유형 - B2B 반품
     */
    public static final String BIZ_TYPE_B2B_RTN = "B2B_RTN";
    /**
     * 비지니스 유형 - B2C 반품
     */
    public static final String BIZ_TYPE_B2C_RTN = "B2C_RTN";
}
