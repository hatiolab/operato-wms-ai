package operato.wms.stock.rest;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.oned.Code128Writer;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import operato.wms.base.entity.Location;
import operato.wms.base.entity.StoragePolicy;
import operato.wms.base.service.WmsBaseService;
import operato.wms.stock.entity.Inventory;
import xyz.elidom.dbist.dml.Filter;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.print.rest.PrintoutController;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/inventories")
@ServiceDesc(description = "Inventory Service API")
public class InventoryController extends AbstractRestService {
	/**
	 * WMS 기본 서비스
	 */
	@Autowired
	protected WmsBaseService wmsBaseSvc;
	/**
	 * 리포트 컨트롤러
	 */
	@Autowired
	private PrintoutController printoutCtrl;

	@Override
	protected Class<?> entityClass() {
		return Inventory.class;
	}

	@RequestMapping(method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search (Pagination) By Search Conditions")
	public Page<?> index(@RequestParam(name = "page", required = false) Integer page,
			@RequestParam(name = "limit", required = false) Integer limit,
			@RequestParam(name = "select", required = false) String select,
			@RequestParam(name = "sort", required = false) String sort,
			@RequestParam(name = "query", required = false) String query) {

		Query queryObj = this.parseQuery(this.entityClass(), page, limit, select, sort, query);
		List<Filter> filters = queryObj.getFilter();
		boolean delFlagExist = false;

		for (Filter filter : filters) {
			if (ValueUtil.isEqualIgnoreCase("del_flag", filter.getName())) {
				delFlagExist = true;
				break;
			}
		}

		if (!delFlagExist) {
			Filter delFlagFilter = new Filter("del_flag", "=", "false");
			filters.add(delFlagFilter);
		}

		return queryManager.selectPage(this.entityClass(), queryObj);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Find one by ID")
	public Inventory findOne(@PathVariable("id") String id) {
		return this.getOne(this.entityClass(), id);
	}

	@RequestMapping(value = "/find_by", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Find one by conditions")
	public Inventory findBy(
			@RequestParam(name = "barcode", required = true) String barcode,
			@RequestParam(name = "loc_cd", required = false) String locCd,
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd) {

		// 입고 대기 존인 경우 - 디폴트 입고 대기 존 조회
		if (ValueUtil.isEqualIgnoreCase("_RCV_WAIT_", locCd)) {
			StoragePolicy policy = this.wmsBaseSvc.findStoragePolicy(Domain.currentDomainId(), comCd, whCd);
			locCd = policy.getDefaultWaitLoc();
		}

		return this.checkInventoryForPrint(barcode, locCd);
	}

	@RequestMapping(value = "/{id}/exist", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Check exists By ID")
	public Boolean isExist(@PathVariable("id") String id) {
		return this.isExistOne(this.entityClass(), id);
	}

	@RequestMapping(method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@ApiDesc(description = "Create")
	public Inventory create(@RequestBody Inventory input) {
		return this.createOne(input);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public Inventory update(@PathVariable("id") String id, @RequestBody Inventory input) {
		return this.updateOne(input);
	}

	/**
	 * PDA : 작업 화면 > 입고 적치 > 적치
	 * 
	 * @param id
	 * @param input
	 * @return
	 */
	@RequestMapping(value = "/work/load/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public Inventory updateWorkLoad(@PathVariable("id") String id, @RequestBody Inventory input) {
		Inventory inv = null;

		input.setId(id);

		List<Inventory> list = new ArrayList<Inventory>();
		list.add(input);

		if (this.MultipleUpdateLoad(list)) {
			inv = this.findOne(id);
		}

		return inv;
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Delete")
	public void delete(@PathVariable("id") String id) {
		this.deleteOne(this.entityClass(), id);
	}

	@RequestMapping(value = "/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean multipleUpdate(@RequestBody List<Inventory> list) {
		return this.cudMultipleData(this.entityClass(), list);
	}

	@RequestMapping(value = "/{barcode}/{loc_cd}/download_barcode", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Download Inventory Barcode")
	public void downloadInventoryBarcode(
			HttpServletRequest req,
			HttpServletResponse res,
			@PathVariable("barcode") String barcode,
			@PathVariable("loc_cd") String locCd) {

		// 1. 조회
		Inventory inventory = this.checkInventoryForPrint(barcode, locCd);

		// 2. 재고 바코드 라벨 PDF 다운로드
		this.printoutCtrl.showPdfByPrintTemplateName(req, res, "GENERAL_BARCODE_SHEET",
				ValueUtil.newMap("inventory", inventory));
	}

	@RequestMapping(value = "/{id}/download_barcode", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Download Inventory Barcode")
	public void downloadInventoryBarcode(
			HttpServletRequest req,
			HttpServletResponse res,
			@PathVariable("id") String id) {

		// 1. 조회
		Inventory inventory = this.checkInventoryForPrint(id);

		// 2. 재고 바코드 라벨 PDF 다운로드
		this.printoutCtrl.showPdfByPrintTemplateName(req, res, "GENERAL_BARCODE_SHEET",
				ValueUtil.newMap("inventory", inventory));
	}

	/**
	 * 모바일 바코드 인쇄용 HTML 페이지 반환 (Android Chrome 자동 인쇄 지원)
	 * PDF 뷰어 탭에서는 외부 print() 호출이 무시되므로, HTML 페이지 내부에서 auto-print
	 */
	@RequestMapping(value = "/{barcode}/{loc_cd}/print_barcode_html", method = RequestMethod.GET)
	@ApiDesc(description = "Print Inventory Barcode as HTML (mobile auto-print)")
	public void printInventoryBarcodeHtml(
			HttpServletRequest req,
			HttpServletResponse res,
			@PathVariable("barcode") String barcode,
			@PathVariable("loc_cd") String locCd) throws Exception {

		Inventory inventory = this.checkInventoryForPrint(barcode, locCd);
		String barcodeValue = inventory.getBarcode();

		// ZXing으로 Code-128 바코드 PNG 생성 후 base64 인코딩
		Map<EncodeHintType, Object> hints = new HashMap<>();
		hints.put(EncodeHintType.MARGIN, 1);
		Code128Writer writer = new Code128Writer();
		BitMatrix bitMatrix = writer.encode(barcodeValue, BarcodeFormat.CODE_128, 360, 90, hints);
		ByteArrayOutputStream baos = new ByteArrayOutputStream();
		MatrixToImageWriter.writeToStream(bitMatrix, "PNG", baos);
		String base64Barcode = Base64.getEncoder().encodeToString(baos.toByteArray());

		String html = String.format("""
				<!DOCTYPE html>
				<html>
				<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width,initial-scale=1">
				<style>
				@page { size: 62mm 42mm; margin: 2mm; }
				@media print { button { display: none !important; } }
				* { box-sizing: border-box; margin: 0; padding: 0; }
				body { font-family: monospace; text-align: center; padding: 3mm; }
				img { width: 100%%; max-width: 56mm; display: block; margin: 0 auto; }
				.code { font-size: 7pt; margin-top: 1mm; letter-spacing: 0.5px; }
				.loc { font-size: 9pt; font-weight: bold; margin-top: 2mm; }
				</style>
				</head>
				<body>
				<img src="data:image/png;base64,%s" alt="%s">
				<div class="code">%s</div>
				<div class="loc">%s</div>
				<script>
				window.addEventListener('load', function() {
				  setTimeout(function() { window.print(); }, 400);
				});
				</script>
				</body>
				</html>
				""", base64Barcode, barcodeValue, barcodeValue, locCd);

		res.setContentType("text/html; charset=UTF-8");
		res.setHeader("Cache-Control", "no-cache");
		res.getWriter().write(html);
	}

	/**
	 * 재고 관리 > 입고 적치 작업 처리
	 * 상태 : 입고 대기 > 보관 중
	 * 로케이션 : 입력 받은 로케이션으로 변경
	 *
	 * @param list
	 * @return
	 */
	@RequestMapping(value = "/load/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean MultipleUpdateLoad(@RequestBody List<Inventory> list) {

		List<Inventory> updateList = new ArrayList<Inventory>();

		for (Inventory item : list) {
			if (ValueUtil.isEqual(item.getCudFlag_(), "u") && ValueUtil.isNotEmpty(item.getLocCd())) {

				item.setStatus(Inventory.STATUS_STORED);
				item.setLastTranCd(Inventory.TRANSACTION_IN);

				updateList.add(item);
			}
		}

		queryManager.updateBatch(this.entityClass(), updateList, "status", "lastTranCd", "locCd");

		return true;
	}

	/**
	 * 재고 관리 > 재고 조정
	 * 
	 * @param list
	 * @return
	 */
	@RequestMapping(value = "/adjust/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean MultipleUpdateAdjust(@RequestBody List<Inventory> list) {

		List<Inventory> updateList = new ArrayList<Inventory>();

		for (Inventory item : list) {
			if (ValueUtil.isEqual(item.getCudFlag_(), "u") && ValueUtil.isNotEmpty(item.getInvQty())) {
				if (ValueUtil.isNotEqual(this.findOne(item.getId()), item.getInvQty())) {
					if (ValueUtil.isEmpty(item.getRemarks())) {
						throw new ElidomRuntimeException("재고 조정 사유를 반드시 입력해야 합니다.");
					}

					// 재고 정보 변경
					item.setLastTranCd(Inventory.TRANSACTION_ADJUST);
					if (item.getInvQty() <= 0) {
						// 재고가 0보다 작으면 상태 변경 : 비어있음
						item.setStatus(Inventory.STATUS_EMPTY);
						item.setDelFlag(true);
					}
					updateList.add(item);
				}
			}
		}

		queryManager.updateBatch(this.entityClass(), updateList, "status", "lastTranCd", "delFlag", "invQty",
				"remarks");

		return true;
	}

	/**
	 * 재고 바코드 ID로 재고 바코드 조회 & 프린트 전 예외 체크
	 * 
	 * @param id
	 * @return
	 */
	private Inventory checkInventoryForPrint(String id) {
		// 1. 조회
		Inventory inventory = this.queryManager.select(Inventory.class, id);

		// 2. 재고 존재 여부 체크
		if (inventory == null) {
			throw new ElidomRuntimeException("재고를 찾을 수 없습니다.");
		}

		// 3. 사용이 종료된 재고인지 체크
		if (ValueUtil.isNotEmpty(inventory.getClosedAt())) {
			throw new ElidomRuntimeException("이 재고는 이미 사용이 종료되었습니다.");
		}

		return inventory;
	}

	/**
	 * 재고 바코드 & 로케이션으로 재고 바코드 조회 & 프린트 전 예외 체크
	 * 
	 * @param barcode
	 * @param locCd
	 * @return
	 */
	private Inventory checkInventoryForPrint(String barcode, String locCd) {
		// 1. 파라미터 체크
		if (ValueUtil.isEmpty(barcode)) {
			throw new ElidomRuntimeException("바코드 값이 비어있어서 재고 조회를 할 수 없습니다.");
		}

		// 2. 조회 조건
		Inventory condition = new Inventory(Domain.currentDomainId(), barcode, ValueUtil.isEmpty(locCd) ? null : locCd);

		// 3. 바코드, 로케이션으로 재고 리스트 조회
		List<Inventory> invList = this.queryManager.selectList(Inventory.class, condition);

		// 4. 재고 존재 여부 체크
		if (ValueUtil.isEmpty(invList)) {
			throw new ElidomRuntimeException("재고를 찾을 수 없습니다.");
		}

		// 5. 사용 가능한 재고 찾기
		Inventory inventory = null;

		if (invList.size() == 1) {
			inventory = invList.get(0);

		} else {
			for (Inventory inv : invList) {
				if (ValueUtil.isEmpty(inv.getClosedAt())) {
					inventory = inv;
					break;
				}
			}
		}

		// 6. 사용 불가능한 재고만 있는 경우
		if (inventory == null) {
			throw new ElidomRuntimeException("사용 가능한 재고를 찾을 수 없습니다.");
		}

		// 7. 종료 여부 체크
		if (ValueUtil.isNotEmpty(inventory.getClosedAt())) {
			throw new ElidomRuntimeException("이 재고는 이미 사용이 종료되었습니다.");
		}

		// 8. 재고 리턴
		return inventory;
	}
}