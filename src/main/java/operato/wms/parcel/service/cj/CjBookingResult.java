package operato.wms.parcel.service.cj;

/**
 * CJ대한통운 예약 접수 결과 VO
 *
 * RegBook API 호출 성공 시 반환된다.
 * 참조: docs/interface/courier/cj/booking.md
 */
public class CjBookingResult {

    /** WMS 출고 주문번호 (CUST_USE_NO) */
    private final String shipmentNo;

    /** 운송장 번호 (요청 시 전달한 INVC_NO) */
    private final String invcNo;

    private CjBookingResult(String shipmentNo, String invcNo) {
        this.shipmentNo = shipmentNo;
        this.invcNo = invcNo;
    }

    /** 예약 접수 성공 결과 생성 */
    public static CjBookingResult success(String shipmentNo, String invcNo) {
        return new CjBookingResult(shipmentNo, invcNo);
    }

    public String getShipmentNo() { return shipmentNo; }
    public String getInvcNo() { return invcNo; }
}
