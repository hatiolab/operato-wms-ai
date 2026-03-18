-- VAS 자재 소요량 계산
SELECT
    voi.id,
    voi.vas_order_id,
    voi.vas_seq,
    voi.sku_cd,
    voi.sku_nm,
    voi.req_qty,
    voi.alloc_qty,
    voi.picked_qty,
    (voi.req_qty - COALESCE(voi.alloc_qty, 0)) AS remain_alloc_qty,
    (voi.alloc_qty - COALESCE(voi.picked_qty, 0)) AS remain_pick_qty,
    COALESCE(s.available_qty, 0) AS stock_available_qty
FROM
    vas_order_items voi
LEFT JOIN (
    SELECT
        sku_cd,
        SUM(available_qty) AS available_qty
    FROM
        stocks
    WHERE
        domain_id = :domainId
        AND com_cd = :comCd
        AND wh_cd = :whCd
    GROUP BY
        sku_cd
) s ON voi.sku_cd = s.sku_cd
WHERE
    voi.domain_id = :domainId
    AND voi.vas_order_id = :vasOrderId
ORDER BY
    voi.vas_seq
