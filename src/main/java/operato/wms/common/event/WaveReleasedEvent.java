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
	 * 피킹 유형 (TOTAL / ZONE / INDIVIDUAL)
	 */
	private final String pickType;

	/**
	 * WCS 위임 여부
	 */
	private final Boolean wcsFlag;

	/**
	 * 검수 여부
	 */
	private final Boolean inspFlag;

	/**
	 * 웨이브에 포함된 주문 수
	 */
	private final Integer orderCount;

	public WaveReleasedEvent(Long domainId, String waveId, String waveNo, String pickType, Boolean wcsFlag, Boolean inspFlag, Integer orderCount) {
		super(domainId, "OMS");
		this.waveId = waveId;
		this.waveNo = waveNo;
		this.pickType = pickType;
		this.wcsFlag = wcsFlag;
		this.inspFlag = inspFlag;
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

	public Boolean getWcsFlag() {
		return wcsFlag;
	}

	public Boolean getInspFlag() {
		return inspFlag;
	}

	public Integer getOrderCount() {
		return orderCount;
	}
}
