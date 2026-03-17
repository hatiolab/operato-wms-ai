-- ============================================================================
-- RWA 모듈 공통코드 Seed SQL
-- 대상 테이블: common_codes (마스터), common_code_details (상세)
-- :domain_id 플레이스홀더를 실제 도메인 ID로 치환하여 실행
-- ============================================================================


-- ============================================================================
-- 1. RWA_ORDER_STATUS — 반품 지시 상태
-- ============================================================================
INSERT INTO common_codes (id, domain_id, name, description, bundle, created_at, updated_at)
VALUES ('rwa-code-order-status', :domain_id, 'RWA_ORDER_STATUS', '반품 지시 상태', 'rwa', now(), now());

INSERT INTO common_code_details (id, domain_id, parent_id, name, description, rank) VALUES
('rwa-cd-status-01', :domain_id, 'rwa-code-order-status', 'REQUEST',    '반품 요청',   10),
('rwa-cd-status-02', :domain_id, 'rwa-code-order-status', 'APPROVED',   '승인',       20),
('rwa-cd-status-03', :domain_id, 'rwa-code-order-status', 'RECEIVING',  '입고 중',     30),
('rwa-cd-status-04', :domain_id, 'rwa-code-order-status', 'INSPECTING', '검수 중',     40),
('rwa-cd-status-05', :domain_id, 'rwa-code-order-status', 'INSPECTED',  '검수 완료',   50),
('rwa-cd-status-06', :domain_id, 'rwa-code-order-status', 'DISPOSED',   '처분 완료',   60),
('rwa-cd-status-07', :domain_id, 'rwa-code-order-status', 'COMPLETED',  '완료',       70),
('rwa-cd-status-08', :domain_id, 'rwa-code-order-status', 'CLOSED',     '마감',       80),
('rwa-cd-status-09', :domain_id, 'rwa-code-order-status', 'REJECTED',   '거부',       90),
('rwa-cd-status-10', :domain_id, 'rwa-code-order-status', 'CANCELLED',  '취소',      100);
