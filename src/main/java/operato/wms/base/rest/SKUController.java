package operato.wms.base.rest;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import operato.wms.base.entity.SKU;
import xyz.anythings.sys.service.ICustomService;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.dev.service.ExcelTemplateService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.print.rest.PrintoutController;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/sku")
@ServiceDesc(description = "SKU Service API")
public class SKUController extends AbstractRestService {
    /**
     * 리포트 컨트롤러
     */
    @Autowired
    private PrintoutController printoutCtrl;

    /**
     * 커스텀 서비스 - MultipleUpdate 전 처리
     */
    public static final String TRX_SKU_PRE_MULTIPLE_UPDATE = "diy-sku-pre-multiple-update";
    /**
     * 커스텀 서비스 - MultipleUpdate 후 처리
     */
    public static final String TRX_SKU_POST_MULTIPLE_UPDATE = "diy-sku-post-multiple-update";

    /**
     * 커스텀 서비스
     */
    @Autowired
    private ICustomService customSvc;

    /**
     * 엑셀 템플릿 서비스
     */
    @Autowired
    private ExcelTemplateService excelTemplateService;

    @Override
    protected Class<?> entityClass() {
        return SKU.class;
    }

    @RequestMapping(method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Search (Pagination) By Search Conditions")
    public Page<?> index(
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "limit", required = false) Integer limit,
            @RequestParam(name = "select", required = false) String select,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "query", required = false) String query) {
        return this.search(this.entityClass(), page, limit, select, sort, query);
    }

    @RequestMapping(value = "/{id}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Find one by ID")
    public SKU findOne(@PathVariable("id") String id) {
        return this.getOne(this.entityClass(), id);
    }

    @RequestMapping(value = "/{id}/exist", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Check exists By ID")
    public Boolean isExist(@PathVariable("id") String id) {
        return this.isExistOne(this.entityClass(), id);
    }

    @RequestMapping(method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @ApiDesc(description = "Create")
    public SKU create(@RequestBody SKU input) {
        return this.createOne(input);
    }

    @RequestMapping(value = "/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Update")
    public SKU update(@PathVariable("id") String id, @RequestBody SKU input) {
        return this.updateOne(input);
    }

    @RequestMapping(value = "/{id}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Delete")
    public void delete(@PathVariable("id") String id) {
        this.deleteOne(this.entityClass(), id);
    }

    @RequestMapping(value = "/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Create, Update or Delete multiple at one time")
    public Boolean multipleUpdate(@RequestBody List<SKU> list) {
        // 1. 전 처리 커스텀 서비스 호출
        Map<String, Object> custSvcParams = ValueUtil.newMap("domain_id,list", Domain.currentDomainId(), list);
        this.customSvc.doCustomService(Domain.currentDomainId(), TRX_SKU_PRE_MULTIPLE_UPDATE, custSvcParams);

        // 2. 업데이트
        this.cudMultipleData(this.entityClass(), list);

        // 3. 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(Domain.currentDomainId(), TRX_SKU_POST_MULTIPLE_UPDATE, custSvcParams);

        return true;
    }

    @RequestMapping(value = "/{id}/download_sku_code", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download SKU Code")
    public void downloadSKUCode(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id) {

        // 1. 조회
        SKU sku = this.queryManager.select(SKU.class, id);

        // 2. 로케이션 바코드 생성을 위한 PDF 다운로드
        this.printoutCtrl.showPdfByPrintTemplateName(req, res, "SIMPLE_BARCODE",
                ValueUtil.newMap("barcode", sku.getSkuCd()));
    }

    @RequestMapping(value = "/{id}/download_sku_barcode", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download SKU Barcode")
    public void downloadSKUBarcode(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id) {

        // 1. 조회
        SKU sku = this.queryManager.select(SKU.class, id);

        // 2. 로케이션 바코드 생성을 위한 PDF 다운로드
        this.printoutCtrl.showPdfByPrintTemplateName(req, res, "SIMPLE_BARCODE",
                ValueUtil.newMap("barcode", sku.getSkuBarcd()));
    }

    /**
     * 엑셀 템플릿(master.sku) 임포트 — 행 단위 upsert.
     * 검증·필드 매핑은 ExcelTemplateService.applyImportBody에 위임한다.
     * com_cd + sku_cd 조합으로 기존 레코드 조회 후 없으면 insert, 있으면 update.
     *
     * POST /rest/sku/import_one?template_id={id} 또는 ?template_name={name}
     */
    @RequestMapping(value = "/import_one", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Import one SKU row using ExcelTemplate column config (upsert by com_cd + sku_cd)")
    public SKU importOne(
            @RequestParam(name = "template_id", required = false) String templateId,
            @RequestParam(name = "template_name", required = false) String templateName,
            @RequestBody Map<String, Object> body) {

        Long domainId = Domain.currentDomainId();

        // 1. com_cd + sku_cd 기준으로 기존 SKU 조회 또는 신규 생성
        String comCd = ValueUtil.toString(body.get("com_cd"));
        String skuCd = ValueUtil.toString(body.get("sku_cd"));
        SKU sku = this.queryManager.selectByCondition(SKU.class, new SKU(domainId, comCd, skuCd));
        if (sku == null) {
            sku = new SKU();
            sku.setDomainId(domainId);
            sku.setDelFlag(false);
        }

        // 2. ExcelTemplate 기반 필수 검증 및 동적 필드 매핑
        this.excelTemplateService.applyImportBody(domainId, templateId, templateName, sku, body);

        // 3. Insert or Update
        if (sku.getId() == null) {
            this.queryManager.insert(sku);
        } else {
            this.queryManager.update(sku);
        }

        return sku;
    }
}