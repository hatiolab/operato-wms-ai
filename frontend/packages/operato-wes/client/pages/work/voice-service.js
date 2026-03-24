/**
 * VAS/RWA PDA 음성 안내 서비스 (싱글톤)
 *
 * Web Speech API 기반 음성 합성 + AudioContext 효과음.
 * PDA 작업 화면에서 공유 사용하여 코드 중복을 제거하고
 * 일관된 음성 안내를 제공.
 *
 * 기능:
 * - 음성 ON/OFF 토글 (localStorage 영속)
 * - 성공/실패/경고/안내 유형별 효과음 + 음성
 * - 중복 발화 방지 (이전 발화 취소 후 새 발화)
 * - 능동적 작업 안내 (다음 단계 알림)
 *
 * 사용법:
 *   import { voiceService } from './voice-service.js'
 *
 *   voiceService.guide('바코드를 스캔해주세요')
 *   voiceService.success('피킹 완료')
 *   voiceService.error('자재를 찾을 수 없습니다')
 *   voiceService.warning('요청 수량을 초과합니다')
 *   voiceService.toggle()  // ON/OFF 전환
 */

const STORAGE_KEY = 'voiceGuideEnabled'

class VoiceService {
  constructor() {
    this._enabled = localStorage.getItem(STORAGE_KEY) !== 'false'
    this._lang = 'ko-KR'
    this._rate = 1.1
    this._volume = 1.0
  }

  /** 음성 안내 활성화 여부 */
  get enabled() {
    return this._enabled
  }

  set enabled(val) {
    this._enabled = !!val
    localStorage.setItem(STORAGE_KEY, this._enabled)
  }

  /** 음성 ON/OFF 토글 — 현재 상태 반환 */
  toggle() {
    this.enabled = !this._enabled
    return this._enabled
  }

  /* ============================================================
   * 음성 유형별 메서드
   * ============================================================ */

  /** 작업 안내 — 다음 단계 알림 (효과음 없음, 음성만) */
  guide(text) {
    this._speak(text)
  }

  /** 성공 — 높은 톤 효과음 + 음성 */
  success(text) {
    this._beep(800, 0.15)
    this._speak(text)
  }

  /** 실패 — 낮은 톤 효과음 + 음성 */
  error(text) {
    this._beep(400, 0.25)
    this._speak(text)
  }

  /** 경고 — 중간 톤 효과음 + 음성 */
  warning(text) {
    this._beep(600, 0.15)
    this._speak(text)
  }

  /** 정보 — 효과음 없음, 음성만 (guide와 동일) */
  info(text) {
    this._speak(text)
  }

  /** 현재 발화 즉시 중단 */
  cancel() {
    try {
      window.speechSynthesis?.cancel()
    } catch (e) { /* 무시 */ }
  }

  /* ============================================================
   * 내부 구현
   * ============================================================ */

  /** Web Speech API 음성 합성 */
  _speak(text) {
    if (!this._enabled) return
    if (!text) return

    try {
      if (!('speechSynthesis' in window)) return

      // 이전 발화 취소 (중복 방지)
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = this._lang
      utterance.rate = this._rate
      utterance.volume = this._volume
      window.speechSynthesis.speak(utterance)
    } catch (e) {
      // 음성 합성 미지원 환경 — 무시
    }
  }

  /** AudioContext 효과음 (비프) */
  _beep(frequency, duration) {
    if (!this._enabled) return

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return

      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = frequency
      gain.gain.value = 0.1
      osc.start()
      osc.stop(ctx.currentTime + duration)
    } catch (e) {
      // AudioContext 미지원 환경 — 무시
    }
  }
}

/** 싱글톤 인스턴스 */
export const voiceService = new VoiceService()
