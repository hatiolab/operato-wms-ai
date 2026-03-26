# 풀필먼트 센터 WMS 출고 모듈 — 갭 분석

## 문서 정보
- **작성일**: 2026-03-25
- **목적**: 현재 출고 모듈 엔티티를 풀필먼트 센터 WMS 관점에서 분석하여 부족한 엔티티/필드 도출
- **참조**: Oracle WMS Cloud, SAP EWM, Microsoft Dynamics 365 WMS, Manhattan WMS

---

## 1. 현재 보유 엔티티 (11개)

### 실테이블 (8개)

| 엔티티 | 테이블 | 역할 | 상태 |
|--------|--------|------|------|
| `Wave` | `waves` | 웨이브 배치 (다수 주문을 그룹핑) | 완비 |
| `ReleaseOrder` | `release_orders` | 출고 지시 헤더 | 완비 |
| `ReleaseOrderItem` | `release_order_items` | 출고 지시 상세 (SKU/수량) | 완비 |
| `PickingOrder` | `picking_orders` | 피킹 지시 헤더 | 완비 |
| `PickingOrderItem` | `picking_order_items` | 피킹 지시 상세 (로케이션/바코드) | 완비 |
| `SupplyOrder` | `supply_orders` | 보충 지시 헤더 | 완비 |
| `SupplyOrderItem` | `supply_order_items` | 보충 지시 상세 | 완비 |
| `DeliveryInfo` | `delivery_infos` | 배송 정보 (발송인/수취인/택배사) | 보완 필요 |

### 뷰/임포트 모델 (3개)

| 엔티티 | 테이블 | 역할 |
|--------|--------|------|
| `ImportReleaseOrder` | `import_release_orders` (DDL 무시) | 주문 임포트 스테이징 |
| `OutboundOrder` | `outbound_orders` (DDL 무시) | 헤더+상세 복합 조회 뷰 |
| `ReleaseOrderStatus` | `release_order_status` (DDL 무시) | 출고 상태 조회 뷰 |

### 관련 기준정보 (base 모듈)

| 엔티티 | 테이블 | 역할 |
|--------|--------|------|
| `BoxType` | `box_types` | 박스 유형 마스터 (코드/치수/부피) |
| `CourierContract` | `courier_contracts` | 택배사 계약 정보 (대역폭 관리) |
| `Zone` | `zones` | 존 마스터 |
| `Location` | `locations` | 로케이션 마스터 |

---

## 2. 출고 프로세스 커버리지 현황

```
주문접수 → 주문확인 → 재고할당 → 웨이브 → 보충 → 피킹 → [검수] → [패킹] → [라벨] → [분류] → [적재] → 출고확정
   ✅         ✅         ⚠️        ✅      ✅      ✅      ❌       ❌      ❌      ❌      ❌       ✅
```

| 기호 | 의미 |
|------|------|
| ✅ | 엔티티 존재, 기능 구현 완료 |
| ⚠️ | 로직은 존재하나 기록용 엔티티 없음 |
| ❌ | 엔티티 없음 |

**핵심 갭**: 피킹 완료 후 → 출고 확정 사이의 **패킹/검수/라벨/분류/적재** 5단계에 대한 엔티티가 전무합니다. 현재는 `outbound-inspection.js` 화면에서 UI 레벨로만 처리하고 있어, 데이터 추적성(traceability)과 작업 이력 관리가 어렵습니다.

---

## 3. 부족한 엔티티 — 우선순위별

### 3.1. HIGH — B2C 풀필먼트 핵심 프로세스 누락

#### PackingOrder (패킹 작업 지시)

| 항목 | 내용 |
|------|------|
| **테이블** | `packing_orders` |
| **설명** | 패킹 작업 지시 헤더. 피킹 완료 후 패킹 스테이션에서 수행하는 작업 단위 |
| **부족 이유** | 현재 피킹→출고 사이에 패킹 단계가 엔티티로 없음. `ReleaseOrder`의 `boxId/boxType/boxWt` 필드만으로는 다건 박스, 패커 배정, 패킹 스테이션 관리 불가 |
| **주요 필드** | `packOrderNo`, `releaseOrderId`, `pickingOrderId`, `waveNo`, `packStationCd`, `packerId`, `status` (WAIT/RUN/END), `planSku`, `planPcs`, `resultPcs`, `startedAt`, `finishedAt` |
| **연관** | `ReleaseOrder` (1:1), `PickingOrder` (N:1), `PackingOrderItem` (1:N) |

#### PackingOrderItem (패킹 상세)

| 항목 | 내용 |
|------|------|
| **테이블** | `packing_order_items` |
| **설명** | 패킹 작업 상세. SKU별로 어떤 박스에 몇 개 넣었는지 기록 |
| **부족 이유** | 어떤 SKU가 어떤 박스에 들어갔는지 추적 불가 |
| **주요 필드** | `packingOrderId`, `packingBoxId`, `skuCd`, `skuNm`, `barcode`, `orderQty`, `packQty`, `lotNo`, `serialNo`, `status` |

#### PackingBox (개별 박스 / OBLPN)

| 항목 | 내용 |
|------|------|
| **테이블** | `packing_boxes` |
| **설명** | 개별 포장 박스 기록. OBLPN(Outbound License Plate Number) 개념 |
| **부족 이유** | 1주문 다박스 출고 시 각 박스별 중량/사이즈/바코드/씰 상태 관리 필요. 현재는 `ReleaseOrder.totalBox` 숫자만 존재 |
| **주요 필드** | `packingBoxNo` (박스 바코드), `packingOrderId`, `releaseOrderId`, `boxTypeCd`, `boxSeq`, `boxWt` (실측 중량), `boxStatus` (OPEN/SEALED/LABELED), `sealedAt`, `labeledAt` |
| **연관** | `PackingOrder` (N:1), `PackingBoxItem` (1:N), `ShippingLabel` (1:1) |

#### PackingBoxItem (박스별 내용물)

| 항목 | 내용 |
|------|------|
| **테이블** | `packing_box_items` |
| **설명** | 각 박스에 실제로 담긴 SKU/수량 |
| **부족 이유** | 통관 신고, 고객 문의 대응, 부분 반품 시 박스별 내용물 추적 필수 |
| **주요 필드** | `packingBoxId`, `skuCd`, `skuNm`, `barcode`, `qty`, `lotNo`, `serialNo`, `expiredDate` |

#### OutboundInspection (출고 검수 기록)

| 항목 | 내용 |
|------|------|
| **테이블** | `outbound_inspections` |
| **설명** | 출고 검수 결과 기록. 검수자, 검수 시간, 합격/불합격, 불량 사유 |
| **부족 이유** | `Wave.inspFlag`로 검수 여부 표시는 되지만, 실제 검수 결과를 저장하는 엔티티가 없음. 3PL SLA에서 검수 기록은 분쟁 해결의 핵심 증거 |
| **주요 필드** | `inspectionNo`, `releaseOrderId`, `packingBoxId`, `inspectorId`, `inspType` (FULL/SAMPLE), `inspDate`, `result` (PASS/FAIL/PARTIAL), `defectCount`, `defectReason`, `photoUrl`, `remarks` |
| **연관** | `ReleaseOrder` (N:1), `PackingBox` (N:1) |

#### ShippingLabel (운송장 라벨)

| 항목 | 내용 |
|------|------|
| **테이블** | `shipping_labels` |
| **설명** | 개별 운송장 라벨 레코드. 라벨 라이프사이클 관리 |
| **부족 이유** | `DeliveryInfo.invoiceNo`는 단순 번호 필드. 라벨 생성/인쇄/폐기 라이프사이클, 라벨 데이터(ZPL/PDF), 인쇄 횟수 추적 불가 |
| **주요 필드** | `labelNo`, `packingBoxId`, `deliveryInfoId`, `carrierCd`, `invoiceNo`, `labelFormat` (ZPL/PDF/PNG), `labelData` (BLOB/URL), `labelStatus` (CREATED/PRINTED/VOIDED), `printCount`, `createdAt`, `printedAt`, `voidedAt` |
| **연관** | `PackingBox` (1:1), `DeliveryInfo` (N:1) |

---

### 3.2. MEDIUM-HIGH — B2B 및 대량 운영 시 필수

#### OutboundLoad (출고 적재 / 차량 배정)

| 항목 | 내용 |
|------|------|
| **테이블** | `outbound_loads` |
| **설명** | 여러 주문/박스를 하나의 차량에 묶는 적재 그룹 |
| **부족 이유** | `DeliveryInfo.vehicleNo`만으로는 적재 계획/도크 배정/출발 시간 관리 불가. B2B/LTL 출고에서 필수 |
| **주요 필드** | `loadNo`, `vehicleNo`, `carrierCd`, `dockDoorCd`, `loadStatus` (OPEN/LOADING/LOADED/DEPARTED), `plannedDepartAt`, `actualDepartAt`, `totalWeight`, `totalVolume`, `sealNo`, `driverNm`, `driverPhone` |

#### OutboundLoadItem (적재 상세)

| 항목 | 내용 |
|------|------|
| **테이블** | `outbound_load_items` |
| **설명** | 적재 단위별 상세 (주문/박스/팔렛) |
| **주요 필드** | `outboundLoadId`, `releaseOrderId`, `packingBoxId`, `palletCd`, `loadSeq`, `loadPosition` |

#### ShippingManifest (택배사 집하 매니페스트)

| 항목 | 내용 |
|------|------|
| **테이블** | `shipping_manifests` |
| **설명** | 일마감/택배사 인수인계 시 다수 운송장을 묶는 매니페스트 |
| **부족 이유** | 택배사별 일마감 처리, 집하 수량 확인, 인수증 관리가 불가 |
| **주요 필드** | `manifestNo`, `carrierCd`, `manifestDate`, `manifestStatus` (OPEN/CLOSED/HANDED_OVER), `totalParcelCount`, `totalWeight`, `closedAt`, `handedOverAt`, `handedOverTo` |

---

### 3.3. MEDIUM — 운영 효율 향상

#### StockAllocation (재고 할당 기록)

| 항목 | 내용 |
|------|------|
| **테이블** | `stock_allocations` |
| **설명** | 출고 지시와 특정 재고 간의 할당 기록 |
| **부족 이유** | 출고 지시→피킹 지시 사이에 명시적 할당 기록 없음. SOFT/HARD 할당 구분, 할당 타임아웃 관리 필요. 현재는 피킹 지시 생성으로 바로 점프 |
| **주요 필드** | `releaseOrderItemId`, `inventoryId`, `allocationType` (SOFT/HARD), `allocQty`, `allocatedAt`, `expiredAt`, `status` |

#### SortationOrder (분류 작업 지시)

| 항목 | 내용 |
|------|------|
| **테이블** | `sortation_orders` |
| **설명** | 패킹 후 택배사/권역별 분류 작업 |
| **부족 이유** | 대량 B2C 출고 시 분류 관리 엔티티 없음. 분류 스테이션/슈트 배정, 분류 결과 추적 불가 |
| **주요 필드** | `sortOrderNo`, `waveNo`, `sortType` (CARRIER/ZONE/ROUTE), `sortStationCd`, `status`, `totalCount`, `sortedCount` |

#### DockDoor (도크/문 마스터)

| 항목 | 내용 |
|------|------|
| **테이블** | `dock_doors` |
| **설명** | 물리적 도크 문 마스터 (base 모듈 후보) |
| **부족 이유** | `Location`으로 대체 가능하나, 도크 특화 속성(방향, 차량 규격, 스케줄링) 관리 불가 |
| **주요 필드** | `dockDoorCd`, `dockDoorNm`, `dockType` (INBOUND/OUTBOUND/BOTH), `zoneCd`, `status` (AVAILABLE/IN_USE/MAINTENANCE) |

---

### 3.4. LOW — 보고/분석 및 고급 기능

| 엔티티 | 테이블 | 설명 |
|--------|--------|------|
| `CarrierApiLog` | `carrier_api_logs` | 택배사 API 연동 로그 (요청/응답/에러) |
| `OutboundException` | `outbound_exceptions` | 부족출고/파손/오출고 등 예외 기록 |
| `OutboundKpi` | `outbound_kpis` | 일별/시프트별 출고 KPI 집계 |
| `OutboundSla` | `outbound_slas` | 고객별 SLA 정의 (정확도/납기) |
| `OutboundSlaResult` | `outbound_sla_results` | SLA 달성률 추적 |

---

## 4. 기존 엔티티 필드 보완 사항

### ReleaseOrder — 출고 지시

| 추가 필드 | 타입 | 설명 |
|----------|------|------|
| `priorityCd` | String(10) | 출고 우선순위 (URGENT/NORMAL/LOW) |
| `cutoffTime` | String(5) | 출고 마감 시간 (예: "14:00" — 당일출고 SLA) |
| `channelCd` | String(20) | 판매 채널 (COUPANG/NAVER/OWN_MALL 등) |
| `packStationCd` | String(30) | 배정된 패킹 스테이션 |

### ReleaseOrderItem — 출고 지시 상세

| 추가 필드 | 타입 | 설명 |
|----------|------|------|
| `shortQty` | Double | 부족 수량 (부분출고 시) |
| `cancelQty` | Double | 취소 수량 |

### PickingOrder — 피킹 지시

| 추가 필드 | 타입 | 설명 |
|----------|------|------|
| `pickerId` | String(40) | 배정된 피커 ID |
| `pickZoneCd` | String(30) | 피킹 존 배정 |
| `pickCartId` | String(30) | 피킹 카트 ID |

### PickingOrderItem — 피킹 지시 상세

| 추가 필드 | 타입 | 설명 |
|----------|------|------|
| `substituteFlag` | Boolean | 대체품 여부 |

### DeliveryInfo — 배송 정보

| 추가 필드 | 타입 | 설명 |
|----------|------|------|
| `labelStatus` | String(10) | 라벨 상태 (NONE/CREATED/PRINTED/VOIDED) |
| `carrierServiceType` | String(20) | 서비스 유형 (NEXT_DAY/SAME_DAY/DAWN 등) |
| `shippingFee` | Double | 배송비 |

### Wave — 웨이브

| 추가 필드 | 타입 | 설명 |
|----------|------|------|
| `pickType` | String(20) | 피킹 유형 (INDIVIDUAL/TOTAL/ZONE) |
| `assignedPickerCount` | Integer | 투입 작업자 수 |

### BoxType — 박스 유형 (base 모듈)

| 추가 필드 | 타입 | 설명 |
|----------|------|------|
| `boxWt` | Float | 빈 박스 중량 (현재 치수만 있고 중량 없음) |

---

## 5. 우선 구현 권장 순서

### Phase 1 — 패킹/검수 (B2C 핵심)

```
PackingOrder → PackingOrderItem → PackingBox → PackingBoxItem → OutboundInspection
```

- 피킹 완료 후 패킹 스테이션에서의 작업 흐름 데이터화
- 박스별 내용물 추적으로 3PL 고객 대응력 확보
- 검수 기록으로 SLA 증빙 가능

### Phase 2 — 라벨/매니페스트 (택배 연동)

```
ShippingLabel → ShippingManifest
```

- 운송장 라이프사이클 관리
- 택배사별 일마감 처리 자동화

### Phase 3 — 적재/분류 (B2B 및 대량 운영)

```
OutboundLoad → OutboundLoadItem → SortationOrder
```

- B2B 차량 적재 관리
- 대량 출고 시 분류 자동화

### Phase 4 — 할당/예외/KPI (운영 고도화)

```
StockAllocation → OutboundException → CarrierApiLog → OutboundKpi
```

- 재고 할당 추적성 확보
- 예외 관리 체계화
- 운영 성과 측정

---

## 6. 참고 자료

| 출처 | 내용 |
|------|------|
| Oracle WMS Cloud | Parcel manifest, OBLPN, pack-and-hold 프로세스 |
| SAP EWM | Outbound delivery processing, wave management, dock scheduling |
| Microsoft Dynamics 365 | Outbound sorting, packing containers, load handling |
| Manhattan WMS | Allocation lifecycle, carrier integration, labor management |
| Korber Supply Chain | Packing-sorting-dispatching-shipping 프로세스 |

---

## 7. 현재 vs 목표 엔티티 수

| 구분 | 수량 |
|------|------|
| 현재 실테이블 | 8개 |
| HIGH 추가 | +6개 (패킹 4 + 검수 1 + 라벨 1) |
| MEDIUM-HIGH 추가 | +3개 (적재 2 + 매니페스트 1) |
| MEDIUM 추가 | +3개 (할당 1 + 분류 1 + 도크 1) |
| LOW 추가 | +5개 (로그 1 + 예외 1 + KPI 3) |
| **목표 실테이블** | **최대 25개** |
| **Phase 1-2 후** | **16개** (현재 8 + HIGH 6 + 매니페스트/적재 추가) |
