import '@material/web/icon/icon.js'
import '@things-factory/auth-ui/dist-client' /* for domain-switch */
import '@things-factory/setting-ui/dist-client' /* theme-mode-setting-let */

import './pages/oms/auto-wave-create-popup.js'

import { html } from 'lit-html'

import { navigate, store } from '@operato/shell'
import { registerDefaultGroups } from '@operato/board/register-default-groups.js'
import { isMobileDevice } from '@operato/utils'
import { ADD_MORENDA } from '@things-factory/more-base/client'
import { ADD_SETTING } from '@things-factory/setting-base/dist-client'
import { setupAppToolPart } from '@things-factory/apptool-ui/dist-client'
import { setupMenuPart } from '@things-factory/lite-menu/dist-client'
import { setupContextUIPart } from '@things-factory/context-ui/dist-client'
import { VIEWPART_POSITION } from '@operato/layout'



export default async function bootstrap(module) {
  /* set board-modeller group and default templates */
  registerDefaultGroups()

  // 1. 메뉴 설정
  await setupAppToolPart({
    toolbar: true,
    busybar: true,
    mdibar: true
  })

  await setupContextUIPart({
    titlebar: 'header',
    contextToolbar: 'page-footer'
  })

  await setupMenuPart({
    hovering: isMobileDevice(),
    position: VIEWPART_POSITION.NAVBAR,
    portraitSlotTemplate: html` <domain-switch slot="head"></domain-switch> `
  })

  store.dispatch({
    type: ADD_MORENDA,
    morenda: {
      icon: html` <md-icon>settings</md-icon> `,
      name: html` <ox-i18n msgid="label.setting"></ox-i18n> `,
      action: () => {
        navigate('setting')
      }
    }
  })

  store.dispatch({
    type: ADD_SETTING,
    setting: {
      seq: 10,
      template: html` <theme-mode-setting-let></theme-mode-setting-let> `
    }
  })

  store.dispatch({
    type: ADD_SETTING,
    setting: {
      seq: 21,
      template: html` <lite-menu-setting-let></lite-menu-setting-let> `
    }
  })
}
