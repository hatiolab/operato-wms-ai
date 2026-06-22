package operato.wms.fulfillment.service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import operato.wms.fulfillment.entity.PackingBox;
import operato.wms.fulfillment.entity.PackingOrder;
import operato.wms.oms.entity.ShipmentDelivery;
import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.parcel.WmsParcelConstants;
import operato.wms.parcel.entity.CourierContract;
import operato.wms.parcel.service.CourierBookingRequest;
import operato.wms.parcel.service.CourierBookingResult;
import operato.wms.parcel.service.CourierService;
import operato.wms.parcel.service.CourierServiceDispatcher;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.sys.SysConstants;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 풀필먼트 출하 서비스
 *
 * 라벨 출력, 적하 목록 전송, 출하 확정, 출하 취소 등 출하 관련 트랜잭션을 담당한다.
 *
 * @author HatioLab
 */
@Component
public class FulfillmentShippingService extends AbstractQueryService {
	/**
	 * 택배 서비스
	 */
	@Autowired
	private CourierServiceDispatcher courierServiceDispatcher;

	/**
	 * 라벨 출력 (COMPLETED -> LABEL_PRINTED)
	 *
	 * 패킹 완료 후 송장 라벨을 출력한다.
	 * 패킹 지시에 연결된 박스의 라벨 출력 플래그도 갱신한다.
	 *
	 * @param packingOrderId 패킹 지시 ID
	 * @return { success, pack_order_no, status }
	 */
	public Map<String, Object> printLabel(String packingOrderId) {
		// 1. 패킹 지시 정보 조회
		Long domainId = Domain.currentDomainId();
		PackingOrder order = this.findPackingOrder(domainId, packingOrderId);

		// 2. 패킹 지시 상태 체크
		if (!PackingOrder.STATUS_COMPLETED.equals(order.getStatus())) {
			throw new ElidomValidationException(
					"패킹 지시 상태가 [" + order.getStatus() + "]이므로 라벨을 출력할 수 없습니다 (COMPLETED 상태만 가능)");
		}

		// 3. 택배사 계약 유효성 검증
		if ("B2C_OUT".equalsIgnoreCase(order.getBizType())) {
			this.validateCourierContract(domainId, order);
		}

		// 4. 패킹 지시 상태 변경
		order.setStatus(PackingOrder.STATUS_LABEL_PRINTED);
		this.queryManager.update(order, "status", "updatedAt", "updaterId");

		// 5. 박스 라벨 출력 플래그 갱신
		String boxSql = "UPDATE packing_boxes SET label_printed_flag = true, label_printed_at = :now, updated_at = now() WHERE domain_id = :domainId AND packing_order_id = :packingOrderId AND status = :closedStatus";
		Map<String, Object> boxParams = ValueUtil.newMap("now,domainId,packingOrderId,closedStatus",
				DateUtil.currentTimeStr(), domainId, packingOrderId, PackingBox.STATUS_CLOSED);
		this.queryManager.executeBySql(boxSql, boxParams);

		// 6. 결과 리턴
		return ValueUtil.newMap("success,pack_order_no,status", true, order.getPackOrderNo(), order.getStatus());
	}

	/**
	 * 적하 목록 전송 (LABEL_PRINTED -> MANIFESTED)
	 *
	 * 택배사에 적하 목록(manifest)을 전송하고 상태를 변경한다.
	 *
	 * @param packingOrderId 패킹 지시 ID
	 * @return { success, pack_order_no, status }
	 */
	public Map<String, Object> createManifest(String packingOrderId) {
		// 1. 패킹 지시 조회
		Long domainId = Domain.currentDomainId();
		PackingOrder order = this.findPackingOrder(domainId, packingOrderId);

		// 2. 패킹 지시 상태 체크
		if (!PackingOrder.STATUS_LABEL_PRINTED.equals(order.getStatus())) {
			throw new ElidomValidationException(
					"패킹 지시 상태가 [" + order.getStatus() + "]이므로 적하 목록을 전송할 수 없습니다 (LABEL_PRINTED 상태만 가능)");
		}

		// 3. 상태 업데이트
		order.setStatus(PackingOrder.STATUS_MANIFESTED);
		order.setManifestedAt(DateUtil.currentTimeStr());
		this.queryManager.update(order, "status", "manifestedAt", "updatedAt", "updaterId");

		// 4. 결과 리턴
		return ValueUtil.newMap("success,pack_order_no,status", true, order.getPackOrderNo(),
				PackingOrder.STATUS_MANIFESTED);
	}

	/**
	 * 출하 확정 (COMPLETED|LABEL_PRINTED|MANIFESTED -> SHIPPED)
	 *
	 * 출하를 확정하고, 연결된 박스 상태도 SHIPPED로 변경한다.
	 * 연결된 출하 주문도 SHIPPED 상태로 갱신한다.
	 *
	 * @param packingOrderId 패킹 지시 ID
	 * @return { success, pack_order_no, status }
	 */
	public Map<String, Object> confirmShipping(String packingOrderId) {
		// 1. 포장 주문 조회
		Long domainId = Domain.currentDomainId();
		PackingOrder order = this.findPackingOrder(domainId, packingOrderId);
		String status = order.getStatus();

		// 2. 포장 주문 상태 체크
		if (!PackingOrder.STATUS_COMPLETED.equals(status)
				&& !PackingOrder.STATUS_LABEL_PRINTED.equals(status)
				&& !PackingOrder.STATUS_MANIFESTED.equals(status)) {
			throw new ElidomValidationException(
					"패킹 지시 상태가 [" + status + "]이므로 출하 확정할 수 없습니다 (COMPLETED/LABEL_PRINTED/MANIFESTED 상태만 가능)");
		}

		// 3. 패킹 지시 상태 변경
		String now = DateUtil.currentTimeStr();
		order.setStatus(PackingOrder.STATUS_SHIPPED);
		order.setShippedAt(now);
		this.queryManager.update(order, "status", "shippedAt", "updatedAt", "updaterId");

		// 4. 박스 상태를 SHIPPED로 변경
		String boxSql = "UPDATE packing_boxes SET status = :status, shipped_at = :now, updated_at = now() WHERE domain_id = :domainId AND packing_order_id = :packingOrderId AND status IN (:s1, :s2)";
		Map<String, Object> boxParams = ValueUtil.newMap("status,now,domainId,packingOrderId,s1,s2",
				PackingBox.STATUS_SHIPPED, now, domainId, packingOrderId, PackingBox.STATUS_OPEN,
				PackingBox.STATUS_CLOSED);
		this.queryManager.executeBySql(boxSql, boxParams);

		// 5. 연결된 출하 주문 상태를 SHIPPED로 갱신 + ShipmentOrderItem shipped_qty 반영
		if (ValueUtil.isNotEmpty(order.getShipmentOrderId())) {
			ShipmentOrder shipmentOrder = this.findShipmentOrder(domainId, order.getShipmentOrderId());

			if (!ShipmentOrder.STATUS_SHIPPED.equalsIgnoreCase(shipmentOrder.getStatus())) {
				// 5.1 출하 주문 상태가 SHIPPED가 아니면 SHIPPED로 변경
				shipmentOrder.setStatus(ShipmentOrder.STATUS_SHIPPED);
				shipmentOrder.setShippedAt(now);
				this.queryManager.update(shipmentOrder, "status", "shippedAt", "updatedAt", "updaterId");

				// 5.2 포장 주문의 아이템 기준으로 포장 수량 집계하여 출고 수량 업데이트
				String packQtySql = "SELECT sku_cd, SUM(pack_qty) AS shipped_qty FROM packing_order_items WHERE packing_order_id = :packingOrderId group by sku_cd";
				Map<String, Object> params = ValueUtil.newMap("domainId,orderId", domainId, packingOrderId);
				List<Map> packItemQtys = this.queryManager.selectListBySql(packQtySql, params, Map.class, 0, 0);

				for (Map row : packItemQtys) {
					String skuCd = (String) row.get("sku_cd");
					Object shippedQty = row.get("shipped_qty");
					String updItemSql = "UPDATE shipment_order_items SET shipped_qty = shipped_qty + :shippedQty, updated_at = now() WHERE domain_id = :domainId AND shipment_order_id = :shipmentOrderId AND sku_cd = :skuCd";
					Map<String, Object> updItemParams = ValueUtil.newMap("shippedQty,domainId,shipmentOrderId,skuCd",
							Double.parseDouble(shippedQty.toString()), domainId, shipmentOrder.getId(), skuCd);
					this.queryManager.executeBySql(updItemSql, updItemParams);
				}
			}

			// 5.3 집하 예약 자동 처리 — if_status = BOOKED 가 아닌 경우에만 시도
			if (!WmsParcelConstants.SHIPMENT_IF_STATUS_BOOKED.equals(shipmentOrder.getIfStatus())) {
				try {
					this.bookCourier(order.getShipmentOrderId());
				} catch (Exception e) {
					// 집하 예약 실패는 출하 확정을 막지 않음
					this.logger.warn("출하 확정 중 집하 예약 실패: shipmentOrderId={}, error={}", order.getShipmentOrderId(),
							e.getMessage());
				}
			}
		}

		// 6. 결과 리턴
		return ValueUtil.newMap("success,pack_order_no,status", true, order.getPackOrderNo(),
				PackingOrder.STATUS_SHIPPED);
	}

	/**
	 * 출하 확정 일괄 처리
	 *
	 * 여러 패킹 지시를 일괄 출하 확정한다.
	 *
	 * @param ids 패킹 지시 ID 리스트
	 * @return { success_count, fail_count, results: [...] }
	 */
	public Map<String, Object> confirmShippingBatch(List<String> ids) {
		int successCount = 0;
		int failCount = 0;
		List<Map<String, Object>> results = new ArrayList<>();

		for (String id : ids) {
			Map<String, Object> itemResult = ValueUtil.newMap("id", id);
			try {
				Map<String, Object> shipResult = this.confirmShipping(id);
				itemResult.put("success", true);
				itemResult.put("pack_order_no", shipResult.get("pack_order_no"));
				itemResult.put("status", shipResult.get("status"));
				successCount++;
			} catch (Exception e) {
				itemResult.put("success", false);
				itemResult.put("error", e.getMessage());
				failCount++;
			}
			results.add(itemResult);
		}

		// 결과 리턴
		return ValueUtil.newMap("success_count,fail_count,results", successCount, failCount, results);
	}

	/**
	 * 출하 취소 (SHIPPED -> COMPLETED 복귀)
	 *
	 * 출하 확정 후 취소 처리를 수행한다.
	 * 패킹 지시와 출하 주문을 포장 완료 상태로 복귀시켜 재출하가 가능하게 한다.
	 * 재고 할당(stock_allocations)은 유지하므로 별도 재할당 없이 재출하 확정 가능하다.
	 *
	 * @param packingOrderId 패킹 지시 ID
	 * @return { success, pack_order_no, restored_box_count }
	 */
	public Map<String, Object> cancelShipping(String packingOrderId) {
		// 1. 패킹 지시 조회
		Long domainId = Domain.currentDomainId();
		PackingOrder order = this.findPackingOrder(domainId, packingOrderId);

		// 2. 패킹 지시 상태 체크
		if (!PackingOrder.STATUS_SHIPPED.equals(order.getStatus())) {
			throw new ElidomValidationException(
					"패킹 지시 상태가 [" + order.getStatus() + "]이므로 출하 취소할 수 없습니다 (SHIPPED 상태만 가능)");
		}

		// 3. 박스 상태를 CLOSED로 복원 (재출하 대기 상태)
		String boxCountSql = "SELECT COUNT(*) FROM packing_boxes WHERE domain_id = :domainId AND packing_order_id = :packingOrderId AND status = :shippedStatus";
		Map<String, Object> boxCountParams = ValueUtil.newMap("domainId,packingOrderId,shippedStatus",
				domainId, packingOrderId, PackingBox.STATUS_SHIPPED);
		Integer restoredBoxCount = this.queryManager.selectBySql(boxCountSql, boxCountParams, Integer.class);

		// 4. 박스 상태를 CLOSED로 복원 (재출하 대기 상태)
		String boxSql = "UPDATE packing_boxes SET status = :status, shipped_at = null, updated_at = now() WHERE domain_id = :domainId AND packing_order_id = :packingOrderId AND status = :shippedStatus";
		Map<String, Object> boxParams = ValueUtil.newMap("status,domainId,packingOrderId,shippedStatus",
				PackingBox.STATUS_CLOSED, domainId, packingOrderId, PackingBox.STATUS_SHIPPED);
		this.queryManager.executeBySql(boxSql, boxParams);

		// 5. 패킹 지시 상태를 COMPLETED로 복귀 (재출하 확정 가능)
		order.setStatus(PackingOrder.STATUS_COMPLETED);
		order.setShippedAt(null);
		this.queryManager.update(order, "status", "shippedAt", "updatedAt", "updaterId");

		// 6. 출하 주문 상태를 PACKING으로 복귀 + ShipmentOrderItem shipped_qty 롤백
		if (ValueUtil.isNotEmpty(order.getShipmentOrderId())) {
			// 6.1 출하 주문 상태를 PACKING으로 복귀 (재출하 확정 대기)
			String updOrderSql = "UPDATE shipment_orders SET status = :status, shipped_at = null, updated_at = now() WHERE domain_id = :domainId AND id = :id AND status = :shippedStatus";
			Map<String, Object> updOrderParams = ValueUtil.newMap("status,domainId,id,shippedStatus",
					ShipmentOrder.STATUS_PACKING, domainId, order.getShipmentOrderId(), ShipmentOrder.STATUS_SHIPPED);
			this.queryManager.executeBySql(updOrderSql, updOrderParams);

			// 6.2 ShipmentOrderItem shipped_qty 롤백 (출하 확정 시 반영된 수량 초기화)
			String resetItemSql = "UPDATE shipment_order_items SET shipped_qty = 0, updated_at = now() WHERE domain_id = :domainId AND shipment_order_id = :orderId";
			Map<String, Object> resetItemParams = ValueUtil.newMap("domainId,orderId", domainId,
					order.getShipmentOrderId());
			this.queryManager.executeBySql(resetItemSql, resetItemParams);

			// 6.3 집하 예약 취소 자동 처리 — if_status = BOOKED 인 경우에만 시도
			ShipmentOrder shipmentOrder = this.findShipmentOrder(domainId, order.getShipmentOrderId());
			if (WmsParcelConstants.SHIPMENT_IF_STATUS_BOOKED.equals(shipmentOrder.getIfStatus())) {
				try {
					this.cancelCourier(order.getShipmentOrderId());
				} catch (Exception e) {
					// 집하 예약 취소 실패는 출하 취소를 막지 않음
					this.logger.warn("출하 취소 중 집하 예약 취소 실패: shipmentOrderId={}, error={}", order.getShipmentOrderId(),
							e.getMessage());
				}
			}
		}

		// 결과 리턴
		return ValueUtil.newMap("success,pack_order_no,restored_box_count", true, order.getPackOrderNo(),
				restoredBoxCount != null ? restoredBoxCount : 0);
	}

	/**
	 * 박스 송장 번호 업데이트
	 *
	 * @param boxId     박스 ID
	 * @param invoiceNo 송장 번호
	 * @return { success, box_seq, invoice_no }
	 */
	public Map<String, Object> updateBoxInvoice(String boxId, String invoiceNo) {
		// 1. 박스 조회
		PackingBox box = this.findPackingBox(Domain.currentDomainId(), boxId);

		if (ValueUtil.isEmpty(invoiceNo)) {
			throw new ElidomValidationException("송장 번호(invoice_no)는 필수 파라미터입니다");
		}

		// 2. 박스에 송장 번호 업데이트
		box.setInvoiceNo(invoiceNo);
		this.queryManager.update(box, "invoiceNo", "updatedAt", "updaterId");

		// 3. 결과 리턴
		return ValueUtil.newMap("success,box_seq,invoice_no", true, box.getBoxSeq(), invoiceNo);
	}

	// ==================== PDA 출하 확정 API ====================

	/**
	 * 도크 배정 — dock_cd가 미배정(NULL)인 출하 대기 포장 지시에 선택한 도크를 일괄 배정
	 *
	 * @param dockCd 배정할 도크 코드
	 * @return { success, assigned_count }
	 */
	public Map<String, Object> assignDock(String dockCd) {
		// 1. 패킹 지시 주문의 도크 코드 업데이트
		String sql = "UPDATE packing_orders SET dock_cd = :dockCd, updated_at = now()"
				+ " WHERE domain_id = :domainId"
				+ " AND dock_cd IS NULL"
				+ " AND status IN ('COMPLETED', 'LABEL_PRINTED', 'MANIFESTED')";
		Map<String, Object> params = ValueUtil.newMap("dockCd,domainId", dockCd, Domain.currentDomainId());
		int count = this.queryManager.executeBySql(sql, params);

		// 2. 결과 리턴
		return ValueUtil.newMap("success,assigned_count", true, count);
	}

	/**
	 * 도크 목록 조회 (공통코드 DOCK_CODE 기반 + 대기 건수)
	 *
	 * @return [{ dock_cd, dock_nm, waiting_count, total_box_count }]
	 */
	@SuppressWarnings("rawtypes")
	public List<Map> getDockList() {
		String sql = "SELECT ccd.name AS dock_cd, ccd.description AS dock_nm,"
				+ " COALESCE(wc.waiting_count, 0) AS waiting_count,"
				+ " COALESCE(wc.total_box_count, 0) AS total_box_count"
				+ " FROM common_code_details ccd"
				+ " JOIN common_codes cc ON cc.id = ccd.parent_id AND cc.domain_id = ccd.domain_id"
				+ " LEFT JOIN ("
				+ "   SELECT dock_cd, COUNT(*) AS waiting_count, SUM(COALESCE(total_box, 0)) AS total_box_count"
				+ "   FROM packing_orders"
				+ "   WHERE domain_id = :domainId AND status IN ('COMPLETED', 'LABEL_PRINTED', 'MANIFESTED')"
				+ "   AND dock_cd IS NOT NULL GROUP BY dock_cd"
				+ " ) wc ON wc.dock_cd = ccd.name"
				+ " WHERE cc.domain_id = :domainId AND cc.name = 'DOCK_CODE'"
				+ " ORDER BY ccd.rank, ccd.name";
		return this.queryManager.selectListBySql(sql, ValueUtil.newMap("domainId", Domain.currentDomainId()), Map.class,
				0, 0);
	}

	/**
	 * 도크별 출하 대기 목록 조회
	 *
	 * @param dockCd 도크 코드
	 * @return { summary: { waiting_count, total_box_count }, items: [...] }
	 */
	@SuppressWarnings({ "rawtypes", "unchecked" })
	public Map<String, Object> getWaitingList(String dockCd) {
		// 1. 패킹 지시 정보 조회
		Long domainId = Domain.currentDomainId();
		String orderSql = "SELECT po.id, po.pack_order_no, po.shipment_no, po.wave_no,"
				+ " po.carrier_cd, po.total_box, po.total_wt, po.status, po.shipment_order_id"
				+ " FROM packing_orders po"
				+ " WHERE po.domain_id = :domainId AND po.dock_cd = :dockCd"
				+ " AND po.status IN ('COMPLETED', 'LABEL_PRINTED', 'MANIFESTED')"
				+ " ORDER BY po.carrier_cd, po.pack_order_no";
		List<Map> orders = this.queryManager.selectListBySql(orderSql,
				ValueUtil.newMap("domainId,dockCd", domainId, dockCd), Map.class, 0, 0);

		// 2. 패킹 박스 카운트
		int totalBoxCount = 0;
		for (Map order : orders) {
			String orderId = order.get("id").toString();
			String boxSql = "SELECT pb.id AS box_id, pb.box_seq, pb.invoice_no, pb.status"
					+ " FROM packing_boxes pb"
					+ " WHERE pb.domain_id = :domainId AND pb.packing_order_id = :orderId"
					+ " AND pb.status IN ('OPEN', 'CLOSED')"
					+ " ORDER BY pb.box_seq";
			List<Map> boxes = this.queryManager.selectListBySql(boxSql,
					ValueUtil.newMap("domainId,orderId", domainId, orderId), Map.class, 0, 0);
			order.put("boxes", boxes);
			totalBoxCount += boxes.size();
		}

		// 3. 결과 리턴
		return ValueUtil.newMap("summary,items",
				ValueUtil.newMap("waiting_count,total_box_count", orders.size(), totalBoxCount), orders);
	}

	/**
	 * 송장번호로 출하 확정 (PDA 스캔)
	 *
	 * 1. 송장번호로 박스 조회
	 * 2. 도크 일치 검증
	 * 3. 박스 SHIPPED 처리
	 * 4. 모든 박스 스캔 완료 시 포장 지시 출하 확정
	 *
	 * @param dockCd    도크 코드
	 * @param invoiceNo 송장 번호
	 * @return { success, pack_order_no, shipment_no, carrier_cd, status,
	 *         scanned_box, remaining_boxes,
	 *         all_boxes_scanned }
	 */
	@SuppressWarnings("rawtypes")
	public Map<String, Object> confirmShippingByInvoice(String dockCd, String invoiceNo) {
		// 1. 송장 번호로 박스 조회
		String boxSql = "SELECT pb.id, pb.packing_order_id, pb.box_seq, pb.status FROM packing_boxes pb WHERE pb.domain_id = :domainId AND pb.invoice_no = :invoiceNo";
		Long domainId = Domain.currentDomainId();
		List<Map> boxList = this.queryManager.selectListBySql(boxSql,
				ValueUtil.newMap("domainId,invoiceNo", domainId, invoiceNo), Map.class, 0, 1);

		// 2. 박스 리스트 존재 여부 체크
		if (boxList.isEmpty()) {
			throw new ElidomValidationException("해당 송장번호의 출하 건을 찾을 수 없습니다: " + invoiceNo);
		}

		Map box = boxList.get(0);
		String boxId = box.get("id").toString();
		String packingOrderId = box.get("packing_order_id").toString();
		String boxStatus = ValueUtil.toString(box.get("status"), SysConstants.EMPTY_STRING);

		// 3. 박스 상태가 이미 출하 확정 상태인지 체크
		if (PackingBox.STATUS_SHIPPED.equals(boxStatus)) {
			throw new ElidomValidationException("이미 출하 확정된 송장입니다: " + invoiceNo);
		}

		// 4. 포장 지시 조회
		PackingOrder order = this.findPackingOrder(domainId, packingOrderId);

		// 5. 도크 코드 일치 여부 체크
		if (ValueUtil.isNotEmpty(dockCd) && ValueUtil.isNotEmpty(order.getDockCd())
				&& !dockCd.equals(order.getDockCd())) {
			throw new ElidomValidationException("이 송장은 " + order.getDockCd() + " 도크에 배정되어 있습니다");
		}

		// 6. 포장 지시 상태가 출하 확정 가능 상태인지 체크
		String orderStatus = order.getStatus();
		if (!PackingOrder.STATUS_COMPLETED.equals(orderStatus)
				&& !PackingOrder.STATUS_LABEL_PRINTED.equals(orderStatus)
				&& !PackingOrder.STATUS_MANIFESTED.equals(orderStatus)) {
			throw new ElidomValidationException(
					"포장 지시 상태가 [" + orderStatus + "]이므로 출하 확정할 수 없습니다");
		}

		// 7. 박스 SHIPPED 처리
		String updBoxSql = "UPDATE packing_boxes SET status = :status, shipped_at = :now, updated_at = now() WHERE domain_id = :domainId AND id = :boxId";
		this.queryManager.executeBySql(updBoxSql,
				ValueUtil.newMap("status,now,domainId,boxId", PackingBox.STATUS_SHIPPED, DateUtil.currentTimeStr(),
						domainId, boxId));

		// 8. 잔여 미출하 박스 수 확인
		String countSql = "SELECT COUNT(*) FROM packing_boxes"
				+ " WHERE domain_id = :domainId AND packing_order_id = :packingOrderId"
				+ " AND status IN ('OPEN', 'CLOSED')";
		Integer remainingBoxes = this.queryManager.selectBySql(countSql,
				ValueUtil.newMap("domainId,packingOrderId", domainId, packingOrderId), Integer.class);

		// 9. 모든 박스 스캔 완료 여부 체크
		boolean allBoxesScanned = (remainingBoxes == null || remainingBoxes == 0);

		// 10. 모든 박스 스캔 완료 시 포장 지시 출하 확정
		if (allBoxesScanned) {
			this.confirmShipping(packingOrderId);
		}

		// 11. 결과 반환
		Map<String, Object> result = ValueUtil.newMap("success,pack_order_no,shipment_no,carrier_cd,status", true,
				order.getPackOrderNo(), order.getShipmentNo(), order.getCarrierCd(),
				allBoxesScanned ? PackingOrder.STATUS_SHIPPED : orderStatus);
		result.put("scanned_box", ValueUtil.newMap("box_seq,invoice_no", box.get("box_seq"), invoiceNo));
		result.put("remaining_boxes", remainingBoxes != null ? remainingBoxes : 0);
		result.put("all_boxes_scanned", allBoxesScanned);
		return result;
	}

	/*
	 * ============================================================
	 * 집하 예약 API
	 * ============================================================
	 */

	/**
	 * 출고 주문 집하 예약
	 *
	 * ShipmentOrder.carrier_cd 로 택배사를 선택하고, 기본 계약 기준으로 집하 예약을 접수한다.
	 * ShipmentDelivery 에서 수신인/발송인 정보를 추출하여 CourierBookingRequest 를 빌드한다.
	 *
	 * @param shipmentOrderId 출고 주문 ID
	 * @return { success, invc_no, shipment_no }
	 */
	public Map<String, Object> bookCourier(String shipmentOrderId) {
		// 1. 출고 주문 조회
		Long domainId = Domain.currentDomainId();
		ShipmentOrder order = this.findShipmentOrder(domainId, shipmentOrderId);

		// 2. 택배사 코드 존재 여부 체크
		if (ValueUtil.isEmpty(order.getCarrierCd())) {
			throw new ElidomValidationException("출고 주문 [" + order.getShipmentNo() + "]에 택배사 코드(carrier_cd)가 없습니다.");
		}

		// 3. 송장 번호 존재 여부 체크
		if (ValueUtil.isEmpty(order.getInvoiceNo())) {
			throw new ElidomValidationException("출고 주문 [" + order.getShipmentNo() + "]에 송장번호가 없습니다.");
		}

		// 4. 배송 정보 조회
		ShipmentDelivery delivery = this.findShipmentDelivery(domainId, shipmentOrderId);

		// 5. 택배사 서비스 조회
		CourierService courierSvc = this.courierServiceDispatcher.get(order.getCarrierCd());

		// 6. 기본 계약 조회
		CourierContract contract = courierSvc.getDefaultCourierContract(domainId);
		if (contract == null) {
			throw new ElidomValidationException("택배사 [" + order.getCarrierCd() + "]의 기본 계약이 없습니다.");
		}

		// 7. 예약 요청 VO 빌드 (수신인/발송인 정보)
		CourierBookingRequest request = this.buildBookingRequest(delivery);

		// 8. 집하 예약 접수
		CourierBookingResult result = courierSvc.book(domainId, contract.getContractNo(), order.getShipmentNo(),
				request);

		// 9. 출고 주문 if_status 업데이트 (BOOKED)
		this.updateShipmentIfStatus(domainId, shipmentOrderId, WmsParcelConstants.SHIPMENT_IF_STATUS_BOOKED);

		// 10. 결과 리턴
		return ValueUtil.newMap("success,invc_no,shipment_no", true, result.getInvcNo(), result.getShipmentNo());
	}

	/**
	 * 출고 주문 집하 예약 취소
	 *
	 * ShipmentOrder.carrier_cd 로 택배사를 선택하고, 기본 계약 기준으로 집하 예약을 취소한다.
	 * 운송장 스캔 완료 이후에는 취소가 불가능할 수 있다.
	 *
	 * @param shipmentOrderId 출고 주문 ID
	 * @return { success, shipment_no }
	 */
	public Map<String, Object> cancelCourier(String shipmentOrderId) {
		// 1. 출고 주문 조회
		Long domainId = Domain.currentDomainId();
		ShipmentOrder order = this.findShipmentOrder(domainId, shipmentOrderId);

		// 2. 출고 주문 유효성 체크
		if (ValueUtil.isEmpty(order.getCarrierCd())) {
			throw new ElidomValidationException("출고 주문[" + order.getShipmentNo() + "]에 택배사 코드(carrier_cd)가 없습니다");
		}

		// 3. 택배사 서비스 조회
		CourierService courierSvc = this.courierServiceDispatcher.get(order.getCarrierCd());

		// 4. 기본 계약 조회
		CourierContract contract = courierSvc.getDefaultCourierContract(domainId);
		if (contract == null) {
			throw new ElidomValidationException("택배사 [" + order.getCarrierCd() + "]의 기본 계약이 없습니다.");
		}

		// 5. 집하 예약 취소
		courierSvc.cancelBooking(domainId, contract.getContractNo(), order.getShipmentNo());

		// 6. 출고 주문 if_status 업데이트 (BOOKING_CANCELLED)
		this.updateShipmentIfStatus(domainId, shipmentOrderId, WmsParcelConstants.SHIPMENT_IF_STATUS_BOOKING_CANCELLED);

		// 7. 결과 리턴
		return ValueUtil.newMap("success,shipment_no", true, order.getShipmentNo());
	}

	/*
	 * ============================================================
	 * 내부 유틸리티
	 * ============================================================
	 */

	/**
	 * 택배사 계약 유효성 검증
	 *
	 * carrierCd가 있을 경우 해당 택배사의 계약 정보를 조회하여
	 * 계약 상태(ACTIVE), 계약 기간(contractStartDate ~ contractEndDate)을 검증한다.
	 *
	 * @param domainId 도메인 ID
	 * @param order    패킹 지시
	 */
	private void validateCourierContract(Long domainId, PackingOrder order) {
		String carrierCd = order.getCarrierCd();
		if (ValueUtil.isEmpty(carrierCd))
			return;

		String sql = "SELECT * FROM courier_contracts WHERE domain_id = :domainId AND dlv_vend_cd = :dlvVendCd AND (del_flag IS NULL OR del_flag = false)";
		List<CourierContract> contracts = this.queryManager.selectListBySql(sql,
				ValueUtil.newMap("domainId,dlvVendCd", domainId, carrierCd), CourierContract.class, 0, 1);

		if (contracts.isEmpty()) {
			throw new ElidomValidationException("택배사 [" + carrierCd + "]의 계약 정보가 없습니다.");
		}

		CourierContract contract = contracts.get(0);

		if (!"ACTIVE".equals(contract.getStatus())) {
			throw new ElidomValidationException(
					"택배사 [" + carrierCd + "]의 계약 상태가 유효하지 않습니다 (현재: " + contract.getStatus() + ", ACTIVE 상태만 가능)");
		}

		Date today = new Date();

		if (contract.getContractStartDate() != null && today.before(contract.getContractStartDate())) {
			throw new ElidomValidationException("택배사 [" + carrierCd + "]의 계약 시작일 이전입니다.");
		}

		if (contract.getContractEndDate() != null && today.after(contract.getContractEndDate())) {
			throw new ElidomValidationException("택배사 [" + carrierCd + "]의 계약이 만료되었습니다.");
		}
	}

	/**
	 * 패킹 지시 단건 조회
	 */
	private PackingOrder findPackingOrder(Long domainId, String id) {
		PackingOrder order = this.queryManager.select(PackingOrder.class, id);
		if (order == null) {
			throw new ElidomValidationException("패킹 지시를 찾을 수 없습니다: " + id);
		}
		return order;
	}

	/**
	 * 포장 박스 단건 조회
	 * 
	 * @param domainId
	 * @param id
	 * @return
	 */
	private PackingBox findPackingBox(Long domainId, String id) {
		PackingBox box = this.queryManager.select(PackingBox.class, id);
		if (box == null) {
			throw new ElidomValidationException("포장 박스를 찾을 수 없습니다: " + id);
		}
		return box;
	}

	/**
	 * 출고 주문 단건 조회
	 * 
	 * @param domainId
	 * @param id
	 * @return
	 */
	private ShipmentOrder findShipmentOrder(Long domainId, String id) {
		ShipmentOrder order = this.queryManager.select(ShipmentOrder.class, id);
		if (order == null) {
			throw new ElidomValidationException("출고 주문을 찾을 수 없습니다: " + id);
		}
		return order;
	}

	/**
	 * 출고 주문 배송 정보 조회
	 */
	private ShipmentDelivery findShipmentDelivery(Long domainId, String shipmentOrderId) {
		ShipmentDelivery delivery = this.queryManager.selectByCondition(ShipmentDelivery.class,
				ValueUtil.newMap("domainId,shipmentOrderId", domainId, shipmentOrderId));
		if (delivery == null) {
			throw new ElidomValidationException("출고 주문의 배송 정보가 없습니다: " + shipmentOrderId);
		}
		return delivery;
	}

	/**
	 * 출고 주문 if_status 업데이트
	 * 
	 * @param domainId
	 * @param shipmentOrderId
	 * @param ifStatus
	 */
	private void updateShipmentIfStatus(Long domainId, String shipmentOrderId, String ifStatus) {
		String sql = "UPDATE shipment_orders SET if_status  = :ifStatus, updated_at = now() WHERE id = :id";
		this.queryManager.executeBySql(sql,
				ValueUtil.newMap("domainId,id,ifStatus", domainId, shipmentOrderId, ifStatus));
	}

	/**
	 * ShipmentDelivery 에서 CourierBookingRequest 빌드
	 *
	 * frt_dv_cd(선불)와 box_qty(1)는 기본값이며, 커스텀 서비스에서 재정의할 수 있다.
	 */
	private CourierBookingRequest buildBookingRequest(ShipmentDelivery delivery) {
		CourierBookingRequest req = new CourierBookingRequest();
		req.setFrtDvCd("01"); // 01=선불
		req.setBoxQty(1);
		req.setRemark1(delivery.getDeliveryMemo());

		req.setSenderName(delivery.getSenderNm());
		req.setSenderTel(delivery.getSenderPhone());
		req.setSenderMobile(delivery.getSenderPhone2());
		req.setSenderZip(delivery.getSenderZipCd());
		req.setSenderAddr(delivery.getSenderAddr());
		req.setSenderDetailAddr(delivery.getSenderAddr2());

		req.setReceiverName(delivery.getReceiverNm());
		req.setReceiverTel(delivery.getReceiverPhone());
		req.setReceiverMobile(delivery.getReceiverPhone2());
		req.setReceiverZip(delivery.getReceiverZipCd());
		req.setReceiverAddr(delivery.getReceiverAddr());
		req.setReceiverDetailAddr(delivery.getReceiverAddr2());

		return req;
	}
}
