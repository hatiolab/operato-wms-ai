package operato.wms.outbound.rest;

import java.util.ArrayList;
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

import operato.wms.outbound.entity.PickingOrder;
import operato.wms.outbound.entity.PickingOrderItem;
import operato.wms.outbound.entity.ReleaseOrder;
import operato.wms.outbound.entity.ReleaseOrderItem;
import xyz.elidom.dbist.dml.Filter;
import xyz.elidom.dbist.dml.Order;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.SysConstants;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.BeanUtil;
import xyz.elidom.util.ValueUtil;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/picking_orders")
@ServiceDesc(description = "PickingOrder Service API")
public class PickingOrderController extends AbstractRestService {

	@Override
	protected Class<?> entityClass() {
		return PickingOrder.class;
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
	public PickingOrder findOne(@PathVariable("id") String id) {
		return this.getOne(this.entityClass(), id);
	}
	
	@RequestMapping(value = "/item/{id}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Find one item by ID")
	public PickingOrderItem findOneItem(@PathVariable("id") String id) {
		return this.getOne(PickingOrderItem.class, id);
	}

	@RequestMapping(value = "/{id}/exist", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Check exists By ID")
	public Boolean isExist(@PathVariable("id") String id) {
		return this.isExistOne(this.entityClass(), id);
	}

	@RequestMapping(method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@ApiDesc(description = "Create")
	public PickingOrder create(@RequestBody PickingOrder input) {
		return this.createOne(input);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public PickingOrder update(@PathVariable("id") String id, @RequestBody PickingOrder input) {
		return this.updateOne(input);
	}
	
    @RequestMapping(value = "/{id}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Delete")
    public void delete(@PathVariable("id") String id) {
        this.deleteOne(this.entityClass(), id);
    }

    @RequestMapping(value = "/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Create, Update or Delete multiple at one time")
    public Boolean multipleUpdate(@RequestBody List<PickingOrder> list) {
        return this.cudMultipleData(this.entityClass(), list);
    }
    
    @RequestMapping(value = "/{id}/items", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Find Picking Order Items By Picking Order ID")
    public List<PickingOrderItem> findPickingOrderItems(@PathVariable("id") String id, @RequestParam(name = "sort", required = false) String sort) {
        Query query = new Query();
        query.addFilter(new Filter("pickOrderId", id));
        
        if (ValueUtil.isNotEmpty(sort)) {
            query.addOrder(this.jsonParser.parse(sort, Order[].class));
        }
        
        return this.queryManager.selectList(PickingOrderItem.class, query);
    }

    @RequestMapping(value = "/{id}/items/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Update Multiple Picking Order Items")
    public Boolean updateMultiplePickingOrderItems(@PathVariable("id") String id, @RequestBody List<PickingOrderItem> pickOrderItems) {        
        for(PickingOrderItem item : pickOrderItems) {
            item.setPickOrderId(id);
        }
        
        return this.cudMultipleData(PickingOrderItem.class, pickOrderItems);
    }
	
    // -----------------------------------------------------------------------------------------------------------------------------------------
    
    @RequestMapping(value = "/item/operator/{id}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Find one operator item by ID")
    public PickingOrderItem findOneOperatorItem(@PathVariable("id") String id) {
        PickingOrderItem item = this.findOneItem(id);
        // 작업 화면에서 입력 받을 값 초기화 (저장시 체크 할 항목)
        item.setBarcode(SysConstants.EMPTY_STRING);
        item.setFromLocCd(SysConstants.EMPTY_STRING);
        item.setLotNo(SysConstants.EMPTY_STRING);
        return item;
    }
	
	@SuppressWarnings("unchecked")
	@RequestMapping(value = "/item/operator/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public PickingOrderItem updateItem(@PathVariable("id") String id, @RequestBody PickingOrderItem input) {
		input.setId(id);
		
		PickingOrderItem orgItem = this.findOneItem(id);
		
		PickingOrder po = this.findOne(orgItem.getPickOrderId());
		if ( ValueUtil.isNotEqual(po.getStatus(), PickingOrder.STATUS_RUN) ) {
			throw new ElidomRuntimeException("피킹지시의 상태가 실행 중이 아닙니다.");
		}
		
		// 선택한 작업과 입력한 값이 일치하는지 체크 
		// 필수 체크 
		if ( ValueUtil.isNotEqual(orgItem.getBarcode(), input.getBarcode()) ) {
			// 바코드 체크
			throw new ElidomRuntimeException("선택한 작업의 바코드와 일치하지 않습니다.");
		} 
		if ( ValueUtil.isNotEqual(orgItem.getFromLocCd(), input.getFromLocCd()) ) {
			// 로케이션 체크
			throw new ElidomRuntimeException("선택한 작업의 로케이션과 일치하지 않습니다.");
		}
		// 값이 있는 경우 체크
		if ( ValueUtil.isNotEmpty(orgItem.getLotNo()) && ValueUtil.isNotEqual(orgItem.getLotNo(), input.getLotNo()) ) {
			// LOT 체크 
			throw new ElidomRuntimeException("선택한 작업의 Lot 번호와 일치하지 않습니다.");
		}
		
		/**
		 * 입력 수량에 따른 상태 처리
		 * 피킹 지시의 모든 처리가 완료된 경우 : 개별 출고인지 체크하여 개별 출고인 경우, 피킹 완료 처리  
		 */
		if ( input.getPickQty() != 0 ) {
			if ( ValueUtil.isEqual(orgItem.getOrderQty(), input.getPickQty()) ) {
				// 완료 처리 : 주문 수량과 입력 수량이 같은 경우
				input.setStatus(PickingOrderItem.STATUS_END);
				
				input = this.updateOne(input);
				
				// 현재 작업의 상태가 아직 업데이트 되지 않았기 때문에 1과 같은지 체크 
				if ( 0 == this.queryManager.selectSizeBySql("select id from picking_order_items where pick_order_id = :pickOrderId and status != 'END'", ValueUtil.newMap("pickOrderId", po.getId())) ) {
					// 피킹 지시 상태 완료 처리 
					po.setStatus(PickingOrder.STATUS_END);
					this.queryManager.update(PickingOrder.class, po);
					
					// 개별 출고인 경우 상태 변경 : 피킹 완료 
					ReleaseOrder ro = this.queryManager.selectBySql("select * from release_orders where domain_id = :domainId and wh_cd = :whCd and com_cd = :comCd and rls_ord_no = :waveNo", ValueUtil.newMap("domainId,whCd,comCd,waveNo", po.getDomainId(), po.getWhCd(), po.getComCd(), po.getWaveNo()), ReleaseOrder.class);
					
					if ( ValueUtil.isNotEmpty(ro) ) {
						ReleaseOrderController roCtrl = BeanUtil.get(ReleaseOrderController.class);
						
						// 실적 보고 수량 처리
						StringBuffer query = new StringBuffer();
						query.append(" ")
						.append(" with po_data as ( ")
						.append(" 	select po.id as po_id ")
						.append(" 	     , poi.id as poi_id ")
						.append(" 	     , poi.sku_cd ")
						.append(" 	     , poi.pick_qty ")
						.append(" 	     , poi.inventory_id  ")
						.append(" 	  from picking_orders po  ")
						.append(" 	  left join picking_order_items poi  ")
						.append(" 	    on po.id = poi.pick_order_id ")
						.append(" 	 where po.id = :poId ")
						.append(" ), inv_data as ( ")
						.append(" 	select p.* ")
						.append(" 	     , i.domain_id  ")
						.append(" 	     , i.wh_cd  ")
						.append(" 	     , i.com_cd  ")
						.append(" 	     , i.barcode  ")
						.append(" 	     , i.rls_ord_no ")
						.append(" 	     , i.rls_line_no ")
						.append(" 	     , i.inv_qty  ")
						.append(" 	  from po_data p ")
						.append(" 	  left join inventories i  ")
						.append(" 	    on p.inventory_id = i.id ")
						.append(" ), ro_data as ( ")
						.append(" select ro.id as ro_id ")
						.append("      , ro.rls_ord_no ")
						.append("      , ro.domain_id ")
						.append("      , ro.com_cd ")
						.append("      , ro.wh_cd ")
						.append("      , roi.id as roi_id ")
						.append("      , roi.line_no ")
						.append("      , roi.sku_cd ")
						.append("      , roi.ord_qty ")
						.append("      , roi.rls_qty ")
						.append("      , roi.rpt_qty ")
						.append("   from release_orders ro  ")
						.append("   left join release_order_items roi  ")
						.append("     on ro.id = roi.release_order_id  ")
						.append("  where ro.id = :roId ")
						.append("    and roi.status != 'CANCEL' ")
						.append(" ) ")
						.append(" select r.rls_ord_no ")
						.append("      , r.line_no ")
						.append("      , r.sku_cd ")
						.append("      , r.ord_qty ")
						.append("      , sum(inv.pick_qty) over (partition by r.line_no) as pick_sum ")
						.append("      , r.rls_qty ")
						.append("      , inv.inv_qty ")
						.append("      , inv.pick_qty ")
						.append("      , r.ro_id as release_order_id ")
						.append("      , r.roi_id as release_order_item_id ")
						.append("      , inv.inventory_id ")
						.append("      , inv.po_id as picking_order_id ")
						.append("      , inv.poi_id as picking_order_item_id ")
						.append("   from ro_data r ")
						.append("   left join inv_data inv ")
						.append("     on r.rls_ord_no = inv.rls_ord_no ")
						.append("    and r.line_no = inv.rls_line_no ")
						.append("    and r.domain_id = inv.domain_id ")
						.append("    and r.wh_cd = inv.wh_cd  ")
						.append("    and r.com_cd = inv.com_cd  ")
						.append("  where r.domain_id = :domainId ")
						.append("    and r.wh_cd = :whCd ")
						.append("    and r.com_cd = :comCd ")
						.append("  order by line_no, pick_qty ");
						
						@SuppressWarnings({ "unused", "rawtypes" })
						List<Map> resultList = this.queryManager.selectListBySql(query.toString(), ValueUtil.newMap("poId,roId,domainId,whCd,comCd", po.getId(), ro.getId(), po.getDomainId(), po.getWhCd(), po.getComCd()), Map.class, 0, 0);
						/**
						 * rls_ord_no : 출고 주문 번호
						 * line_no : 주문 상세 라인 번호 
						 * sku_cd : 상품 코드 
						 * ord_qty : 주문 수량
						 * pick_sum : 상품 단위 피킹 수량 합계 
						 * rls_qty : 출고 수량 
						 * inv_qty : 재고 수량 
						 * pick_qty : 피킹 수
						 * release_order_id : 출고 주문 ID
						 * release_order_item_id : 출고 주문 상세 ID
						 * inventory_id : 재고 ID
						 * picking_order_id : 피킹 오더 ID
						 * picking_order_item_id : 피킹 오더 상세 ID
						 */
						String beforeRoItemId = "";
						ReleaseOrderItem roItem = null;
						boolean isNotEnd = false;
						List<ReleaseOrderItem> roItemList = new ArrayList<ReleaseOrderItem>();
//						List<Inventory> invList = new ArrayList<Inventory>();
						for ( Map<String, Object> result : resultList ) {
							if ( ValueUtil.isNotEqual(result.get("release_order_item_id"), beforeRoItemId) ) {
								// 이전 출고 주문 상세 ID 와 같지 않은 경우 
								if ( ValueUtil.isNotEmpty(roItem) ) {
									roItemList.add(roItem);
								}
								// 신규 객체 셋팅 
								beforeRoItemId = (String) result.get("release_order_item_id");
								
								roItem = roCtrl.findOneItem(beforeRoItemId);

								if ( ValueUtil.isEqual(roItem.getOrdQty(), ValueUtil.toDouble(result.get("pick_sum"))) ) {
									// 주문 수량과 출고 수량이 같은 경우 완료 처리 
									roItem.setStatus(ReleaseOrderItem.STATUS_END);
								} else {
									// 주문 수량과 피킹 수량 합계가 일치하지 않는 경우 미완료 설정 
									isNotEnd = true;
								}
							}
							
							// 출고 수량 처리 (출고 수량 = 현재 출고 수량 + 피킹 수량)
							if(roItem != null) {
							    roItem.setRlsQty(roItem.getRlsQty() + ValueUtil.toDouble(result.get("pick_qty"), 0.0));
							}
							
							/*
							// 재고 처리 
							Inventory inv = invCtrl.findOne(result.get("inventory_id").toString());
							// 재고 수량 = 현재 재고 수량 - 피킹 수량 
							inv.setInvQty(inv.getInvQty() - ValueUtil.toFloat(result.get("pick_qty")));
							if ( inv.getInvQty() == 0 ) {
								inv.setStatus(Inventory.STATUS_EMPTY);
								inv.setDelFlag(true);
								inv.setLastTranCd(Inventory.TRANSACTION_OUT);
							}
							invList.add(inv);
							*/
						}
						// 마지막 출고 상세 객체 추가 (마지막 수정된 내용은 for 문에서 추가되지 않음)
						roItemList.add(roItem);
						
						this.queryManager.updateBatch(ReleaseOrderItem.class, roItemList, "status", "rlsQty");
//						this.queryManager.updateBatch(Inventory.class, invList, "status", "invQty", "delFlag", "lastTranCd");
						
						if ( ! isNotEnd ) {
							// 미완료 항목이 없으면 완료 처리 
							ro.setStatus(ReleaseOrder.STATUS_PICKED);
							this.queryManager.update(ReleaseOrder.class, ro);
						}
						
					} else {
						// To-Do : 개별 출고가 아닌 경우 : WAVE
					}
				}
			} else if ( orgItem.getOrderQty() < input.getPickQty() ) {
				throw new ElidomRuntimeException("입력 수량이 주문 수량을 초과하였습니다.");
			} else {
				input.setStatus(PickingOrderItem.STATUS_RUN);
				input = this.updateOne(input);
			}
		} else {
			input.setStatus(PickingOrderItem.STATUS_WAIT);
			input = this.updateOne(input);
		}
		
		return input;
	}
    
    /**
	 * PickingOrder : 피킹 상태 값 변경
	 * 
	 * @param status
	 * @param list
	 * @return
	 */
	@RequestMapping(value = "/status_update/{status}", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "PickingOrder status update multiple at one time")
	public Boolean statusUpdate(
			@PathVariable("status") String status,
			@RequestBody List<PickingOrder> list) {
		
		if ( ValueUtil.isEmpty(list) || ValueUtil.isEmpty(status) ) {
			throw new ElidomRuntimeException("입력 값에 오류가 있습니다.");
		}
		
		for ( PickingOrder po : list ) {
			if ( ValueUtil.isEmpty(po.getId()) ) {
				throw new ElidomRuntimeException("입력 값에 오류가 있습니다.");
			}
			
			po.setStatus(status);
			
		}
		
		queryManager.updateBatch(PickingOrder.class, list, "status");
		
		return true;
	}
	
	/**
	 * PickingOrderItem : 피킹 상세 상태 값 변경
	 * @param status
	 * @param list
	 * @return
	 */
	@RequestMapping(value = "/item/status_update/{status}", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "ReleaseOrderItem status update multiple at one time")
	public Boolean statusUpdateItems(
			@PathVariable("status") String status,
			@RequestBody List<PickingOrderItem> list) {
		
		if ( ValueUtil.isEmpty(list) || ValueUtil.isEmpty(status) ) {
			throw new ElidomRuntimeException("입력 값에 오류가 있습니다.");
		}
		
		for ( PickingOrderItem item : list ) {
			
			if ( ValueUtil.isEmpty(item.getId()) ) {
				throw new ElidomRuntimeException("입력 값에 오류가 있습니다.");
			}
			
			item.setStatus(status);
		}
		
		queryManager.updateBatch(PickingOrderItem.class, list, "status");
		
		return true;
	}
}