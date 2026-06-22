package operato.wms.parcel.rest;

import java.util.List;

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

import operato.wms.parcel.entity.CourierContract;
import operato.wms.parcel.service.CourierServiceDispatcher;
import operato.wms.parcel.service.cj.CjTokenService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.SysConstants;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.anythings.sys.model.BaseResponse;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.exception.client.ElidomRecordNotFoundException;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/courier_contracts")
@ServiceDesc(description = "CourierContract Service API")
public class CourierContractController extends AbstractRestService {

	@Autowired
	private CourierServiceDispatcher courierServiceDispatcher;

	@Override
	protected Class<?> entityClass() {
		return CourierContract.class;
	}

	@RequestMapping(method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search (Pagination) By Search Conditions")
	public Page<?> index(@RequestParam(name = "page", required = false) Integer page,
			@RequestParam(name = "limit", required = false) Integer limit,
			@RequestParam(name = "select", required = false) String select,
			@RequestParam(name = "sort", required = false) String sort,
			@RequestParam(name = "query", required = false) String query) {
		return this.search(this.entityClass(), page, limit, select, sort, query);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Find one by ID")
	public CourierContract findOne(@PathVariable("id") String id) {
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
	public CourierContract create(@RequestBody CourierContract input) {
		return this.createOne(input);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public CourierContract update(@PathVariable("id") String id, @RequestBody CourierContract input) {
		return this.updateOne(input);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Delete")
	public void delete(@PathVariable("id") String id) {
		this.deleteOne(this.entityClass(), id);
	}

	@RequestMapping(value = "/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean multipleUpdate(@RequestBody List<CourierContract> list) {
		return this.cudMultipleData(this.entityClass(), list);
	}

	@RequestMapping(value = "/{id}/refresh_token", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Refresh token")
	public BaseResponse refreshToken(@PathVariable("id") String id) {
		CourierContract contract = this.queryManager.select(CourierContract.class, id);

		if (contract == null || true == contract.getDelFlag()) {
			throw new ElidomRecordNotFoundException("사용중인 송장출력계약이 존재하지 않습니다");
		}

		String newToken = this.courierServiceDispatcher.get(contract.getDlvVendCd()).refreshToken(
				Domain.currentDomainId(),
				contract.getContractNo());

		return new BaseResponse(true, SysConstants.OK_STRING, newToken);
	}

	@RequestMapping(value = "/{id}/token", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get token")
	public BaseResponse getToken(@PathVariable("id") String id) {
		CourierContract contract = this.queryManager.select(CourierContract.class, id);

		if (contract == null || true == contract.getDelFlag()) {
			throw new ElidomRecordNotFoundException("사용중인 송장출력계약이 존재하지 않습니다");
		}

		String token = this.courierServiceDispatcher.get(contract.getDlvVendCd()).getToken(Domain.currentDomainId(),
				contract.getContractNo());

		return new BaseResponse(true, SysConstants.OK_STRING, token);
	}
}