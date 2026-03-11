import { store } from '@operato/shell'
import { EXPORT } from '@things-factory/export-base'

import { TermsUtil } from './terms-util'
import { UiUtil } from './ui-util'
import { ValueUtil } from './value-util'
import gql from 'graphql-tag'
import { client } from '@operato/graphql'

import { operatoGet, operatoGetData, operatoPut, operatoPost, operatoDelete } from '@operato-app/operatofill'
import { MetaApi } from './meta-api'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description REST 서비스 핸들링 유틸리티 함수 정의
 */
export class ServiceUtil {
  /**
   * @description 공통 코드 명으로 공통 코드 리스트 조회 후 리턴
   **************************************
   * @param {String} codeName 공통 코드 명
   * @returns {Array} 코드 리스트
   */
  static async codeItems(codeName) {
    return await operatoGetData(`common_codes/show_by_name?name=${codeName}`)
  }

  /**
   * @description code selector 에디터를 위한 공통 코드 조회
   **************************************
   * @param {String} codeName 공통 코드 명
   * @returns {Array} 설정값 클리어를 위해 빈 값이 추가된 코드 리스트
   */
  static async getCodeSelectorData(codeName) {
    let codeInfo = await ServiceUtil.codeItems(codeName)
    let codeItems = codeInfo.items
    let codeSelectors = codeItems.map(c => {
      return {
        value: c.name,
        display: c.description
      }
    })
    codeSelectors.unshift({ value: '', display: '' })
    return codeSelectors
  }

  /**
   * @description code selector 에디터를 위한 공통 코드 조회
   **************************************
   * @param {String} codeName 공통 코드 명
   * @returns {Array} 설정값 클리어를 위해 빈 값이 추가된 코드 리스트
   */
   static async getCodeSelectorDataNotEmpty(codeName) {
    let codeInfo = await ServiceUtil.codeItems(codeName)
    let codeItems = codeInfo.items
    let codeSelectors = codeItems.map(c => {
      return {
        value: c.name,
        display: c.description
      }
    })
    return codeSelectors
  }

  /**
   * @description 커스텀 서비스의 조회 서비스를 호출해 코드 정보를 가져온다.
   ****************************************
   * @param {String} serviceName
   * @param {Object} variables
   * @return {Array} [{ name : 'code1', description : 'description 1' }, { name : 'code2', description : 'description 2' }] 형식의 데이터
   */
  static async getCodeByCustomService(serviceName, variables) {
    let codes = await ServiceUtil.searchByCustomService(serviceName, variables)
    codes.unshift({ name: '', description: '' })
    return codes.map(x => {
      return {
        value: x.name,
        display: x.description
      }
    })
  }

  /**
   * @description REST 서비스 응답이 에러인 경우 Error 메시지 표시
   ****************************************************
   * @param {Object} response 응답
   */
  static async showRestErrorResponse(response) {
    if (response.status && response.status >= 400) {
      try {
        let errData = await response.json()
        let errMsg =
          errData.code && errData.msg ? `${errData.code} - ${errData.msg}` : TermsUtil.tText('unexpected_server_error')
        UiUtil.showAlertPopup('title.error', errMsg, 'error', 'confirm')
        return errData
      } catch (err) {
        UiUtil.showAlertPopup('title.error', err, 'error', 'confirm')
        return false
      }
    }
  }

  /**
   * @description REST 서비스 실행 시 발생한 예외 표시
   *************************************************
   * @param {Object} exception 에러 Object
   */
  static async showRestException(exception) {
    if (exception) {
      await UiUtil.showAlertPopup('REST Service Error', exception.message, 'error', 'confirm')
    }
  }

  /**
   * @description 그리드 데이터 내보내기
   *********************************
   * @param {Boolean} isElement 팝업으로 실행 중인지 여부
   * @param {String} exportTitle 그리드 내보내기 용 타이틀
   * @param {Grist} grist 그리드 오브젝트
   * @returns {Object} { header: headerSetting, data: data } or Not
   */
  static async exportableData(isElement, exportTitle, grist) {
    // 1. 헤더 설정
    let headerSetting = grist._config.columns
      .filter(
        column =>
          column.type !== 'gutter' && column.record !== undefined && column.imex !== undefined && column.hidden !== true
      )
      .map(column => {
        return column.imex
      })

    // 2. 그리드에 표시된 데이터 추출
    let records = grist.data.records
    let data = records.map(item => {
      return {
        ...grist._config.columns
          .filter(
            column =>
              column.type !== 'gutter' &&
              column.record !== undefined &&
              column.imex !== undefined &&
              column.hidden !== true
          )
          .reduce((record, column) => {
            record[column.imex.key] = column.imex.key.split('.').reduce((obj, key) => {
              var val = obj && obj[key] !== 'undefined' ? obj[key] : undefined

              if (column.type == 'select') {
                return column.record?.options?.find(option => option.value == val)?.display || val
              } else if (column.type == 'datetime') {
                return new Date(val).toISOString().replace('T', ' ')
              } else if (column.type == 'resource-selector') {
                if (!val && key.endsWith('_id')) {
                  val = obj[key.substr(0, key.length - 3)]
                }

                if (typeof val == 'object') {
                  const { title_field = 'name', desc_field = 'description' } = column.record?.options?.meta || {}

                  const title = typeof val == 'object' && val[title_field]
                  const description = typeof val == 'object' && val[desc_field]

                  return `${title || ''}${description ? ` (${description})` : ''}`
                }

                return val
              }

              return val
            }, item)
            return record
          }, {})
      }
    })

    // 3. element로 호출된 경우 리턴 없이 바로 xlsx 내보내기
    //if (isElement) {
    store.dispatch({
      type: EXPORT,
      exportable: {
        extension: 'xlsx',
        name: exportTitle,
        data: { header: headerSetting, data: data }
      }
    })
    //} else {
    // return { header: headerSetting, data: data }
    //}
  }

  /**
   * @description 데이터 리스트 페이지네이션 조회
   ******************************************
   * @param {String} url 조회 서비스 URL
   * @param {Array} filters 조회 조건
   * @param {Array} sortings 소팅 조건
   * @param {Number} page 현재 페이지
   * @param {Number} limit 페이지 당 표시할 레코드 건수
   * @param {String || Array} selectFields 조회할 필드 리스트
   * @returns {Object} 조회 결과 { items : [{ ... }], total : 100 }
   */
  static async searchByPagination(url, filters, sortings, page, limit, selectFields) {
    page = page || 1
    limit = limit || 50

    let serviceUrl = url + '?page=' + page
    serviceUrl = serviceUrl + '&limit=' + limit

    if (selectFields) {
      let encodedSelected =
        typeof selectFields == 'string' ? encodeURI(selectFields) : encodeURI(selectFields.join(','))
      serviceUrl = serviceUrl + '&select=' + encodedSelected
    }

    if (filters) {
      serviceUrl = serviceUrl + '&query=' + encodeURI(JSON.stringify(filters))
    }

    if (sortings) {
      serviceUrl = serviceUrl + '&sort=' + encodeURI(JSON.stringify(sortings))
    }

    let res = await operatoGet(serviceUrl, null, false)
    if (res && res.status && res.status < 400) {
      return await res.json()
    } else {
      return null
    }
  }

  /**
   * @description 레코드의 id를 이용해 데이터 한 건 조회
   *********************************************
   * @param {String} url 조회할 서비스 URL
   * @param {String} id 레코드 ID
   * @param {String} selectFields 조회할 필드 리스트
   * @return {Object} 조회한 레코드
   */
  static async findOne(url, id, selectFields) {
    let findUrl = url.replace(':id', id)
    if (selectFields) {
      findUrl = findUrl + '?select=' + selectFields
    }

    let res = await operatoGet(findUrl, null, false)
    if (res && res.status && res.status < 400) {
      return await res.json()
    }

    return res
  }

  /**
   * @description 조회 REST 서비스 호출
   *********************************************
   * @param {String} url 서비스 URL
   * @param {Object} params 파라미터
   * @return {Object} 조회 결과 데이터
   */
  static async restGet(url, params) {
    const res = await operatoGet(url, params, false)
    if (res && res.status && res.status < 400) {
      return await res.json()
    }

    return null
  }

  /**
   * @description 메소드 PUT인 REST 서비스 호출
   *********************************************
   * @param {String} url 서비스 URL
   * @param {Object} params 파라미터
   * @param {String} confirmTitleKey 확인 타이틀 용어 키
   * @param {String} confirmMsgKey 확인 메시지 용어 키
   * @param {Function} successCallback 성공 콜백
   * @param {Function} failureCallback 실패 콜백
   * @return {Object}
   */
  static async restPut(url, params, confirmTitleKey, confirmMsgKey, successCallback, failureCallback) {
    return await ServiceUtil.callRest(
      'PUT',
      url,
      params,
      confirmTitleKey,
      confirmMsgKey,
      successCallback,
      failureCallback
    )
  }

  /**
   * @description 메소드 POST인 REST 서비스 호출
   *********************************************
   * @param {String} url 서비스 URL
   * @param {Object} params 파라미터
   * @param {String} confirmTitleKey 확인 타이틀 용어 키
   * @param {String} confirmMsgKey 확인 메시지 용어 키
   * @param {Function} successCallback 성공 콜백
   * @param {Function} failureCallback 실패 콜백
   * @return {Object}
   */
  static async restPost(url, params, confirmTitleKey, confirmMsgKey, successCallback, failureCallback) {
    return await ServiceUtil.callRest(
      'POST',
      url,
      params,
      confirmTitleKey,
      confirmMsgKey,
      successCallback,
      failureCallback
    )
  }

  /**
   * @description 메소드 DELETE인 REST 서비스 호출
   *********************************************
   * @param {String} url 서비스 URL
   * @param {Object} params 파라미터
   * @param {String} confirmTitleKey 확인 타이틀 용어 키
   * @param {String} confirmMsgKey 확인 메시지 용어 키
   * @param {Function} successCallback 성공 콜백
   * @param {Function} failureCallback 실패 콜백
   * @return {Object}
   */
  static async restDelete(url, params, confirmTitleKey, confirmMsgKey, successCallback, failureCallback) {
    return await ServiceUtil.callRest(
      'DELETE',
      url,
      params,
      confirmTitleKey,
      confirmMsgKey,
      successCallback,
      failureCallback
    )
  }

  /**
   * @description REST 서비스 호출
   *********************************************
   * @param {String} method 메소드
   * @param {String} url 서비스 URL
   * @param {Object} params 파라미터
   * @param {String} confirmTitleKey 확인 타이틀 용어 키
   * @param {String} confirmMsgKey 확인 메시지 용어 키
   * @param {Function} successCallback 성공 콜백
   * @param {Function} failureCallback 실패 콜백
   * @return {Object}
   */
  static async callRest(method, url, params, confirmTitleKey, confirmMsgKey, successCallback, failureCallback) {
    if(!url){
      UiUtil.showToast('error', TermsUtil.tText('url_error'))
      return null
    }
    let confirm = confirmMsgKey
      ? await UiUtil.showAlertPopup(confirmTitleKey, confirmMsgKey, 'question', 'confirm', 'cancel')
      : true

    if (confirm) {
      // 커스텀 서비스의 경우 파라미터 처리 ...
      let svcParams = url.startsWith('diy_services/') && url.includes('/shoot') ? { input: params } : params
      // 서비스 호출 결과
      let res = null

      if (method == 'POST') {
        res = await operatoPost(url, svcParams, false)
      } else if (method == 'PUT') {
        res = await operatoPut(url, svcParams, false)
      } else if (method == 'DELETE') {
        res = await operatoDelete(url, svcParams, false)
      }

      if (res && res.status && res.status < 400) {
        UiUtil.showToast('info', TermsUtil.tText('Success to Process'))
        let responseData = res.json ? await res.json() : res
        if (successCallback) successCallback(responseData)
        return responseData
      } else {
        if (failureCallback) failureCallback()
      }
    }

    return null
  }

  /**
   * @description 그리스트에서 변경, 추가된 내용 추출
   ********************************************
   * @param {Object} grist 그리스트
   * @returns {Array} 그리스트에서 변경, 추가된 데이터 리스트
   */
  static patchesForUpdateMultiple(grist) {
    
    let cudRecords = grist.dirtyRecords
    let gristTree = grist.config.tree

    if (!cudRecords || cudRecords.length == 0) {
      UiUtil.showToast('info', TermsUtil.tText('NOTHING_CHANGED'))
      return null
    } else {
      let metaFields = [
        'creator',
        'updater',
        'createdAt',
        'updatedAt',
        '__dirty__',
        '__dirtyfields__',
        '__origin__',
        '__seq__',
        '__selected__',
        '__children__'
      ]
      
      let patchDataList = cudRecords.map(record => {
        let patchData = record.id ? { id: record.id } : {}

        if(gristTree){
          let childrenProperty = gristTree.childrenProperty? gristTree.childrenProperty: 'children'

          patchData[childrenProperty] = record.__children__
          
          // add children parent_id def value = 'root'
          if(record.parent && !record.parent.id){
            record.parent_id = 'root'
          }
        }

        for (let key in record) {
          if (!metaFields.includes(key)) {
            patchData[key] = record[key]
          }
        }

        patchData.cud_flag_ = record.__dirty__ == 'M' ? 'u' : 'c'

        return patchData
      })

      return ServiceUtil.validationBeforeSave(grist, patchDataList)
    }
  }

  /**
   * @description 저장 전에 필수값 체크
   **************************************
   * @param {Object} grist 그리스트
   * @param {Array} patchDataList 변경된 데이터
   * @returns {Array} 변경된 데이터
   */
  static validationBeforeSave(grist, patchDataList) {
    // Validation Check
    let errMsg = undefined

    // forEach 는 break, return 이 안되서 for 문으로 풀어 사용
    // 그리드 필수값 체크 대상 컬럼 설정
    let gristColumnConfigs = grist.config.columns.filter(c => {
      return (
        c.name &&
        c.name != 'id' &&
        c.name != 'domain_id' &&
        c.name != 'creator_id' &&
        c.name != 'updater_id' &&
        c.name != 'created_at' &&
        c.name != 'updated_at' &&
        c.rank &&
        c.rank > 0 &&
        c.width > 0 &&
        !c.hidden &&
        c.record &&
        c.record.mandatory &&
        c.record.mandatory == true
      )
    })
    for (var configIdx = 0; configIdx < gristColumnConfigs.length; configIdx++) {
      let c = gristColumnConfigs[configIdx]
      for (var recIdx = 0; recIdx < patchDataList.length; recIdx++) {
        let rec = patchDataList[recIdx]

        // true / false 값이 있으므로 체크 로직 !rec[c.name] 사용안함
        if (rec[c.name] == undefined || rec[c.name] == null) {
          errMsg = TermsUtil.tText('required_error') + ' (' + c.header + ')'
          break
        }
      }

      if (errMsg) break
    }

    if (errMsg) {
      UiUtil.showAlertPopup('title.error', errMsg, 'question', 'confirm', 'cancel')
      return null
    }

    return patchDataList
  }

  /**
   * @description 그리드에서 선택된 행의 ID 리턴
   **************************************
   * @param {Object} grist 그리스트
   * @param {Boolean} alertWhenEmpty 선택된 행이 없는 경우 팝업을 실행할 것인지 여부
   * @returns {Array} 선택 ID 리스트
   */
  static getSelectedIdList(grist, alertWhenEmpty) {
    const ids = grist.selected.map(record => record.id)

    if (ValueUtil.isEmpty(ids) && alertWhenEmpty == true) {
      UiUtil.showToast('info', TermsUtil.tText('NOTHING_SELECTED'))
    }

    return ids
  }

  /**
   * @description 그리스트에서 변경, 추가된 여러 데이터를 한 꺼번에 업데이트
   ***************************************************
   * @param {Object} grist 그리스트
   * @param {String} url updateMultiple을 위한 서버 측 URL
   * @returns {Boolean} 업데이트 성공 여부
   */
  static async updateMultipleData(grist, url) {
    let patches = ServiceUtil.patchesForUpdateMultiple(grist)

    if (ValueUtil.isNotEmpty(patches)) {
      let result = await ServiceUtil.updateMultiple(url, patches)
      if (result) {
        grist.fetch()
        return result
      }
    }

    return false
  }

  /**
   * @description 변경, 추가된 여러 데이터를 한 꺼번에 업데이트
   ***************************************************
   * @param {String} url updateMultiple을 위한 서버 측 URL
   * @param {Array} patches 변경, 추가된 여러 데이터
   * @returns {Boolean} 업데이트 성공 여부
   */
  static async updateMultiple(url, patches) {
    try {
      const res = await operatoPost(url, patches, false)
      if (res.status && res.status < 400) {
        UiUtil.showToast('info', TermsUtil.tText('Success to Process'))
        return true
      }
    } catch (e) {
      ServiceUtil.showRestException(e)
    }

    return false
  }

  /**
   * @description 그리스트의 선택된 레코드 삭제 처리
   **************************************
   * @param {Object} grist 그리스트
   * @param {String} url 삭제 처리할 서비스 URL
   * @returns {Boolean} 삭제 성공 여부
   */
  static async deleteListByGristSelected(grist, url) {
    const selectedRecords = grist.selected

    if (!selectedRecords || selectedRecords.length == 0) {
      UiUtil.showToast('info', TermsUtil.tText('NOTHING_SELECTED'))
    } else {
      const answer = await UiUtil.showAlertPopup('button.delete', 'text.are_you_sure', 'question', 'delete', 'cancel')
      if (answer || answer.value) {
        let deleteList = selectedRecords.map(record => {
          return { id: record.id, cud_flag_: 'd' }
        })
        // delete 요청
        let result = await ServiceUtil.deleteMultiple(url, deleteList)
        if (result) {
          grist.fetch()
          return result
        }
      }
    }

    return false
  }

  /**
   * @description 여러 데이터를 한 꺼번에 삭제
   ***************************************************
   * @param {String} url updateMultiple을 위한 서버 측 URL
   * @param {Array} patches 삭제할 여러 데이터
   * @returns {Boolean} 업데이트 성공 여부
   */
  static async deleteMultiple(url, patches) {
    try {
      const res = await operatoPost(url, patches, false)
      if (res.status && res.status < 400) {
        UiUtil.showToast('info', TermsUtil.tText('Success to Delete'))
        return true
      }
    } catch (e) {
      ServiceUtil.showRestException(e)
    }

    return false
  }

  /**
   * @description 커스텀 서비스 (트랜잭션 용)를 호출
   ******************************************
   * @param {String} buttonName 커스텀 서비스 호출할 버튼 명, 버튼 명이 없다면 사용자에게 확인 과정을 생략한다.
   * @param {String} customServiceName 호출할 커스텀 서비스 명
   * @param {Object} variables 커스텀 서비스 호출 변수
   * @returns {Object} 커스텀 서비스 호출 response
   */
  static async callCustomService(buttonName, customServiceName, variables) {
    let confirm = !buttonName
      ? true
      : await UiUtil.showAlertPopup('button.' + buttonName, 'text.are_you_sure', 'question', 'confirm', 'cancel')

    if (confirm) {
      try {
        let url = `diy_services/${customServiceName}/shoot`
        const res = await operatoPost(url, { input: variables }, false)
        if (res.status && res.status < 400) {
          UiUtil.showToast('info', TermsUtil.tText('Success to Process'))
          return await res.json()
        }
      } catch (e) {
        ServiceUtil.showRestException(e)
      }
    }

    return null
  }

  /**
   * @description 페이지네이션 조회용 커스텀 서비스를 호출
   ******************************************
   * @param {String} customServiceName 호출할 커스텀 서비스 명
   * @param {Object} variables 커스텀 서비스 호출 변수
   * @returns {Object} 커스텀 서비스 호출 response
   */
  static async paginateByCustomService(customServiceName, variables) {
    try {
      let url = `diy_services/${customServiceName}/read_by_pagination`
      const res = await operatoPost(url, variables, false)
      if (res.status && res.status < 400) {
        return await res.json()
      }
    } catch (e) {
      ServiceUtil.showRestException(e)
    }

    return null
  }

  /**
   * @description 일반 조회용 커스텀 서비스를 호출
   ******************************************
   * @param {String} customServiceName 호출할 커스텀 서비스 명
   * @param {Object} variables 커스텀 서비스 호출 변수
   * @returns {Object} 커스텀 서비스 호출 response
   */
  static async searchByCustomService(customServiceName, variables) {
    try {
      let url = `diy_services/${customServiceName}/read`
      const res = await operatoPost(url, variables, false)
      if (res.status && res.status < 400) {
        return await res.json()
      }
    } catch (e) {
      ServiceUtil.showRestException(e)
    }

    return null
  }

  static async templateFileDownload(templateFileId) {
    ServiceUtil.fileDownload('template-file', templateFileId)
  }

  static async fileDownload(refType, refBy) {
    // TeamplteId 로 템플릿 조회
    const response = await client.query({
      query: gql`
        query attachments($filters: [Filter!], $pagination: Pagination, $sortings: [Sorting!]) {
          attachments(filters: $filters, pagination: $pagination, sortings: $sortings) {
            items {
              id
              name
              fullpath
            }
            total
          }
        }
      `,
      variables: {
        filters: [
          { name: 'refType', operator: 'eq', value: refType },
          { name: 'refBy', operator: 'eq', value: refBy }
        ],
        pagination: { limit: 1, page: 1 },
        sortings: []
      }
    })

    // 첨부 파일 정보
    let total = response.data.attachments.total
    let results = response.data.attachments.items

    if (total == 0) {
      // 첨부 파일 없음
      MetaApi.showToast('info', TermsUtil.tText('Nothing Attached File'))
      return
    }

    if (total > 1) {
      // 파일이 여러개
      MetaApi.showToast('info', TermsUtil.tText('Multiple Attached Files'))
      return
    }

    let attachment = results[0]

    // download
    fetch(attachment.fullpath, { method: 'get', mode: 'no-cors', referrerPolicy: 'no-referrer' })
      .then(res => res.blob())
      .then(res => {
        const element = document.createElement('a')
        element.setAttribute('download', attachment.name)
        const href = URL.createObjectURL(res)
        element.href = href
        element.setAttribute('target', '_blank')
        element.click()
        URL.revokeObjectURL(href)
      })
  }

  /**
   * export Excel
   * @param {string} url 
   * @param {*} params 
   */
  static async excelFileDownload(url, params, fileName) {
    let res = await operatoGet(url, params, false)
    let arrayBuffer = await res.arrayBuffer()

    const blob = new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    let dwonloadFileName = fileName? fileName : Date.now() + '.xlsx'
    // download
    const element = document.createElement('a')
    element.setAttribute('download', dwonloadFileName)
    const href = URL.createObjectURL(blob)
    element.href = href
    element.setAttribute('target', '_blank')
    element.click()
    URL.revokeObjectURL(href)
    
  }
}
