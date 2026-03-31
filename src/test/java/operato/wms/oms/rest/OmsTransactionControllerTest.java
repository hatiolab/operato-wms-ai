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
 * OMS 트랜잭션 API 통합 테스트
 *
 * 주문 확정, 재고 할당, 웨이브 생성/확정 등 트랜잭션 API 테스트
 *
 * @author HatioLab
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Transactional
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("OMS 트랜잭션 API 통합 테스트")
public class OmsTransactionControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	// 실제 DB ID (domain_id=12, CONFIRMED 상태)
	private String testShipmentOrderId = "6e7d17b9-e769-43a1-9ac1-aac197df69d5"; // SO-260330-00033
	private String testWaveId = "test-wave-id-001"; // TODO: 웨이브 데이터 없음 - 테스트 실패 예상

	/********************************************************************************************************
	 * 1. 주문 확정 및 재고 할당 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("1-1. 주문 확정 - 성공 (단건)")
	public void testConfirmAndAllocateOrder_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/oms_trx/shipment_orders/{id}/confirm_and_allocate", testShipmentOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.status").exists());
	}

	@Test
	@DisplayName("1-2. 주문 일괄 확정 - 성공")
	public void testConfirmOrders_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"ids": ["6e7d17b9-e769-43a1-9ac1-aac197df69d5", "103f5faa-a9b2-4e4a-9bf5-45fc5c3c691a", "6792dc6e-e0a9-4e5f-b1fe-ec21b886c378"]
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/oms_trx/shipment_orders/confirm")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success_count").exists())
				.andExpect(jsonPath("$.fail_count").exists());
	}

	@Test
	@DisplayName("1-3. 주문 일괄 확정 (리스트 형식) - 성공")
	public void testConfirmOrderList_Success() throws Exception {
		// Given
		String requestBody = """
				[
					{"id": "6e7d17b9-e769-43a1-9ac1-aac197df69d5"},
					{"id": "103f5faa-a9b2-4e4a-9bf5-45fc5c3c691a"},
					{"id": "6792dc6e-e0a9-4e5f-b1fe-ec21b886c378"}
				]
				""";

		// When & Then
		mockMvc.perform(post("/rest/oms_trx/shipment_orders/confirm_list")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success_count").exists())
				.andExpect(jsonPath("$.fail_count").exists());
	}

	@Test
	@DisplayName("1-4. 주문 일괄 재고 할당 - 성공")
	public void testAllocateOrders_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"ids": ["6e7d17b9-e769-43a1-9ac1-aac197df69d5", "103f5faa-a9b2-4e4a-9bf5-45fc5c3c691a"]
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/oms_trx/shipment_orders/allocate")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success_count").exists())
				.andExpect(jsonPath("$.allocated_count").exists())
				.andExpect(jsonPath("$.back_order_count").exists());
	}

	@Test
	@DisplayName("1-5. 주문 할당 해제 - 성공")
	public void testDeallocateOrder_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"id": "6e7d17b9-e769-43a1-9ac1-aac197df69d5"
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/oms_trx/shipment_orders/deallocate")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.released_count").exists());
	}

	@Test
	@DisplayName("1-6. 주문 일괄 할당 해제 (리스트 형식) - 성공")
	public void testDeallocateOrderList_Success() throws Exception {
		// Given
		String requestBody = """
				[
					{"id": "6e7d17b9-e769-43a1-9ac1-aac197df69d5"},
					{"id": "103f5faa-a9b2-4e4a-9bf5-45fc5c3c691a"}
				]
				""";

		// When & Then
		mockMvc.perform(post("/rest/oms_trx/shipment_orders/deallocate_list")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").exists())
				.andExpect(jsonPath("$.released_count").exists());
	}

	/********************************************************************************************************
	 * 2. 주문 취소 및 마감 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("2-1. 주문 일괄 취소 - 성공")
	public void testCancelOrders_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"ids": ["6e7d17b9-e769-43a1-9ac1-aac197df69d5", "103f5faa-a9b2-4e4a-9bf5-45fc5c3c691a"]
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/oms_trx/shipment_orders/cancel")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success_count").exists())
				.andExpect(jsonPath("$.fail_count").exists());
	}

	@Test
	@DisplayName("2-2. 주문 마감 - 성공 (단건)")
	public void testCloseOrder_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/oms_trx/shipment_orders/{id}/close", testShipmentOrderId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("2-3. 주문 일괄 마감 (리스트 형식) - 성공")
	public void testCloseOrderList_Success() throws Exception {
		// Given
		String requestBody = """
				[
					{"id": "6e7d17b9-e769-43a1-9ac1-aac197df69d5"},
					{"id": "103f5faa-a9b2-4e4a-9bf5-45fc5c3c691a"}
				]
				""";

		// When & Then
		mockMvc.perform(post("/rest/oms_trx/shipment_orders/close_list")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	/********************************************************************************************************
	 * 3. 웨이브 생성 및 관리 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("3-1. 수동 웨이브 생성 - 성공")
	public void testCreateManualWave_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"orders": [
						{"id": "6e7d17b9-e769-43a1-9ac1-aac197df69d5"},
						{"id": "103f5faa-a9b2-4e4a-9bf5-45fc5c3c691a"},
						{"id": "6792dc6e-e0a9-4e5f-b1fe-ec21b886c378"}
					],
					"pick_type": "TOTAL",
					"pick_method": "WCS"
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/oms_trx/waves/create_manual")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.wave_no").exists())
				.andExpect(jsonPath("$.wave_seq").exists())
				.andExpect(jsonPath("$.order_count").exists())
				.andExpect(jsonPath("$.sku_count").exists())
				.andExpect(jsonPath("$.total_qty").exists());
	}

	@Test
	@DisplayName("3-2. 웨이브 확정 (릴리스) - 성공")
	public void testReleaseWave_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/oms_trx/waves/{id}/release", testWaveId)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{}"))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.wave_no").exists());
	}

	@Test
	@DisplayName("3-3. 웨이브 취소 - 성공")
	public void testCancelWave_Success() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/oms_trx/waves/{id}/cancel", testWaveId)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{}"))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.released_count").exists());
	}

	/********************************************************************************************************
	 * 4. 웨이브 상세 조회 API 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("4-1. 웨이브 포함 주문 목록 조회 - 성공")
	public void testGetWaveOrders_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/oms_trx/waves/{id}/orders", testWaveId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	@Test
	@DisplayName("4-2. 웨이브 SKU 합산 조회 - 성공")
	public void testGetWaveSkuSummary_Success() throws Exception {
		// When & Then
		mockMvc.perform(get("/rest/oms_trx/waves/{id}/sku_summary", testWaveId))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	@Test
	@DisplayName("4-3. 웨이브에 주문 추가 - 성공")
	public void testAddOrdersToWave_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"ids": ["9c8a85f5-95b5-4f10-8374-7ec3fb7eb0d6", "9a42f68b-b4b5-4835-a179-cebd0f7865a2"]
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/oms_trx/waves/{id}/add_orders", testWaveId)
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.addedCount").exists());
	}

	@Test
	@DisplayName("4-4. 웨이브에서 주문 제거 - 성공")
	public void testRemoveOrdersFromWave_Success() throws Exception {
		// Given
		String requestBody = """
				{
					"ids": ["6e7d17b9-e769-43a1-9ac1-aac197df69d5", "103f5faa-a9b2-4e4a-9bf5-45fc5c3c691a"]
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/oms_trx/waves/{id}/remove_orders", testWaveId)
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.removedCount").exists());
	}

	/********************************************************************************************************
	 * 5. 보충 지시 관리 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("5-1. 보충 지시 취소 - 성공")
	public void testCancelReplenishOrder_Success() throws Exception {
		// When & Then
		// TODO: replenish_orders 테이블에 데이터 없음 - 테스트 실패 예상
		mockMvc.perform(post("/rest/oms_trx/replenish_orders/{id}/cancel", "test-replenish-id-001"))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	/********************************************************************************************************
	 * 6. 엣지 케이스 및 예외 처리 테스트
	 ********************************************************************************************************/

	@Test
	@DisplayName("6-1. 존재하지 않는 주문 확정 - 실패")
	public void testConfirmNonExistentOrder_Fail() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/oms_trx/shipment_orders/confirm")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"ids\": [\"non-existent-order-id\"]}"))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.fail_count").value(greaterThan(0)))
				.andExpect(jsonPath("$.errors").isArray());
	}

	@Test
	@DisplayName("6-2. 잘못된 상태의 주문 할당 - 부분 성공")
	public void testAllocateInvalidStateOrders_PartialSuccess() throws Exception {
		// Given
		String requestBody = """
				{
					"ids": ["valid-order-001", "invalid-status-order-002"]
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/oms_trx/shipment_orders/allocate")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success_count").exists())
				.andExpect(jsonPath("$.back_order_count").exists());
	}

	@Test
	@DisplayName("6-3. 빈 주문 목록으로 웨이브 생성 - 실패")
	public void testCreateWaveWithEmptyOrders_Fail() throws Exception {
		// Given
		String requestBody = """
				{
					"orders": [],
					"pick_type": "TOTAL",
					"pick_method": "WCS"
				}
				""";

		// When & Then
		mockMvc.perform(post("/rest/oms_trx/waves/create_manual")
				.contentType(MediaType.APPLICATION_JSON)
				.content(requestBody))
				.andDo(print())
				.andExpect(status().is4xxClientError());
	}

	@Test
	@DisplayName("6-4. 이미 확정된 웨이브 재확정 시도 - 실패")
	public void testReleaseAlreadyReleasedWave_Fail() throws Exception {
		// When & Then
		mockMvc.perform(post("/rest/oms_trx/waves/{id}/release", "already-released-wave-id")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{}"))
				.andDo(print())
				.andExpect(status().is4xxClientError());
	}
}
