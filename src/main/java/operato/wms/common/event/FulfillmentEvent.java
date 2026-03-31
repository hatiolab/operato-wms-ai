package operato.wms.common.event;

import java.time.LocalDateTime;

/**
 * 풀필먼트 이벤트 베이스 클래스
 *
 * OMS와 Fulfillment 모듈 간 느슨한 결합을 위한 Spring ApplicationEvent 기반 이벤트
 *
 * @author HatioLab
 */
public abstract class FulfillmentEvent {

	/**
	 * 도메인 ID
	 */
	private final Long domainId;

	/**
	 * 이벤트 발생 시각
	 */
	private final LocalDateTime occurredAt;

	/**
	 * 이벤트 소스 (발행 주체)
	 */
	private final String source;

	protected FulfillmentEvent(Long domainId, String source) {
		this.domainId = domainId;
		this.source = source;
		this.occurredAt = LocalDateTime.now();
	}

	public Long getDomainId() {
		return domainId;
	}

	public LocalDateTime getOccurredAt() {
		return occurredAt;
	}

	public String getSource() {
		return source;
	}
}
