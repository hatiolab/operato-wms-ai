package operato.wms.oms.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import operato.wms.oms.entity.ImportShipmentOrder;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.system.context.DomainContext;

/**
 * OMS 대량 임포트 검증 서비스 테스트.
 */
@ExtendWith(MockitoExtension.class)
class OmsImportServiceTest {

	@Mock
	private IQueryManager queryManager;

	private OmsImportService service;

	/**
	 * 도메인 컨텍스트와 테스트 대상 서비스를 초기화한다.
	 */
	@BeforeEach
	void setUp() {
		Domain.setCurrentDomain(new Domain(1L));
		this.service = new OmsImportService();
		ReflectionTestUtils.setField(this.service, "queryManager", this.queryManager);
	}

	/**
	 * 테스트 종료 후 스레드 로컬 도메인을 제거한다.
	 */
	@AfterEach
	void tearDown() {
		DomainContext.unsetAll();
	}

	/**
	 * 1,000행 검증 시 행마다 조회하지 않고 마스터 종류별 집합 조회만 수행하는지 확인한다.
	 */
	@Test
	@DisplayName("B2C 1,000행을 네 번의 집합 조회로 검증한다")
	@SuppressWarnings({ "rawtypes", "unchecked" })
	void validatesOneThousandRowsWithSetQueries() {
		this.mockExistingMasters();

		List<ImportShipmentOrder> rows = new ArrayList<>();
		for (int i = 1; i <= 1000; i++) {
			ImportShipmentOrder row = new ImportShipmentOrder();
			row.setRefOrderNo("BULK-" + i);
			row.setOrderDate("2026-07-30");
			row.setComCd("COM-01");
			row.setWhCd("WH-01");
			row.setSkuCd("SKU-01");
			row.setOrderQty(1.0);
			rows.add(row);
		}

		Map<String, Object> result = this.service.validateImportData(rows, "B2C_OUT");

		assertThat(result.get("total")).isEqualTo(1000);
		assertThat(result.get("valid")).isEqualTo(1000);
		assertThat(result.get("error")).isEqualTo(0);
		verify(this.queryManager, times(4)).selectListBySql(
				anyString(),
				anyMap(),
				any(Class.class),
				anyInt(),
				anyInt());
	}

	/**
	 * 기존 검증은 빈 참조번호를 허용하고 대량 등록 전용 엄격 검증만 차단하는지 확인한다.
	 */
	@Test
	@DisplayName("대량 등록 엄격 검증에서만 참조 주문번호를 필수로 검사한다")
	@SuppressWarnings("unchecked")
	void requiresReferenceOrderNumberOnlyInStrictMode() {
		this.mockExistingMasters();
		ImportShipmentOrder row = new ImportShipmentOrder();
		row.setComCd("COM-01");
		row.setWhCd("WH-01");
		row.setSkuCd("SKU-01");
		row.setOrderQty(1.0);

		Map<String, Object> legacyResult = this.service.validateImportData(
				List.of(row), "B2C_OUT");
		Map<String, Object> strictResult = this.service.validateImportData(
				List.of(row), "B2C_OUT", true);

		assertThat(legacyResult.get("error")).isEqualTo(0);
		assertThat(strictResult.get("error")).isEqualTo(1);
		List<Map<String, Object>> strictRows = (List<Map<String, Object>>) strictResult.get("rows");
		assertThat((List<String>) strictRows.get(0).get("error_messages"))
				.contains("참조 주문번호(ref_order_no)가 누락되었습니다");
	}

	/**
	 * 테스트용 화주사·창고·SKU 집합 조회 결과를 구성한다.
	 */
	@SuppressWarnings({ "rawtypes", "unchecked" })
	private void mockExistingMasters() {
		when(this.queryManager.selectListBySql(
				anyString(),
				anyMap(),
				any(Class.class),
				anyInt(),
				anyInt())).thenAnswer(invocation -> {
					String sql = invocation.getArgument(0);
					if (sql.contains(" FROM sku ")) {
						return List.of(Map.of(
								"com_cd", "COM-01",
								"sku_cd", "SKU-01",
								"sku_nm", "테스트 상품"));
					}
					if (sql.contains(" FROM warehouses ")) {
						return List.of("WH-01");
					}
					if (sql.contains(" FROM companies ")) {
						return List.of("COM-01");
					}
					return List.of();
				});
	}
}
