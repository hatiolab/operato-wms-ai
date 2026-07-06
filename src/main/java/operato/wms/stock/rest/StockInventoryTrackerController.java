package operato.wms.stock.rest;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.stock.entity.Inventory;
import operato.wms.stock.service.StockInventoryTrackerService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.system.service.AbstractRestService;

/**
 * 재고 이동 이력 추적 컨트롤러
 *
 * 상품별 재고현황 → 바코드별 재고 리스트 → 이동 이력 3단계 조회 API를 제공한다.
 * Base URL: /rest/inventory-tracker
 *
 * @author HatioLab
 */
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/inventory-tracker")
@ServiceDesc(description = "재고 이동 이력 추적 API")
public class StockInventoryTrackerController extends AbstractRestService {

    /**
     * 재고 이동 이력 추적 서비스
     */
    @Autowired
    private StockInventoryTrackerService trackerSvc;

    @Override
    protected Class<?> entityClass() {
        return Inventory.class;
    }

    /**
     * 상품별 재고현황 조회
     *
     * GET /rest/inventory-tracker/stock-summary
     *
     * @param comCd 화주사 코드 (optional)
     * @param skuCd 상품 코드 (optional, 부분 일치)
     * @param skuNm 상품명 (optional, 부분 일치)
     * @return 상품별 재고현황 목록
     */
    @RequestMapping(value = "/stock-summary", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "상품별 재고현황 조회")
    public List<Map<String, Object>> getStockSummary(
            @RequestParam(name = "com_cd", required = false) String comCd,
            @RequestParam(name = "sku_cd", required = false) String skuCd,
            @RequestParam(name = "sku_nm", required = false) String skuNm) {
        return this.trackerSvc.getStockSummary(comCd, skuCd, skuNm);
    }

    /**
     * 바코드별 재고 리스트 조회
     *
     * GET /rest/inventory-tracker/inventory-list
     *
     * @param comCd 화주사 코드
     * @param skuCd 상품 코드
     * @return 바코드별 재고 목록
     */
    @RequestMapping(value = "/inventory-list", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "바코드별 재고 리스트 조회")
    public List<Map<String, Object>> getInventoryList(
            @RequestParam(name = "com_cd") String comCd,
            @RequestParam(name = "sku_cd") String skuCd) {
        return this.trackerSvc.getInventoryList(comCd, skuCd);
    }

    /**
     * 재고 이동 이력 조회
     *
     * GET /rest/inventory-tracker/move-history
     *
     * @param barcode 재고 바코드
     * @return 이동 이력 목록 (최근 200건)
     */
    @RequestMapping(value = "/move-history", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "재고 이동 이력 조회")
    public List<Map<String, Object>> getMoveHistory(
            @RequestParam(name = "barcode") String barcode) {
        return this.trackerSvc.getMoveHistory(barcode);
    }
}
