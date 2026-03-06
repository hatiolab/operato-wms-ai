select 
	r.domain_id, r.com_cd, r.wh_cd, ri.sku_cd, sum(ri.ord_qty) as inv_qty
from
	release_orders r
	inner join
	release_order_items ri
	on r.id = ri.release_order_id
where
	r.domain_id = :domainId
	and r.id = :releaseOrderId
group by
	r.domain_id, r.com_cd, r.wh_cd, ri.sku_cd