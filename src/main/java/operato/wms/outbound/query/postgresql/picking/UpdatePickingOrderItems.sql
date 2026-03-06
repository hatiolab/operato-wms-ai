update 
    picking_order_items 
set 
    status = :status, 
    updated_at = now()
where 
    pick_order_id = :pickingOrderId