messages 테이블에 새로운 메시지를 등록해줘. 모든 도메인과 모든 언어(ko/en/ja/zh)에 자동으로 등록합니다.

파라미터: `name display`
- `name`: 메시지 식별자, 대문자 + 언더스코어 (예: `NO_STOCK_AVAILABLE`, `INVALID_LOCATION`)
- `display`: 한국어 메시지 내용. `{0}`, `{1}` 등 플레이스홀더 포함 가능 (예: `[{0}] 로케이션에 재고가 없습니다`)

예시:
```
/add_message NO_STOCK_AVAILABLE [{0}] SKU의 가용 재고가 없습니다
/add_message INVALID_LOCATION [{0}] 로케이션은 사용할 수 없습니다
/add_message ORDER_ALREADY_CLOSED [{0}] 주문은 이미 마감되었습니다
```

## 처리 절차

### 1. 파라미터 파싱

- `name`: 첫 번째 토큰 (대문자 + 언더스코어, 예: `NO_STOCK_AVAILABLE`)
- `display`: 나머지 전체 문자열 (한국어 메시지, 플레이스홀더 포함 가능)

### 2. 자동 번역 생성

**ko (한국어)**:
- 파라미터로 받은 `display` 값 그대로 사용

**en (영어)**:
- `name`을 기반으로 의미를 파악하여 자연스러운 영어 메시지 생성
- WMS 전문 용어 적용:
  - 입고 → Inbound / Receiving
  - 출고 → Outbound / Shipment
  - 재고 → Stock / Inventory
  - 로케이션 → Location
  - 피킹 → Picking
  - 포장 → Packing
  - 화주사 → Company
  - 창고 → Warehouse
  - 웨이브 → Wave
  - 할당 → Allocation
- `{0}`, `{1}` 플레이스홀더는 그대로 유지
- 딕셔너리에 없으면 `name`을 Title Case로 변환 (예: `NO_STOCK` → `No Stock`)

**ja (일본어)**:
- 한국어 메시지 의미를 파악하여 일본어로 번역
- WMS 용어: 入庫/出庫/在庫/ロケーション/ピッキング/梱包/荷主/倉庫/ウェーブ/引当
- `{0}`, `{1}` 플레이스홀더는 그대로 유지
- 번역 불가 시 영어 메시지 사용

**zh (중국어 간체)**:
- 한국어 메시지 의미를 파악하여 중국어로 번역
- WMS 용어: 入库/出库/库存/库位/拣货/打包/货主/仓库/波次/分配
- `{0}`, `{1}` 플레이스홀더는 그대로 유지
- 번역 불가 시 영어 메시지 사용

### 3. DB 접속 및 INSERT

**DB 접속 정보**:
- `frontend/packages/operato-wes/config/config.development.js` 파일에서 확인
- Python/psycopg2 사용

**도메인 조회**:
```python
SELECT id FROM domains ORDER BY id
```

**중복 확인**:
```python
SELECT id FROM messages WHERE domain_id = %s AND locale = %s AND name = %s
```

**INSERT**:
```python
import uuid
INSERT INTO messages (id, domain_id, name, locale, display, created_at, updated_at)
VALUES (%s, %s, %s, %s, %s, now(), now())
# id = str(uuid.uuid4()) 로 명시적 생성 필요
```

> **주의**: `messages` 테이블에는 `category` 컬럼이 없음. `terminologies`와 다름.
> **주의**: `messages.id`는 UUID 기본값이 없으므로 `uuid.uuid4()`로 명시적으로 생성하여 INSERT 해야 함.

### 4. 결과 보고

- locale별 등록 메시지 출력
- 최종 통계 (총 INSERT 건수, SKIP 건수)

## 예시

### 입력
```
/add_message NO_STOCK_AVAILABLE [{0}] SKU의 가용 재고가 없습니다
```

### 출력
```
✅ Message 등록 완료!

📊 등록 내역
  Name: NO_STOCK_AVAILABLE

  ko: [{0}] SKU의 가용 재고가 없습니다
  en: No available stock for SKU [{0}]
  ja: SKU [{0}] の利用可能な在庫がありません
  zh: SKU [{0}] 没有可用库存

📈 통계
  도메인: 8개
  언어: 4개
  총 등록: 32건 (8 도메인 × 4 언어)
  중복: 0건
```

## 주의사항

- 이미 존재하는 메시지는 SKIP (중복 INSERT 방지)
- Unique 제약: `(domain_id, locale, name)`
- `messages` 테이블에는 `category` 컬럼 없음 — INSERT 시 제외
- `{0}`, `{1}` 등 플레이스홀더는 모든 언어에서 동일하게 유지
- `name`은 대문자 + 언더스코어 컨벤션 권장 (예: `NO_STOCK_AVAILABLE`)
- WMS 전문 용어를 정확히 반영하여 현장에서 이해하기 쉬운 메시지 생성
