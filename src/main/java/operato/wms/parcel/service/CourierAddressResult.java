package operato.wms.parcel.service;

/**
 * 택배사 공통 주소정제 결과 VO
 *
 * 택배사 API 주소정제 응답에서 WMS가 실제로 사용하는 공통 필드만 추출한다.
 * 택배사별 구현체가 자체 응답 VO를 이 타입으로 변환하여 반환한다.
 */
public class CourierAddressResult {

    /** 도착지 분류 코드 (CJ: CLSFCD) */
    private String classificationCd;

    /** 도착지 서브 분류 코드 (CJ: SUBCLSFCD) */
    private String subClassificationCd;

    /** 도착지 주소 약칭 (CJ: CLSFADDR) */
    private String classificationAddr;

    /** 배송 지점명 (CJ: CLLDLVBRANNM) */
    private String deliveryBranchNm;

    /** 배송 기사명 (CJ: CLLDLVEMPNM) */
    private String deliverySmNm;

    /** 배송 기사 직급 (CJ: CLLDLVEMPNICKNM) */
    private String deliveryClassNm;

    /** 권역 구분 (CJ: RSPSDIV) */
    private String rspsDivision;

    /** P2P 코드 (CJ: P2PCD) */
    private String p2pCd;

    public String getClassificationCd() {
        return classificationCd;
    }

    public void setClassificationCd(String classificationCd) {
        this.classificationCd = classificationCd;
    }

    public String getSubClassificationCd() {
        return subClassificationCd;
    }

    public void setSubClassificationCd(String subClassificationCd) {
        this.subClassificationCd = subClassificationCd;
    }

    public String getClassificationAddr() {
        return classificationAddr;
    }

    public void setClassificationAddr(String classificationAddr) {
        this.classificationAddr = classificationAddr;
    }

    public String getDeliveryBranchNm() {
        return deliveryBranchNm;
    }

    public void setDeliveryBranchNm(String deliveryBranchNm) {
        this.deliveryBranchNm = deliveryBranchNm;
    }

    public String getDeliverySmNm() {
        return deliverySmNm;
    }

    public void setDeliverySmNm(String deliverySmNm) {
        this.deliverySmNm = deliverySmNm;
    }

    public String getDeliveryClassNm() {
        return deliveryClassNm;
    }

    public void setDeliveryClassNm(String deliveryClassNm) {
        this.deliveryClassNm = deliveryClassNm;
    }

    public String getRspsDivision() {
        return rspsDivision;
    }

    public void setRspsDivision(String rspsDivision) {
        this.rspsDivision = rspsDivision;
    }

    public String getP2pCd() {
        return p2pCd;
    }

    public void setP2pCd(String p2pCd) {
        this.p2pCd = p2pCd;
    }
}
