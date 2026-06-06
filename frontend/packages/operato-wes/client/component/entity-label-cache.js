import { ServiceUtil } from '@operato-app/metapage/dist-client'

/**
 * 엔티티 라벨 캐시 모듈
 *
 * 임의의 테이블에서 특정 컬럼값(keyCol)에 해당하는 표시값(displayCol)을 조회하고
 * 결과를 메모리에 캐싱하여 중복 API 호출을 방지한다.
 *
 * - 캐시 키: `${table}:${keyCol}:${displayCol}` → Map<value, label>
 * - 동일 요청이 동시에 여러 곳에서 오면 하나의 Promise 를 공유 (중복 요청 방지)
 */

/** 캐시 저장소: `${table}:${keyCol}:${displayCol}` → Map<value, label> */
const _tableMap = new Map()

/** 진행 중인 fetch 요청 (중복 방지): `${table}:${keyCol}:${displayCol}:${value}` → Promise */
const _pending = new Map()

/**
 * 테이블에서 특정 컬럼값에 해당하는 표시값을 조회한다.
 * 캐시에 있으면 즉시 반환하고, 없으면 API 를 호출한다.
 *
 * @param {string} table      - 조회할 테이블명 (예: 'companies', 'warehouses', 'customers')
 * @param {string} keyCol     - 검색 기준 컬럼명 (예: 'com_cd', 'wh_cd', 'cust_cd')
 * @param {string} displayCol - 표시할 컬럼명 (예: 'com_nm', 'wh_nm', 'cust_nm')
 * @param {string} value      - 검색할 값 (예: 'GRAIN_ON')
 * @returns {Promise<string>} 표시값. 조회 실패 시 value 를 그대로 반환.
 *
 * @example
 * const nm = await fetchEntityLabel('companies', 'com_cd', 'com_nm', 'GRAIN_ON')
 * // → '(주)로지온코리아'
 *
 * const whNm = await fetchEntityLabel('warehouses', 'wh_cd', 'wh_nm', 'WH001')
 * // → '로지온 물류센터'
 */
export async function fetchEntityLabel(table, keyCol, displayCol, value) {
  if (!table || !keyCol || !displayCol) return value ?? ''
  if (value === undefined || value === null || value === '') return ''

  const mapKey  = `${table}:${keyCol}:${displayCol}`
  const fullKey = `${mapKey}:${value}`

  // 캐시 히트
  const cached = _tableMap.get(mapKey)
  if (cached && cached.has(String(value))) return cached.get(String(value))

  // 진행 중인 요청 공유
  if (_pending.has(fullKey)) return _pending.get(fullKey)

  const promise = ServiceUtil.searchByPagination(
    table,
    [{ name: keyCol, value: String(value), operator: 'eq' }],
    null, 1, 1
  )
    .then(result => {
      const item   = result?.items?.[0]
      const label  = item ? (item[displayCol] ?? String(value)) : String(value)
      if (!_tableMap.has(mapKey)) _tableMap.set(mapKey, new Map())
      _tableMap.get(mapKey).set(String(value), label)
      _pending.delete(fullKey)
      return label
    })
    .catch(() => {
      _pending.delete(fullKey)
      return String(value)
    })

  _pending.set(fullKey, promise)
  return promise
}

/**
 * 캐시를 초기화한다.
 *
 * @param {string} [table] - 특정 테이블만 초기화. 생략 시 전체 초기화.
 *
 * @example
 * clearEntityLabelCache('companies') // companies 관련 캐시만 초기화
 * clearEntityLabelCache()            // 전체 초기화
 */
export function clearEntityLabelCache(table) {
  if (table) {
    for (const key of [..._tableMap.keys()]) {
      if (key.startsWith(`${table}:`)) _tableMap.delete(key)
    }
    for (const key of [..._pending.keys()]) {
      if (key.startsWith(`${table}:`)) _pending.delete(key)
    }
  } else {
    _tableMap.clear()
    _pending.clear()
  }
}
