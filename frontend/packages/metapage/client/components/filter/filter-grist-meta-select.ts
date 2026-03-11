import '@operato/input/ox-checkbox.js'

import { html } from 'lit'
import { until } from 'lit/directives/until.js'
import {
  FilterConfigObject,
  FilterOperator,
  FilterSelectRenderer,
  SelectOption,
  SelectOptionObject,
  OxFiltersForm
} from '@operato/data-grist'
import { ValueUtil } from '../../utils/value-util'

/**
 * @description 그리드 기반 콤보 리소스 콤보 실행
 ***********************************************
 * @param {any[]} options
 * @param {any} column
 * @param {any} filterValues
 * @param {FilterOperator} operator
 */
function buildOptions(options: any[], column: any, filterValues: any, operator?: FilterOperator) {
  var refParams = [] as string[]

  // 관계 필드 풀기
  if (column.ref_params && column.ref_params != '') {
    var refParamArr = column.ref_params.split(',').filter(x => x.includes(':') == true)

    refParams.push(
      refParamArr.map(param => {
        return param.substring(param.indexOf(':') + 1)
      })
    )
  }

  const selectOptionObjects = options
    .filter(option => {
      // 관계 필드가 없다 return all
      if (refParams.length == 0) return true

      // 셀렉트 옵션에 전체('') 값이 포함되어 있다 return true
      if (option.value == '') return true

      if (filterValues) {
        // 관계 필드 값에 따라 데이터 필더링
        for (var idx = 0; idx < refParams.length; idx++) {
          var checkVal = filterValues[refParams[idx]]
          if (Array.isArray(checkVal)) {
            checkVal = checkVal.join('::')
          }

          if (ValueUtil.isNotEmpty(checkVal)) {
            var fieldIdx = idx + 1
            if (!ValueUtil.isEquals(checkVal, option['rel_field_' + fieldIdx])) {
              return false
            }
          }
        }
      }

      return true
    })
    .map(option => {
      switch (typeof option) {
        case 'string':
          return {
            display: option,
            value: option
          }
        case 'object':
          return {
            display: option.display || option.name,
            value: option.value
          }
        default:
          return option
      }
    }) as SelectOptionObject[]

  return operator === 'in'
    ? html`
        ${selectOptionObjects
          ?.filter(option => !!option)
          .map(
            ({ value, display, name }) => html` <ox-checkbox option value=${value}>${display || name}</ox-checkbox> `
          )}
      `
    : html`
        ${selectOptionObjects?.map(
          ({ value, display, name }) => html` <div option value=${value}>${display || name}&nbsp;</div> `
        )}
      `
}

export const FilterGristMetaSelect: FilterSelectRenderer = (column, value, owner) => {
  /* value는 filters-form이나 grid-header에서 처리되므로 이 곳에서는 무시한다. */
  const filter = column.filter as FilterConfigObject
  const operator = filter?.operator
  const form = owner as OxFiltersForm | any

  const filterValues = form instanceof OxFiltersForm ? form.getFormObjectValue() : {}
  var options = filter?.options || column.record.options || []

  if (typeof options === 'function') {
    if (!filter?.options) {
      console.warn(
        'ox-grist의 column.filter 속성에서는 column.record.options의 함수형 options을 사용할 수 없으므로, filter 속성에서 재지정해야한다.'
      )
    }
    options = options.call(null, value, column, filterValues, owner)
    if (options instanceof Promise) {
      return html`${until(options.then(options => buildOptions(options, column, filterValues, operator)))}`
    } else {
      return buildOptions((options || []) as SelectOption[], column, filterValues, operator)
    }
  } else {
    return buildOptions((options || []) as SelectOption[], column, filterValues, operator)
  }
}
