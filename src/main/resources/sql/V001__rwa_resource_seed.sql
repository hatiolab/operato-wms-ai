-- ============================================================================
-- RWA 모듈 Resource / ResourceColumn Seed 데이터
-- 실행 전 :domain_id 를 실제 도메인 ID로 치환하세요.
-- 예) sed -i 's/:domain_id/1/g' V001__rwa_resource_seed.sql
-- ============================================================================

-- ============================================================================
-- 1. entities (Resource) 테이블
-- ============================================================================

-- 1-1. RwaOrder (반품 지시)
INSERT INTO entities (id, domain_id, name, description, bundle, table_name, search_url, multi_save_url, id_type, title_field, desc_field, active, fixed_columns, created_at, updated_at)
VALUES (
  'rwa-entity-order-0001', :domain_id,
  'RwaOrder', '반품 지시', 'rwa', 'rwa_orders',
  '/rwa_orders', '/rwa_orders/update_multiple',
  'uuid', 'rwa_no', 'remarks', true, 3,
  now(), now()
);

-- 1-2. RwaOrderItem (반품 지시 상세)
INSERT INTO entities (id, domain_id, name, description, bundle, table_name, search_url, multi_save_url, id_type, title_field, desc_field, master_id, association, data_prop, ref_field, del_strategy, active, fixed_columns, created_at, updated_at)
VALUES (
  'rwa-entity-order-item-01', :domain_id,
  'RwaOrderItem', '반품 지시 상세', 'rwa', 'rwa_order_items',
  '/rwa_order_items', '/rwa_order_items/update_multiple',
  'uuid', 'skuCd', 'remarks',
  'rwa-entity-order-0001', 'one-to-many', 'items', 'rwa_order_id', 'destroy_all',
  true, 3,
  now(), now()
);

-- 1-3. RwaInspection (반품 검수)
INSERT INTO entities (id, domain_id, name, description, bundle, table_name, search_url, multi_save_url, id_type, title_field, master_id, association, data_prop, ref_field, del_strategy, active, fixed_columns, created_at, updated_at)
VALUES (
  'rwa-entity-inspection-01', :domain_id,
  'RwaInspection', '반품 검수', 'rwa', 'rwa_inspections',
  '/rwa_inspections', '/rwa_inspections/update_multiple',
  'uuid', 'inspSeq',
  'rwa-entity-order-item-01', 'one-to-many', 'inspections', 'rwa_order_item_id', 'destroy_all',
  true, 3,
  now(), now()
);

-- 1-4. RwaDisposition (반품 처분)
INSERT INTO entities (id, domain_id, name, description, bundle, table_name, search_url, multi_save_url, id_type, title_field, master_id, association, data_prop, ref_field, del_strategy, active, fixed_columns, created_at, updated_at)
VALUES (
  'rwa-entity-disposition-1', :domain_id,
  'RwaDisposition', '반품 처분', 'rwa', 'rwa_dispositions',
  '/rwa_dispositions', '/rwa_dispositions/update_multiple',
  'uuid', 'dispositionType',
  'rwa-entity-order-item-01', 'one-to-one', 'disposition', 'rwa_order_item_id', 'destroy_all',
  true, 3,
  now(), now()
);


-- ============================================================================
-- 2. entity_columns (ResourceColumn) 테이블
-- ============================================================================

-- ============================================================================
-- 2-1. RwaOrder 컬럼
-- ============================================================================
INSERT INTO entity_columns (id, domain_id, entity_id, name, description, rank, term, col_type, col_size, nullable, search_rank, sort_rank, grid_rank, grid_width, grid_align, grid_editor, uniq_rank, created_at, updated_at) VALUES
-- PK
('rwa-col-order-001', :domain_id, 'rwa-entity-order-0001', 'id',                'ID',              10,  'label.id',               'string',   40,   false, 0, 0,  0,   0,    'center', NULL,       0, now(), now()),
-- 주요 식별 필드
('rwa-col-order-002', :domain_id, 'rwa-entity-order-0001', 'rwa_no',            '반품 번호',        20,  'label.rwa_no',            'string',   30,   false, 1, 1,  1,   150,  'center', 'readonly', 1, now(), now()),
('rwa-col-order-003', :domain_id, 'rwa-entity-order-0001', 'rwa_req_no',        '반품 요청 번호',    30,  'label.rwa_req_no',        'string',   30,   true,  2, 0,  2,   140,  'center', NULL,       0, now(), now()),
('rwa-col-order-004', :domain_id, 'rwa-entity-order-0001', 'rwa_req_date',      '반품 요청 일자',    40,  'label.rwa_req_date',      'string',   10,   false, 3, 2,  3,   110,  'center', 'date',     0, now(), now()),
('rwa-col-order-005', :domain_id, 'rwa-entity-order-0001', 'rwa_end_date',      '반품 완료 일자',    50,  'label.rwa_end_date',      'string',   10,   true,  0, 0,  4,   110,  'center', 'date',     0, now(), now()),
('rwa-col-order-006', :domain_id, 'rwa-entity-order-0001', 'status',            '상태',             60,  'label.status',            'string',   20,   true,  4, 0,  5,   100,  'center', 'code',     0, now(), now()),
('rwa-col-order-007', :domain_id, 'rwa-entity-order-0001', 'rwa_type',          '반품 유형',         70,  'label.rwa_type',          'string',   30,   false, 5, 0,  6,   120,  'center', 'code',     0, now(), now()),
-- 기준정보 참조
('rwa-col-order-008', :domain_id, 'rwa-entity-order-0001', 'wh_cd',             '창고 코드',         80,  'label.wh_cd',             'string',   20,   true,  0, 0,  7,   100,  'center', NULL,       0, now(), now()),
('rwa-col-order-009', :domain_id, 'rwa-entity-order-0001', 'com_cd',            '화주사 코드',       90,  'label.com_cd',            'string',   20,   true,  6, 0,  8,   100,  'center', NULL,       0, now(), now()),
('rwa-col-order-010', :domain_id, 'rwa-entity-order-0001', 'vend_cd',           '공급사 코드',      100,  'label.vend_cd',           'string',   20,   true,  0, 0,  9,   100,  'center', NULL,       0, now(), now()),
('rwa-col-order-011', :domain_id, 'rwa-entity-order-0001', 'cust_cd',           '고객 코드',        110,  'label.cust_cd',           'string',   30,   true,  0, 0,  10,  100,  'center', NULL,       0, now(), now()),
('rwa-col-order-012', :domain_id, 'rwa-entity-order-0001', 'cust_nm',           '고객명',           120,  'label.cust_nm',           'string',  100,   true,  0, 0,  11,  120,  'left',   NULL,       0, now(), now()),
('rwa-col-order-013', :domain_id, 'rwa-entity-order-0001', 'order_no',          '원 주문 번호',     130,  'label.order_no',          'string',   30,   true,  0, 0,  12,  130,  'center', NULL,       0, now(), now()),
('rwa-col-order-014', :domain_id, 'rwa-entity-order-0001', 'invoice_no',        '인보이스 번호',    140,  'label.invoice_no',        'string',   30,   true,  0, 0,  13,  130,  'center', NULL,       0, now(), now()),
-- 담당/플래그
('rwa-col-order-015', :domain_id, 'rwa-entity-order-0001', 'mgr_id',            '담당자 ID',        150,  'label.mgr_id',            'string',   32,   true,  0, 0,  14,  100,  'center', NULL,       0, now(), now()),
('rwa-col-order-016', :domain_id, 'rwa-entity-order-0001', 'insp_flag',         '검수 여부',        160,  'label.insp_flag',         'boolean',  0,    true,  0, 0,  15,  80,   'center', 'checkbox', 0, now(), now()),
('rwa-col-order-017', :domain_id, 'rwa-entity-order-0001', 'qc_flag',           '품질검사 필요',    170,  'label.qc_flag',           'boolean',  0,    true,  0, 0,  16,  80,   'center', 'checkbox', 0, now(), now()),
-- 수량
('rwa-col-order-018', :domain_id, 'rwa-entity-order-0001', 'total_box',         '총 박스 수',       180,  'label.total_box',         'number',   0,    true,  0, 0,  17,  80,   'right',  'number',   0, now(), now()),
('rwa-col-order-019', :domain_id, 'rwa-entity-order-0001', 'total_pallet',      '총 팔레트 수',     190,  'label.total_pallet',      'number',   0,    true,  0, 0,  18,  80,   'right',  'number',   0, now(), now()),
-- 반품 사유
('rwa-col-order-020', :domain_id, 'rwa-entity-order-0001', 'return_reason',     '반품 사유 코드',   200,  'label.return_reason',     'string',   50,   true,  0, 0,  19,  120,  'center', NULL,       0, now(), now()),
('rwa-col-order-021', :domain_id, 'rwa-entity-order-0001', 'return_reason_desc','반품 사유 상세',   210,  'label.return_reason_desc','string',  500,   true,  0, 0,  0,   0,    'left',   'text',     0, now(), now()),
-- 차량/운전자
('rwa-col-order-022', :domain_id, 'rwa-entity-order-0001', 'car_no',            '차량 번호',        220,  'label.car_no',            'string',   30,   true,  0, 0,  0,   0,    'center', NULL,       0, now(), now()),
('rwa-col-order-023', :domain_id, 'rwa-entity-order-0001', 'driver_nm',         '운전자명',         230,  'label.driver_nm',         'string',   40,   true,  0, 0,  0,   0,    'center', NULL,       0, now(), now()),
('rwa-col-order-024', :domain_id, 'rwa-entity-order-0001', 'driver_tel',        '운전자 전화번호',  240,  'label.driver_tel',        'string',   20,   true,  0, 0,  0,   0,    'center', NULL,       0, now(), now()),
-- 승인/검수/처분 이력
('rwa-col-order-025', :domain_id, 'rwa-entity-order-0001', 'approved_by',       '승인자 ID',        250,  'label.approved_by',       'string',   32,   true,  0, 0,  20,  100,  'center', 'readonly', 0, now(), now()),
('rwa-col-order-026', :domain_id, 'rwa-entity-order-0001', 'approved_at',       '승인 일시',        260,  'label.approved_at',       'datetime',  0,   true,  0, 0,  21,  140,  'center', 'readonly', 0, now(), now()),
('rwa-col-order-027', :domain_id, 'rwa-entity-order-0001', 'inspected_by',      '검수자 ID',        270,  'label.inspected_by',      'string',   32,   true,  0, 0,  0,   0,    'center', 'readonly', 0, now(), now()),
('rwa-col-order-028', :domain_id, 'rwa-entity-order-0001', 'inspected_at',      '검수 완료 일시',   280,  'label.inspected_at',      'datetime',  0,   true,  0, 0,  0,   0,    'center', 'readonly', 0, now(), now()),
('rwa-col-order-029', :domain_id, 'rwa-entity-order-0001', 'disposed_by',       '처분 결정자 ID',   290,  'label.disposed_by',       'string',   32,   true,  0, 0,  0,   0,    'center', 'readonly', 0, now(), now()),
('rwa-col-order-030', :domain_id, 'rwa-entity-order-0001', 'disposed_at',       '처분 완료 일시',   300,  'label.disposed_at',       'datetime',  0,   true,  0, 0,  0,   0,    'center', 'readonly', 0, now(), now()),
-- 비고/확장
('rwa-col-order-031', :domain_id, 'rwa-entity-order-0001', 'remarks',           '비고',             310,  'label.remarks',           'string', 1000,   true,  0, 0,  22,  200,  'left',   'text',     0, now(), now()),
('rwa-col-order-032', :domain_id, 'rwa-entity-order-0001', 'attr01',            '확장 필드 1',      320,  'label.attr01',            'string',  100,   true,  0, 0,  0,   0,    'center', NULL,       0, now(), now()),
('rwa-col-order-033', :domain_id, 'rwa-entity-order-0001', 'attr02',            '확장 필드 2',      330,  'label.attr02',            'string',  100,   true,  0, 0,  0,   0,    'center', NULL,       0, now(), now()),
('rwa-col-order-034', :domain_id, 'rwa-entity-order-0001', 'attr03',            '확장 필드 3',      340,  'label.attr03',            'string',  100,   true,  0, 0,  0,   0,    'center', NULL,       0, now(), now()),
('rwa-col-order-035', :domain_id, 'rwa-entity-order-0001', 'attr04',            '확장 필드 4',      350,  'label.attr04',            'string',  100,   true,  0, 0,  0,   0,    'center', NULL,       0, now(), now()),
('rwa-col-order-036', :domain_id, 'rwa-entity-order-0001', 'attr05',            '확장 필드 5',      360,  'label.attr05',            'string',  100,   true,  0, 0,  0,   0,    'center', NULL,       0, now(), now());


-- ============================================================================
-- 2-2. RwaOrderItem 컬럼
-- ============================================================================
INSERT INTO entity_columns (id, domain_id, entity_id, name, description, rank, term, col_type, col_size, nullable, search_rank, sort_rank, grid_rank, grid_width, grid_align, grid_editor, uniq_rank, created_at, updated_at) VALUES
('rwa-col-item-001', :domain_id, 'rwa-entity-order-item-01', 'id',                'ID',               10,  'label.id',               'string',    40,  false, 0, 0,  0,   0,    'center', NULL,       0, now(), now()),
('rwa-col-item-002', :domain_id, 'rwa-entity-order-item-01', 'rwa_order_id',      '반품 지시 ID',     20,  'label.rwa_order_id',     'string',    40,  false, 0, 0,  0,   0,    'center', 'readonly', 0, now(), now()),
('rwa-col-item-003', :domain_id, 'rwa-entity-order-item-01', 'rwa_seq',           '반품 순번',        30,  'label.rwa_seq',          'number',     0,  false, 0, 1,  1,   60,   'right',  'readonly', 1, now(), now()),
('rwa-col-item-004', :domain_id, 'rwa-entity-order-item-01', 'status',            '상태',             40,  'label.status',           'string',    20,  true,  1, 0,  2,   100,  'center', 'code',     0, now(), now()),
('rwa-col-item-005', :domain_id, 'rwa-entity-order-item-01', 'sku_cd',            '상품 코드',        50,  'label.sku_cd',           'string',    30,  false, 2, 0,  3,   120,  'center', NULL,       0, now(), now()),
('rwa-col-item-006', :domain_id, 'rwa-entity-order-item-01', 'sku_nm',            '상품명',           60,  'label.sku_nm',           'string',   255,  true,  0, 0,  4,   180,  'left',   'readonly', 0, now(), now()),
('rwa-col-item-007', :domain_id, 'rwa-entity-order-item-01', 'rwa_req_qty',       '반품 요청 수량',   70,  'label.rwa_req_qty',      'number',     0,  false, 0, 0,  5,   90,   'right',  'number',   0, now(), now()),
('rwa-col-item-008', :domain_id, 'rwa-entity-order-item-01', 'rwa_qty',           '반품 실적 수량',   80,  'label.rwa_qty',          'number',     0,  true,  0, 0,  6,   90,   'right',  'number',   0, now(), now()),
('rwa-col-item-009', :domain_id, 'rwa-entity-order-item-01', 'good_qty',          '양품 수량',        90,  'label.good_qty',         'number',     0,  true,  0, 0,  7,   80,   'right',  'number',   0, now(), now()),
('rwa-col-item-010', :domain_id, 'rwa-entity-order-item-01', 'defect_qty',        '불량 수량',       100,  'label.defect_qty',       'number',     0,  true,  0, 0,  8,   80,   'right',  'number',   0, now(), now()),
('rwa-col-item-011', :domain_id, 'rwa-entity-order-item-01', 'disposed_qty',      '처분 완료 수량',  110,  'label.disposed_qty',     'number',     0,  true,  0, 0,  9,   90,   'right',  'readonly', 0, now(), now()),
('rwa-col-item-012', :domain_id, 'rwa-entity-order-item-01', 'box_qty',           '박스 수',         120,  'label.box_qty',          'number',     0,  true,  0, 0,  10,  60,   'right',  'number',   0, now(), now()),
('rwa-col-item-013', :domain_id, 'rwa-entity-order-item-01', 'pallet_qty',        '팔레트 수',       130,  'label.pallet_qty',       'number',     0,  true,  0, 0,  11,  60,   'right',  'number',   0, now(), now()),
('rwa-col-item-014', :domain_id, 'rwa-entity-order-item-01', 'loc_cd',            '입고 로케이션',   140,  'label.loc_cd',           'string',    20,  true,  0, 0,  12,  100,  'center', NULL,       0, now(), now()),
('rwa-col-item-015', :domain_id, 'rwa-entity-order-item-01', 'temp_loc_cd',       '임시 보관 위치',  150,  'label.temp_loc_cd',      'string',    20,  true,  0, 0,  0,   0,    'center', NULL,       0, now(), now()),
('rwa-col-item-016', :domain_id, 'rwa-entity-order-item-01', 'final_loc_cd',      '최종 로케이션',   160,  'label.final_loc_cd',     'string',    20,  true,  0, 0,  0,   0,    'center', NULL,       0, now(), now()),
('rwa-col-item-017', :domain_id, 'rwa-entity-order-item-01', 'item_type',         '아이템 유형',     170,  'label.item_type',        'string',    20,  true,  0, 0,  0,   0,    'center', NULL,       0, now(), now()),
('rwa-col-item-018', :domain_id, 'rwa-entity-order-item-01', 'lot_no',            '로트 번호',       180,  'label.lot_no',           'string',    30,  true,  3, 0,  13,  100,  'center', NULL,       0, now(), now()),
('rwa-col-item-019', :domain_id, 'rwa-entity-order-item-01', 'expired_date',      '유통기한',        190,  'label.expired_date',     'string',    10,  true,  0, 0,  14,  100,  'center', 'date',     0, now(), now()),
('rwa-col-item-020', :domain_id, 'rwa-entity-order-item-01', 'prd_date',          '제조일자',        200,  'label.prd_date',         'string',    10,  true,  0, 0,  0,   0,    'center', 'date',     0, now(), now()),
('rwa-col-item-021', :domain_id, 'rwa-entity-order-item-01', 'barcode',           '바코드',          210,  'label.barcode',          'string',    40,  true,  0, 0,  0,   0,    'center', NULL,       0, now(), now()),
('rwa-col-item-022', :domain_id, 'rwa-entity-order-item-01', 'orig_order_no',     '원 주문 번호',    220,  'label.orig_order_no',    'string',    30,  true,  4, 0,  15,  120,  'center', NULL,       0, now(), now()),
('rwa-col-item-023', :domain_id, 'rwa-entity-order-item-01', 'orig_order_seq',    '원 주문 순번',    230,  'label.orig_order_seq',   'number',     0,  true,  0, 0,  0,   0,    'right',  NULL,       0, now(), now()),
('rwa-col-item-024', :domain_id, 'rwa-entity-order-item-01', 'return_reason',     '반품 사유 코드',  240,  'label.return_reason',    'string',    50,  true,  0, 0,  16,  120,  'center', NULL,       0, now(), now()),
('rwa-col-item-025', :domain_id, 'rwa-entity-order-item-01', 'defect_type',       '불량 유형',       250,  'label.defect_type',      'string',    30,  true,  0, 0,  17,  100,  'center', 'code',     0, now(), now()),
('rwa-col-item-026', :domain_id, 'rwa-entity-order-item-01', 'defect_desc',       '불량 상세',       260,  'label.defect_desc',      'string',   500,  true,  0, 0,  0,   0,    'left',   'text',     0, now(), now()),
('rwa-col-item-027', :domain_id, 'rwa-entity-order-item-01', 'disposition_type',  '처분 유형',       270,  'label.disposition_type',  'string',   30,  true,  0, 0,  18,  100,  'center', 'code',     0, now(), now()),
('rwa-col-item-028', :domain_id, 'rwa-entity-order-item-01', 'disposition_reason','처분 사유',       280,  'label.disposition_reason','string',  500,  true,  0, 0,  0,   0,    'left',   'text',     0, now(), now()),
('rwa-col-item-029', :domain_id, 'rwa-entity-order-item-01', 'inspected_qty',     '검수 완료 수량',  290,  'label.inspected_qty',    'number',     0,  true,  0, 0,  19,  90,   'right',  'readonly', 0, now(), now()),
('rwa-col-item-030', :domain_id, 'rwa-entity-order-item-01', 'inspected_by',      '검수자 ID',       300,  'label.inspected_by',     'string',    32,  true,  0, 0,  0,   0,    'center', 'readonly', 0, now(), now()),
('rwa-col-item-031', :domain_id, 'rwa-entity-order-item-01', 'inspected_at',      '검수 일시',       310,  'label.inspected_at',     'datetime',   0,  true,  0, 0,  0,   0,    'center', 'readonly', 0, now(), now()),
('rwa-col-item-032', :domain_id, 'rwa-entity-order-item-01', 'remarks',           '비고',            320,  'label.remarks',          'string',  1000,  true,  0, 0,  20,  200,  'left',   'text',     0, now(), now()),
('rwa-col-item-033', :domain_id, 'rwa-entity-order-item-01', 'attr01',            '확장 필드 1',     330,  'label.attr01',           'string',   100,  true,  0, 0,  0,   0,    'center', NULL,       0, now(), now()),
('rwa-col-item-034', :domain_id, 'rwa-entity-order-item-01', 'attr02',            '확장 필드 2',     340,  'label.attr02',           'string',   100,  true,  0, 0,  0,   0,    'center', NULL,       0, now(), now()),
('rwa-col-item-035', :domain_id, 'rwa-entity-order-item-01', 'attr03',            '확장 필드 3',     350,  'label.attr03',           'string',   100,  true,  0, 0,  0,   0,    'center', NULL,       0, now(), now()),
('rwa-col-item-036', :domain_id, 'rwa-entity-order-item-01', 'attr04',            '확장 필드 4',     360,  'label.attr04',           'string',   100,  true,  0, 0,  0,   0,    'center', NULL,       0, now(), now()),
('rwa-col-item-037', :domain_id, 'rwa-entity-order-item-01', 'attr05',            '확장 필드 5',     370,  'label.attr05',           'string',   100,  true,  0, 0,  0,   0,    'center', NULL,       0, now(), now());


-- ============================================================================
-- 2-3. RwaInspection 컬럼
-- ============================================================================
INSERT INTO entity_columns (id, domain_id, entity_id, name, description, rank, term, col_type, col_size, nullable, search_rank, sort_rank, grid_rank, grid_width, grid_align, grid_editor, created_at, updated_at) VALUES
('rwa-col-insp-001', :domain_id, 'rwa-entity-inspection-01', 'id',                'ID',              10,  'label.id',              'string',    40,  false, 0, 0,  0,   0,    'center', NULL,       now(), now()),
('rwa-col-insp-002', :domain_id, 'rwa-entity-inspection-01', 'rwa_order_item_id', '반품 상세 ID',    20,  'label.rwa_order_item_id','string',   40,  false, 0, 0,  0,   0,    'center', 'readonly', now(), now()),
('rwa-col-insp-003', :domain_id, 'rwa-entity-inspection-01', 'insp_seq',          '검수 순번',       30,  'label.insp_seq',        'number',     0,  false, 0, 1,  1,   60,   'right',  'readonly', now(), now()),
('rwa-col-insp-004', :domain_id, 'rwa-entity-inspection-01', 'insp_type',         '검수 유형',       40,  'label.insp_type',       'string',    20,  true,  1, 0,  2,   100,  'center', 'code',     now(), now()),
('rwa-col-insp-005', :domain_id, 'rwa-entity-inspection-01', 'insp_by',           '검수자 ID',       50,  'label.insp_by',         'string',    32,  false, 2, 0,  3,   100,  'center', NULL,       now(), now()),
('rwa-col-insp-006', :domain_id, 'rwa-entity-inspection-01', 'insp_at',           '검수 일시',       60,  'label.insp_at',         'datetime',   0,  false, 0, 0,  4,   140,  'center', 'datetime', now(), now()),
('rwa-col-insp-007', :domain_id, 'rwa-entity-inspection-01', 'insp_qty',          '검수 수량',       70,  'label.insp_qty',        'number',     0,  false, 0, 0,  5,   80,   'right',  'number',   now(), now()),
('rwa-col-insp-008', :domain_id, 'rwa-entity-inspection-01', 'good_qty',          '양품 수량',       80,  'label.good_qty',        'number',     0,  false, 0, 0,  6,   80,   'right',  'number',   now(), now()),
('rwa-col-insp-009', :domain_id, 'rwa-entity-inspection-01', 'defect_qty',        '불량 수량',       90,  'label.defect_qty',      'number',     0,  false, 0, 0,  7,   80,   'right',  'number',   now(), now()),
('rwa-col-insp-010', :domain_id, 'rwa-entity-inspection-01', 'defect_type',       '불량 유형',      100,  'label.defect_type',     'string',    30,  true,  3, 0,  8,   100,  'center', 'code',     now(), now()),
('rwa-col-insp-011', :domain_id, 'rwa-entity-inspection-01', 'defect_grade',      '불량 등급',      110,  'label.defect_grade',    'string',    10,  true,  0, 0,  9,   80,   'center', NULL,       now(), now()),
('rwa-col-insp-012', :domain_id, 'rwa-entity-inspection-01', 'defect_desc',       '불량 상세',      120,  'label.defect_desc',     'string',  1000,  true,  0, 0,  10,  200,  'left',   'text',     now(), now()),
('rwa-col-insp-013', :domain_id, 'rwa-entity-inspection-01', 'photo_url',         '사진 URL',       130,  'label.photo_url',       'string',   500,  true,  0, 0,  0,   0,    'left',   NULL,       now(), now()),
('rwa-col-insp-014', :domain_id, 'rwa-entity-inspection-01', 'insp_result',       '검수 결과',      140,  'label.insp_result',     'string',    20,  true,  4, 0,  11,  80,   'center', 'code',     now(), now()),
('rwa-col-insp-015', :domain_id, 'rwa-entity-inspection-01', 'disposition',       '처분 권고',      150,  'label.disposition',     'string',    30,  true,  0, 0,  12,  100,  'center', 'code',     now(), now()),
('rwa-col-insp-016', :domain_id, 'rwa-entity-inspection-01', 'remarks',           '비고',           160,  'label.remarks',         'string',  1000,  true,  0, 0,  13,  200,  'left',   'text',     now(), now());


-- ============================================================================
-- 2-4. RwaDisposition 컬럼
-- ============================================================================
INSERT INTO entity_columns (id, domain_id, entity_id, name, description, rank, term, col_type, col_size, nullable, search_rank, sort_rank, grid_rank, grid_width, grid_align, grid_editor, created_at, updated_at) VALUES
('rwa-col-disp-001', :domain_id, 'rwa-entity-disposition-1', 'id',                'ID',              10,  'label.id',               'string',    40,  false, 0, 0,  0,   0,    'center', NULL,       now(), now()),
('rwa-col-disp-002', :domain_id, 'rwa-entity-disposition-1', 'rwa_order_item_id', '반품 상세 ID',    20,  'label.rwa_order_item_id','string',    40,  false, 0, 0,  0,   0,    'center', 'readonly', now(), now()),
('rwa-col-disp-003', :domain_id, 'rwa-entity-disposition-1', 'disposition_type',  '처분 유형',       30,  'label.disposition_type', 'string',    30,  false, 1, 0,  1,   120,  'center', 'code',     now(), now()),
('rwa-col-disp-004', :domain_id, 'rwa-entity-disposition-1', 'disposition_qty',   '처분 수량',       40,  'label.disposition_qty',  'number',     0,  false, 0, 0,  2,   90,   'right',  'number',   now(), now()),
-- 재입고
('rwa-col-disp-005', :domain_id, 'rwa-entity-disposition-1', 'restock_loc_cd',    '재입고 로케이션',  50,  'label.restock_loc_cd',  'string',    20,  true,  0, 0,  3,   110,  'center', NULL,       now(), now()),
('rwa-col-disp-006', :domain_id, 'rwa-entity-disposition-1', 'restock_by',        '재입고 처리자',    60,  'label.restock_by',      'string',    32,  true,  0, 0,  0,   0,    'center', NULL,       now(), now()),
('rwa-col-disp-007', :domain_id, 'rwa-entity-disposition-1', 'restock_at',        '재입고 일시',      70,  'label.restock_at',      'datetime',   0,  true,  0, 0,  0,   0,    'center', 'datetime', now(), now()),
-- 폐기
('rwa-col-disp-008', :domain_id, 'rwa-entity-disposition-1', 'scrap_loc_cd',      '폐기 로케이션',    80,  'label.scrap_loc_cd',    'string',    20,  true,  0, 0,  0,   0,    'center', NULL,       now(), now()),
('rwa-col-disp-009', :domain_id, 'rwa-entity-disposition-1', 'scrap_by',          '폐기 처리자',      90,  'label.scrap_by',        'string',    32,  true,  0, 0,  0,   0,    'center', NULL,       now(), now()),
('rwa-col-disp-010', :domain_id, 'rwa-entity-disposition-1', 'scrap_at',          '폐기 일시',       100,  'label.scrap_at',        'datetime',   0,  true,  0, 0,  0,   0,    'center', 'datetime', now(), now()),
('rwa-col-disp-011', :domain_id, 'rwa-entity-disposition-1', 'scrap_method',      '폐기 방법',       110,  'label.scrap_method',    'string',    30,  true,  0, 0,  0,   0,    'center', NULL,       now(), now()),
-- 수리
('rwa-col-disp-012', :domain_id, 'rwa-entity-disposition-1', 'repair_vend_cd',    '수리 업체 코드',  120,  'label.repair_vend_cd',  'string',    30,  true,  0, 0,  4,   100,  'center', NULL,       now(), now()),
('rwa-col-disp-013', :domain_id, 'rwa-entity-disposition-1', 'repair_cost',       '수리 비용',       130,  'label.repair_cost',     'number',     0,  true,  0, 0,  5,   90,   'right',  'number',   now(), now()),
('rwa-col-disp-014', :domain_id, 'rwa-entity-disposition-1', 'repair_status',     '수리 상태',       140,  'label.repair_status',   'string',    20,  true,  2, 0,  6,   100,  'center', 'code',     now(), now()),
-- 반송
('rwa-col-disp-015', :domain_id, 'rwa-entity-disposition-1', 'return_ship_no',    '반송 번호',       150,  'label.return_ship_no',  'string',    30,  true,  0, 0,  0,   0,    'center', NULL,       now(), now()),
('rwa-col-disp-016', :domain_id, 'rwa-entity-disposition-1', 'return_carrier',    '반송 운송사',     160,  'label.return_carrier',  'string',    30,  true,  0, 0,  0,   0,    'center', NULL,       now(), now()),
('rwa-col-disp-017', :domain_id, 'rwa-entity-disposition-1', 'return_shipped_at', '반송 일시',       170,  'label.return_shipped_at','datetime',  0,  true,  0, 0,  0,   0,    'center', 'datetime', now(), now()),
-- 재고 영향
('rwa-col-disp-018', :domain_id, 'rwa-entity-disposition-1', 'stock_impact_flag', '재고 영향',       180,  'label.stock_impact_flag','boolean',   0,  true,  0, 0,  7,   80,   'center', 'checkbox', now(), now()),
('rwa-col-disp-019', :domain_id, 'rwa-entity-disposition-1', 'stock_txn_id',      '재고 트랜잭션 ID',190,  'label.stock_txn_id',    'string',    40,  true,  0, 0,  0,   0,    'center', 'readonly', now(), now()),
-- 처분 공통
('rwa-col-disp-020', :domain_id, 'rwa-entity-disposition-1', 'disposed_by',       '처분 결정자',     200,  'label.disposed_by',     'string',    32,  false, 3, 0,  8,   100,  'center', NULL,       now(), now()),
('rwa-col-disp-021', :domain_id, 'rwa-entity-disposition-1', 'disposed_at',       '처분 일시',       210,  'label.disposed_at',     'datetime',   0,  false, 0, 1,  9,   140,  'center', 'datetime', now(), now()),
('rwa-col-disp-022', :domain_id, 'rwa-entity-disposition-1', 'disposition_reason','처분 사유',       220,  'label.disposition_reason','string',  500,  true,  0, 0,  10,  200,  'left',   'text',     now(), now()),
('rwa-col-disp-023', :domain_id, 'rwa-entity-disposition-1', 'financial_impact',  '재무 영향',       230,  'label.financial_impact', 'number',     0,  true,  0, 0,  11,  90,   'right',  'number',   now(), now()),
('rwa-col-disp-024', :domain_id, 'rwa-entity-disposition-1', 'remarks',           '비고',            240,  'label.remarks',         'string',  1000,  true,  0, 0,  12,  200,  'left',   'text',     now(), now());
