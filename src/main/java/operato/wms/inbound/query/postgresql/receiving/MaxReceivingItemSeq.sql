select 
	coalesce(max(rcv_exp_seq) + 1, 1) as rcv_exp_seq 
	, coalesce(max(rcv_seq) + 1, 1) as rcv_seq 
from 
	receiving_items
where 
	receiving_id = :receivingId