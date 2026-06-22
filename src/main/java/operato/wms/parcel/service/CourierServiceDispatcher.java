package operato.wms.parcel.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import xyz.elidom.exception.server.ElidomRuntimeException;

/**
 * 택배사 서비스 디스패처
 *
 * dlv_vend_cd 값을 기준으로 적절한 CourierService 구현체를 반환한다.
 * 
 * @Component가 붙은 모든 CourierService 구현체를 Spring이 자동으로 수집하므로,
 *             새 택배사 구현체를 추가할 때 이 클래스를 수정할 필요가 없다.
 *
 *             사용 예시:
 * 
 *             <pre>
 *   courierServiceDispatcher.get("cj").issueWaybillNo(domainId, contractNo);
 *   courierServiceDispatcher.get(packingOrder.getCarrierCd()).book(...);
 *             </pre>
 */
@Component
public class CourierServiceDispatcher {

    private final Map<String, CourierService> serviceMap;

    @Autowired
    public CourierServiceDispatcher(List<CourierService> services) {
        this.serviceMap = services.stream()
                .collect(Collectors.toMap(CourierService::getVendorCd, s -> s));
    }

    /**
     * 택배사 코드로 서비스 구현체 조회
     *
     * @param vendorCd courier_contracts.dlv_vend_cd 값 (예: "cj", "lotte", "hanjin")
     * @return 해당 택배사 CourierService 구현체
     * @throws ElidomRuntimeException 등록되지 않은 택배사 코드인 경우
     */
    public CourierService get(String vendorCd) {
        if (vendorCd == null || vendorCd.isBlank()) {
            throw new ElidomRuntimeException("택배사 코드(dlv_vend_cd)가 비어있습니다");
        }
        CourierService service = serviceMap.get(vendorCd.toLowerCase());
        if (service == null) {
            throw new ElidomRuntimeException(
                    "지원하지 않는 택배사: " + vendorCd + " (등록된 택배사: " + serviceMap.keySet() + ")");
        }
        return service;
    }

    /**
     * 등록된 모든 택배사 코드 목록 반환
     */
    public java.util.Set<String> getSupportedVendors() {
        return serviceMap.keySet();
    }
}
