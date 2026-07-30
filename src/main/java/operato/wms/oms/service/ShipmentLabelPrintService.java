package operato.wms.oms.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.ValueUtil;

/**
 * 출고주문 Zebra 송장 라벨 출력 서비스
 *
 * 도메인에 등록된 기본 바코드 프린터로 60 x 40 mm ZPL을 전송하고,
 * Zebra Host Status(~HS)를 조회하여 라벨 처리 진행률을 추적한다.
 *
 * @author HatioLab
 */
@Component
public class ShipmentLabelPrintService extends AbstractQueryService {
	private static final int MAX_ORDER_COUNT = 200;
	private static final int DEFAULT_PRINTER_PORT = 9100;
	private static final int CONNECT_TIMEOUT_MS = 2000;
	private static final int STATUS_TIMEOUT_MS = 1500;
	private static final int PRINT_TIMEOUT_MS = 15000;
	private static final int MIN_PRINT_WAIT_MS = 300;
	private static final int STATUS_POLL_INTERVAL_MS = 100;
	private static final int BATCH_IDLE_CONFIRM_COUNT = 2;
	private static final int BATCH_IDLE_WITHOUT_BUSY_MS = 800;
	private static final long COMPLETED_JOB_KEEP_MS = 30L * 60L * 1000L;
	private final Map<String, PrintBatchJob> printJobs = new ConcurrentHashMap<>();
	private final Map<Long, String> activeJobIds = new ConcurrentHashMap<>();
	private final ExecutorService printExecutor = Executors.newSingleThreadExecutor(runnable -> {
		Thread thread = new Thread(runnable, "shipment-label-print");
		thread.setDaemon(true);
		return thread;
	});

	/**
	 * 최근 출고주문을 최대 200건까지 조회한다.
	 *
	 * @param limit 요청 건수
	 * @return 출고주문 목록
	 */
	@SuppressWarnings("rawtypes")
	public List<Map> findRecentOrders(Integer limit) {
		Long domainId = Domain.currentDomainId();
		int safeLimit = limit == null ? MAX_ORDER_COUNT : Math.max(1, Math.min(limit, MAX_ORDER_COUNT));
		String sql = """
				SELECT
					id,
					shipment_no,
					ref_order_no,
					invoice_no,
					order_date,
					cust_nm,
					orderer_nm,
					receiver_nm,
					total_item,
					total_order,
					status,
					created_at
				FROM shipment_orders
				WHERE domain_id = :domainId
				ORDER BY created_at DESC NULLS LAST, id
				""";
		return this.queryManager.selectListBySql(
				sql,
				ValueUtil.newMap("domainId", domainId),
				Map.class,
				0,
				safeLimit);
	}

	/**
	 * 기본 바코드 프린터의 연결 상태를 조회한다.
	 *
	 * @return 프린터 정보와 준비 상태
	 */
	public Map<String, Object> getPrinterStatus() {
		Long domainId = Domain.currentDomainId();
		Map<String, Object> printer = this.findDefaultBarcodePrinter(domainId);
		HostStatus hostStatus = this.requestHostStatus(printer);

		Map<String, Object> result = ValueUtil.newMap(
				"ready,printer_id,printer_name,printer_ip,printer_port,printer_driver,dpi",
				hostStatus.isReady(),
				printer.get("id"),
				printer.get("printer_nm"),
				printer.get("printer_ip"),
				this.printerPort(printer),
				printer.get("printer_driver"),
				printer.get("dpi"));
		result.put("paper_out", hostStatus.paperOut);
		result.put("paused", hostStatus.paused);
		result.put("buffer_full", hostStatus.bufferFull);
		result.put("formats_in_buffer", hostStatus.formatsInBuffer);
		result.put("labels_remaining", hostStatus.labelsRemaining);
		return result;
	}

	/**
	 * 출고주문 한 건의 송장 라벨을 출력한다.
	 *
	 * @param shipmentOrderId 출고주문 ID
	 * @return 출력 결과와 소요시간
	 */
	@SuppressWarnings("rawtypes")
	public Map<String, Object> printOne(String shipmentOrderId) {
		Long domainId = Domain.currentDomainId();
		Map<String, Object> order = this.findOrder(domainId, shipmentOrderId);
		Map<String, Object> printer = this.findDefaultBarcodePrinter(domainId);
		HostStatus beforeStatus = this.requestHostStatus(printer);
		if (!beforeStatus.isReady()) {
			throw new ElidomValidationException(this.statusErrorMessage(beforeStatus));
		}

		String zpl = this.buildZpl(order);
		long startedAt = System.nanoTime();
		this.sendZpl(printer, zpl);
		this.waitUntilPrinted(printer);
		long elapsedMs = Math.max(1L, Math.round((System.nanoTime() - startedAt) / 1_000_000.0));

		Map<String, Object> result = ValueUtil.newMap(
				"success,shipment_order_id,shipment_no,invoice_no,elapsed_ms,printer_name,printer_ip",
				true,
				order.get("id"),
				order.get("shipment_no"),
				order.get("invoice_no"),
				elapsedMs,
				printer.get("printer_nm"),
				printer.get("printer_ip"));
		return result;
	}

	/**
	 * 여러 출고주문의 라벨을 한 번의 TCP 연결로 전송하는 비동기 작업을 시작한다.
	 *
	 * @param shipmentOrderIds 출고주문 ID 목록
	 * @return 생성된 출력 작업 상태
	 */
	public synchronized Map<String, Object> startBatch(List<String> shipmentOrderIds) {
		this.cleanupCompletedJobs();
		Long domainId = Domain.currentDomainId();
		List<String> normalizedIds = this.normalizeOrderIds(shipmentOrderIds);
		String activeJobId = this.activeJobIds.get(domainId);
		PrintBatchJob activeJob = activeJobId == null ? null : this.printJobs.get(activeJobId);
		if (activeJob != null && activeJob.isActive()) {
			throw new ElidomValidationException("이미 진행 중인 라벨 출력 작업이 있습니다.");
		}

		List<Map<String, Object>> orders = new ArrayList<>();
		for (String shipmentOrderId : normalizedIds) {
			orders.add(this.findOrder(domainId, shipmentOrderId));
		}

		Map<String, Object> printer = this.findDefaultBarcodePrinter(domainId);
		HostStatus beforeStatus = this.requestHostStatus(printer);
		if (!beforeStatus.isReady()) {
			throw new ElidomValidationException(this.statusErrorMessage(beforeStatus));
		}
		if (beforeStatus.formatsInBuffer > 0 || beforeStatus.labelsRemaining > 0) {
			throw new ElidomValidationException("프린터에 아직 처리 중인 라벨이 있습니다.");
		}

		PrintBatchJob job = new PrintBatchJob(
				UUID.randomUUID().toString(),
				domainId,
				orders,
				printer);
		this.printJobs.put(job.id, job);
		this.activeJobIds.put(domainId, job.id);
		this.printExecutor.submit(() -> this.executeBatch(job));
		return this.batchStatus(job);
	}

	/**
	 * 현재 도메인의 라벨 출력 작업 상태를 조회한다.
	 *
	 * @param jobId 출력 작업 ID
	 * @return 출력 작업 상태
	 */
	public Map<String, Object> getBatchStatus(String jobId) {
		Long domainId = Domain.currentDomainId();
		PrintBatchJob job = this.printJobs.get(jobId);
		if (job == null || !domainId.equals(job.domainId)) {
			throw new ElidomValidationException("라벨 출력 작업을 찾을 수 없습니다.");
		}
		return this.batchStatus(job);
	}

	/**
	 * 애플리케이션 종료 시 출력 작업 실행기를 정리한다.
	 */
	@PreDestroy
	public void destroy() {
		this.printExecutor.shutdownNow();
	}

	/**
	 * 비동기 배치 출력 작업을 수행한다.
	 *
	 * @param job 출력 작업
	 */
	private void executeBatch(PrintBatchJob job) {
		try {
			job.start();
			StringBuilder batchZpl = new StringBuilder();
			for (Map<String, Object> order : job.orders) {
				batchZpl.append(this.buildZpl(order));
			}
			this.sendZpl(job.printer, batchZpl.toString());
			this.trackBatchProgress(job);
			job.complete();
		} catch (Exception exception) {
			job.fail(exception.getMessage());
		} finally {
			this.activeJobIds.remove(job.domainId, job.id);
		}
	}

	/**
	 * 프린터 큐 잔량을 조회하여 실제 출력 진행률을 갱신한다.
	 *
	 * @param job 출력 작업
	 */
	private void trackBatchProgress(PrintBatchJob job) {
		long maximumWaitMs = Math.max(
				PRINT_TIMEOUT_MS,
				job.totalCount * 2000L + 10000L);
		long deadline = System.currentTimeMillis() + maximumWaitMs;
		boolean busyObserved = false;
		int consecutiveIdleCount = 0;

		while (System.currentTimeMillis() < deadline) {
			HostStatus status = this.requestHostStatus(job.printer);
			if (!status.isReady()) {
				throw new ElidomValidationException(this.statusErrorMessage(status));
			}

			int remainingCount = Math.min(
					job.totalCount,
					Math.max(0, status.formatsInBuffer) + Math.max(0, status.labelsRemaining));
			boolean idle = remainingCount == 0;
			if (!idle) {
				busyObserved = true;
				consecutiveIdleCount = 0;
				job.updateCompleted(Math.min(job.totalCount - 1, job.totalCount - remainingCount));
			} else {
				consecutiveIdleCount++;
				long elapsedMs = System.currentTimeMillis() - job.startedAt;
				boolean confirmedAfterBusy = busyObserved && consecutiveIdleCount >= BATCH_IDLE_CONFIRM_COUNT;
				boolean confirmedWithoutBusy = !busyObserved && elapsedMs >= BATCH_IDLE_WITHOUT_BUSY_MS;
				if (confirmedAfterBusy || confirmedWithoutBusy) {
					job.updateCompleted(job.totalCount);
					return;
				}
			}
			this.sleep(STATUS_POLL_INTERVAL_MS);
		}

		throw new ElidomRuntimeException("프린터 배치 출력 완료 확인 시간이 초과되었습니다.");
	}

	/**
	 * 출력 작업 상태를 API 응답 형태로 변환한다.
	 *
	 * @param job 출력 작업
	 * @return 작업 상태 맵
	 */
	private Map<String, Object> batchStatus(PrintBatchJob job) {
		return job.toMap();
	}

	/**
	 * 출력할 출고주문 ID를 중복 없이 1~200건으로 검증한다.
	 *
	 * @param shipmentOrderIds 원본 출고주문 ID 목록
	 * @return 정규화된 출고주문 ID 목록
	 */
	private List<String> normalizeOrderIds(List<String> shipmentOrderIds) {
		if (ValueUtil.isEmpty(shipmentOrderIds)) {
			throw new ElidomValidationException("출력할 출고주문이 없습니다.");
		}
		Set<String> uniqueIds = new LinkedHashSet<>();
		for (String shipmentOrderId : shipmentOrderIds) {
			if (!ValueUtil.isEmpty(shipmentOrderId)) {
				String normalizedId = shipmentOrderId.trim();
				if (!normalizedId.isEmpty()) {
					uniqueIds.add(normalizedId);
				}
			}
		}
		if (uniqueIds.isEmpty()) {
			throw new ElidomValidationException("출력할 출고주문이 없습니다.");
		}
		if (uniqueIds.size() > MAX_ORDER_COUNT) {
			throw new ElidomValidationException("라벨은 한 번에 최대 200장까지 출력할 수 있습니다.");
		}
		return new ArrayList<>(uniqueIds);
	}

	/**
	 * 보관 시간이 지난 완료 작업을 메모리에서 제거한다.
	 */
	private void cleanupCompletedJobs() {
		long now = System.currentTimeMillis();
		this.printJobs.entrySet().removeIf(entry -> {
			PrintBatchJob job = entry.getValue();
			return job.finishedAt > 0 && now - job.finishedAt > COMPLETED_JOB_KEEP_MS;
		});
	}

	/**
	 * 도메인과 출고주문 ID로 단건을 조회한다.
	 *
	 * @param domainId 도메인 ID
	 * @param shipmentOrderId 출고주문 ID
	 * @return 출고주문 정보
	 */
	@SuppressWarnings({ "rawtypes", "unchecked" })
	private Map<String, Object> findOrder(Long domainId, String shipmentOrderId) {
		String sql = """
				SELECT
					id,
					shipment_no,
					ref_order_no,
					invoice_no,
					order_date,
					receiver_nm,
					total_item,
					total_order,
					status
				FROM shipment_orders
				WHERE domain_id = :domainId
				  AND id = :shipmentOrderId
				""";
		List<Map> orders = this.queryManager.selectListBySql(
				sql,
				ValueUtil.newMap("domainId,shipmentOrderId", domainId, shipmentOrderId),
				Map.class,
				0,
				1);
		if (ValueUtil.isEmpty(orders)) {
			throw new ElidomValidationException("출고주문을 찾을 수 없습니다: " + shipmentOrderId);
		}
		return orders.get(0);
	}

	/**
	 * 도메인에 등록된 기본 바코드 프린터를 조회한다.
	 *
	 * @param domainId 도메인 ID
	 * @return 프린터 설정
	 */
	@SuppressWarnings({ "rawtypes", "unchecked" })
	private Map<String, Object> findDefaultBarcodePrinter(Long domainId) {
		String sql = """
				SELECT
					id,
					printer_cd,
					printer_nm,
					printer_ip,
					printer_port,
					printer_driver,
					dpi
				FROM printers
				WHERE domain_id = :domainId
				  AND printer_type = 'BARCODE'
				  AND COALESCE(status, 'ACTIVE') <> 'INACTIVE'
				ORDER BY
					CASE WHEN default_flag IS TRUE THEN 0 ELSE 1 END,
					created_at NULLS LAST,
					id
				""";
		List<Map> printers = this.queryManager.selectListBySql(
				sql,
				ValueUtil.newMap("domainId", domainId),
				Map.class,
				0,
				1);
		if (ValueUtil.isEmpty(printers)) {
			throw new ElidomValidationException("등록된 바코드 프린터가 없습니다.");
		}
		return printers.get(0);
	}

	/**
	 * Zebra 프린터에 ZPL 문자열을 전송한다.
	 *
	 * @param printer 프린터 설정
	 * @param zpl ZPL 문자열
	 */
	private void sendZpl(Map<String, Object> printer, String zpl) {
		String host = String.valueOf(printer.get("printer_ip"));
		int port = this.printerPort(printer);
		try (Socket socket = new Socket()) {
			socket.connect(new InetSocketAddress(host, port), CONNECT_TIMEOUT_MS);
			try (OutputStream output = socket.getOutputStream()) {
				output.write(zpl.getBytes(StandardCharsets.US_ASCII));
				output.flush();
			}
		} catch (IOException exception) {
			throw new ElidomRuntimeException(
					"라벨 프린터에 연결할 수 없습니다: " + host + ":" + port + " (" + exception.getMessage() + ")");
		}
	}

	/**
	 * 라벨 전송 후 프린터 수신 버퍼와 남은 라벨 수가 0이 될 때까지 대기한다.
	 *
	 * @param printer 프린터 설정
	 */
	private void waitUntilPrinted(Map<String, Object> printer) {
		this.sleep(MIN_PRINT_WAIT_MS);
		long deadline = System.currentTimeMillis() + PRINT_TIMEOUT_MS;

		while (System.currentTimeMillis() < deadline) {
			HostStatus status = this.requestHostStatus(printer);
			if (!status.isReady()) {
				throw new ElidomValidationException(this.statusErrorMessage(status));
			}
			if (status.formatsInBuffer == 0 && status.labelsRemaining == 0) {
				return;
			}
			this.sleep(STATUS_POLL_INTERVAL_MS);
		}

		throw new ElidomRuntimeException("프린터 출력 완료 확인 시간이 초과되었습니다.");
	}

	/**
	 * Zebra Host Status(~HS)를 요청하고 응답을 파싱한다.
	 *
	 * @param printer 프린터 설정
	 * @return 파싱된 프린터 상태
	 */
	private HostStatus requestHostStatus(Map<String, Object> printer) {
		String host = String.valueOf(printer.get("printer_ip"));
		int port = this.printerPort(printer);

		try (Socket socket = new Socket()) {
			socket.connect(new InetSocketAddress(host, port), CONNECT_TIMEOUT_MS);
			socket.setSoTimeout(STATUS_TIMEOUT_MS);
			OutputStream output = socket.getOutputStream();
			output.write("~HS".getBytes(StandardCharsets.US_ASCII));
			output.flush();
			return this.parseHostStatus(this.readHostStatus(socket.getInputStream()));
		} catch (IOException exception) {
			throw new ElidomRuntimeException(
					"프린터 상태를 확인할 수 없습니다: " + host + ":" + port + " (" + exception.getMessage() + ")");
		}
	}

	/**
	 * 세 개의 ETX 문자가 수신될 때까지 Zebra 상태 응답을 읽는다.
	 *
	 * @param input 프린터 입력 스트림
	 * @return 상태 응답 문자열
	 * @throws IOException 상태 응답 수신 실패
	 */
	private String readHostStatus(InputStream input) throws IOException {
		ByteArrayOutputStream buffer = new ByteArrayOutputStream();
		int etxCount = 0;
		while (etxCount < 3) {
			int value = input.read();
			if (value < 0) {
				break;
			}
			buffer.write(value);
			if (value == 0x03) {
				etxCount++;
			}
		}
		if (etxCount < 2) {
			throw new IOException("유효한 Zebra 상태 응답을 받지 못했습니다.");
		}
		return buffer.toString(StandardCharsets.US_ASCII);
	}

	/**
	 * Zebra Host Status 응답에서 출력 진행 관련 필드를 추출한다.
	 *
	 * @param response 원본 상태 응답
	 * @return 파싱된 프린터 상태
	 */
	private HostStatus parseHostStatus(String response) {
		String normalized = response.replace("\u0002", "").replace("\u0003", "").trim();
		String[] lines = normalized.split("\\r?\\n");
		if (lines.length < 2) {
			throw new ElidomRuntimeException("Zebra 상태 응답 형식이 올바르지 않습니다.");
		}

		String[] first = lines[0].split(",", -1);
		String[] second = lines[1].split(",", -1);
		if (first.length < 6 || second.length < 9) {
			throw new ElidomRuntimeException("Zebra 상태 응답 필드가 부족합니다.");
		}

		HostStatus status = new HostStatus();
		status.paperOut = "1".equals(first[1]);
		status.paused = "1".equals(first[2]);
		status.formatsInBuffer = this.parseInt(first[4]);
		status.bufferFull = "1".equals(first[5]);
		status.labelsRemaining = this.parseInt(second[8]);
		return status;
	}

	/**
	 * 출고주문 데이터를 60 x 40 mm, 203 DPI ZPL로 변환한다.
	 *
	 * @param order 출고주문 정보
	 * @return ZPL 문자열
	 */
	private String buildZpl(Map<String, Object> order) {
		String shipmentNo = this.zplText(order.get("shipment_no"), 24);
		String refOrderNo = this.zplText(order.get("ref_order_no"), 24);
		String invoiceNo = this.zplText(order.get("invoice_no"), 20);
		String barcode = this.barcodeValue(
				ValueUtil.isEmpty(order.get("invoice_no")) ? order.get("shipment_no") : order.get("invoice_no"));
		if (ValueUtil.isEmpty(invoiceNo)) {
			invoiceNo = barcode;
		}

		return """
				^XA
				^CI27
				^PW480
				^LL320
				^LH0,0
				^PR5
				^FO20,15^GB440,290,3^FS
				^FO35,28^A0N,28,28^FDOPERATO WMS^FS
				^FO365,30^A0N,22,22^FDLABEL^FS
				^FO20,65^GB440,2,2^FS
				^FO35,82^A0N,22,22^FDSHIPMENT^FS
				^FO170,82^A0N,22,22^FD%s^FS
				^FO35,116^A0N,22,22^FDORDER^FS
				^FO170,116^A0N,22,22^FD%s^FS
				^FO35,150^A0N,22,22^FDINVOICE^FS
				^FO170,150^A0N,25,25^FD%s^FS
				^FO55,190^BY2,3,65^BCN,65,Y,N,N^FD%s^FS
				^PQ1,0,1,N
				^XZ
				""".formatted(shipmentNo, refOrderNo, invoiceNo, barcode);
	}

	/**
	 * ZPL 필드에 사용할 ASCII 문자열을 정리한다.
	 *
	 * @param value 원본 값
	 * @param maxLength 최대 길이
	 * @return 정리된 문자열
	 */
	private String zplText(Object value, int maxLength) {
		String source = value == null ? "" : String.valueOf(value);
		StringBuilder result = new StringBuilder();
		for (int index = 0; index < source.length() && result.length() < maxLength; index++) {
			char character = source.charAt(index);
			if (character >= 32 && character <= 126 && character != '^' && character != '~') {
				result.append(character);
			} else if (!Character.isWhitespace(character)) {
				result.append('?');
			}
		}
		return result.toString();
	}

	/**
	 * Code 128 바코드에 사용할 값을 정리한다.
	 *
	 * @param value 원본 값
	 * @return 바코드 값
	 */
	private String barcodeValue(Object value) {
		String source = value == null ? "" : String.valueOf(value);
		String barcode = source.replaceAll("[^A-Za-z0-9._-]", "");
		if (barcode.length() > 24) {
			barcode = barcode.substring(0, 24);
		}
		return ValueUtil.isEmpty(barcode) ? "NO-INVOICE" : barcode;
	}

	/**
	 * 프린터 포트를 안전하게 변환한다.
	 *
	 * @param printer 프린터 설정
	 * @return TCP 포트
	 */
	private int printerPort(Map<String, Object> printer) {
		Object value = printer.get("printer_port");
		if (value == null) {
			return DEFAULT_PRINTER_PORT;
		}
		int port = value instanceof Number ? ((Number) value).intValue() : this.parseInt(String.valueOf(value));
		return port > 0 && port <= 65535 ? port : DEFAULT_PRINTER_PORT;
	}

	/**
	 * 숫자 문자열을 정수로 변환한다.
	 *
	 * @param value 숫자 문자열
	 * @return 변환 값
	 */
	private int parseInt(String value) {
		try {
			return Integer.parseInt(value.trim());
		} catch (NumberFormatException exception) {
			return 0;
		}
	}

	/**
	 * 지정한 시간 동안 현재 스레드를 대기시킨다.
	 *
	 * @param milliseconds 대기 시간
	 */
	private void sleep(long milliseconds) {
		try {
			Thread.sleep(milliseconds);
		} catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			throw new ElidomRuntimeException("라벨 출력 대기가 중단되었습니다.");
		}
	}

	/**
	 * 프린터 상태를 사용자 메시지로 변환한다.
	 *
	 * @param status 프린터 상태
	 * @return 오류 메시지
	 */
	private String statusErrorMessage(HostStatus status) {
		if (status.paperOut) {
			return "라벨 용지가 없습니다.";
		}
		if (status.paused) {
			return "프린터가 일시정지 상태입니다.";
		}
		if (status.bufferFull) {
			return "프린터 수신 버퍼가 가득 찼습니다.";
		}
		return "프린터가 출력 준비 상태가 아닙니다.";
	}

	/**
	 * Zebra Host Status 파싱 결과
	 */
	private static class HostStatus {
		private boolean paperOut;
		private boolean paused;
		private boolean bufferFull;
		private int formatsInBuffer;
		private int labelsRemaining;

		/**
		 * 프린터가 출력 가능한 상태인지 확인한다.
		 *
		 * @return 준비 상태
		 */
		private boolean isReady() {
			return !this.paperOut && !this.paused && !this.bufferFull;
		}
	}

	/**
	 * 메모리에서 관리하는 라벨 배치 출력 작업
	 */
	private static class PrintBatchJob {
		private final String id;
		private final Long domainId;
		private final List<Map<String, Object>> orders;
		private final Map<String, Object> printer;
		private final int totalCount;
		private volatile String status;
		private volatile int completedCount;
		private volatile int failedCount;
		private volatile long startedAt;
		private volatile long finishedAt;
		private volatile long lastProgressAt;
		private volatile long lastLabelElapsedMs;
		private volatile long averageLabelElapsedMs;
		private volatile String errorMessage;

		/**
		 * 출력 작업을 생성한다.
		 *
		 * @param id 작업 ID
		 * @param domainId 도메인 ID
		 * @param orders 출고주문 목록
		 * @param printer 프린터 설정
		 */
		private PrintBatchJob(
				String id,
				Long domainId,
				List<Map<String, Object>> orders,
				Map<String, Object> printer) {
			this.id = id;
			this.domainId = domainId;
			this.orders = orders;
			this.printer = printer;
			this.totalCount = orders.size();
			this.status = "QUEUED";
		}

		/**
		 * 작업을 출력 중 상태로 전환한다.
		 */
		private synchronized void start() {
			this.status = "PRINTING";
			this.startedAt = System.currentTimeMillis();
			this.lastProgressAt = this.startedAt;
		}

		/**
		 * 완료 수량과 장당 출력시간을 갱신한다.
		 *
		 * @param newCompletedCount 새 완료 수량
		 */
		private synchronized void updateCompleted(int newCompletedCount) {
			int safeCount = Math.max(this.completedCount, Math.min(newCompletedCount, this.totalCount));
			int delta = safeCount - this.completedCount;
			if (delta <= 0) {
				return;
			}
			long now = System.currentTimeMillis();
			this.lastLabelElapsedMs = Math.max(1L, (now - this.lastProgressAt) / delta);
			this.completedCount = safeCount;
			this.lastProgressAt = now;
			this.averageLabelElapsedMs = Math.max(1L, (now - this.startedAt) / this.completedCount);
		}

		/**
		 * 작업을 완료 상태로 전환한다.
		 */
		private synchronized void complete() {
			this.updateCompleted(this.totalCount);
			this.status = "COMPLETED";
			this.finishedAt = System.currentTimeMillis();
			if (this.totalCount > 0) {
				this.averageLabelElapsedMs = Math.max(
						1L,
						(this.finishedAt - this.startedAt) / this.totalCount);
			}
		}

		/**
		 * 작업을 실패 상태로 전환한다.
		 *
		 * @param message 실패 메시지
		 */
		private synchronized void fail(String message) {
			this.status = "FAILED";
			this.failedCount = this.totalCount - this.completedCount;
			this.errorMessage = ValueUtil.isEmpty(message) ? "라벨 출력 중 오류가 발생했습니다." : message;
			this.finishedAt = System.currentTimeMillis();
		}

		/**
		 * 작업이 진행 중인지 확인한다.
		 *
		 * @return 진행 중 여부
		 */
		private boolean isActive() {
			return "QUEUED".equals(this.status) || "PRINTING".equals(this.status);
		}

		/**
		 * 작업 상태를 API 응답 맵으로 변환한다.
		 *
		 * @return 작업 상태 맵
		 */
		private synchronized Map<String, Object> toMap() {
			long now = this.finishedAt > 0 ? this.finishedAt : System.currentTimeMillis();
			long totalElapsedMs = this.startedAt > 0 ? Math.max(0L, now - this.startedAt) : 0L;
			int currentIndex = this.completedCount < this.totalCount ? this.completedCount : -1;
			Object currentShipmentNo = currentIndex >= 0
					? this.orders.get(currentIndex).get("shipment_no")
					: null;
			Map<String, Object> result = ValueUtil.newMap(
					"job_id,status,total_count,completed_count,failed_count,current_index,current_shipment_no,last_label_elapsed_ms,average_label_elapsed_ms,total_elapsed_ms,error_message,printer_name,printer_ip",
					this.id,
					this.status,
					this.totalCount,
					this.completedCount,
					this.failedCount,
					currentIndex,
					currentShipmentNo,
					this.lastLabelElapsedMs,
					this.averageLabelElapsedMs,
					totalElapsedMs,
					this.errorMessage,
					this.printer.get("printer_nm"),
					this.printer.get("printer_ip"));
			return result;
		}
	}
}
