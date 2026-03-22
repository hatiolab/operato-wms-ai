package operato.wms.vas.rest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import operato.wms.vas.service.VasSseService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.entity.Domain;

/**
 * VAS SSE(Server-Sent Events) 구독 컨트롤러
 *
 * 프론트엔드 클라이언트가 SSE 스트림을 구독하여
 * VAS 주문 상태 변경 알림을 실시간으로 수신.
 *
 * @author HatioLab
 */
@RestController
@RequestMapping("/rest/vas_trx/events")
@ServiceDesc(description = "VAS SSE Event Subscription API")
public class VasSseController {

	@Autowired
	private VasSseService vasSseService;

	/**
	 * SSE 스트림 구독
	 *
	 * 클라이언트가 이 엔드포인트에 연결하면 서버에서 실시간 이벤트를 푸시.
	 * 이벤트 타입: connected, vas-event, heartbeat
	 *
	 * @return SseEmitter 스트림
	 */
	@GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
	@ApiDesc(description = "VAS 실시간 이벤트 구독 (SSE)")
	public SseEmitter subscribe() {
		Long domainId = Domain.currentDomainId();
		return vasSseService.subscribe(domainId);
	}
}
