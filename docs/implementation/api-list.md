# API 명세서

> Base URL: `/rest`
> 모든 응답은 `application/json`
> 공통 쿼리 파라미터: `page`, `limit`, `select`, `sort`, `query` (페이지네이션 검색용)

---

## 목차

- [입고 관리 (Inbound)](#입고-관리-inbound)
- [출고 관리 (Outbound)](#출고-관리-outbound)
- [재고 관리 (Stock)](#재고-관리-stock)

---

## 입고 관리 (Inbound)

### 1. 입고 예정 (Receivings) — `/rest/receivings`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/rest/receivings` | 입고 예정 목록 조회 (페이지네이션) |
| GET | `/rest/receivings/{id}` | 입고 예정 단건 조회 |
| GET | `/rest/receivings/{id}/exist` | 입고 예정 존재 여부 확인 |
| POST | `/rest/receivings` | 입고 예정 생성 |
| PUT | `/rest/receivings/{id}` | 입고 예정 수정 |
| DELETE | `/rest/receivings/{id}` | 입고 예정 삭제 (작성 중 상태만 가능) |
| POST | `/rest/receivings/update_multiple` | 입고 예정 다건 생성/수정/삭제 (작성 중 상태만 가능) |
| GET | `/rest/receivings/item/{id}` | 입고 예정 상세(ReceivingItem) 단건 조회 |
| GET | `/rest/receivings/{id}/items` | 입고 ID로 입고 상세 목록 조회 |
| POST | `/rest/receivings/{id}/items/update_multiple` | 입고 상세 다건 생성/수정/삭제 |

**상태 흐름:** `INWORK(작성 중)` → `REQUEST(요청)` → `READY(대기)` → `RUN(진행 중)` → `END(완료)`

---

### 2. 입고 주문 상태 (ReceivingOrderStatus) — `/rest/receiving_order_status`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/rest/receiving_order_status` | 입고 주문 상태 목록 조회 (페이지네이션) |
| GET | `/rest/receiving_order_status/{id}` | 입고 주문 상태 단건 조회 |

---

### 3. 입고 트랜잭션 (InboundTransaction) — `/rest/inbound_trx`

입고 프로세스 상태 전환 및 작업 처리 API

#### 3-1. 임포트

| Method | Path | 파라미터 | 설명 |
|--------|------|---------|------|
| POST | `/rest/inbound_trx/receiving_orders/import/excel` | Body: `List<ImportReceivingOrder>` | 엑셀 임포트로 입고 예정 생성 |

#### 3-2. 상태 전환

| Method | Path | 설명 | 상태 변화 |
|--------|------|------|-----------|
| POST | `/rest/inbound_trx/receiving_orders/{id}/request` | 입고 예정 요청 | INWORK → REQUEST |
| POST | `/rest/inbound_trx/receiving_orders/{id}/cancel_request` | 입고 요청 취소 | REQUEST → INWORK |
| POST | `/rest/inbound_trx/receiving_orders/{id}/accept` | 입고 접수 (확정) | REQUEST → READY |
| POST | `/rest/inbound_trx/receiving_orders/{id}/cancel_accept` | 입고 접수 취소 | READY → REQUEST |
| POST | `/rest/inbound_trx/receiving_orders/{id}/start` | 입고 작업 시작 | READY → RUN |
| POST | `/rest/inbound_trx/receiving_orders/{id}/cancel_start` | 입고 작업 시작 취소 | RUN → READY |
| POST | `/rest/inbound_trx/receiving_orders/{id}/close` | 입고 작업 마감 | RUN → END |

#### 3-3. 입고 라인 처리

| Method | Path | 파라미터 | 설명 | 상태 변화 |
|--------|------|---------|------|-----------|
| POST | `/rest/inbound_trx/receiving_orders/lines/finish` | Body: `{list: List<ReceivingItem>}`, Query: `printerId` | 입고 라인 리스트 완료 | START → END |
| POST | `/rest/inbound_trx/receiving_orders/line/{id}/finish` | Body: `ReceivingItem`, Query: `printerId` | 입고 라인 단건 완료 (ID 기반) | START → END |
| POST | `/rest/inbound_trx/receiving_orders/line/finish` | Body: `ReceivingItem`, Query: `printerId` | 입고 라인 단건 완료 (Body 기반) | START → END |
| POST | `/rest/inbound_trx/receiving_orders/lines/cancel_finish` | Body: `{list: List<ReceivingItem>}` | 입고 라인 리스트 완료 취소 | END → START |
| POST | `/rest/inbound_trx/receiving_orders/line/cancel_finish` | Body: `ReceivingItem` | 입고 라인 단건 완료 취소 | END → START |

#### 3-4. 작업 화면 조회

| Method | Path | 파라미터 | 설명 |
|--------|------|---------|------|
| GET | `/rest/inbound_trx/receivings/work_items` | Query: `rcv_no`, `not_completed`, `barcode` | 입고 작업 화면 - 입고 번호로 작업 상세 조회 |
| GET | `/rest/inbound_trx/putaway/work_items` | Query: `rcv_no`, `barcode` | 적치 작업 화면 - 입고 번호로 적치 예정 조회 |

#### 3-5. 출력물

| Method | Path | 파라미터 | 설명 |
|--------|------|---------|------|
| POST | `/rest/inbound_trx/receiving_orders/{id}/print_receiving_sheet` | Query: `template`, `printer_id` | 입고지시서 프린터 출력 |
| POST | `/rest/inbound_trx/receiving_orders/{id}/download_receiving_sheet` | Query: `template`, `printer_id` | 입고지시서 PDF 다운로드 |

---

## 출고 관리 (Outbound)

### 4. 출고 주문 (ReleaseOrders) — `/rest/release_orders`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/rest/release_orders` | 출고 주문 목록 조회 (페이지네이션) |
| GET | `/rest/release_orders/{id}` | 출고 주문 단건 조회 |
| GET | `/rest/release_orders/{id}/exist` | 출고 주문 존재 여부 확인 |
| POST | `/rest/release_orders` | 출고 주문 생성 |
| PUT | `/rest/release_orders/{id}` | 출고 주문 수정 |
| DELETE | `/rest/release_orders/{id}` | 출고 주문 삭제 (등록 중 상태만 가능) |
| POST | `/rest/release_orders/update_multiple` | 출고 주문 다건 생성/수정/삭제 (등록 중 상태만 가능) |
| GET | `/rest/release_orders/item/{id}` | 출고 주문 상세(ReleaseOrderItem) 단건 조회 |
| GET | `/rest/release_orders/{id}/items` | 출고 주문 ID로 상세 목록 조회 |
| POST | `/rest/release_orders/{id}/items/update_multiple` | 출고 주문 상세 다건 생성/수정/삭제 |
| GET | `/rest/release_orders/rls_exe_type/{rls_exe_type}` | 출고 실행 유형별 출고 주문 조회 |

**상태 흐름:** `REG(등록 중)` → `REQ(요청)` → `WAIT(접수)` → `RUN(작업 중)` → `PICKED(피킹 완료)` → `END(완료)` / `CANCEL(취소)`

---

### 5. 출고 주문 상태 (ReleaseOrderStatus) — `/rest/release_order_status`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/rest/release_order_status` | 출고 주문 상태 목록 조회 (페이지네이션) |
| GET | `/rest/release_order_status/{id}` | 출고 주문 상태 단건 조회 |

---

### 6. 피킹 주문 (PickingOrders) — `/rest/picking_orders`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/rest/picking_orders` | 피킹 주문 목록 조회 (페이지네이션) |
| GET | `/rest/picking_orders/{id}` | 피킹 주문 단건 조회 |
| GET | `/rest/picking_orders/{id}/exist` | 피킹 주문 존재 여부 확인 |
| POST | `/rest/picking_orders` | 피킹 주문 생성 |
| PUT | `/rest/picking_orders/{id}` | 피킹 주문 수정 |
| DELETE | `/rest/picking_orders/{id}` | 피킹 주문 삭제 |
| POST | `/rest/picking_orders/update_multiple` | 피킹 주문 다건 생성/수정/삭제 |
| GET | `/rest/picking_orders/item/{id}` | 피킹 주문 상세(PickingOrderItem) 단건 조회 |
| GET | `/rest/picking_orders/{id}/items` | 피킹 주문 ID로 상세 목록 조회 |
| POST | `/rest/picking_orders/{id}/items/update_multiple` | 피킹 주문 상세 다건 생성/수정/삭제 |
| GET | `/rest/picking_orders/item/operator/{id}` | 작업 화면용 피킹 상세 단건 조회 (입력값 초기화 포함) |
| PUT | `/rest/picking_orders/item/operator/{id}` | 작업 화면 피킹 처리 (바코드/로케이션/LOT 검증, 수량 입력) |
| POST | `/rest/picking_orders/status_update/{status}` | 피킹 주문 상태 일괄 변경 |
| POST | `/rest/picking_orders/item/status_update/{status}` | 피킹 주문 상세 상태 일괄 변경 |

---

### 7. 출고 트랜잭션 (OutboundTransaction) — `/rest/outbound_trx`

출고 프로세스 상태 전환 및 작업 처리 API

#### 7-1. 임포트

| Method | Path | 파라미터 | 설명 |
|--------|------|---------|------|
| POST | `/rest/outbound_trx/release_orders/import/excel/b2c` | Body: `List<ImportReleaseOrder>` | B2C 출고 주문 엑셀 임포트 |
| POST | `/rest/outbound_trx/release_orders/import/excel/b2b` | Body: `List<ImportReleaseOrder>` | B2B 출고 주문 엑셀 임포트 |

#### 7-2. 상태 전환 — 출고 주문

| Method | Path | 파라미터 | 설명 | 상태 변화 |
|--------|------|---------|------|-----------|
| POST | `/rest/outbound_trx/release_orders/request` | Body: `{list: List<ReleaseOrder>}` | 출고 주문 리스트 일괄 요청 | REG → REQ |
| POST | `/rest/outbound_trx/release_orders/{id}/request` | - | 출고 주문 단건 요청 | REG → REQ |
| POST | `/rest/outbound_trx/release_orders/cancel_request` | Body: `{list: List<ReleaseOrder>}` | 출고 요청 리스트 일괄 취소 | REQ → REG |
| POST | `/rest/outbound_trx/release_orders/{id}/cancel_request` | - | 출고 요청 단건 취소 | REQ → REG |
| POST | `/rest/outbound_trx/release_orders/classify` | Body: `{list: List<ReleaseOrder>}` | 출고 주문 대상 분류 처리 | - |
| POST | `/rest/outbound_trx/release_orders/{id}/accept` | - | 출고 주문 접수 | REQ → WAIT |
| POST | `/rest/outbound_trx/release_orders/{id}/cancel_accept` | - | 출고 주문 접수 취소 | WAIT → REQ |
| POST | `/rest/outbound_trx/release_orders/{id}/start` | - | 출고 작업 시작 | WAIT → RUN |
| POST | `/rest/outbound_trx/release_orders/{id}/cancel_start` | - | 출고 작업 시작 취소 | RUN → WAIT |
| POST | `/rest/outbound_trx/release_orders/{id}/close` | - | 출고 마감 | PICKED → END |
| POST | `/rest/outbound_trx/release_orders/{id}/close_by_params` | Body: `Map<String, Object>` | 파라미터 포함 출고 마감 | PICKED → END |
| POST | `/rest/outbound_trx/release_orders/{id}/cancel_picked` | - | 출고 주문 취소 | RUN → CANCEL |
| POST | `/rest/outbound_trx/release_orders/item/{id}/cancel_picked` | Body: `ReleaseOrderItem` | 출고 주문 라인 단건 취소 | END → CANCEL |

#### 7-3. 피킹 처리

| Method | Path | 파라미터 | 설명 |
|--------|------|---------|------|
| POST | `/rest/outbound_trx/picking_orders/{id}/start` | - | 피킹 지시 시작 |
| POST | `/rest/outbound_trx/picking_orders/pick` | Body: `{list: List<PickingOrderItem>}` | 피킹 아이템 처리 |
| POST | `/rest/outbound_trx/picking_orders/item/{pick_item_id}/{inventory_id}` | - | 재고 바코드로 피킹 처리 |

#### 7-4. 출고 라인 완료

| Method | Path | 파라미터 | 설명 |
|--------|------|---------|------|
| POST | `/rest/outbound_trx/release_orders/lines/finish` | Body: `{list: List<ReleaseOrderItem>}` | 출고 주문 라인 리스트 완료 |
| POST | `/rest/outbound_trx/release_orders/line/{release_order_item_id}/finish` | Body: `ReleaseOrderItem` | 출고 주문 라인 단건 완료 |

#### 7-5. 작업 화면 조회

| Method | Path | 파라미터 | 설명 |
|--------|------|---------|------|
| GET | `/rest/outbound_trx/release_orders/items` | Query: `rls_ord_no` | 출고 지시 번호로 출고 작업 상세 조회 |
| GET | `/rest/outbound_trx/releases/work_items` | Query: `rls_ord_no`, `not_completed`, `barcode` | 출고 작업 화면용 상세 조회 (remark 가공 포함) |
| GET | `/rest/outbound_trx/release_orders/items/{id}/inventories` | - | 출고 작업 상세 ID로 가용 재고 목록 조회 |

#### 7-6. 출력물

| Method | Path | 파라미터 | 설명 |
|--------|------|---------|------|
| POST | `/rest/outbound_trx/picking_orders/{id}/print_picking_sheet` | Query: `template`, `printer_id` | 피킹지시서 프린터 출력 (피킹 주문 ID) |
| POST | `/rest/outbound_trx/release_orders/{id}/print_picking_sheet` | Query: `template`, `printer_id` | 피킹지시서 프린터 출력 (출고 주문 ID) |
| POST | `/rest/outbound_trx/release_orders/{id}/print_release_sheet` | Query: `template`, `printer_id` | 거래명세서 프린터 출력 |
| POST | `/rest/outbound_trx/picking_orders/{id}/download_picking_sheet` | Query: `template`, `printer_id` | 피킹지시서 PDF 다운로드 (피킹 주문 ID) |
| POST | `/rest/outbound_trx/release_orders/{id}/download_picking_sheet` | Query: `template`, `printer_id` | 피킹지시서 PDF 다운로드 (출고 주문 ID) |
| POST | `/rest/outbound_trx/release_orders/{id}/download_release_sheet` | Query: `template`, `printer_id` | 거래명세서 PDF 다운로드 |

---

### 8. 출고 작업 뷰 (OutboundOrder) — `/rest/outbound_orders`

피킹/출고 작업 화면용 통합 뷰 (읽기 전용 성격)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/rest/outbound_orders` | 출고 작업 목록 조회 (페이지네이션) |
| GET | `/rest/outbound_orders/{id}` | 출고 작업 단건 조회 |
| GET | `/rest/outbound_orders/{id}/exist` | 존재 여부 확인 |
| POST | `/rest/outbound_orders` | 생성 |
| PUT | `/rest/outbound_orders/{id}` | 수정 |
| DELETE | `/rest/outbound_orders/{id}` | 삭제 |
| POST | `/rest/outbound_orders/update_multiple` | 다건 생성/수정/삭제 |

---

### 9. 보충 주문 (SupplyOrders) — `/rest/supply_orders`

출고 전 피킹 로케이션 재고 보충 지시

| Method | Path | 설명 |
|--------|------|------|
| GET | `/rest/supply_orders` | 보충 주문 목록 조회 (페이지네이션) |
| GET | `/rest/supply_orders/{id}` | 보충 주문 단건 조회 |
| GET | `/rest/supply_orders/{id}/exist` | 존재 여부 확인 |
| POST | `/rest/supply_orders` | 보충 주문 생성 |
| PUT | `/rest/supply_orders/{id}` | 보충 주문 수정 |
| DELETE | `/rest/supply_orders/{id}` | 보충 주문 삭제 |
| POST | `/rest/supply_orders/update_multiple` | 다건 생성/수정/삭제 |
| GET | `/rest/supply_orders/{id}/items` | 보충 주문 ID로 상세 목록 조회 |
| POST | `/rest/supply_orders/{id}/items/update_multiple` | 보충 주문 상세 다건 생성/수정/삭제 |

---

### 10. Wave — `/rest/waves`

복수 출고 주문 묶음 처리 단위

| Method | Path | 설명 |
|--------|------|------|
| GET | `/rest/waves` | Wave 목록 조회 (페이지네이션) |
| GET | `/rest/waves/{id}` | Wave 단건 조회 |
| GET | `/rest/waves/{id}/exist` | 존재 여부 확인 |
| POST | `/rest/waves` | Wave 생성 |
| PUT | `/rest/waves/{id}` | Wave 수정 |
| DELETE | `/rest/waves/{id}` | Wave 삭제 |
| POST | `/rest/waves/update_multiple` | 다건 생성/수정/삭제 |

---

### 11. 배송 정보 (DeliveryInfo) — `/rest/delivery_infos`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/rest/delivery_infos` | 배송 정보 목록 조회 (페이지네이션) |
| GET | `/rest/delivery_infos/{id}` | 배송 정보 단건 조회 |
| GET | `/rest/delivery_infos/{id}/exist` | 존재 여부 확인 |
| POST | `/rest/delivery_infos` | 배송 정보 생성 |
| PUT | `/rest/delivery_infos/{id}` | 배송 정보 수정 |
| DELETE | `/rest/delivery_infos/{id}` | 배송 정보 삭제 |
| POST | `/rest/delivery_infos/update_multiple` | 다건 생성/수정/삭제 |

---

## 재고 관리 (Stock)

### 12. 재고 (Inventories) — `/rest/inventories`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/rest/inventories` | 재고 목록 조회 (페이지네이션, 기본 del_flag=false 필터) |
| GET | `/rest/inventories/{id}` | 재고 단건 조회 |
| GET | `/rest/inventories/{id}/exist` | 존재 여부 확인 |
| POST | `/rest/inventories` | 재고 생성 |
| PUT | `/rest/inventories/{id}` | 재고 수정 |
| DELETE | `/rest/inventories/{id}` | 재고 삭제 |
| POST | `/rest/inventories/update_multiple` | 재고 다건 생성/수정/삭제 |
| PUT | `/rest/inventories/work/load/{id}` | PDA 작업 화면 - 적치 처리 단건 (로케이션 변경, 상태: 입고 대기 → 보관 중) |
| POST | `/rest/inventories/load/update_multiple` | 재고 적치 일괄 처리 (로케이션 입력된 항목 상태 변경: STORED) |
| POST | `/rest/inventories/adjust/update_multiple` | 재고 조정 일괄 처리 (수량 변경, 사유 필수, 0 이하 시 EMPTY 상태) |

---

### 13. 재고 트랜잭션 (InvTransaction) — `/rest/inventory_trx`

재고 비즈니스 트랜잭션 처리 (적치, 이동, 분할, 병합, 홀드, 조정 등)

| Method | Path | 파라미터 | 설명 |
|--------|------|---------|------|
| POST | `/rest/inventory_trx/put_away/list` | Body: `{list: List<InvTransaction>}` | 재고 적치 일괄 처리 |
| POST | `/rest/inventory_trx/put_away` | Body: `InvTransaction` | 재고 적치 단건 처리 (신규 재고 생성) |
| PUT | `/rest/inventory_trx/put_away/{inventory_id}` | Body: `InvTransaction` | 재고 적치 단건 처리 (기존 재고 ID 기반) |
| POST | `/rest/inventory_trx/{id}/move_inventory` | Body: `InvTransaction` | 재고 이동 (로케이션 변경) |
| POST | `/rest/inventory_trx/{id}/scrap_inventory` | Body: `InvTransaction` | 재고 폐기 로케이션 이동 |
| POST | `/rest/inventory_trx/{id}/split_inventory` | Body: `InvTransaction` | 재고 분할 |
| POST | `/rest/inventory_trx/{id}/merge_inventory` | Body: `InvTransaction` | 재고 병합 |
| POST | `/rest/inventory_trx/{id}/hold_inventory` | Body: `InvTransaction` | 재고 홀드 |
| POST | `/rest/inventory_trx/{id}/release_hold_inventory` | Body: `InvTransaction` | 재고 홀드 해제 |
| POST | `/rest/inventory_trx/{id}/adjust_inventory` | Body: `InvTransaction` | 재고 수량 조정 |

---

### 14. 재고 이력 (InventoryHist) — `/rest/inventory_hists`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/rest/inventory_hists` | 재고 이력 목록 조회 (페이지네이션) |
| GET | `/rest/inventory_hists/{id}` | 재고 이력 단건 조회 |
| GET | `/rest/inventory_hists/{id}/exist` | 존재 여부 확인 |
| POST | `/rest/inventory_hists` | 재고 이력 생성 |
| PUT | `/rest/inventory_hists/{id}` | 재고 이력 수정 |
| DELETE | `/rest/inventory_hists/{id}` | 재고 이력 삭제 |
| POST | `/rest/inventory_hists/update_multiple` | 재고 이력 다건 생성/수정/삭제 |
| GET | `/rest/inventory_hists/by_inventory_id/{inventory_id}` | 재고 ID로 동일 바코드 이력 조회 (최신순) |

---

### 15. 재고 실사 (Stocktakes) — `/rest/stocktakes`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/rest/stocktakes` | 재고 실사 목록 조회 (페이지네이션) |
| GET | `/rest/stocktakes/{id}` | 재고 실사 단건 조회 |
| GET | `/rest/stocktakes/{id}/exist` | 존재 여부 확인 |
| POST | `/rest/stocktakes` | 재고 실사 생성 |
| PUT | `/rest/stocktakes/{id}` | 재고 실사 수정 |
| DELETE | `/rest/stocktakes/{id}` | 재고 실사 삭제 (대기 상태만 가능) |
| DELETE | `/rest/stocktakes/item/{id}` | 재고 실사 상세 단건 삭제 |
| POST | `/rest/stocktakes/update_multiple` | 재고 실사 다건 생성/수정/삭제 (대기 상태만 가능) |
| GET | `/rest/stocktakes/{id}/items` | 재고 실사 ID로 상세 목록 조회 |
| POST | `/rest/stocktakes/{id}/items/update_multiple` | 재고 실사 상세 다건 생성/수정/삭제 |
| PUT | `/rest/stocktakes/{id}/start` | 재고 실사 시작 (WAIT → RUN) |
| PUT | `/rest/stocktakes/{id}/finish` | 재고 실사 완료 (RUN → END) |
| PUT | `/rest/stocktakes/{id}/cancel` | 재고 실사 취소 (→ CANCEL) |

---

## 공통 패턴

### 페이지네이션 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `page` | Integer | 페이지 번호 |
| `limit` | Integer | 페이지 당 건수 |
| `select` | String | 조회 필드 선택 |
| `sort` | String | 정렬 조건 (JSON 배열) |
| `query` | String | 검색 필터 (JSON 배열) |

### 응답 상태 코드

| 코드 | 설명 |
|------|------|
| 200 OK | 일반 성공 |
| 201 Created | 생성 성공 (POST 생성 API) |

### 커스텀 서비스 훅

트랜잭션 API는 전/후 처리 커스텀 서비스 훅을 지원합니다.
`diy-{모듈}-pre-{액션}` / `diy-{모듈}-post-{액션}` 형태로 커스터마이징 가능합니다.

| 모듈 | 예시 |
|------|------|
| 입고 | `diy-inb-pre-request-receiving`, `diy-inb-post-close-receiving` |
| 출고 | `diy-outb-pre-import-release`, `diy-outb-post-close-release` |
| 재고 | `diy-inv-pre-move-inventory`, `diy-inv-post-adjust-inventory` |
