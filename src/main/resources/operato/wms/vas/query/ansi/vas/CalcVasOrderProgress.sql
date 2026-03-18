-- VAS 작업 지시 진행율 조회
SELECT
    vo.id,
    vo.vas_no,
    vo.plan_qty,
    vo.completed_qty,
    CASE
        WHEN vo.plan_qty > 0 THEN ROUND((vo.completed_qty / vo.plan_qty) * 100, 2)
        ELSE 0
    END AS progress_rate,
    CASE
        WHEN vo.completed_qty >= vo.plan_qty THEN 'COMPLETED'
        WHEN vo.completed_qty > 0 THEN 'IN_PROGRESS'
        ELSE 'PLAN'
    END AS calc_status
FROM
    vas_orders vo
WHERE
    vo.domain_id = :domainId
    AND vo.id = :vasOrderId
