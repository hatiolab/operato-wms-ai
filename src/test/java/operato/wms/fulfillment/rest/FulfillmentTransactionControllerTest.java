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
 * 풀필먼트 트랜잭션 API 통합 테스트
 *
 * 피킹/포장/출하 트랜잭션 API 테스트
 *
 * @author HatioLab
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Transactional
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("풀필먼트 트랜잭션 API 통합 테스트")
public class FulfillmentTransactionControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	// TODO: domain_id=12에 fulfillment 데이터 없음 - 테스트 실패 예상
	private String testPickingTaskId = "test-picking-task-id-001";
	private String testPackingOrderId = "test-packing-order-id-001";
	private String testPackingBoxId = "test-packing-box-id-001";

	/********************************************************************************************************
	 * 1. 피킹 트랜잭션 API 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("1-1. 피킹 지시 생성 - 성공")
	public void testCreatePickingTasks_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"wave_no": "WV-20260330-001",
					"pick_type": "SINGLE",
					"pick_method": "DPS"
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/ful_trx/picking_tasks/create")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("1-2. 피킹 시작 - 성공")
	public void testStartPickingTask_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/ful_trx/picking_tasks/{id}/start", testPickingTaskId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("1-3. 아이템 피킹 확인 - 성공")
	public void testPickItem_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"picked_qty": 5.0,
					"loc_cd": "A-01-01-01",
					"lot_no": "L20260320"
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/ful_trx/picking_tasks/{id}/items/{item_id}/pick",
				testPickingTaskId, "test-item-id-001")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("1-4. 피킹 부족 처리 - 성공")
	public void testShortItem_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"short_qty": 2.0,
					"reason": "재고 부족"
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/ful_trx/picking_tasks/{id}/items/{item_id}/short",
				testPickingTaskId, "test-item-id-001")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("1-5. 피킹 완료 - 성공")
	public void testCompletePickingTask_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/ful_trx/picking_tasks/{id}/complete", testPickingTaskId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("1-6. 피킹 취소 - 성공")
	public void testCancelPickingTask_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/ful_trx/picking_tasks/{id}/cancel", testPickingTaskId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("1-7. 피킹 시작+완료 일괄 - 성공")
	public void testStartAndCompletePickingTask_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/ful_trx/picking_tasks/{id}/start_and_complete", testPickingTaskId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("1-8. 피킹 항목 목록 조회 - 성공")
	public void testGetPickingTaskItems_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/ful_trx/picking_tasks/{id}/items", testPickingTaskId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	@Test
	@DisplayName("1-9. 작업자별 할당 목록 조회 - 성공")
	public void testGetWorkerTasks_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/ful_trx/picking_tasks/worker/{worker_cd}", "WORKER01"))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	/********************************************************************************************************
	 * 2. 검수/포장 트랜잭션 API 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("2-1. 포장 지시 생성 (개별) - 성공")
	public void testCreatePackingOrder_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"pick_task_id": "test-picking-task-id-001"
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_orders/create")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("2-2. 포장 지시 일괄 생성 (배치) - 성공")
	public void testCreatePackingOrdersFromBatch_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"pick_task_id": "test-picking-task-id-001"
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_orders/create_from_batch")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("2-3. 포장 시작 - 성공")
	public void testStartPackingOrder_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_orders/{id}/start", testPackingOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("2-4. 아이템 검수 - 성공")
	public void testInspectItem_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"inspected_qty": 5.0,
					"pass": true
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_orders/{id}/items/{item_id}/inspect",
				testPackingOrderId, "test-item-id-001")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("2-5. 아이템 포장 (박스 투입) - 성공")
	public void testPackItem_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"box_id": "test-packing-box-id-001",
					"packed_qty": 5.0
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_orders/{id}/items/{item_id}/pack",
				testPackingOrderId, "test-item-id-001")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("2-6. 박스 생성 - 성공")
	public void testCreateBox_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_orders/{id}/boxes/create", testPackingOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.box_id").exists());
	}

	@Test
	@DisplayName("2-7. 박스 닫기 - 성공")
	public void testCloseBox_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_orders/{id}/boxes/{box_id}/close",
				testPackingOrderId, testPackingBoxId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("2-8. 포장 완료 - 성공")
	public void testCompletePackingOrder_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_orders/{id}/complete", testPackingOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("2-9. 포장 취소 - 성공")
	public void testCancelPackingOrder_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_orders/{id}/cancel", testPackingOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("2-10. 포장 항목 목록 조회 - 성공")
	public void testGetPackingOrderItems_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/ful_trx/packing_orders/{id}/items", testPackingOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	@Test
	@DisplayName("2-11. 포장 박스 목록 조회 - 성공")
	public void testGetPackingBoxes_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/ful_trx/packing_orders/{id}/boxes", testPackingOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	/********************************************************************************************************
	 * 3. 출하 트랜잭션 API 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("3-1. 운송장 라벨 출력 - 성공")
	public void testPrintLabel_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_orders/{id}/print_label", testPackingOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("3-2. 적하 목록 전송 - 성공")
	public void testCreateManifest_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_orders/{id}/manifest", testPackingOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("3-3. 출하 확정 - 성공")
	public void testConfirmShipping_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_orders/{id}/confirm_shipping", testPackingOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("3-4. 복수 출하 일괄 확정 - 성공")
	public void testConfirmShippingBatch_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"ids": ["test-packing-order-id-001", "test-packing-order-id-002"]
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_orders/confirm_shipping_batch")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success_count").exists());
	}

	@Test
	@DisplayName("3-5. 출하 취소 (재고 복원) - 성공")
	public void testCancelShipping_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_orders/{id}/cancel_shipping", testPackingOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("3-6. 박스별 송장 번호 업데이트 - 성공")
	public void testUpdateBoxInvoice_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"invoice_no": "INV-20260331-00001"
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_boxes/{id}/update_invoice", testPackingBoxId)
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	/********************************************************************************************************
	 * 4. 엣지 케이스 및 예외 처리 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("4-1. 존재하지 않는 피킹 작업 시작 - 실패")
	public void testStartNonExistentPickingTask_Fail() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/ful_trx/picking_tasks/{id}/start", "non-existent-id"))
				.andDo(print())
				.andExpect(status().is4xxClientError());
	}

	@Test
	@DisplayName("4-2. 잘못된 상태의 피킹 작업 완료 시도 - 실패")
	public void testCompleteInvalidStatePickingTask_Fail() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/ful_trx/picking_tasks/{id}/complete", "invalid-state-task-id"))
				.andDo(print())
				.andExpect(status().is4xxClientError());
	}

	@Test
	@DisplayName("4-3. 빈 파라미터로 포장 지시 생성 - 실패")
	public void testCreatePackingOrderWithEmptyParams_Fail() throws Exception {
		// Given
		String requestBody = "{}";

		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_orders/create")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().is4xxClientError());
	}

	@Test
	@DisplayName("4-4. 이미 출하된 주문 취소 시도 - 실패")
	public void testCancelAlreadyShippedOrder_Fail() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/ful_trx/packing_orders/{id}/cancel_shipping", "already-shipped-order-id"))
				.andDo(print())
				.andExpect(status().is4xxClientError());
	}
}
