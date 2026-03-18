-- 반품 주문 재고 체크 서머리 조회
SELECT
    roi.id,
    roi.rwa_order_id,
    roi.rwa_seq,
    roi.sku_cd,
    roi.sku_nm,
    roi.return_qty,
    COALESCE(s.available_qty, 0) AS available_qty,
    CASE
        WHEN COALESCE(s.available_qty, 0) >= roi.return_qty THEN 'Y'
        ELSE 'N'
    END AS stock_available
FROM
    rwa_order_items roi
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
) s ON roi.sku_cd = s.sku_cd
WHERE
    roi.domain_id = :domainId
    AND roi.rwa_order_id = :rwaOrderId
ORDER BY
    roi.rwa_seq
