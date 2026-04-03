package operato.wms.fulfillment.service;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import operato.wms.common.event.WaveCancelledEvent;
import operato.wms.common.event.WaveReleasedEvent;

/**
 * Fulfillment 이벤트 리스너
 *
 * OMS 모듈에서 발행하는 이벤트를 구독하여 피킹/패킹/출하 지시를 생성한다.
 *
 * 이벤트 기반 아키텍처를 통해 OMS와 Fulfillment 간 느슨한 결합을 유지한다.
 * (OMS → Fulfillment: 이벤트 발행, Fulfillment → OMS: API 호출)
 *
 * @author HatioLab
 */
@Component
public class FulfillmentEventListener {
	/**
	 * Logger
	 */
	protected Logger logger = LoggerFactory.getLogger(FulfillmentEventListener.class);
	/**
	 * Fulfillment 트랜잭션 서비스
	 */
	@Autowired
	private FulfillmentTransactionService fulfillmentTrxService;

	/**
	 * 웨이브 릴리스 이벤트 처리
	 *
	 * OMS에서 웨이브를 확정(릴리스)하면 자동으로 피킹 지시를 생성한다.
	 *
	 * @param event WaveReleasedEvent
	 */
	@EventListener
	public void onWaveReleased(WaveReleasedEvent event) {
		try {
			// 피킹 지시 생성 파라미터 구성
			Map<String, Object> params = new HashMap<>();
			params.put("wave_no", event.getWaveNo());
			params.put("pick_type", event.getPickType());

			// WCS 위임 여부에 따라 피킹 방식 결정
			String pickMethod = (event.getWcsFlag() != null && event.getWcsFlag()) ? "WCS" : "PICK";
			params.put("pick_method", pickMethod);

			// 피킹 지시 생성
			Map<String, Object> result = this.fulfillmentTrxService.createPickingTasks(params);

			// 결과 로깅
			int taskCount = (int) result.getOrDefault("pick_task_count", 0);
			int itemCount = (int) result.getOrDefault("item_count", 0);
			System.out.println(String.format(
					"[Fulfillment] 웨이브 릴리스 이벤트 처리 완료 - wave_no: %s, pick_type: %s, task_count: %d, item_count: %d",
					event.getWaveNo(), event.getPickType(), taskCount, itemCount));
		} catch (Exception e) {
			// 에러 발생 시 로깅 (트랜잭션 롤백되지 않도록 예외를 상위로 전파하지 않음)
			this.logger.error(String.format(
					"[Fulfillment] 웨이브 릴리스 이벤트 처리 실패 - wave_no: %s, error: %s",
					event.getWaveNo(), e.getMessage()));
		}
	}

	/**
	 * 웨이브 확정 취소 이벤트 처리
	 *
	 * OMS에서 웨이브 확정을 취소하면 자동으로 피킹 지시를 삭제한다.
	 *
	 * 삭제 조건:
	 * - 피킹 지시 상태가 모두 WAIT인 경우에만 삭제
	 * - IN_PROGRESS 또는 COMPLETED 상태가 하나라도 있으면 예외 발생
	 *
	 * @param event WaveCancelledEvent
	 */
	@EventListener
	public void onWaveCancelled(WaveCancelledEvent event) {
		try {
			// 피킹 지시 삭제 파라미터 구성
			Map<String, Object> params = new HashMap<>();
			params.put("wave_no", event.getWaveNo());

			// 피킹 지시 삭제 (WAIT 상태만)
			Map<String, Object> result = this.fulfillmentTrxService.deletePickingTasksByWave(params);

			// 결과 로깅
			int deletedTaskCount = (int) result.getOrDefault("deleted_task_count", 0);
			int deletedItemCount = (int) result.getOrDefault("deleted_item_count", 0);
			System.out.println(String.format(
					"[Fulfillment] 웨이브 확정 취소 이벤트 처리 완료 - wave_no: %s, deleted_task_count: %d, deleted_item_count: %d",
					event.getWaveNo(), deletedTaskCount, deletedItemCount));
		} catch (Exception e) {
			// 에러 발생 시 로깅 (트랜잭션 롤백되지 않도록 예외를 상위로 전파하지 않음)
			this.logger.error(String.format(
					"[Fulfillment] 웨이브 확정 취소 이벤트 처리 실패 - wave_no: %s, error: %s",
					event.getWaveNo(), e.getMessage()));
		}
	}
}
