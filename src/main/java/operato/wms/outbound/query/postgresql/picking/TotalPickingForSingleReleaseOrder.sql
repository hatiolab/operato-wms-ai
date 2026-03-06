select
	:domainId as domain_id,
	:whCd as wh_cd,
	:comCd as com_cd,
	:rlsOrdNo as wave_no,
	0 as order_seq,
	1 as plan_order,
	0.0 as progress_rate,
    count(distinct roi.sku_cd) as plan_sku, 
    sum(roi.ord_qty) as plan_pcs
 from 
    release_orders ro
    left join 
    release_order_items roi
        on ro.id = roi.release_order_id
        and ro.domain_id = :domainId
        and ro.wh_cd = :whCd
        and ro.com_cd = :comCd
        and ro.rls_ord_no = :rlsOrdNo