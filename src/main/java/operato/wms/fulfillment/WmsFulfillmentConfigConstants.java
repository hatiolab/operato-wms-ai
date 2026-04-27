package operato.wms.fulfillment;

/**
 * WMS Fulfillment 모듈 설정 상수 정의
 *
 * @author HatioLab
 */
public class WmsFulfillmentConfigConstants {

    /**
     * 피킹지시서 템플릿
     */
    public static final String PICKING_TASK_SHEET_TEMPLATE = "out.picking.order.sheet.template";

    /**
     * 주문 직접 피킹 완료 시 포장 지시 자동 생성 여부 (true/false, 기본: false)
     *
     * 웨이브 없이 직접 피킹(wave_no = null)한 경우, 웨이브의 insp_flag 대신
     * 이 설정값을 읽어 포장 지시 자동 생성 여부를 결정한다.
     */
    public static final String DIRECT_PICKING_INSP_FLAG = "ful.direct_picking.insp_flag";
}
