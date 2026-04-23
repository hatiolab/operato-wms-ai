# 사방넷 풀필먼트 API 레퍼런스 v2.0

> 원본 문서: `사방넷_개발가이드_ver2.pdf`  
> 연동 서비스 위치: `src/main/java/operato/wms/oms/service/sabangnet/`

---

## 목차

1. [기본 개요](#1-기본-개요)
2. [인증](#2-인증)
3. [공통 코드](#3-공통-코드)
4. [상품 — 출고상품 (Shipping Product)](#4-상품--출고상품-shipping-product)
5. [상품 — 판매상품 (Sales Product)](#5-상품--판매상품-sales-product)
6. [상품 — 상품연결 (Product Mapping)](#6-상품--상품연결-product-mapping)
7. [재고](#7-재고)
8. [입고](#8-입고)
9. [발주 (출고 주문)](#9-발주-출고-주문)
10. [출고 (릴리즈)](#10-출고-릴리즈)
11. [운송장](#11-운송장)
12. [반품](#12-반품)
13. [관리](#13-관리)

---

## 1. 기본 개요

### API 기본 정보

| 항목 | 값 |
|------|-----|
| API 버전 | v2.0 |
| 프로토콜 | REST / JSON |
| Host (Sandbox) | `napi.sbfulfillment.co.kr` |
| Host (LIVE) | `napi.sbfulfillment.co.kr` |
| 기본 URI 패턴 | `/v2/{기본구분코드}/{세부구분코드}` |
| 문의 | fbs_dev@daou.co.kr |

> Sandbox와 LIVE 호스트가 동일하므로, **Authorization 헤더 값**으로 환경을 구분한다.

### Method 규칙

| Method | 역할 |
|--------|------|
| `GET` | 조회 |
| `POST` | 등록 (단일 또는 벌크) |
| `PUT` | 수정 |
| `PATCH` | 부분 처리 (취소 등) |

### URI 패턴

| 구분 | Method | URI |
|------|--------|-----|
| 기본 | - | `/v2/{기본구분코드}/{세부구분코드}` |
| 등록 (단일) | POST | `/v2/{기본구분코드}/{세부구분코드}` |
| 수정 | PUT | `/v2/{기본구분코드}/{세부구분코드}/{PK}` |
| 조회 (단일) | GET | `/v2/{기본구분코드}/{세부구분코드}/{PK}` |
| 등록 (벌크) | POST | `/v2/{기본구분코드}/{세부구분코드복수형}` |
| 조회 (벌크) | GET | `/v2/{기본구분코드}/{세부구분코드복수형}` |

### 벌크 등록 요청 본문

```json
{
  "request_data_list": [ /* 등록 대상 object 리스트 */ ]
}
```

### 공통 응답 포맷

```json
{
  "code": "9999",
  "message": "ok",
  "response": { /* 응답 본문 */ }
}
```

> **성공 코드: `"9999"`**

### 벌크 조회 응답 (`response` 내부)

```json
{
  "total_count": 100,
  "total_page": 10,
  "current_page": 1,
  "data_list": [ /* 데이터 리스트 */ ]
}
```

### 벌크 등록 응답 (`response` 내부)

```json
{
  "processed_count": 2,
  "processed_data_list": [ /* 처리 완료 리스트 */ ]
}
```

### API 사용 권한

- 물류사(WMS) 전용 API와 고객사/물류사 공통 API로 분리됨
- 물류사 권한으로 API 호출 시 `member_id`(고객사 ID) 파라미터 **필수**

---

## 2. 인증

모든 API 요청 헤더에 아래 3개 값을 **필수** 포함해야 한다.

### 헤더 구성

| 헤더 | 값 | 설명 |
|------|-----|------|
| `Authorization` | `LIVE-HMAC-SHA256` | 운영 환경 |
| | `API.SENDBOX-HMAC-SHA256` | 샌드박스 환경 |
| | `[지정코드]-HMAC-SHA256` | 단독 서버 |
| `Credential` | `<회사코드>/<api-access-key>/<YYYYMMDD>/srwms_request` | 인증 구분값 |
| `Signature` | `<서명값>` | HMAC-SHA256 서명 |

### Signature 생성 규칙

```
Datekey  = HMAC-SHA256(key=secretKey,  message=YYYYMMDD)   → Hex 문자열
Signkey  = HMAC-SHA256(key=Datekey,    message=accessKeyId) → Hex 문자열
Signature = BASE64ENCODE(Signkey의 UTF-8 bytes)
```

> 날짜(YYYYMMDD)가 바뀌면 Signature 값이 매일 변경된다.

### Java 구현 예시

```java
// 1단계: DateKey (Hex)
String dateKey = hmacSha256Hex(ymd, secretKey.getBytes(UTF_8));

// 2단계: SignKey (Hex)
String signKey = hmacSha256Hex(accessKeyId, dateKey.getBytes(UTF_8));

// 3단계: Signature (Base64)
String signature = Base64.getEncoder().encodeToString(signKey.getBytes(UTF_8));
```

### RuntimeConfig 설정 키

| 설정 키 | 설명 |
|---------|------|
| `oms.sabangnet.access.key` | API Access Key |
| `oms.sabangnet.secret.key` | API Secret Key |
| `oms.sabangnet.company.code` | Credential 헤더의 회사코드 |
| `oms.sabangnet.env` | `LIVE` 또는 `SANDBOX` |

---

## 3. 공통 코드

### 발주 진행상태 (`order_status`)

| 코드 | 설명 |
|------|------|
| `1` | 출고요청전 |
| `3` | 출고요청 |
| `5` | 송장등록완료 |
| `7` | 출고완료 |
| `9` | 출고취소 |

### 배송방식 (`shipping_method_id` / `shipping_type_code`)

| 코드 | 설명 |
|------|------|
| `1` | 택배 |
| `2` | 직송 |
| `3` | 새벽배송 |
| `4` | 당일배송 |

### 입고예정 진행상태 (`plan_status`)

| 코드 | 설명 |
|------|------|
| `1` | 입고예정 |
| `2` | 입고검수중 |
| `3` | 입고완료 |
| `4` | 입고취소 |

### 입고예정 상품 입고상태 (`plan_product_status`)

| 코드 | 설명 |
|------|------|
| `1` | 미입고 |
| `3` | 부분입고 |
| `5` | 입고완료 |
| `9` | 취소 |

### 입고분류 타입 (`receiving_type`)

| 코드 | 설명 |
|------|------|
| `1` | 입고예정검수 |
| `3` | 개별입고 |
| `5` | 간편입고 |
| `7` | 전수검사 |
| `9` | 엑셀입고 |

### 입고작업 구분 (`work_type`)

| 코드 | 설명 |
|------|------|
| `1` | 입고 |
| `3` | 적치 |
| `5` | 회송 |
| `7` | 반품입고 |
| `9` | 입고취소 |

### 출고 진행상태 (`release_status`)

| 코드 | 설명 |
|------|------|
| `1` | 출고요청 |
| `3` | 출고지시 |
| `5` | 출고작업중 |
| `7` | 출고완료 |
| `9` | 출고취소 |

### 반품 진행상태 (`return_status`)

| 코드 | 설명 |
|------|------|
| `1` | 반품요청 |
| `3` | 반품진행중 |
| `5` | 반품입고완료 |
| `9` | 반품취소 |

### 로케이션 타입 (`loc_type`)

| 코드 | 설명 |
|------|------|
| `1` | 입고 |
| `2` | 출고가능 |
| `3` | 출고지시 |
| `4` | 출고작업 |
| `5` | 반품 |
| `6` | 불량 |
| `7` | 보관 |

### 취소 사유 (`cancel_reason_no`)

| 코드 | 설명 |
|------|------|
| `1` | 고객 주문 취소 |
| `2` | 오발주 |
| `3` | 재발주예정 |
| `4` | 이미 발송 (물류사 승인 시에만 선택 가능) |
| `5` | 작업중단 불가 (물류사 승인 시에만 선택 가능) |
| `6` | 기타 (사유 직접 입력) |

### 취소 진행상태 (`cancel_status`)

| 코드 | 설명 |
|------|------|
| `1` | 취소요청 |
| `2` | 취소요청 승인 (출고취소 처리) |
| `3` | 취소요청 반려 (출고작업 진행) |

### 택배사 (`delivery_agency_id`)

| ID | 택배사 |
|----|--------|
| `1` | 롯데택배 |
| `2` | 한진택배 |
| `3` | 로젠택배 |
| `4` | CJ대한통운 |
| `5` | 우체국 |
| `6` | 경동택배 |
| `7` | 합동택배 |
| `8` | 대신택배 |
| `9` | 천일택배 |
| `10` | 기타 |
| `11` | 자체배송 |
| `19` | DHL |
| `20` | Fedex |
| `30` | 오늘의 픽업 |
| `31` | 부릉 |

> 전체 목록은 `GET /v2/code/delivery_agency` 로 조회 가능

---

## 4. 상품 — 출고상품 (Shipping Product)

출고/재고 관리 관점의 최소 출고 단위 상품.  
출고상품 등록 시 `add_sales_product=1`이면 판매상품과 1:1 자동 연결.

### 4-1. 출고상품 기본 Object 전체 필드

| 필드 | 타입 | 설명 | 비고 |
|------|------|------|------|
| `shipping_product_id` | integer | 출고상품 ID | 등록 시 사용 안함 |
| `member_id` | integer | 고객사 ID | 물류사 권한 시 필수 |
| `product_code` | string(20) | 출고상품코드 | 기본값 자동생성; 자체생성 옵션 사용 시 필수 |
| `supply_company_id` | integer | 공급사 ID | |
| `supplier_id` | integer | 매입처 ID | |
| `category_id` | integer | 출고상품 구분 ID | |
| `product_name` | string(100) | 상품명 | **필수** |
| `upc` | string(50) | 대표 바코드 | |
| `add_barcode_list` | array | 추가 바코드 리스트 | `add_barcode_object` 구조 참고 |
| `manage_code1` | string(30) | 관리키워드1 | |
| `manage_code2` | string(30) | 관리키워드2 | |
| `manage_code3` | string(30) | 관리키워드3 | |
| `product_desc` | string(250) | 상품설명 | |
| `single_width` | integer | 낱개-가로 (mm) | |
| `single_length` | integer | 낱개-세로 (mm) | |
| `single_height` | integer | 낱개-높이 (mm) | |
| `single_weight` | integer | 낱개-무게 (g) | |
| `box_width` | integer | 카톤박스-가로 (mm) | |
| `box_length` | integer | 카톤박스-세로 (mm) | |
| `box_height` | integer | 카톤박스-높이 (mm) | |
| `box_weight` | integer | 카톤박스-무게 (g) | |
| `single_eta` | integer | 카톤박스-낱개입수 | |
| `palet_count` | integer | 팔레트 입수 | |
| `use_expire_date` | integer | 유통기한 사용여부 | 1.사용, 0.사용안함 (기본: 사용안함) |
| `use_make_date` | integer | 제조일자 사용여부 | 1.사용, 0.사용안함 (기본: 사용안함) |
| `expire_date_by_make_date` | integer | 제조일로부터 유통기한 일수 | |
| `warning_expire_date` | integer | 임박재고 전환 기준일 | |
| `restricted_expire_date` | integer | 출고불가 기준일 | |
| `edit_code` | string(20) | 출고편집코드 | |
| `max_quantity_per_box` | integer | 최대합포장 수량 | |
| `location_id` | integer | 대표로케이션 ID | 자체생성 옵션 사용 시에만 입력 가능; loc_type=2(출고가능)만 가능 |
| `location_quantity` | integer | 적정수량 | |
| `status` | integer | 활성화 여부 | 1.활성화, 0.비활성화 (기본: 활성화) |
| `add_sales_product` | integer | 판매상품 동시등록 여부 | 1.동시등록, 0.출고상품만 등록 (등록 API에서만 사용) |

### 4-2. add_barcode_object 구조

| 필드 | 타입 | 설명 | 비고 |
|------|------|------|------|
| `barcode` | string(100) | 바코드 | **필수** |
| `quantity` | integer | 매칭 수량 | **필수** |

### 4-3. 엔드포인트

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `POST` | `/v2/product/shipping_product` | 출고상품 등록(단일) | 고객사, 물류사 |
| `POST` | `/v2/product/shipping_products` | 출고상품 등록(벌크, 최대 100개) | 고객사, 물류사 |
| `PUT` | `/v2/product/shipping_product/{출고상품ID}` | 출고상품 수정 | 고객사, 물류사 |
| `GET` | `/v2/product/shipping_product/{출고상품ID}` | 출고상품 조회(단일) | 고객사, 물류사 |
| `GET` | `/v2/product/shipping_products` | 출고상품 조회(벌크) | 고객사, 물류사 |

### 4-4. 출고상품 조회(벌크) 쿼리 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `member_id` | integer | 고객사 ID (물류사 권한 시 필수) |
| `product_code` | string(20) | 출고상품코드 |
| `product_name` | string(100) | 상품명 (최소 2자, 부분 검색) |
| `category_id` | integer | 출고상품 구분 ID |
| `status` | integer | 활성화 여부 (1.활성화, 0.비활성화) |
| `page` | integer | 페이지 번호 |

### 4-5. 등록(단일) 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| `shipping_product_id` | integer | 출고상품 ID |
| `product_code` | string | 출고상품코드 |
| `sales_product_id` | integer | 판매상품 ID (`add_sales_product=1`인 경우) |
| `sales_product_code` | string | 판매상품코드 (`add_sales_product=1`인 경우) |

### 4-6. 출고상품 구분 (Category)

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `GET` | `/v2/product/shipping_product_category/{ID}` | 출고상품 구분 조회(단일) | 고객사, 물류사 |
| `GET` | `/v2/product/shipping_product_categorys` | 출고상품 구분 조회(벌크) | 고객사, 물류사 |

#### 출고상품 구분 기본 Object

| 필드 | 타입 | 설명 |
|------|------|------|
| `category_id` | integer | 출고상품 구분 ID |
| `category_name` | string(100) | 구분명 |

---

## 5. 상품 — 판매상품 (Sales Product)

판매/마케팅 관점의 상품. 출고상품과 별도 관리하거나 1:1 연결 가능.

### 5-1. 판매상품 기본 Object 전체 필드

| 필드 | 타입 | 설명 | 비고 |
|------|------|------|------|
| `sales_product_id` | integer | 판매상품 ID | 등록 시 사용 안함 |
| `member_id` | integer | 고객사 ID | 물류사 권한 시 필수 |
| `sales_product_code` | string(100) | 판매상품 고유코드 | unique 체크 |
| `category_id` | integer | 판매상품 구분 ID | **필수** |
| `product_name` | string(100) | 판매상품명 | **필수** |
| `manage_code1` | string(30) | 관리키워드1 | |
| `manage_code2` | string(30) | 관리키워드2 | |
| `manage_code3` | string(30) | 관리키워드3 | |
| `product_desc` | string(255) | 상품설명 | |
| `status` | integer(1) | 활성화 여부 | **필수**; 1.활성화, 0.비활성화 |
| `use_display_period` | integer(1) | 유효기간 사용 여부 | 1.사용, 0.사용안함 |
| `start_dt` | string(8) | 유효기간 시작일 | YYYYMMDD |
| `end_dt` | string(8) | 유효기간 종료일 | YYYYMMDD |

### 5-2. 엔드포인트

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `POST` | `/v2/product/sales_product` | 판매상품 등록(단일) | 고객사, 물류사 |
| `POST` | `/v2/product/sales_products` | 판매상품 등록(벌크, 최대 100개) | 고객사, 물류사 |
| `PUT` | `/v2/product/sales_product/{판매상품ID}` | 판매상품 수정 | 고객사, 물류사 |
| `GET` | `/v2/product/sales_product/{판매상품ID}` | 판매상품 조회(단일) | 고객사, 물류사 |
| `GET` | `/v2/product/sales_products` | 판매상품 조회(벌크) | 고객사, 물류사 |

### 5-3. 판매상품 구분 (Category)

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `GET` | `/v2/product/sales_product_category/{ID}` | 판매상품 구분 조회(단일) | 고객사, 물류사 |
| `GET` | `/v2/product/sales_product_categorys` | 판매상품 구분 조회(벌크) | 고객사, 물류사 |

---

## 6. 상품 — 상품연결 (Product Mapping)

판매상품에 출고상품을 연결하는 정보. 출고상품 등록 시 `add_sales_product=1`로 자동 연결되지 않은 경우 별도 등록.

### 6-1. 상품연결 기본 Object

| 필드 | 타입 | 설명 | 비고 |
|------|------|------|------|
| `sales_product_id` | integer | 판매상품 ID | **필수** |
| `mapping_list` | array | 출고상품 연결정보 리스트 | **필수** |

#### mapping_product_object 구조

| 필드 | 타입 | 설명 | 비고 |
|------|------|------|------|
| `shipping_product_id` | integer | 출고상품 ID | **필수** |
| `quantity` | integer | 연결 수량 | **필수** |

### 6-2. 엔드포인트

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `POST` | `/v2/product/product_mapping` | 상품연결 등록(단일) | 고객사, 물류사 |
| `POST` | `/v2/product/product_mappings` | 상품연결 등록(벌크) | 고객사, 물류사 |
| `PUT` | `/v2/product/product_mapping/{판매상품ID}` | 상품연결 수정 | 고객사, 물류사 |
| `GET` | `/v2/product/product_mapping/{판매상품ID}` | 상품연결 조회(단일) | 고객사, 물류사 |
| `GET` | `/v2/product/product_mappings` | 상품연결 조회(벌크) | 고객사, 물류사 |

---

## 7. 재고

> **주의**: 사방넷 풀필먼트 API에는 외부에서 재고 수량을 직접 수정하는 API가 없다.  
> 재고는 입고예정 등록/처리 및 발주 처리를 통해 사방넷 내부에서 변동된다.  
> WMS는 재고를 **조회**하여 로컬 DB에 반영하는 방향으로만 사용한다.

### 7-1. 재고 기본 Object 전체 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `shipping_product_id` | integer | 출고상품 ID |
| `total_stock` | integer | 총 재고 |
| `receiving_stock` | integer | 입고 재고 (입고예정 재고) |
| `normal_stock` | integer | 출고가능 재고 (loc_type=2) |
| `order_stock` | integer | 출고지시 재고 |
| `shipping_stock` | integer | 출고작업중 재고 |
| `damaged_stock` | integer | 불량 재고 |
| `return_stock` | integer | 반품 재고 |
| `keeping_stock` | integer | 보관 재고 (보관존 옵션 사용 시에만 노출) |

### 7-2. 재고 조회

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `GET` | `/v2/inventory/stock/{출고상품ID}` | 재고 조회(단일) | 고객사, 물류사 |
| `GET` | `/v2/inventory/stocks` | 재고 조회(벌크, 최대 100개) | 고객사, 물류사 |

#### 재고 조회(벌크) 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `member_id` | integer | 고객사 ID (물류사 시 필수) |
| `shipping_product_ids` | array | 출고상품 ID 목록 (최대 100개) |
| `page` | integer | 페이지 번호 |

> 배열 파라미터 전달 형식: `shipping_product_ids[0]=123&shipping_product_ids[1]=456`

### 7-3. 로케이션별 재고 조회

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `GET` | `/v2/inventory/stock_locations` | 로케이션 재고 조회(단일상품) | **물류사 전용** |
| `GET` | `/v2/inventory/stock/locations` | 로케이션 재고 조회(다중상품) | **물류사 전용** |

#### 로케이션 재고 응답 필드 (`data_list` 항목)

| 필드 | 타입 | 설명 |
|------|------|------|
| `shipping_product_id` | integer | 출고상품 ID |
| `location_id` | integer | 로케이션 ID |
| `location_name` | string(20) | 로케이션명 |
| `expire_date` | string(8) | 유통기한 (YYYYMMDD) |
| `quantity` | integer | 재고수량 |

#### `/v2/inventory/stock_locations` 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `shipping_product_id` | integer | 출고상품 ID **필수** |
| `loc_type` | integer | 재고 구분 (1.입고, 2.출고가능, 5.반품, 6.불량, 7.보관) |
| `location_id` | integer | 로케이션 ID |
| `page` | integer | 페이지 번호 |

#### `/v2/inventory/stock/locations` 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `shipping_product_ids` | array | 출고상품 ID 목록 **필수** |
| `loc_type` | integer | 재고 구분 |
| `location_id` | integer | 로케이션 ID |

### 7-4. 유통기한별 재고 조회

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `GET` | `/v2/inventory/stock_expire` | 유통기한별 재고 조회 | **물류사 전용** |

#### 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `member_id` | integer | 고객사 ID **필수** |
| `shipping_product_ids` | array | 출고상품 ID 목록 (최대 50개, **필수**) |
| `page` | integer | 페이지 번호 |

#### 응답 필드 (`data_list` 항목)

| 필드 | 타입 | 설명 |
|------|------|------|
| `shipping_product_id` | integer | 출고상품 ID |
| `expire_date` | string(8) | 유통기한 (YYYYMMDD; 공란이면 미관리) |
| `total_stock` | integer | 해당 유통기한의 총 재고 |
| `normal_stock` | integer | 해당 유통기한의 출고가능 재고 (loc_type=2만 해당) |

---

## 8. 입고

### 8-1. 입고예정 기본 Object 전체 필드

| 필드 | 타입 | 설명 | 비고 |
|------|------|------|------|
| `receiving_plan_id` | integer | 입고예정 ID | |
| `member_id` | integer | 고객사 ID | 물류사 권한 시 필수 |
| `receiving_plan_code` | string(20) | 입고예정코드 | |
| `plan_date` | string(8) | 입고예정일자 | **필수**; YYYYMMDD |
| `plan_status` | integer | 진행상태 | 1.입고예정, 2.입고검수중, 3.입고완료, 4.입고취소 |
| `complete_dt` | string(8) | 완료일 | YYYYMMDD |
| `memo` | string(250) | 입고예정메모 | |
| `add_info1` | string(50) | 추가정보1 | |
| `add_info2` | string(50) | 추가정보2 | |
| `add_info3` | string(50) | 추가정보3 | |
| `add_info4` | string(50) | 추가정보4 | |
| `add_info5` | string(50) | 추가정보5 | |
| `plan_product_list` | array | 입고예정 상품 목록 | **필수**; `plan_product_object` 참고 |

#### plan_product_object 구조

| 필드 | 타입 | 설명 | 비고 |
|------|------|------|------|
| `shipping_product_id` | integer | 출고상품 ID | **필수** |
| `quantity` | integer | 예정수량 | **필수** |
| `receiving_plan_product_id` | integer | 입고예정 상품 ID | 조회 시에만 출력 |
| `plan_product_status` | integer | 입고예정 상품 입고상태 | 조회 시에만 출력; 1.미입고, 3.부분입고, 5.입고완료, 9.취소 |
| `expire_date` | string(8) | 유통기한 | YYYYMMDD; 유통기한 사용 상품인 경우에만 입력 |
| `make_date` | string(8) | 제조일자 | YYYYMMDD; 제조일자 사용 상품인 경우에만 입력 |

### 8-2. 엔드포인트

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `POST` | `/v2/inventory/receiving_plan` | 입고예정 등록(단일) | 고객사, 물류사 |
| `PUT` | `/v2/inventory/receiving_plan/{입고예정ID}` | 입고예정 수정 | 고객사, 물류사 |
| `PUT` | `/v2/inventory/receiving_plan/cancel/{입고예정ID}` | 입고예정 취소 | 고객사, 물류사 |
| `GET` | `/v2/inventory/receiving_plan/{입고예정ID}` | 입고예정 조회(단일) | 고객사, 물류사 |
| `GET` | `/v2/inventory/receiving_plans` | 입고예정 조회(벌크) | 고객사, 물류사 |
| `GET` | `/v2/inventory/receiving_plan_result/{입고예정ID}` | 예정대비입고현황 조회 | 고객사, 물류사 |
| `GET` | `/v2/inventory/receiving_works` | 입고작업내역 조회(벌크) | **물류사 전용** |

> 입고예정 취소는 진행상태가 **1(입고예정)** 인 경우에만 가능

### 8-3. 입고예정 조회(벌크) 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `member_id` | integer | 고객사 ID (물류사 시 필수) |
| `receiving_plan_code` | string(20) | 입고예정코드 |
| `plan_date` | string(8) | 입고예정일자 (YYYYMMDD) |
| `plan_status` | integer | 진행상태 |
| `page` | integer | 페이지 번호 |

### 8-4. 예정대비입고현황 조회 응답

`response` 내 `receiving_plan_product` 배열:

| 필드 | 타입 | 설명 |
|------|------|------|
| `receiving_plan_product_id` | integer | 입고예정상품 ID |
| `shipping_product_id` | integer | 출고상품 ID |
| `plan_quantity` | integer | 예정수량 |
| `plan_product_status` | integer | 입고상태 (1.미입고, 3.부분입고, 5.입고완료, 9.취소) |
| `receiving_quantity` | integer | 입고수량 |

### 8-5. 입고작업내역 조회(벌크) 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `member_id` | integer | 고객사 ID **필수** |
| `start_dt` | string(8) | 작업 시작일 (YYYYMMDD) **필수** |
| `end_dt` | string(8) | 작업 종료일 (YYYYMMDD) **필수** |
| `work_type` | integer | 작업구분 (1.입고, 3.적치, 5.회송, 7.반품입고, 9.입고취소) |
| `receiving_type` | integer | 입고분류 (1.입고예정검수, 3.개별입고, 5.간편입고, 7.전수검사, 9.엑셀입고) |
| `receiving_plan_id` | integer | 입고예정 ID |
| `shipping_product_ids` | array | 출고상품 ID 목록 (최대 100개) |
| `page` | integer | 페이지 번호 |

### 8-6. 입고작업내역 응답 필드 (`data_list` 항목)

| 필드 | 타입 | 설명 |
|------|------|------|
| `receiving_work_history_id` | integer | 입고작업 히스토리 ID |
| `work_date` | datetime | 작업일시 (YYYY-MM-DD HH24:MI:SS) |
| `work_type` | integer | 작업구분 (1.입고, 3.적치, 5.회송, 7.반품입고, 9.입고취소) |
| `receiving_plan_id` | integer | 입고예정 ID |
| `receiving_type` | integer | 입고분류 |
| `shipping_product_id` | integer | 출고상품 ID |
| `quantity` | integer | 입고수량 |
| `make_date` | string(8) | 제조일자 (YYYYMMDD) |
| `expire_date` | string(8) | 유통기한 (YYYYMMDD) |
| `location_id` | integer | 로케이션 ID |
| `box_quantity` | integer | 박스 수 |
| `pallet_quantity` | integer | 팔레트 수 |
| `worker_member_id` | integer | 작업자 member_id |
| `work_memo` | string(1000) | 메모 |

### 8-7. 등록 요청 예시

```json
{
  "member_id": 70,
  "plan_date": "20221201",
  "memo": "신규 입고",
  "add_info1": "추가정보1",
  "plan_product_list": [
    { "shipping_product_id": 41668, "plan_quantity": 100, "expire_date": "20231230", "make_date": "20220101" }
  ]
}
```

#### 등록 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| `receiving_plan_id` | integer | 입고예정 ID |
| `receiving_plan_code` | string | 입고예정코드 |

---

## 9. 발주 (출고 주문)

### 9-1. 발주 기본 Object 전체 필드

| 필드 | 타입 | 설명 | 비고 |
|------|------|------|------|
| `order_id` | integer | 발주 ID | |
| `member_id` | integer | 고객사 ID | 물류사 권한 시 필수 |
| `order_code` | string(20) | 사방넷 오더코드 | |
| `company_order_code` | string(100) | 외부 주문번호 | **필수**; 중복 불가 (출고취소 건은 재사용 가능) |
| `shipping_method_id` | integer | 배송방식 | 1.택배, 2.직송, 3.새벽배송, 4.당일배송 |
| `order_status` | integer | 발주 진행상태 | 1.출고요청전, 3.출고요청, 5.송장등록완료, 7.출고완료, 9.출고취소 |
| `order_date` | datetime | 발주등록일시 | YYYY-MM-DD HH24:MI:SS |
| `request_shipping_dt` | string(8) | 출고희망일 | YYYYMMDD; **필수**; 과거 날짜 불가 |
| `buyer_name` | string(100) | 주문자명 | |
| `receiver_name` | string(100) | 받는분 이름 | **필수** |
| `tel1` | string(20) | 받는분 전화번호1 | **필수** |
| `tel2` | string(20) | 받는분 전화번호2 | |
| `zipcode` | string(20) | 받는분 우편번호 | |
| `shipping_address1` | string(150) | 받는분 주소1 | **필수** |
| `shipping_address2` | string(150) | 받는분 주소2 | |
| `shipping_message` | string(150) | 배송 메시지 | |
| `channel_id` | integer | 발주타입 ID | |
| `memo1` | string(500) | 관리메모1 | |
| `memo2` | string(500) | 관리메모2 | |
| `memo3` | string(500) | 관리메모3 | |
| `memo4` | string(500) | 관리메모4 | |
| `memo5` | string(500) | 관리메모5 | |
| `order_item_list` | array | 발주 상품 목록 | **필수**; `order_item_object` 참고 |

#### order_item_object 구조

| 필드 | 타입 | 설명 | 비고 |
|------|------|------|------|
| `sales_product_id` | integer | 판매상품 ID | **필수** |
| `quantity` | integer | 주문수량 | **필수** |
| `item_cd1` | string(50) | 상품별메모1 | |
| `item_cd2` | string(50) | 상품별메모2 | |
| `item_cd3` | string(50) | 상품별메모3 | |

### 9-2. 엔드포인트

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `POST` | `/v2/request/order` | 발주 등록(단일) | 고객사, 물류사 |
| `POST` | `/v2/request/orders` | 발주 등록(벌크, 최대 100개) | 고객사, 물류사 |
| `PUT` | `/v2/request/order/{발주ID}` | 발주 수정 (order_status=1만 가능) | 고객사, 물류사 |
| `GET` | `/v2/request/order/{발주ID}` | 발주 조회(단일) | 고객사, 물류사 |
| `GET` | `/v2/request/orders` | 발주 조회(벌크) | 고객사, 물류사 |
| `POST` | `/v2/request/order_cancel` | 발주 취소요청 등록 | 고객사, 물류사 |
| `GET` | `/v2/request/order_cancel/{릴리즈ID}` | 발주 취소요청 조회(단일) | 고객사, 물류사 |
| `GET` | `/v2/request/order_cancels` | 발주 취소요청 조회(벌크) | 고객사, 물류사 |

### 9-3. 발주 조회(벌크) 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `member_id` | integer | 고객사 ID (물류사 시 필수) |
| `order_code` | string(20) | 오더코드 |
| `company_order_codes` | string | 주문번호 (최대 100개) |
| `shipping_method_id` | integer | 배송방식 |
| `order_status` | integer | 발주 진행상태 |
| `order_dt` | string(8) | 발주 등록일 (YYYYMMDD) |
| `request_shipping_dt` | string(8) | 출고희망일 (YYYYMMDD) |
| `channel_id` | integer | 발주타입 ID |
| `page` | integer | 페이지 번호 |

### 9-4. 발주 등록 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| `order_id` | integer | 발주 ID |
| `order_code` | string(20) | 사방넷 오더코드 |
| `company_order_code` | string(100) | 외부 주문번호 |

### 9-5. 발주 취소요청 기본 Object 전체 필드

| 필드 | 타입 | 설명 | 비고 |
|------|------|------|------|
| `cancel_id` | integer | 발주 취소 ID | |
| `member_id` | integer | 고객사 ID | |
| `order_id` | integer | 발주 ID | **필수**; 발주 진행상태가 출고요청전이면 자동 발주삭제 |
| `release_id` | integer | 릴리즈 ID | 발주 진행상태가 출고요청 이후인 경우 **필수** |
| `cancel_status` | integer | 취소 상태 | 1.취소요청, 2.취소요청 승인, 3.취소요청 반려 |
| `cancel_reason_no` | integer | 취소사유코드 | **필수**; 1~6 |
| `cancel_reason_content` | string(500) | 취소사유(직접입력) | `cancel_reason_no=6`인 경우에만 입력 |
| `history_list` | array | 취소요청 히스토리 | `history_list_object` 참고 |

#### history_list_object 구조

| 필드 | 타입 | 설명 |
|------|------|------|
| `cancel_status` | integer | 취소요청 상태 |
| `cancel_reason_no` | integer | 취소사유코드 |
| `create_date` | string(20) | 등록일자 |
| `cancel_reason_content` | string(500) | 취소사유 |

### 9-6. 발주 취소요청 조회(벌크) 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `member_id` | integer | 고객사 ID (물류사 시 필수) |
| `cancel_ids` | array | 발주취소 ID 배열 (최대 100개) |
| `cancel_status` | integer | 취소요청 상태 (1.취소요청, 2.취소요청 승인, 3.취소요청 반려) |
| `order_id` | integer | 발주 ID |
| `release_ids` | array | 출고요청 ID 배열 |
| `reg_date` | string(10) | 요청일 (YYYYMMDD) |
| `page` | integer | 페이지 번호 |

---

## 10. 출고 (릴리즈)

> 발주 등록 후 물류사가 출고를 처리하면 생성되는 릴리즈 레코드.  
> 운송장 등록 시 `release_id`(릴리즈 ID)를 사용한다.  
> **물류사 전용** API.

### 10-1. 출고 기본 Object 전체 필드

| 필드 | 타입 | 설명 | 비고 |
|------|------|------|------|
| `release_id` | integer | 릴리즈 ID | |
| `member_id` | integer | 고객사 ID | |
| `release_code` | string(100) | 릴리즈코드 | |
| `order_id` | integer | 발주 ID | |
| `order_code` | string(20) | 오더코드 | |
| `company_order_code` | string(100) | 주문번호 | |
| `shipping_method_id` | integer | 배송방식 | 1.택배, 2.직송, 3.새벽배송, 4.당일배송 |
| `request_shipping_dt` | string(8) | 출고희망일 | YYYYMMDD |
| `release_date` | string(8) | 출고요청일 | YYYYMMDD |
| `release_status` | integer | 출고 진행상태 | 1.출고요청, 3.출고지시, 5.출고작업중, 7.출고완료, 9.출고취소 |
| `complete_date` | string(8) | 출고완료일 | YYYYMMDD |
| `shipping_order_info_id` | integer | 출고회차 ID | |
| `delivery_agency_id` | integer | 택배사 ID | |
| `shipping_code` | string(50) | 운송장 번호 | |
| `etc1` | string(50) | 출고정보1 | |
| `etc2` | string(50) | 출고정보2 | |
| `etc3` | string(50) | 출고정보3 | |
| `etc4` | string(50) | 출고정보4 | |
| `etc5` | string(50) | 출고정보5 | |
| `etc6` | string(50) | 출고정보6 | |
| `buyer_name` | string(100) | 주문자명 | |
| `receiver_name` | string(100) | 받는분 이름 | |
| `tel1` | string(20) | 받는분 전화번호1 | |
| `tel2` | string(20) | 받는분 전화번호2 | |
| `zipcode` | string(20) | 받는분 우편번호 | |
| `shipping_address1` | string(150) | 받는분 주소1 | |
| `shipping_address2` | string(150) | 받는분 주소2 | |
| `shipping_message` | string(150) | 배송 메시지 | |
| `channel_id` | integer | 발주타입 ID | |
| `das_num` | string(4) | DAS 번호 | |

### 10-2. 엔드포인트

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `GET` | `/v2/release/{릴리즈ID}` | 출고 조회(단일) | **물류사** |
| `GET` | `/v2/releases` | 출고 조회(벌크) | **물류사** |
| `GET` | `/v2/release/items` | 출고대상상품 조회(벌크) | **물류사** |
| `GET` | `/v2/release/item_stocks` | 출고대상상품 재고할당 조회(벌크) | **물류사** |
| `PATCH` | `/v2/release/cancel/{릴리즈ID}` | 출고취소 (출고요청 상태만 가능) | **물류사** |
| `GET` | `/v2/release/shipping_work` | 출고회차 조회(벌크) | **물류사** |
| `GET` | `/v2/release/picking_list/{출고지시ID}` | 피킹리스트 조회(벌크) | **물류사** |
| `PUT` | `/v2/release_etc/{릴리즈ID}` | 기타정보 수정(단일) | **물류사** |
| `PUT` | `/v2/release_etcs` | 기타정보 수정(벌크) | **물류사** |
| `POST` | `/v2/shipping/das_work` | DAS 번호 등록/수정(벌크) | **물류사** |

### 10-3. 출고 조회(벌크) 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `member_id` | integer | 고객사 ID **필수** |
| `release_ids` | array | 릴리즈 ID 배열 (최대 100개) |
| `release_codes` | array | 릴리즈코드 배열 (최대 100개) |
| `order_ids` | array | 발주 ID 배열 (최대 100개) |
| `shipping_order_info_id` | integer | 출고지시 ID |
| `release_date` | string(8) | 출고요청일 (YYYYMMDD) |
| `request_shipping_dt` | string(8) | 출고희망일 (YYYYMMDD) |
| `start_complete_dt` | string(8) | 출고완료 시작일 (YYYYMMDD) |
| `end_complete_dt` | string(8) | 출고완료 종료일 (YYYYMMDD) |
| `page` | integer | 페이지 번호 |

### 10-4. 출고대상상품 조회(벌크) 응답 필드 (`data_list` 항목)

| 필드 | 타입 | 설명 |
|------|------|------|
| `release_item_id` | integer | 출고대상상품 ID |
| `release_id` | integer | 릴리즈 ID |
| `shipping_product_id` | integer | 출고상품 ID |
| `quantity` | integer | 수량 |
| `release_code` | string(20) | 릴리즈코드 |
| `release_status` | integer | 출고 진행상태 |
| `product_name` | string(100) | 출고상품명 |
| `product_code` | string(20) | 출고상품코드 |
| `upc` | string(50) | 대표바코드 |
| `shipping_code` | string(50) | 운송장 번호 |
| `receiver_name` | string(100) | 받는분 이름 |
| `add_barcode_list` | array | 추가바코드 리스트 |

### 10-5. 출고대상상품 재고할당 조회(벌크) 추가 응답 필드

> 재고할당방식 옵션 사용 및 출고지시 이후 상태에서만 사용 가능

| 필드 | 타입 | 설명 |
|------|------|------|
| `location_id` | integer | 로케이션 ID |
| `location_name` | string(20) | 로케이션명 |
| `expire_date` | string(8) | 유통기한 (YYYYMMDD) |

### 10-6. 출고회차 기본 Object 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `shipping_order_info_id` | integer | 출고지시 ID |
| `member_id` | integer | 고객사 ID (콤마 구분 복수 가능) |
| `order_date` | string(8) | 출고지시일 (YYYYMMDD) |
| `order_seq` | integer | 출고회차 |
| `interconnect_shipping` | integer | 택배 연동 여부 (1.사용, 0.미사용) |
| `delivery_agency_id` | integer | 택배사 ID |
| `interconnect_work_uid` | integer | 택배연동 접수 정보 ID |
| `error_cnt` | integer | 오류 건수 |
| `picking_id` | integer | 피킹담당자 |
| `order_cnt` | integer | 출고지시 개수 |
| `work_cnt` | integer | 출고 작업중 개수 |
| `complete_cnt` | integer | 출고 완료 개수 |
| `order_time` | string(20) | 출고지시 시간 (HH:MM) |
| `work_start_time` | string(20) | 작업시작 시간 (HH:MM) |
| `work_end_time` | string(20) | 작업 완료 시간 (HH:MM) |
| `work_time` | string(20) | 소요 시간 (HH:MM) |

### 10-7. 피킹리스트 조회(벌크) 응답 필드 (`data_list` 항목)

| 필드 | 타입 | 설명 |
|------|------|------|
| `shipping_order_info_id` | integer | 출고지시 ID |
| `shipping_order_name` | string(30) | 회차명 (날짜+회차) |
| `shipping_product_id` | integer | 출고상품 ID |
| `product_code` | string(20) | 출고상품코드 |
| `product_name` | string(100) | 출고상품명 |
| `upc` | string(50) | 대표바코드 |
| `location_id` | integer | 로케이션 ID |
| `location_name` | string(20) | 로케이션명 |
| `expire_date` | string(8) | 유통기한 (YYYYMMDD) |
| `quantity` | integer | 수량 |
| `add_barcode_list` | array | 추가바코드 리스트 |

### 10-8. DAS 번호 등록/수정(벌크) 요청 필드

| 필드 | 타입 | 설명 | 비고 |
|------|------|------|------|
| `member_id` | integer | 고객사 ID | **필수** |
| `shipping_order_info_id` | integer | 출고지시 ID | **필수** |
| `gubun` | string(1) | 자동생성 여부 | N.자동생성 사용안함(기본), Y.자동생성 사용 |
| `request_data_list` | array | `release_id` + `das_num` | `gubun=N`인 경우 필수 |

---

## 11. 운송장

> WMS에서 출고 처리 후 운송장 번호를 사방넷에 등록하는 방향으로 사용한다.  
> **`order_no` 대신 `release_id`(릴리즈 ID)를 사용한다.**

### 11-1. 운송장 기본 Object 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `order_id` | integer | 발주 ID |
| `order_code` | string(20) | 오더코드 |
| `company_order_code` | string(100) | 주문번호 |
| `request_shipping_dt` | string(8) | 출고희망일 (YYYYMMDD) |
| `release_id` | integer | 릴리즈 ID |
| `release_status` | integer | 출고 진행상태 |
| `delivery_agency_id` | integer | 택배사 ID |
| `shipping_code` | string(50) | 운송장번호 |

### 11-2. 엔드포인트

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `PUT` | `/v2/release/shipping_code/{릴리즈ID}` | 운송장 수정(단일) | **물류사** |
| `PUT` | `/v2/release/shipping_codes` | 운송장 수정(벌크, 최대 100개) | **물류사** |
| `GET` | `/v2/release/shipping_codes` | 운송장 일반 조회(벌크) | 고객사, 물류사 |
| `GET` | `/v2/release/recent_shipping_codes` | 운송장 최근 조회(벌크, 변경분만) | 고객사, 물류사 |

> 운송장 수정은 **출고작업중** 상태인 경우에만 가능

### 11-3. 운송장 수정(단일) 요청 본문

```json
{
  "delivery_agency_id": 4,
  "shipping_code": "SONG102371ABA54"
}
```

### 11-4. 운송장 수정(벌크) 요청 본문

```json
{
  "request_data_list": [
    { "release_id": 40239, "delivery_agency_id": 10, "shipping_code": "AA11" },
    { "release_id": 40341, "delivery_agency_id": 3,  "shipping_code": "BB22" }
  ]
}
```

### 11-5. 운송장 일반 조회(벌크) 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `member_id` | integer | 고객사 ID (물류사 시 필수) |
| `request_shipping_dt` | string(8) | 출고희망일 (YYYYMMDD) **필수** |
| `order_id` | integer | 발주 ID |
| `company_order_code` | string(100) | 주문번호 |
| `release_id` | integer | 릴리즈 ID |
| `release_status` | integer | 출고 진행상태 |
| `delivery_agency_id` | integer | 택배사 ID |
| `page` | integer | 페이지 번호 |

### 11-6. 운송장 최근 조회(벌크) 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `member_id` | integer | 고객사 ID (물류사 시 필수) |
| `release_date` | string(8) | 출고일 (YYYYMMDD) **필수** |
| `last_history_id` | integer | 직전 호출의 `last_history_id` (변경분만 조회) |
| `page` | integer | 페이지 번호 |

### 11-7. 운송장 최근 조회(벌크) 응답 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `last_history_id` | integer | 최종키값 (다음 호출 시 사용) |
| `order_id` | integer | 발주 ID |
| `company_order_code` | string(100) | 주문번호 |
| `release_id` | integer | 릴리즈 ID |
| `delivery_agency_id` | integer | 택배사 ID |
| `shipping_code` | string(50) | 운송장번호 |
| `create_dt` | string(8) | 송장 등록일 (YYYYMMDD) |

> `last_history_id`를 활용하면 마지막 조회 이후 추가된 운송장만 폴링할 수 있다.

---

## 12. 반품

### 12-1. 반품 기본 Object 전체 필드

| 필드 | 타입 | 설명 | 비고 |
|------|------|------|------|
| `release_return_info_id` | integer | 반품 ID | |
| `member_id` | integer | 고객사 ID | |
| `release_id` | integer | 출고완료 건의 릴리즈 ID | 신규 반품이면 없음 |
| `return_status` | integer | 진행상태 | 1.반품요청, 3.반품진행중, 5.반품입고완료, 9.반품취소 |
| `return_code` | string(20) | 반품코드 | |
| `request_date` | datetime | 반품요청일시 | YYYY-MM-DD HH24:MI:SS |
| `request_dt` | string(8) | 반품요청일 | YYYYMMDD |
| `request_member_id` | integer | 반품요청자 member_id | API 등록 시 0으로 고정 |
| `complete_date` | datetime | 반품입고완료일시 | YYYY-MM-DD HH24:MI:SS |
| `complete_dt` | string(8) | 반품입고완료일 | YYYYMMDD |
| `complete_member_id` | integer | 반품입고완료자 member_id | |
| `return_reason_id` | integer | 반품사유 ID | 반품사유 조회(벌크) 참고 |
| `memo` | string(255) | 최근 특이사항 | |
| `memo_list` | array | 특이사항 히스토리 | `memo_list_object` 참고 |
| `receiving_name` | string(100) | 회수지 보내는분 이름 | |
| `return_address1` | string(100) | 회수지 주소1 | |
| `return_address2` | string(100) | 회수지 주소2 | |
| `zipcode` | string(20) | 회수지 우편번호 | |
| `tel1` | string(20) | 회수지 전화번호1 | |
| `tel2` | string(20) | 회수지 전화번호2 | |
| `return_process_type` | integer | 반품접수 타입 | 0.수동, 1.자동 |
| `delivery_agency_id` | integer | 택배사 ID | |
| `return_shipping_code` | string(50) | 반송장번호 | |
| `return_item_list` | array | 반품 상품 목록 | `return_item_object` 참고 |

#### return_item_object 구조

| 필드 | 타입 | 설명 | 비고 |
|------|------|------|------|
| `release_return_item_renual_id` | integer | 반품상품 ID | 조회 시에만 출력 |
| `release_item_id` | integer | 출고 상품 ID | **필수** (release_id 있는 경우) |
| `shipping_product_id` | integer | 출고상품 ID | **필수** |
| `quantity` | integer | 요청수량 | **필수** |
| `unusable_quantity` | integer | 폐기수량 | 조회 시에만 출력 |
| `receiving_quantity` | integer | 입고수량 | 조회 시에만 출력 |
| `expire_date` | string(8) | 입고 유통기한 (YYYYMMDD) | 조회 시에만 출력 |
| `disposal_expire_date` | string(8) | 폐기 유통기한 (YYYYMMDD) | 조회 시에만 출력 |

#### memo_list_object 구조

| 필드 | 타입 | 설명 |
|------|------|------|
| `memo` | string(250) | 특이사항 메모 |
| `create_dt` | string(20) | 등록일시 (YYYY-MM-DD HH24:MI:SS) |

### 12-2. 반품사유 ID

| ID | 사유 |
|----|------|
| `1` | 오배송 (물류사 귀책) |
| `2` | 오배송 (고객사 귀책) |
| `3` | 지연배송 |
| `4` | 고객변심 |
| `5` | 품질불량 |
| `6` | 상품파손 |

### 12-3. 엔드포인트

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `POST` | `/v2/release_return/request` | 반품 등록(단일) | 고객사, 물류사 |
| `GET` | `/v2/release_return/{반품ID}` | 반품 조회(단일) | 고객사, 물류사 |
| `GET` | `/v2/release_return/searchs` | 반품 조회(벌크) | 고객사, 물류사 |
| `PATCH` | `/v2/release_return/{반품ID}` | 반품 취소 | 고객사, 물류사 |
| `GET` | `/v2/release_return/reason` | 반품사유 조회(벌크) | 고객사, 물류사 |
| `POST` | `/v2/release_return/memo` | 반품 특이사항 등록(단일) | 고객사, 물류사 |

> 반품 취소는 진행상태가 **반품요청(1)** 또는 **반품진행중(3)** 인 경우에만 가능

### 12-4. 반품 조회(벌크) 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `member_id` | integer | 고객사 ID (물류사 시 필수) |
| `release_return_info_ids` | array | 반품 ID 배열 |
| `start_request_dt` | string(8) | 반품요청 시작일 (YYYYMMDD) |
| `end_request_dt` | string(8) | 반품요청 종료일 (YYYYMMDD) |
| `start_complete_dt` | string(8) | 반품입고완료 시작일 (YYYYMMDD) |
| `end_complete_dt` | string(8) | 반품입고완료 종료일 (YYYYMMDD) |
| `return_status` | integer | 반품 진행상태 |
| `page` | integer | 페이지 번호 |

### 12-5. 반품 등록 요청 예시

```json
{
  "member_id": 70,
  "release_id": 50486,
  "return_reason_id": 3,
  "memo": "특이사항 메모",
  "receiving_name": "홍길동",
  "return_address1": "서울시 강서구 공항대로 168",
  "return_address2": "1207호",
  "zipcode": "07807",
  "tel1": "02-123-4567",
  "return_item_list": [
    { "release_item_id": 92781, "shipping_product_id": 41675, "quantity": 2 }
  ]
}
```

---

## 13. 관리

### 13-1. 고객사

> **물류사 전용** API. 고객사는 이용 불가.

| Method | URI | 설명 |
|--------|-----|------|
| `POST` | `/v2/member/partner` | 고객사 등록 |
| `PUT` | `/v2/member/partner/{member_id}` | 고객사 수정 |
| `GET` | `/v2/member/partner/{member_id}` | 고객사 조회(단일) |
| `GET` | `/v2/member/partners` | 고객사 조회(벌크) |
| `GET` | `/v2/member/sub_masters` | 물류사 추가계정 조회(벌크) |

---

### 13-2. 매입처

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `GET` | `/v2/manage/supplier/{매입처ID}` | 매입처 조회(단일) | 고객사, 물류사 |
| `GET` | `/v2/manage/suppliers` | 매입처 조회(벌크) | 고객사, 물류사 |

---

### 13-3. 공급사

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `GET` | `/v2/manage/supply_company/{공급사ID}` | 공급사 조회(단일) | 고객사, 물류사 |
| `GET` | `/v2/manage/supply_companys` | 공급사 조회(벌크) | 고객사, 물류사 |

---

### 13-4. 발주타입 (Channel)

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `GET` | `/v2/manage/channel/{발주타입ID}` | 발주타입 조회(단일) | 고객사, 물류사 |
| `GET` | `/v2/manage/channels` | 발주타입 조회(벌크) | 고객사, 물류사 |

#### 발주타입 기본 Object

| 필드 | 타입 | 설명 |
|------|------|------|
| `channel_id` | integer | 발주타입 ID |
| `member_id` | integer | 고객사 ID |
| `channel_name` | string(100) | 발주타입명 |

---

### 13-5. 로케이션

> **물류사 전용** API.

| Method | URI | 설명 |
|--------|-----|------|
| `GET` | `/v2/location/{로케이션ID}` | 로케이션 조회(단일) |
| `GET` | `/v2/locations` | 로케이션 조회(벌크) |

#### 로케이션 조회(벌크) 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `location_ids` | array | 로케이션 ID 배열 |
| `loc_type` | integer | 로케이션 타입 |
| `page` | integer | 페이지 번호 |

---

### 13-6. 택배사

| Method | URI | 설명 | 권한 |
|--------|-----|------|------|
| `GET` | `/v2/code/delivery_agency` | 택배사 조회(벌크) | 고객사, 물류사 |

> 운송장 등록 전 이 API로 `delivery_agency_id` 목록을 확인한다.

---

## 개발 시 주의사항

1. **API Throttling**: 요청 횟수 제한 가능. 폴링 주기는 최소화 권장.
2. **Signature 갱신**: 날짜가 바뀌면 Signature 값이 변경되므로, 요청마다 Signature를 새로 생성해야 한다.
3. **IP 화이트리스트**: API 사용 전 사방넷 관리 화면에서 서버 IP를 등록해야 한다.
4. **member_id 필수**: 물류사 권한 API 호출 시 고객사 ID(`member_id`) 파라미터 필수.
5. **재고 방향**: 사방넷 API로 재고를 직접 수정하는 API 없음 → 재고 조회 후 WMS 로컬 DB 반영만 가능.
6. **company_order_code 중복**: 동일 주문번호로 발주를 재등록하려면 해당 발주가 `출고취소(9)` 상태여야 함.
7. **release_id 사용**: 운송장 등록 시 `order_no`가 아닌 사방넷 **릴리즈 ID**(`release_id`) 사용.
8. **벌크 요청 제한**: 발주 등록 100개, 재고조회 100개, 유통기한 재고조회 50개 등 API별 상한 존재.
9. **수정 시 전체 필드 불필요**: PUT 수정 요청 시 수정할 필드만 포함해서 보내면 됨.
10. **운송장 수정 조건**: 출고작업중 상태인 릴리즈에만 운송장 수정 가능.
