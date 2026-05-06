# 기준정보 마스터 테이블 설계 문서

> 작성일: 2026-04-17
> 대상: 풀필먼트 센터 운영 및 Operato WMS 서비스에 필요한 추가 마스터 테이블

---

## 목차

1. [개요](#1-개요)
2. [즉시 필요 마스터](#2-즉시-필요-마스터)
   - 2.1 [Carrier — 운송사](#21-carrier--운송사)
   - 2.2 [SkuBarcode — 상품 바코드](#22-skubarcode--상품-바코드)
   - 2.3 [SkuUom — 상품 단위 환산](#23-skuuom--상품-단위-환산)
3. [단기 필요 마스터](#3-단기-필요-마스터)
   - 3.1 [Holiday — 공휴일](#31-holiday--공휴일)
   - 3.2 [InspectionSpec — 검수 기준](#32-inspectionspec--검수-기준)
   - 3.3 [ReplenishRule — 보충 규칙](#33-replenishrule--보충-규칙)
   - 3.4 [ReturnPolicy — 반품 정책](#34-returnpolicy--반품-정책)
   - 3.5 [SlottingRule — 로케이션 배정 규칙](#35-slottingrule--로케이션-배정-규칙)
4. [3PL 서비스 마스터](#4-3pl-서비스-마스터)
   - 4.1 [BillingPolicy — 청구 정책](#41-billingpolicy--청구-정책)
   - 4.2 [StoragePolicy — 보관 정책](#42-storagepolicy--보관-정책)

---

## 1. 개요

### 1.1 추가 마스터 테이블 구성 요약

| # | 테이블 | 엔티티 | 우선순위 | 설명 |
|---|--------|--------|----------|------|
| 1 | `carriers` | Carrier | 즉시 | 운송사(택배사/화물사) 마스터 |
| 2 | `sku_barcodes` | SkuBarcode | 즉시 | 상품 다중 바코드 마스터 |
| 3 | `sku_uoms` | SkuUom | 즉시 | 상품 단위 환산 마스터 |
| 4 | `holidays` | Holiday | 단기 | 공휴일·휴무일 마스터 |
| 5 | `inspection_specs` | InspectionSpec | 단기 | 화주사·SKU별 검수 기준 마스터 |
| 6 | `replenish_rules` | ReplenishRule | 단기 | 피킹존 자동 보충 규칙 마스터 |
| 7 | `return_policies` | ReturnPolicy | 단기 | 화주사별 반품 처리 정책 마스터 |
| 8 | `slotting_rules` | SlottingRule | 단기 | 로케이션 자동 배정 규칙 마스터 |
| 9 | `billing_policies` | BillingPolicy | 3PL | 화주사별 청구 항목 정책 마스터 |
| 10 | `storage_policies` | StoragePolicy | 3PL | 화주사별 보관 운영 정책 마스터 |

### 1.2 기존 마스터와의 연계

```
Company (화주사)
 ├─ Customer (거래처)
 ├─ Vendor (공급업체)
 ├─ SKU (상품)
 │   ├─ SkuBarcode  ← 다중 바코드
 │   └─ SkuUom      ← 단위 환산
 ├─ StoragePolicy   ← 보관 정책
 ├─ BillingPolicy   ← 청구 정책
 ├─ ReturnPolicy    ← 반품 정책
 └─ InspectionSpec  ← 검수 기준

Warehouse (창고)
 ├─ Zone (구역)
 ├─ Location (로케이션)
 │   └─ SlottingRule ← 자동 배정 규칙
 ├─ ReplenishRule   ← 보충 규칙
 └─ Holiday         ← 운영 비영업일

Customer (거래처)
 └─ Carrier         ← defaultCarrierCd 참조 대상

CourierContract (택배 계약)
 └─ Carrier         ← dlvVendCd 참조 대상
```

---

## 2. 즉시 필요 마스터

---

### 2.1 Carrier — 운송사

#### 설명 및 용도

운송사(택배사/화물사/직납 운전기사 등) 마스터 테이블.

`Customer.defaultCarrierCd` 및 `CourierContract.dlvVendCd`가 참조하는 코드의 실제 마스터이나, 현재 해당 마스터 없이 코드 문자열만 저장되어 있는 상태다.

**주요 활용:**
- 출고 지시 생성 시 거래처의 기본 운송사 자동 세팅
- 운송장 발급 시 택배사 API 연동 정보 조회
- 운송사별 배송 추적 URL 제공 (고객 알림 발송용)
- 운송사별 계약(CourierContract) 목록 관리

**운송사 유형 예시:**

| 코드 | 설명 |
|------|------|
| `COURIER` | 택배사 (CJ대한통운, 롯데, 한진 등) |
| `FREIGHT` | 화물차 운송사 |
| `DIRECT` | 자체 직납 (배달 기사) |
| `PICKUP` | 거래처 자체 픽업 |
| `INTERNATIONAL` | 국제 특송 (DHL, FedEx, UPS) |

#### 테이블 명세: `carriers`

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | VARCHAR(40) | NOT NULL | UUID | PK |
| `carrier_cd` | VARCHAR(30) | NOT NULL | — | 운송사 코드. 도메인 내 유일 (예: CJ, LOGEN, HANJIN) |
| `carrier_nm` | VARCHAR(100) | NOT NULL | — | 운송사 공식 명칭 |
| `carrier_alias` | VARCHAR(100) | NULL | — | 내부 관리용 약칭 |
| `carrier_type` | VARCHAR(20) | NULL | — | 운송사 유형 코드 (COURIER/FREIGHT/DIRECT/PICKUP/INTERNATIONAL) |
| `tel_no` | VARCHAR(20) | NULL | — | 운송사 대표 전화번호 |
| `mgr_nm` | VARCHAR(50) | NULL | — | 담당자 이름 |
| `mgr_phone` | VARCHAR(20) | NULL | — | 담당자 전화번호 |
| `mgr_email` | VARCHAR(50) | NULL | — | 담당자 이메일 |
| `tracking_url` | VARCHAR(255) | NULL | — | 배송 추적 URL 템플릿. `{invoice_no}` 치환자 포함 (예: `https://trace.cjlogistics.com/web/detail.jsp?slipno={invoice_no}`) |
| `api_yn` | BOOLEAN | NULL | false | API 자동 연동 여부. true이면 운송장 자동 발급 지원 |
| `api_key` | VARCHAR(255) | NULL | — | API 인증 키 (암호화 저장 권장) |
| `secret_key` | VARCHAR(255) | NULL | — | 시크릿 키 (암호화 저장 권장) |
| `validation_endpoint` | VARCHAR(255) | NULL | — | 운송장 유효성 체크 endpoint URL |
| `issue_endpoint` | VARCHAR(255) | NULL | — | 운송장 발급 endpoint URL |
| `print_endpoint` | VARCHAR(255) | NULL | — | 운송장 출력 endpoint URL |
| `cancel_endpoint` | VARCHAR(255) | NULL | — | 운송장 취소 endpoint URL |
| `del_flag` | BOOLEAN | NULL | false | 삭제 여부 |
| `remarks` | VARCHAR(1000) | NULL | — | 비고 |
| `attr01` | VARCHAR(100) | NULL | — | 커스텀 속성 1 |
| `attr02` | VARCHAR(100) | NULL | — | 커스텀 속성 2 |
| `attr03` | VARCHAR(100) | NULL | — | 커스텀 속성 3 |
| `domain_id` | BIGINT | NOT NULL | — | 멀티테넌시 도메인 ID |
| `creator_id` | BIGINT | NULL | — | 생성자 ID |
| `updater_id` | BIGINT | NULL | — | 수정자 ID |
| `created_at` | TIMESTAMP | NULL | — | 생성일시 |
| `updated_at` | TIMESTAMP | NULL | — | 수정일시 |

**인덱스:**
```sql
UNIQUE ix_carriers_0 (carrier_cd, domain_id)
INDEX  ix_carriers_1 (carrier_type, domain_id)
INDEX  ix_carriers_2 (del_flag, domain_id)
```

**DDL:**
```sql
CREATE TABLE carriers (
    id              VARCHAR(40)  NOT NULL PRIMARY KEY,
    carrier_cd      VARCHAR(30)  NOT NULL,
    carrier_nm      VARCHAR(100) NOT NULL,
    carrier_alias   VARCHAR(100),
    carrier_type    VARCHAR(20),
    tel_no          VARCHAR(20),
    mgr_nm          VARCHAR(50),
    mgr_phone       VARCHAR(20),
    mgr_email       VARCHAR(50),
    tracking_url    VARCHAR(255),
    api_flag        BOOLEAN  DEFAULT false,
    api_key         VARCHAR(255),
    secret_key      VARCHAR(255),
    validation_endpoint VARCHAR(255),
    issue_endpoint      VARCHAR(255),
    print_endpoint      VARCHAR(255),
    cancel_endpoint     VARCHAR(255),
    del_flag        BOOLEAN DEFAULT FALSE,
    remarks         VARCHAR(1000),
    attr01          VARCHAR(100),
    attr02          VARCHAR(100),
    attr03          VARCHAR(100),
    domain_id       BIGINT NOT NULL,
    creator_id      BIGINT,
    updater_id      BIGINT,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);
CREATE UNIQUE INDEX ix_carriers_0 ON carriers (carrier_cd, domain_id);
CREATE INDEX ix_carriers_1 ON carriers (carrier_type, domain_id);
CREATE INDEX ix_carriers_2 ON carriers (del_flag, domain_id);
```

---

### 2.2 SkuBarcode — 상품 바코드

#### 설명 및 용도

1개 SKU에 복수의 바코드를 등록·관리하는 마스터 테이블.

현재 `SKU.barCd` 단일 필드로만 바코드를 관리하고 있어, 아래 상황에 대응이 불가능하다:

- **단위별 바코드**: 낱개(EA) / 박스(BOX) / 팔레트(PALLET) 각각 다른 바코드
- **코드 체계별 바코드**: EAN-13, UPC-A, QR코드, 자체 바코드 등
- **복수 판매 채널**: 온라인몰별로 다른 바코드 요구

**주요 활용:**
- PDA 바코드 스캔 시 SKU 역조회 (어떤 바코드를 스캔해도 동일 SKU 식별)
- 입고 검수 시 공급업체 박스 바코드로 SKU 자동 인식
- 출고 라벨 인쇄 시 바코드 유형 선택

**바코드 유형 예시:**

| 코드 | 설명 |
|------|------|
| `EAN13` | 국제 표준 13자리 바코드 |
| `UPC` | 미국 표준 12자리 바코드 |
| `QR` | QR 코드 |
| `CODE128` | 자유 형식 바코드 |
| `CUSTOM` | 자체 관리 바코드 |

**단위 유형 예시:**

| 코드 | 설명 |
|------|------|
| `EA` | 낱개 |
| `BOX` | 박스 (낱개 묶음) |
| `PALLET` | 팔레트 |
| `INNER` | 이너박스 (중간 포장) |

#### 테이블 명세: `sku_barcodes`

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | VARCHAR(40) | NOT NULL | UUID | PK |
| `com_cd` | VARCHAR(20) | NOT NULL | — | 화주사 코드 |
| `sku_cd` | VARCHAR(30) | NOT NULL | — | 상품 코드 (SKU.sku_cd 참조) |
| `barcode` | VARCHAR(100) | NOT NULL | — | 바코드 값 |
| `barcode_type` | VARCHAR(20) | NULL | — | 바코드 유형 (EAN13/UPC/QR/CODE128/CUSTOM) |
| `unit_type` | VARCHAR(10) | NULL | `EA` | 적용 단위 (EA/BOX/INNER/PALLET) |
| `qty_per_unit` | NUMERIC(12,3) | NULL | 1 | 해당 단위 1개당 낱개 수량. EA=1, BOX=20 등 |
| `is_default` | BOOLEAN | NULL | false | 대표 바코드 여부. SKU당 1개만 true |
| `del_flag` | BOOLEAN | NULL | false | 삭제 여부 |
| `remarks` | VARCHAR(255) | NULL | — | 비고 |
| `domain_id` | BIGINT | NOT NULL | — | 멀티테넌시 도메인 ID |
| `creator_id` | BIGINT | NULL | — | 생성자 ID |
| `updater_id` | BIGINT | NULL | — | 수정자 ID |
| `created_at` | TIMESTAMP | NULL | — | 생성일시 |
| `updated_at` | TIMESTAMP | NULL | — | 수정일시 |

**인덱스:**
```sql
UNIQUE ix_sku_barcodes_0 (barcode, domain_id)
INDEX  ix_sku_barcodes_1 (com_cd, sku_cd, domain_id)
INDEX  ix_sku_barcodes_2 (com_cd, sku_cd, unit_type, domain_id)
```

**DDL:**
```sql
CREATE TABLE sku_barcodes (
    id              VARCHAR(40)    NOT NULL PRIMARY KEY,
    com_cd          VARCHAR(20)    NOT NULL,
    sku_cd          VARCHAR(30)    NOT NULL,
    barcode         VARCHAR(100)   NOT NULL,
    barcode_type    VARCHAR(20),
    unit_type       VARCHAR(10)    DEFAULT 'EA',
    qty_per_unit    NUMERIC(12,3)  DEFAULT 1,
    is_default      BOOLEAN        DEFAULT FALSE,
    del_flag        BOOLEAN        DEFAULT FALSE,
    remarks         VARCHAR(255),
    domain_id       BIGINT         NOT NULL,
    creator_id      BIGINT,
    updater_id      BIGINT,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);
CREATE UNIQUE INDEX ix_sku_barcodes_0 ON sku_barcodes (barcode, domain_id);
CREATE INDEX ix_sku_barcodes_1 ON sku_barcodes (com_cd, sku_cd, domain_id);
CREATE INDEX ix_sku_barcodes_2 ON sku_barcodes (com_cd, sku_cd, unit_type, domain_id);
```

---

### 2.3 SkuUom — 상품 단위 환산

#### 설명 및 용도

SKU의 낱개(EA) ↔ 박스(BOX) ↔ 팔레트(PALLET) 등 단위 간 수량 환산 기준을 관리하는 마스터 테이블.

**주요 활용:**
- 입고 수량 자동 환산: 공급업체 납품 단위(BOX) → 창고 관리 단위(EA) 자동 변환
- 발주 단위 관리: 최소 발주 단위(MOQ)와 관리 단위 분리
- 재고 조회: 현재 재고를 EA / BOX / PALLET 단위로 동시 표시
- `SkuBarcode.qty_per_unit`과 연계하여 바코드 스캔 시 수량 자동 계산

**환산 예시 (상품 A):**

| from_uom | to_uom | conversion_factor | 의미 |
|----------|--------|-------------------|------|
| `BOX` | `EA` | 20 | 박스 1개 = 낱개 20개 |
| `PALLET` | `BOX` | 50 | 팔레트 1개 = 박스 50개 |
| `PALLET` | `EA` | 1000 | 팔레트 1개 = 낱개 1000개 |

#### 테이블 명세: `sku_uoms`

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | VARCHAR(40) | NOT NULL | UUID | PK |
| `com_cd` | VARCHAR(20) | NOT NULL | — | 화주사 코드 |
| `sku_cd` | VARCHAR(30) | NOT NULL | — | 상품 코드 (SKU.sku_cd 참조) |
| `from_uom` | VARCHAR(10) | NOT NULL | — | 변환 원본 단위 (BOX/INNER/PALLET 등) |
| `to_uom` | VARCHAR(10) | NOT NULL | — | 변환 대상 단위 (기준: EA) |
| `conversion_factor` | NUMERIC(12,4) | NOT NULL | — | 환산 계수. from_uom 1개 = to_uom N개 |
| `remarks` | VARCHAR(255) | NULL | — | 비고 |
| `domain_id` | BIGINT | NOT NULL | — | 멀티테넌시 도메인 ID |
| `creator_id` | BIGINT | NULL | — | 생성자 ID |
| `updater_id` | BIGINT | NULL | — | 수정자 ID |
| `created_at` | TIMESTAMP | NULL | — | 생성일시 |
| `updated_at` | TIMESTAMP | NULL | — | 수정일시 |

**인덱스:**
```sql
UNIQUE ix_sku_uoms_0 (com_cd, sku_cd, from_uom, to_uom, domain_id)
INDEX  ix_sku_uoms_1 (com_cd, sku_cd, domain_id)
```

**DDL:**
```sql
CREATE TABLE sku_uoms (
    id                  VARCHAR(40)   NOT NULL PRIMARY KEY,
    com_cd              VARCHAR(20)   NOT NULL,
    sku_cd              VARCHAR(30)   NOT NULL,
    from_uom            VARCHAR(10)   NOT NULL,
    to_uom              VARCHAR(10)   NOT NULL,
    conversion_factor   NUMERIC(12,4) NOT NULL,
    remarks             VARCHAR(255),
    domain_id           BIGINT        NOT NULL,
    creator_id          BIGINT,
    updater_id          BIGINT,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP
);
CREATE UNIQUE INDEX ix_sku_uoms_0 ON sku_uoms (com_cd, sku_cd, from_uom, to_uom, domain_id);
CREATE INDEX ix_sku_uoms_1 ON sku_uoms (com_cd, sku_cd, domain_id);
```

---

## 3. 단기 필요 마스터

---

### 3.1 Holiday — 공휴일

#### 설명 및 용도

공휴일·창고 휴무일을 관리하는 마스터 테이블.

**주요 활용:**
- **납기일 계산**: 출고 지시 생성 시 `Customer.leadTimeDays` 적용 과정에서 공휴일 제외
- **배송 예정일 산출**: 택배사 배송 소요일 계산 시 비영업일 제외
- **입고 예약**: 입고 예약 가능 날짜 제한 (공휴일·휴무일 제외)
- **창고별 커스텀 휴무**: 법정 공휴일 외 창고 자체 휴무일 등록

**휴일 유형 예시:**

| 코드 | 설명 |
|------|------|
| `PUBLIC` | 법정 공휴일 (설날, 추석 등) |
| `WAREHOUSE` | 창고 자체 휴무일 |
| `CARRIER` | 특정 운송사 미배송일 |
| `COMPANY` | 화주사 업무 중지일 |

#### 테이블 명세: `holidays`

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | VARCHAR(40) | NOT NULL | UUID | PK |
| `holiday_date` | DATE | NOT NULL | — | 휴일 날짜 |
| `holiday_nm` | VARCHAR(100) | NOT NULL | — | 휴일 명칭 (예: 설날 연휴) |
| `holiday_type` | VARCHAR(20) | NULL | `PUBLIC` | 휴일 유형 (PUBLIC/WAREHOUSE/CARRIER/COMPANY) |
| `wh_cd` | VARCHAR(20) | NULL | — | 적용 창고 코드. NULL이면 전체 창고 적용 |
| `com_cd` | VARCHAR(20) | NULL | — | 적용 화주사 코드. NULL이면 전체 화주사 적용 |
| `carrier_cd` | VARCHAR(30) | NULL | — | 적용 운송사 코드. holiday_type=CARRIER 시 사용 |
| `country_cd` | VARCHAR(10) | NULL | `KR` | 국가 코드. 국제 운영 시 국가별 공휴일 분리 |
| `remarks` | VARCHAR(255) | NULL | — | 비고 |
| `domain_id` | BIGINT | NOT NULL | — | 멀티테넌시 도메인 ID |
| `creator_id` | BIGINT | NULL | — | 생성자 ID |
| `updater_id` | BIGINT | NULL | — | 수정자 ID |
| `created_at` | TIMESTAMP | NULL | — | 생성일시 |
| `updated_at` | TIMESTAMP | NULL | — | 수정일시 |

**인덱스:**
```sql
INDEX ix_holidays_0 (holiday_date, domain_id)
INDEX ix_holidays_1 (holiday_type, holiday_date, domain_id)
INDEX ix_holidays_2 (wh_cd, holiday_date, domain_id)
```

**DDL:**
```sql
CREATE TABLE holidays (
    id              VARCHAR(40)  NOT NULL PRIMARY KEY,
    holiday_date    DATE         NOT NULL,
    holiday_nm      VARCHAR(100) NOT NULL,
    holiday_type    VARCHAR(20)  DEFAULT 'PUBLIC',
    wh_cd           VARCHAR(20),
    com_cd          VARCHAR(20),
    carrier_cd      VARCHAR(30),
    country_cd      VARCHAR(10)  DEFAULT 'KR',
    remarks         VARCHAR(255),
    domain_id       BIGINT       NOT NULL,
    creator_id      BIGINT,
    updater_id      BIGINT,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);
CREATE INDEX ix_holidays_0 ON holidays (holiday_date, domain_id);
CREATE INDEX ix_holidays_1 ON holidays (holiday_type, holiday_date, domain_id);
CREATE INDEX ix_holidays_2 ON holidays (wh_cd, holiday_date, domain_id);
```

---

### 3.2 InspectionSpec — 검수 기준

#### 설명 및 용도

화주사별·SKU별 입고 검수 기준을 정의하는 마스터 테이블.

현재는 입고 검수 기준이 시스템에 없어 작업자 주관에 의존하고 있다. 이 테이블을 통해 검수 방식, 샘플 비율, 불량 판정 기준을 표준화한다.

**주요 활용:**
- 입고 검수 작업 지시 시 해당 SKU의 검수 기준 자동 조회
- 샘플 검수 시 검수 대상 수량 자동 계산 (`sample_rate × 입고 수량`)
- 불량률이 `defect_threshold`를 초과하면 전수 검수로 자동 전환
- 검수 결과 기록 시 합격/불합격 판정 자동화

**검수 유형 예시:**

| 코드 | 설명 |
|------|------|
| `SKIP` | 검수 생략 (신뢰 공급업체) |
| `SAMPLE` | 샘플 검수 (일부만 검수) |
| `FULL` | 전수 검수 (전량 검수) |
| `RANDOM` | 랜덤 검수 (매 입고 무작위 비율) |

#### 테이블 명세: `inspection_specs`

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | VARCHAR(40) | NOT NULL | UUID | PK |
| `com_cd` | VARCHAR(20) | NOT NULL | — | 화주사 코드 |
| `sku_cd` | VARCHAR(30) | NULL | — | 상품 코드. NULL이면 해당 화주사 전체 SKU에 적용 |
| `vend_cd` | VARCHAR(20) | NULL | — | 공급업체 코드. NULL이면 공급업체 무관 |
| `inspect_type` | VARCHAR(20) | NOT NULL | `SAMPLE` | 검수 유형 (SKIP/SAMPLE/FULL/RANDOM) |
| `sample_rate` | NUMERIC(5,2) | NULL | — | 샘플 검수 비율 (0.00~1.00). inspect_type=SAMPLE 시 사용 |
| `min_sample_qty` | INTEGER | NULL | — | 최소 샘플 검수 수량. 비율 적용 시 최소 보장 수량 |
| `defect_threshold` | NUMERIC(5,2) | NULL | — | 불량률 임계치 (0.00~1.00). 초과 시 전수 검수 전환 |
| `check_expiry` | BOOLEAN | NULL | false | 유통기한 확인 여부 |
| `check_barcode` | BOOLEAN | NULL | true | 바코드 일치 확인 여부 |
| `check_qty` | BOOLEAN | NULL | true | 수량 일치 확인 여부 |
| `check_damage` | BOOLEAN | NULL | true | 외관 손상 확인 여부 |
| `del_flag` | BOOLEAN | NULL | false | 삭제 여부 |
| `remarks` | VARCHAR(1000) | NULL | — | 비고 |
| `domain_id` | BIGINT | NOT NULL | — | 멀티테넌시 도메인 ID |
| `creator_id` | BIGINT | NULL | — | 생성자 ID |
| `updater_id` | BIGINT | NULL | — | 수정자 ID |
| `created_at` | TIMESTAMP | NULL | — | 생성일시 |
| `updated_at` | TIMESTAMP | NULL | — | 수정일시 |

> **우선순위**: sku_cd + vend_cd 둘 다 일치 > sku_cd만 일치 > com_cd만(기본값) 순서로 적용

**인덱스:**
```sql
INDEX ix_inspection_specs_0 (com_cd, sku_cd, domain_id)
INDEX ix_inspection_specs_1 (com_cd, vend_cd, domain_id)
INDEX ix_inspection_specs_2 (com_cd, inspect_type, domain_id)
```

**DDL:**
```sql
CREATE TABLE inspection_specs (
    id                  VARCHAR(40)   NOT NULL PRIMARY KEY,
    com_cd              VARCHAR(20)   NOT NULL,
    sku_cd              VARCHAR(30),
    vend_cd             VARCHAR(20),
    inspect_type        VARCHAR(20)   NOT NULL DEFAULT 'SAMPLE',
    sample_rate         NUMERIC(5,2),
    min_sample_qty      INTEGER,
    defect_threshold    NUMERIC(5,2),
    check_expiry        BOOLEAN       DEFAULT FALSE,
    check_barcode       BOOLEAN       DEFAULT TRUE,
    check_qty           BOOLEAN       DEFAULT TRUE,
    check_damage        BOOLEAN       DEFAULT TRUE,
    del_flag            BOOLEAN       DEFAULT FALSE,
    remarks             VARCHAR(1000),
    domain_id           BIGINT        NOT NULL,
    creator_id          BIGINT,
    updater_id          BIGINT,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP
);
CREATE INDEX ix_inspection_specs_0 ON inspection_specs (com_cd, sku_cd, domain_id);
CREATE INDEX ix_inspection_specs_1 ON inspection_specs (com_cd, vend_cd, domain_id);
CREATE INDEX ix_inspection_specs_2 ON inspection_specs (com_cd, inspect_type, domain_id);
```

---

### 3.3 ReplenishRule — 보충 규칙

#### 설명 및 용도

피킹존(전방 로케이션)의 재고 자동 보충 규칙을 정의하는 마스터 테이블.

피킹 효율을 위해 피킹존(선반/플로우 랙)에 소량 재고를 유지하고, 재고가 부족해지면 보관존(후방 벌크 로케이션)에서 자동으로 보충하는 작업을 시스템이 지시한다.

**주요 활용:**
- 피킹 작업 중 특정 로케이션의 재고가 `trigger_qty` 이하가 되면 보충 지시 자동 생성
- `SKU.safetyStock` / `SKU.reorderPoint`를 보완하는 위치 기반 보충 규칙
- 보충 출발지(보관존) → 도착지(피킹존) 경로 사전 정의로 보충 작업 자동화

**보충 트리거 유형:**

| 코드 | 설명 |
|------|------|
| `QTY` | 수량 기준 (재고 ≤ trigger_qty 시 보충) |
| `RATIO` | 비율 기준 (최대 수량 대비 비율 이하 시 보충) |
| `TIME` | 시간 기준 (특정 시간대 정기 보충) |

#### 테이블 명세: `replenish_rules`

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | VARCHAR(40) | NOT NULL | UUID | PK |
| `com_cd` | VARCHAR(20) | NOT NULL | — | 화주사 코드 |
| `wh_cd` | VARCHAR(20) | NOT NULL | — | 창고 코드 |
| `sku_cd` | VARCHAR(30) | NOT NULL | — | 상품 코드 |
| `from_loc_cd` | VARCHAR(20) | NULL | — | 보충 출발 로케이션 코드 (보관존). NULL이면 자동 결정 |
| `to_loc_cd` | VARCHAR(20) | NOT NULL | — | 보충 도착 로케이션 코드 (피킹존) |
| `trigger_type` | VARCHAR(10) | NULL | `QTY` | 보충 트리거 유형 (QTY/RATIO/TIME) |
| `trigger_qty` | NUMERIC(12,3) | NULL | — | 보충 트리거 수량. 재고가 이 값 이하가 되면 보충 지시 생성 |
| `trigger_ratio` | NUMERIC(5,2) | NULL | — | 보충 트리거 비율 (0.00~1.00). trigger_type=RATIO 시 사용 |
| `replenish_qty` | NUMERIC(12,3) | NULL | — | 1회 보충 수량. NULL이면 max_qty까지 채움 |
| `max_qty` | NUMERIC(12,3) | NULL | — | 피킹 로케이션 최대 보관 수량 |
| `priority` | INTEGER | NULL | 50 | 보충 작업 우선순위 (낮을수록 먼저 처리) |
| `active_flag` | BOOLEAN | NULL | true | 규칙 활성화 여부 |
| `remarks` | VARCHAR(255) | NULL | — | 비고 |
| `domain_id` | BIGINT | NOT NULL | — | 멀티테넌시 도메인 ID |
| `creator_id` | BIGINT | NULL | — | 생성자 ID |
| `updater_id` | BIGINT | NULL | — | 수정자 ID |
| `created_at` | TIMESTAMP | NULL | — | 생성일시 |
| `updated_at` | TIMESTAMP | NULL | — | 수정일시 |

**인덱스:**
```sql
UNIQUE ix_replenish_rules_0 (com_cd, wh_cd, sku_cd, to_loc_cd, domain_id)
INDEX  ix_replenish_rules_1 (com_cd, wh_cd, sku_cd, domain_id)
INDEX  ix_replenish_rules_2 (wh_cd, active_flag, domain_id)
```

**DDL:**
```sql
CREATE TABLE replenish_rules (
    id              VARCHAR(40)   NOT NULL PRIMARY KEY,
    com_cd          VARCHAR(20)   NOT NULL,
    wh_cd           VARCHAR(20)   NOT NULL,
    sku_cd          VARCHAR(30)   NOT NULL,
    from_loc_cd     VARCHAR(20),
    to_loc_cd       VARCHAR(20)   NOT NULL,
    trigger_type    VARCHAR(10)   DEFAULT 'QTY',
    trigger_qty     NUMERIC(12,3),
    trigger_ratio   NUMERIC(5,2),
    replenish_qty   NUMERIC(12,3),
    max_qty         NUMERIC(12,3),
    priority        INTEGER       DEFAULT 50,
    active_flag     BOOLEAN       DEFAULT TRUE,
    remarks         VARCHAR(255),
    domain_id       BIGINT        NOT NULL,
    creator_id      BIGINT,
    updater_id      BIGINT,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);
CREATE UNIQUE INDEX ix_replenish_rules_0 ON replenish_rules (com_cd, wh_cd, sku_cd, to_loc_cd, domain_id);
CREATE INDEX ix_replenish_rules_1 ON replenish_rules (com_cd, wh_cd, sku_cd, domain_id);
CREATE INDEX ix_replenish_rules_2 ON replenish_rules (wh_cd, active_flag, domain_id);
```

---

### 3.4 ReturnPolicy — 반품 정책

#### 설명 및 용도

화주사별 반품 처리 정책을 정의하는 마스터 테이블.

반품 상품이 입고될 때 자동으로 이 정책을 참조하여 재입고 가능 여부, 검수 필요 여부, 불량 처리 방식을 결정한다. 화주사마다 반품 정책이 다르므로 코드 하드코딩 없이 마스터로 관리한다.

**주요 활용:**
- 반품 입고 시 해당 화주사의 `ReturnPolicy` 자동 조회 → 처리 흐름 결정
- 반품 가능 기간 초과 여부 자동 판단
- 불량품 처리 방식에 따른 로케이션 자동 분류 (재입고 로케이션 vs 불량 로케이션)

**불량 처리 방식 예시:**

| 코드 | 설명 |
|------|------|
| `RESTOCK` | 재입고 (정상품으로 재사용) |
| `DEFECT_LOC` | 불량 로케이션 이동 후 보고 |
| `SCRAP` | 즉시 폐기 |
| `RETURN_VEND` | 공급업체 반납 |

#### 테이블 명세: `return_policies`

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | VARCHAR(40) | NOT NULL | UUID | PK |
| `com_cd` | VARCHAR(20) | NOT NULL | — | 화주사 코드. 화주사당 1개 정책 |
| `return_period_days` | INTEGER | NULL | — | 반품 허용 기간 (일). 출고일 기준. NULL이면 기간 제한 없음 |
| `inspect_required` | BOOLEAN | NULL | true | 반품 입고 시 검수 필수 여부 |
| `restock_yn` | BOOLEAN | NULL | true | 정상 반품품 재입고 허용 여부 |
| `restock_loc_cd` | VARCHAR(20) | NULL | — | 재입고 기본 로케이션 코드. NULL이면 원래 로케이션으로 복귀 |
| `defect_handling` | VARCHAR(20) | NULL | `DEFECT_LOC` | 불량품 처리 방식 (RESTOCK/DEFECT_LOC/SCRAP/RETURN_VEND) |
| `defect_loc_cd` | VARCHAR(20) | NULL | — | 불량품 이동 대상 로케이션 코드 |
| `restock_deduct_rate` | NUMERIC(5,2) | NULL | — | 재입고 시 재고 가치 차감률 (0.00~1.00). 중고 처리 시 활용 |
| `auto_restock_yn` | BOOLEAN | NULL | false | 검수 없이 자동 재입고 허용 여부 |
| `del_flag` | BOOLEAN | NULL | false | 삭제 여부 |
| `remarks` | VARCHAR(1000) | NULL | — | 비고 |
| `domain_id` | BIGINT | NOT NULL | — | 멀티테넌시 도메인 ID |
| `creator_id` | BIGINT | NULL | — | 생성자 ID |
| `updater_id` | BIGINT | NULL | — | 수정자 ID |
| `created_at` | TIMESTAMP | NULL | — | 생성일시 |
| `updated_at` | TIMESTAMP | NULL | — | 수정일시 |

**인덱스:**
```sql
UNIQUE ix_return_policies_0 (com_cd, domain_id)
```

**DDL:**
```sql
CREATE TABLE return_policies (
    id                  VARCHAR(40)  NOT NULL PRIMARY KEY,
    com_cd              VARCHAR(20)  NOT NULL,
    return_period_days  INTEGER,
    inspect_required    BOOLEAN      DEFAULT TRUE,
    restock_yn          BOOLEAN      DEFAULT TRUE,
    restock_loc_cd      VARCHAR(20),
    defect_handling     VARCHAR(20)  DEFAULT 'DEFECT_LOC',
    defect_loc_cd       VARCHAR(20),
    restock_deduct_rate NUMERIC(5,2),
    auto_restock_yn     BOOLEAN      DEFAULT FALSE,
    del_flag            BOOLEAN      DEFAULT FALSE,
    remarks             VARCHAR(1000),
    domain_id           BIGINT       NOT NULL,
    creator_id          BIGINT,
    updater_id          BIGINT,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP
);
CREATE UNIQUE INDEX ix_return_policies_0 ON return_policies (com_cd, domain_id);
```

---

### 3.5 SlottingRule — 로케이션 배정 규칙

#### 설명 및 용도

입고 시 SKU 특성에 맞는 로케이션을 자동으로 배정하는 규칙 마스터 테이블.

현재 입고 적치 시 작업자가 수동으로 로케이션을 선택하거나, 시스템이 임의 배정한다. 슬로팅 규칙을 통해 상품 특성(온도·크기·회전율·화주사 전용 구역)에 맞는 최적 로케이션을 자동 제안한다.

**주요 활용:**
- 입고 완료 후 적치 지시 생성 시 대상 로케이션 자동 결정
- 고회전 상품은 피킹 동선이 짧은 로케이션 우선 배정
- 냉장·냉동 상품은 해당 온도대 구역으로만 배정
- 화주사 전용 구역이 있는 경우 해당 구역 내 배정 제한

**조건 필드 설명:**
- `cond_*` 필드가 NULL이면 해당 조건은 무시 (모든 값 매칭)
- 복수 규칙이 매칭될 경우 `priority`가 낮은 규칙 우선 적용

#### 테이블 명세: `slotting_rules`

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | VARCHAR(40) | NOT NULL | UUID | PK |
| `com_cd` | VARCHAR(20) | NOT NULL | — | 화주사 코드 |
| `wh_cd` | VARCHAR(20) | NOT NULL | — | 창고 코드 |
| `rule_nm` | VARCHAR(100) | NOT NULL | — | 규칙 명칭 |
| `priority` | INTEGER | NULL | 50 | 규칙 우선순위 (낮을수록 먼저 적용) |
| `cond_sku_cd` | VARCHAR(30) | NULL | — | 조건: 특정 SKU 코드 (NULL이면 전체) |
| `cond_sku_type` | VARCHAR(20) | NULL | — | 조건: SKU 유형 코드 |
| `cond_temp_type` | VARCHAR(20) | NULL | — | 조건: 온도 유형 (ROOM/COLD/FROZEN) |
| `cond_abc_class` | VARCHAR(5) | NULL | — | 조건: ABC 등급 (A/B/C). 회전율 기반 |
| `cond_hazmat` | BOOLEAN | NULL | — | 조건: 위험물 여부 |
| `target_zone_cd` | VARCHAR(20) | NULL | — | 배정 대상 존 코드. NULL이면 창고 전체에서 탐색 |
| `target_loc_type` | VARCHAR(20) | NULL | — | 배정 대상 로케이션 유형 |
| `select_strategy` | VARCHAR(20) | NULL | `EMPTY_FIRST` | 로케이션 선택 전략 (EMPTY_FIRST-빈 로케이션 우선 / NEAR_PICK-피킹존 근접 우선 / MIN_TRAVEL-최단 동선 우선) |
| `active_flag` | BOOLEAN | NULL | true | 규칙 활성화 여부 |
| `remarks` | VARCHAR(255) | NULL | — | 비고 |
| `domain_id` | BIGINT | NOT NULL | — | 멀티테넌시 도메인 ID |
| `creator_id` | BIGINT | NULL | — | 생성자 ID |
| `updater_id` | BIGINT | NULL | — | 수정자 ID |
| `created_at` | TIMESTAMP | NULL | — | 생성일시 |
| `updated_at` | TIMESTAMP | NULL | — | 수정일시 |

**인덱스:**
```sql
INDEX ix_slotting_rules_0 (com_cd, wh_cd, priority, domain_id)
INDEX ix_slotting_rules_1 (com_cd, wh_cd, active_flag, domain_id)
INDEX ix_slotting_rules_2 (com_cd, wh_cd, cond_temp_type, domain_id)
```

**DDL:**
```sql
CREATE TABLE slotting_rules (
    id                  VARCHAR(40)  NOT NULL PRIMARY KEY,
    com_cd              VARCHAR(20)  NOT NULL,
    wh_cd               VARCHAR(20)  NOT NULL,
    rule_nm             VARCHAR(100) NOT NULL,
    priority            INTEGER      DEFAULT 50,
    cond_sku_cd         VARCHAR(30),
    cond_sku_type       VARCHAR(20),
    cond_temp_type      VARCHAR(20),
    cond_abc_class      VARCHAR(5),
    cond_hazmat         BOOLEAN,
    target_zone_cd      VARCHAR(20),
    target_loc_type     VARCHAR(20),
    select_strategy     VARCHAR(20)  DEFAULT 'EMPTY_FIRST',
    active_flag         BOOLEAN      DEFAULT TRUE,
    remarks             VARCHAR(255),
    domain_id           BIGINT       NOT NULL,
    creator_id          BIGINT,
    updater_id          BIGINT,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP
);
CREATE INDEX ix_slotting_rules_0 ON slotting_rules (com_cd, wh_cd, priority, domain_id);
CREATE INDEX ix_slotting_rules_1 ON slotting_rules (com_cd, wh_cd, active_flag, domain_id);
CREATE INDEX ix_slotting_rules_2 ON slotting_rules (com_cd, wh_cd, cond_temp_type, domain_id);
```

---

## 4. 3PL 서비스 마스터

---

### 4.1 BillingPolicy — 청구 정책

#### 설명 및 용도

3PL 창고 운영사가 화주사에게 청구하는 서비스 요금 정책을 관리하는 마스터 테이블.

현재 `Company.storageRate`(보관료 단가) / `Company.handlingRate`(작업료 단가) 단일 단가로만 관리하고 있어, 구간별 단가·작업 유형별 단가·VAS 단가를 표현할 수 없다. 이 테이블은 화주사별·청구 항목별 상세 단가 정책을 정의한다.

**주요 활용:**
- 월 정산 시 보관료 자동 계산 (일별 재고량 × 단가)
- 입출고 작업료 자동 계산 (처리 건수 × 단가)
- VAS 작업료 자동 계산 (작업 유형별 단가 적용)
- 구간별 단가 적용 (볼륨 할인 등)

**청구 유형 예시:**

| 코드 | 설명 |
|------|------|
| `STORAGE` | 보관료 (단위: CBM·팔레트·박스/일) |
| `INBOUND` | 입고 처리료 (단위: 건·EA·BOX) |
| `OUTBOUND` | 출고 처리료 (단위: 건·EA·BOX) |
| `VAS` | 유통가공료 (단위: 건·시간) |
| `RETURN` | 반품 처리료 |
| `MINIMUM` | 월 최소 청구 금액 |

**청구 단위 예시:**

| 코드 | 설명 |
|------|------|
| `PER_CBM` | CBM당 |
| `PER_PALLET` | 팔레트당 |
| `PER_ORDER` | 주문 건당 |
| `PER_EA` | 낱개당 |
| `PER_BOX` | 박스당 |
| `PER_HOUR` | 시간당 |

#### 테이블 명세: `billing_policies`

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | VARCHAR(40) | NOT NULL | UUID | PK |
| `com_cd` | VARCHAR(20) | NOT NULL | — | 화주사 코드 |
| `billing_type` | VARCHAR(20) | NOT NULL | — | 청구 유형 (STORAGE/INBOUND/OUTBOUND/VAS/RETURN/MINIMUM) |
| `billing_nm` | VARCHAR(100) | NULL | — | 청구 항목 명칭 |
| `unit_type` | VARCHAR(20) | NOT NULL | — | 청구 단위 (PER_CBM/PER_PALLET/PER_ORDER/PER_EA/PER_BOX/PER_HOUR) |
| `rate` | NUMERIC(15,4) | NOT NULL | — | 단가 (원) |
| `min_qty` | NUMERIC(12,3) | NULL | — | 구간 시작 수량. 구간별 단가 적용 시 사용 |
| `max_qty` | NUMERIC(12,3) | NULL | — | 구간 종료 수량. NULL이면 상한 없음 |
| `vas_type` | VARCHAR(30) | NULL | — | VAS 유형 코드. billing_type=VAS 시 특정 작업 유형 단가 지정 |
| `effective_from` | DATE | NULL | — | 단가 적용 시작일 |
| `effective_to` | DATE | NULL | — | 단가 적용 종료일. NULL이면 무기한 |
| `del_flag` | BOOLEAN | NULL | false | 삭제 여부 |
| `remarks` | VARCHAR(1000) | NULL | — | 비고 |
| `domain_id` | BIGINT | NOT NULL | — | 멀티테넌시 도메인 ID |
| `creator_id` | BIGINT | NULL | — | 생성자 ID |
| `updater_id` | BIGINT | NULL | — | 수정자 ID |
| `created_at` | TIMESTAMP | NULL | — | 생성일시 |
| `updated_at` | TIMESTAMP | NULL | — | 수정일시 |

**인덱스:**
```sql
INDEX ix_billing_policies_0 (com_cd, billing_type, domain_id)
INDEX ix_billing_policies_1 (com_cd, billing_type, effective_from, effective_to, domain_id)
```

**DDL:**
```sql
CREATE TABLE billing_policies (
    id              VARCHAR(40)   NOT NULL PRIMARY KEY,
    com_cd          VARCHAR(20)   NOT NULL,
    billing_type    VARCHAR(20)   NOT NULL,
    billing_nm      VARCHAR(100),
    unit_type       VARCHAR(20)   NOT NULL,
    rate            NUMERIC(15,4) NOT NULL,
    min_qty         NUMERIC(12,3),
    max_qty         NUMERIC(12,3),
    vas_type        VARCHAR(30),
    effective_from  DATE,
    effective_to    DATE,
    del_flag        BOOLEAN       DEFAULT FALSE,
    remarks         VARCHAR(1000),
    domain_id       BIGINT        NOT NULL,
    creator_id      BIGINT,
    updater_id      BIGINT,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);
CREATE INDEX ix_billing_policies_0 ON billing_policies (com_cd, billing_type, domain_id);
CREATE INDEX ix_billing_policies_1 ON billing_policies (com_cd, billing_type, effective_from, effective_to, domain_id);
```

---

### 4.2 StoragePolicy — 보관 정책

#### 설명 및 용도

화주사별 재고 보관 운영 기준을 정의하는 마스터 테이블.

입고 적치 전략, 재고 불출 순서(FIFO/FEFO), 유통기한 관리 방식, 웨이브 운영 정책, 리포트 템플릿 등을 화주사 단위로 설정한다. 현재 이 기준이 없어 재고 처리 로직이 단일 정책으로 고정되어 있으며, 다중 화주사 운영 시 충돌이 발생할 수 있다.

**주요 활용:**
- 입고 완료 시 적치 로케이션 결정 (`putaway_strategy` 기준)
- 출고 재고 할당 시 불출 순서 결정 (`release_strategy` 기준)
- 유통기한 임박 재고 알림 기준 (`expiry_alert_days` 이하 남은 경우 경고)
- B2B/B2C 웨이브 자동 생성 트리거 및 조건 관리
- 각종 리포트/라벨 템플릿 화주사별 지정

**불출 순서 유형 (`release_strategy`):**

| 코드 | 설명 |
|------|------|
| `FIFO` | First In First Out — 입고 일자 기준 먼저 입고된 것 우선 |
| `FEFO` | First Expired First Out — 유통기한이 가까운 것 우선 |
| `LIFO` | Last In First Out — 나중에 입고된 것 우선 (일부 원자재 창고) |
| `MANUAL` | 수동 선택 — 시스템 자동 결정 없이 작업자가 직접 선택 |

**입고 적치 전략 유형 (`putaway_strategy`):**

| 코드 | 설명 | 구현 방식 |
|------|------|----------|
| `FIXED` | 고정 로케이션 — SKU별 지정 로케이션에만 적치 | `Location.skuCd = 입고 SKU`인 로케이션 조회 |
| `RANDOM` | 빈 로케이션 자동 배정 — 여유 공간 있는 임의 로케이션 선택 | `maxQty/maxWeight` 여유 있는 로케이션 랜덤 선택 |
| `ZONE` | 존 기반 배정 — SKU 속성에 맞는 존 내 빈 로케이션 선택 | `SKU.tempType`, `SKU.hazmatFlag` 조건 매칭 |
| `NEAREST` | 최근접 로케이션 — 도크에서 가장 가까운 빈 로케이션 선택 | `Location.sortNo ASC` 정렬로 최소 이동 거리 우선 배정 |

**웨이브 생성 트리거 유형 (`b2b_wave_trigger`, `b2c_wave_trigger`):**

| 코드 | 설명 |
|------|------|
| `MANUAL` | 수동 생성 — 관리자가 직접 웨이브 생성 |
| `SCHEDULE` | 스케줄 기준 — 특정 시각에 자동 생성 |
| `COUNT` | 누적 주문 수 기준 — `*_wave_trigger_cnt` 이상 주문 누적 시 자동 생성 |

#### 테이블 명세: `storage_policies`

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | VARCHAR(40) | NOT NULL | UUID | PK |
| `com_cd` | VARCHAR(20) | NOT NULL | — | 화주사 코드. 화주사당 1개 정책 |
| `wh_cd` | VARCHAR(20) | NULL | — | 창고 코드. NULL이면 해당 화주사 전체 창고 적용 |
| `release_strategy` | VARCHAR(10) | NULL | `FIFO` | 불출 순서 전략 (FIFO/FEFO/LIFO/MANUAL) |
| `putaway_strategy` | VARCHAR(10) | NULL | — | 입고 적치 전략 (FIXED/RANDOM/ZONE/NEAREST). NEAREST는 Location.sortNo 오름차순 활용 |
| `default_wait_loc` | VARCHAR(30) | NULL | — | 입고 완료 후 기본 대기 로케이션 코드 (loc_cd 참조) |
| `inbound_sheet_tmpl` | VARCHAR(30) | NULL | — | 입고지시서 리포트 템플릿 코드 |
| `inv_label_tmpl` | VARCHAR(30) | NULL | — | 재고 바코드 라벨 템플릿 코드 |
| `picking_sheet_tmpl` | VARCHAR(30) | NULL | — | 피킹지시서 리포트 템플릿 코드 |
| `picked_inv_move_flag` | BOOLEAN | NULL | false | 피킹 후 재고 이동 여부. true이면 피킹존 → 포장존 이동 처리 |
| `b2b_label_tmpl` | VARCHAR(30) | NULL | — | B2B 출고 라벨 템플릿 코드 |
| `b2c_label_tmpl` | VARCHAR(30) | NULL | — | B2C 출고 라벨 템플릿 코드 |
| `outbound_sheet_tmpl` | VARCHAR(30) | NULL | — | 출고 거래명세서 리포트 템플릿 코드 |
| `b2b_wave_flag` | BOOLEAN | NULL | false | B2B 웨이브 사용 여부 |
| `b2b_wave_trigger` | VARCHAR(10) | NULL | — | B2B 웨이브 생성 트리거 (MANUAL/SCHEDULE/COUNT) |
| `b2b_wave_trigger_cnt` | INTEGER | NULL | — | B2B 웨이브 생성 임계 주문 수 (b2b_wave_trigger=COUNT 시) |
| `b2c_wave_flag` | BOOLEAN | NULL | false | B2C 웨이브 사용 여부 |
| `b2c_wave_trigger` | VARCHAR(10) | NULL | — | B2C 웨이브 생성 트리거 (MANUAL/SCHEDULE/COUNT) |
| `b2c_wave_trigger_cnt` | INTEGER | NULL | — | B2C 웨이브 생성 임계 주문 수 (b2c_wave_trigger=COUNT 시) |
| `expiry_alert_days` | INTEGER | NULL | — | 유통기한 임박 알림 기준일. 잔여 유통기한이 이 값 이하이면 경고 |
| `expiry_block_days` | INTEGER | NULL | — | 출고 차단 기준일. 잔여 유통기한이 이 값 이하이면 출고 불가 |
| `auto_reorder_flag` | BOOLEAN | NULL | false | 자동 발주 여부. `SKU.reorderPoint` 도달 시 자동 발주 지시 생성 |
| `del_flag` | BOOLEAN | NULL | false | 삭제 여부 |
| `remarks` | VARCHAR(1000) | NULL | — | 비고 |
| `domain_id` | BIGINT | NOT NULL | — | 멀티테넌시 도메인 ID |
| `creator_id` | BIGINT | NULL | — | 생성자 ID |
| `updater_id` | BIGINT | NULL | — | 수정자 ID |
| `created_at` | TIMESTAMP | NULL | — | 생성일시 |
| `updated_at` | TIMESTAMP | NULL | — | 수정일시 |

**인덱스:**
```sql
UNIQUE ix_storage_policies_0 (com_cd, wh_cd, domain_id)
INDEX  ix_storage_policies_1 (com_cd, release_strategy, domain_id)
```

**DDL:**
```sql
CREATE TABLE storage_policies (
    id                   VARCHAR(40)  NOT NULL PRIMARY KEY,
    com_cd               VARCHAR(20)  NOT NULL,
    wh_cd                VARCHAR(20),
    release_strategy     VARCHAR(10)  DEFAULT 'FIFO',
    putaway_strategy     VARCHAR(10),
    default_wait_loc     VARCHAR(30),
    inbound_sheet_tmpl   VARCHAR(30),
    inv_label_tmpl       VARCHAR(30),
    picking_sheet_tmpl   VARCHAR(30),
    picked_inv_move_flag BOOLEAN      DEFAULT FALSE,
    b2b_label_tmpl       VARCHAR(30),
    b2c_label_tmpl       VARCHAR(30),
    outbound_sheet_tmpl  VARCHAR(30),
    b2b_wave_flag        BOOLEAN      DEFAULT FALSE,
    b2b_wave_trigger     VARCHAR(10),
    b2b_wave_trigger_cnt INTEGER,
    b2c_wave_flag        BOOLEAN      DEFAULT FALSE,
    b2c_wave_trigger     VARCHAR(10),
    b2c_wave_trigger_cnt INTEGER,
    expiry_alert_days    INTEGER,
    expiry_block_days    INTEGER,
    auto_reorder_flag    BOOLEAN      DEFAULT FALSE,
    del_flag             BOOLEAN      DEFAULT FALSE,
    remarks              VARCHAR(1000),
    domain_id            BIGINT       NOT NULL,
    creator_id           BIGINT,
    updater_id           BIGINT,
    created_at           TIMESTAMP,
    updated_at           TIMESTAMP
);
CREATE UNIQUE INDEX ix_storage_policies_0 ON storage_policies (com_cd, COALESCE(wh_cd, ''), domain_id);
CREATE INDEX ix_storage_policies_1 ON storage_policies (com_cd, release_strategy, domain_id);
```

**ALTER TABLE (기존 테이블에 컬럼 추가 시):**
```sql
ALTER TABLE storage_policies
    ADD COLUMN putaway_strategy     VARCHAR(10),
    ADD COLUMN default_wait_loc     VARCHAR(30),
    ADD COLUMN inbound_sheet_tmpl   VARCHAR(30),
    ADD COLUMN inv_label_tmpl       VARCHAR(30),
    ADD COLUMN picking_sheet_tmpl   VARCHAR(30),
    ADD COLUMN picked_inv_move_flag BOOLEAN DEFAULT FALSE,
    ADD COLUMN b2b_label_tmpl       VARCHAR(30),
    ADD COLUMN b2c_label_tmpl       VARCHAR(30),
    ADD COLUMN outbound_sheet_tmpl  VARCHAR(30),
    ADD COLUMN b2b_wave_flag        BOOLEAN DEFAULT FALSE,
    ADD COLUMN b2b_wave_trigger     VARCHAR(10),
    ADD COLUMN b2b_wave_trigger_cnt INTEGER,
    ADD COLUMN b2c_wave_flag        BOOLEAN DEFAULT FALSE,
    ADD COLUMN b2c_wave_trigger     VARCHAR(10),
    ADD COLUMN b2c_wave_trigger_cnt INTEGER;
```
