/**
 * VAS SSE(Server-Sent Events) 클라이언트 싱글톤
 *
 * 서버에서 푸시하는 VAS 주문 상태 변경 이벤트를 수신.
 * 여러 화면(vas-work-monitor, vas-home 등)에서 공유 사용.
 *
 * 사용법:
 *   import { vasEventClient } from './vas-event-client'
 *
 *   // 페이지 활성화 시
 *   vasEventClient.connect()
 *   vasEventClient.on('*', this._boundHandler)
 *
 *   // 페이지 해제 시
 *   vasEventClient.off('*', this._boundHandler)
 *   vasEventClient.disconnect()
 */
class VasEventClient {
  constructor() {
    this._eventSource = null
    this._listeners = new Map() // eventType → Set<callback>
    this._refCount = 0
    this._connected = false
  }

  /** SSE 연결 상태 */
  get connected() {
    return this._connected
  }

  /**
   * 연결 요청 (참조 카운트 기반)
   * 첫 connect 시 실제 EventSource 연결, 이후엔 카운트만 증가.
   */
  connect() {
    this._refCount++
    if (!this._eventSource) {
      this._doConnect()
    }
  }

  /**
   * 연결 해제 요청 (참조 카운트 기반)
   * 마지막 disconnect 시 실제 EventSource 종료.
   */
  disconnect() {
    this._refCount = Math.max(0, this._refCount - 1)
    if (this._refCount <= 0) {
      this._doDisconnect()
    }
  }

  /**
   * 이벤트 리스너 등록
   * @param {string} eventType - 이벤트 타입 ('*'이면 모든 이벤트)
   * @param {Function} callback - 이벤트 핸들러 (event data 객체 전달)
   */
  on(eventType, callback) {
    if (!this._listeners.has(eventType)) {
      this._listeners.set(eventType, new Set())
    }
    this._listeners.get(eventType).add(callback)
  }

  /**
   * 이벤트 리스너 해제
   * @param {string} eventType - 이벤트 타입
   * @param {Function} callback - 등록했던 핸들러
   */
  off(eventType, callback) {
    const set = this._listeners.get(eventType)
    if (set) {
      set.delete(callback)
      if (set.size === 0) {
        this._listeners.delete(eventType)
      }
    }
  }

  /** 실제 EventSource 연결 */
  _doConnect() {
    const baseUrl = this._getBaseUrl()
    if (!baseUrl) {
      console.warn('[VasEventClient] REST baseUrl을 찾을 수 없습니다.')
      return
    }

    try {
      this._eventSource = new EventSource(`${baseUrl}/vas_trx/events/subscribe`, {
        withCredentials: true
      })

      // 연결 성공 (named event: 'connected')
      this._eventSource.addEventListener('connected', () => {
        this._connected = true
        this._notifyConnectionChange(true)
      })

      // VAS 이벤트 수신 (named event: 'vas-event')
      this._eventSource.addEventListener('vas-event', e => {
        try {
          const data = JSON.parse(e.data)
          this._dispatchToListeners(data)
        } catch (err) {
          console.error('[VasEventClient] 이벤트 파싱 실패:', err)
        }
      })

      // 하트비트 (연결 유지 확인)
      this._eventSource.addEventListener('heartbeat', () => {
        if (!this._connected) {
          this._connected = true
          this._notifyConnectionChange(true)
        }
      })

      // 에러 (자동 재연결은 EventSource 내장)
      this._eventSource.onerror = () => {
        if (this._connected) {
          this._connected = false
          this._notifyConnectionChange(false)
        }
      }
    } catch (err) {
      console.error('[VasEventClient] 연결 실패:', err)
    }
  }

  /** 실제 EventSource 종료 */
  _doDisconnect() {
    if (this._eventSource) {
      this._eventSource.close()
      this._eventSource = null
    }
    this._connected = false
    this._refCount = 0
  }

  /**
   * 등록된 리스너에 이벤트 전달
   * '*' 리스너와 특정 eventType 리스너 모두 호출.
   */
  _dispatchToListeners(data) {
    // '*' (와일드카드) 리스너
    const allListeners = this._listeners.get('*')
    if (allListeners) {
      allListeners.forEach(cb => {
        try {
          cb(data)
        } catch (e) {
          console.error('[VasEventClient] 리스너 에러:', e)
        }
      })
    }

    // 특정 eventType 리스너
    if (data.eventType) {
      const specificListeners = this._listeners.get(data.eventType)
      if (specificListeners) {
        specificListeners.forEach(cb => {
          try {
            cb(data)
          } catch (e) {
            console.error('[VasEventClient] 리스너 에러:', e)
          }
        })
      }
    }
  }

  /** 연결 상태 변경을 '_connection' 리스너에 통지 */
  _notifyConnectionChange(connected) {
    const listeners = this._listeners.get('_connection')
    if (listeners) {
      listeners.forEach(cb => {
        try {
          cb({ connected })
        } catch (e) { /* 무시 */ }
      })
    }
  }

  /**
   * REST API 베이스 URL 추출
   * ServiceUtil의 내부 설정 또는 window.__operato_config__에서 가져옴.
   * 개발: http://localhost:9191/rest
   */
  _getBaseUrl() {
    // 1. 전역 설정에서 추출
    if (window.__operato_config__?.operato?.baseUrl) {
      return window.__operato_config__.operato.baseUrl
    }

    // 2. 현재 호스트 기반 추론 (같은 오리진이면 /rest)
    if (location.port === '9191') {
      return `${location.protocol}//${location.host}/rest`
    }

    // 3. 개발 환경 기본값 (프론트:5907 → 백엔드:9191)
    return `${location.protocol}//${location.hostname}:9191/rest`
  }
}

/** 싱글톤 인스턴스 */
export const vasEventClient = new VasEventClient()
