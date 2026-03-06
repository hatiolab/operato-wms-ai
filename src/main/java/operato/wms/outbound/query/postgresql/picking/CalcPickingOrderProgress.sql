select
	floor(((a.result * 100.0) / (b.plan * 100.0)) * 100) as  progress_rate
from
	(select :pickOrderId as id, count(id) as result from picking_order_items where pick_order_id = :pickOrderId and status = :status) a
	inner join
	(select :pickOrderId as id, count(id) as plan from picking_order_items where pick_order_id = :pickOrderId and status != 'CANCEL') b
	on a.id = b.id