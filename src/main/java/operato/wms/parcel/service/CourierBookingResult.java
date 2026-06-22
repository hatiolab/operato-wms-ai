package operato.wms.parcel.service;

/**
 * 택배사 공통 배송 예약 결과 VO
 */
public class CourierBookingResult {

    /** WMS 출고 주문번호 */
    private final String shipmentNo;

    /** 발급된 운송장 번호 */
    private final String invcNo;

    public CourierBookingResult(String shipmentNo, String invcNo) {
        this.shipmentNo = shipmentNo;
        this.invcNo = invcNo;
    }

    public String getShipmentNo() { return shipmentNo; }
    public String getInvcNo() { return invcNo; }
}
