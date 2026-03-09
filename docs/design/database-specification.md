# 데이터베이스 명세서

> 작성일: 2026-03-08
> 추출 기준: `src/main/java/operato/wms/**/entity/*.java`

---

## 목차

1. [개요](#1-개요)
2. [공통 설계 규칙](#2-공통-설계-규칙)
3. [기준 정보 (base)](#3-기준-정보-base)
4. [입고 관리 (inbound)](#4-입고-관리-inbound)
5. [출고 관리 (outbound)](#5-출고-관리-outbound)
6. [재고 관리 (stock)](#6-재고-관리-stock)
7. [뷰 및 임포트 모델](#7-뷰-및-임포트-모델)
8. [DB 함수 및 커스텀 서비스](#8-db-함수-및-커스텀-서비스)
9. [엔티티 관계 요약](#9-엔티티-관계-요약)

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 총 테이블 수 | 26개 (실테이블) + 4개 (뷰/임포트 모델) |
| PK 전략 | UUID (VARCHAR 40) — `GenerationRule.UUID` |
| 멀티 테넌시 | 모든 테이블에 `domain_id` (BIGINT) 포함 (ElidomStampHook 상속) |
| 공통 감사 필드 | `created_at`, `created_by`, `updated_at`, `updated_by` (ElidomStampHook) |
| 시퀀스 | 별도 DB 시퀀스 없음. 시퀀스성 값은 `MAX(seq_col) + 1` 패턴 사용 |
| 저장 프로시저 | 없음 |

---

## 2. 공통 설계 규칙

### 2.1 모든 엔티티가 상속하는 필드 (ElidomStampHook)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `domain_id` | BIGINT | 멀티 테넌시 도메인 ID |
| `created_at` | DATETIME | 생성 일시 |
| `created_by` | VARCHAR | 생성자 |
| `updated_at` | DATETIME | 수정 일시 |
| `updated_by` | VARCHAR | 수정자 |

### 2.2 공통 확장 필드

대부분의 테이블에 `attr01` ~ `attr05` (VARCHAR 50~100) 커스텀 확장 필드가 포함된다.

### 2.3 코드 체계

| 코드 필드 | 참조 테이블 | 설명 |
|----------|-----------|------|
| `domain_id` | domains | 멀티 테넌시 |
| `com_cd` | companies | 화주사 코드 |
| `wh_cd` | warehouses | 창고 코드 |
| `sku_cd` | sku | 상품 코드 |
| `vend_cd` | vendors | 공급사 코드 |
| `zone_cd` | zones | 구역 코드 |
| `loc_cd` | locations | 로케이션 코드 |

> **Note**: 외래키 제약은 DB 레벨에서 설정되지 않고 애플리케이션에서 관리됨.

---

## 3. 기준 정보 (base)

### 3.1 box_types — 박스 타입

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| companyId | company_id | VARCHAR | Y | 40 | 화주사 ID (FK) |
| comCd | com_cd | VARCHAR | N | 30 | 화주사 코드 |
| whCd | wh_cd | VARCHAR | N | 30 | 창고 코드 |
| boxTypeCd | box_type_cd | VARCHAR | N | 30 | 박스 타입 코드 |
| boxTypeNm | box_type_nm | VARCHAR | N | 40 | 박스 타입 명 |
| boxLen | box_len | FLOAT | Y | - | 박스 길이 |
| boxWd | box_wd | FLOAT | Y | - | 박스 폭 |
| boxHt | box_ht | FLOAT | Y | - | 박스 높이 |
| boxVol | box_vol | FLOAT | Y | - | 박스 부피 |

**인덱스**:
- `ix_box_types_0` (UNIQUE): `box_type_cd`, `domain_id`
- `ix_box_types_1`: `com_cd`, `wh_cd`, `domain_id`

---

### 3.2 companies — 화주사

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| comCd | com_cd | VARCHAR | N | 20 | 화주사 코드 (UNIQUE) |
| comNm | com_nm | VARCHAR | N | 100 | 화주사 명 |
| comAlias | com_alias | VARCHAR | Y | 100 | 화주사 별칭 |
| comGroup | com_group | VARCHAR | Y | 20 | 화주사 그룹 |
| comMgrNm | com_mgr_nm | VARCHAR | Y | 50 | 담당자 명 |
| comMgrEmail | com_mgr_email | VARCHAR | Y | 50 | 담당자 이메일 |
| comMgrPhone | com_mgr_phone | VARCHAR | Y | 20 | 담당자 전화 |
| bizLicNo | biz_lic_no | VARCHAR | Y | 50 | 사업자 등록번호 |
| repPerNm | rep_per_nm | VARCHAR | Y | 50 | 대표자 명 |
| bizConNm | biz_con_nm | VARCHAR | Y | 100 | 업태 |
| bizItemNm | biz_item_nm | VARCHAR | Y | 100 | 업종 |
| comTelNo | com_tel_no | VARCHAR | Y | 20 | 대표 전화 |
| csTelNo | cs_tel_no | VARCHAR | Y | 20 | CS 전화 |
| comFaxNo | com_fax_no | VARCHAR | Y | 20 | 팩스 |
| comZipCd | com_zip_cd | VARCHAR | Y | 10 | 우편번호 |
| comAddr | com_addr | VARCHAR | Y | - | 주소 |
| contractType | contract_type | VARCHAR | Y | 20 | 계약 유형 |
| maxAccount | max_account | INTEGER | Y | - | 최대 계정 수 |
| remarks | remarks | VARCHAR | Y | 255 | 비고 |
| delFlag | del_flag | BOOLEAN | Y | - | 삭제 여부 (default: false) |
| attr01~05 | attr01~attr05 | VARCHAR | Y | 50 | 확장 필드 |

**인덱스**:
- `ix_companies_0` (UNIQUE): `com_cd`, `domain_id`
- `ix_companies_1`: `com_nm`, `domain_id`
- `ix_companies_2`: `com_group`, `domain_id`
- `ix_companies_3`: `biz_lic_no`, `domain_id`
- `ix_companies_4`: `del_flag`, `domain_id`

---

### 3.3 courier_contracts — 택배사 계약

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| dlvVendCd | dlv_vend_cd | VARCHAR | N | 30 | 택배사 코드 |
| contractNo | contract_no | VARCHAR | N | 30 | 계약 번호 (송장 대역) |
| startBandwidth | start_bandwidth | VARCHAR | Y | 30 | 시작 번호 대역 |
| endBandwidth | end_bandwidth | VARCHAR | Y | 30 | 종료 번호 대역 |
| totalCnt | total_cnt | INTEGER | Y | - | 총 개수 |
| useCnt | use_cnt | INTEGER | Y | - | 사용 개수 |
| remainCnt | remain_cnt | INTEGER | Y | - | 잔여 개수 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| delFlag | del_flag | BOOLEAN | Y | - | 삭제 여부 |
| attr01~05 | attr01~attr05 | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:
- `ix_courier_contracts_0` (UNIQUE): `dlv_vend_cd`, `contract_no`, `domain_id`

---

### 3.4 customers — 고객사

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| comCd | com_cd | VARCHAR | N | 20 | 화주사 코드 |
| custCd | cust_cd | VARCHAR | N | 20 | 고객사 코드 |
| custNm | cust_nm | VARCHAR | N | 100 | 고객사 명 |
| custAlias | cust_alias | VARCHAR | Y | 100 | 고객사 별칭 |
| custType | cust_type | VARCHAR | Y | 20 | 고객사 유형 |
| custGroup | cust_group | VARCHAR | Y | 20 | 고객사 그룹 |
| custMgrNm | cust_mgr_nm | VARCHAR | Y | 40 | 담당자 명 |
| custMgrEmail | cust_mgr_email | VARCHAR | Y | 50 | 담당자 이메일 |
| custMgrPhone | cust_mgr_phone | VARCHAR | Y | 20 | 담당자 전화 |
| bizLicNo | biz_lic_no | VARCHAR | Y | 50 | 사업자 등록번호 |
| repPerNm | rep_per_nm | VARCHAR | Y | 40 | 대표자 명 |
| bizItemNm | biz_item_nm | VARCHAR | Y | 255 | 업종 |
| bizConNm | biz_con_nm | VARCHAR | Y | 255 | 업태 |
| custTelNo | cust_tel_no | VARCHAR | Y | 20 | 전화 |
| custFaxNo | cust_fax_no | VARCHAR | Y | 20 | 팩스 |
| csTelNo | cs_tel_no | VARCHAR | Y | 20 | CS 전화 |
| custZipCd | cust_zip_cd | VARCHAR | Y | 100 | 우편번호 |
| custAddr | cust_addr | VARCHAR | Y | 255 | 주소 |
| contractType | contract_type | VARCHAR | Y | 20 | 계약 유형 |
| delFlag | del_flag | BOOLEAN | N | - | 삭제 여부 (default: false) |
| remarks | remarks | VARCHAR | Y | 255 | 비고 |
| attr01~05 | attr01~attr05 | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:
- `ix_customers_0` (UNIQUE): `com_cd`, `cust_cd`, `domain_id`
- `ix_customers_1`: `cust_nm`, `domain_id`
- `ix_customers_2`: `del_flag`, `domain_id`
- `ix_customers_3`: `cust_type`, `domain_id`
- `ix_customers_4`: `biz_lic_no`, `domain_id`

---

### 3.5 expiration_dates — 유통기한 설정

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| name | name | VARCHAR | N | 50 | 명칭 |
| description | description | VARCHAR | Y | 50 | 설명 |
| activeFlag | active_flag | BOOLEAN | Y | - | 활성 여부 |

---

### 3.6 locations — 로케이션

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| whCd | wh_cd | VARCHAR | N | 20 | 창고 코드 |
| locCd | loc_cd | VARCHAR | N | 20 | 로케이션 코드 (UNIQUE) |
| locType | loc_type | VARCHAR | Y | 20 | 로케이션 유형 |
| locGroup | loc_group | VARCHAR | Y | 20 | 로케이션 그룹 |
| zoneCd | zone_cd | VARCHAR | N | 20 | 구역 코드 |
| locRow | loc_row | VARCHAR | Y | 10 | 행 |
| locCol | loc_col | VARCHAR | Y | 10 | 열 |
| locDan | loc_dan | VARCHAR | Y | 10 | 단(층) |
| locWdt | loc_wdt | FLOAT | Y | - | 폭 |
| locVtc | loc_vtc | FLOAT | Y | - | 세로 |
| locHgt | loc_hgt | FLOAT | Y | - | 높이 |
| locCbm | loc_cbm | FLOAT | Y | - | CBM |
| tempType | temp_type | VARCHAR | Y | 20 | 온도 유형 (상온/저온/냉동) |
| rackType | rack_type | VARCHAR | Y | 20 | 랙 유형 |
| restrictType | restrict_type | VARCHAR | Y | 20 | 제한 유형 |
| mixableFlag | mixable_flag | BOOLEAN | Y | - | 혼재 가능 여부 |
| delFlag | del_flag | BOOLEAN | Y | - | 삭제 여부 (default: false) |
| remarks | remarks | VARCHAR | Y | 255 | 비고 |
| attr01~05 | attr01~attr05 | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:
- `ix_locations_0` (UNIQUE): `loc_cd`, `domain_id`
- `ix_locations_1`: `wh_cd`, `zone_cd`, `domain_id`
- `ix_locations_2`: `del_flag`, `domain_id`
- `ix_locations_3`: `wh_cd`, `loc_type`, `domain_id`
- `ix_locations_4`: `wh_cd`, `temp_type`, `domain_id`
- `ix_locations_5`: `wh_cd`, `restrict_type`, `domain_id`
- `ix_locations_6`: `wh_cd`, `mixable_flag`, `domain_id`

---

### 3.7 runtime_envs — 런타임 환경 설정

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| whCd | wh_cd | VARCHAR | N | 30 | 창고 코드 |
| comCd | com_cd | VARCHAR | N | 30 | 화주사 코드 |

**인덱스**:
- `ix_runtime_envs_0` (UNIQUE): `domain_id`, `wh_cd`, `com_cd`

---

### 3.8 runtime_env_items — 런타임 환경 설정 항목

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| runtimeEnvId | runtime_env_id | VARCHAR | N | 40 | FK → runtime_envs |
| category | category | VARCHAR | Y | 30 | 카테고리 |
| name | name | VARCHAR | N | 50 | 항목명 |
| description | description | VARCHAR | Y | - | 설명 |
| value | value | VARCHAR | Y | 100 | 값 |
| config | config | VARCHAR | Y | 1000 | 설정 JSON |
| remarks | remarks | VARCHAR | Y | 255 | 비고 |

**인덱스**:
- `ix_runtime_env_items_0` (UNIQUE): `runtime_env_id`, `name`
- `ix_runtime_env_items_1`: `runtime_env_id`, `category`

---

### 3.9 sku — 상품 마스터

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| comCd | com_cd | VARCHAR | N | 30 | 화주사 코드 |
| vendCd | vend_cd | VARCHAR | Y | 30 | 공급사 코드 |
| skuCd | sku_cd | VARCHAR | N | 30 | 상품 코드 |
| skuNm | sku_nm | VARCHAR | N | 200 | 상품명 |
| skuAlias | sku_alias | VARCHAR | Y | 200 | 상품 별칭 |
| skuDesc | sku_desc | VARCHAR | Y | 200 | 상품 설명 |
| skuBarcd | sku_barcd | VARCHAR | N | 30 | 바코드 (주) |
| skuBarcd2 | sku_barcd2 | VARCHAR | Y | 30 | 바코드 2 |
| skuBarcd3 | sku_barcd3 | VARCHAR | Y | 30 | 바코드 3 |
| caseBarcd | case_barcd | VARCHAR | Y | 30 | 케이스 바코드 |
| boxBarcd | box_barcd | VARCHAR | Y | 30 | 박스 바코드 |
| matType | mat_type | VARCHAR | Y | 10 | 자재 유형 |
| skuType | sku_type | VARCHAR | Y | 20 | 상품 유형 |
| skuClass | sku_class | VARCHAR | Y | 40 | 상품 분류 |
| stockUnit | stock_unit | VARCHAR | Y | 6 | 재고 단위 |
| tempType | temp_type | VARCHAR | Y | 50 | 온도 유형 |
| fragileFlag | fragile_flag | BOOLEAN | Y | - | 파손 위험 여부 |
| variantFlag | variant_flag | BOOLEAN | Y | - | 변형 상품 여부 |
| boxInQty | box_in_qty | INTEGER | Y | - | 박스 내 수량 |
| pltInQty | plt_in_qty | INTEGER | Y | - | 팔레트 내 수량 |
| skuWd/Len/Ht/Vol/Wt | sku_wd~sku_wt | FLOAT | Y | - | 상품 치수/무게 |
| boxWd/Len/Ht/Vol/Wt | box_wd~box_wt | FLOAT | Y | - | 박스 치수/무게 |
| useExpireDate | use_expire_date | BOOLEAN | Y | - | 유통기한 사용 여부 |
| expirePeriod | expire_period | INTEGER | Y | - | 유통기한 기간 |
| prdExpiredPeriod | prd_expired_period | INTEGER | Y | - | 제조 유통기한 |
| imminentPeriod | imminent_period | INTEGER | Y | - | 임박 기간 |
| noOutPeriod | no_out_period | INTEGER | Y | - | 출고 금지 기간 |
| boxSplitQty | box_split_qty | FLOAT | Y | - | 박스 분할 수량 |
| setPrdFlag | set_prd_flag | BOOLEAN | Y | - | 세트 상품 여부 |
| bomSetFlag | bom_set_flag | BOOLEAN | Y | - | BOM 세트 여부 |
| imageUrl | image_url | VARCHAR | Y | - | 이미지 URL |
| delFlag | del_flag | BOOLEAN | N | - | 삭제 여부 (default: false) |
| remarks | remarks | VARCHAR | Y | 255 | 비고 |
| attr01~05 | attr01~attr05 | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:
- `ix_sku_0` (UNIQUE): `com_cd`, `sku_cd`, `domain_id`
- `ix_sku_1`: `com_cd`, `vend_cd`, `domain_id`
- `ix_sku_2`: `com_cd`, `sku_nm`, `domain_id`
- `ix_sku_3`: `com_cd`, `sku_barcd`, `domain_id`
- `ix_sku_4~9`: type/class/mat/temp/bom/del 별 인덱스

---

### 3.10 vendors — 공급사

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| comCd | com_cd | VARCHAR | N | 20 | 화주사 코드 |
| vendCd | vend_cd | VARCHAR | N | 20 | 공급사 코드 |
| vendNm | vend_nm | VARCHAR | N | 100 | 공급사 명 |
| vendAlias | vend_alias | VARCHAR | Y | 100 | 별칭 |
| vendType | vend_type | VARCHAR | Y | 20 | 공급사 유형 |
| vendGroup | vend_group | VARCHAR | Y | 20 | 공급사 그룹 |
| vendMgrNm | vend_mgr_nm | VARCHAR | Y | 40 | 담당자 명 |
| vendMgrEmail | vend_mgr_email | VARCHAR | Y | 50 | 담당자 이메일 |
| vendMgrPhone | vend_mgr_phone | VARCHAR | Y | 20 | 담당자 전화 |
| bizLicNo | biz_lic_no | VARCHAR | Y | 50 | 사업자 등록번호 |
| repPerNm | rep_per_nm | VARCHAR | Y | 40 | 대표자 명 |
| vendTelNo | vend_tel_no | VARCHAR | Y | 20 | 전화 |
| vendFaxNo | vend_fax_no | VARCHAR | Y | 20 | 팩스 |
| vendZipCd | vend_zip_cd | VARCHAR | Y | 100 | 우편번호 |
| vendAddr | vend_addr | VARCHAR | Y | - | 주소 |
| contractType | contract_type | VARCHAR | Y | 20 | 계약 유형 |
| delFlag | del_flag | BOOLEAN | N | - | 삭제 여부 (default: false) |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| attr01~05 | attr01~attr05 | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:
- `ix_vendors_0` (UNIQUE): `com_cd`, `vend_cd`, `domain_id`
- `ix_vendors_1~4`: nm/del/type/biz 별 인덱스

---

### 3.11 warehouses — 창고

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| whCd | wh_cd | VARCHAR | N | 30 | 창고 코드 (UNIQUE) |
| whNm | wh_nm | VARCHAR | N | 100 | 창고 명 |
| whAlias | wh_alias | VARCHAR | Y | 100 | 창고 별칭 |
| whType | wh_type | VARCHAR | Y | 20 | 창고 유형 |
| whGroup | wh_group | VARCHAR | Y | 20 | 창고 그룹 |
| opType | op_type | VARCHAR | Y | 20 | 운영 유형 |
| zipCd | zip_cd | VARCHAR | Y | 10 | 우편번호 |
| address | address | VARCHAR | Y | - | 주소 |
| delFlag | del_flag | BOOLEAN | Y | - | 삭제 여부 (default: false) |
| remarks | remarks | VARCHAR | Y | 255 | 비고 |
| attr01~05 | attr01~attr05 | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:
- `ix_warehouses_0` (UNIQUE): `wh_cd`, `domain_id`
- `ix_warehouses_1~3`: nm/type/del 별 인덱스

---

### 3.12 warehouse_charges — 창고 요금 정산

**상태 상수**:
- `IO_TYPE_INBOUND = "INBOUND"` / `IO_TYPE_OUTBOUND = "OUTBOUND"`
- `STATUS_READY = "READY"` / `STATUS_END = "END"`

**Lifecycle**: `@PrePersist`, `@PreUpdate`

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| whCd | wh_cd | VARCHAR | N | 20 | 창고 코드 |
| comCd | com_cd | VARCHAR | N | 20 | 화주사 코드 |
| chargeNo | charge_no | VARCHAR | N | 20 | 정산 번호 |
| ioType | io_type | VARCHAR | N | 20 | 입출고 유형 |
| chargeType | charge_type | VARCHAR | N | 20 | 요금 유형 |
| chargeDate | charge_date | VARCHAR | N | 10 | 정산 일자 |
| status | status | VARCHAR | Y | 20 | 상태 (READY/END) |
| skuCd | sku_cd | VARCHAR | Y | 30 | 상품 코드 |
| charge01~10 | charge01~charge10 | DOUBLE | Y | - | 요금 항목 1~10 |
| totalCharge | total_charge | DOUBLE | Y | - | 총 요금 |
| endYear | end_year | VARCHAR | Y | 4 | 마감 연도 |
| endMonth | end_month | VARCHAR | Y | 2 | 마감 월 |

**인덱스** (총 10개):
- `ix_warehouse_charges_0` (UNIQUE): `wh_cd`, `com_cd`, `charge_no`, `sku_cd`, `io_type`, `charge_type`, `domain_id`
- `ix_warehouse_charges_1~9`: 날짜/유형/기간 조합 인덱스

---

### 3.13 warehouse_charge_settings — 창고 요금 설정

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| whCd | wh_cd | VARCHAR | N | 20 | 창고 코드 |
| comCd | com_cd | VARCHAR | N | 20 | 화주사 코드 |
| settingCd | setting_cd | VARCHAR | N | 36 | 설정 코드 |
| settingNm | setting_nm | VARCHAR | N | - | 설정 명 |
| value | value | VARCHAR | Y | 50 | 값 |
| defaultFlag | default_flag | BOOLEAN | Y | - | 기본 여부 |
| remarks | remarks | VARCHAR | Y | - | 비고 |

**인덱스**:
- `ix_warehouse_charge_settings_0` (UNIQUE): `wh_cd`, `com_cd`, `setting_cd`, `domain_id`

---

### 3.14 warehouse_charge_setting_items — 창고 요금 설정 항목

**상태 상수**: `TYPE_DEFAULT = "DEFAULT"`

**Lifecycle**: `@PrePersist`

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| warehouseChargeSettingId | warehouse_charge_setting_id | VARCHAR | N | 40 | FK → warehouse_charge_settings |
| rank | rank | INTEGER | N | - | 순위 |
| type | type | VARCHAR | N | 36 | 유형 (default: DEFAULT) |
| code | code | VARCHAR | N | 36 | 코드 |
| value | value | VARCHAR | N | 50 | 값 |
| remarks | remarks | VARCHAR | Y | - | 비고 |
| delFlag | del_flag | BOOLEAN | Y | - | 삭제 여부 |

**인덱스**:
- `ix_warehouse_charge_setting_item_0` (UNIQUE): `warehouse_charge_setting_id`, `type`, `code`, `domain_id`

---

### 3.15 zones — 구역

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| whCd | wh_cd | VARCHAR | N | 20 | 창고 코드 |
| zoneCd | zone_cd | VARCHAR | N | 20 | 구역 코드 (UNIQUE) |
| zoneNm | zone_nm | VARCHAR | Y | 30 | 구역 명 |
| zoneType | zone_type | VARCHAR | Y | 20 | 구역 유형 |
| zoneGroup | zone_group | VARCHAR | Y | 20 | 구역 그룹 |
| tempType | temp_type | VARCHAR | Y | 20 | 온도 유형 (상온/저온/냉동) |
| rackType | rack_type | VARCHAR | Y | 20 | 랙 유형 |
| systemFlag | system_flag | BOOLEAN | Y | - | 시스템 구역 여부 (default: false) |
| restrictType | restrict_type | VARCHAR | Y | 20 | 제한 유형 |
| remarks | remarks | VARCHAR | Y | 255 | 비고 |

**인덱스**:
- `ix_zones_0` (UNIQUE): `zone_cd`, `domain_id`
- `ix_zones_1~6`: wh_cd 기반 type/group/temp/rack/system 별 인덱스

---

## 4. 입고 관리 (inbound)

### 4.1 receivings — 입고 지시 (헤더)

**Lifecycle**: `@PrePersist` — `rcv_req_no` 미설정 시 `diy-generate-req-rcv-no` 커스텀 서비스로 자동 채번

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| rcvNo | rcv_no | VARCHAR | N | 20 | 입고 번호 |
| rcvReqNo | rcv_req_no | VARCHAR | Y | 20 | 입고 요청 번호 (자동 채번) |
| rcvReqDate | rcv_req_date | VARCHAR | N | 10 | 입고 요청 일자 |
| rcvEndDate | rcv_end_date | VARCHAR | Y | 10 | 입고 완료 일자 |
| status | status | VARCHAR | Y | 20 | 상태 |
| rcvType | rcv_type | VARCHAR | N | 20 | 입고 유형 |
| whCd | wh_cd | VARCHAR | Y | 20 | 창고 코드 |
| comCd | com_cd | VARCHAR | Y | 20 | 화주사 코드 |
| vendCd | vend_cd | VARCHAR | Y | 20 | 공급사 코드 |
| mgrId | mgr_id | VARCHAR | Y | 32 | 담당자 ID |
| inspFlag | insp_flag | BOOLEAN | Y | - | 검수 여부 |
| labelFlag | label_flag | BOOLEAN | Y | - | 라벨 출력 여부 |
| carNo | car_no | VARCHAR | Y | 30 | 차량 번호 |
| driverNm | driver_nm | VARCHAR | Y | 40 | 운전자 명 |
| driverTel | driver_tel | VARCHAR | Y | 20 | 운전자 전화 |
| totalBox | total_box | INTEGER | Y | - | 총 박스 수 |
| boxWt | box_wt | DOUBLE | Y | - | 박스 무게 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| attr01~05 | attr01~attr05 | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:
- `ix_receivings_0` (UNIQUE): `rcv_no`, `com_cd`, `domain_id`
- `ix_receivings_1`: `com_cd`, `domain_id`
- `ix_receivings_2`: `wh_cd`, `domain_id`
- `ix_receivings_3`: `vend_cd`, `domain_id`
- `ix_receivings_4`: `com_cd`, `rcv_req_no`, `domain_id`
- `ix_receivings_5`: `com_cd`, `status`, `domain_id`
- `ix_receivings_6`: `rcv_req_date`, `com_cd`, `domain_id`
- `ix_receivings_7`: `rcv_end_date`, `com_cd`, `domain_id`

---

### 4.2 receiving_items — 입고 지시 상세

**Lifecycle**: `@PrePersist` — `rcv_seq` 자동 채번 (`MAX(rcv_seq) + 1`), SKU 명 자동 조회
`@PreUpdate` — 상태 자동 계산, 수량 자동 설정 (설정값 `RECEIPT_QTY_AUTO_SETTING_FLAG`)

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| receivingId | receiving_id | VARCHAR | N | 40 | FK → receivings |
| rcvExpSeq | rcv_exp_seq | INTEGER | N | - | 입고 예정 순번 |
| rcvSeq | rcv_seq | INTEGER | Y | - | 입고 처리 순번 (자동 채번) |
| status | status | VARCHAR | Y | 20 | 상태 |
| skuCd | sku_cd | VARCHAR | N | 30 | 상품 코드 |
| skuNm | sku_nm | VARCHAR | Y | 255 | 상품명 (자동 조회) |
| rcvExpDate | rcv_exp_date | VARCHAR | N | 10 | 입고 예정 일자 |
| rcvDate | rcv_date | VARCHAR | Y | 10 | 입고 실적 일자 |
| totalExpQty | total_exp_qty | DOUBLE | N | - | 총 예정 수량 |
| rcvExpQty | rcv_exp_qty | DOUBLE | N | - | 입고 예정 수량 |
| expPalletQty | exp_pallet_qty | INTEGER | Y | - | 예정 팔레트 수 |
| expBoxQty | exp_box_qty | INTEGER | Y | - | 예정 박스 수 |
| expEaQty | exp_ea_qty | DOUBLE | Y | - | 예정 낱개 수 |
| rcvQty | rcv_qty | DOUBLE | Y | - | 입고 수량 |
| rcvPalletQty | rcv_pallet_qty | INTEGER | Y | - | 입고 팔레트 수 |
| rcvBoxQty | rcv_box_qty | INTEGER | Y | - | 입고 박스 수 |
| rcvEaQty | rcv_ea_qty | DOUBLE | Y | - | 입고 낱개 수 |
| locCd | loc_cd | VARCHAR | Y | 20 | 로케이션 코드 |
| itemType | item_type | VARCHAR | Y | 20 | 아이템 유형 |
| expiredDate | expired_date | VARCHAR | Y | 10 | 유통기한 |
| prdDate | prd_date | VARCHAR | Y | 10 | 제조일자 |
| lotNo | lot_no | VARCHAR | Y | 30 | 로트 번호 |
| barcode | barcode | VARCHAR | Y | 40 | 바코드 |
| invoiceNo | invoice_no | VARCHAR | Y | 30 | 인보이스 번호 |
| blNo | bl_no | VARCHAR | Y | 30 | BL 번호 |
| poNo | po_no | VARCHAR | Y | 30 | PO 번호 |
| palletCd | pallet_cd | VARCHAR | Y | 30 | 팔레트 코드 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| attr01~05 | attr01~attr05 | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:
- `ix_receiving_items_0` (UNIQUE): `rcv_seq`, `rcv_exp_seq`, `receiving_id`, `domain_id`
- `ix_receiving_items_1`: `invoice_no`, `domain_id`
- `ix_receiving_items_2`: `bl_no`, `domain_id`

**내부 SQL** (PrePersist/PreUpdate):
```sql
-- rcv_seq 채번
SELECT MAX(rcv_seq) FROM receiving_items WHERE domain_id = :domainId AND receiving_id = :receivingId

-- SKU명 조회
SELECT sku_nm FROM sku WHERE domain_id = :domainId AND com_cd = :comCd AND sku_cd = :skuCd
```

---

## 5. 출고 관리 (outbound)

### 5.1 release_orders — 출고 지시 (헤더)

**상태 상수**:
| 상수 | 값 | 설명 |
|------|-----|------|
| STATUS_REG | "REG" | 출고 등록 중 |
| STATUS_REQ | "REQ" | 출고 요청 |
| STATUS_WAIT | "WAIT" | 출고 요청 확인 |
| STATUS_READY | "READY" | 출고지시 대기 |
| STATUS_RUN | "RUN" | 출고 작업 중 |
| STATUS_PICKED | "PICKED" | 피킹 완료 |
| STATUS_END | "END" | 출고 완료 |
| STATUS_CANCEL | "CANCEL" | 출고 취소 |

**Lifecycle**: `@PrePersist` — `rls_req_no` 자동 채번 (`diy-generate-rls-ord-no`)
`@PreDelete` — 연관 `release_order_items` 삭제

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| rlsOrdNo | rls_ord_no | VARCHAR | N | 30 | 출고 주문 번호 |
| rlsReqNo | rls_req_no | VARCHAR | N | 30 | 출고 요청 번호 (자동 채번) |
| rlsReqDate | rls_req_date | VARCHAR | N | 10 | 출고 요청 일자 |
| rlsOrdDate | rls_ord_date | VARCHAR | Y | 10 | 출고 지시 일자 |
| waveNo | wave_no | VARCHAR | Y | 30 | 웨이브 번호 |
| comCd | com_cd | VARCHAR | N | 30 | 화주사 코드 |
| custCd | cust_cd | VARCHAR | N | 30 | 고객사 코드 |
| whCd | wh_cd | VARCHAR | N | 30 | 창고 코드 |
| bizType | biz_type | VARCHAR | Y | 10 | 업무 유형 (B2C/B2B) |
| rlsType | rls_type | VARCHAR | Y | 20 | 출고 유형 |
| rlsExeType | rls_exe_type | VARCHAR | Y | 20 | 출고 실행 유형 |
| dlvType | dlv_type | VARCHAR | Y | 20 | 배송 유형 |
| toWhCd | to_wh_cd | VARCHAR | Y | 30 | 목적 창고 코드 |
| requesterId | requester_id | VARCHAR | Y | 36 | 요청자 ID |
| poNo | po_no | VARCHAR | Y | 30 | PO 번호 |
| invoiceNo | invoice_no | VARCHAR | Y | 30 | 인보이스 번호 |
| boxId | box_id | VARCHAR | Y | 30 | 박스 ID |
| boxSeq | box_seq | INTEGER | Y | - | 박스 순번 |
| boxType | box_type | VARCHAR | Y | 20 | 박스 유형 |
| totalBox | total_box | INTEGER | Y | - | 총 박스 수 |
| boxWt | box_wt | DOUBLE | Y | - | 박스 무게 |
| status | status | VARCHAR | Y | 20 | 상태 |
| startedAt | started_at | VARCHAR | Y | 20 | 시작 일시 |
| finishedAt | finished_at | VARCHAR | Y | 20 | 완료 일시 |
| reportedAt | reported_at | VARCHAR | Y | 20 | 보고 일시 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| attr01~05 | attr01~attr05 | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:
- `ix_release_orders_0` (UNIQUE): `domain_id`, `rls_req_no`
- `ix_release_orders_1` (UNIQUE): `domain_id`, `rls_ord_no`
- `ix_release_orders_2`: `domain_id`, `rls_req_date`, `rls_ord_no`, `status`, `export_flag`
- `ix_release_orders_3`: `domain_id`, `wave_no`
- `ix_release_orders_4`: `domain_id`, `com_cd`, `wh_cd`
- `ix_release_orders_5`: `domain_id`, `biz_type`, `rls_type`, `rls_exe_type`, `dlv_type`
- `ix_release_orders_6`: `domain_id`, `po_no`, `invoice_no`, `box_id`

**내부 SQL** (PreDelete):
```sql
DELETE FROM release_order_items WHERE domain_id = :domainId AND release_order_id = :releaseOrderId
```

---

### 5.2 release_order_items — 출고 지시 상세

**상태 상수**: REG, REQ, WAIT, READY, RUN, PICKED, END, CANCEL

**Lifecycle**: `@PrePersist` — `line_no` 자동 채번 (OutboundQueryStore → `MAX(line_no) + 1`)

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| releaseOrderId | release_order_id | VARCHAR | N | 40 | FK → release_orders |
| rank | rank | INTEGER | Y | - | 순위 |
| rlsLineNo | rls_line_no | VARCHAR | Y | 5 | 출고 라인 번호 |
| lineNo | line_no | VARCHAR | N | 5 | 라인 번호 (자동 채번) |
| rlsExpSeq | rls_exp_seq | INTEGER | Y | - | 출고 예정 순번 |
| rlsSeq | rls_seq | INTEGER | Y | - | 출고 처리 순번 |
| skuCd | sku_cd | VARCHAR | N | 30 | 상품 코드 |
| skuNm | sku_nm | VARCHAR | Y | - | 상품명 |
| poNo | po_no | VARCHAR | Y | 50 | PO 번호 |
| doNo | do_no | VARCHAR | Y | 50 | DO 번호 |
| invoiceNo | invoice_no | VARCHAR | Y | 50 | 인보이스 번호 |
| totOrdQty | tot_ord_qty | DOUBLE | Y | - | 총 주문 수량 |
| ordQty | ord_qty | DOUBLE | N | - | 주문 수량 |
| ordPalletQty | ord_pallet_qty | DOUBLE | Y | - | 주문 팔레트 수 |
| ordBoxQty | ord_box_qty | DOUBLE | Y | - | 주문 박스 수 |
| ordEaQty | ord_ea_qty | DOUBLE | Y | - | 주문 낱개 수 |
| rlsQty | rls_qty | DOUBLE | Y | - | 출고 수량 |
| rptQty | rpt_qty | DOUBLE | Y | - | 실적 수량 |
| expiredDate | expired_date | VARCHAR | Y | 10 | 유통기한 |
| prodDate | prod_date | VARCHAR | Y | 10 | 제조일자 |
| lotNo | lot_no | VARCHAR | Y | 50 | 로트 번호 |
| serialNo | serial_no | VARCHAR | Y | 50 | 시리얼 번호 |
| barcode | barcode | VARCHAR | Y | 50 | 바코드 |
| zoneCd | zone_cd | VARCHAR | Y | 30 | 구역 코드 |
| locCd | loc_cd | VARCHAR | Y | 30 | 로케이션 코드 |
| palletCd | pallet_cd | VARCHAR | Y | 30 | 팔레트 코드 |
| status | status | VARCHAR | Y | 20 | 상태 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| attr01~05 | attr01~attr05 | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:
- `ix_release_order_items_0`: `domain_id`, `release_order_id`
- `ix_release_order_items_1`: `domain_id`, `release_order_id`, `rls_line_no`, `line_no`
- `ix_release_order_items_2~7`: sku/po/invoice/lot/status/barcode 별 인덱스

---

### 5.3 picking_orders — 피킹 지시 (헤더)

**상태 상수**: WAIT, RUN, END, CANCEL

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| pickOrderNo | pick_order_no | VARCHAR | N | 30 | 피킹 지시 번호 |
| orderSeq | order_seq | INTEGER | N | - | 피킹 순번 |
| waveNo | wave_no | VARCHAR | Y | 30 | 웨이브 번호 |
| orderDate | order_date | VARCHAR | N | 10 | 지시 일자 |
| comCd | com_cd | VARCHAR | N | 30 | 화주사 코드 |
| whCd | wh_cd | VARCHAR | N | 30 | 창고 코드 |
| planOrder | plan_order | INTEGER | N | - | 계획 주문 수 |
| planSku | plan_sku | INTEGER | N | - | 계획 SKU 수 |
| planPcs | plan_pcs | DOUBLE | N | - | 계획 수량 |
| boxInQty | box_in_qty | DOUBLE | Y | - | 박스 내 수량 |
| planBox | plan_box | INTEGER | Y | - | 계획 박스 수 |
| planEa | plan_ea | DOUBLE | Y | - | 계획 낱개 수 |
| resultBox | result_box | INTEGER | Y | - | 실적 박스 수 |
| resultPcs | result_pcs | DOUBLE | Y | - | 실적 수량 |
| progressRate | progress_rate | DOUBLE | Y | - | 진행률 |
| status | status | VARCHAR | Y | 10 | 상태 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| attr01~05 | attr01~attr05 | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:
- `ix_picking_orders_0` (UNIQUE): `pick_order_no`, `domain_id`
- `ix_picking_orders_1`: `status`, `order_date`, `domain_id`
- `ix_picking_orders_2`: `wave_no`, `domain_id`
- `ix_picking_orders_3`: `wh_cd`, `com_cd`, `domain_id`

---

### 5.4 picking_order_items — 피킹 지시 상세

**상태 상수**: WAIT, RUN, END, CANCEL

**Lifecycle**: `@PrePersist` — 초기화 처리

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| pickOrderId | pick_order_id | VARCHAR | N | 40 | FK → picking_orders |
| inventoryId | inventory_id | VARCHAR | N | 40 | FK → inventories |
| barcode | barcode | VARCHAR | N | 30 | 바코드 |
| rank | rank | INTEGER | N | - | 순위 |
| rlsLineNo | rls_line_no | VARCHAR | Y | 5 | 출고 라인 번호 |
| skuCd | sku_cd | VARCHAR | N | 30 | 상품 코드 |
| skuNm | sku_nm | VARCHAR | Y | - | 상품명 |
| fromLocCd | from_loc_cd | VARCHAR | N | 30 | 피킹 위치 |
| toLocCd | to_loc_cd | VARCHAR | N | 30 | 목적 위치 |
| lotNo | lot_no | VARCHAR | Y | 50 | 로트 번호 |
| serialNo | serial_no | VARCHAR | Y | 50 | 시리얼 번호 |
| expiredDate | expired_date | VARCHAR | Y | 20 | 유통기한 |
| prodDate | prod_date | VARCHAR | Y | 20 | 제조일자 |
| boxInQty | box_in_qty | DOUBLE | Y | - | 박스 내 수량 |
| orderQty | order_qty | DOUBLE | N | - | 주문 수량 |
| orderBox | order_box | INTEGER | Y | - | 주문 박스 수 |
| orderEa | order_ea | DOUBLE | Y | - | 주문 낱개 수 |
| pickQty | pick_qty | DOUBLE | Y | - | 피킹 수량 |
| pickBox | pick_box | INTEGER | Y | - | 피킹 박스 수 |
| pickEa | pick_ea | DOUBLE | Y | - | 피킹 낱개 수 |
| status | status | VARCHAR | Y | 10 | 상태 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |

**인덱스**:
- `ix_picking_order_items_0`: `domain_id`, `pick_order_id`, `rls_line_no`
- `ix_picking_order_items_1~5`: sku/loc/barcode/status/inventory 별 인덱스

---

### 5.5 waves — 웨이브

**상태 상수**: WAIT, RUN, END, CANCEL

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| waveNo | wave_no | VARCHAR | N | 30 | 웨이브 번호 |
| jobDate | job_date | VARCHAR | N | 10 | 작업 일자 |
| jobSeq | job_seq | VARCHAR | N | 10 | 작업 순번 |
| comCd | com_cd | VARCHAR | Y | 30 | 화주사 코드 |
| whCd | wh_cd | VARCHAR | Y | 30 | 창고 코드 |
| waveType | wave_type | VARCHAR | Y | 20 | 웨이브 유형 |
| rlsType | rls_type | VARCHAR | Y | 20 | 출고 유형 |
| rlsExeType | rls_exe_type | VARCHAR | Y | 20 | 출고 실행 유형 |
| exportFlag | export_flag | BOOLEAN | Y | - | 외부 출력 여부 |
| inspFlag | insp_flag | BOOLEAN | Y | - | 검수 여부 |
| labelTemplateCd | label_template_cd | VARCHAR | Y | 36 | 라벨 템플릿 코드 |
| planOrder | plan_order | INTEGER | Y | - | 계획 주문 수 |
| planSku | plan_sku | INTEGER | Y | - | 계획 SKU 수 |
| planPcs | plan_pcs | FLOAT | Y | - | 계획 수량 |
| resultOrder | result_order | INTEGER | Y | - | 실적 주문 수 |
| resultSku | result_sku | INTEGER | Y | - | 실적 SKU 수 |
| resultPcs | result_pcs | FLOAT | Y | - | 실적 수량 |
| status | status | VARCHAR | Y | 20 | 상태 |
| startedAt | started_at | VARCHAR | Y | 20 | 시작 일시 |
| finishedAt | finished_at | VARCHAR | Y | 20 | 완료 일시 |
| reportedAt | reported_at | VARCHAR | Y | 20 | 보고 일시 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| attr01~05 | attr01~attr05 | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:
- `ix_waves_0` (UNIQUE): `domain_id`, `wave_no`
- `ix_waves_1~5`: date/com/type/flag/status 별 인덱스

---

### 5.6 delivery_infos — 배송 정보

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| releaseOrderId | release_order_id | VARCHAR | N | 40 | FK → release_orders |
| rlsOrdNo | rls_ord_no | VARCHAR | N | 30 | 출고 주문 번호 |
| dlvType | dlv_type | VARCHAR | Y | 20 | 배송 유형 |
| exportFlag | export_flag | BOOLEAN | Y | - | 출고 여부 |
| dlvVendCd | dlv_vend_cd | VARCHAR | Y | 30 | 택배사 코드 |
| vehicleNo | vehicle_no | VARCHAR | Y | 30 | 차량 번호 |
| dlvNo | dlv_no | VARCHAR | Y | 30 | 배송 번호 |
| invoiceNo | invoice_no | VARCHAR | Y | 30 | 송장 번호 |
| senderCd | sender_cd | VARCHAR | Y | 30 | 발송인 코드 |
| senderNm | sender_nm | VARCHAR | Y | 100 | 발송인 명 |
| senderPhone | sender_phone | VARCHAR | Y | 20 | 발송인 전화 |
| senderPhone2 | sender_phone2 | VARCHAR | Y | 20 | 발송인 전화2 |
| senderZipCd | sender_zip_cd | VARCHAR | Y | 20 | 발송인 우편번호 |
| senderAddr | sender_addr | VARCHAR | Y | - | 발송인 주소 |
| senderAddr2 | sender_addr2 | VARCHAR | Y | - | 발송인 주소2 |
| ordererCd | orderer_cd | VARCHAR | Y | 30 | 주문자 코드 |
| ordererNm | orderer_nm | VARCHAR | Y | 100 | 주문자 명 |
| receiverCd | receiver_cd | VARCHAR | Y | 30 | 수취인 코드 |
| receiverNm | receiver_nm | VARCHAR | Y | 100 | 수취인 명 |
| receiverPhone | receiver_phone | VARCHAR | Y | 20 | 수취인 전화 |
| receiverPhone2 | receiver_phone2 | VARCHAR | Y | 20 | 수취인 전화2 |
| receiverZipCd | receiver_zip_cd | VARCHAR | Y | 20 | 수취인 우편번호 |
| receiverAddr | receiver_addr | VARCHAR | Y | - | 수취인 주소 |
| receiverAddr2 | receiver_addr2 | VARCHAR | Y | - | 수취인 주소2 |
| assort1Cd~3Cd | assort1_cd~assort3_cd | VARCHAR | Y | 30 | 분류 코드 1~3 |
| deliveryInfoSet | delivery_info_set | VARCHAR | Y | 2000 | 배송 정보 세트 (JSON) |
| memo | memo | VARCHAR | Y | 100 | 메모 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| attr01~05 | attr01~attr05 | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:
- `ix_delivery_infos_0` (UNIQUE): `release_order_id`, `domain_id`
- `ix_delivery_infos_1` (UNIQUE): `rls_ord_no`, `domain_id`
- `ix_delivery_infos_2~5`: type/dlv_no/invoice/export 별 인덱스

---

### 5.7 supply_orders — 보충 지시 (헤더)

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| supplyOrderNo | supply_order_no | VARCHAR | N | 30 | 보충 지시 번호 |
| waveNo | wave_no | VARCHAR | N | 30 | 웨이브 번호 |
| orderDate | order_date | VARCHAR | N | 10 | 지시 일자 |
| comCd | com_cd | VARCHAR | N | 30 | 화주사 코드 |
| whCd | wh_cd | VARCHAR | N | 30 | 창고 코드 |
| planOrder | plan_order | INTEGER | N | - | 계획 주문 수 |
| planSku | plan_sku | INTEGER | N | - | 계획 SKU 수 |
| planPcs | plan_pcs | DOUBLE | N | - | 계획 수량 |
| resultPcs | result_pcs | DOUBLE | N | - | 실적 수량 |
| progressRate | progress_rate | VARCHAR | N | 30 | 진행률 |
| status | status | VARCHAR | N | 10 | 상태 |
| remarks | remarks | VARCHAR | N | 1000 | 비고 |

**인덱스**:
- `ix_supply_orders_0` (UNIQUE): `supply_order_no`, `domain_id`
- `ix_supply_orders_1~3`: wave/date/status 별 인덱스

---

### 5.8 supply_order_items — 보충 지시 상세

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| supplyOrderId | supply_order_id | VARCHAR | N | 40 | FK → supply_orders |
| rank | rank | INTEGER | N | - | 순위 |
| skuCd | sku_cd | VARCHAR | N | 30 | 상품 코드 |
| skuNm | sku_nm | VARCHAR | Y | - | 상품명 |
| fromLocCd | from_loc_cd | VARCHAR | N | 30 | 출발 로케이션 |
| toLocCd | to_loc_cd | VARCHAR | N | 30 | 목적 로케이션 |
| boxInQty | box_in_qty | DOUBLE | Y | - | 박스 내 수량 |
| orderQty | order_qty | DOUBLE | N | - | 주문 수량 |
| orderBox | order_box | INTEGER | N | - | 주문 박스 수 |
| orderEa | order_ea | DOUBLE | N | - | 주문 낱개 수 |
| supplyQty | supply_qty | DOUBLE | Y | - | 보충 수량 |
| supplyBox | supply_box | INTEGER | Y | - | 보충 박스 수 |
| supplyEa | supply_ea | DOUBLE | Y | - | 보충 낱개 수 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |

**인덱스**:
- `ix_supply_order_items_0` (UNIQUE): `domain_id`, `supply_order_id`, `rank`
- `ix_supply_order_items_1~3`: sku/from_loc/to_loc 별 인덱스

---

## 6. 재고 관리 (stock)

### 6.1 inventories — 재고

**상태 상수**:
| 상수 | 값 | 설명 |
|------|-----|------|
| STATUS_EMPTY | "EMPTY" | 비어있음 |
| STATUS_WAITING | "WAITING" | 입고 대기 |
| STATUS_STORED | "STORED" | 보관 중 |
| STATUS_RESERVED | "RESERVED" | 피킹 예약 |
| STATUS_PICK | "PICKING" | 피킹 중 |
| STATUS_LOCK | "LOCKED" | 잠김 (홀드) |
| STATUS_BAD | "BAD" | 불량/파손 |
| EXPIRE_STATUS_NORMAL | "NORMAL" | 정상 |
| EXPIRE_STATUS_IMMINENT | "IMMINENT" | 유통기한 임박 |
| EXPIRE_STATUS_EXPIRED | "EXPIRED" | 유통기한 만료 |

**트랜잭션 코드** (last_tran_cd):
`IN_INSP`, `IN`, `OUT`, `OUT_CANCEL`, `MOVE`, `TRANSFER`, `RESERVE`, `HOLD`, `RELEASE_HOLD`, `SCRAP`, `SPLIT`, `MERGE`, `ADJUST`, `NEW`

**Lifecycle**: `@PrePersist` — 바코드 자동 생성 (`diy-generate-inv-barcode`), SKU명 자동 조회
`@PostPersist` — 이력(`inventory_hists`) 자동 생성
`@PreUpdate` — 이력 자동 생성 준비
`@PostUpdate` — 이력(`inventory_hists`) 자동 생성

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| barcode | barcode | VARCHAR | N | 30 | 재고 바코드 (자동 생성) |
| whCd | wh_cd | VARCHAR | N | 30 | 창고 코드 |
| comCd | com_cd | VARCHAR | N | 30 | 화주사 코드 |
| skuCd | sku_cd | VARCHAR | N | 30 | 상품 코드 |
| skuBcd | sku_bcd | VARCHAR | Y | 50 | 상품 바코드 |
| skuNm | sku_nm | VARCHAR | Y | 255 | 상품명 (자동 조회) |
| vendCd | vend_cd | VARCHAR | Y | 30 | 공급사 코드 |
| makerCd | maker_cd | VARCHAR | Y | 30 | 제조사 코드 |
| locCd | loc_cd | VARCHAR | N | 30 | 로케이션 코드 |
| palletCd | pallet_cd | VARCHAR | Y | 30 | 팔레트 코드 |
| poNo | po_no | VARCHAR | Y | 30 | PO 번호 |
| invoiceNo | invoice_no | VARCHAR | Y | 30 | 인보이스 번호 |
| rcvNo | rcv_no | VARCHAR | Y | 30 | 입고 번호 |
| rcvSeq | rcv_seq | INTEGER | Y | - | 입고 순번 |
| rlsOrdNo | rls_ord_no | VARCHAR | Y | 30 | 출고 주문 번호 |
| rlsLineNo | rls_line_no | VARCHAR | Y | 30 | 출고 라인 번호 |
| packType | pack_type | VARCHAR | Y | 20 | 포장 유형 |
| packNo | pack_no | VARCHAR | Y | 30 | 포장 번호 |
| origin | origin | VARCHAR | Y | 10 | 원산지 |
| lotNo | lot_no | VARCHAR | Y | 50 | 로트 번호 |
| serialNo | serial_no | VARCHAR | Y | 50 | 시리얼 번호 |
| expiredDate | expired_date | VARCHAR | Y | 10 | 유통기한 |
| prodDate | prod_date | VARCHAR | Y | 10 | 제조일자 |
| weight | weight | DOUBLE | Y | - | 무게 |
| cbm | cbm | DOUBLE | Y | - | CBM |
| palletQty | pallet_qty | INTEGER | Y | - | 팔레트 수 |
| boxQty | box_qty | INTEGER | Y | - | 박스 수 |
| eaQty | ea_qty | DOUBLE | Y | - | 낱개 수 |
| reservedQty | reserved_qty | DOUBLE | Y | - | 예약 수량 |
| invQty | inv_qty | DOUBLE | N | - | 재고 수량 |
| lastTranCd | last_tran_cd | VARCHAR | Y | 20 | 최종 트랜잭션 코드 |
| expireStatus | expire_status | VARCHAR | Y | 10 | 유통기한 상태 |
| owner | owner | VARCHAR | Y | 32 | 소유자 |
| status | status | VARCHAR | Y | 10 | 재고 상태 |
| erpStatus | erp_status | VARCHAR | Y | 20 | ERP 연동 상태 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| delFlag | del_flag | BOOLEAN | Y | - | 삭제 여부 |

**인덱스** (총 11개):
- `ix_inventories_0`: `domain_id`, `barcode`, `loc_cd`
- `ix_inventories_1`: `domain_id`, `wh_cd`, `com_cd`
- `ix_inventories_2`: `domain_id`, `wh_cd`, `vend_cd`, `maker_cd`
- `ix_inventories_3`: `domain_id`, `wh_cd`, `com_cd`, `loc_cd`, `sku_cd`
- `ix_inventories_4`: `domain_id`, `wh_cd`, `invoice_no`, `lot_no`, `expired_date`
- `ix_inventories_5~10`: last_tran/rcv_no/rls_ord_no/expire_status/status/del_flag 별 인덱스

**내부 SQL** (PostPersist/PostUpdate):
```sql
-- 이력 최대 순번 조회
SELECT MAX(hist_seq) FROM inventory_hists WHERE domain_id = :domainId AND barcode = :barcode
```

---

### 6.2 inventory_hists — 재고 이력

재고(`inventories`)의 모든 생성/수정 시 자동으로 이력이 생성됨.

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| histSeq | hist_seq | INTEGER | N | - | 이력 순번 (UNIQUE with barcode) |
| barcode | barcode | VARCHAR | N | 30 | 재고 바코드 |
| whCd | wh_cd | VARCHAR | N | 30 | 창고 코드 |
| comCd | com_cd | VARCHAR | N | 30 | 화주사 코드 |
| skuCd | sku_cd | VARCHAR | N | 30 | 상품 코드 |
| skuNm | sku_nm | VARCHAR | Y | 255 | 상품명 |
| vendCd | vend_cd | VARCHAR | Y | 30 | 공급사 코드 |
| makerCd | maker_cd | VARCHAR | Y | 30 | 제조사 코드 |
| locCd | loc_cd | VARCHAR | N | 30 | 로케이션 코드 |
| lotNo | lot_no | VARCHAR | Y | 50 | 로트 번호 |
| expiredDate | expired_date | VARCHAR | Y | 10 | 유통기한 |
| prodDate | prod_date | VARCHAR | Y | 10 | 제조일자 |
| invoiceNo | invoice_no | VARCHAR | Y | 30 | 인보이스 번호 |
| invQty | inv_qty | DOUBLE | N | - | 재고 수량 (이력 시점) |
| lastTranCd | last_tran_cd | VARCHAR | Y | 20 | 트랜잭션 코드 |
| expireStatus | expire_status | VARCHAR | Y | 10 | 유통기한 상태 |
| status | status | VARCHAR | Y | 10 | 재고 상태 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |

**인덱스** (총 10개):
- `ix_inventory_hists_0` (UNIQUE): `domain_id`, `barcode`, `hist_seq`
- `ix_inventory_hists_1~9`: wh/vend/loc/invoice/lot/expired/expire_status/status/last_tran 별 인덱스

---

### 6.3 stocktakes — 재고 실사 (헤더)

**상태 상수**: WAIT, RUN, END, CANCEL

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| comCd | com_cd | VARCHAR | N | 30 | 화주사 코드 |
| whCd | wh_cd | VARCHAR | N | 30 | 창고 코드 |
| jobDate | job_date | VARCHAR | N | 10 | 실사 일자 |
| jobSeq | job_seq | INTEGER | N | - | 실사 순번 |
| planSku | plan_sku | INTEGER | Y | - | 계획 SKU 수 |
| resultSku | result_sku | INTEGER | Y | - | 실적 SKU 수 |
| diffSku | diff_sku | INTEGER | Y | - | 차이 SKU 수 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| status | status | VARCHAR | Y | 10 | 상태 |
| attr01~05 | attr01~attr05 | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:
- `ix_stocktakes_0` (UNIQUE): `com_cd`, `wh_cd`, `job_date`, `job_seq`, `domain_id`

---

### 6.4 stocktake_items — 재고 실사 상세

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| stocktakeId | stocktake_id | VARCHAR | N | 40 | FK → stocktakes |
| skuCd | sku_cd | VARCHAR | N | 30 | 상품 코드 |
| skuNm | sku_nm | VARCHAR | N | 200 | 상품명 |
| zoneCd | zone_cd | VARCHAR | Y | 30 | 구역 코드 |
| locCd | loc_cd | VARCHAR | Y | 30 | 로케이션 코드 |
| totalQty | total_qty | DOUBLE | N | - | 전산 수량 (기준) |
| stocktakeQty | stocktake_qty | DOUBLE | Y | - | 실사 수량 |
| diffQty | diff_qty | DOUBLE | Y | - | 차이 수량 (실사 - 전산) |
| status | status | VARCHAR | Y | 20 | 상태 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| attr01~05 | attr01~attr05 | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:
- `ix_stocktake_items_0` (UNIQUE): `stocktake_id`, `sku_cd`, `domain_id`

---

## 7. 뷰 및 임포트 모델

ORM의 `ignoreDdl: true` 설정으로 DDL 생성에서 제외되는 읽기 전용 모델이다.

| Entity | 뷰/모델명 | 설명 |
|--------|---------|------|
| `ReceivingOrderStatus` | receiving_order_status | `receivings` + `receiving_items` 조인 뷰 |
| `ImportReceivingOrder` | import_receiving_orders | 입고 주문 Excel 임포트 모델 |
| `OutboundOrder` | outbound_orders | `release_orders` + `release_order_items` 조인 뷰 |
| `ReleaseOrderStatus` | release_order_status | `release_orders` + `release_order_items` + `delivery_infos` 조인 뷰 |
| `ImportReleaseOrder` | import_release_orders | 출고 주문 Excel/API 임포트 모델 |

---

## 8. DB 함수 및 커스텀 서비스

### 8.1 커스텀 서비스 (번호 채번)

Entity의 `@PrePersist` 훅에서 `ICustomService.doCustomService()`를 통해 번호를 자동 채번한다.

| 커스텀 서비스 ID | 호출 위치 | 설명 |
|---------------|---------|------|
| `diy-generate-req-rcv-no` | `Receiving.@PrePersist` | 입고 요청 번호 자동 채번 |
| `diy-generate-rls-ord-no` | `ReleaseOrder.@PrePersist` | 출고 주문 번호 자동 채번 |
| `diy-generate-inv-barcode` | `Inventory.@PrePersist` | 재고 바코드 자동 생성 |

> 커스텀 서비스는 외부 플러그인/설정으로 구현되며, WMS 코드에는 인터페이스만 존재한다.

### 8.2 내부 SQL (시퀀스성 채번 패턴)

DB 시퀀스 대신 `MAX(seq_col) + 1` 패턴으로 순번을 채번한다.

| 위치 | SQL | 목적 |
|------|-----|------|
| `ReceivingItem.@PrePersist` | `SELECT MAX(rcv_seq) FROM receiving_items WHERE domain_id=? AND receiving_id=?` | 입고 상세 순번 채번 |
| `Inventory.@PostPersist/Update` | `SELECT MAX(hist_seq) FROM inventory_hists WHERE domain_id=? AND barcode=?` | 재고 이력 순번 채번 |
| `ReleaseOrderItem.@PrePersist` | `OutboundQueryStore.getNextReleaseOrderLineNo()` → `SELECT MAX(line_no) FROM release_order_items WHERE ...` | 출고 라인 번호 채번 |

### 8.3 Entity 내부 조회 SQL

| 위치 | SQL | 목적 |
|------|-----|------|
| `ReceivingItem.@PrePersist` | `SELECT sku_nm FROM sku WHERE domain_id=? AND com_cd=? AND sku_cd=?` | SKU명 자동 조회 |
| `ReleaseOrderItem.@PrePersist` | `SELECT count(id) FROM release_order_items WHERE ...` | 존재 여부 확인 |
| `ReleaseOrder.@PreDelete` | `DELETE FROM release_order_items WHERE domain_id=? AND release_order_id=?` | 연관 상세 삭제 |

### 8.4 저장 프로시저

없음. 모든 로직은 Java 애플리케이션 계층에서 처리된다.

---

## 9. 엔티티 관계 요약

```
companies (화주사)
  ├── customers (고객사: com_cd)
  ├── vendors (공급사: com_cd)
  └── sku (상품: com_cd)

warehouses (창고)
  ├── zones (구역: wh_cd)
  └── locations (로케이션: wh_cd, zone_cd)

[입고]
receivings (입고 헤더)
  └── receiving_items (입고 상세: receiving_id)
      └── inventories (재고 생성: rcv_no, rcv_seq)

[출고]
waves (웨이브)
  ├── release_orders (출고 지시: wave_no)
  │   ├── release_order_items (출고 상세: release_order_id)
  │   └── delivery_infos (배송 정보: release_order_id)
  ├── picking_orders (피킹 지시: wave_no)
  │   └── picking_order_items (피킹 상세: pick_order_id, inventory_id)
  └── supply_orders (보충 지시: wave_no)
      └── supply_order_items (보충 상세: supply_order_id)

[재고]
inventories (재고)
  └── inventory_hists (재고 이력: barcode — 자동 생성)

[재고 실사]
stocktakes (실사 헤더)
  └── stocktake_items (실사 상세: stocktake_id)

[정산]
warehouse_charge_settings (요금 설정)
  └── warehouse_charge_setting_items (요금 설정 항목)
warehouse_charges (정산 내역)
```

---

*이 문서는 `src/main/java/operato/wms/**/entity/*.java` 파일의 JPA 어노테이션 및 소스 코드를 기반으로 작성되었습니다. DB 컬럼의 실제 타입 및 길이는 DBMS 방언에 따라 다를 수 있습니다.*
