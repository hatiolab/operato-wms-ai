package operato.wms.parcel.service;

import java.util.List;
import java.util.Map;

import operato.wms.oms.entity.ShipmentDelivery;
import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.parcel.entity.CourierContract;

/**
 * 택배사 서비스 인터페이스
 *
 * CJ대한통운, 롯데택배, 한진택배 등 택배사별 구현체가 이 인터페이스를 구현한다.
 * CourierServiceDispatcher가 dlv_vend_cd 기준으로 적절한 구현체를 선택한다.
 *
 * 구현체 등록 방법:
 * - @Component를 붙이면 CourierServiceDispatcher가 자동으로 수집한다.
 * - getVendorCd() 반환값이 courier_contracts.dlv_vend_cd 값과 일치해야 한다.
 */
public interface CourierService {

    /**
     * 이 구현체가 담당하는 택배사 코드
     * courier_contracts.dlv_vend_cd 값과 일치해야 한다.
     * 예: "cj", "lotte", "hanjin"
     */
    String getVendorCd();

    /**
     * 도메인 ID 별 계약번호 리스트 조회
     * 
     * @param domainId
     * @return
     */
    List<CourierContract> getCourierContractList(Long domainId);

    /**
     * 택배사 별 택배 서비스에서 해당 택배사의 기본 택배 계약 리턴
     * 
     * @param domainId
     * @return
     */
    CourierContract getDefaultCourierContract(Long domainId);

    /**
     * 인증 토큰 강제 갱신
     *
     * 캐시에 저장된 토큰을 무효화하고 택배사 API에서 새 토큰을 발급받는다.
     * 정상 흐름에서는 자동 갱신되므로 직접 호출 불필요.
     * 토큰 만료 오류나 인증 실패 복구 시 사용한다.
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호
     * @return 새로 발급된 토큰
     */
    String refreshToken(Long domainId, String contractNo);

    /**
     * 계약 번호 별 인증 토큰 조회
     * 
     * @param domainId
     * @param contractNo
     * @return
     */
    String getToken(Long domainId, String contractNo);

    /**
     * 운송장 번호 발급
     *
     * 대역 방식(courier_contracts 설정)과 API 채번 방식 중 하나를 사용한다.
     * 포장 완료 직전 시점에만 호출해야 한다.
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호 (courier_contracts.contract_no)
     * @return 발급된 운송장 번호
     */
    String issueWaybillNo(Long domainId, String contractNo);

    /**
     * 주소 정제
     *
     * 입력 주소 문자열을 택배사 API에 조회하여 도착지 분류 코드, 배송 지점 등
     * 실제 배송에 필요한 정보로 변환한다.
     * readyShipment() 내부에서도 호출되므로 단독 호출 시에는 직접 사용한다.
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호
     * @param address    정제할 주소 문자열
     * @return 주소정제 결과 (분류 코드, 배송 지점명, 권역 구분 등)
     */
    CourierAddressResult refineAddress(Long domainId, String contractNo, String address);

    /**
     * 출고 준비 처리 - 주소 정제, 운송장 번호 발번
     *
     * @param domainId
     * @param contractNo
     * @param order
     */
    boolean readyShipment(Long domainId, String contractNo, ShipmentOrder order);

    /**
     * 배송 예약 접수
     *
     * 포장 완료 후 택배사에 집화 예약을 등록한다.
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호
     * @param shipmentNo WMS 출고 주문번호
     * @param request    예약 요청 데이터
     * @return 예약 결과 (운송장 번호 포함)
     */
    CourierBookingResult book(Long domainId, String contractNo, String shipmentNo, CourierBookingRequest request);

    /**
     * 배송 예약 취소
     *
     * 출고 취소 시 이미 접수된 택배 예약을 취소한다.
     * 운송장 스캔 완료 이후에는 취소가 불가할 수 있다.
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호
     * @param shipmentNo WMS 출고 주문번호
     */
    void cancelBooking(Long domainId, String contractNo, String shipmentNo);

    /**
     * 운송장 번호 기준 배송 현황 단건 조회
     *
     * 고객이 특정 주문 배송 현황을 즉시 확인할 때 사용한다.
     * 전체 이력 일괄 갱신에는 syncTrackingData() 사용 권장.
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호
     * @param invcNo     운송장 번호
     * @return 스캔 이력 목록 (최신순)
     */
    List<Map<String, Object>> trackByInvcNo(Long domainId, String contractNo, String invcNo);

    /**
     * 일자별 배송 추적 데이터 동기화 (스케줄러용)
     *
     * 미전송 추적 이벤트를 전량 수신하고 shipment_orders 상태를 갱신한다.
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호
     * @param reqDt      조회 일자 (YYYYMMDD)
     */
    void syncTrackingData(Long domainId, String contractNo, String reqDt);
}
