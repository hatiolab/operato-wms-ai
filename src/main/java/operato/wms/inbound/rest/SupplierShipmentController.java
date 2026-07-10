package operato.wms.inbound.rest;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.inbound.entity.SupplierShipment;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMethod;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

import operato.wms.inbound.rest.InboundTransactionController;
import operato.wms.inbound.service.InboundTransactionService;
import operato.wms.inbound.query.store.InboundQueryStore;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.ValueUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.dbist.dml.Filter;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/supplier_shipments")
@ServiceDesc(description="SupplierShipment Service API")
public class SupplierShipmentController extends AbstractRestService {

	/**
	 * 입고 처리 컨트롤러 (라벨 PDF 생성 로직 위임용)
	 */
	@Autowired
	private InboundTransactionController inboundTrxCtrl;

	@Autowired
	private InboundQueryStore inboundQueryStore;

	/**
	 * 입고 트랜잭션 서비스 (공급처 입고예정 → 입고주문 생성 위임용)
	 */
	@Autowired
	private InboundTransactionService inboundTrxSvc;

	/**
	 * 목록 조회(index)에서 검색·정렬을 허용할 컬럼 화이트리스트 → 테이블 별칭 prefix.
	 * 그리드가 보내는 query/sort 의 컬럼명을 SQL 에 직접 삽입하므로, 이 맵에 등록된 컬럼만
	 * 허용하여 SQL 인젝션을 차단한다. (등록되지 않은 컬럼명은 무시)
	 */
	private static final Map<String, String> SEARCHABLE_COLUMNS = new HashMap<>();
	static {
		String[] ssCols = {
			"id", "asn_no", "sku_cd", "sku_nm", "barcode", "exp_qty", "loc_cd", "lot_no",
			"expired_date", "eta", "box_in_qty", "plt_in_qty", "pallet_qty", "label_flag",
			"order_flag", "rcv_no", "ordered_at", "remarks", "del_flag", "created_at", "updated_at",
			"attr01", "attr02", "attr03", "attr04", "attr05", "creator_id", "updater_id"
		};
		for (String c : ssCols) {
			SEARCHABLE_COLUMNS.put(c, "ss.");
		}
		SEARCHABLE_COLUMNS.put("vend_cd", "v.");
		SEARCHABLE_COLUMNS.put("vend_nm", "v.");
		SEARCHABLE_COLUMNS.put("com_cd", "c.");
		SEARCHABLE_COLUMNS.put("com_nm", "c.");
		SEARCHABLE_COLUMNS.put("wh_cd", "w.");
		SEARCHABLE_COLUMNS.put("wh_nm", "w.");
	}

	@Override
	protected Class<?> entityClass() {
		return SupplierShipment.class;
	}

	/**
	 * 공급처 입고예정 라벨 PDF 다운로드
	 * 프론트(basic-pdf-element)는 stream/ 프리픽스를 붙여 호출하지만, 프론트 프록시 미들웨어가
	 * stream 세그먼트를 제거하여 /rest/supplier_shipments/{id}/download_labels 로 도달한다.
	 *
	 * @param req
	 * @param res
	 * @param id 공급처 입고예정 ID
	 */
	@RequestMapping(value="/{id}/download_labels", method=RequestMethod.GET, produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Download Supplier Shipment Labels")
	public void downloadLabels(HttpServletRequest req, HttpServletResponse res, @PathVariable("id") String id) {
		this.inboundTrxCtrl.downloadSupplierShipmentLabels(req, res, id);
	}
  
	@GetMapping(produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Search (Pagination) By Search Conditions")  
	public Page<?> index(
		@RequestParam(name="page", required=false) Integer page, 
		@RequestParam(name="limit", required=false) Integer limit, 
		@RequestParam(name="select", required=false) String select, 
		@RequestParam(name="sort", required=false) String sort,
		@RequestParam(name="query", required=false) String query) {   
		
		String sql = this.inboundQueryStore.getSearchSupplierShipments();
		StringBuilder sqlBuilder = new StringBuilder(sql);
		Map<String, Object> params = ValueUtil.newMap("domainId", Domain.currentDomainId());

		if (ValueUtil.isNotEmpty(query)) {
			try {
				ObjectMapper mapper = new ObjectMapper();
				List<Map<String, Object>> conditions = mapper.readValue(query, new TypeReference<List<Map<String, Object>>>(){});
				for (Map<String, Object> cond : conditions) {
					String name = cond.containsKey("name") ? (String) cond.get("name") : (String) cond.get("property");
					Object value = cond.get("value");
					String operator = (String) cond.get("operator");

					if (ValueUtil.isNotEmpty(name) && ValueUtil.isNotEmpty(value)) {
						// 화이트리스트에 없는 컬럼명은 무시 (SQL 인젝션 방지)
						String prefix = SEARCHABLE_COLUMNS.get(name);
						if (prefix == null) {
							continue;
						}

						if ("like".equalsIgnoreCase(operator) || "i_like".equalsIgnoreCase(operator)) {
							sqlBuilder.append(" AND ").append(prefix).append(name).append(" ILIKE :").append(name);
							params.put(name, "%" + value + "%");
						} else {
							sqlBuilder.append(" AND ").append(prefix).append(name).append(" = :").append(name);
							params.put(name, value);
						}
					}
				}
			} catch (Exception e) {
				// Parse ignore
			}
		}

		boolean hasSort = false;
		if (ValueUtil.isNotEmpty(sort)) {
			try {
				ObjectMapper mapper = new ObjectMapper();
				List<Map<String, Object>> sortList = mapper.readValue(sort, new TypeReference<List<Map<String, Object>>>(){});
				if (!sortList.isEmpty()) {
					StringBuilder orderBuilder = new StringBuilder();
					boolean first = true;
					for (Map<String, Object> s : sortList) {
						String prop = s.containsKey("name") ? (String) s.get("name") : (String) s.get("property");
						if (ValueUtil.isEmpty(prop) || "null".equalsIgnoreCase(prop)) continue;

						// 화이트리스트에 없는 컬럼명은 정렬에서 무시 (SQL 인젝션 방지)
						String prefix = SEARCHABLE_COLUMNS.get(prop);
						if (prefix == null) continue;

						if (!first) orderBuilder.append(", ");

						orderBuilder.append(prefix).append(prop);

						boolean isDesc = false;
						if (Boolean.TRUE.equals(s.get("desc"))) isDesc = true;
						if ("desc".equalsIgnoreCase((String) s.get("direction"))) isDesc = true;
						
						if (isDesc) {
							orderBuilder.append(" DESC");
						}
						first = false;
					}
					if (orderBuilder.length() > 0) {
						sqlBuilder.append(" ORDER BY ").append(orderBuilder.toString());
						hasSort = true;
					}
				}
			} catch (Exception e) {
				// Ignore and fallback
			}
		}

		if (!hasSort) {
			sqlBuilder.append(" ORDER BY ss.updated_at DESC");
		}

		page = (page == null || page < 1) ? 1 : page;
		limit = (limit == null || limit < 1) ? 50 : limit;

		Page<Map> result = this.queryManager.selectPageBySql(sqlBuilder.toString(), params, Map.class, page, limit);
		return result;
	}

	/**
	 * 재고바코드로 공급처 입고예정(ASN) 단건 조회
	 *
	 * 공급처가 부착한 라벨의 재고바코드를 스캔하여 어떤 상품(sku_cd)·LOT·소비기한인지 인식하기 위한 조회.
	 * barcode + domain_id 는 unique 하므로 단건이 보장된다. 없으면 null.
	 *
	 * @param barcode 재고바코드 (라벨 스캔값)
	 * @return 공급처 입고예정 단건 (없으면 null)
	 */
	@GetMapping(value="/find_by_barcode", produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Find supplier shipment by inventory barcode")
	public SupplierShipment findByBarcode(@RequestParam("barcode") String barcode) {
		Query query = new Query();
		query.addFilter(new Filter("domainId", Domain.currentDomainId()));
		query.addFilter(new Filter("barcode", barcode));
		return this.queryManager.selectByCondition(SupplierShipment.class, query);
	}

	/**
	 * 선택된 공급처 입고예정 목록으로부터 입고주문 일괄 생성
	 *
	 * "입고예정 접수 현황" 그리드에서 멀티셀렉한 행(service-list 버튼)을 전달받아,
	 * 행마다 입고주문(Receiving) 1건 + 입고상세(ReceivingItem) 1건을 생성한다.
	 * 이미 유효한(취소되지 않은) 입고주문이 연결된 행은 스킵하고, 오더가 없거나 취소된 경우 재생성한다.
	 *
	 * POST /rest/supplier_shipments/create_receiving_orders
	 * Body: { "list": [ { "id": "...", ... }, ... ] }
	 *
	 * @param body service-list 버튼이 전송하는 선택 행 목록 (list)
	 * @return 처리 결과 (created, skipped, details)
	 */
	@PostMapping(value="/create_receiving_orders", consumes=MediaType.APPLICATION_JSON_VALUE, produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Create receiving orders from selected supplier shipments")
	public Map<String, Object> createReceivingOrders(@RequestBody Map<String, Object> body) {
		Long domainId = Domain.currentDomainId();

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> list = (List<Map<String, Object>>) body.get("list");
		List<String> ids = new ArrayList<>();
		if (list != null) {
			for (Map<String, Object> row : list) {
				Object id = row.get("id");
				if (id != null) {
					ids.add(id.toString());
				}
			}
		}

		return this.inboundTrxSvc.createReceivingOrdersFromShipments(domainId, ids);
	}

	@GetMapping(value="/{id}", produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Find one by ID")
	public SupplierShipment findOne(@PathVariable("id") String id) {
		return this.getOne(this.entityClass(), id);
	}

	@GetMapping(value="/{id}/exist", produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Check exists By ID")
	public Boolean isExist(@PathVariable("id") String id) {
		return this.isExistOne(this.entityClass(), id);
	}

	@PostMapping(consumes=MediaType.APPLICATION_JSON_VALUE, produces=MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@ApiDesc(description="Create")
	public SupplierShipment create(@RequestBody SupplierShipment input) {
		return this.createOne(input);
	}

	@PutMapping(value="/{id}", consumes=MediaType.APPLICATION_JSON_VALUE, produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Update")
	public SupplierShipment update(@PathVariable("id") String id, @RequestBody SupplierShipment input) {
		return this.updateOne(input);
	}
  
	@DeleteMapping(value="/{id}", produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Delete")
	public void delete(@PathVariable("id") String id) {
		this.deleteOne(this.entityClass(), id);
	}  
  
	@PostMapping(value="/update_multiple", consumes=MediaType.APPLICATION_JSON_VALUE, produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Create, Update or Delete multiple at one time")
	public Boolean multipleUpdate(@RequestBody List<SupplierShipment> list) {
		return this.cudMultipleData(this.entityClass(), list);
	}

  
}