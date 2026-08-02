package operato.wms.oms.rest;

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

import operato.wms.oms.service.InoutStatusService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;

/**
 * 입출고 현황 컨트롤러
 *
 * 기간별 입출고 KPI 요약 및 상세 내역 조회 API를 제공한다.
 * Base URL: /rest/inout_status
 *
 * @author HatioLab
 */
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/inout_status")
@ServiceDesc(description = "Inout Status Service API")
public class InoutStatusController {

	@Autowired
	private InoutStatusService inoutStatusService;

	/**
	 * 입출고 KPI 요약 조회
	 *
	 * GET /rest/inout_status/summary
	 *
	 * @param fromDate 시작일 (yyyy-MM-dd)
	 * @param toDate   종료일 (yyyy-MM-dd)
	 * @param comCd    화주사 코드 (optional)
	 * @param whCd     창고 코드 (optional)
	 * @return KPI 요약 Map (total_in_qty, total_out_qty, total_return_qty, total_stock_change, total_count, 증감률)
	 */
	@GetMapping(value = "/summary", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Inout Status Summary")
	public Map<String, Object> getSummary(
			@RequestParam(name = "from_date", required = false) String fromDate,
			@RequestParam(name = "to_date", required = false) String toDate,
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd) {
		return this.inoutStatusService.getSummary(fromDate, toDate, comCd, whCd);
	}

	/**
	 * 입출고 상세 내역 페이지네이션 조회
	 *
	 * GET /rest/inout_status/list
	 *
	 * @param fromDate  시작일 (yyyy-MM-dd)
	 * @param toDate    종료일 (yyyy-MM-dd)
	 * @param comCd     화주사 코드 (optional)
	 * @param whCd      창고 코드 (optional)
	 * @param skuCd     상품 코드 (optional)
	 * @param category  구분 — 입고/출고/반품 (optional)
	 * @param tranType  입출고 구분 — tran_type 값 (optional)
	 * @param docStatus 상태 (optional)
	 * @param page      페이지 번호 (1-based, 기본 1)
	 * @param limit     페이지 크기 (기본 50)
	 * @return { total_count, items, page, limit }
	 */
	@GetMapping(value = "/list", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Inout Status List")
	public Map<String, Object> getList(
			@RequestParam(name = "from_date", required = false) String fromDate,
			@RequestParam(name = "to_date", required = false) String toDate,
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd,
			@RequestParam(name = "cust_cd", required = false) String custCd,
			@RequestParam(name = "sku_cd", required = false) String skuCd,
			@RequestParam(name = "category", required = false) String category,
			@RequestParam(name = "tran_type", required = false) String tranType,
			@RequestParam(name = "doc_status", required = false) String docStatus,
			@RequestParam(name = "page", required = false, defaultValue = "1") Integer page,
			@RequestParam(name = "limit", required = false, defaultValue = "50") Integer limit) {
		return this.inoutStatusService.getList(fromDate, toDate, comCd, whCd, custCd, skuCd, category, tranType, docStatus, page, limit);
	}
}
