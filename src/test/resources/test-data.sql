-- 통합 테스트 데이터 초기화 스크립트 (OMS + VAS 모듈)
-- domain_id = 15 (cdc) 사용

-- 화주사 (Company)
INSERT INTO companies (id, domain_id, com_cd, com_nm, created_at, updated_at) VALUES
('comp-001', 15, 'TEST', '테스트 화주사', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 창고 (Warehouse)
INSERT INTO warehouses (id, domain_id, wh_cd, wh_nm, created_at, updated_at) VALUES
('wh-001', 15, 'WH01', '테스트 창고', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- SKU (상품)
INSERT INTO sku (id, domain_id, com_cd, sku_cd, sku_nm, sku_barcd, created_at, updated_at) VALUES
('sku-001', 15, 'TEST', 'MAT-001', '상자', 'MAT-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sku-002', 15, 'TEST', 'MAT-002', '리본', 'MAT-002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sku-003', 15, 'TEST', 'MAT-003', '라벨', 'MAT-003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sku-004', 15, 'TEST', 'SET-001', '선물세트 A', 'SET-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sku-005', 15, 'TEST', 'SKU-001', '테스트 상품 1', 'SKU-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sku-006', 15, 'TEST', 'SKU-002', '테스트 상품 2', 'SKU-002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sku-007', 15, 'TEST', 'SKU-003', '테스트 상품 3', 'SKU-003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- BOM (Bill of Materials)
INSERT INTO vas_boms (id, domain_id, bom_no, set_sku_cd, set_sku_nm, vas_type, status, com_cd, wh_cd, created_at, updated_at) VALUES
('bom-001', 15, 'BOM-20260320-001', 'SET-001', '선물세트 A', 'SET_ASSEMBLY', 'ACTIVE', 'TEST', 'WH01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- BOM 항목 (BOM Items)
INSERT INTO vas_bom_items (id, domain_id, vas_bom_id, bom_seq, sku_cd, sku_nm, material_type, unit_qty, created_at, updated_at) VALUES
('bom-item-001', 15, 'bom-001', 1, 'MAT-001', '상자', 'MAIN', 1.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('bom-item-002', 15, 'bom-001', 2, 'MAT-002', '리본', 'SUB', 1.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('bom-item-003', 15, 'bom-001', 3, 'MAT-003', '라벨', 'SUB', 2.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 로케이션 (Location)
INSERT INTO locations (id, domain_id, wh_cd, loc_cd, loc_type, created_at, updated_at) VALUES
('loc-001', 15, 'WH01', 'A-01-01-01', 'STORAGE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('loc-002', 15, 'WH01', 'A-01-01-02', 'STORAGE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('loc-003', 15, 'WH01', 'A-01-01-03', 'STORAGE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('loc-004', 15, 'WH01', 'B-01-01-01', 'VAS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('loc-005', 15, 'WH01', 'VAS-WORK-01', 'VAS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 재고 (Inventory)
INSERT INTO inventories (id, domain_id, com_cd, wh_cd, loc_cd, sku_cd, lot_no, inv_qty, status, created_at, updated_at) VALUES
('inv-001', 15, 'TEST', 'WH01', 'A-01-01-01', 'MAT-001', 'L20260315', 250.0, 'STORED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-002', 15, 'TEST', 'WH01', 'A-01-01-02', 'MAT-002', 'L20260310', 100.0, 'STORED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-003', 15, 'TEST', 'WH01', 'A-01-01-03', 'MAT-003', 'L20260318', 500.0, 'STORED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-004', 15, 'TEST', 'WH01', 'A-01-01-01', 'SKU-001', 'L20260320', 1000.0, 'STORED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-005', 15, 'TEST', 'WH01', 'A-01-01-02', 'SKU-002', 'L20260320', 800.0, 'STORED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-006', 15, 'TEST', 'WH01', 'A-01-01-03', 'SKU-003', 'L20260320', 600.0, 'STORED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- OMS 모듈 테스트 데이터
-- ========================================

-- 출하 주문 (Shipment Orders)
INSERT INTO shipment_orders (id, domain_id, shipment_no, ref_order_no, com_cd, wh_cd, cust_cd, cust_nm, order_date, ship_by_date, biz_type, ship_type, pick_method, dlv_type, priority_cd, status, total_item, total_order, created_at, updated_at) VALUES
('test-shipment-order-id-001', 15, 'SO-20260330-0001', 'DO-20260330-0001', 'TEST', 'WH01', 'CUST001', '테스트 고객 1', '2026-03-30', '2026-03-31', 'B2C_OUT', 'NORMAL', 'WCS', 'PARCEL', 'NORMAL', 'CONFIRMED', 3, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('test-order-001', 15, 'SO-20260330-0002', 'DO-20260330-0002', 'TEST', 'WH01', 'CUST002', '테스트 고객 2', '2026-03-30', '2026-03-31', 'B2C_OUT', 'NORMAL', 'WCS', 'PARCEL', 'NORMAL', 'CONFIRMED', 2, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('test-order-002', 15, 'SO-20260330-0003', 'DO-20260330-0003', 'TEST', 'WH01', 'CUST003', '테스트 고객 3', '2026-03-30', '2026-03-31', 'B2C_OUT', 'NORMAL', 'WCS', 'PARCEL', 'HIGH', 'CONFIRMED', 2, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('test-order-003', 15, 'SO-20260330-0004', 'DO-20260330-0004', 'TEST', 'WH01', 'CUST004', '테스트 고객 4', '2026-03-30', '2026-03-31', 'B2C_OUT', 'NORMAL', 'WCS', 'PARCEL', 'NORMAL', 'REGISTERED', 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('test-shipment-order-id-002', 15, 'SO-20260330-0005', 'DO-20260330-0005', 'TEST', 'WH01', 'CUST005', '테스트 고객 5', '2026-03-30', '2026-03-31', 'B2C_OUT', 'NORMAL', 'WCS', 'PARCEL', 'NORMAL', 'REGISTERED', 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 출하 주문 항목 (Shipment Order Items)
INSERT INTO shipment_order_items (id, domain_id, shipment_order_id, line_no, sku_cd, sku_nm, order_qty, alloc_qty, short_qty, created_at, updated_at) VALUES
('test-order-item-001', 15, 'test-shipment-order-id-001', '1', 'SKU-001', '테스트 상품 1', 5.0, 5.0, 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('test-order-item-002', 15, 'test-shipment-order-id-001', '2', 'SKU-002', '테스트 상품 2', 3.0, 3.0, 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('test-order-item-003', 15, 'test-shipment-order-id-001', '3', 'SKU-003', '테스트 상품 3', 2.0, 2.0, 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('item-004', 15, 'test-order-001', '1', 'SKU-001', '테스트 상품 1', 4.0, 4.0, 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('item-005', 15, 'test-order-001', '2', 'SKU-002', '테스트 상품 2', 4.0, 4.0, 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('item-006', 15, 'test-order-002', '1', 'SKU-002', '테스트 상품 2', 3.0, 3.0, 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('item-007', 15, 'test-order-002', '2', 'SKU-003', '테스트 상품 3', 4.0, 4.0, 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('item-008', 15, 'test-order-003', '1', 'SKU-001', '테스트 상품 1', 5.0, 0.0, 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 배송 정보 (Shipment Deliveries)
INSERT INTO shipment_deliveries (id, domain_id, shipment_order_id, shipment_no, receiver_nm, receiver_phone, receiver_post, receiver_addr1, receiver_addr2, dlv_memo, created_at, updated_at) VALUES
('test-delivery-001', 15, 'test-shipment-order-id-001', 'SO-20260330-0001', '김철수', '010-1234-5678', '12345', '서울시 강남구', '테헤란로 123', '문 앞에 놔주세요', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('delivery-002', 15, 'test-order-001', 'SO-20260330-0002', '이영희', '010-2345-6789', '23456', '서울시 서초구', '서초대로 234', '경비실에 맡겨주세요', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 출하 웨이브 (Shipment Waves)
INSERT INTO shipment_waves (id, domain_id, wave_no, wave_date, wave_seq, com_cd, wh_cd, pick_type, ship_type, pick_method, status, order_count, sku_count, total_qty, created_at, updated_at) VALUES
('test-wave-id-001', 15, 'WV-20260330-001', '2026-03-30', 1, 'TEST', 'WH01', 'TOTAL', 'NORMAL', 'WCS', 'CREATED', 3, 3, 25.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('already-released-wave-id', 15, 'WV-20260330-002', '2026-03-30', 2, 'TEST', 'WH01', 'TOTAL', 'NORMAL', 'WCS', 'RELEASED', 0, 0, 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 재고 할당 (Stock Allocations)
INSERT INTO stock_allocations (id, domain_id, shipment_order_id, shipment_no, line_no, sku_cd, alloc_qty, loc_cd, lot_no, com_cd, wh_cd, status, created_at, updated_at) VALUES
('alloc-001', 15, 'test-shipment-order-id-001', 'SO-20260330-0001', '1', 'SKU-001', 5.0, 'A-01-01-01', 'L20260320', 'TEST', 'WH01', 'ALLOCATED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('alloc-002', 15, 'test-shipment-order-id-001', 'SO-20260330-0001', '2', 'SKU-002', 3.0, 'A-01-01-02', 'L20260320', 'TEST', 'WH01', 'ALLOCATED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 보충 지시 (Replenish Orders)
INSERT INTO replenish_orders (id, domain_id, replenish_no, com_cd, wh_cd, from_loc_cd, to_loc_cd, sku_cd, req_qty, status, created_at, updated_at) VALUES
('test-replenish-id-001', 15, 'RPL-20260330-001', 'TEST', 'WH01', 'A-01-01-01', 'B-01-01-01', 'SKU-001', 100.0, 'READY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- VAS 모듈 테스트 데이터
-- ========================================

-- VAS 주문 (VAS Order) - 테스트용 주문
INSERT INTO vas_orders (id, domain_id, vas_no, com_cd, wh_cd, bom_no, vas_type, order_qty, work_date, priority, status, created_at, updated_at) VALUES
('test-vas-order-id-001', 15, 'VAS-20260320-001', 'TEST', 'WH01', 'BOM-20260320-001', 'SET_ASSEMBLY', 100, '2026-03-21', 'HIGH', 'PLAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- VAS 주문 항목 (VAS Order Items) - BOM 기반 자재 전개
INSERT INTO vas_order_items (id, domain_id, vas_order_id, item_seq, sku_cd, sku_nm, material_type, req_qty, created_at, updated_at) VALUES
('test-vas-order-item-id-001', 15, 'test-vas-order-id-001', 1, 'MAT-001', '상자', 'MAIN', 100.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('item-001', 15, 'test-vas-order-id-001', 2, 'MAT-002', '리본', 'SUB', 100.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('item-002', 15, 'test-vas-order-id-001', 3, 'MAT-003', '라벨', 'SUB', 200.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- VAS 실적 (VAS Result) - 테스트용 실적
INSERT INTO vas_results (id, domain_id, vas_order_id, result_seq, result_type, set_sku_cd, set_sku_nm, result_qty, defect_qty, dest_loc_cd, lot_no, worker_id, work_date, created_at, updated_at) VALUES
('test-vas-result-id-001', 15, 'test-vas-order-id-001', 1, 'ASSEMBLY', 'SET-001', '선물세트 A', 95.0, 5.0, 'B-01-01-01', 'L20260320', 'worker01', '2026-03-20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

COMMIT;
