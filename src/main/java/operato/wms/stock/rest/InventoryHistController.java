package operato.wms.stock.rest;

import java.util.List;
import java.util.Map;

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

import operato.wms.stock.entity.InventoryHist;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/inventory_hists")
@ServiceDesc(description = "InventoryHist Service API")
public class InventoryHistController extends AbstractRestService {

	@Override
	protected Class<?> entityClass() {
		return InventoryHist.class;
	}

	@RequestMapping(method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search (Pagination) By Search Conditions")
	public Page<?> index(@RequestParam(name = "page", required = false) Integer page,
			@RequestParam(name = "limit", required = false) Integer limit,
			@RequestParam(name = "select", required = false) String select,
			@RequestParam(name = "sort", required = false) String sort,
			@RequestParam(name = "query", required = false) String query) {
		return this.search(this.entityClass(), page, limit, select, sort, query);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Find one by ID")
	public InventoryHist findOne(@PathVariable("id") String id) {
		return this.getOne(this.entityClass(), id);
	}

	@RequestMapping(value = "/{id}/exist", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Check exists By ID")
	public Boolean isExist(@PathVariable("id") String id) {
		return this.isExistOne(this.entityClass(), id);
	}

	@RequestMapping(method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@ApiDesc(description = "Create")
	public InventoryHist create(@RequestBody InventoryHist input) {
		return this.createOne(input);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public InventoryHist update(@PathVariable("id") String id, @RequestBody InventoryHist input) {
		return this.updateOne(input);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Delete")
	public void delete(@PathVariable("id") String id) {
		this.deleteOne(this.entityClass(), id);
	}

	@RequestMapping(value = "/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean multipleUpdate(@RequestBody List<InventoryHist> list) {
		return this.cudMultipleData(this.entityClass(), list);
	}
	
	/**
	 * 재고 관리 > 재고 정보 > 탭 > 재고 이력 조회
	 *
	 * @param inventoryId
	 * @return
	 */
	@RequestMapping(value = "/by_inventory_id/{inventory_id}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search List By Inventory ID")
	public List<InventoryHist> listByInventoryId(@PathVariable("inventory_id") String inventoryId) {
		Map<String, Object> params = ValueUtil.newMap("domainId,inventoryId", Domain.currentDomainId(), inventoryId);
	    String sql = "select * from inventory_hists where domain_id = :domainId and barcode = (select barcode from inventories where id = :inventoryId) order by hist_seq desc";
	    return this.queryManager.selectListBySql(sql, params, InventoryHist.class, 0, 0);
	}

	/**
	 * 수불 현황 조회 (W23-SF-2)
	 *
	 * 기간·화주사·창고·SKU·거래유형 조건으로 수불 이력을 페이지네이션 조회한다.
	 *
	 * GET /rest/inventory_hists/transactions
	 *
	 * @param fromDate  시작일 (yyyy-MM-dd, 필수)
	 * @param toDate    종료일 (yyyy-MM-dd, 필수)
	 * @param comCd     화주사 코드 (optional)
	 * @param whCd      창고 코드 (optional)
	 * @param skuCd     SKU 코드 (optional)
	 * @param tranCd    거래유형 코드 — last_tran_cd (optional)
	 * @param page      페이지 번호 (1-based, 기본 1)
	 * @param limit     페이지 크기 (기본 50)
	 * @return 수불 이력 목록
	 */
	@SuppressWarnings("unchecked")
	@RequestMapping(value = "/transactions", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search Inventory Transactions (수불 현황)")
	public Map<String, Object> searchTransactions(
			@RequestParam(name = "from_date") String fromDate,
			@RequestParam(name = "to_date") String toDate,
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd,
			@RequestParam(name = "sku_cd", required = false) String skuCd,
			@RequestParam(name = "tran_cd", required = false) String tranCd,
			@RequestParam(name = "page", required = false, defaultValue = "1") Integer page,
			@RequestParam(name = "limit", required = false, defaultValue = "50") Integer limit) {

		Long domainId = Domain.currentDomainId();

		// 기본 조건
		StringBuilder where = new StringBuilder()
				.append(" WHERE ih.domain_id = :domainId")
				.append(" AND ih.created_at >= :fromDate ::date")
				.append(" AND ih.created_at < (:toDate ::date + interval '1 day')");

		Map<String, Object> params = ValueUtil.newMap("domainId,fromDate,toDate", domainId, fromDate, toDate);

		if (ValueUtil.isNotEmpty(comCd)) {
			where.append(" AND ih.com_cd = :comCd");
			params.put("comCd", comCd);
		}
		if (ValueUtil.isNotEmpty(whCd)) {
			where.append(" AND ih.wh_cd = :whCd");
			params.put("whCd", whCd);
		}
		if (ValueUtil.isNotEmpty(skuCd)) {
			where.append(" AND ih.sku_cd = :skuCd");
			params.put("skuCd", skuCd);
		}
		if (ValueUtil.isNotEmpty(tranCd)) {
			where.append(" AND ih.last_tran_cd = :tranCd");
			params.put("tranCd", tranCd);
		}

		// 전체 건수
		String countSql = "SELECT COUNT(*) FROM inventory_hists ih" + where;
		Integer totalCount = this.queryManager.selectBySql(countSql, params, Integer.class);

		// 데이터 조회 (pageIndex는 0-based)
		String dataSql = "SELECT ih.id, ih.barcode, ih.hist_seq, ih.wh_cd, ih.com_cd," +
				" ih.sku_cd, ih.sku_nm, ih.loc_cd, ih.lot_no, ih.serial_no," +
				" ih.inv_qty, ih.last_tran_cd, ih.rcv_no, ih.rls_ord_no," +
				" ih.expired_date, ih.prod_date, ih.status, ih.created_at, ih.creator_id" +
				" FROM inventory_hists ih" + where +
				" ORDER BY ih.created_at DESC, ih.hist_seq DESC";

		List<Map<String, Object>> items = (List<Map<String, Object>>) (List<?>) this.queryManager
				.selectListBySql(dataSql, params, Map.class, page - 1, limit);

		return ValueUtil.newMap("total_count,items,page,limit",
				totalCount != null ? totalCount : 0, items, page, limit);
	}

}