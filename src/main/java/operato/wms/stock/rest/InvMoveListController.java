package operato.wms.stock.rest;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.stock.service.InvMoveListService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;

/**
 * 재고 이동 조회 컨트롤러
 *
 * Base URL: /rest/inv_move_list
 *
 * @author HatioLab
 */
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/inv_move_list")
@ServiceDesc(description = "Inventory Move List API")
public class InvMoveListController {

	@Autowired
	private InvMoveListService invMoveListService;

	/** KPI 요약 조회 */
	@GetMapping(value = "/summary", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Inventory Move Summary")
	public Map<String, Object> getSummary(
			@RequestParam(name = "from_date", required = false) String fromDate,
			@RequestParam(name = "to_date", required = false) String toDate,
			@RequestParam(name = "wh_cd", required = false) String whCd,
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "tran_category", required = false) String tranCategory,
			@RequestParam(name = "sku_cd", required = false) String skuCd,
			@RequestParam(name = "loc_cd", required = false) String locCd,
			@RequestParam(name = "device_cd", required = false) String deviceCd,
			@RequestParam(name = "worker_id", required = false) String workerId,
			@RequestParam(name = "ref_doc_no", required = false) String refDocNo,
			@RequestParam(name = "lot_no", required = false) String lotNo) {
		return this.invMoveListService.getSummary(fromDate, toDate, whCd, comCd,
				tranCategory, skuCd, locCd, deviceCd, workerId, refDocNo, lotNo);
	}

	/** 이동 이력 목록 조회 */
	@GetMapping(value = "/list", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Inventory Move List")
	public Map<String, Object> getList(
			@RequestParam(name = "from_date", required = false) String fromDate,
			@RequestParam(name = "to_date", required = false) String toDate,
			@RequestParam(name = "wh_cd", required = false) String whCd,
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "tran_category", required = false) String tranCategory,
			@RequestParam(name = "sku_cd", required = false) String skuCd,
			@RequestParam(name = "loc_cd", required = false) String locCd,
			@RequestParam(name = "device_cd", required = false) String deviceCd,
			@RequestParam(name = "worker_id", required = false) String workerId,
			@RequestParam(name = "ref_doc_no", required = false) String refDocNo,
			@RequestParam(name = "lot_no", required = false) String lotNo,
			@RequestParam(name = "page", required = false, defaultValue = "1") Integer page,
			@RequestParam(name = "limit", required = false, defaultValue = "50") Integer limit) {
		return this.invMoveListService.getList(fromDate, toDate, whCd, comCd,
				tranCategory, skuCd, locCd, deviceCd, workerId, refDocNo, lotNo, page, limit);
	}

	/** 이동 흐름 타임라인 조회 */
	@GetMapping(value = "/timeline", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Inventory Move Timeline by groupId")
	public List<Map<String, Object>> getTimeline(
			@RequestParam(name = "group_id") String groupId) {
		return this.invMoveListService.getTimeline(groupId);
	}
}
