package operato.wms.common.event;

/**
 * 웨이브 확정 취소 이벤트
 *
 * OMS에서 웨이브 확정을 취소할 때 발행하여 Fulfillment 모듈에 피킹 지시 삭제를 트리거한다.
 *
 * 이벤트 흐름:
 * 1. OMS.cancelWaveRelease() → WaveCancelledEvent 발행
 * 2. Fulfillment.FulfillmentEventListener.onWaveCancelled() → 피킹 지시 삭제
 *
 * 취소 가능 조건:
 * - 웨이브 상태 = RELEASED
 * - 모든 피킹 지시 상태 = WAIT (아직 피킹 시작 전)
 *
 * @author HatioLab
 */
public class WaveCancelledEvent extends FulfillmentEvent {

	/**
	 * 웨이브 ID
	 */
	private final String waveId;

	/**
	 * 웨이브 번호
	 */
	private final String waveNo;

	public WaveCancelledEvent(Long domainId, String waveId, String waveNo) {
		super(domainId, "OMS");
		this.waveId = waveId;
		this.waveNo = waveNo;
	}

	public String getWaveId() {
		return waveId;
	}

	public String getWaveNo() {
		return waveNo;
	}
}
