import { ServiceUtil } from '@operato-app/metapage/dist-client'

/**
 * 공통코드 캐시 모듈
 *
 * 공통코드 API 조회 결과를 메모리에 캐싱하여
 * 동일한 코드 그룹에 대한 중복 API 호출을 방지한다.
 *
 * - codeName → Map<name, description> 형태로 캐싱
 * - 동시에 같은 codeName 요청이 오면 하나의 Promise를 공유 (중복 요청 방지)
 */

/** 캐시 저장소: codeName → Map<string, string> */
const _cache = new Map()

/** 진행 중인 fetch 요청 (중복 방지): codeName → Promise */
const _pending = new Map()

/**
 * 공통코드 맵을 반환한다. 캐시된 경우 즉시 반환하고, 없으면 API를 조회한다.
 *
 * @param {string} codeName - 공통코드 그룹명 (예: 'INBOUND_TYPE', 'DISPOSITION_TYPE')
 * @returns {Promise<Map<string, string>>} name → description 맵
 *
 * @example
 * const map = await fetchCodeMap('INBOUND_TYPE')
 * const label = map.get('1') // '보세 입고'
 */
export async function fetchCodeMap(codeName) {
  if (!codeName) return new Map()
  if (_cache.has(codeName)) return _cache.get(codeName)
  if (_pending.has(codeName)) return _pending.get(codeName)

  const promise = ServiceUtil.codeItems(codeName)
    .then(result => {
      const map = new Map()
      const items = result?.items || []
      for (const item of items) {
        map.set(String(item.name), item.description || item.name)
      }
      _cache.set(codeName, map)
      _pending.delete(codeName)
      return map
    })
    .catch(err => {
      _pending.delete(codeName)
      console.warn(`[CommonCodeCache] 공통코드 로드 실패: codeName="${codeName}"`, err)
      return new Map()
    })

  _pending.set(codeName, promise)
  return promise
}

/**
 * 공통코드 items 배열을 반환한다. 드롭다운 옵션 목록 구성에 사용.
 *
 * @param {string} codeName - 공통코드 그룹명
 * @returns {Promise<Array<{name: string, description: string, rank: number}>>}
 *
 * @example
 * const items = await fetchCodeItems('LOCATION_TYPE')
 * // [{ name: 'RETURN-GOOD', description: '반품 양품', rank: 90 }, ...]
 */
export async function fetchCodeItems(codeName) {
  if (!codeName) return []
  const result = await ServiceUtil.codeItems(codeName)
  return result?.items || []
}

/**
 * 캐시를 초기화한다.
 *
 * @param {string} [codeName] - 특정 코드만 초기화. 생략 시 전체 초기화.
 *
 * @example
 * clearCodeCache('INBOUND_TYPE') // 특정 코드 초기화
 * clearCodeCache()               // 전체 초기화
 */
export function clearCodeCache(codeName) {
  if (codeName) {
    _cache.delete(codeName)
    _pending.delete(codeName)
  } else {
    _cache.clear()
    _pending.clear()
  }
}
