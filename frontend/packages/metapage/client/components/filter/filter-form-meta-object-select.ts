import '@material/web/icon/icon.js'

import { html } from 'lit-html'
import { openPopup } from '@operato/layout'
import { TermsUtil } from '../../utils/terms-util'

import '../popup/ox-resource-selector-popup'
import { FilterSelectRenderer } from '@operato/form'

/**
 * @description Search Form 용 리소스 셀렉터 팝업 실행
 ************************************************
 * @param {Object} filter
 * @param {*} value
 * @param {Function} confirmCallback
 */
function openMetaObjectSelector(filter, value, confirmCallback) {
  // 그리드 컬럼의 필터 정보를 추출
  const { screen_meta } = filter.options

  // 템플릿 구성
  let template = html`
    <ox-resource-selector-popup
      .value=${value}
      .column_meta=${filter}
      .screen_meta=${screen_meta}
      .confirmCallback=${confirmCallback}>
    </ox-resource-selector-popup>`

  // 리소스 셀렉터 팝업 실행
  openPopup(template, {
    backdrop: true,
    size: 'large',
    title: TermsUtil.tLabel(filter.name)
  })
}

/**
 * @description Search Form 용 리소스 셀렉터 :
 *   필터 폼에 input 컴포넌트로 추가되지만 사용자가 컴포넌트 클릭시 오브젝트 셀렉터 팝업이 실행되어서
 *   팝업에서 값을 선택할 수 있는 편집기
 ********************************************************************************
 * @param {Object} filter
 * @param {*} value
 * @param {Object} owner
 * @returns
 */
export const FilterFormMetaObjectSelect: FilterSelectRenderer = (filter, value, owner) => {
  const { name, operator = 'eq', options } = filter
  const { nameField } = options || ({} as any)
  const hiddenText = value ? value.id : ''
  var text = ''

  if (value) {
    let fields = nameField.split(',')
    text = value[fields[0]]

    if (fields.length > 1) {
      text += `(${fields.splice(1).map(field => {
        return value[field]
      }).join(',')})`
    }
  }

  return operator === 'eq' ? html`
    <input name="${name}" .value=${hiddenText} type="text" hidden />
    <input
      type="text"
      readonly
      name="${name}_disp"
      .value=${text}
      @click=${e => {
        e.stopPropagation()
        const input = e.target

        const confirmCallback = selected => {
          let code = selected ? selected.id : ''
          let disp = ''

          if (selected) {
            let fields = nameField.split(',')
            disp = selected[fields[0]]

            if (fields.length > 1) {
              disp += `(${fields.splice(1).map(field => {
                return selected[field]
              }).join(',')})`
            }
          }

          input.value = disp
          let codeInput = owner.tagName.toLowerCase() == 'ox-grid-header'
            ? //@ts-ignore owner element를 전제하지 않는 방법이 필요할 것이다.
              owner.renderRoot.querySelector(`[name="${name}"]`)
            : //@ts-ignore owner element를 전제하지 않는 방법이 필요할 것이다.
              owner.renderRoot.querySelector(`form [name="${name}"]`)
          codeInput.value = code

          // change 이벤트 발생
          input.dispatchEvent(new Event('change', { bubbles: true }))

          // filter-change 이벤트 발생
          input.dispatchEvent(
            new CustomEvent('filter-change', {
              bubbles: true,
              composed: true,
              detail: {
                name: name,
                operator,
                value: code
              }
            })
          )
        }

        // 리소스 셀렉터 팝업 실행
        openMetaObjectSelector(filter, value, confirmCallback)
      }}
    />
    <md-icon style="--md-icon-size: 18px;margin-left: -24px;">manage_search</md-icon>
  ` : html``
}