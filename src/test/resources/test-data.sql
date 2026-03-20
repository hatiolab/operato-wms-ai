-- VAS 모듈 테스트 데이터 초기화 스크립트

-- 도메인 (Domain)
INSERT INTO domains (id, name, domain_key, created_at, updated_at) VALUES
('1', 'Test Domain', 'test-domain', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 화주사 (Company)
INSERT INTO companies (id, domain_id, com_cd, com_nm, created_at, updated_at) VALUES
('comp-001', 1, 'TEST', '테스트 화주사', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 창고 (Warehouse)
INSERT INTO warehouses (id, domain_id, wh_cd, wh_nm, created_at, updated_at) VALUES
('wh-001', 1, 'WH01', '테스트 창고', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SKU (상품)
INSERT INTO skus (id, domain_id, com_cd, sku_cd, sku_nm, created_at, updated_at) VALUES
('sku-001', 1, 'TEST', 'MAT-001', '상자', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sku-002', 1, 'TEST', 'MAT-002', '리본', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sku-003', 1, 'TEST', 'MAT-003', '라벨', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sku-004', 1, 'TEST', 'SET-001', '선물세트 A', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- BOM (Bill of Materials)
INSERT INTO vas_boms (id, domain_id, bom_no, set_sku_cd, set_sku_nm, vas_type, status, com_cd, wh_cd, created_at, updated_at) VALUES
('bom-001', 1, 'BOM-20260320-001', 'SET-001', '선물세트 A', 'SET_ASSEMBLY', 'ACTIVE', 'TEST', 'WH01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- BOM 항목 (BOM Items)
INSERT INTO vas_bom_items (id, domain_id, vas_bom_id, bom_seq, sku_cd, sku_nm, material_type, unit_qty, created_at, updated_at) VALUES
('bom-item-001', 1, 'bom-001', 1, 'MAT-001', '상자', 'MAIN', 1.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('bom-item-002', 1, 'bom-001', 2, 'MAT-002', '리본', 'SUB', 1.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('bom-item-003', 1, 'bom-001', 3, 'MAT-003', '라벨', 'SUB', 2.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 로케이션 (Location)
INSERT INTO locations (id, domain_id, wh_cd, loc_cd, loc_type, created_at, updated_at) VALUES
('loc-001', 1, 'WH01', 'A-01-01-01', 'STORAGE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('loc-002', 1, 'WH01', 'A-01-01-02', 'STORAGE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('loc-003', 1, 'WH01', 'A-01-01-03', 'STORAGE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('loc-004', 1, 'WH01', 'B-01-01-01', 'VAS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('loc-005', 1, 'WH01', 'VAS-WORK-01', 'VAS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 재고 (Inventory)
INSERT INTO inventories (id, domain_id, com_cd, wh_cd, loc_cd, sku_cd, lot_no, inv_qty, status, created_at, updated_at) VALUES
('inv-001', 1, 'TEST', 'WH01', 'A-01-01-01', 'MAT-001', 'L20260315', 250.0, 'STORED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-002', 1, 'TEST', 'WH01', 'A-01-01-02', 'MAT-002', 'L20260310', 100.0, 'STORED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-003', 1, 'TEST', 'WH01', 'A-01-01-03', 'MAT-003', 'L20260318', 500.0, 'STORED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- VAS 주문 (VAS Order) - 테스트용 주문
INSERT INTO vas_orders (id, domain_id, vas_no, com_cd, wh_cd, bom_no, vas_type, order_qty, work_date, priority, status, created_at, updated_at) VALUES
('test-vas-order-id-001', 1, 'VAS-20260320-001', 'TEST', 'WH01', 'BOM-20260320-001', 'SET_ASSEMBLY', 100, '2026-03-21', 'HIGH', 'PLAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- VAS 주문 항목 (VAS Order Items) - BOM 기반 자재 전개
INSERT INTO vas_order_items (id, domain_id, vas_order_id, item_seq, sku_cd, sku_nm, material_type, req_qty, created_at, updated_at) VALUES
('test-vas-order-item-id-001', 1, 'test-vas-order-id-001', 1, 'MAT-001', '상자', 'MAIN', 100.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('item-001', 1, 'test-vas-order-id-001', 2, 'MAT-002', '리본', 'SUB', 100.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('item-002', 1, 'test-vas-order-id-001', 3, 'MAT-003', '라벨', 'SUB', 200.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- VAS 실적 (VAS Result) - 테스트용 실적
INSERT INTO vas_results (id, domain_id, vas_order_id, result_seq, result_type, set_sku_cd, set_sku_nm, result_qty, defect_qty, dest_loc_cd, lot_no, worker_id, work_date, created_at, updated_at) VALUES
('test-vas-result-id-001', 1, 'test-vas-order-id-001', 1, 'ASSEMBLY', 'SET-001', '선물세트 A', 95.0, 5.0, 'B-01-01-01', 'L20260320', 'worker01', '2026-03-20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

COMMIT;
