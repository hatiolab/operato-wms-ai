package operato.wms.vas.rest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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
 * VAS 실적 CRUD API 통합 테스트
 *
 * 기본적인 CRUD 작업 테스트
 *
 * @author HatioLab
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("VAS 실적 CRUD API 통합 테스트")
public class VasResultControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private String testVasResultId = "test-vas-result-id-001";

	/********************************************************************************************************
	 * 1. CRUD 기본 작업 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("1-1. VAS 실적 생성 - 성공")
	public void testCreateVasResult_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"vasOrderId": "test-vas-order-id-001",
					"resultType": "ASSEMBLY",
					"setSkuCd": "SET-001",
					"resultQty": 95.0,
					"defectQty": 5.0,
					"destLocCd": "B-01-01-01",
					"lotNo": "L20260320",
					"workerId": "worker01",
					"workDate": "2026-03-20",
					"remarks": "정상 작업 완료"
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/vas_results")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.vasOrderId").value("test-vas-order-id-001"))
				.andExpect(jsonPath("$.resultType").value("ASSEMBLY"))
				.andExpect(jsonPath("$.resultQty").value(95.0))
				.andExpect(jsonPath("$.defectQty").value(5.0));
	}

	@Test
	@DisplayName("1-2. VAS 실적 단건 조회 - 성공")
	public void testFindOne_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/vas_results/{id}", testVasResultId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(testVasResultId));
	}

	@Test
	@DisplayName("1-3. VAS 실적 존재 여부 확인 - 성공")
	public void testIsExist_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/vas_results/{id}/exist", testVasResultId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").value(true));
	}

	@Test
	@DisplayName("1-4. VAS 실적 수정 - 성공")
	public void testUpdateVasResult_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"id": "test-vas-result-id-001",
					"vasOrderId": "test-vas-order-id-001",
					"resultQty": 98.0,
					"defectQty": 2.0,
					"remarks": "수정된 실적"
				}
				""";

		// When & Then
		mockMvc.perform(put("/rest/vas_results/{id}", testVasResultId)
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.resultQty").value(98.0))
				.andExpect(jsonPath("$.defectQty").value(2.0));
	}

	@Test
	@DisplayName("1-5. VAS 실적 삭제 - 성공")
	public void testDeleteVasResult_Success() throws Exception {
		// When & Then
		mockMvc.perform(delete("/rest/vas_results/{id}", testVasResultId))
				.andDo(print())
				.andExpect(status().isOk());
	}

	/********************************************************************************************************
	 * 2. 페이지네이션 및 검색 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("2-1. VAS 실적 페이지네이션 조회 - 성공")
	public void testIndex_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/vas_results")
				.param("page", "1")
				.param("limit", "10")
				.param("sort", "work_date desc"))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items").isArray())
				.andExpect(jsonPath("$.page").value(1))
				.andExpect(jsonPath("$.limit").value(10));
	}

	@Test
	@DisplayName("2-2. VAS 실적 검색 (작업일 기준) - 성공")
	public void testSearchByWorkDate_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/vas_results")
				.param("page", "1")
				.param("limit", "10")
				.param("query", "[{\"name\":\"workDate\",\"operator\":\"gte\",\"value\":\"2026-03-01\"},{\"name\":\"workDate\",\"operator\":\"lte\",\"value\":\"2026-03-31\"}]"))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items").isArray());
	}

	@Test
	@DisplayName("2-3. VAS 실적 검색 (작업자 기준) - 성공")
	public void testSearchByWorker_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/vas_results")
				.param("page", "1")
				.param("limit", "10")
				.param("query", "[{\"name\":\"workerId\",\"operator\":\"eq\",\"value\":\"worker01\"}]"))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items").isArray());
	}

	/********************************************************************************************************
	 * 3. 다중 데이터 처리 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("3-1. VAS 실적 다중 생성/수정/삭제 - 성공")
	public void testMultipleUpdate_Success() throws Exception {
		// Given
		String requestBody = """
				[
					{
						"_cud_flag_": "c",
						"vasOrderId": "test-vas-order-id-001",
						"resultType": "ASSEMBLY",
						"setSkuCd": "SET-001",
						"resultQty": 50.0,
						"defectQty": 0.0,
						"workDate": "2026-03-20"
					},
					{
						"_cud_flag_": "u",
						"id": "test-vas-result-id-001",
						"resultQty": 100.0
					},
					{
						"_cud_flag_": "d",
						"id": "test-vas-result-id-002"
					}
				]
				""";

		// When & Then
		mockMvc.perform(post("/rest/vas_results/update_multiple")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").value(true));
	}

	/********************************************************************************************************
	 * 4. 예외 처리 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("4-1. VAS 실적 생성 - 필수 필드 누락 (400 Bad Request)")
	public void testCreateVasResult_MissingRequiredField() throws Exception {
		// Given - resultQty 누락
		String requestBody = """
				{
					"vasOrderId": "test-vas-order-id-001",
					"resultType": "ASSEMBLY",
					"setSkuCd": "SET-001",
					"workDate": "2026-03-20"
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/vas_results")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("4-2. VAS 실적 조회 - 존재하지 않는 ID (404 Not Found)")
	public void testFindOne_NotFound() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/vas_results/{id}", "non-existent-id"))
				.andDo(print())
				.andExpect(status().isNotFound());
	}
}
