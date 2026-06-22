package operato.wms.parcel.service.cj;

/**
 * CJ대한통운 주소정제 결과 VO
 *
 * ReqAddrRfnSm API 응답 DATA 필드를 담는다.
 * 참조: docs/interface/courier/cj/address-refinement.md
 */
public class CjAddressResult {

    /** 도착지 코드 (CLSFCD) */
    private String clsfCd;

    /** 도착지 서브 코드 (SUBCLSFCD) */
    private String subClsfCd;

    /** 주소 약칭 (CLSFADDR) */
    private String clsfAddr;

    /** 배송집배점 명 (CLLDLVBRANNM) */
    private String deliveryBranchNm;

    /** 배송SM명 (CLLDLVEMPNM) */
    private String deliverySmNm;

    /** SM분류코드 (CLLDLVEMPNICKNM) */
    private String smClassNm;

    /** 권역 구분 (RSPSDIV) */
    private String rspsDivision;

    /** P2P코드 (P2PCD) */
    private String p2pCd;

    public String getClsfCd() { return clsfCd; }
    public void setClsfCd(String clsfCd) { this.clsfCd = clsfCd; }

    public String getSubClsfCd() { return subClsfCd; }
    public void setSubClsfCd(String subClsfCd) { this.subClsfCd = subClsfCd; }

    public String getClsfAddr() { return clsfAddr; }
    public void setClsfAddr(String clsfAddr) { this.clsfAddr = clsfAddr; }

    public String getDeliveryBranchNm() { return deliveryBranchNm; }
    public void setDeliveryBranchNm(String deliveryBranchNm) { this.deliveryBranchNm = deliveryBranchNm; }

    public String getDeliverySmNm() { return deliverySmNm; }
    public void setDeliverySmNm(String deliverySmNm) { this.deliverySmNm = deliverySmNm; }

    public String getSmClassNm() { return smClassNm; }
    public void setSmClassNm(String smClassNm) { this.smClassNm = smClassNm; }

    public String getRspsDivision() { return rspsDivision; }
    public void setRspsDivision(String rspsDivision) { this.rspsDivision = rspsDivision; }

    public String getP2pCd() { return p2pCd; }
    public void setP2pCd(String p2pCd) { this.p2pCd = p2pCd; }
}
