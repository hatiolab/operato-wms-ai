 with po_data as (
 	select po.id as po_id
 	     , poi.id as poi_id
 	     , poi.sku_cd
 	     , poi.pick_qty
 	     , poi.inventory_id
 	  from picking_orders po
 	  left join picking_order_items poi
 	    on po.id = poi.pick_order_id
 	 where po.id = :poId
 ), inv_data as (
 	select p.*
 	     , i.domain_id
 	     , i.wh_cd
 	     , i.com_cd
 	     , i.barcode
 	     , i.rls_ord_no
 	     , i.rls_line_no
 	     , i.inv_qty
 	  from po_data p
 	  left join inventories i
 	    on p.inventory_id = i.id
 ), ro_data as (
 select ro.id as ro_id
      , ro.rls_ord_no
      , ro.domain_id
      , ro.com_cd
      , ro.wh_cd
      , roi.id as roi_id
      , roi.line_no
      , roi.sku_cd
      , roi.ord_qty
      , roi.rls_qty
      , roi.rpt_qty
   from release_orders ro
   left join release_order_items roi
     on ro.id = roi.release_order_id
  where ro.id = :roId
    and roi.status != 'CANCEL'
 )
 select
 	  r.roi_id as id
      , sum(inv.pick_qty) over (partition by r.line_no) as ord_qty
      , inv.pick_qty as rls_qty
   from ro_data r
   left join inv_data inv
     on r.rls_ord_no = inv.rls_ord_no
    and r.line_no = inv.rls_line_no
    and r.domain_id = inv.domain_id
    and r.wh_cd = inv.wh_cd
    and r.com_cd = inv.com_cd
  where r.domain_id = :domainId
    and r.wh_cd = :whCd
    and r.com_cd = :comCd
  order by line_no, pick_qty