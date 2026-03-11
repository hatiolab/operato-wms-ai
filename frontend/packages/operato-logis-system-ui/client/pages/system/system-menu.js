// import '@material/web/icon/icon.js'

// import '@operato/form'
// import './system-sub-menu-popup'
// import '@operato/data-grist/ox-grist.js'
// import '@operato/data-grist/ox-filters-form.js'
// import '@operato/data-grist/ox-sorters-control.js'
// import '@operato/data-grist/ox-record-creator.js'

// import { css, html } from 'lit-element'

// import { PageView } from '@operato/shell'
// import { CommonGristStyles, CommonButtonStyles } from '@operato/styles'
// import { isMobileDevice } from '@operato/utils'
// import { i18next, localize } from '@operato/i18n'
// import { OxPrompt } from '@operato/popup/ox-prompt.js'
// import { openPopup } from '@operato/layout'

// import {
//   operatoGetMenuMeta,
//   operatoGetData,
//   operatoUpdateMultiple,
//   currentRouteMenu
// } from '@operato-app/operatofill'

// /**
//  * @license
//  * Copyright © HatioLab Inc. All rights reserved.
//  * @author Shortstop <shortstop@hatiolab.com>
//  * @description 메뉴 관리 정적 화면 - 사용 안 함. 현재는 다이나믹 화면을 사용하고 있음
//  */
// class SystemMenu extends localize(i18next)(PageView) {
//   /**
//    * @description 프로퍼티
//    *****************************
//    * @returns {Object} 프로퍼티 정보
//    */
//   static get properties() {
//     return {
//       config: Object,
//       data: Object,
//       total: 0,
//       records: Array,
//       sort_fields: Object,
//       actions: Object,
//       grid_config: Object,
//       menu: Object,
//       menu_params: Object,
//       search_hidden_fields: Object,
//       select_fields: Object,
//       sort_fields: Object,
//       use_add_button: Boolean
//     }
//   }

//   /**
//    * @description 스타일 정보
//    *****************************
//    * @returns {Array} 스타일 정보
//    */
//   static get styles() {
//     return [
//       CommonGristStyles,
//       css`
//         :host {
//           display: flex;
//           flex-direction: column;
//           overflow: hidden;
//         }

//         ox-grist {
//           overflow-y: auto;
//           flex: 1;
//         }
//       `
//     ]
//   }

//   /**
//    * @description LifeCycle
//    * 메뉴 메타 정보 가져오기 때문에 async 처리
//    * 부모의 connectedCallback 을 먼저 실행 하면 lifecycle 순서가 꼬임. 아래 순서로 진행 필수
//    *****************************************
//    */
//   async connectedCallback() {
//     let menuName = currentRouteMenu()
//     let menuMeta = await operatoGetMenuMeta(menuName)

//     this.sort_fields = menuMeta.sort_fields
//     this.actions = menuMeta.actions
//     this.grid_config = menuMeta.grid_config
//     this.menu = menuMeta.menu
//     this.menu_params = menuMeta.menu_params.params
//     this.search_hidden_fields = menuMeta.search_hidden_fields
//     this.select_fields = menuMeta.select_fields
//     this.use_add_button = menuMeta.use_add_button

//     super.connectedCallback()
//   }

//   /**
//    * @description 화면 렌더링
//    *************************
//    * @returns {HTML}
//    */
//   render() {
//     return html`
//       <ox-grist
//         id="ox-grist"
//         .config=${this.config}
//         .mode=${isMobileDevice() ? 'LIST' : 'GRID'}
//         auto-fetch
//         .fetchHandler=${this.fetchHandler.bind(this)}
//       >
//         <div slot="headroom">
//           <div id="filters">
//             <ox-filters-form></ox-filters-form>
//           </div>

//           <div id="sorters">
//             <md-icon
//               @click=${e => {
//                 const target = e.currentTarget
//                 this.renderRoot.querySelector('#sorter-control').open({
//                   right: 0,
//                   top: target.offsetTop + target.offsetHeight
//                 })
//               }}
//               >sort</md-icon
//             >
//             <ox-popup id="sorter-control">
//               <ox-sorters-control> </ox-sorters-control>
//             </ox-popup>
//           </div>

//           <ox-record-creator
//             id="add"
//             ?hidden="${!this.use_add_button}"
//             .callback=${this.recordCreationCallback.bind(this)}
//           >
//             <button style="display: flex; justify-content: center">
//               <md-icon>add</md-icon>
//             </button>
//           </ox-record-creator>
//         </div>
//       </ox-grist>
//     `
//   }

//   /**
//    * @description 화면 컨텍스트 정보
//    *******************************
//    * @returns {Object}
//    */
//   get context() {
//     const actions = this.actions || []
//     // 버튼에 style 및 function 연결
//     actions.forEach((currentElement, index, array) => {
//       currentElement.action = this[currentElement.action]?.bind(this)

//       if (currentElement.style) {
//         Object.assign(currentElement, CommonButtonStyles[currentElement.style])
//       }
//     })

//     return {
//       title: this.menu?.title,
//       actions
//     }
//   }

//   /**
//    * @description 검색 폼 리턴
//    ****************************
//    * @returns {Object}
//    */
//   get searchForm() {
//     return this.renderRoot.querySelector('ox-filters-form')
//   }

//   /**
//    * @description 그리드 리턴
//    ****************************
//    * @returns {Object}
//    */
//   get dataGrist() {
//     return this.renderRoot.querySelector('ox-grist')
//   }

//   /**
//    * @description 데이터 조회를 위한 URL 리턴
//    **************************************
//    * @returns {String}
//    */
//   get getResourceUrl() {
//     return this.menu.resource_url
//   }

//   /**
//    * @description  페이지 초기화 완료 LifeCycle
//    *****************************************
//    */
//   firstUpdated() {
//     let menu = this.menu
//     let menuParams = this.menu_params

//     // 상세 폼 여부에 따라 상세 보기 아이콘 설정
//     let detailIcon = menu.use_detail_form
//       ? {
//           type: 'gutter',
//           gutterName: 'button',
//           icon: 'reorder',
//           handlers: {
//             click: (_columns, _data, _column, record, _rowIndex) => {
//               if (record.id) this.openDetailPopup(record)
//             }
//           }
//         }
//       : undefined

//     // 페이지 사용 여부에 따라 그리드 내 페이지네이션 설정
//     let pagination = undefined
//     let gridMultipleSelect = true

//     // 그리드 멀티 선택 옵션
//     if (menuParams.grid_multiple_select) {
//       gridMultipleSelect = menuParams.grid_multiple_select === 'true'
//     }

//     // 페이지 사용 안 함
//     if (menu.use_pagination == false) {
//       pagination = { infinite: true }

//       // 페이지 옵션이 menu_param에 설정
//     } else if (menuParams.pagination) {
//       let pagesStrList = menuParams.pagination.split(',')
//       let pagesInt = pagesStrList.map(i => {
//         return parseInt(i)
//       })

//       pagination = { pages: pagesInt }

//       // default
//     } else {
//       pagination = { pages: [50, 100, 500] }
//     }

//     this.config = {
//       rows: { selectable: { multiple: gridMultipleSelect }, appendable: this.use_add_button },
//       columns: [
//         { type: 'gutter', gutterName: 'dirty' },
//         { type: 'gutter', gutterName: 'sequence' },
//         { type: 'gutter', gutterName: 'row-selector', multiple: gridMultipleSelect }
//       ]
//     }

//     if (detailIcon) {
//       this.config.columns.push(detailIcon)
//     }

//     this.config.columns.push(...this.grid_config)
//     this.config['pagination'] = pagination
//   }

//   /**
//    * @description 리스트 조회
//    *****************************
//    * @param {Number} page
//    * @param {Number} limit
//    * @param {Array} sorters
//    * @param {Array} filters
//    * @returns {Object}
//    */
//   async fetchHandler({ page, limit, sorters = [], filters = [] }) {
//     // 1. 페이지네이션 사용 여부
//     if (!this.menu.use_pagination) {
//       page = 0
//       limit = 0
//     }

//     let query = [...this.search_hidden_fields, ...filters]
//     sorters.push(...this.sort_fields)

//     // 2. 소팅 정보
//     let sort = sorters.map(s => {
//       return {
//         field: s.name,
//         ascending: s.desc ? false : true
//       }
//     })

//     // 3. 파라미터 구성
//     let params = [
//       {
//         name: 'select',
//         value: encodeURI(this.select_fields.join(','))
//       },
//       {
//         name: 'sort',
//         value: encodeURI(JSON.stringify(sort))
//       },
//       {
//         name: 'query',
//         value: encodeURI(JSON.stringify(query))
//       },
//       {
//         name: 'page',
//         value: page
//       },
//       {
//         name: 'limit',
//         value: limit
//       }
//     ]

//     // 4. 데이터 조회
//     let response = await operatoGetData(this.getResourceUrl, params)

//     // 5. 총 데이터 개수와 레코드 정보 정리
//     let total = this.menu.total_res_field ? response[this.menu.total_res_field] || 0 : 0
//     let records = this.menu.items_res_field ? response[this.menu.items_res_field] || [] : response

//     // 6. 총 개수와 데이터 리턴
//     return {
//       total: total,
//       records: records
//     }
//   }

//   /**
//    * @description 데이터 저장 (insert / update) 처리
//    ************************************************
//    */
//   async save() {
//     // 1. 변경 내용 추출
//     const patches = this.getPatches()

//     // 2. 변경 내용이 없으면 메시지 표시 후 리턴
//     if (!patches || patches.length == 0) {
//       await OxPrompt.open({
//         type: 'info',
//         title: i18next.t('text.nothing_changed'),
//         text: i18next.t('text.there_is_nothing_to_save')
//       })

//       // 3. 데이터 저장 (insert / update) 처리
//     } else {
//       let response = await this.requestCudMultiple(patches)
//       if (!response.errors) {
//         this.dataGrist.fetch()
//       }
//     }
//   }

//   /**
//    * @description 데이터 삭제 처리
//    *****************************
//    */
//   async delete() {
//     // 1. 삭제할 데이터의 ID List 추출
//     const ids = this.dataGrist.selected.map(record => record.id)

//     // 2. 삭제할 데이터 ID가 없다면 메시지 표시 후 리턴
//     if (!ids || ids.length == 0) {
//       await OxPrompt.open({
//         title: i18next.t('text.nothing_selected'),
//         text: i18next.t('text.there_is_nothing_to_delete')
//       })

//       // 3. 데이터 ID List 삭제 처리
//     } else {
//       // 3.1 삭제 처리 사용자 확인
//       const anwer = await OxPrompt.open({
//         type: 'warning',
//         title: i18next.t('button.delete'),
//         text: i18next.t('text.are_you_sure'),
//         confirmButton: { text: i18next.t('button.delete') },
//         cancelButton: { text: i18next.t('button.cancel') }
//       })

//       // 3.2 삭제 처리 확인
//       if (anwer) {
//         let delIdList = ids.map(i => {
//           return { id: i, cud_flag_: 'd' }
//         })

//         // delete 처리
//         let response = await this.requestCudMultiple(delIdList)
//         if (!response.errors) {
//           this.dataGrist.fetch()
//         }
//       }
//     }
//   }

//   /**
//    * @description 레코드 단건 생성
//    *****************************
//    * @param {Object} patches 패치 정보
//    * @returns {Boolean} 처리 성공 여부
//    */
//   async recordCreationCallback(patches) {
//     try {
//       patches = [{ ...patches, cud_flag_: 'c' }]
//       var response = await this.requestCudMultiple(patches)

//       if (!response.errors) {
//         this.dataGrist.fetch()
//         document.dispatchEvent(
//           new CustomEvent('notify', {
//             detail: {
//               message: i18next.t('text.data_created_successfully')
//             }
//           })
//         )

//         return true
//       } else {
//         return false
//       }
//     } catch (e) {
//       console.error(e)
//       document.dispatchEvent(
//         new CustomEvent('notify', {
//           detail: {
//             type: 'error',
//             message: i18next.t('text.error')
//           }
//         })
//       )
//     }
//   }

//   /**
//    * @description 멀티 레코드 생성 / 삭제 / 수정 처리
//    ********************************************
//    * @param {Array} patches 패치 정보
//    * @returns {Object} 처리 성공 여부
//    */
//   async requestCudMultiple(patches) {
//     return await operatoUpdateMultiple(this.menu.save_url, patches)
//   }

//   /**
//    * @description 캐쉬 리셋 처리
//    ***************************
//    */
//   async clearCache() {}

//   /**
//    * @description 그리드에서 추가, 변경된 레코드를 추출
//    ************************************************
//    * @returns {Array} 그리드에서 추가, 변경된 레코드 리스트
//    */
//   getPatches() {
//     let cudRecords = this.dataGrist.dirtyRecords

//     if (cudRecords && cudRecords.length) {
//       cudRecords.forEach((currentElement, index, array) => {
//         currentElement.cud_flag_ = currentElement.__dirty__ == 'M' ? 'u' : 'c'
//       })

//       return cudRecords
//     } else {
//       return null
//     }
//   }

//   /**
//    * @description 서브 메뉴 팝업 오픈
//    ********************************
//    * @param {Object} record
//    */
//   openDetailPopup(record) {
//     let htmlText = `<${this.menu.detail_form_resource} menu_name='${this.menu.detail_form_name}' parent_id='${record.id}'></${this.menu.detail_form_resource}>`
//     let htmlElemnts = this.htmlToElements(htmlText)

//     openPopup(htmlElemnts, {
//       backdrop: true,
//       size: 'large',
//       title: record[this.menu.title_field]
//     })
//   }

//   /**
//    * @description HTML 문자열을 elements로 변환
//    ********************************
//    * @param {String} htmlString HTML 문자열
//    * @returns {Array} html elements
//    */
//   htmlToElements(htmlString) {
//     var template = document.createElement('template')
//     template.innerHTML = htmlString
//     return template.content.childNodes
//   }
// }

// window.customElements.define('system-menu', SystemMenu)
