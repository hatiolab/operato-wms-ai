 with inv as (
   select id
        , sum(inv_qty) over(partition by sku_cd order by id) as inv_sum
        , rank() over (partition by sku_cd order by id) as inv_key
     from inventories i
    where domain_id = :domainId
      and wh_cd = :whCd
      and com_cd = :comCd
      and sku_cd = :skuCd
      and del_flag = false
      and status = 'STORED'
      and inv_qty > 0
      and expire_status = 'NORMAL'
    order by expired_date, inv_qty
 )
 select id, inv_sum as inv_qty
   from inv
  where inv_key <= (select min(inv_key) from inv where inv_sum >= :ordQty)