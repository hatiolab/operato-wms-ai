package operato.wms.parcel.service.cj;

/**
 * CJ대한통운 주소정제 실패 예외
 *
 * RESULT_CD가 'S'가 아닐 때 발생한다.
 * isUndeliverable(), isDelayPossible()로 호출부에서 케이스를 분기할 수 있다.
 *
 * 주요 에러 코드:
 *   -20009 : 배송 불가 지역 → 주문 홀드 처리
 *   -20010 : 배송 지연 가능 지역 → 경고만 표시
 *
 * 참조: docs/interface/courier/cj/address-refinement.md
 */
public class CjAddressRefinementException extends RuntimeException {

    private final String resultCd;
    private final String address;

    public CjAddressRefinementException(String resultCd, String detail, String address) {
        super("CJ 주소정제 실패: RESULT_CD=" + resultCd + ", address=" + address + ", detail=" + detail);
        this.resultCd = resultCd;
        this.address = address;
    }

    /** 배송 불가 지역 (-20009) */
    public boolean isUndeliverable() {
        return "-20009".equals(resultCd);
    }

    /** 배송 지연 가능 지역 (-20010) */
    public boolean isDelayPossible() {
        return "-20010".equals(resultCd);
    }

    public String getResultCd() { return resultCd; }
    public String getAddress() { return address; }
}
