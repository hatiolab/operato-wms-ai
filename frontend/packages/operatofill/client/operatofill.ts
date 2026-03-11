import { auth } from '@things-factory/auth-base/dist-client/auth.js'
import { store } from '@operato/shell'
import { OxPrompt } from '@operato/popup/ox-prompt.js'
import { decreaseActiveRequestCounter, increaseActiveRequestCounter } from '@operato/graphql'

import { OperatoTerms } from './terms.js'
import { i18next } from '@operato/i18n'

type Route = {
  id?: string
  parent?: boolean
  parent_id?: string | null
  title?: string
  tagname?: string
  page?: string
  template?: any
  routing_type?: string
}

// Operato 메뉴 - 라우팅 정보
var OPERATO_MENU: Promise<{
  menus: any
  routes: Route[]
}> = getDynamicMenus()

export function getDynamicMenus(update: boolean = false) {
  if (!update && OPERATO_MENU) {
    return OPERATO_MENU
  }

  OPERATO_MENU = new Promise<{
    menus: any
    routes: Route[]
  }>(resolve => {
    auth.on('profile', async (data: { credential; domains; domain; languages }) => {
      const menuData = await operatoGetMenus()

      resolve(initMenuRoutes(menuData))
    })
  })

  return OPERATO_MENU
}

/**
 * @description 서버에서 조회한 정보로 메뉴 템플릿을 구성하여 리턴
 *******************************************************
 * @param {Object} menuData
 * @returns
 */
export function initMenuRoutes(menuData) {
  // 1. routes
  const routes: Route[] = []

  // 1. 서버에서 조회한 메뉴 정보 중에 메인 메뉴를 추출
  const mainMenus = menuData
    .map(item => {
      const title = i18next.t(item.title)

      if (item.menu_type == 'MENU') {
        let pageName = item.name
        routes.push({
          id: item.id,
          parent: true,
          title: title,
          tagname: pageName,
          page: pageName,
          template: item.template,
          routing_type: item.routing_type
        })
        return { id: item.id, name: title, icon: item.icon_path, menus: [] }
      } else {
        return { id: '1' }
      }
    })
    .filter(i => i.id != '1')

  // 2. 메인 메뉴 하위에 서브 메뉴를 추가
  menuData.forEach(item => {
    const title = i18next.t(item.title)

    if (item.menu_type == 'SCREEN') {
      const parentMenu = mainMenus.find(main => main.id == item.parent_id)

      if (parentMenu) {
        routes.push({
          id: item.id,
          parent: false,
          parent_id: parentMenu.id,
          title,
          tagname: item.description ? item.description : item.routing,
          page: item.routing,
          template: item.template,
          routing_type: item.routing_type
        })
        parentMenu.menus.push({
          id: item.id,
          name: title,
          path: item.routing,
          icon: item.icon_path
        })
      }
    }

    if (item.menu_type == 'HIDDEN') {
      routes.push({
        id: item.id,
        parent: false,
        parent_id: null,
        title,
        tagname: item.description ? item.description : item.routing,
        page: item.routing,
        template: item.template,
        routing_type: item.routing_type
      })
    }
  })

  // 3. 메뉴 데이터 리턴
  return { menus: mainMenus, routes }
}

/**
 * @description store에서 라우트 관련 매핑 정보를 조회해서 리턴
 *****************************************************
 */
export async function getRouteMappings() {
  return (await getDynamicMenus()).routes || []
}

/**
 * @description Operato 메뉴 정보를 조회하여 리턴
 ********************************************
 * @returns
 */
export async function operatoGetMenus() {
  try {
    increaseActiveRequestCounter()

    const params = `query=%5B%7B%20name%3A%20%22category%22%2C%20operator%3A%20%22eq%22%2C%20value%3A%20OPERATO%7D%2C%20%7B%20name%3A%20%22hidden_flag%22%2C%20operator%3A%20%22is_not_true%22%20%7D%5D`
    const menuUrl = `/rest/menus/user_menus/OPERATO?${params}`

    // 1. 메뉴 정보 조회
    const res = await fetch(menuUrl, {
      method: 'GET',
      headers: {
        'Content-type': 'application/json',
        Accept: 'application/json',
        'x-locale': currentLocale() // TODO 로케일정보는 이미 다른 header에 포함하고 있을 듯. 중복된 기능이라면 제거하는 방향으로.
      }
    })

    // 2. 응답 체크
    return await checkResponse(res, true)
  } finally {
    decreaseActiveRequestCounter()
  }
}

/**
 * @description Operato 메뉴 메타 정보를 조회하여 리턴
 *************************************************
 * @param {String} menuName 메뉴 라우팅 혹은 메뉴 명
 * @returns 메뉴 메타 데이터
 */
export async function operatoGetMenuMeta(menuName) {
  try {
    increaseActiveRequestCounter()

    // 1. 권한 체크
    // hasPrivilege 로 변경되어야 함. - heartyoh
    // if ((await checkPermission()) == false) {
    //   return undefined
    // }

    // 2. 메뉴 메타 서비스 URL
    const menuUrl = `/rest/menus/${menuName}/operato_menu_meta?is_trans_term=false&codes_on_search_form=true`

    // 3. 메뉴 메타 정보 조회
    const res = await fetch(menuUrl, {
      method: 'GET',
      headers: {
        'Content-type': 'application/json',
        Accept: 'application/json',
        'x-locale': currentLocale()
      }
    })

    // 4. 메뉴 메타 데이터 리턴
    return await checkResponse(res, true)
  } finally {
    decreaseActiveRequestCounter()
  }
}

/**
 * @description Operato 서버에 GET 방식 호출, response 리턴
 *******************************************************
 * @param {String} url
 * @param {*} params
 * @param {Boolean} responseJson
 * @returns response 리턴
 */
export async function operatoGet(url, params, responseJson) {
  try {
    increaseActiveRequestCounter()

    var getUrl = `/rest/${url}`

    if (params == null || typeof params == undefined) {
    } else if (typeof params == 'string') {
      getUrl = `${getUrl}?${params}`
    } else if (Array.isArray(params)) {
      getUrl += '?'
      params.forEach((item, index, array) => {
        getUrl += `${item['name']}=${item['value']}&`
      })
    } else if (Object.keys(params).length > 0) {
      getUrl += '?'
      for (let param in params) {
        getUrl += `${param}=${params[param]}&`
      }
    }
    const res = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Content-type': 'application/json',
        Accept: 'application/json',
        'x-locale': currentLocale()
      }
    })

    const resJson = responseJson ? responseJson : false
    return await checkResponse(res, resJson)
  } finally {
    decreaseActiveRequestCounter()
  }
}

/**
 * @description Operato 서버에 GET 방식 호출, 응답 중에 JSON 데이터를 리턴
 *****************************************************************
 * @param {String} url
 * @param {Object} params
 * @returns response 중에 json 데이터 리턴
 */
export async function operatoGetData(url, params) {
  return await operatoGet(url, params, true)
}

/**
 * @description Operato 서버에 POST 방식 호출, 서버 response 자체를 리턴
 *****************************************************************
 * @param {*} url
 * @param {*} bodyObj
 * @param {Boolean} responseJson 응답 JSON을 받을 지 여부
 * @returns response 리턴
 */
export async function operatoPost(url, bodyObj, responseJson) {
  const bodyStr = typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj)
  const postUrl = `/rest/${url}`

  try {
    increaseActiveRequestCounter()

    const res = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        Accept: 'application/json',
        'x-locale': currentLocale()
      },
      body: bodyStr
    })

    const resJson = responseJson ? responseJson : false
    return await checkResponse(res, resJson)
  } finally {
    decreaseActiveRequestCounter()
  }
}

/**
 * @description Operato 서버에 POST 방식 호출 후 응답 데이터를 리턴
 ***********************************************************
 * @param {String} url
 * @param {Object} bodyObj
 * @returns response 중에 json 데이터 리턴
 */
export async function operatoPostData(url, bodyObj) {
  return await operatoPost(url, bodyObj, true)
}

/**
 * @description Operato 서버에 PUT 방식 호출, 서버 Response 자체를 리턴
 ****************************************************************
 * @param {String} url
 * @param {Object} bodyObj
 * @param {Boolean} responseJson 응답 JSON을 받을 지 여부
 * @returns 서버 response 리턴
 */
export async function operatoPut(url, bodyObj, responseJson) {
  try {
    increaseActiveRequestCounter()

    const bodyStr = typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj)
    const putUrl = `/rest/${url}`
    const res = await fetch(putUrl, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-type': 'application/json',
        Accept: 'application/json',
        'x-locale': currentLocale()
      },
      body: bodyStr
    })

    const resJson = responseJson ? responseJson : false
    return await checkResponse(res, resJson)
  } finally {
    decreaseActiveRequestCounter()
  }
}

/**
 * @description Operato 서버에 PUT 방식 호출 후 응답 데이터를 리턴
 **********************************************************
 * @param {String} url
 * @param {Object} bodyObj
 * @returns response 중에 json 데이터 리턴
 */
export async function operatoPutData(url, bodyObj) {
  return await operatoPut(url, bodyObj, true)
}

/**
 * @description Operato 서버에 DELETE 방식 호출 후 서버 response를 리턴
 ****************************************************************
 * @param {String} url
 * @param {Object} bodyObj
 * @param {Boolean} responseJson 응답 JSON을 받을 지 여부
 * @returns response 리턴
 */
export async function operatoDelete(url, bodyObj, responseJson) {
  try {
    increaseActiveRequestCounter()

    const bodyStr = typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj)
    const delUrl = `/rest/${url}`
    const res = await fetch(delUrl, {
      method: 'DELETE',
      headers: {
        'Content-type': 'application/json',
        Accept: 'application/json',
        'x-locale': currentLocale()
      },
      body: bodyStr
    })

    const resJson = responseJson ? responseJson : false
    return await checkResponse(res, resJson)
  } finally {
    decreaseActiveRequestCounter()
  }
}

/**
 * @description Operato 서버에 DELETE 방식 호출 후 응답 데이터를 리턴
 ************************************************************
 * @param {String} url
 * @param {Object} bodyObj
 * @returns response 중에 json 데이터 리턴
 */
export async function operatoDeleteData(url, bodyObj) {
  return await operatoDelete(url, bodyObj, true)
}

/**
 * @description Operato 서버에 멀티 데이터 업데이트 처리 요청
 *****************************************************
 * @param {String} url
 * @param {Object} bodyObj
 * @returns response 리턴
 */
export async function operatoUpdateMultiple(url, bodyObj) {
  try {
    increaseActiveRequestCounter()

    const bodyStr = typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj)
    const updateUrl = `/rest/${url}`
    const res = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        Accept: 'application/json',
        'x-locale': currentLocale()
      },
      body: bodyStr
    })

    return await checkResponse(res, false)
  } finally {
    decreaseActiveRequestCounter()
  }
}

/**
 * @description response 상태 체크 후 에러이면 에러 메시지 표시
 *******************************************************
 * @param {Object} res
 * @param {Boolean} responseJson
 */
export async function checkResponse(res, responseJson) {
  if (res && res.status && res.status >= 400) {
    try {
      let isJson = (await res.json) ? true : false
      let errData = isJson ? await res.json() : await res.text()
      let errMsg =
        typeof errData == 'string'
          ? errData
          : errData.code && errData.msg
          ? `${errData.code} - ${errData.msg}`
          : OperatoTerms.t1('text.unexpected_server_error')
      await showCustomAlert('title.error', errMsg, 'error', 'button.confirm')
      return errData
    } catch (err) {
      console.log(err)
    }
  } else {
    return responseJson === true && res.json ? await res.json() : res
  }
}

/*
 * @description 현재 로케일 설정을 가져온다
 *************************************
 * @returns
 * @description
 *  : 한글 ko 로 저장 server 에 ko-KR 로 전송
 *  : 영문 en-US 로 저장 server 에 그대로 전송
 */
export function currentLocale() {
  var cookie = document.cookie
  cookie = cookie.substring(cookie.indexOf('i18next'))
  if (cookie.indexOf(';') > -1) {
    cookie = cookie.substring(0, cookie.indexOf(';'))
  }
  cookie = cookie.replace('i18next=', '')
  if (cookie == 'ko') return 'ko-KR'
  else return cookie
}

/**
 * @description 스토어에 저장된 현재 메뉴의 이름
 *****************************************
 * @returns
 */
export function currentRouteMenu() {
  return (store.getState() as any).route.page
}

/**
 * @description 알림창 표시
 *************************
 * @param {String} titleCode
 * @param {String} textCode
 * @param {String} type
 * @param {String} confirmButtonCode
 * @param {String} cancelButtonCode
 * @returns {String} text or code
 */
async function showCustomAlert(
  titleCode: string,
  textCode: string,
  type: string,
  confirmButtonCode: string,
  cancelButtonCode?: string
) {
  const alertObj = {
    title: OperatoTerms.t1(titleCode),
    text: OperatoTerms.t1(textCode)
  }

  if (type) {
    alertObj['type'] = type
  }

  if (confirmButtonCode) {
    alertObj['confirmButton'] = { text: OperatoTerms.t1(confirmButtonCode) }
  }

  if (cancelButtonCode) {
    alertObj['cancelButton'] = { text: OperatoTerms.t1(cancelButtonCode) }
  }

  return await OxPrompt.open(alertObj)
}
