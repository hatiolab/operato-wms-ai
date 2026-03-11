import { getDynamicMenus } from './operatofill.js'

import { store } from '@operato/shell'
import { i18next } from '@operato/i18n'

import { updateMenuTemplate } from '@things-factory/lite-menu/dist-client'

export default async function bootstrap() {
  // 1 메뉴 템플릿 업데이트
  await updateMenuTemplate((await getDynamicMenus()).menus)

  i18next.on('languageChanged', async () => {
    updateMenuTemplate((await getDynamicMenus(true /* forcelly update */)).menus)
  })

  // 2 상위 메뉴가 없는 애드온 메뉴(보드 작업화면) 삭제
  var addOnMenus: any[] = (store.getState() as any)?.liteMenu?.addon || []
  var menus: any[] = (store.getState() as any)?.liteMenu?.menus || []
  var removeAddOn: any[] = []

  // 3.1 상위 메뉴에 노출된 애드온 메뉴 추출
  addOnMenus.forEach(addon => {
    if (menus.filter(menu => menu.path && menu.path.indexOf(addon.value) > -1).length > 0) {
      removeAddOn.push(addon)
    }
  })

  // 3.2 상위 메뉴에 노출된 애드온 메뉴 추출
  addOnMenus = addOnMenus.filter(addon => {
    if (removeAddOn.filter(remove => remove.id == addon.id).length > 0) {
      return false
    }

    return true
  })

  // 3.3 애드온 메뉴 갱신
  store.dispatch({
    type: 'UPDATE_ADDON_MENUS',
    addon: addOnMenus
  })
}
