# Operato WMS 프론트엔드 개발 가이드

> 이 문서는 커스텀 화면(대시보드, 팝업, 모니터링 등) 개발 시 사용하는
> 프론트엔드 유틸리티와 패턴을 정리한 가이드입니다.

---

## 목차

1. [import 및 기본 구조](#1-import-및-기본-구조)
2. [TermsUtil — 다국어 처리](#2-termsutil--다국어-처리)
3. [ServiceUtil — 백엔드 API 호출](#3-serviceutil--백엔드-api-호출)
4. [UiUtil — 페이지 이동 및 UI 유틸리티](#4-uiutil--페이지-이동-및-ui-유틸리티)
5. [openPopup — 팝업 열기](#5-openpopup--팝업-열기)
6. [데이터 컨벤션 (snake_case)](#6-데이터-컨벤션-snake_case)
7. [코딩 컨벤션 — 메소드 한글 주석](#7-코딩-컨벤션--메소드-한글-주석)
8. [자주 하는 실수와 해결책](#8-자주-하는-실수와-해결책)

---

## 1. import 및 기본 구조

### 필수 import

```javascript
import { css, html } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'
```

### 팝업을 여는 화면에서 추가

```javascript
import { openPopup } from '@operato/layout'
```

### 팝업 컴포넌트에서 추가

```javascript
import { UiUtil } from '@operato-app/metapage/dist-client'
// UiUtil.closePopupBy(this) 로 팝업 닫기
```

### 페이지 클래스 기본 구조

```javascript
class MyPage extends localize(i18next)(PageView) {
  static get styles() { return [css`...`] }
  static get properties() { return { ... } }

  get context() {
    return { title: '페이지 제목' }
  }

  render() { return html`...` }

  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      await this._loadData()
    }
  }

  pageDisposed(lifecycle) {
    // 타이머, 차트 등 리소스 정리
  }
}

window.customElements.define('my-page', MyPage)
```

---

## 2. TermsUtil — 다국어 처리

> **소스 위치**: `frontend/packages/metapage/client/utils/terms-util.ts`

**반드시 `TermsUtil`을 사용해야 하는 이유**:
- DB의 `terminologies` 테이블에서 자동으로 번역 로드
- `i18next.t()`보다 간결하고 직관적인 API
- 카테고리별 메서드로 용어 타입을 명확히 구분
- 용어가 없어도 defaultValue 대신 용어명 자체를 표시하여 디버깅 용이

### 2.1 주요 메서드

| 메서드 | 용도 | 예시 |
|--------|------|------|
| `tLabel(name)` | 라벨/필드명 | `TermsUtil.tLabel('company')` → "화주사" |
| `tButton(name)` | 버튼명 | `TermsUtil.tButton('approve')` → "승인" |
| `tText(name)` | 일반 텍스트/메시지 | `TermsUtil.tText('fetch-failed')` → "조회 실패" |
| `tMenu(name)` | 메뉴명 | `TermsUtil.tMenu('vas-home')` → "유통가공" |
| `tTitle(name)` | 타이틀 | `TermsUtil.tTitle('dashboard')` → "대시보드" |
| `tError(name)` | 에러 메시지 | `TermsUtil.tError('invalid-qty')` → "수량 오류" |

### 2.2 기본 사용법

```javascript
import { TermsUtil } from '@operato-app/metapage/dist-client'

class MyPage extends localize(i18next)(PageView) {
  /** 페이지 제목 설정 */
  get context() {
    return {
      title: TermsUtil.tLabel('vas-order-detail')  // "VAS 작업 지시 상세"
    }
  }

  /** 렌더링 */
  render() {
    return html`
      <!-- 라벨 -->
      <span>${TermsUtil.tLabel('company')}</span>  <!-- 화주사 -->
      <span>${TermsUtil.tLabel('warehouse')}</span>  <!-- 창고 -->

      <!-- 버튼 -->
      <mwc-button @click="${this._onApprove}">
        ${TermsUtil.tButton('approve')}  <!-- 승인 -->
      </mwc-button>

      <!-- 메시지 -->
      <div>${TermsUtil.tText('no-data')}</div>  <!-- 데이터가 없습니다 -->
    `
  }

  /** 승인 처리 */
  async _onApprove() {
    const confirmed = await UiUtil.confirm(
      TermsUtil.tText('confirm-approve')  // "승인하시겠습니까?"
    )

    if (confirmed) {
      try {
        await ServiceUtil.restPost('vas_trx/approve', {})
        UiUtil.showMessage(
          TermsUtil.tText('approved'),  // "승인되었습니다"
          'success'
        )
      } catch (error) {
        UiUtil.showMessage(
          TermsUtil.tText('error-occurred'),  // "오류 발생"
          'error'
        )
      }
    }
  }
}
```

### 2.3 상태 라벨 매핑

VAS 주문 상태와 같이 코드값을 한글로 변환할 때 사용합니다.

```javascript
/** VAS 주문 상태 라벨 반환 */
getStatusLabel(status) {
  const labels = {
    'PLAN': TermsUtil.tLabel('plan'),           // 계획
    'APPROVED': TermsUtil.tLabel('approved'),   // 승인
    'IN_PROGRESS': TermsUtil.tLabel('in-progress'),  // 작업중
    'COMPLETED': TermsUtil.tLabel('completed')  // 완료
  }
  return labels[status] || status
}

// 사용
render() {
  return html`
    <span class="status">${this.getStatusLabel(order.status)}</span>
  `
}
```

### 2.4 동적 파라미터 처리

용어에 변수를 포함해야 할 때 사용합니다.

```javascript
// terminologies 테이블에 등록된 용어:
// category: 'text', name: 'items-count', display: '총 {{count}}건'

TermsUtil.tText('items-count', { count: 15 })  // "총 15건"
TermsUtil.tLabel('order-detail', { orderNo: 'VAS-001' })  // "주문 VAS-001 상세"
```

### 2.5 i18next.t()와 비교

**기존 방식 (i18next.t)**:
```javascript
// ❌ 카테고리를 매번 명시해야 함
i18next.t('label.company', { defaultValue: '화주사' })
i18next.t('button.approve', { defaultValue: '승인' })
i18next.t('text.fetch-failed', { defaultValue: '조회 실패' })
```

**권장 방식 (TermsUtil)**:
```javascript
// ✅ 카테고리별 메서드로 간결하게
TermsUtil.tLabel('company')
TermsUtil.tButton('approve')
TermsUtil.tText('fetch-failed')
```

### 2.6 용어 등록 방법

새 용어를 추가할 때는 `/add_term` skill을 사용합니다.

```bash
# 라벨 등록
/add_term label company 화주사
/add_term label warehouse 창고

# 버튼 등록
/add_term button approve 승인
/add_term button cancel 취소

# 텍스트 등록
/add_term text fetch-failed 조회 실패
/add_term text no-data 데이터가 없습니다
```

용어 등록 후 프론트엔드 캐시를 삭제하여 반영:
```bash
/clear_frontend_cache
```

---

## 3. ServiceUtil — 백엔드 API 호출

> **소스 위치**: `frontend/packages/metapage/client/utils/service-util.js`

**반드시 `ServiceUtil`을 사용해야 하는 이유**:
- 인증 토큰(access_token)을 자동으로 헤더에 포함
- 도메인 컨텍스트를 자동 처리
- 에러 발생 시 토스트 메시지 자동 표시
- `fetch()`를 직접 사용하면 인증이 연동되지 않아 401/403 에러 발생

### 2.1 restGet — GET 요청

```javascript
static async restGet(url, params)
```

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `url` | String | 서비스 URL (`/rest/` 접두사 불필요, 자동 추가) |
| `params` | Object | 쿼리 파라미터 (optional) |
| **반환** | Object \| null | 응답 데이터 또는 null |

```javascript
// 단순 조회
const data = await ServiceUtil.restGet('rwa_trx/dashboard/status-counts')

// 파라미터 포함 조회
const warehouses = await ServiceUtil.restGet('warehouses/getWarehouseList', {})
const orders = await ServiceUtil.restGet('picking_orders/getPickedOrderList/byDate', {
  startDate: '2026-03-01',
  endDate: '2026-03-18'
})

// 경로에 ID 포함
const bomItems = await ServiceUtil.restGet(`vas_boms/${bomId}/items`)
```

### 2.2 restPost — POST 요청

```javascript
static async restPost(url, params, confirmTitleKey, confirmMsgKey, successCallback, failureCallback)
```

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `url` | String | 서비스 URL |
| `params` | Object | 요청 body |
| `confirmTitleKey` | String | 확인 팝업 타이틀 용어 키 (optional, null이면 팝업 안 띄움) |
| `confirmMsgKey` | String | 확인 팝업 메시지 용어 키 (optional) |
| `successCallback` | Function | 성공 콜백 (optional) |
| `failureCallback` | Function | 실패 콜백 (optional) |
| **반환** | Object | 응답 데이터 |

```javascript
// 기본 POST (확인 팝업 없이)
const result = await ServiceUtil.restPost('vas_trx/vas_orders', {
  com_cd: 'COM001',
  wh_cd: 'WH001',
  plan_qty: 100
})

// 확인 팝업 포함 POST
await ServiceUtil.restPost(
  'vas_trx/vas_orders/123/start',
  null,
  'title.confirm',
  'text.are_you_sure'
)

// 경로에 ID 포함 (액션 API)
await ServiceUtil.restPost(`vas_trx/vas_orders/${order.id}/complete`)
```

### 2.3 restPut — PUT 요청

```javascript
static async restPut(url, params, confirmTitleKey, confirmMsgKey, successCallback, failureCallback)
```

시그니처는 `restPost`와 동일합니다.

```javascript
await ServiceUtil.restPut('vas_orders/update', updateData, null, null, () => {
  console.log('업데이트 성공')
})
```

### 2.4 restDelete — DELETE 요청

```javascript
static async restDelete(url, params, confirmTitleKey, confirmMsgKey, successCallback, failureCallback)
```

시그니처는 `restPost`와 동일합니다.

```javascript
await ServiceUtil.restDelete('vas_orders/123', null, null, null, () => {
  console.log('삭제 성공')
})
```

### 2.5 searchByPagination — 페이지네이션 조회

```javascript
static async searchByPagination(url, filters, sortings, page, limit, selectFields)
```

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `url` | String | 조회 서비스 URL (엔티티 테이블명) |
| `filters` | Array | 조회 조건 `[{ name, operator, value }, ...]` |
| `sortings` | Array | 정렬 조건 (null 가능) |
| `page` | Number | 현재 페이지 (기본값: 1) |
| `limit` | Number | 페이지당 건수 (기본값: 50) |
| `selectFields` | String \| Array | 조회 필드 (optional) |
| **반환** | Object \| null | `{ items: [...], total: 100 }` 또는 null |

```javascript
// 기본 조회
const data = await ServiceUtil.searchByPagination('vas_boms', filters, null, 1, 100)
const items = data?.items || []

// 필터 조건 구성
const filters = [
  { name: 'com_cd', value: 'COM001' },
  { name: 'status', operator: 'eq', value: 'APPROVED' }
]

// 재고 조회 (1건만)
const stockData = await ServiceUtil.searchByPagination('inventories', [
  { name: 'sku_cd', value: item.sku_cd },
  { name: 'wh_cd', value: 'WH001' }
], null, 1, 1)
```

### 2.6 findOne — 단건 조회

```javascript
static async findOne(url, id, selectFields)
```

```javascript
const order = await ServiceUtil.findOne('vas_orders', orderId)
```

### 2.7 기타 유용한 메소드

```javascript
// 공통코드 조회
const codeList = await ServiceUtil.codeItems('VAS_ORDER_STATUS')

// 그리드 다중 업데이트
await ServiceUtil.updateMultipleData(grist, 'vas_orders')

// 그리드 선택 항목 삭제
await ServiceUtil.deleteListByGristSelected(grist, 'vas_orders')

// Excel 파일 다운로드
await ServiceUtil.excelFileDownload('reports/vas-orders', params, 'VAS주문목록.xlsx')
```

---

## 3. UiUtil — 페이지 이동 및 UI 유틸리티

> **소스 위치**: `frontend/packages/metapage/client/utils/ui-util.js`

### 3.1 pageNavigate — 페이지 이동

```javascript
static pageNavigate(url, params)
```

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `url` | String | 페이지명 (route에 등록된 값) |
| `params` | Object \| null | 페이지 파라미터 |
| **반환** | void | |

**반드시 `UiUtil.pageNavigate`를 사용해야 하는 이유**:
- Things Factory 라우팅 시스템과 올바르게 연동
- `history.pushState`를 직접 사용하면 라우팅 이벤트가 발생하지 않아 화면이 전환되지 않음

```javascript
// 단순 페이지 이동
UiUtil.pageNavigate('vas-work-monitor')

// 필터 파라미터 포함 이동
// → URL에 ?pass={"status":"PLAN"} 형태로 변환됨
UiUtil.pageNavigate('vas-orders', { status: 'PLAN' })

// 상세 페이지 이동
UiUtil.pageNavigate('vas-order-detail', { id: order.id, vasNo: order.vas_no })

// LitElement 이벤트 핸들러에서 사용
render() {
  return html`
    <div @click="${() => this._navigateTo('vas-orders', 'APPROVED')}">
      승인완료
    </div>
  `
}

_navigateTo(page, filter) {
  UiUtil.pageNavigate(page, filter ? { status: filter } : null)
}
```

### 3.2 pageNavigateWithSilenceOfParams — 파라미터 숨김 이동

```javascript
static pageNavigateWithSilenceOfParams(page, params)
```

주소표시줄에 파라미터를 표시하지 않고 페이지를 이동합니다.

```javascript
UiUtil.pageNavigateWithSilenceOfParams('vas-order-detail', { id: '123' })
```

### 3.3 closePopupBy — 팝업 닫기

```javascript
static closePopupBy(popup)
```

팝업 컴포넌트 내부에서 자기 자신을 닫을 때 사용합니다.

```javascript
class MyPopup extends LitElement {
  _onCancel() {
    UiUtil.closePopupBy(this)
  }

  async _onSave() {
    // 저장 로직...
    this.dispatchEvent(new CustomEvent('saved'))
    UiUtil.closePopupBy(this)
  }
}
```

### 3.4 showToast — 토스트 메시지

```javascript
static showToast(type, message)
```

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `type` | String | `'info'`, `'success'`, `'warning'`, `'error'` |
| `message` | String | 표시할 메시지 |

```javascript
UiUtil.showToast('info', '이미 스캔된 바코드입니다!')
UiUtil.showToast('success', '저장 완료')
```

### 3.5 showAlertPopup — 알림 팝업 (확인/취소)

```javascript
static async showAlertPopup(titleCode, textCode, type, confirmButtonCode, cancelButtonCode)
```

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `titleCode` | String | 제목 용어 키 (예: `'title.confirm'`, `'title.error'`) |
| `textCode` | String | 내용 용어 키 또는 문자열 |
| `type` | String | `'info'`, `'error'`, `'warning'`, `'question'` |
| `confirmButtonCode` | String | 확인 버튼 용어 키 (예: `'confirm'`) |
| `cancelButtonCode` | String | 취소 버튼 용어 키 (빈 문자열이면 취소 버튼 숨김) |
| **반환** | Object | 사용자 응답 (`.isConfirmed` 속성) |

```javascript
// 에러 알림 (확인 버튼만)
await UiUtil.showAlertPopup('title.error', '입고 수량이 없습니다.', 'error', 'confirm')

// 확인/취소 팝업
const result = await UiUtil.showAlertPopup(
  'button.delete',
  'text.are_you_sure',
  'question',
  'confirm',
  'cancel'
)
if (result.isConfirmed) {
  // 삭제 실행
}
```

### 3.6 기타 유용한 메소드

```javascript
// 모바일 환경 체크
if (UiUtil.isMobileEnv()) { ... }

// 현재 로케일
const locale = UiUtil.currentLocale()  // 'ko', 'en', ...

// 현재 라우팅 정보
const routing = UiUtil.currentRouting()

// 커스텀 이벤트 전파
UiUtil.fireCustomEvent('order-updated', { orderId: '123' })
```

---

## 4. openPopup — 팝업 열기

> **import**: `import { openPopup } from '@operato/layout'`

```javascript
openPopup(html`<팝업-컴포넌트></팝업-컴포넌트>`, options)
```

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| 첫번째 | TemplateResult | lit-html 템플릿 |
| `options.backdrop` | Boolean | 배경 딤 처리 |
| `options.size` | String | `'large'`, `'medium'`, `'small'` |
| `options.title` | String | 팝업 타이틀 |

```javascript
import { openPopup } from '@operato/layout'
import './my-popup'  // 팝업 컴포넌트 import 필수

// 팝업 열기
openPopup(
  html`<my-popup
    .someData="${this.data}"
    @saved="${() => this._refresh()}"
  ></my-popup>`,
  {
    backdrop: true,
    size: 'large',
    title: '주문 생성'
  }
)
```

### 팝업 컴포넌트 패턴

```javascript
class MyPopup extends LitElement {
  // 팝업에서 이벤트를 발행하여 부모에게 알림
  async _onSave() {
    const result = await ServiceUtil.restPost('some/api', data)
    this.dispatchEvent(new CustomEvent('saved', { detail: result }))
    UiUtil.closePopupBy(this)
  }

  _onCancel() {
    UiUtil.closePopupBy(this)
  }
}
```

---

## 5. 데이터 컨벤션 (snake_case)

### 핵심 규칙

**백엔드 API 데이터는 항상 snake_case를 사용합니다.**

| 구분 | 컨벤션 | 예시 |
|------|--------|------|
| 백엔드 응답 속성 | snake_case | `order.com_cd`, `item.sku_cd`, `bom.vas_type` |
| 백엔드 요청 body 키 | snake_case | `{ com_cd: 'COM001', plan_qty: 100 }` |
| 프론트엔드 내부 상태 | camelCase | `this.formData.comCd`, `this.selectedBom` |
| searchByPagination 필터 | snake_case | `{ name: 'sku_cd', value: '...' }` |

### 올바른 예시

```javascript
// 백엔드 응답 데이터 접근 — snake_case
const items = data?.items || []
items.forEach(item => {
  console.log(item.sku_cd)       // O
  console.log(item.stock_qty)    // O
  console.log(item.vas_type)     // O
})

// 백엔드 요청 body 구성 — snake_case
const requestBody = {
  com_cd: this.formData.comCd,      // 내부 camelCase → 외부 snake_case
  wh_cd: this.formData.whCd,
  vas_bom_id: this.formData.vasBomId,
  plan_qty: parseFloat(this.formData.planQty)
}
await ServiceUtil.restPost('vas_trx/vas_orders', requestBody)

// searchByPagination 필터 — snake_case
const filters = [
  { name: 'sku_cd', value: item.sku_cd },
  { name: 'wh_cd', value: this.formData.whCd }
]
```

### 잘못된 예시

```javascript
// X — 백엔드 응답을 camelCase로 접근하면 undefined
console.log(item.skuCd)       // undefined!
console.log(item.stockQty)    // undefined!

// X — 요청 body에 camelCase 사용하면 백엔드에서 인식 못함
const requestBody = {
  comCd: 'COM001',        // 백엔드에서 인식 불가!
  planQty: 100            // 백엔드에서 인식 불가!
}
```

---

## 6. 코딩 컨벤션 — 메소드 한글 주석

### 필수 규칙

**모든 메소드에는 반드시 한글 JSDoc 주석(`/** ... */`)을 작성해야 합니다.**

이 규칙은 클래스 내 모든 메소드에 적용됩니다:
- `static get` (styles, properties)
- 생명주기 메소드 (constructor, connectedCallback, pageUpdated, pageDisposed)
- render 메소드 및 부분 렌더링 메소드 (`_renderXxx`)
- 데이터 조회 메소드 (`_fetchXxx`)
- 이벤트 핸들러 (`_onXxx`, `_handleXxx`)
- 유틸리티 메소드
- getter / setter

### 주석 형식

```javascript
/** 한 줄 설명 */
메소드명() { ... }
```

- `/** */` (JSDoc 스타일) 사용 — `//` 한 줄 주석이 아닌 JSDoc 블록 주석 사용
- 메소드 바로 위에 작성
- 메소드가 **무엇을 하는지** 간결하게 설명 (구현 방법이 아닌 목적 위주)
- 괄호 안에 부가 설명을 추가하면 가독성이 좋음

### 올바른 예시

```javascript
class VasHome extends localize(i18next)(PageView) {
  /** 컴포넌트 스타일 정의 */
  static get styles() { ... }

  /** 컴포넌트 반응형 속성 정의 */
  static get properties() { ... }

  /** 생성자 - 초기 상태값 설정 */
  constructor() { ... }

  /** 페이지 컨텍스트 반환 - 브라우저 타이틀 등에 사용 */
  get context() { ... }

  /** 화면 렌더링 - 로딩 상태이면 로딩 표시, 아니면 대시보드 전체 출력 */
  render() { ... }

  /** 페이지 활성화 시 대시보드 데이터 조회 */
  async pageUpdated(changes, lifecycle, before) { ... }

  /** 대시보드 데이터 일괄 조회 (상태별 건수, 유형별 통계, 알림) */
  async _fetchDashboardData() { ... }

  /** VAS 주문 상태별 건수 조회 (대기/승인/진행/완료) */
  async _fetchStatusCounts() { ... }

  /** Chart.js를 이용한 VAS 유형별 막대 차트 렌더링 */
  _renderChart() { ... }

  /** 작업 지시 생성 팝업 열기 */
  _openOrderNewPopup() { ... }

  /** 지정된 페이지로 이동 (필터 조건 포함 가능) */
  _navigateTo(page, filter) { ... }

  /** 페이지 해제 시 Chart 인스턴스 정리 */
  pageDisposed(lifecycle) { ... }
}
```

### 잘못된 예시

```javascript
// X — 주석 없음
async _fetchData() { ... }

// X — 영어 주석
/** Fetch dashboard data */
async _fetchDashboardData() { ... }

// X — 한 줄 주석(//) 사용
// 대시보드 데이터 조회
async _fetchDashboardData() { ... }

// X — 너무 장황한 설명
/**
 * 이 메소드는 백엔드 API를 호출하여 대시보드에 필요한
 * 상태별 건수, 유형별 통계, 알림 데이터를 각각 조회한 후
 * 컴포넌트 속성에 할당하고 차트를 렌더링합니다.
 */
async _fetchDashboardData() { ... }
```

---

## 7. 자주 하는 실수와 해결책

### 7.1 fetch() 직접 사용

```javascript
// X — 인증 토큰이 포함되지 않아 401/403 에러 발생
const response = await fetch('/rest/vas_trx/dashboard/status-counts')

// O — ServiceUtil 사용
const data = await ServiceUtil.restGet('vas_trx/dashboard/status-counts')
```

### 7.2 history.pushState 직접 사용

```javascript
// X — Things Factory 라우터가 인식하지 못해 화면 전환 안됨
history.pushState(null, '', '/vas-orders')

// O — UiUtil 사용
UiUtil.pageNavigate('vas-orders')
```

### 7.3 URL에 /rest/ 접두사 포함

```javascript
// X — /rest/가 중복 추가됨
await ServiceUtil.restGet('/rest/vas_trx/dashboard/alerts')

// O — /rest/ 없이 경로만 전달
await ServiceUtil.restGet('vas_trx/dashboard/alerts')
```

### 7.4 백엔드 @RequestParam name 속성 누락

Spring Boot에서 `-parameters` 컴파일러 플래그 없이 빌드하면 파라미터 이름을 추론할 수 없습니다.

```java
// X — 500 에러 발생 ("Name for argument of type [java.lang.String] not specified")
@GetMapping("/dashboard/status-counts")
public Map<String, Object> getDashboardStatusCounts(
    @RequestParam(required = false) String comCd) { ... }

// O — name 속성 명시
@GetMapping("/dashboard/status-counts")
public Map<String, Object> getDashboardStatusCounts(
    @RequestParam(name = "comCd", required = false) String comCd) { ... }
```

### 7.5 팝업 닫기

```javascript
// X — 팝업이 닫히지 않음
this.remove()

// O — UiUtil 사용
UiUtil.closePopupBy(this)
```

---

## 부록: ServiceUtil 전체 메소드 목록

| 메소드 | 설명 | 사용 빈도 |
|--------|------|----------|
| `restGet(url, params)` | GET 요청 | 높음 |
| `restPost(url, params, ...)` | POST 요청 | 높음 |
| `restPut(url, params, ...)` | PUT 요청 | 보통 |
| `restDelete(url, params, ...)` | DELETE 요청 | 보통 |
| `searchByPagination(url, filters, sortings, page, limit)` | 페이지네이션 조회 | 높음 |
| `findOne(url, id)` | 단건 조회 | 보통 |
| `codeItems(codeName)` | 공통코드 조회 | 보통 |
| `updateMultipleData(grist, url)` | 그리드 다중 업데이트 | 보통 |
| `deleteListByGristSelected(grist, url)` | 그리드 선택 삭제 | 보통 |
| `patchesForUpdateMultiple(grist)` | 변경 데이터 추출 | 보통 |
| `validationBeforeSave(grist, patches)` | 저장 전 검증 | 보통 |
| `getSelectedIdList(grist)` | 선택 ID 목록 | 보통 |
| `excelFileDownload(url, params, fileName)` | Excel 다운로드 | 낮음 |
| `callCustomService(btn, svcName, vars)` | 커스텀 서비스 호출 | 낮음 |

## 부록: UiUtil 주요 메소드 목록

| 메소드 | 설명 | 사용 빈도 |
|--------|------|----------|
| `pageNavigate(url, params)` | 페이지 이동 | 높음 |
| `pageNavigateWithSilenceOfParams(page, params)` | 파라미터 숨김 이동 | 낮음 |
| `closePopupBy(popup)` | 팝업 닫기 | 높음 |
| `showToast(type, message)` | 토스트 메시지 | 높음 |
| `showAlertPopup(title, text, type, confirm, cancel)` | 알림/확인 팝업 | 높음 |
| `isMobileEnv()` | 모바일 환경 체크 | 보통 |
| `currentLocale()` | 현재 로케일 | 낮음 |
| `fireCustomEvent(name, detail)` | 커스텀 이벤트 | 낮음 |
| `getFilterFormData(filterForm)` | 필터 폼 데이터 추출 | 보통 |
