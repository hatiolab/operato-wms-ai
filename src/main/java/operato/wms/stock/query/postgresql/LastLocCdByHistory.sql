select loc_cd
  from inventory_hists ih 
 where domain_id = :domainId
   and barcode = :barcode
   and wh_cd = :whCd
   and com_cd = :comCd
   #if($status)
   and status = :status
   #end
 order by hist_seq desc
 limit 1