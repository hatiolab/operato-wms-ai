package operato.wms.oms.rest;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import xyz.elidom.dbist.dml.Filter;

import org.springframework.beans.factory.annotation.Autowired;
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

import operato.wms.oms.entity.ReplenishOrder;
import operato.wms.oms.entity.ReplenishOrderItem;
import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.oms.service.OmsReplenishOrderService;

import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;
import xyz.elidom.dbist.dml.Page;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/replenish_orders")
@ServiceDesc(description = "ReplenishOrder Service API")
public class ReplenishOrderController extends AbstractRestService {

	@Autowired
	private OmsReplenishOrderService omsReplenishOrderService;

	@Override
	protected Class<?> entityClass() {
		return ReplenishOrder.class;
	}

	@GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search (Pagination) By Search Conditions")
	public Page<?> index(
			@RequestParam(name = "page", required = false) Integer page,
			@RequestParam(name = "limit", required = false) Integer limit,
			@RequestParam(name = "select", required = false) String select,
			@RequestParam(name = "sort", required = false) String sort,
			@RequestParam(name = "query", required = false) String query) {
		return this.search(this.entityClass(), page, limit, select, sort, query);
	}

	@GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Find one by ID")
	public ReplenishOrder findOne(@PathVariable("id") String id) {
		return this.getOne(this.entityClass(), id);
	}

	@GetMapping(value = "/{id}/exist", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Check exists By ID")
	public Boolean isExist(@PathVariable("id") String id) {
		return this.isExistOne(this.entityClass(), id);
	}

	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@ApiDesc(description = "Create")
	public ReplenishOrder create(@RequestBody ReplenishOrder input) {
		return this.createOne(input);
	}

	@PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public ReplenishOrder update(@PathVariable("id") String id, @RequestBody ReplenishOrder input) {
		return this.updateOne(input);
	}

	@DeleteMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Delete")
	public void delete(@PathVariable("id") String id) {
		this.deleteOne(this.entityClass(), id);
	}

	@PostMapping(value = "/update_multiple", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean multipleUpdate(@RequestBody List<ReplenishOrder> list) {
		return this.cudMultipleData(this.entityClass(), list);
	}

	@GetMapping(value = "/{id}/include_details", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Find One included all details by ID")
	public Map<String, Object> findDetails(@PathVariable("id") String id) {
		return this.findOneIncludedDetails(id);
	}

	@GetMapping(value = "/{id}/items", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search detail list by master ID")
	public List<ReplenishOrderItem> findReplenishOrderItems(@PathVariable("id") String id) {
		xyz.elidom.dbist.dml.Query query = new xyz.elidom.dbist.dml.Query();
		query.addFilter(new Filter("replenishOrderId", id));
		return this.queryManager.selectList(ReplenishOrderItem.class, query);
	}

	@PostMapping(value = "/{id}/update_multiple", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update, Delete multiple details at one time")
	public List<ReplenishOrderItem> updateMultipleReplenishOrderItem(@PathVariable("id") String id,
			@RequestBody List<ReplenishOrderItem> list) {
		for (ReplenishOrderItem item : list) {
			item.setReplenishOrderId(id);
		}

		this.cudMultipleData(ReplenishOrderItem.class, list);
		return this.findReplenishOrderItems(id);
	}

	@PostMapping(value = "/start/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "보충 지시 시작 (CREATED → IN_PROGRESS)")
	public Map<String, Object> startReplenishOrder(@PathVariable("id") String id) {
		return this.omsReplenishOrderService.startReplenishOrder(id);
	}

	@PostMapping(value = "/complete/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "보충 지시 완료 (IN_PROGRESS → COMPLETED)")
	public Map<String, Object> completeReplenishOrder(@PathVariable("id") String id) {
		return this.omsReplenishOrderService.completeReplenishOrder(id);
	}

	@PostMapping(value = "/cancel/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "보충 지시 취소 (CREATED/IN_PROGRESS → CANCELLED)")
	public Map<String, Object> cancelReplenishOrder(@PathVariable("id") String id) {
		return this.omsReplenishOrderService.cancelReplenishOrder(id);
	}

	@PostMapping(value = "/create_from_order", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "BACK_ORDER 출하 주문 기반 보충 지시 수동 생성 (단건)")
	public Map<String, Object> createFromOrder(@RequestBody Map<String, Object> params) {
		Long domainId = Domain.currentDomainId();
		String shipmentOrderId = ValueUtil.toString(params.get("shipment_order_id"));
		String comCd = ValueUtil.toString(params.get("com_cd"));
		String whCd = ValueUtil.toString(params.get("wh_cd"));

		if (ValueUtil.isEmpty(shipmentOrderId)) {
			throw new ElidomValidationException("shipment_order_id는 필수입니다");
		}

		// com_cd, wh_cd 미전달 시 주문에서 조회
		if (ValueUtil.isEmpty(comCd) || ValueUtil.isEmpty(whCd)) {
			String orderSql = "SELECT com_cd, wh_cd FROM shipment_orders WHERE domain_id = :domainId AND id = :id";
			java.util.Map<String, Object> orderParams = ValueUtil.newMap("domainId,id", domainId, shipmentOrderId);
			List<ShipmentOrder> orders = this.queryManager.selectListBySql(orderSql, orderParams, ShipmentOrder.class,
					0, 1);
			if (orders.isEmpty()) {
				throw new ElidomValidationException("출하 주문을 찾을 수 없습니다: " + shipmentOrderId);
			}
			comCd = orders.get(0).getComCd();
			whCd = orders.get(0).getWhCd();
		}

		return this.omsReplenishOrderService.createReplenishForOrder(domainId, shipmentOrderId, comCd, whCd);
	}

	@PostMapping(value = "/create_from_orders", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "BACK_ORDER 출하 주문 기반 보충 지시 수동 생성 (복수)")
	public Map<String, Object> createFromOrders(@RequestBody List<ShipmentOrder> shipmentOrders) {
		Long domainId = Domain.currentDomainId();

		if (shipmentOrders == null || shipmentOrders.isEmpty()) {
			throw new ElidomValidationException("주문 정보가 없습니다.");
		}

		int totalCreated = 0;
		int totalItems = 0;
		List<String> replenishNos = new ArrayList<>();
		List<String> noStockOrders = new ArrayList<>();

		for (ShipmentOrder order : shipmentOrders) {
			Map<String, Object> result = this.omsReplenishOrderService.createReplenishForOrder(
					domainId, order.getId(), order.getComCd(), order.getWhCd());

			if (Boolean.TRUE.equals(result.get("replenish_created"))) {
				totalCreated++;
				totalItems += (int) result.getOrDefault("item_count", 0);
				replenishNos.add(ValueUtil.toString(result.get("replenish_no")));
			} else {
				noStockOrders.add(order.getId());
			}
		}

		return ValueUtil.newMap("total_created,total_items,replenish_nos,no_stock_orders",
				totalCreated, totalItems, replenishNos, noStockOrders);
	}

	@PostMapping(value = "/{id}/items/{itemId}/complete", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "보충 아이템 완료 처리 — result_qty 기록, 전체 완료 시 헤더 자동 COMPLETED")
	public Map<String, Object> completeReplenishItem(
			@PathVariable("id") String replenishOrderId,
			@PathVariable("itemId") String itemId,
			@RequestBody Map<String, Object> params) {
		double resultQty = Double.parseDouble(params.getOrDefault("result_qty", "0").toString());
		return this.omsReplenishOrderService.completeReplenishItem(replenishOrderId, itemId, resultQty);
	}

}