delete 
  from receiving_items ri 
 where domain_id = :domainId 
   and receiving_id = :receivingId
   and sku_cd = :skuCd
   and rcv_exp_seq = :rcvExpSeq
   and rcv_seq != rcv_exp_seq