update release_order_items
   set ord_qty = tot_ord_qty
     , rls_qty = 0
     , expired_date = null
     , barcode = null 
     , status = :status
     , loc_cd = null
     , updated_at = now()
 where domain_id = :domainId
   and release_order_id = :releaseOrderId
   #if($skuCd)
   and sku_cd = :skuCd 
   #end
   #if($lineNo)
   and line_no = :lineNo
   #end
   and rls_line_no = line_no