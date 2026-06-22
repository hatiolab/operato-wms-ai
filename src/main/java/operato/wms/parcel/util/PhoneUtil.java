package operato.wms.parcel.util;

/**
 * CJ대한통운 API 전화번호 변환 유틸리티
 *
 * WMS에 저장된 전화번호를 CJ API가 요구하는 3-segment 형식으로 분리한다.
 * 참조: docs/interface/courier/cj/booking.md
 */
public class PhoneUtil {

    private PhoneUtil() {}

    /**
     * 전화번호를 3개 세그먼트로 분리
     *
     * @param phone 전화번호 (010-1234-5678, 01012345678 등)
     * @return [지역번호/식별번호, 중간번호, 끝번호] — 파싱 실패 시 ["", "", ""]
     */
    public static String[] splitPhone(String phone) {
        if (phone == null || phone.isBlank()) return new String[]{"", "", ""};
        String digits = phone.replaceAll("[^0-9]", "");

        // 02 지역번호 9자리 (02-XXX-XXXX)
        if (digits.startsWith("02") && digits.length() == 9) {
            return new String[]{digits.substring(0, 2), digits.substring(2, 5), digits.substring(5)};
        }
        // 010/011 등 11자리 (0XX-XXXX-XXXX)
        if (digits.length() == 11) {
            return new String[]{digits.substring(0, 3), digits.substring(3, 7), digits.substring(7)};
        }
        // 02 지역번호 10자리 (02-XXXX-XXXX)
        if (digits.startsWith("02") && digits.length() == 10) {
            return new String[]{digits.substring(0, 2), digits.substring(2, 6), digits.substring(6)};
        }
        // 지역번호 10자리 (031-XXX-XXXX 등)
        if (digits.length() == 10) {
            return new String[]{digits.substring(0, 3), digits.substring(3, 6), digits.substring(6)};
        }
        return new String[]{digits, "", ""};
    }
}
