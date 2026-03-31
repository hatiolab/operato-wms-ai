package operato.wms.common.event;

/**
 * 웨이브 릴리스(확정) 이벤트
 *
 * OMS에서 웨이브를 확정(릴리스)할 때 발행하여 Fulfillment 모듈에 피킹 지시 생성을 트리거한다.
 *
 * 이벤트 흐름:
 * 1. OMS.releaseWave() → WaveReleasedEvent 발행
 * 2. Fulfillment.FulfillmentEventListener.onWaveReleased() → createPickingTasks() 호출
 *
 * @author HatioLab
 */
public class WaveReleasedEvent extends FulfillmentEvent {

	/**
	 * 웨이브 ID
	 */
	private final String waveId;

	/**
	 * 웨이브 번호
	 */
	private final String waveNo;

	/**
	 * 피킹 유형 (INDIVIDUAL / TOTAL / ZONE)
	 */
	private final String pickType;

	/**
	 * 피킹 방식 (PICK / DPS / DAS)
	 */
	private final String pickMethod;

	/**
	 * 웨이브에 포함된 주문 수
	 */
	private final Integer orderCount;

	public WaveReleasedEvent(Long domainId, String waveId, String waveNo, String pickType, String pickMethod, Integer orderCount) {
		super(domainId, "OMS");
		this.waveId = waveId;
		this.waveNo = waveNo;
		this.pickType = pickType;
		this.pickMethod = pickMethod;
		this.orderCount = orderCount;
	}

	public String getWaveId() {
		return waveId;
	}

	public String getWaveNo() {
		return waveNo;
	}

	public String getPickType() {
		return pickType;
	}

	public String getPickMethod() {
		return pickMethod;
	}

	public Integer getOrderCount() {
		return orderCount;
	}
}
