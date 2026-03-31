package operato.wms.fulfillment.rest;

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
 * 피킹 작업 CRUD API 통합 테스트
 *
 * 피킹 작업의 기본 CRUD 작업 및 항목 관리 테스트
 *
 * @author HatioLab
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Transactional
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("피킹 작업 CRUD API 통합 테스트")
public class PickingTaskControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	// TODO: domain_id=12에 picking_tasks 데이터 없음 - 테스트 실패 예상
	private String testPickingTaskId = "test-picking-task-id-001";

	/********************************************************************************************************
	 * 1. CRUD 기본 작업 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("1-1. 피킹 작업 생성 - 성공")
	public void testCreatePickingTask_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"pick_task_no": "PT-20260331-0001",
					"wave_no": "WV-20260330-001",
					"pick_type": "SINGLE",
					"pick_method": "DPS",
					"status": "CREATED",
					"priority": "NORMAL"
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/picking_tasks")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.pick_task_no").value("PT-20260331-0001"))
				.andExpect(jsonPath("$.status").value("CREATED"));
	}

	@Test
	@DisplayName("1-2. 피킹 작업 단건 조회 - 성공")
	public void testFindOne_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/picking_tasks/{id}", testPickingTaskId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(testPickingTaskId));
	}

	@Test
	@DisplayName("1-3. 피킹 작업 존재 여부 확인 - 성공")
	public void testIsExist_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/picking_tasks/{id}/exist", testPickingTaskId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").value(true));
	}

	@Test
	@DisplayName("1-4. 피킹 작업 수정 - 성공")
	public void testUpdatePickingTask_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"id": "test-picking-task-id-001",
					"priority": "HIGH",
					"remarks": "긴급 처리 요청"
				}
				""";

		// When & Then
		mockMvc.perform(put("/rest/picking_tasks/{id}", testPickingTaskId)
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.priority").value("HIGH"));
	}

	@Test
	@DisplayName("1-5. 피킹 작업 삭제 - 성공")
	public void testDeletePickingTask_Success() throws Exception {
		// When & Then
		mockMvc.perform(delete("/rest/picking_tasks/{id}", testPickingTaskId))
				.andDo(print())
				.andExpect(status().isOk());
	}

	/********************************************************************************************************
	 * 2. 페이지네이션 및 검색 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("2-1. 피킹 작업 페이지네이션 조회 - 성공")
	public void testIndex_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/picking_tasks")
				.param("page", "1")
				.param("limit", "20")
				.param("sort", "created_at desc"))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items").isArray())
				.andExpect(jsonPath("$.page").value(1))
				.andExpect(jsonPath("$.limit").value(20));
	}

	@Test
	@DisplayName("2-2. 피킹 작업 검색 (쿼리 조건) - 성공")
	public void testSearchWithQuery_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/picking_tasks")
				.param("page", "1")
				.param("limit", "20")
				.param("query", "[{\"name\":\"status\",\"operator\":\"eq\",\"value\":\"CREATED\"}]"))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items").isArray());
	}

	/********************************************************************************************************
	 * 3. 다중 데이터 처리 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("3-1. 피킹 작업 다중 생성/수정/삭제 - 성공")
	public void testMultipleUpdate_Success() throws Exception {
		// Given
		String requestBody = """
				[
					{
						"_cud_flag_": "c",
						"pick_task_no": "PT-20260331-0002",
						"pick_type": "BATCH",
						"status": "CREATED"
					},
					{
						"_cud_flag_": "u",
						"id": "test-picking-task-id-001",
						"priority": "HIGH"
					}
				]
				""";

		// When & Then
		mockMvc.perform(post("/rest/picking_tasks/update_multiple")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").value(true));
	}

	/********************************************************************************************************
	 * 4. 상세 정보 관리 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("4-1. 피킹 작업 상세 포함 조회 - 성공")
	public void testFindDetails_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/picking_tasks/{id}/include_details", testPickingTaskId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(testPickingTaskId));
	}

	@Test
	@DisplayName("4-2. 피킹 작업 항목 목록 조회 - 성공")
	public void testGetItems_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/picking_tasks/{id}/items", testPickingTaskId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	@Test
	@DisplayName("4-3. 피킹 작업 항목 다중 생성/수정/삭제 - 성공")
	public void testUpdateItems_Success() throws Exception {
		// Given
		String requestBody = """
				[
					{
						"_cud_flag_": "c",
						"line_no": 1,
						"sku_cd": "SKU-001",
						"sku_nm": "상품A",
						"pick_qty": 5.0
					},
					{
						"_cud_flag_": "c",
						"line_no": 2,
						"sku_cd": "SKU-002",
						"sku_nm": "상품B",
						"pick_qty": 3.0
					}
				]
				""";

		// When & Then
		mockMvc.perform(post("/rest/picking_tasks/{id}/update_multiple", testPickingTaskId)
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	/********************************************************************************************************
	 * 5. 엣지 케이스 및 예외 처리 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("5-1. 존재하지 않는 피킹 작업 조회 - 실패")
	public void testFindNonExistentTask_Fail() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/picking_tasks/{id}", "non-existent-id"))
				.andDo(print())
				.andExpect(status().is4xxClientError());
	}

	@Test
	@DisplayName("5-2. 필수 필드 누락 생성 - 실패")
	public void testCreateWithMissingFields_Fail() throws Exception {
		// Given
		String requestBody = """
				{
					"pick_task_no": "PT-20260331-9999"
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/picking_tasks")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().is4xxClientError());
	}
}
