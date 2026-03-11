import '@operato/form/ox-search-form.js'

import { css } from 'lit-element'
import { ButtonContainerStyles, CommonButtonStyles } from '@operato/styles'
import { MetaSetMixin } from './meta-set-mixin'

import { UiUtil } from '../utils/ui-util'
import { TermsUtil } from '../utils/terms-util'
import { ValueUtil } from '../utils/value-util'
import { ServiceUtil } from '../utils/service-util'
import { MetaApi } from '../utils/meta-api'


/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 기본 버튼 동작 믹스인 (save, delete, fetchHandler, recordCreationCallback)
 */
export const BasicButtonMixin = superClass =>
  class extends MetaSetMixin(superClass) {
    
    /**
     * @description 버튼 컨테이너 스타일
     ***********************************
     * @returns {Array} 스타일 정보
     */
    static getButtonContainerStyle() {
      return [ButtonContainerStyles]
    }

    /**
     * @description Page Context 생성에서 사용될 버튼 액션 정의
     * 기본 버튼은 그리스트를 기반으로 하고
     * get grist() 함수가 페이지내에 없으면 버튼을 그리지 않는다 (ex) CHART Page)
     *******************************************************************
     * @returns {Object} { actions: Array , exportable : Object }
     */
    getBasicActions() {
      // 멀티 레이아웃이면 기본 버튼을 사용하지 않음
      if (this.isMultiLayoutPage()) {
        return {}
      } else {
        // 버튼과 function 연결
        let configButtons = this.filterBasicButton()
        let actions = configButtons
          .map(e => {
            e.action = async () => {
              if (e.confirm_flag != true || await UiUtil.confirmTransaction('button.' + e.name) == true) {
                (this[e.name].bind(this))(e)
              }
            }

            if(e.name == 'template') {
              let btnStyle = CommonButtonStyles['download'] || {
                icon: 'download',
                emphasis: {
                  raised: true,
                  outlined: false,
                  dense: false,
                  danger: false
                }
              }
              Object.assign(e, btnStyle)

            } else {
              let style = e.style ? e.style : e.name
              Object.assign(e, CommonButtonStyles[style])
            }

            return e
          })

        let result = {
          actions: actions
        }

        return result
      }
    }

    /**
     * @description 엑셀 내보내기 처리
     ***********************************
     * @returns {e} button element
     */
    export(e) {
      ServiceUtil.exportableData(true, e.title, this.grist)
    }

    /**
     * @description 기본 버튼 element를 생성
     ***********************************
     * @returns {Array} 문서가 페이지로 로딩된 경우에는 빈 배열 리턴 아니면 버튼을 생성해 리턴한다.
     */
    getBasicButtons() {
      if (this.is_page && !this.isMultiLayoutPage()) {
        return []
      } else {
        let configButtons = this.filterBasicButton()
        return configButtons.map(e => {
          let btnEle = this.createButtonElement(e.name, e.title, e.style)
          btnEle['rank'] = e.rank
          btnEle.onclick = async () => {
            if (e.confirm_flag != true || await UiUtil.confirmTransaction('button.' + e.name) == true) {
              (this[e.name].bind(this))(e)
            }
          }
          return btnEle
        })
      }
    }

    /**
     * @description 메타 actions 에서 기본 버튼 조건으로 filtering
     ************************
     * @returns {Array}
     */
    filterBasicButton() {
      return (this.actions || []).filter(
        action =>
          (action.name == 'add' || action.name == 'save' || action.name == 'delete' || action.name == 'export' || action.name == 'template' || action.name == 'refresh') &&
          this.grist
      )
    }

    /**
     * @description 파라미터 셋팅
     ********************************
     * @param {Object} fetchParam (grist parameter or search-form)
     * @returns { page: Number, limit: Number, sorters: Array, filters: Array }
     */
    async fetchParamSetter(fetchParam) {
      // 최종 파라미터 초기화
      let resultParams = fetchParam ? { page: 0, limit: 0, sorters: [], filters: [] } : {}
      if (fetchParam) {
        if (fetchParam.tagName && fetchParam.tagName.toLowerCase() == 'ox-search-form') {
          // searchForm 파라미터인 경우
          resultParams.filters = await fetchParam.getQueryFilters()
        } else {
          // 두 가지가 모두 있는 경우 filter 조건은 searchForm을 기준으로 한다.
          if(this.searchForm && this.searchForm.tagName.toLowerCase() == 'ox-search-form') {
            fetchParam.filters = await this.searchForm.getQueryFilters()
          }

          resultParams = fetchParam
        }
      }

      // 필터 관련 변수 초기화
      let { page = 0, limit = 0, sorters = [], filters = [] } = resultParams
      let refrenceIdFilterNames = []

      // 필터 연산자 교체
      let operChangeFilters = filters.map(filter => {
        // 필터 카피
        let operChangeFilter = Object.assign({}, filter)
        // 컬럼 이름으로 필터 추출
        let ocfs = this.search_form_fields.filter(x => x.name == filter.name)
        // 리소스 셀렉터 계열이면 필터명 뒤에 '_id'를 붙여 필터 추출
        if (ocfs == null || ocfs.length == 0) {
          ocfs = this.search_form_fields.filter(x => {
            let flag = x.name == filter.name + '_id'
            if (flag) refrenceIdFilterNames.push(filter.name)
            return flag
          })
        }

        // 필터 연산자 교체
        if (ocfs != null && ocfs.length > 0) {
          operChangeFilter.operator = ocfs[0].props.searchOper
        }
        return operChangeFilter
      })

      // 필터 정보를 검색에 알맞게 수정
      operChangeFilters.forEach(f => {
        // Array 타입의 필터 값은 문자열 ','로 변경
        if (Array.isArray(f.value)) {
          f.value = f.value.join(',')
        }

        // 참조 유형인 경우 filter값을 수정
        if (refrenceIdFilterNames.includes(f.name)) {
          f.name = f.name + '_id'
        }
      })

      // 조회 조건 숨겨진 필드와 그리드 / searchForm에 셋팅된 파라미터 병합
      resultParams.filters = [...this.search_hidden_fields, ...operChangeFilters]

      // 정렬 조건 설정
      resultParams.sorters = sorters.map(currentElement => {
        return {
          field: currentElement.name,
          ascending: currentElement.desc ? false : true
        }
      })

      // 데이터 액세스 권한 검색 필드 확인
      if (this.permit_search_fields && this.permit_search_fields.length > 0) {
        for (var idx = 0; idx < this.permit_search_fields.length; idx++) {
          let permitField = this.permit_search_fields[idx]
          let filter = filters.filter(x => x.name == permitField.name)
          let { label = permitField.label, value = '' } = filter.length > 0 ? filter[0] : {}

          if (((permitField.options || []).filter(x => x.value == value) || []).length == 0) {
            let errMsg = TermsUtil.tText('search-data-permit-error', [
              label,
              value.length == 0 ? TermsUtil.tLabel('all') : value
            ])
            MetaApi.showToast('info', errMsg)
            throw new Error(errMsg)
          }
        }
      }

      // 페이지네이션 사용 여부
      resultParams.page = this.menu.use_pagination ? page : 0
      resultParams.limit = this.menu.use_pagination ? limit : 0
      return resultParams
    }

    /**
     * @description 기본 조회 서비스 호출
     *******************************
     * @param {Object} fetchParam (grist parameter or search-form)
     * @returns {Object}
     */
    async fetchByResource(fetchParam) {
      let { page = 0, limit = 0, sorters = [], filters = [] } = fetchParam
      let params = [
        {
          name: 'select',
          value: encodeURI(this.select_fields.join(','))
        },
        {
          name: 'sort',
          value: encodeURI(JSON.stringify(sorters))
        },
        {
          name: 'query',
          value: encodeURI(JSON.stringify(filters))
        },
        {
          name: 'page',
          value: page
        },
        {
          name: 'limit',
          value: limit
        }
      ]

      return await ServiceUtil.restGet(this.resourceUrl, params)
    }

    /**
     * @description 커스텀 서비스 리소스 조회
     *******************************
     * @param {Object} fetchParam (grist parameter or search-form)
     * @returns {Object}
     */
    async fetchByCustom(fetchParam) {
      let { filters } = fetchParam || {}
      let params = ValueUtil.isEmpty(filters)
        ? null
        : filters
            .map(filter => {
              return {
                name: filter.name,
                value: filter.value ? filter.value : null
              }
            })
            .filter(item => item.value != null)
      return await ServiceUtil.restGet(this.resourceUrl, params)
    }

    /**
     * @description 데이터 조회
     *******************************
     * @param {Object} fetchParam (grist parameter or search-form)
     * @returns {Object} callback함수가 지정되면 콜백 함수 호출하여 리턴, 없으면 결과값 리턴
     * @callback this.fetch_callback
     */
    async fetchHandler(fetchParam) {
      // url에 ':' 치환 필드가 포함되어 있으면 스킵
      if (ValueUtil.isNotEmpty(this.resourceUrl) && this.resourceUrl.indexOf(':') < 0) {
        // 1. fetch parameter 종류에 따라 fetchParam 추출
        fetchParam = await this.fetchParamSetter(fetchParam)
        // 2. fetch
        return await this.fetchData(fetchParam)
      }
    }

    /**
     * @description 데이터 조회
     *******************************
     * @param {Object} fetchParam (grist parameter or search-form)
     * @returns {Object} callback함수가 지정되면 콜백 함수 호출하여 리턴, 없으면 결과값 리턴
     * @callback this.fetch_callback
     */
    async fetchData(fetchParam) {
      // 서비스 응답 객체
      let response = undefined

      // 1. 커스텀 서비스 호출시 
      if (this.resourceUrl != 'diy_services' && this.resourceUrl.startsWith('diy_services')) {
        if (
          this.resourceUrl.includes('query') ||
          this.resourceUrl.includes('read') ||
          this.resourceUrl.includes('read_by_pagination')
        ) {
          if (this.is_element === true && this.parent_id) {
            if (!fetchParam.filters) {
              fetchParam.filters = []
            }

            fetchParam.filters.push({
              name: 'parent_id',
              operator: 'eq',
              value: this.parent_id
            })
          }

          response = await this.fetchByResource(fetchParam)
        }

      // 2. 메뉴 파라미터 설정에 search-field-param-type 값이 custom인 경우
      } else if(this.menuParamValue('search-field-param-type', 'resource') == 'custom') {
        response = await this.fetchByCustom(fetchParam)

      // 3. 일반 리소스 호출
      } else {
        response = await this.fetchByResource(fetchParam)
      }

      // 4. 최종 리턴할 데이터 결과 셋 준비
      let fetchResultSet = { total: 0, records: [] }

      // 5. 조회 데이터를 핸들링하여 fetchResultSet을 구성할 파서가 있다면 처리
      if (this.fetchResultSetCallback) {
        fetchResultSet = this.fetchResultSetCallback(response)

      // 6. 그렇지 않다면 fetchResultSet을 기본으로 구성
      } else {
        let records = response ? (this.menu.items_res_field ? response[this.menu.items_res_field] : response) : []
        let total = response && this.menu.total_res_field ? response[this.menu.total_res_field] : records.length
        fetchResultSet = {
          total: total,
          records: records
        }
      }

      // 7. fetchResultSet을 핸들링 할 콜백이 있다면 처리
      if (this.fetch_callback) {
        this.fetch_callback(fetchResultSet, response)
        return fetchResultSet

      // 8. fetchResultSet을 리턴
      } else {
        return fetchResultSet
      }
    }

    /**
     * @description 저장 버튼 처리
     *****************************
     */
    async save() {
      let patches = ServiceUtil.patchesForUpdateMultiple(this.grist)
      if (patches) {
        await this.requestCudMultiple(patches)
      }
    }

    /**
     * @description 삭제 버튼 처리
     *****************************
     */
    async delete() {
      const selectedRecords = this.grist.selected
      if (!selectedRecords || selectedRecords.length == 0) {
        MetaApi.showToast('info', TermsUtil.tText('NOTHING_SELECTED'))
      } else {
        const answer = await MetaApi.showAlertPopup(
          'button.delete',
          'text.are_you_sure',
          'question',
          'delete',
          'cancel'
        )

        if (answer || answer.value) {
          let patches = selectedRecords.map(record => {
            record['cud_flag_'] = 'd'
            return record
          })

          await this.requestCudMultiple(patches)
        }
      }
    }

    /**
     * Refresh
     */
    async refresh(){
      if(this.parentFetch) {
        this.parentFetch();
      }
  
      if (this.grist) {
        this.grist.fetch();
      } else if (this.useSearchForm()) {
        this.searchForm.submit();
      } else {
        if(this.fetchHandler) {
          this.fetchHandler();
        }
      }
    }

    /**
     * @description 팝업으로 한건 생성
     ******************************
     * @param {Object} patches
     * @returns {Boolean}
     */
    async recordCreationCallback(patches) {
      patches = [{ ...patches, cud_flag_: 'c' }]

      let valiRes = ServiceUtil.validationBeforeSave(this.grist, patches)

      if(!valiRes || valiRes == null){
        return false
      }

      await this.requestCudMultiple(patches)
      return true
    }

    /**
     * @description Insert / Update / Delete 요청
     *********************************************
     * @param {Object} patches
     * @return {Object}
     */
    async requestCudMultiple(patches) {
      // element 로드시 부모 객체의 ID 데이터에 반영
      patches = this.setParentIdFieldByElement(patches)
      // cud 플래그 옵션 처리
      patches = this.changeCudFlagByOptions(patches)
      // 여러 건의 레코드에 대해서 insert / update 동시 요청
      return await this.requestRestService('POST', this.saveUrl, patches)
    }

    /**
     * @description CUD 대상 데이터의 cud_flag_ 메뉴 파라미터의 option 에 따라 변경
     **********************************************************************
     * @param {Array} patches
     */
    changeCudFlagByOptions(patches) {
      if (ValueUtil.isEmpty(this.cud_flag_converter)) {
        return patches
      }

      // option에 설정된 KEY 값 (변경 전 flag)로 loop
      patches.forEach(record => {
        record.cud_flag_ = this.cud_flag_converter[record.cud_flag_](record)
      })

      return patches
    }

    /**
     * @description 메뉴 파라미터의 cud-flag-option 생성
     *  ex) {'u':[{'has_permission':true,'flag':'c'},{'has_permission':false,'flag':'d'}]}  update 대상 데이터중 has_permission 값이 true 이면 c / false 이면 d
     *  ex) {'u':{'has_permission':true,'flag':'c'}}  update 대상 데이터중 has_permission 값이 true 일때만 c 로 변경 나머지 값은 u 유지 함 .
     *  ex) {'u': 'c'} update 대상 데이터를 c로 변경
     ********************************************************
     * @returns
     */
    createChangeCudFlagFunc() {
      let options = this.menuParamValueToObject('cud-flag-option', undefined)

      // option 이 설정 되지 않았으면 return;
      if (!options) {
        this.cud_flag_converter = undefined
        return
      }

      // flag 기본 컨버터
      let flagConverter = {
        c: record => {
          return 'c'
        },
        u: record => {
          return 'u'
        },
        d: record => {
          return 'd'
        }
      }

      // flag 별 컨버터 생성
      Object.keys(flagConverter).forEach(key => {
        let option = options[key]
        if (ValueUtil.isEmpty(option)) return

        // option 이 string 이면 변경 값 사용
        if (typeof option === 'string') {
          flagConverter[key] = record => {
            return option
          }

          // option 이 Array 이면 ....
        } else if (Array.isArray(option)) {
          flagConverter[key] = record => {
            for (var idx = 0; idx < option.length; idx++) {
              let optRow = option[idx]
              let isConv = true
              Object.keys(optRow).forEach(optKey => {
                if (optKey == 'flag') return
                if (ValueUtil.isEmpty(record[optKey]) || record[optKey] != optRow[optKey]) {
                  isConv = false
                }
              })

              if (isConv) {
                return optRow.flag
              }
            }

            return record.cud_flag_
          }

          // option 이 Object 이면 ….
        } else if (typeof option === 'object') {
          flagConverter[key] = record => {
            let isConv = true

            Object.keys(option).forEach(optKey => {
              if (optKey == 'flag') return
              if (ValueUtil.isEmpty(record[optKey]) || record[optKey] != option[optKey]) {
                isConv = false
              }
            })

            return isConv ? option.flag : record.cud_flag_
          }
        }
      })

      this.cud_flag_converter = flagConverter
    }

    /**
     * @description 기본버튼 template 에 대한처리 - action.logic 에 저장된 tempalteId 로 파일을 찾아 download 한다.
     **********************************************************************
     * @param {Array} action
     */
    async template(action){
      // 로직에 ID 가 없으면 리턴 
      if(!action.logic)  return
      ServiceUtil.templateFileDownload(action.logic)
    }
  }
