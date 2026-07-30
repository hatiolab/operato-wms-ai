package operato.wms.oms.rest;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.oms.service.ShipmentLabelPrintService;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;

/**
 * 출고주문 Zebra 송장 라벨 테스트 출력 API
 *
 * @author HatioLab
 */
@RestController
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/shipment_label_print")
@ServiceDesc(description = "Shipment Label Print Service API")
public class ShipmentLabelPrintController {
	/**
	 * 송장 라벨 출력 서비스
	 */
	@Autowired
	private ShipmentLabelPrintService shipmentLabelPrintService;

	/**
	 * 최근 출고주문을 최대 200건까지 조회한다.
	 *
	 * @param limit 조회 건수
	 * @return 출고주문 목록
	 */
	@GetMapping(value = "/orders", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Find recent shipment orders for label printing")
	@SuppressWarnings("rawtypes")
	public List<Map> findOrders(
			@RequestParam(name = "limit", required = false, defaultValue = "200") Integer limit) {
		return this.shipmentLabelPrintService.findRecentOrders(limit);
	}

	/**
	 * 기본 바코드 프린터 연결 상태를 조회한다.
	 *
	 * @return 프린터 상태
	 */
	@GetMapping(value = "/printer", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get default barcode printer status")
	public Map<String, Object> getPrinterStatus() {
		return this.shipmentLabelPrintService.getPrinterStatus();
	}

	/**
	 * 출고주문 한 건의 송장 라벨을 실제 출력한다.
	 *
	 * @param id 출고주문 ID
	 * @return 출력 결과와 소요시간
	 */
	@PostMapping(value = "/orders/{id}/print", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Print one shipment label")
	public Map<String, Object> printOne(@PathVariable("id") String id) {
		return this.shipmentLabelPrintService.printOne(id);
	}

	/**
	 * 여러 출고주문의 라벨을 고속 배치 출력하는 작업을 시작한다.
	 *
	 * @param request 출고주문 ID 목록을 포함한 요청
	 * @return 생성된 출력 작업 상태
	 */
	@PostMapping(value = "/batches", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Start shipment label batch print")
	public Map<String, Object> startBatch(@RequestBody Map<String, Object> request) {
		Object rawOrderIds = request.get("shipment_order_ids");
		if (!(rawOrderIds instanceof List<?> orderIds)) {
			throw new ElidomValidationException("출력할 출고주문 목록이 필요합니다.");
		}
		List<String> shipmentOrderIds = orderIds.stream()
				.filter(value -> value != null)
				.map(String::valueOf)
				.toList();
		return this.shipmentLabelPrintService.startBatch(shipmentOrderIds);
	}

	/**
	 * 고속 배치 출력 작업의 실시간 상태를 조회한다.
	 *
	 * @param jobId 출력 작업 ID
	 * @return 출력 작업 상태
	 */
	@GetMapping(value = "/batches/{jobId}", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get shipment label batch print status")
	public Map<String, Object> getBatchStatus(@PathVariable("jobId") String jobId) {
		return this.shipmentLabelPrintService.getBatchStatus(jobId);
	}
}
