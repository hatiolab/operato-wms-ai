-- 반품 주문 라인 다음 순번 조회
SELECT
    COALESCE(MAX(rwa_seq), 0) + 1 AS next_seq
FROM
    rwa_order_items
WHERE
    domain_id = :domainId
    AND rwa_order_id = :rwaOrderId
