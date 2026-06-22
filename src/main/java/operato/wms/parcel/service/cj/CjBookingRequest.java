package operato.wms.parcel.service.cj;

import java.util.List;

/**
 * CJ대한통운 예약 접수 요청 VO
 *
 * CjBookingService.book() 호출 시 전달하는 파라미터.
 * 발송인/수신인 정보, 박스 정보, 상품 목록을 포함한다.
 * 참조: docs/interface/courier/cj/booking.md
 */
public class CjBookingRequest {

    /** 운임구분코드: 01=선불, 02=착불, 03=신용 */
    private String frtDvCd;

    /** 박스타입코드: 01극소/02소/03중/04대1/05이형/06취급제한/07대2 */
    private String boxTypeCd;

    /** 박스 수량 */
    private int boxQty;

    /** 물품가액 */
    private Integer articleAmt;

    /** 배송 요청사항 (REMARK_1) */
    private String remark1;

    /** 운송장 번호 (사전 발급 시 설정, null이면 미출력) */
    private String invcNo;

    // ── 보내는 분 ──

    /** 보내는분 명 */
    private String senderName;

    /** 보내는분 전화번호 */
    private String senderTel;

    /** 보내는분 휴대폰 */
    private String senderMobile;

    /** 보내는분 우편번호 */
    private String senderZip;

    /** 보내는분 주소 */
    private String senderAddr;

    /** 보내는분 상세주소 */
    private String senderDetailAddr;

    // ── 받는 분 ──

    /** 받는분 명 */
    private String receiverName;

    /** 받는분 전화번호 */
    private String receiverTel;

    /** 받는분 휴대폰 */
    private String receiverMobile;

    /** 받는분 우편번호 */
    private String receiverZip;

    /** 받는분 주소 */
    private String receiverAddr;

    /** 받는분 상세주소 */
    private String receiverDetailAddr;

    /** 상품 목록 (null 또는 빈 리스트 허용) */
    private List<Goods> goods;

    /**
     * 상품 정보 내부 클래스
     */
    public static class Goods {

        /** 상품코드 */
        private String goodsCd;

        /** 상품명 (필수) */
        private String goodsNm;

        /** 상품수량 */
        private Integer goodsQty;

        /** 단품코드 — 합포 없으면 "1" */
        private String unitCd;

        /** 상품가액 */
        private String goodsAmt;

        public String getGoodsCd() { return goodsCd; }
        public void setGoodsCd(String goodsCd) { this.goodsCd = goodsCd; }

        public String getGoodsNm() { return goodsNm; }
        public void setGoodsNm(String goodsNm) { this.goodsNm = goodsNm; }

        public Integer getGoodsQty() { return goodsQty; }
        public void setGoodsQty(Integer goodsQty) { this.goodsQty = goodsQty; }

        public String getUnitCd() { return unitCd; }
        public void setUnitCd(String unitCd) { this.unitCd = unitCd; }

        public String getGoodsAmt() { return goodsAmt; }
        public void setGoodsAmt(String goodsAmt) { this.goodsAmt = goodsAmt; }
    }

    public String getFrtDvCd() { return frtDvCd; }
    public void setFrtDvCd(String frtDvCd) { this.frtDvCd = frtDvCd; }

    public String getBoxTypeCd() { return boxTypeCd; }
    public void setBoxTypeCd(String boxTypeCd) { this.boxTypeCd = boxTypeCd; }

    public int getBoxQty() { return boxQty; }
    public void setBoxQty(int boxQty) { this.boxQty = boxQty; }

    public Integer getArticleAmt() { return articleAmt; }
    public void setArticleAmt(Integer articleAmt) { this.articleAmt = articleAmt; }

    public String getRemark1() { return remark1; }
    public void setRemark1(String remark1) { this.remark1 = remark1; }

    public String getInvcNo() { return invcNo; }
    public void setInvcNo(String invcNo) { this.invcNo = invcNo; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public String getSenderTel() { return senderTel; }
    public void setSenderTel(String senderTel) { this.senderTel = senderTel; }

    public String getSenderMobile() { return senderMobile; }
    public void setSenderMobile(String senderMobile) { this.senderMobile = senderMobile; }

    public String getSenderZip() { return senderZip; }
    public void setSenderZip(String senderZip) { this.senderZip = senderZip; }

    public String getSenderAddr() { return senderAddr; }
    public void setSenderAddr(String senderAddr) { this.senderAddr = senderAddr; }

    public String getSenderDetailAddr() { return senderDetailAddr; }
    public void setSenderDetailAddr(String senderDetailAddr) { this.senderDetailAddr = senderDetailAddr; }

    public String getReceiverName() { return receiverName; }
    public void setReceiverName(String receiverName) { this.receiverName = receiverName; }

    public String getReceiverTel() { return receiverTel; }
    public void setReceiverTel(String receiverTel) { this.receiverTel = receiverTel; }

    public String getReceiverMobile() { return receiverMobile; }
    public void setReceiverMobile(String receiverMobile) { this.receiverMobile = receiverMobile; }

    public String getReceiverZip() { return receiverZip; }
    public void setReceiverZip(String receiverZip) { this.receiverZip = receiverZip; }

    public String getReceiverAddr() { return receiverAddr; }
    public void setReceiverAddr(String receiverAddr) { this.receiverAddr = receiverAddr; }

    public String getReceiverDetailAddr() { return receiverDetailAddr; }
    public void setReceiverDetailAddr(String receiverDetailAddr) { this.receiverDetailAddr = receiverDetailAddr; }

    public List<Goods> getGoods() { return goods; }
    public void setGoods(List<Goods> goods) { this.goods = goods; }
}
