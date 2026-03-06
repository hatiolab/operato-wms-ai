select 
	coalesce(max(line_no)::int + 1, 1) as next_line_no 
from 
	release_order_items roi 
where 
	domain_id = :domainId 
	and release_order_id = :releaseOrderId