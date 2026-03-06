update
	receiving_items 
set
	status = :status, updated_at = now()
where 
	domain_id = :domainId 
	and receiving_id = :receivingId