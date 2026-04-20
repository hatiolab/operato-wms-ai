select
	sum(i.inv_qty - COALESCE(i.reserved_qty, 0)) as inv_qty
from 
	inventories i
	inner join
	locations l
	on i.domain_id = l.domain_id and i.loc_cd = l.loc_cd
where 
	i.domain_id = :domainId
	and i.com_cd = :comCd
	and i.wh_cd = :whCd 
	and i.sku_cd = :skuCd
	and i.status = 'STORED'
	and (i.del_flag is null or i.del_flag = 'N')
	and l.loc_type = 'PICKABLE'
	and (l.restrict_type is null or l.restrict_type != 'OUT')
	and (l.del_flag is null or l.del_flag = 'N')
	#if($lotNo)
	and i.lot_no = :lotNo
	#end
	#if($prdDate)
	and i.prd_date = :prdDate
	#end
	#if($expiredDate)
	and i.expired_date = :expiredDate
	#end
	#if($zoneCd)
	and l.zone_cd = :zoneCd
	#end
	#if($locCd)
	and l.loc_cd = :locCd
	#end