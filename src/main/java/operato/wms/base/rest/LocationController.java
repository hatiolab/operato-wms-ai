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
import operato.wms.base.entity.Location;
import operato.wms.base.entity.Zone;
import xyz.elidom.dev.service.ExcelTemplateService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.print.rest.PrintoutController;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;
import xyz.elidom.dbist.dml.Page;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/locations")
@ServiceDesc(description = "Location Service API")
public class LocationController extends AbstractRestService {
	/**
	 * 리포트 컨트롤러
	 */
	@Autowired
	private PrintoutController printoutCtrl;

	/**
	 * 엑셀 템플릿 서비스
	 */
	@Autowired
	private ExcelTemplateService excelTemplateService;

	@Override
	protected Class<?> entityClass() {
		return Location.class;
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

	@RequestMapping(value = "/zones", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search Zone List")
	public List<Zone> searchZoneList() {
		String zoneSql = "SELECT DISTINCT zone_cd FROM LOCATIONS WHERE DOMAIN_ID = :domainId AND (DEL_FLAG IS NULL OR DEL_FLAG = false) ORDER BY ZONE_CD ASC";
		return this.queryManager.selectListBySql(zoneSql, ValueUtil.newMap("domainId", Domain.currentDomainId()),
				Zone.class, 0, 0);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Find one by ID")
	public Location findOne(@PathVariable("id") String id) {
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
	public Location create(@RequestBody Location input) {
		return this.createOne(input);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public Location update(@PathVariable("id") String id, @RequestBody Location input) {
		return this.updateOne(input);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Delete")
	public void delete(@PathVariable("id") String id) {
		this.deleteOne(this.entityClass(), id);
	}

	@RequestMapping(value = "/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean multipleUpdate(@RequestBody List<Location> list) {
		return this.cudMultipleData(this.entityClass(), list);
	}

	/**
	 * 엑셀 템플릿(master.location) 임포트 — 행 단위 upsert.
	 * 검증·필드 매핑은 ExcelTemplateService.applyImportBody에 위임한다.
	 * loc_cd 기준으로 기존 레코드 조회 후 없으면 insert, 있으면 update.
	 *
	 * POST /rest/locations/import_one?template_id={id} 또는 ?template_name={name}
	 */
	@RequestMapping(value = "/import_one", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Import one Location row using ExcelTemplate column config (upsert by loc_cd)")
	public Location importOne(
			@RequestParam(name = "template_id", required = false) String templateId,
			@RequestParam(name = "template_name", required = false) String templateName,
			@RequestBody Map<String, Object> body) {

		Long domainId = Domain.currentDomainId();

		// 1. loc_cd 기준으로 기존 Location 조회 또는 신규 생성
		String locCd = ValueUtil.toString(body.get("loc_cd"));
		Location cond = new Location();
		cond.setDomainId(domainId);
		cond.setLocCd(locCd);
		Location location = this.queryManager.selectByCondition(Location.class, cond);
		if (location == null) {
			location = new Location();
			location.setDomainId(domainId);
			location.setDelFlag(false);
		}

		// 2. ExcelTemplate 기반 필수 검증 및 동적 필드 매핑
		this.excelTemplateService.applyImportBody(domainId, templateId, templateName, location, body);

		// 3. Insert or Update
		if (location.getId() == null) {
			this.queryManager.insert(location);
		} else {
			this.queryManager.update(location);
		}

		return location;
	}

	@RequestMapping(value = "/{id}/download_barcode", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Download Location Barcode")
	public void downloadLocationBarcode(
			HttpServletRequest req,
			HttpServletResponse res,
			@PathVariable("id") String id) {

		// 1. 조회
		Location location = this.queryManager.select(Location.class, id);

		// 2. 로케이션 바코드 생성을 위한 PDF 다운로드
		this.printoutCtrl.showPdfByPrintTemplateName(req, res, "SIMPLE_BARCODE",
				ValueUtil.newMap("barcode", location.getLocCd()));
	}
}