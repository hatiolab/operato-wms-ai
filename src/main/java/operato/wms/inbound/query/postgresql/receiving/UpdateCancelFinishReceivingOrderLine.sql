update receiving_items
   set rcv_exp_qty = total_exp_qty
     , rcv_qty = 0
     , expired_date = null
     , barcode = null 
     , status = 'START'
     , updated_at = now()
 where domain_id = :domainId
   and receiving_id = :receivingId 
   and sku_cd = :skuCd 
   and rcv_exp_seq = :rcvExpSeq 
   and rcv_seq = rcv_exp_seq