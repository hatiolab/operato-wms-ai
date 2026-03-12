# 프론트엔드 테스트 가이드

> 최종 업데이트: 2026-03-12
> 기준: Jest + @web/test-runner + @open-wc/testing + Playwright

이 문서는 Operato WMS 프론트엔드의 테스트 작성 가이드입니다.

---

## 📋 목차

1. [개요](#1-개요)
2. [테스트 환경 설정](#2-테스트-환경-설정)
3. [유틸리티 함수 테스트](#3-유틸리티-함수-테스트)
4. [웹 컴포넌트 테스트 (Lit-Element)](#4-웹-컴포넌트-테스트-lit-element)
5. [Redux 스토어 테스트](#5-redux-스토어-테스트)
6. [API 모킹](#6-api-모킹)
7. [E2E 테스트 (Playwright)](#7-e2e-테스트-playwright)
8. [모범 사례 (Best Practices)](#8-모범-사례-best-practices)
9. [자주 발생하는 문제와 해결](#9-자주-발생하는-문제와-해결)

---

## 1. 개요

### 1.1 테스트 전략

| 테스트 유형 | 비율 | 범위 | 실행 속도 |
|------------|------|------|----------|
| 유틸리티 테스트 (Unit) | 50% | ServiceUtil, ValueUtil, OperatoUtil | 매우 빠름 |
| 컴포넌트 테스트 (Unit) | 30% | Lit-Element 컴포넌트 렌더링/이벤트 | 빠름 |
| 통합 테스트 (Integration) | 15% | 컴포넌트 + Redux + API | 중간 |
| E2E 테스트 | 5% | 실제 사용자 시나리오 | 느림 |

### 1.2 테스트 우선순위

**P1 - 최우선 (반드시 작성)**:
- 비즈니스 로직이 포함된 유틸리티 함수 (`ServiceUtil`, `ValueUtil`, `OperatoUtil`)
- 금액, 수량 계산 로직
- 상태 전이 로직
- 복잡한 데이터 변환 함수

**P2 - 중요**:
- 주요 페이지 컴포넌트의 렌더링 테스트
- Redux 액션 및 리듀서
- API 통신 로직
- 공통 컴포넌트 (버튼, 입력 필드 등)

**P3 - 선택**:
- 단순 UI 컴포넌트
- Getter/Setter
- 간단한 포맷팅 함수

### 1.3 프로젝트 특성

- **프레임워크**: Things Factory (Lit-Element 기반)
- **언어**: TypeScript
- **상태관리**: Redux (@operato/shell의 store)
- **스타일**: lit/decorators의 `css` 태그
- **라우팅**: @operato/shell의 PageView

---

## 2. 테스트 환경 설정

### 2.1 패키지 설치

```bash
cd frontend

# 테스트 프레임워크
yarn add -D -W jest @types/jest ts-jest

# 웹 컴포넌트 테스트
yarn add -D -W @web/test-runner @web/test-runner-playwright
yarn add -D -W @open-wc/testing @open-wc/testing-helpers

# Lit-Element 테스트 유틸리티
yarn add -D -W lit-html

# E2E 테스트
yarn add -D -W @playwright/test

# Mock/Spy 라이브러리
yarn add -D -W sinon @types/sinon
```

### 2.2 Jest 설정

**`jest.config.js`** (프로젝트 루트):

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/packages'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  moduleNameMapper: {
    '^@operato-app/(.*)$': '<rootDir>/packages/$1/client',
    '^@operato/(.*)$': '<rootDir>/node_modules/@operato/$1'
  },
  collectCoverageFrom: [
    'packages/**/client/**/*.{ts,tsx}',
    '!packages/**/client/**/*.d.ts',
    '!packages/**/dist/**',
    '!packages/**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
}
```

### 2.3 Web Test Runner 설정

**`web-test-runner.config.js`** (웹 컴포넌트 테스트용):

```javascript
import { playwrightLauncher } from '@web/test-runner-playwright'

export default {
  files: 'packages/**/test/**/*.test.ts',
  nodeResolve: true,
  browsers: [
    playwrightLauncher({ product: 'chromium' })
  ],
  testFramework: {
    config: {
      timeout: 3000
    }
  }
}
```

### 2.4 디렉토리 구조

```
frontend/
├── packages/
│   ├── operato-wes/
│   │   ├── client/
│   │   │   ├── pages/
│   │   │   │   └── pda/
│   │   │   │       └── pda-wms-shipment-barcode.ts
│   │   │   └── utils/
│   │   │       └── service-util.ts
│   │   └── test/                    # 테스트 파일
│   │       ├── unit/
│   │       │   └── service-util.test.ts
│   │       ├── component/
│   │       │   └── pda-wms-shipment-barcode.test.ts
│   │       └── e2e/
│   │           └── shipment-flow.spec.ts
│   └── metapage/
│       ├── client/utils/
│       │   └── value-util.ts
│       └── test/
│           └── unit/
│               └── value-util.test.ts
```

### 2.5 package.json 스크립트

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:component": "web-test-runner",
    "test:e2e": "playwright test",
    "test:all": "yarn test && yarn test:component && yarn test:e2e"
  }
}
```

---

## 3. 유틸리티 함수 테스트

### 3.1 ServiceUtil 테스트 예시

**`packages/metapage/test/unit/service-util.test.ts`**:

```typescript
import { ServiceUtil } from '../../client/utils/service-util'

describe('ServiceUtil', () => {
  describe('fetchData', () => {
    it('성공적으로 데이터를 가져온다', async () => {
      // Given
      const mockResponse = { data: { items: [1, 2, 3] } }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      // When
      const result = await ServiceUtil.fetchData('/api/items')

      // Then
      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith('/api/items')
    })

    it('API 에러 시 예외를 던진다', async () => {
      // Given
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500
      })

      // When & Then
      await expect(ServiceUtil.fetchData('/api/items'))
        .rejects.toThrow('API Error: 500')
    })
  })
})
```

### 3.2 ValueUtil 테스트 예시

**`packages/metapage/test/unit/value-util.test.ts`**:

```typescript
import { ValueUtil } from '../../client/utils/value-util'

describe('ValueUtil', () => {
  describe('formatCurrency', () => {
    it('숫자를 통화 형식으로 변환한다', () => {
      // Given
      const amount = 1234567.89

      // When
      const result = ValueUtil.formatCurrency(amount)

      // Then
      expect(result).toBe('1,234,567.89')
    })

    it('null 값은 빈 문자열을 반환한다', () => {
      expect(ValueUtil.formatCurrency(null)).toBe('')
    })

    it('0은 "0"을 반환한다', () => {
      expect(ValueUtil.formatCurrency(0)).toBe('0')
    })
  })

  describe('parseQuantity', () => {
    it('문자열 수량을 숫자로 변환한다', () => {
      expect(ValueUtil.parseQuantity('100')).toBe(100)
      expect(ValueUtil.parseQuantity('1,234')).toBe(1234)
    })

    it('잘못된 형식은 0을 반환한다', () => {
      expect(ValueUtil.parseQuantity('abc')).toBe(0)
      expect(ValueUtil.parseQuantity('')).toBe(0)
    })
  })
})
```

### 3.3 OperatoUtil 테스트 예시

**`packages/metapage/test/unit/operato-util.test.ts`**:

```typescript
import { OperatoUtil } from '../../client/utils/operato-util'

describe('OperatoUtil', () => {
  describe('calculatePickingQuantity', () => {
    it('주문 수량에서 피킹 수량을 계산한다', () => {
      // Given
      const orderQty = 100
      const pickedQty = 30

      // When
      const remainingQty = OperatoUtil.calculatePickingQuantity(orderQty, pickedQty)

      // Then
      expect(remainingQty).toBe(70)
    })

    it('피킹 수량이 주문 수량을 초과하면 0을 반환한다', () => {
      expect(OperatoUtil.calculatePickingQuantity(100, 150)).toBe(0)
    })
  })

  describe('validateBarcode', () => {
    it('유효한 바코드는 true를 반환한다', () => {
      expect(OperatoUtil.validateBarcode('1234567890123')).toBe(true)
    })

    it('빈 바코드는 false를 반환한다', () => {
      expect(OperatoUtil.validateBarcode('')).toBe(false)
      expect(OperatoUtil.validateBarcode(null)).toBe(false)
    })

    it('13자리가 아닌 바코드는 false를 반환한다', () => {
      expect(OperatoUtil.validateBarcode('12345')).toBe(false)
    })
  })
})
```

---

## 4. 웹 컴포넌트 테스트 (Lit-Element)

### 4.1 기본 컴포넌트 렌더링 테스트

**`packages/operato-wes/test/component/simple-button.test.ts`**:

```typescript
import { fixture, html, expect } from '@open-wc/testing'
import { SimpleButton } from '../../client/components/simple-button'

describe('SimpleButton', () => {
  it('버튼이 렌더링된다', async () => {
    // Given & When
    const el = await fixture<SimpleButton>(html`
      <simple-button label="Click Me"></simple-button>
    `)

    // Then
    expect(el).to.exist
    expect(el.shadowRoot?.textContent).to.include('Click Me')
  })

  it('클릭 이벤트가 발생한다', async () => {
    // Given
    const el = await fixture<SimpleButton>(html`
      <simple-button label="Click Me"></simple-button>
    `)
    let clicked = false
    el.addEventListener('button-click', () => { clicked = true })

    // When
    const button = el.shadowRoot?.querySelector('button')
    button?.click()

    // Then
    expect(clicked).to.be.true
  })

  it('disabled 상태에서는 클릭 이벤트가 발생하지 않는다', async () => {
    // Given
    const el = await fixture<SimpleButton>(html`
      <simple-button label="Click Me" disabled></simple-button>
    `)
    let clicked = false
    el.addEventListener('button-click', () => { clicked = true })

    // When
    const button = el.shadowRoot?.querySelector('button')
    button?.click()

    // Then
    expect(clicked).to.be.false
  })
})
```

### 4.2 복잡한 컴포넌트 테스트

**`packages/operato-wes/test/component/pda-barcode-input.test.ts`**:

```typescript
import { fixture, html, expect, oneEvent } from '@open-wc/testing'
import { PdaBarcodeInput } from '../../client/components/pda-barcode-input'

describe('PdaBarcodeInput', () => {
  it('바코드 입력 시 scan 이벤트가 발생한다', async () => {
    // Given
    const el = await fixture<PdaBarcodeInput>(html`
      <pda-barcode-input></pda-barcode-input>
    `)
    const input = el.shadowRoot?.querySelector('input') as HTMLInputElement

    // When
    setTimeout(() => {
      input.value = '1234567890123'
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    const { detail } = await oneEvent(el, 'barcode-scan')

    // Then
    expect(detail.barcode).to.equal('1234567890123')
  })

  it('짧은 바코드는 에러 메시지를 표시한다', async () => {
    // Given
    const el = await fixture<PdaBarcodeInput>(html`
      <pda-barcode-input min-length="10"></pda-barcode-input>
    `)
    const input = el.shadowRoot?.querySelector('input') as HTMLInputElement

    // When
    input.value = '12345'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    await el.updateComplete

    // Then
    const errorMsg = el.shadowRoot?.querySelector('.error-message')
    expect(errorMsg?.textContent).to.include('10자리 이상')
  })
})
```

### 4.3 비동기 상태 업데이트 테스트

**`packages/operato-wes/test/component/product-list.test.ts`**:

```typescript
import { fixture, html, expect, waitUntil } from '@open-wc/testing'
import sinon from 'sinon'
import { ProductList } from '../../client/pages/product-list'

describe('ProductList', () => {
  it('데이터를 로드하고 렌더링한다', async () => {
    // Given
    const mockProducts = [
      { id: 1, name: 'Product 1' },
      { id: 2, name: 'Product 2' }
    ]

    const fetchStub = sinon.stub(global, 'fetch').resolves({
      ok: true,
      json: async () => ({ items: mockProducts })
    } as Response)

    // When
    const el = await fixture<ProductList>(html`
      <product-list></product-list>
    `)

    // 데이터 로딩 완료까지 대기
    await waitUntil(() => el.products.length > 0, 'Products should load')

    // Then
    expect(el.products).to.have.lengthOf(2)
    expect(el.products[0].name).to.equal('Product 1')

    // Cleanup
    fetchStub.restore()
  })

  it('로딩 중에는 스피너를 표시한다', async () => {
    // Given
    const fetchStub = sinon.stub(global, 'fetch').returns(
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ items: [] })
      } as Response), 100))
    )

    // When
    const el = await fixture<ProductList>(html`
      <product-list></product-list>
    `)

    // Then
    const spinner = el.shadowRoot?.querySelector('.loading-spinner')
    expect(spinner).to.exist

    // Cleanup
    await waitUntil(() => !el.loading)
    fetchStub.restore()
  })
})
```

---

## 5. Redux 스토어 테스트

### 5.1 액션 크리에이터 테스트

**`packages/operato-wes/test/unit/actions.test.ts`**:

```typescript
import { setReceivingOrder, updatePickingStatus } from '../../client/actions/inbound-actions'

describe('Inbound Actions', () => {
  it('setReceivingOrder 액션을 생성한다', () => {
    // Given
    const order = { id: 'RO-001', status: 'START' }

    // When
    const action = setReceivingOrder(order)

    // Then
    expect(action).toEqual({
      type: 'SET_RECEIVING_ORDER',
      payload: order
    })
  })

  it('updatePickingStatus 액션을 생성한다', () => {
    // Given
    const orderId = 'PO-001'
    const status = 'PICKED'

    // When
    const action = updatePickingStatus(orderId, status)

    // Then
    expect(action).toEqual({
      type: 'UPDATE_PICKING_STATUS',
      payload: { orderId, status }
    })
  })
})
```

### 5.2 리듀서 테스트

**`packages/operato-wes/test/unit/reducers.test.ts`**:

```typescript
import { inboundReducer } from '../../client/reducers/inbound-reducer'
import { setReceivingOrder } from '../../client/actions/inbound-actions'

describe('Inbound Reducer', () => {
  it('초기 상태를 반환한다', () => {
    // When
    const state = inboundReducer(undefined, { type: '@@INIT' })

    // Then
    expect(state).toEqual({
      receivingOrder: null,
      pickingOrders: [],
      loading: false
    })
  })

  it('SET_RECEIVING_ORDER 액션을 처리한다', () => {
    // Given
    const initialState = { receivingOrder: null, pickingOrders: [], loading: false }
    const order = { id: 'RO-001', status: 'START' }
    const action = setReceivingOrder(order)

    // When
    const newState = inboundReducer(initialState, action)

    // Then
    expect(newState.receivingOrder).toEqual(order)
    expect(newState.pickingOrders).toEqual([]) // 다른 상태는 변경 없음
  })
})
```

---

## 6. API 모킹

### 6.1 fetch 모킹

```typescript
import sinon from 'sinon'

describe('API 호출 테스트', () => {
  let fetchStub: sinon.SinonStub

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch')
  })

  afterEach(() => {
    fetchStub.restore()
  })

  it('성공 응답을 처리한다', async () => {
    // Given
    const mockData = { id: 1, name: 'Test' }
    fetchStub.resolves({
      ok: true,
      status: 200,
      json: async () => mockData
    } as Response)

    // When
    const response = await fetch('/api/test')
    const data = await response.json()

    // Then
    expect(data).toEqual(mockData)
  })

  it('에러 응답을 처리한다', async () => {
    // Given
    fetchStub.resolves({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    } as Response)

    // When
    const response = await fetch('/api/test')

    // Then
    expect(response.ok).toBe(false)
    expect(response.status).toBe(404)
  })
})
```

### 6.2 GraphQL 모킹

```typescript
import { ApolloClient, InMemoryCache } from '@apollo/client'
import { MockedProvider } from '@apollo/client/testing'
import { GET_PRODUCTS_QUERY } from '../../client/queries/product-queries'

const mocks = [
  {
    request: {
      query: GET_PRODUCTS_QUERY,
      variables: { limit: 10 }
    },
    result: {
      data: {
        products: [
          { id: 1, name: 'Product 1' },
          { id: 2, name: 'Product 2' }
        ]
      }
    }
  }
]

it('GraphQL 쿼리를 실행하고 결과를 받는다', async () => {
  // Given
  const component = await fixture(html`
    <mocked-provider .mocks=${mocks}>
      <product-list></product-list>
    </mocked-provider>
  `)

  // When & Then
  await waitUntil(() => {
    const list = component.querySelector('product-list')
    return list?.products?.length === 2
  })
})
```

---

## 7. E2E 테스트 (Playwright)

### 7.1 Playwright 설정

**`playwright.config.ts`**:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './packages/operato-wes/test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5907',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'yarn wms:dev',
    url: 'http://localhost:5907',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
})
```

### 7.2 E2E 테스트 예시

**`packages/operato-wes/test/e2e/inbound-flow.spec.ts`**:

```typescript
import { test, expect } from '@playwright/test'

test.describe('입고 프로세스', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/login')
    await page.fill('input[name="username"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('입고 지시서 생성 및 시작', async ({ page }) => {
    // 입고 페이지 이동
    await page.goto('/inbound/receive-list')
    await expect(page.locator('h1')).toContainText('입고 관리')

    // 새 입고 지시서 생성
    await page.click('button:has-text("신규 생성")')
    await page.fill('input[name="supplierName"]', '공급업체A')
    await page.fill('input[name="expectedDate"]', '2026-03-15')
    await page.click('button:has-text("저장")')

    // 생성 확인
    await expect(page.locator('.success-message')).toContainText('입고 지시서가 생성되었습니다')

    // 입고 시작
    await page.click('button:has-text("입고 시작")')
    await expect(page.locator('.status-badge')).toContainText('진행중')
  })

  test('바코드 스캔으로 입고 처리', async ({ page }) => {
    // 입고 진행 페이지 이동
    await page.goto('/inbound/receive-detail/RO-001')

    // 바코드 입력
    await page.fill('input[name="barcode"]', '1234567890123')
    await page.press('input[name="barcode"]', 'Enter')

    // 수량 입력
    await page.fill('input[name="quantity"]', '100')
    await page.click('button:has-text("확인")')

    // 입고 완료 확인
    await expect(page.locator('.product-item')).toContainText('100')
  })
})
```

### 7.3 PDA 페이지 E2E 테스트

**`packages/operato-wes/test/e2e/pda-shipment.spec.ts`**:

```typescript
import { test, expect } from '@playwright/test'

test.describe('PDA 출고 프로세스', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // 모바일 크기

  test('바코드 스캔으로 출고 처리', async ({ page }) => {
    // PDA 출고 페이지
    await page.goto('/pda/pda-wms-shipment-barcode')

    // 주문 번호 스캔
    await page.fill('#barcode-input', 'SO-001')
    await page.press('#barcode-input', 'Enter')
    await page.waitForSelector('.order-detail')

    // 제품 바코드 스캔
    await page.fill('#barcode-input', '1234567890123')
    await page.press('#barcode-input', 'Enter')

    // 수량 확인
    const quantity = await page.locator('.picked-quantity').textContent()
    expect(quantity).toBe('1')

    // 출고 완료
    await page.click('button:has-text("출고 완료")')
    await expect(page.locator('.success-message')).toContainText('출고가 완료되었습니다')
  })
})
```

---

## 8. 모범 사례 (Best Practices)

### 8.1 테스트 명명 규칙

```typescript
// ✅ 좋은 예
describe('ValueUtil.formatCurrency', () => {
  it('숫자를 통화 형식으로 변환한다', () => { /* ... */ })
  it('null 값은 빈 문자열을 반환한다', () => { /* ... */ })
  it('음수는 괄호로 표시한다', () => { /* ... */ })
})

// ❌ 나쁜 예
describe('test', () => {
  it('works', () => { /* ... */ })
  it('test2', () => { /* ... */ })
})
```

### 8.2 Given-When-Then 패턴

```typescript
it('주문 수량에서 피킹 수량을 계산한다', () => {
  // Given - 테스트 준비
  const orderQty = 100
  const pickedQty = 30

  // When - 테스트 실행
  const remainingQty = OperatoUtil.calculatePickingQuantity(orderQty, pickedQty)

  // Then - 결과 검증
  expect(remainingQty).toBe(70)
})
```

### 8.3 테스트 독립성

```typescript
// ✅ 좋은 예 - 각 테스트가 독립적
describe('ProductList', () => {
  let productList: ProductList

  beforeEach(async () => {
    productList = await fixture(html`<product-list></product-list>`)
  })

  it('테스트 1', () => { /* productList 사용 */ })
  it('테스트 2', () => { /* productList 사용 */ })
})

// ❌ 나쁜 예 - 테스트 간 의존성
describe('ProductList', () => {
  const productList = await fixture(html`<product-list></product-list>`)

  it('제품을 추가한다', () => {
    productList.addProduct({ id: 1 })
    expect(productList.products.length).toBe(1)
  })

  it('제품을 삭제한다', () => {
    // 이전 테스트에 의존!
    productList.removeProduct(1)
    expect(productList.products.length).toBe(0)
  })
})
```

### 8.4 Magic Number 피하기

```typescript
// ✅ 좋은 예
it('재고 수량이 안전 재고보다 낮으면 경고를 표시한다', () => {
  const SAFETY_STOCK = 10
  const CURRENT_STOCK = 5

  const needsWarning = stockUtil.needsReplenishment(CURRENT_STOCK, SAFETY_STOCK)

  expect(needsWarning).toBe(true)
})

// ❌ 나쁜 예
it('재고 확인', () => {
  expect(stockUtil.needsReplenishment(5, 10)).toBe(true)
})
```

### 8.5 테스트 더블 (Test Double) 활용

```typescript
describe('ReceivingService', () => {
  it('API 호출 후 상태를 업데이트한다', async () => {
    // Spy - 실제 함수 호출 추적
    const updateStateSpy = sinon.spy(receivingService, 'updateState')

    // Stub - 특정 동작 강제
    const apiStub = sinon.stub(api, 'startReceiving').resolves({ success: true })

    // When
    await receivingService.start('RO-001')

    // Then
    expect(apiStub.calledOnce).toBe(true)
    expect(updateStateSpy.calledWith('START')).toBe(true)

    // Cleanup
    updateStateSpy.restore()
    apiStub.restore()
  })
})
```

---

## 9. 자주 발생하는 문제와 해결

### 9.1 Shadow DOM 접근 문제

**문제**: Shadow DOM 내부 요소를 찾을 수 없음

```typescript
// ❌ 실패
const button = el.querySelector('button') // null!

// ✅ 해결
const button = el.shadowRoot?.querySelector('button')
```

### 9.2 비동기 렌더링 타이밍

**문제**: 컴포넌트 업데이트 전에 검증 시도

```typescript
// ❌ 실패
el.value = 'new value'
expect(el.shadowRoot?.textContent).toBe('new value') // 아직 렌더링 안됨!

// ✅ 해결
el.value = 'new value'
await el.updateComplete // Lit 업데이트 완료 대기
expect(el.shadowRoot?.textContent).toBe('new value')
```

### 9.3 이벤트 리스너 테스트

**문제**: 커스텀 이벤트가 발생하지 않음

```typescript
// ❌ 실패
let eventFired = false
el.addEventListener('custom-event', () => { eventFired = true })
el.fireEvent() // 이벤트가 즉시 발생하지 않을 수 있음
expect(eventFired).toBe(true) // 실패!

// ✅ 해결 1: oneEvent 사용 (@open-wc/testing)
setTimeout(() => el.fireEvent())
const { detail } = await oneEvent(el, 'custom-event')
expect(detail.value).toBe('expected')

// ✅ 해결 2: Promise로 래핑
const eventPromise = new Promise(resolve => {
  el.addEventListener('custom-event', (e) => resolve(e.detail))
})
el.fireEvent()
const detail = await eventPromise
expect(detail.value).toBe('expected')
```

### 9.4 Redux Store 모킹

**문제**: @operato/shell의 store에 접근할 수 없음

```typescript
// ✅ 해결: Mock store 생성
import { createStore } from 'redux'

const mockStore = createStore((state = {}, action) => {
  switch (action.type) {
    case 'TEST_ACTION':
      return { ...state, test: action.payload }
    default:
      return state
  }
})

// 컴포넌트에 주입
class TestComponent extends connect(mockStore)(PageView) {
  // ...
}
```

### 9.5 모듈 import 에러

**문제**: `@operato-app/*` 모듈을 찾을 수 없음

```json
// jest.config.js에 moduleNameMapper 추가
{
  "moduleNameMapper": {
    "^@operato-app/metapage/dist-client$": "<rootDir>/packages/metapage/client",
    "^@operato-app/(.*)$": "<rootDir>/packages/$1/client"
  }
}
```

### 9.6 Things Factory 컴포넌트 테스트

**문제**: Things Factory 프레임워크의 특수한 라이프사이클

```typescript
// ✅ 해결: Things Factory 초기화 대기
import { fixture, html, waitUntil } from '@open-wc/testing'

it('Things Factory 컴포넌트를 테스트한다', async () => {
  const el = await fixture(html`<things-factory-component></things-factory-component>`)

  // Things Factory 초기화 완료 대기
  await waitUntil(() => el.initialized, 'Component should initialize')

  // 이제 테스트 가능
  expect(el.data).toBeDefined()
})
```

---

## 10. 참고 자료

### 공식 문서
- [Lit Testing Guide](https://lit.dev/docs/tools/testing/)
- [Open Web Components Testing](https://open-wc.org/docs/testing/testing-package/)
- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)

### 프로젝트 관련
- [backend-testing-guide.md](backend-testing-guide.md) - 백엔드 테스트 가이드
- [frontend-quality-checklist.md](frontend-quality-checklist.md) - 프론트엔드 품질 체크리스트
- [frontend-quality.md](frontend-quality.md) - 프론트엔드 코드 품질 분석

---

**작성자**: HatioLab 개발팀
**문서 버전**: 1.0.0
**최종 업데이트**: 2026-03-12
