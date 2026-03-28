package operato.wms.oms.rest;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.oms.entity.ImportShipmentOrder;
import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.oms.service.OmsTransactionService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.system.service.AbstractRestService;

/**
 * OMS 트랜잭션 컨트롤러
 *
 * 출하 주문 임포트(검증/확정) 등 트랜잭션 API를 제공한다.
 *
 * @author HatioLab
 */
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/oms_trx")
@ServiceDesc(description = "OMS Transaction Service API")
public class OmsTransactionController extends AbstractRestService {

	@Autowired
	private OmsTransactionService omsTrxService;

	@Override
	protected Class<?> entityClass() {
		return ShipmentOrder.class;
	}

	/**
	 * B2C 출하 주문 엑셀 임포트 (업로드 + 검증)
	 *
	 * POST /rest/oms_trx/shipment_orders/import/excel/b2c
	 *
	 * @param list 엑셀에서 파싱된 임포트 데이터
	 * @return 검증 결과 { total, valid, error, rows }
	 */
	@RequestMapping(value = "shipment_orders/import/excel/b2c", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Import B2C shipment orders from Excel (validate)")
	public Map<String, Object> importB2cExcel(@RequestBody List<ImportShipmentOrder> list) {
		return this.omsTrxService.validateImportData(list, "B2C_OUT");
	}

	/**
	 * B2B 출하 주문 엑셀 임포트 (업로드 + 검증)
	 *
	 * POST /rest/oms_trx/shipment_orders/import/excel/b2b
	 *
	 * @param list 엑셀에서 파싱된 임포트 데이터
	 * @return 검증 결과 { total, valid, error, rows }
	 */
	@RequestMapping(value = "shipment_orders/import/excel/b2b", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Import B2B shipment orders from Excel (validate)")
	public Map<String, Object> importB2bExcel(@RequestBody List<ImportShipmentOrder> list) {
		return this.omsTrxService.validateImportData(list, "B2B_OUT");
	}

	/**
	 * 출하 주문 임포트 확정 (검증 완료 후 실제 등록)
	 *
	 * POST /rest/oms_trx/shipment_orders/import/confirm
	 *
	 * @param list 검증 완료된 임포트 데이터 (오류 행 제외)
	 * @return 처리 결과 { totalRows, orderCount, itemCount, deliveryCount }
	 */
	@RequestMapping(value = "shipment_orders/import/confirm", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Confirm and process shipment order import")
	public Map<String, Object> importConfirm(@RequestBody List<ImportShipmentOrder> list) {
		return this.omsTrxService.importShipmentOrders(list);
	}

	/**
	 * 자동 웨이브 생성
	 *
	 * POST /rest/oms_trx/waves/create
	 *
	 * @param params { groupBy, pickType, exeType, maxOrderCount, orderDate }
	 * @return 처리 결과 { waveCount, totalOrders, waves }
	 */
	@RequestMapping(value = "waves/create", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create waves automatically from allocated orders")
	public Map<String, Object> createAutoWaves(@RequestBody Map<String, Object> params) {
		return this.omsTrxService.createAutoWaves(params);
	}

	/**
	 * 자동 웨이브 대상 건수 조회
	 *
	 * GET /rest/oms_trx/waves/preview
	 *
	 * @param orderDate 주문일자 (optional, default: today)
	 * @return { totalOrders }
	 */
	@RequestMapping(value = "waves/preview", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Preview auto wave target order count")
	public Map<String, Object> previewAutoWaveTargets(@RequestParam(name = "order_date", required = false) String orderDate) {
		return this.omsTrxService.previewAutoWaveTargets(orderDate);
	}
}
