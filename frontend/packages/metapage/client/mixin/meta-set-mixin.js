import { RestServiceMixin } from './rest-service-mixin'

import { ValueUtil } from '../utils/value-util'
import { MetaApi } from '../utils/meta-api'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 메타 데이터 세팅 믹스 인
 */
export const MetaSetMixin = superClass =>
  class extends RestServiceMixin(superClass) {
    /**
     * @description Life Cycle - connectedCallback
     ***********************************
     */
    async connectedCallback() {
      // 화면 구성을 위한 메타 정보 추출
      let menuMeta = await MetaApi.getMenuMeta(this)
      if (!menuMeta) return

      this.sort_fields = menuMeta.sort_fields
      this.actions = menuMeta.actions
      this.menu = menuMeta.menu
      this.menu_params = menuMeta.menu_params ? menuMeta.menu_params.params : {}
      this.search_hidden_fields = menuMeta.search_hidden_fields
      this.select_fields = menuMeta.select_fields
      this.use_add_button = menuMeta.use_add_button
      this.search_form_fields = menuMeta.search_form_fields
      this.form_fields = menuMeta.form_fields
      this.permit_search_fields = []

      // 데이터 액세스 권한이 부여된 검색 필드 리스트
      ;(this.search_form_fields || []).forEach(field => {
        if (field.data_access_permit_field === true) {
          this.permit_search_fields.push({
            name: field.name,
            label: field.label,
            options: field.options
          })
        }
      })

      // 엘리먼트 경우 메인 화면에서 전달된 파라미터(parent_id)에 따라서 필요한 URL 변경
      if (this.is_element) {
        // parent_id 값이 메인 화면으로 부터 전달된 경우
        if (ValueUtil.isNotEmpty(this.parent_id)) {
          // url 치환
          this.resource_url = this.menu.resource_url.replace(':id', this.parent_id)
          // 저장 URL은 없을 수 있다.
          if (ValueUtil.isNotEmpty(this.menu.save_url)) {
            this.save_url = this.menu.save_url.replace(':id', this.parent_id)
          }
          // parent_id 값이 메인 화면으로 부터 전달되지 않은 경우
        } else {
          // url 치환
          this.resource_url = this.menu.resource_url.indexOf(':id') >= 0 ? undefined : this.menu.resource_url
          // 저장 URL은 없을 수 있다.
          if (ValueUtil.isNotEmpty(this.menu.save_url)) {
            this.save_url = this.menu.save_url.indexOf(':id') >= 0 ? undefined : this.menu.save_url
          }
        }

        // 페이지인 경우 필요한 URL 추출
      } else if (this.is_page) {
        this.resource_url = this.menu.resource_url
        this.save_url = this.menu.save_url
      }

      // grid-view-option 처리
      let gridViewOption = this.menuParamValue('grid-view-options')
      let isMobile = MetaApi.isMobileEnv()

      // 지정되지 않으면 기본 설정 (PC : Grid, Mobile : CARD)
      if (!gridViewOption) {
        this.grid_mode = isMobile ? 'CARD' : 'GRID'
        this.grid_view_options = [isMobile ? 'CARD' : 'GRID']

        // 지정되어 있으면 지정 설정
      } else {
        this.grid_view_options = gridViewOption.split(',')
        if (this.grid_view_options.length == 1) {
          this.grid_mode = this.grid_view_options[0]
        } else {
          // Mobile : 옵션[1] , PC : 옵션[0]
          this.grid_mode = isMobile ? this.grid_view_options[1] : this.grid_view_options[0]
        }
      }

      // 그리드 컬럼 개인화
      this.grid_config = menuMeta.grid_config

      // cud flag 함수 생성
      if (this.createChangeCudFlagFunc) {
        this.createChangeCudFlagFunc()
      }

      if (super.connectedCallback) {
        await super.connectedCallback()
      }
    }

    /**
     * @description 서버 호출 URL
     ****************************
     * @returns {String}
     */
    get resourceUrl() {
      return this.resource_url
    }

    /**
     * @description CUD Update Multiple URL
     ****************************************
     * @returns {String}
     */
    get saveUrl() {
      return this.save_url
    }

    /**
     * @override pageUpdated
     **************************
     * @param {*} changes
     * @param {*} lifecycle
     * @param {*} before
     * @returns
     */
    async pageUpdated(changes, lifecycle, before) {
      // 페이지 활성 상태가 아니거나 검색 폼이 없거나 파라미터가 없으면 스킵
      if (this.active && lifecycle && lifecycle.params && lifecycle.params.pass && this.searchForm) {
        // 파라미터 여부 확인
        let navParams = lifecycle.params
        // searchForm 추출
        let searchForm = this.searchForm
        // 화면에 대한 파라미터 파싱
        let passParams = JSON.parse(navParams.pass)

        // 그리드에 포함된 필터 폼인 경우
        if (searchForm.tagName.toLowerCase() == 'ox-filters-form') {
          let filterColumns = searchForm.filterColumns

          for (var idx = 0; idx < filterColumns.length; idx++) {
            let filter = filterColumns[idx]
            let filterValue = passParams[filter.name] ? passParams[filter.name] : ''

            if (idx == filterColumns.length - 1) {
              // 필터 폼에 값을 건건이 변경하면 값이 변경 될 때 마다 계속 조회를 시도하므로 마지막 한 번에 모든 기본값 설정을 적용
              searchForm.setInputValue(filter.name, filterValue)
            } else {
              let filterField = searchForm.renderRoot.querySelector(`[name='${filter.name}']`)
              if (filterField) {
                filterField.value = filterValue
              }
            }
          }

          // 그리드에 포함되지 않은 이전 버전의 검색 폼인 경우
        } else {
          let filterColumns = searchForm.fields

          filterColumns.forEach(filter => {
            let filterValue = passParams[filter.name] ? passParams[filter.name] : ''
            let filterField = searchForm.renderRoot.querySelector(`[name='${filter.name}']`)

            if (filterField) {
              filterField.value = filterValue
            }
          })

          searchForm.submit()
        }
      }
    }
  }
