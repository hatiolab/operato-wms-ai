terminologies 테이블에서 번역이 안 된 항목을 찾아서 locale에 맞게 번역해줘.

## 배경

`terminologies` 테이블은 UI 다국어 용어를 관리한다.
- 컬럼: `id`, `domain_id`, `locale`, `category`, `name`, `display`, `created_at`, `updated_at`
- `locale`: `ko`(한국어), `en`(영어), `zh`(중국어)
- `display`: 해당 locale의 번역 값
- **미번역 판별**: `display = category || '.' || name` (예: `label.rwa_no`)

## 처리 절차

1. **DB 접속 정보 확인**:
   - `frontend/packages/operato-wes/config/config.development.js` 파일에서 DB 접속 정보 확인
   - 또는 `application-dev.properties`에서 확인

2. **미번역 항목 조회** (Python/psycopg2 사용):
   ```sql
   SELECT id, domain_id, locale, category, name, display
   FROM terminologies
   WHERE display = category || '.' || name
   ORDER BY locale, category, name;
   ```

3. **번역 규칙**:
   - `name`(snake_case)을 기반으로 WMS 도메인에 맞는 번역 생성
   - `ko`: 한국어 (예: `rwa_no` → `반품번호`, `sku_cd` → `SKU 코드`)
   - `en`: 영어 Title Case (예: `rwa_no` → `RWA No`, `sku_cd` → `SKU Code`)
   - `zh`: 중국어 간체 (예: `rwa_no` → `退货编号`, `sku_cd` → `SKU编码`)
   - 약어는 대문자 유지: `SKU`, `ID`, `RWA`, `QTY`, `LOT`, `URL`, `UOM` 등
   - WMS 전문 용어 정확히 반영: `inbound`(입고/入库), `outbound`(출고/出库), `disposition`(처분/处置) 등

4. **번역 적용**:
   ```python
   UPDATE terminologies SET display = %s, updated_at = NOW() WHERE id = %s;
   ```

5. **결과 확인**:
   - 미번역 항목이 0건인지 재확인
   - 업데이트된 건수 보고

## 기술 스택

- **Python 3 + psycopg2-binary**: DB 접근 (psql CLI 미설치 환경 대응)
- psycopg2 미설치 시: `pip3 install psycopg2-binary`

## 주의사항

- `ko` locale은 이미 번역되어 있을 수 있으므로, 미번역 항목만 처리
- 기존 번역된 항목(`display != category || '.' || name`)은 절대 수정하지 않음
- Unique 제약: `(domain_id, locale, category, name)` — 중복 INSERT 주의
- 번역 품질: WMS/물류 도메인 전문 용어를 정확히 사용할 것

번역 완료 후 locale별 업데이트 건수와 샘플을 보여줘.
