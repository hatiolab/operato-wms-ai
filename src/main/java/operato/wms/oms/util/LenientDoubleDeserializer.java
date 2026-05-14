package operato.wms.oms.util;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;

import java.io.IOException;

/**
 * 관대한 Double 역직렬화기
 *
 * 엑셀 임포트 시 숫자 필드에 문자열이 들어오는 경우
 * (예: "ㅍㅌㅋㅌ", "abc" 등) Jackson이 500 에러를 내는 것을 방지하고,
 * 파싱 불가 값은 null로 처리하여 이후 검증 단계에서 오류로 표시되도록 한다.
 */
public class LenientDoubleDeserializer extends StdDeserializer<Double> {

	private static final long serialVersionUID = 1L;

	public LenientDoubleDeserializer() {
		super(Double.class);
	}

	@Override
	public Double deserialize(JsonParser p, DeserializationContext ctx) throws IOException {
		String text = p.getText();
		if (text == null || text.trim().isEmpty()) {
			return null;
		}
		try {
			return Double.parseDouble(text.trim());
		} catch (NumberFormatException e) {
			// 숫자로 파싱 불가한 값 → null 반환 (검증 단계에서 오류로 표시됨)
			return null;
		}
	}
}
