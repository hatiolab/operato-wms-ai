select
	i.*
from 
	inventories i
	inner join
	locations l
	on i.domain_id = l.domain_id and i.loc_cd = l.loc_cd
where 
	i.domain_id = :domainId
	#if($comCd)
	and i.com_cd = :comCd
	#end
	#if($whCd)
	and i.wh_cd = :whCd
	#end
	#if($skuCd) 
	and i.sku_cd = :skuCd
	#end
	#if($barcode)
	and i.barcode = :barcode
	#end
	and i.status = 'STORED'
	and l.loc_type in ('STORE', 'PICKABLE')
	and (l.restrict_type is null or l.restrict_type != 'OUT')
	and i.del_flag = false
	and l.del_flag = false
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