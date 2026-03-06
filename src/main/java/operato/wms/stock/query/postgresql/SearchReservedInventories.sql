select *
 from inventories i
 where domain_id = :domainId
   and wh_cd = :whCd
   and com_cd = :comCd
   and status = 'RESERVED'
   and del_flag = false
   and rls_ord_no = :rlsOrdNo
 order by 
 	rls_line_no asc