import '@material/web/icon/icon.js'

import { css, html } from 'lit-element'

import { GristRenderMixin } from './grist-render-mixin'
import { SearchFormRenderMixin } from './search-form-render-mixin'
import { currentRouteMenu } from '@operato-app/operatofill'

import { TermsUtil } from '../utils/terms-util'
import { ValueUtil } from '../utils/value-util'
import { UiUtil } from '../utils/ui-util'
import { MetaUiUtil } from '../utils/meta-ui-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 그리스트 마스터 디테일 믹스 인
 */
export const MetaMasterDetailMixin = superClass =>
  class extends GristRenderMixin(superClass) {
    /**
     * @description 마스터 디테일 스타일 정보 override
     ********************************************
     * @returns CSS
     */
    static get styles() {
      let styles = [
        css`
          :host {
            display: flex;
            flex-direction: column;
            overflow-x: auto;
          }
          .container {
            flex: 1;
            display: grid;
            overflow: hidden;
          }
          .container_detail {
            background-color: var(--md-sys-color-background);
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow-y: auto;
          }

          h2 {
            padding: var(--subtitle-padding);
            font: var(--subtitle-font);
            color: var(--subtitle-text-color);
            border-bottom: var(--subtitle-border-bottom);
          }

          basic-tab-element {
            margin: var(--meta-basic-tab-margin);
          }

          .container_detail h2 {
            margin: var(--grist-title-margin);
            border: var(--grist-title-border);
            font: var(--grist-title-font);
            color: var(--secondary-color);
          }

          .container_detail h2 md-icon {
            --md-icon-size: var(--grist-title-icon-size);
            vertical-align: middle;
            margin: var(--grist-title-icon-margin);
            color: var(--grist-title-icon-color);
          }

          h2 {
            padding-bottom: var(--grist-title-with-grid-padding);
          }
        `
      ]

      // 그리스트 스타일 추가
      if (this.getGristStyle) {
        styles.push(...this.getGristStyle())
      }

      // 버튼 콘테이너 스타일 추가 (엘리먼트로 로드시 사용)
      if (this.getButtonContainerStyle) {
        styles.push(...this.getButtonContainerStyle())
      }

      // 버튼 콘테이너 스타일 추가 (팝업으로 로드시 사용)
      styles.push(...MetaUiUtil.getPopupButtonContainerStyles())

      return styles
    }

    /**
     * @description Life Cycle - render
     *************************
     * @returns HTML
     */
    render() {
      // 1. 마스터 디테일 설정 정보 추출
      let params = this.menuParamValueToObject('master-detail', '{}')
      // 2. 마스터 디테일 화면 유형 (top_bottom or left_right)
      let type = params.type
      // 3. 마스터와 디테일 화면 사이즈 비율 정보
      let size = params.size
      // 4. 레이아웃 타입에 따라 상하 좌우 그리드 설정
      let layoutContainerStyle = type == 'left_right' ? `grid-template-columns:${size};` : `grid-template-rows:${size};`
      // ** 팝업 실행시에도 렌더링이 호출되는데 이 때 디테일 엘리먼트의 데이터 클리어를 안 하기 위한 플래그
      // 마스터 레코드 삭제나 업데이트 시에는 디테일 그리드의 데이터를 클리어해야 함 **
      this.rerenderFlag = true

      // 5. 디테일 엘리먼트가 없으면 생성
      if (!this.detailElement) {
        let detailElementName =
          !params.tagname || params.tagname == 'basic-grist-element' ? 'basic-grist-detail-element' : params.tagname
        let detailHtml = `<${detailElementName} id="${params.id}" style='flex:1;' route_name='${params.menu}'></${detailElementName}>`
        this.detailElement = UiUtil.htmlToElement(detailHtml)
        this.detailElement.parent_is_popup = this.is_popup
        this.detailElement.parentFetch = () => {
          this.detailFetchEvent = true
          this.gristSelectedRecords = this.grist.selected.map(x => {
            return x.id
          })
          this.grist.fetch()
        }

        this.detailId = params.id
      }

      // 6. 렌더링
      return html`
        ${this.getSearchFormHtml ? html`${this.getSearchFormHtml()}` : html``}
        <div id="container" class="container" style="${layoutContainerStyle}">
          <div class="container_detail">
            ${this.useFilterForm() ? html`` : html`<h2>${this.menu.title}</h2>`} ${this.getGridHtml()}
            ${this.getButtonHtml ? html`${this.getButtonHtml()}` : html``}
          </div>

          <div class="container_detail">
            ${params.tagname == 'basic-column-form-element' || params.tagname == 'basic-tab-element'
              ? html``
              : html`<h2 id="detail_title">${TermsUtil.tMenu(`${params.menu}`)}</h2>`}
            ${this.detailElement}
          </div>
        </div>
      `
    }

    /**
     * @description 데이터 페치 override - 디테일의 리스트를 초기화
     ***********************************
     */
    async fetchHandler(fetchParam) {
      if (this.detailId) {
        if (this.detailFetchEvent === true) {
          this.detailFetchEvent = false
        } else if (this.rerenderFlag === true) {
          this.rerenderFlag = false
        } else {
          let detail = this.renderRoot.querySelector(`#${this.detailId}`)
          this.gristSelectedRecords = []
          if (detail && detail.grist && detail.grist.data) {
            detail.grist.data = {}
          }
        }
      }

      // 데이터 조회
      let data = await super.fetchHandler(fetchParam)

      // 이미 선택된 정보 그대로 복원
      if (this.gristSelectedRecords) {
        data.records.forEach(rec => {
          if (this.gristSelectedRecords.includes(rec.id)) {
            rec.__selected__ = true
          }
        })
      }

      return data
    }
  }
