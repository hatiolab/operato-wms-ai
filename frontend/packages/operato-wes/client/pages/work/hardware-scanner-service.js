/**
 * 하드웨어 바코드 스캐너 서비스
 *
 * 키보드 웨지(Keyboard Wedge) 모드의 하드웨어 바코드 스캐너 입력을
 * document 레벨에서 감지하여 등록된 콜백으로 전달.
 *
 * 창고 환경에서 작업자가 화면의 입력 필드를 탭하지 않고
 * 바로 스캔할 때도 바코드 데이터를 캡처.
 *
 * 감지 알고리즘:
 * - 키 입력 간격 < maxKeystrokeInterval (기본 50ms)
 * - Enter 키로 종료
 * - 전체 입력 < maxScanDuration (기본 500ms)
 * - 문자 수 >= minLength (기본 3)
 *
 * OxInputBarcode 컴포넌트와 충돌 방지:
 * - OxInputBarcode 내부 input에 포커스 시 SKIP
 * - 일반 input/textarea 포커스 시 SKIP
 *
 * 사용법:
 *   import { HardwareScannerService } from './hardware-scanner-service.js'
 *
 *   // 페이지 활성화 시
 *   this._scannerService = new HardwareScannerService({
 *     onScan: (barcode) => this._handleGlobalScan(barcode)
 *   })
 *   this._scannerService.start()
 *
 *   // 페이지 비활성화 시
 *   this._scannerService.stop()
 */
export class HardwareScannerService {
  /**
   * @param {Object} options
   * @param {Function} options.onScan - 바코드 스캔 완료 콜백 (barcode: string)
   * @param {number} [options.minLength=3] - 유효 바코드 최소 길이
   * @param {number} [options.maxKeystrokeInterval=50] - 키 입력 간격 한계 (ms)
   * @param {number} [options.maxScanDuration=500] - 스캔 전체 시간 한계 (ms)
   */
  constructor(options = {}) {
    this._onScan = options.onScan || (() => {})
    this._minLength = options.minLength || 3
    this._maxKeystrokeInterval = options.maxKeystrokeInterval || 50
    this._maxScanDuration = options.maxScanDuration || 500

    this._buffer = ''
    this._lastKeyTime = 0
    this._scanStartTime = 0
    this._isListening = false

    this._keydownHandler = this._onKeydown.bind(this)
  }

  /** document keydown 리스너 등록 */
  start() {
    if (this._isListening) return
    this._isListening = true
    this._resetBuffer()
    document.addEventListener('keydown', this._keydownHandler, true)
  }

  /** document keydown 리스너 해제 */
  stop() {
    if (!this._isListening) return
    this._isListening = false
    document.removeEventListener('keydown', this._keydownHandler, true)
    this._resetBuffer()
  }

  /** 버퍼 초기화 */
  _resetBuffer() {
    this._buffer = ''
    this._lastKeyTime = 0
    this._scanStartTime = 0
  }

  /**
   * document keydown 이벤트 핸들러
   *
   * 1. 포커스된 input/textarea 내부이면 SKIP (일반 입력 또는 OxInputBarcode 처리)
   * 2. Enter 키 → 버퍼 유효성 검증 후 콜백 호출
   * 3. 단일 문자 키 → 버퍼 축적 (간격 초과 시 리셋)
   * 4. Modifier/기능 키 → 무시
   */
  _onKeydown(event) {
    // IME 조합 중이면 무시
    if (event.isComposing) return

    // 포커스된 입력 필드가 있으면 SKIP
    if (this._isInputFocused(event)) return

    const now = Date.now()

    // Enter 키 — 스캔 완료 판정
    if (event.key === 'Enter') {
      if (
        this._buffer.length >= this._minLength &&
        now - this._scanStartTime < this._maxScanDuration
      ) {
        // 유효한 스캔
        event.preventDefault()
        event.stopPropagation()
        const barcode = this._buffer.trim()
        this._resetBuffer()
        this._onScan(barcode)
      } else {
        this._resetBuffer()
      }
      return
    }

    // Modifier 키 (Shift, Ctrl, Alt, Meta 등) — 버퍼 유지, 무시
    if (event.key.length > 1) return

    // Ctrl/Alt/Meta 조합 — 무시
    if (event.ctrlKey || event.altKey || event.metaKey) return

    // 단일 문자 키 — 버퍼에 축적
    if (this._buffer.length > 0 && now - this._lastKeyTime > this._maxKeystrokeInterval) {
      // 이전 입력으로부터 간격이 너무 길면 수동 입력으로 간주 → 리셋
      this._resetBuffer()
    }

    if (this._buffer.length === 0) {
      this._scanStartTime = now
    }

    this._buffer += event.key
    this._lastKeyTime = now

    // 전역 스캔 중 문자가 다른 곳에 입력되지 않도록 방지
    event.preventDefault()
  }

  /**
   * 입력 필드에 포커스가 있는지 확인
   *
   * composedPath를 사용하여 Shadow DOM 내부의 input도 감지.
   * OxInputBarcode, 일반 input, textarea, select 모두 SKIP 대상.
   */
  _isInputFocused(event) {
    const path = event.composedPath()

    for (const el of path) {
      if (!el.tagName) continue
      const tag = el.tagName.toUpperCase()

      // input, textarea, select에 포커스가 있으면 해당 요소가 처리
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true

      // contenteditable 요소
      if (el.isContentEditable) return true
    }

    return false
  }
}
