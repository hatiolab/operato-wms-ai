package operato.wms.parcel.service.cj;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import operato.wms.oms.entity.ShipmentDelivery;
import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.parcel.entity.CourierContract;
import operato.wms.parcel.service.CourierAddressResult;
import operato.wms.parcel.service.CourierBookingRequest;
import operato.wms.parcel.service.CourierBookingResult;
import operato.wms.parcel.service.CourierService;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.ValueUtil;

/**
 * CJ대한통운 CourierService 구현체
 *
 * 기존 CJ 개별 서비스(CjBookingService, CjBookingCancelService,
 * CjWaybillService, CjTrackingService)에 위임하는 통합 어댑터다.
 *
 * CourierServiceDispatcher가 vendorCd="cj"로 이 구현체를 선택한다.
 * courier_contracts.dlv_vend_cd = 'cj' 와 일치해야 한다.
 */
@Component
public class CjCourierService implements CourierService {

    /**
     * CJ API 인증 토큰 서비스
     */
    @Autowired
    private CjTokenService cjTokenService;

    /**
     * 운송장 번호 발번 서비스
     */
    @Autowired
    private CjWaybillService cjWaybillService;

    /**
     * 운송장 접수 서비스
     */
    @Autowired
    private CjBookingService cjBookingService;

    /**
     * 운송장 접수 취소 서비스
     */
    @Autowired
    private CjBookingCancelService cjBookingCancelService;

    /**
     * 운송장 추적 서비스
     */
    @Autowired
    private CjTrackingService cjTrackingService;

    /**
     * 주소정제 서비스
     */
    @Autowired
    private CjAddressService cjAddressService;

    /**
     * 쿼리 매니저
     */
    @Autowired
    private IQueryManager queryManager;

    /**
     * 도메인 별 택배 계약 리스트
     */
    private Map<Long, List<CourierContract>> contractsByDomain = new HashMap<Long, List<CourierContract>>();

    @Override
    public String getVendorCd() {
        return "cj";
    }

    @Override
    public String refreshToken(Long domainId, String contractNo) {
        String newToken = cjTokenService.refreshToken(domainId, contractNo);
        List<CourierContract> contracts = this.getCourierContractList(domainId);

        for (CourierContract contract : contracts) {
            if (contractNo.equalsIgnoreCase(contract.getContractNo())) {
                if (contract.getApiKey() == null || !contractNo.equalsIgnoreCase(contract.getApiKey())) {
                    contract.setApiKey(newToken);
                    this.queryManager.update(contract, "apiKey", "updatedAt");
                    break;
                }
            }
        }

        return newToken;
    }

    @Override
    public String getToken(Long domainId, String contractNo) {
        return cjTokenService.getToken(domainId, contractNo);
    }

    @Override
    public List<CourierContract> getCourierContractList(Long domainId) {
        List<CourierContract> contracts = this.contractsByDomain.get(domainId);

        if (ValueUtil.isEmpty(contracts)) {
            contracts = this.queryManager.selectList(CourierContract.class, ValueUtil.newMap("domainId", domainId));
            this.contractsByDomain.put(domainId, contracts);
        }

        return contracts;
    }

    @Override
    public CourierContract getDefaultCourierContract(Long domainId) {
        List<CourierContract> contracts = this.getCourierContractList(domainId);
        if (ValueUtil.isEmpty(contracts)) {
            return null;
        } else {
            CourierContract defaultContract = null;
            for (CourierContract contract : contracts) {
                if (ValueUtil.toBoolean(contract.getDefaultFlag())) {
                    defaultContract = contract;
                    break;
                }
            }
            return defaultContract;
        }
    }

    @Override
    public CourierAddressResult refineAddress(Long domainId, String contractNo, String address) {
        // CjAddressResult cjResult = this.cjAddressService.refineAddress(domainId,
        // contractNo, address);
        // return toCourierAddressResult(cjResult);
        return null;
    }

    @Override
    public String issueWaybillNo(Long domainId, String contractNo) {
        // return cjWaybillService.issueWaybillNo(domainId, contractNo);
        return null;
    }

    @Override
    public CourierBookingResult book(Long domainId, String contractNo, String shipmentNo,
            CourierBookingRequest request) {
        // CjBookingRequest cjRequest = toCjBookingRequest(request);
        // CjBookingResult cjResult = cjBookingService.book(domainId, contractNo,
        // shipmentNo, cjRequest);
        // return new CourierBookingResult(cjResult.getShipmentNo(),
        // cjResult.getInvcNo());
        return null;
    }

    @Override
    public void cancelBooking(Long domainId, String contractNo, String shipmentNo) {
        cjBookingCancelService.cancel(domainId, contractNo, shipmentNo);
    }

    @Override
    public List<Map<String, Object>> trackByInvcNo(Long domainId, String contractNo, String invcNo) {
        return cjTrackingService.trackByInvcNo(domainId, contractNo, invcNo);
    }

    @Override
    public void syncTrackingData(Long domainId, String contractNo, String reqDt) {
        cjTrackingService.syncTrackingData(domainId, contractNo, reqDt);
    }

    /**
     * 공통 요청 VO를 CJ 전용 요청 VO로 변환
     */
    private CjBookingRequest toCjBookingRequest(CourierBookingRequest src) {
        if (src == null) {
            return null;
        }

        CjBookingRequest dest = new CjBookingRequest();
        dest.setFrtDvCd(src.getFrtDvCd());
        dest.setBoxTypeCd(src.getBoxTypeCd());
        dest.setBoxQty(src.getBoxQty());
        dest.setArticleAmt(src.getArticleAmt());
        dest.setRemark1(src.getRemark1());
        dest.setInvcNo(src.getInvcNo());

        dest.setSenderName(src.getSenderName());
        dest.setSenderTel(src.getSenderTel());
        dest.setSenderMobile(src.getSenderMobile());
        dest.setSenderZip(src.getSenderZip());
        dest.setSenderAddr(src.getSenderAddr());
        dest.setSenderDetailAddr(src.getSenderDetailAddr());

        dest.setReceiverName(src.getReceiverName());
        dest.setReceiverTel(src.getReceiverTel());
        dest.setReceiverMobile(src.getReceiverMobile());
        dest.setReceiverZip(src.getReceiverZip());
        dest.setReceiverAddr(src.getReceiverAddr());
        dest.setReceiverDetailAddr(src.getReceiverDetailAddr());

        if (src.getGoods() != null) {
            List<CjBookingRequest.Goods> cjGoods = new ArrayList<>();
            for (CourierBookingRequest.Goods g : src.getGoods()) {
                CjBookingRequest.Goods cjG = new CjBookingRequest.Goods();
                cjG.setGoodsCd(g.getGoodsCd());
                cjG.setGoodsNm(g.getGoodsNm());
                cjG.setGoodsQty(g.getGoodsQty());
                cjG.setUnitCd(g.getUnitCd());
                cjG.setGoodsAmt(g.getGoodsAmt());
                cjGoods.add(cjG);
            }
            dest.setGoods(cjGoods);
        }

        return dest;
    }

    /**
     * CJ 주소정제 결과를 공통 VO로 변환
     */
    private CourierAddressResult toCourierAddressResult(CjAddressResult src) {
        if (src == null) {
            return null;
        }

        CourierAddressResult dest = new CourierAddressResult();
        dest.setClassificationCd(src.getClsfCd());
        dest.setSubClassificationCd(src.getSubClsfCd());
        dest.setClassificationAddr(src.getClsfAddr());
        dest.setDeliveryBranchNm(src.getDeliveryBranchNm());
        dest.setDeliveryClassNm(src.getSmClassNm());
        dest.setDeliverySmNm(src.getDeliverySmNm());
        dest.setRspsDivision(src.getRspsDivision());
        dest.setP2pCd(src.getP2pCd());
        return dest;
    }

    @Override
    public boolean readyShipment(Long domainId, String contractNo, ShipmentOrder order) {
        /*
         * ShipmentDelivery delivery =
         * this.queryManager.selectByCondition(ShipmentDelivery.class,
         * ValueUtil.newMap("domainId,shipmentNo", domainId, order.getShipmentNo()));
         * boolean isSuccess = true;
         * 
         * if (delivery != null && ValueUtil.isNotEmpty(delivery.getReceiverAddr())) {
         * try {
         * CourierAddressResult addrResult = this.refineAddress(domainId, contractNo,
         * delivery.getReceiverAddr() + " " + delivery.getReceiverAddr2());
         * if (addrResult != null) {
         * // 1. 도착지 코드
         * delivery.setDlvRegionCd(addrResult.getClassificationCd());
         * // 2. 도착지 서브 코드
         * delivery.setDlvRegionSubCd(addrResult.getSubClassificationCd());
         * // 3. 배송지점명
         * delivery.setDlvStoreNm(addrResult.getDeliveryBranchNm());
         * // 4. 배송기사명
         * delivery.setDlvEmpCd(addrResult.getDeliverySmNm());
         * // 5. 배송기사 직급
         * delivery.setDlvEmpNm(addrResult.getDeliveryClassNm());
         * // 6. 도착지 약칭주소
         * delivery.setRemarks(addrResult.getClassificationAddr());
         * // 7. 권역 구분
         * delivery.setAttr01(addrResult.getRspsDivision());
         * // 8. P2P 코드
         * delivery.setAttr02(addrResult.getP2pCd());
         * 
         * // 송장 번호 채번
         * String invcNo = this.issueWaybillNo(domainId, contractNo);
         * order.setInvoiceNo(invcNo);
         * delivery.setAttr05(invcNo);
         * 
         * // 출고 주문, 출고 배송 정보 업데이트
         * this.queryManager.update(order, "invoiceNo");
         * this.queryManager.update(delivery, "dlvRegionCd", "dlvRegionSubCd",
         * "dlvStoreNm", "dlvEmpCd",
         * "dlvEmpNm", "remarks", "attr01", "attr02", "attr05", "updatedAt",
         * "updaterId");
         * isSuccess = true;
         * } else {
         * isSuccess = false;
         * }
         * } catch (Throwable t) {
         * isSuccess = false;
         * // TODO 실패 원인을 기록 ...
         * throw t;
         * }
         * }
         * 
         * return isSuccess;
         */

        return true;
    }
}
