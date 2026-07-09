SELECT
    ss.*,
    v.vend_nm,
    c.com_nm,
    w.wh_nm
FROM
    supplier_shipments ss
LEFT JOIN vendors v ON ss.vend_cd = v.vend_cd AND ss.domain_id = v.domain_id
LEFT JOIN companies c ON ss.com_cd = c.com_cd AND ss.domain_id = c.domain_id
LEFT JOIN warehouses w ON ss.wh_cd = w.wh_cd AND ss.domain_id = w.domain_id
WHERE
    ss.domain_id = :domainId
