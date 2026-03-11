import { LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

import { MetaGristMixin } from '@operato-app/metapage/dist-client/mixin/meta-grist-mixin'

import { UiUtil } from '@operato-app/metapage/dist-client/utils/ui-util'
import { ValueUtil } from '@operato-app/metapage/dist-client/utils/value-util'
import { ServiceUtil } from '@operato-app/metapage/dist-client/utils/service-util'
import { TermsUtil } from '@operato-app/metapage/dist-client/utils/terms-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 역할 관리 화면 > 메뉴 권한 상세 화면
 */
export class SystemRoleMenuDetailElement extends MetaGristMixin(p13n(localize(i18next)(LitElement))) {
  /**
   * @description Life Cycle - connectedCallback
   **********************************************
   */
  async connectedCallback() {
    // 조회 데이터 변경 callBack 함수 지정
    this.fetchResultSetCallback = this.responseDataSet

    if (super.connectedCallback) {
      await super.connectedCallback()
    }

    // 팝업을 오픈한 페이지의 선택된 행 ID를 가져오기 위해 상위 객체의 parent_id를 불러온다.
    this.hostId = this.parentNode.parentNode.parentNode.host.parent_id
    this.menu.resource_url = this.menu.resource_url.replace(':host_id', this.hostId)
    this.menu.save_url = this.menu.save_url.replace(':host_id', this.hostId)
  }

  /**
   * @description 데이터 변경
   ***************************
   * @param {Object} response
   * @returns
   */
  responseDataSet(response) {
    let mergeResult = { total: 0, records: [] }
    let idMergeObject = {}

    response.items.forEach(record => {
      if (ValueUtil.isEmpty(idMergeObject[record.id])) {
        idMergeObject[record.id] = {
          menu_id: record.id,
          parent_id: record.parent_id,
          name: record.name,
          show: false,
          update: false,
          create: false,
          delete: false
        }
      }

      if (record.action_name) {
        idMergeObject[record.id][record.action_name] = true
      }
    })

    Object.keys(idMergeObject).forEach(key => {
      mergeResult.records.push(idMergeObject[key])
    })

    return mergeResult
  }

  /**
   * @description 저장 버튼 override
   ***********************************
   */
  async save() {
    const patches = this.getPatches()

    // 변경된 내용이 없음
    if (!patches || patches.length == 0) {
      UiUtil.showToast('info', TermsUtil.tText('NOTHING_CHANGED'))

      // 변경된 내용이 있음
    } else {
      let serviceUrl = this.saveUrl + '&delete_all=false'
      await ServiceUtil.restPost(serviceUrl, patches, null, null, () => {
        this.grist.fetch()
      })
    }
  }

  /**
   * @override 커스텀 버튼 핸들러 액션 override
   **********************************
   * @param {Object} customAction
   */
  async customBtnEventHandler(customAction) {
    // 서비스 호출 혹은 팝업 실행인 경우 사용자에게 확인
    if ((await UiUtil.confirmTransaction('button.' + customAction.name)) != true) {
      return
    }

    // 커스텀 서비스 호출 URL 생성
    let serviceUrl = customAction.logic.replace(':id', this.parent_id)
    serviceUrl = serviceUrl.replace(':host_id', this.hostId)
    await ServiceUtil.restPost(serviceUrl, {}, null, null, () => {
      this.grist.fetch()
    })
    return null
  }

  /**
   * @description 메뉴 버튼 설정에서 그리드 버튼만 가져와 설정 셋을 만든다.
   ************************************************************
   * @description 그리스트가 없으면 빈 배열을 리턴한다.
   * @returns {Array} 그리스트 버튼 설정 셋트
   */
  getGristButtons() {
    if (this.grist) {
      // 버튼 설정에서 grid 버튼만 필터
      let configGutters = this.actions.filter(action => action.type && action.type.startsWith('grid'))
      return configGutters.map(element => {
        let gutter = {
          type: 'gutter',
          gutterName: 'button',
          icon: element.style,
          handlers: {
            click: (_columns, _data, _column, record, _rowIndex) => {
              this.gristButtonEventHandler(element, record)
            }
          }
        }
        return gutter
      })
    } else {
      return []
    }
  }

  /**
   * @override 그리스트 gutter 버튼 이벤트 처리자 override
   *****************************************
   * @param {Object} action
   * @param {Object} record
   */
  async gristButtonEventHandler(action, record) {
    let serviceUrl = action.logic.replace(':id', record.menu_id)
    serviceUrl = serviceUrl.replace(':host_id', this.hostId)
    await ServiceUtil.restPost(serviceUrl, [], null, null, () => {
      this.grist.fetch()
    })
  }
}

customElements.define('system-role-menu-detail-element', SystemRoleMenuDetailElement)
