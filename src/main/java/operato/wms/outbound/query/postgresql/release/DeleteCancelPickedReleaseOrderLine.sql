delete 
  from release_order_items roi 
 where domain_id = :domainId 
   and release_order_id = :releaseOrderId
   #if($skuCd)
   and sku_cd = :skuCd
   #end
   #if($lineNo)
   and line_no = :lineNo
   #end
   and rls_line_no != line_no