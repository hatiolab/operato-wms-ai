# CJ대한통운 택배 연동

> 참조: CJ대한통운 택배 표준 API Developer Guide V3.9.4

## 개요

CJ대한통운 택배 표준 API를 통해 택배 예약 접수, 운송장 번호 생성, 배송 상태 조회 등을 연동한다.
모든 API 호출 전에 **1Day Token**을 먼저 발급받아야 한다.

## 연동 설정

CJ 연동 자격증명은 `courier_contracts` 테이블에 도메인별로 관리한다.

| 컬럼 | 내용 |
|------|------|
| `dlv_vend_cd` | `cj` |
| `contract_no` | CUST_ID (계약된 고객사 코드, 계약 식별자) |
| `contract_sub_no` | BIZ_REG_NUM (청구 사업자번호) |
| `api_key` | CJ-Gateway-APIKey |
| `api_base_url` | API Base URL (개발/운영 구분) |

## 환경 URL

| 환경 | Base URL |
|------|---------|
| 개발 | `https://dxapi-dev.cjlogistics.com:5054` |
| 운영 | `https://dxapi.cjlogistics.com:5052` |

## 문서 목록

| 문서 | 내용 |
|------|------|
| [1day-token.md](1day-token.md) | 1Day Token 발행 — API 스펙 및 구현 방안 |
| [address-refinement.md](address-refinement.md) | 주소정제 — 수신자 주소 검증 및 배송 권역 조회 |
| [waybill-number.md](waybill-number.md) | 운송장 번호 생성 — 대역 방식 및 API 채번 방식 |
| [booking.md](booking.md) | (일반) 예약 접수 — 포장 완료 후 배송 예약 등록 |
| [booking-cancel.md](booking-cancel.md) | (일반) 예약 취소 — 운송장 상태 기준 예약 취소 |
| [tracking.md](tracking.md) | 상품추적 — 운송장 기준 단건, 예약정보 기준 대량 조회 |
| [tracking-bulk-confirm.md](tracking-bulk-confirm.md) | 상품추적 수신여부 확정 — 대량 조회 후 수신 완료 알림 |

## 공통 헤더

```http
CJ-Gateway-APIKey: {TOKEN_NUM}   ← 1Day 토큰 발행 시에는 생략
Content-Type: application/json
Accept: application/json
```
