package operato.wms.vas.service;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * VAS SSE(Server-Sent Events) 서비스
 *
 * 도메인(테넌트)별 SSE 연결 관리 및 이벤트 발행.
 * VAS 주문 상태 변경 시 연결된 모든 클라이언트에 실시간 푸시.
 *
 * @author HatioLab
 */
@Component
public class VasSseService {

	private static final Logger logger = LoggerFactory.getLogger(VasSseService.class);

	/** SSE 타임아웃: 5분 */
	private static final long SSE_TIMEOUT = 5 * 60 * 1000L;

	/** 하트비트 간격: 30초 */
	private static final long HEARTBEAT_INTERVAL = 30L;

	/** 도메인별 SSE emitter 목록 */
	private final ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();

	/** 하트비트 스케줄러 */
	private final ScheduledExecutorService heartbeatScheduler = Executors.newSingleThreadScheduledExecutor(r -> {
		Thread t = new Thread(r, "vas-sse-heartbeat");
		t.setDaemon(true);
		return t;
	});

	/** JSON 직렬화 */
	private final ObjectMapper objectMapper = new ObjectMapper();

	/**
	 * 새 SSE 연결 등록
	 *
	 * @param domainId 도메인 ID
	 * @return SseEmitter 인스턴스
	 */
	public SseEmitter subscribe(Long domainId) {
		SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

		CopyOnWriteArrayList<SseEmitter> domainEmitters = emitters.computeIfAbsent(
				domainId, k -> new CopyOnWriteArrayList<>());
		domainEmitters.add(emitter);

		// 연결 종료 콜백
		Runnable removeEmitter = () -> {
			domainEmitters.remove(emitter);
			logger.debug("SSE 연결 해제 — domainId: {}, 남은 연결: {}", domainId, domainEmitters.size());
		};

		emitter.onCompletion(removeEmitter);
		emitter.onTimeout(removeEmitter);
		emitter.onError(e -> removeEmitter.run());

		// 연결 즉시 초기 이벤트 전송
		try {
			emitter.send(SseEmitter.event()
					.name("connected")
					.data("{\"message\":\"SSE connected\"}"));
		} catch (IOException e) {
			domainEmitters.remove(emitter);
			return emitter;
		}

		// 하트비트 시작
		startHeartbeat(emitter, domainId, domainEmitters);

		logger.info("SSE 연결 등록 — domainId: {}, 총 연결: {}", domainId, domainEmitters.size());

		return emitter;
	}

	/**
	 * 이벤트 발행 — 해당 domainId의 모든 클라이언트에 전송
	 *
	 * @param domainId 도메인 ID
	 * @param event    이벤트 데이터
	 */
	public void publish(Long domainId, VasEventData event) {
		CopyOnWriteArrayList<SseEmitter> domainEmitters = emitters.get(domainId);
		if (domainEmitters == null || domainEmitters.isEmpty()) {
			return;
		}

		String jsonData;
		try {
			jsonData = objectMapper.writeValueAsString(event);
		} catch (Exception e) {
			logger.error("SSE 이벤트 직렬화 실패", e);
			return;
		}

		for (SseEmitter emitter : domainEmitters) {
			try {
				emitter.send(SseEmitter.event()
						.name("vas-event")
						.data(jsonData));
			} catch (Exception e) {
				domainEmitters.remove(emitter);
				logger.debug("SSE 전송 실패, 연결 제거 — domainId: {}", domainId);
			}
		}

		logger.debug("SSE 이벤트 발행 — domainId: {}, type: {}, clients: {}",
				domainId, event.eventType(), domainEmitters.size());
	}

	/**
	 * 30초 하트비트로 연결 유지
	 */
	private void startHeartbeat(SseEmitter emitter, Long domainId,
			CopyOnWriteArrayList<SseEmitter> domainEmitters) {
		heartbeatScheduler.scheduleAtFixedRate(() -> {
			if (!domainEmitters.contains(emitter)) {
				return; // 이미 제거된 emitter — 스케줄 자동 종료는 안 되지만 skip
			}
			try {
				emitter.send(SseEmitter.event()
						.name("heartbeat")
						.data("{\"timestamp\":" + System.currentTimeMillis() + "}"));
			} catch (Exception e) {
				domainEmitters.remove(emitter);
			}
		}, HEARTBEAT_INTERVAL, HEARTBEAT_INTERVAL, TimeUnit.SECONDS);
	}

	/**
	 * VAS 이벤트 데이터
	 *
	 * @param eventType  이벤트 유형 (ORDER_APPROVED, MATERIAL_READY, WORK_STARTED, RESULTS_REGISTERED, WORK_COMPLETED, ORDER_CANCELLED, ORDER_CLOSED)
	 * @param vasNo      VAS 주문번호
	 * @param vasOrderId VAS 주문 ID
	 * @param fromStatus 이전 상태
	 * @param toStatus   변경된 상태
	 * @param vasType    유통가공 유형
	 * @param message    알림 메시지
	 */
	public record VasEventData(
			String eventType,
			String vasNo,
			String vasOrderId,
			String fromStatus,
			String toStatus,
			String vasType,
			String message) {
	}
}
