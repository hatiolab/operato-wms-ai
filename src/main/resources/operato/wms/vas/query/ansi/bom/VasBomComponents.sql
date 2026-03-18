-- VAS BOM 구성품 조회
SELECT
    vbi.id,
    vbi.vas_bom_id,
    vbi.bom_seq,
    vbi.sku_cd,
    vbi.sku_nm,
    vbi.component_qty,
    vbi.unit,
    vb.set_sku_cd,
    vb.set_sku_nm,
    (vb.set_qty * vbi.component_qty) AS total_required_qty
FROM
    vas_bom_items vbi
INNER JOIN
    vas_boms vb ON vbi.vas_bom_id = vb.id AND vbi.domain_id = vb.domain_id
WHERE
    vbi.domain_id = :domainId
    AND vbi.vas_bom_id = :vasBomId
ORDER BY
    vbi.bom_seq
