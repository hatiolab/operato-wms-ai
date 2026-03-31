package operato.wms.oms.rest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * 출하 주문 CRUD API 통합 테스트
 *
 * 출하 주문의 기본 CRUD 작업 및 배송 정보, 주문 항목 관리 테스트
 *
 * @author HatioLab
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Transactional
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("출하 주문 CRUD API 통합 테스트")
public class ShipmentOrderControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	// 실제 DB ID (domain_id=12, CONFIRMED 상태)
	private String testShipmentOrderId = "6e7d17b9-e769-43a1-9ac1-aac197df69d5"; // SO-260330-00033

	/********************************************************************************************************
	 * 1. CRUD 기본 작업 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("1-1. 출하 주문 생성 - 성공")
	public void testCreateShipmentOrder_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"shipment_no": "SO-20260330-0001",
					"ref_order_no": "DO-20260330-0001",
					"com_cd": "TEST",
					"wh_cd": "WH01",
					"cust_cd": "CUST001",
					"cust_nm": "테스트 고객",
					"order_date": "2026-03-30",
					"ship_by_date": "2026-03-31",
					"biz_type": "B2C_OUT",
					"ship_type": "NORMAL",
					"pick_method": "WCS",
					"dlv_type": "PARCEL",
					"priority_cd": "NORMAL",
					"status": "REGISTERED",
					"total_item": 3,
					"total_order": 10
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/shipment_orders")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.shipment_no").value("SO-20260330-0001"))
				.andExpect(jsonPath("$.ref_order_no").value("DO-20260330-0001"))
				.andExpect(jsonPath("$.status").value("REGISTERED"));
	}

	@Test
	@DisplayName("1-2. 출하 주문 단건 조회 - 성공")
	public void testFindOne_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/shipment_orders/{id}", testShipmentOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(testShipmentOrderId));
	}

	@Test
	@DisplayName("1-3. 출하 주문 존재 여부 확인 - 성공")
	public void testIsExist_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/shipment_orders/{id}/exist", testShipmentOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").value(true));
	}

	@Test
	@DisplayName("1-4. 출하 주문 수정 - 성공")
	public void testUpdateShipmentOrder_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"id": "test-shipment-order-id-001",
					"priority_cd": "URGENT",
					"remarks": "긴급 배송 요청"
				}
				""";

		// When & Then
		mockMvc.perform(put("/rest/shipment_orders/{id}", testShipmentOrderId)
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.priority_cd").value("URGENT"));
	}

	@Test
	@DisplayName("1-5. 출하 주문 삭제 - 성공")
	public void testDeleteShipmentOrder_Success() throws Exception {
		// When & Then
		mockMvc.perform(delete("/rest/shipment_orders/{id}", testShipmentOrderId))
				.andDo(print())
				.andExpect(status().isOk());
	}

	/********************************************************************************************************
	 * 2. 페이지네이션 및 검색 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("2-1. 출하 주문 페이지네이션 조회 - 성공")
	public void testIndex_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/shipment_orders")
				.param("page", "1")
				.param("limit", "20")
				.param("sort", "order_date desc"))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items").isArray())
				.andExpect(jsonPath("$.page").value(1))
				.andExpect(jsonPath("$.limit").value(20));
	}

	@Test
	@DisplayName("2-2. 출하 주문 검색 (쿼리 조건) - 성공")
	public void testSearchWithQuery_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/shipment_orders")
				.param("page", "1")
				.param("limit", "20")
				.param("query", "[{\"name\":\"status\",\"operator\":\"eq\",\"value\":\"REGISTERED\"}]"))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items").isArray());
	}

	@Test
	@DisplayName("2-3. 출하 주문 검색 (복합 조건) - 성공")
	public void testSearchWithMultipleQuery_Success() throws Exception {
		// Given
		String query = """
				[
					{"name":"status","operator":"in","value":["REGISTERED","CONFIRMED"]},
					{"name":"order_date","operator":"gte","value":"2026-03-01"}
				]
				""";

		// When & Then
		mockMvc.perform(get("/rest/shipment_orders")
				.param("page", "1")
				.param("limit", "20")
				.param("query", query))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items").isArray());
	}

	/********************************************************************************************************
	 * 3. 다중 데이터 처리 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("3-1. 출하 주문 다중 생성/수정/삭제 - 성공")
	public void testMultipleUpdate_Success() throws Exception {
		// Given
		String requestBody = """
				[
					{
						"_cud_flag_": "c",
						"shipment_no": "SO-20260330-0002",
						"ref_order_no": "DO-20260330-0002",
						"com_cd": "TEST",
						"wh_cd": "WH01",
						"status": "REGISTERED"
					},
					{
						"_cud_flag_": "u",
						"id": "6e7d17b9-e769-43a1-9ac1-aac197df69d5",
						"priority_cd": "HIGH"
					},
					{
						"_cud_flag_": "d",
						"id": "103f5faa-a9b2-4e4a-9bf5-45fc5c3c691a"
					}
				]
				""";

		// When & Then
		mockMvc.perform(post("/rest/shipment_orders/update_multiple")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").value(true));
	}

	/********************************************************************************************************
	 * 4. 배송 정보 관리 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("4-1. 주문 배송 정보 조회 - 성공")
	public void testGetDelivery_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/shipment_orders/{id}/delivery", testShipmentOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.shipment_order_id").value(testShipmentOrderId));
	}

	@Test
	@DisplayName("4-2. 주문 배송 정보 생성/수정 - 성공")
	public void testCreateOrUpdateDelivery_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"receiver_nm": "김철수",
					"receiver_phone": "010-1234-5678",
					"receiver_post": "12345",
					"receiver_addr1": "서울시 강남구",
					"receiver_addr2": "테헤란로 123",
					"dlv_memo": "문 앞에 놔주세요"
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/shipment_orders/{id}/delivery", testShipmentOrderId)
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.receiver_nm").value("김철수"))
				.andExpect(jsonPath("$.receiver_phone").value("010-1234-5678"));
	}

	/********************************************************************************************************
	 * 5. 주문 항목 관리 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("5-1. 주문 항목 목록 조회 - 성공")
	public void testGetItems_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/shipment_orders/{id}/items", testShipmentOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	@Test
	@DisplayName("5-2. 주문 항목 다중 생성/수정/삭제 - 성공")
	public void testUpdateItems_Success() throws Exception {
		// Given
		String requestBody = """
				[
					{
						"_cud_flag_": "c",
						"line_no": 1,
						"sku_cd": "SKU-001",
						"sku_nm": "상품A",
						"order_qty": 5.0
					},
					{
						"_cud_flag_": "c",
						"line_no": 2,
						"sku_cd": "SKU-002",
						"sku_nm": "상품B",
						"order_qty": 3.0
					}
				]
				""";

		// When & Then
		mockMvc.perform(post("/rest/shipment_orders/{id}/items/update_multiple", testShipmentOrderId)
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	/********************************************************************************************************
	 * 6. 엑셀 임포트 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("6-1. B2C 주문 엑셀 검증 - 성공")
	public void testValidateB2cExcel_Success() throws Exception {
		// Given
		String requestBody = """
				[
					{
						"ref_order_no": "DO-20260330-0001",
						"cust_cd": "CUST001",
						"cust_nm": "테스트 고객",
						"order_date": "2026-03-30",
						"line_no": 1,
						"sku_cd": "SKU-001",
						"order_qty": 5.0
					}
				]
				""";

		// When & Then
		mockMvc.perform(post("/rest/shipment_orders/b2c/validate")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	@Test
	@DisplayName("6-2. B2C 주문 엑셀 임포트 확정 - 성공")
	public void testImportB2cExcel_Success() throws Exception {
		// Given
		String requestBody = """
				[
					{
						"ref_order_no": "DO-20260330-0001",
						"cust_cd": "CUST001",
						"cust_nm": "테스트 고객",
						"order_date": "2026-03-30",
						"line_no": 1,
						"sku_cd": "SKU-001",
						"order_qty": 5.0
					}
				]
				""";

		// When & Then
		mockMvc.perform(post("/rest/shipment_orders/b2c/import")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	/********************************************************************************************************
	 * 7. 엣지 케이스 및 예외 처리 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("7-1. 존재하지 않는 주문 조회 - 실패")
	public void testFindNonExistentOrder_Fail() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/shipment_orders/{id}", "non-existent-id"))
				.andDo(print())
				.andExpect(status().is4xxClientError());
	}

	@Test
	@DisplayName("7-2. 필수 필드 누락 생성 - 실패")
	public void testCreateWithMissingFields_Fail() throws Exception {
		// Given
		String requestBody = """
				{
					"shipment_no": "SO-20260330-9999"
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/shipment_orders")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().is4xxClientError());
	}

	@Test
	@DisplayName("7-3. 중복 주문 번호 생성 - 실패")
	public void testCreateDuplicateOrderNo_Fail() throws Exception {
		// Given
		String requestBody = """
				{
					"shipment_no": "SO-20260330-0001",
					"ref_order_no": "DO-20260330-0001",
					"com_cd": "TEST",
					"wh_cd": "WH01",
					"status": "REGISTERED"
				}
				""";

		// When & Then (첫 번째 생성은 성공)
		mockMvc.perform(post("/rest/shipment_orders")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andExpect(status().isCreated());

		// When & Then (중복 생성은 실패)
		mockMvc.perform(post("/rest/shipment_orders")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().is4xxClientError());
	}

	@Test
	@DisplayName("7-4. 잘못된 쿼리 파라미터 - 실패")
	public void testSearchWithInvalidQuery_Fail() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/shipment_orders")
				.param("query", "invalid-json"))
				.andDo(print())
				.andExpect(status().is4xxClientError());
	}
}
