package operato.wms.vas.rest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

import org.junit.jupiter.api.Disabled;
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
 * VAS 주문 CRUD API 통합 테스트
 *
 * 기본적인 CRUD 작업 및 상세 조회 테스트
 *
 * @author HatioLab
 */
@Disabled("Spring 컨텍스트 초기화 문제로 임시 비활성화 - 향후 테스트 환경 개선 필요")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("VAS 주문 CRUD API 통합 테스트")
public class VasOrderControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private String testVasOrderId = "test-vas-order-id-001";

	/********************************************************************************************************
	 * 1. CRUD 기본 작업 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("1-1. VAS 주문 생성 - 성공")
	public void testCreateVasOrder_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"comCd": "TEST",
					"whCd": "WH01",
					"bomNo": "BOM-20260320-001",
					"vasType": "SET_ASSEMBLY",
					"orderQty": 100,
					"workDate": "2026-03-21",
					"priority": "HIGH",
					"status": "PLAN",
					"remarks": "테스트 VAS 주문"
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/vas_orders")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.vasNo").exists())
				.andExpect(jsonPath("$.comCd").value("TEST"))
				.andExpect(jsonPath("$.vasType").value("SET_ASSEMBLY"))
				.andExpect(jsonPath("$.orderQty").value(100));
	}

	@Test
	@DisplayName("1-2. VAS 주문 단건 조회 - 성공")
	public void testFindOne_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/vas_orders/{id}", testVasOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(testVasOrderId));
	}

	@Test
	@DisplayName("1-3. VAS 주문 존재 여부 확인 - 성공")
	public void testIsExist_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/vas_orders/{id}/exist", testVasOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").value(true));
	}

	@Test
	@DisplayName("1-4. VAS 주문 수정 - 성공")
	public void testUpdateVasOrder_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"id": "test-vas-order-id-001",
					"comCd": "TEST",
					"whCd": "WH01",
					"orderQty": 150,
					"priority": "URGENT",
					"remarks": "수정된 VAS 주문"
				}
				""";

		// When & Then
		mockMvc.perform(put("/rest/vas_orders/{id}", testVasOrderId)
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.orderQty").value(150))
				.andExpect(jsonPath("$.priority").value("URGENT"));
	}

	@Test
	@DisplayName("1-5. VAS 주문 삭제 - 성공")
	public void testDeleteVasOrder_Success() throws Exception {
		// When & Then
		mockMvc.perform(delete("/rest/vas_orders/{id}", testVasOrderId))
				.andDo(print())
				.andExpect(status().isOk());
	}

	/********************************************************************************************************
	 * 2. 페이지네이션 및 검색 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("2-1. VAS 주문 페이지네이션 조회 - 성공")
	public void testIndex_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/vas_orders")
				.param("page", "1")
				.param("limit", "10")
				.param("sort", "created_at desc"))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items").isArray())
				.andExpect(jsonPath("$.page").value(1))
				.andExpect(jsonPath("$.limit").value(10));
	}

	@Test
	@DisplayName("2-2. VAS 주문 검색 (쿼리 조건) - 성공")
	public void testSearchWithQuery_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/vas_orders")
				.param("page", "1")
				.param("limit", "10")
				.param("query", "[{\"name\":\"comCd\",\"operator\":\"eq\",\"value\":\"TEST\"}]"))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items").isArray());
	}

	/********************************************************************************************************
	 * 3. 다중 데이터 처리 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("3-1. VAS 주문 다중 생성/수정/삭제 - 성공")
	public void testMultipleUpdate_Success() throws Exception {
		// Given
		String requestBody = """
				[
					{
						"_cud_flag_": "c",
						"comCd": "TEST",
						"whCd": "WH01",
						"vasType": "SET_ASSEMBLY",
						"orderQty": 100
					},
					{
						"_cud_flag_": "u",
						"id": "test-vas-order-id-001",
						"orderQty": 200
					},
					{
						"_cud_flag_": "d",
						"id": "test-vas-order-id-002"
					}
				]
				""";

		// When & Then
		mockMvc.perform(post("/rest/vas_orders/update_multiple")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").value(true));
	}

	/********************************************************************************************************
	 * 4. 상세 정보 조회 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("4-1. VAS 주문 상세 포함 조회 - 성공")
	public void testFindDetails_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/vas_orders/{id}/include_details", testVasOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.master").exists())
				.andExpect(jsonPath("$.details").exists());
	}

	@Test
	@DisplayName("4-2. VAS 주문 항목 목록 조회 - 성공")
	public void testFindVasOrderItems_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/vas_orders/{id}/items", testVasOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	@Test
	@DisplayName("4-3. VAS 주문 항목 다중 수정 - 성공")
	public void testUpdateVasOrderItems_Success() throws Exception {
		// Given
		String requestBody = """
				[
					{
						"_cud_flag_": "c",
						"skuCd": "MAT-001",
						"materialType": "MAIN",
						"reqQty": 100
					},
					{
						"_cud_flag_": "u",
						"id": "test-item-id-001",
						"reqQty": 150
					}
				]
				""";

		// When & Then
		mockMvc.perform(post("/rest/vas_orders/{id}/items/update_multiple", testVasOrderId)
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	@Test
	@DisplayName("4-4. VAS 주문 실적 목록 조회 - 성공")
	public void testFindVasOrderResults_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/vas_orders/{id}/results", testVasOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	@Test
	@DisplayName("4-5. VAS 주문 실적 다중 수정 - 성공")
	public void testUpdateVasOrderResults_Success() throws Exception {
		// Given
		String requestBody = """
				[
					{
						"_cud_flag_": "c",
						"resultType": "ASSEMBLY",
						"setSkuCd": "SET-001",
						"resultQty": 95.0,
						"defectQty": 5.0
					}
				]
				""";

		// When & Then
		mockMvc.perform(post("/rest/vas_orders/{id}/results/update_multiple", testVasOrderId)
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}
}
