terminologies 테이블에 새로운 용어를 등록해줘. 모든 도메인과 모든 언어(ko/en/ja/zh)에 자동으로 등록합니다.

파라미터: `category name display`
- `category`: 용어 카테고리 (예: `menu`, `label`, `button`)
- `name`: 용어 식별자 (예: `vas-home`, `VasOrder`)
- `display`: 한국어 표시명 (예: `유통가공`, `유통가공 주문`)

예시:
```
/add_terminology menu vas-home 유통가공
/add_terminology label status 상태
/add_terminology button save 저장
```

## 처리 절차

### 1. 파라미터 검증

- `category`: 필수, 소문자 영문 (예: `menu`, `label`, `button`, `message`)
- `name`: 필수, 영문/숫자/하이픈/언더스코어 (예: `vas-home`, `VasOrder`, `btn_save`)
- `display`: 필수, 한국어 표시명

### 2. 자동 번역 생성

**ko (한국어)**:
- 파라미터로 받은 `display` 값 그대로 사용

**en (영어)**:
- 자동 번역 시도
- WMS 도메인 전문 용어 우선 적용
- 번역 딕셔너리:
  ```python
  translations = {
      '유통가공': 'VAS',
      '유통가공 주문': 'VAS Order',
      '반품': 'RWA',
      '반품 주문': 'RWA Order',
      '입고': 'Inbound',
      '출고': 'Outbound',
      '재고': 'Stock',
      '상태': 'Status',
      '저장': 'Save',
      '취소': 'Cancel',
      '확인': 'OK',
      '삭제': 'Delete',
      '수정': 'Edit',
      '조회': 'Search',
      '등록': 'Register',
      '승인': 'Approve',
      '거부': 'Reject',
      '완료': 'Complete',
      '진행중': 'In Progress',
      '대기': 'Pending',
      '실패': 'Failed',
      '성공': 'Success',
  }
  ```
- 딕셔너리에 없으면 name을 Title Case로 변환 (예: `vas-home` → `Vas Home`)

**ja (일본어)**:
- 자동 번역 시도
- 번역 딕셔너리:
  ```python
  ja_translations = {
      '유통가공': '流通加工',
      '유통가공 주문': '流通加工オーダー',
      '반품': '返品',
      '반품 주문': '返品オーダー',
      '입고': '入庫',
      '출고': '出庫',
      '재고': '在庫',
      '상태': 'ステータス',
      '저장': '保存',
      '취소': 'キャンセル',
      '확인': 'OK',
      '삭제': '削除',
      '수정': '編集',
      '조회': '検索',
      '등록': '登録',
      '승인': '承認',
      '거부': '却下',
      '완료': '完了',
      '진행중': '進行中',
      '대기': '待機',
      '실패': '失敗',
      '성공': '成功',
  }
  ```
- 딕셔너리에 없으면 영어 번역 사용

**zh (중국어)**:
- 자동 번역 시도
- 번역 딕셔너리:
  ```python
  zh_translations = {
      '유통가공': '流通加工',
      '유통가공 주문': '流通加工订单',
      '반품': '退货',
      '반품 주문': '退货订单',
      '입고': '入库',
      '출고': '出库',
      '재고': '库存',
      '상태': '状态',
      '저장': '保存',
      '취소': '取消',
      '확인': '确认',
      '삭제': '删除',
      '수정': '编辑',
      '조회': '查询',
      '등록': '注册',
      '승인': '批准',
      '거부': '拒绝',
      '완료': '完成',
      '진행중': '进行中',
      '대기': '等待',
      '실패': '失败',
      '성공': '成功',
  }
  ```
- 딕셔너리에 없으면 영어 번역 사용

### 3. DB 접속 및 INSERT

**DB 접속 정보**:
- `frontend/packages/operato-wes/config/config.development.js` 파일에서 확인
- Python/psycopg2 사용

**도메인 조회**:
```python
SELECT id, name FROM domains ORDER BY id
```

**중복 확인**:
```python
SELECT id FROM terminologies
WHERE domain_id = %s AND locale = %s AND category = %s AND name = %s
```

**INSERT**:
```python
INSERT INTO terminologies (domain_id, name, locale, category, display, created_at, updated_at)
VALUES (%s, %s, %s, %s, %s, now(), now())
```

### 4. 결과 보고

- 도메인별, locale별 INSERT 결과 출력
- 중복으로 SKIP된 항목 출력
- 최종 통계 (총 INSERT 건수, SKIP 건수)

## 예시

### 입력
```bash
/add_terminology menu vas-bom BOM 관리
```

### 출력
```
✅ Terminology 등록 완료!

📊 등록 내역
  Category: menu
  Name: vas-bom

  ko: BOM 관리
  en: BOM Management
  ja: BOM管理
  zh: BOM管理

📈 통계
  도메인: 5개
  언어: 4개
  총 등록: 20건 (5 도메인 × 4 언어)
  중복: 0건
```

## 주의사항

- 이미 존재하는 용어는 SKIP (중복 INSERT 방지)
- Unique 제약: `(domain_id, locale, category, name)`
- 번역 딕셔너리에 없는 한국어는 영어로 자동 변환 시도
- WMS 전문 용어를 우선 적용하여 정확한 번역 제공
