update 
    release_order_items 
set 
    status = :status, 
    updated_at = now()
where 
    domain_id = :domainId 
    and release_order_id = :releaseOrderId
    #if($status != 'CANCEL')
    and status != 'CANCEL'
    #end