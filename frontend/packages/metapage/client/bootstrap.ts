import { navigate, store } from '@operato/shell'
import notificationTimer from './reducers/metapage'
import { html } from 'lit-html'
import { ADD_SETTING } from '@things-factory/setting-base/dist-client'
import { ADD_MORENDA } from '@things-factory/more-base/client'

import './setting-lets/notification-time-setting-let'

import './pages/basic-code-editor-element'
import './pages/basic-column-form-element'
import './pages/basic-excel-import-element'
import './pages/basic-form-element'
import './pages/basic-attributes-element'
import './pages/basic-grist-element'
import './pages/basic-grist-detail-element'
import './pages/basic-master-detail-element'
import './pages/basic-mobile-form-element'
import './pages/basic-pda-grist-element'
import './pages/basic-pdf-element'
import './pages/basic-tab-element'

import './pages/basic-chart-page'
import './pages/basic-form-page'
import './pages/basic-form-event-page'
import './pages/basic-grist-chart-page'
import './pages/basic-grist-page'
import './pages/basic-master-detail-page'
import './pages/basic-mobile-form-page'
import './pages/basic-column-form-page'
import './pages/basic-pda-grist-page'
import './pages/basic-mobile-grist-tab-page'

import './components/operato-input-editor'

import { registerFilterRenderer as formRegisterFilterRenderer } from '@operato/form'
import {
  registerEditor as gristColumnRegisterEditor,
  registerRenderer as gristColumnRegisterRenderer,
  registerFilterRenderer as gristRegisterFilterRenderer
} from '@operato/data-grist'

//import { OxPropertyEditorImageSelector } from '@operato/attachment/ox-property-editor-image-selector';

import { OxGristRendererMetaSelect } from './components/renderer/ox-grist-renderer-meta-select'
import { OxGristEditorMetaSelect } from './components/editor/ox-grist-editor-meta-select'
import { FilterGristMetaSelect } from './components/filter/filter-grist-meta-select'

import { OxGristRendererResourceColumn } from './components/renderer/ox-grist-renderer-resource-column'

import { OxGristEditorImageSelector } from './components/editor/ox-grist-editor-image-selector'
import { OxGristRendererImageSelector } from './components/renderer/ox-grist-renderer-image-selector'

import { OxGristRendererResourceSelector } from './components/renderer/ox-grist-renderer-resource-selector'
import { OxGristEditorResourceSelector } from './components/editor/ox-grist-editor-resource-selector'

import { OxGristRendererResourceFormatSelector } from './components/renderer/ox-grist-renderer-resource-format-selector'
import { OxGristEditorResourceFormatSelector } from './components/editor/ox-grist-editor-resource-format-selector'

import { FilterGristMetaObjectSelect } from './components/filter/filter-grist-meta-object-select'
import { FilterGristMetaNamedSelect } from './components/filter/filter-grist-meta-named-select'

import { FilterFormMetaObjectSelect } from './components/filter/filter-form-meta-object-select'
import { FilterFormMetaNamedSelect } from './components/filter/filter-form-meta-named-select'

export default async function bootstrap(module) {
  // 1. notification timer 설정
  store.addReducers({ notificationTimer })

  // 2. 그리드 컬럼 렌더러 추가 등록
  gristColumnRegisterRenderer('resource-selector', OxGristRendererResourceSelector)
  gristColumnRegisterRenderer('resource-format-selector', OxGristRendererResourceFormatSelector)
  gristColumnRegisterRenderer('resource-column', OxGristRendererResourceColumn)
  gristColumnRegisterRenderer('select', OxGristRendererMetaSelect)
  gristColumnRegisterRenderer('image', OxGristRendererImageSelector)

  // 3. 그리드 컬럼 에디터 추가 등록
  gristColumnRegisterEditor('resource-selector', OxGristEditorResourceSelector)
  gristColumnRegisterEditor('resource-format-selector', OxGristEditorResourceFormatSelector)
  gristColumnRegisterEditor('select', OxGristEditorMetaSelect)
  gristColumnRegisterEditor('image', OxGristEditorImageSelector)

  // 4. 그리드 필터 렌더러 등록
  gristRegisterFilterRenderer('resource-selector', [FilterGristMetaObjectSelect])
  gristRegisterFilterRenderer('resource-format-selector', [FilterGristMetaNamedSelect])
  gristRegisterFilterRenderer('select', [FilterGristMetaSelect])

  // 5. 폼 렌더러 등록
  formRegisterFilterRenderer('resource-selector', [FilterFormMetaObjectSelect])
  formRegisterFilterRenderer('resource-format-selector', [FilterFormMetaNamedSelect])

  // 6. Notification timeout 설정 UI
  store.dispatch({
    type: ADD_SETTING,
    setting: {
      seq: 30,
      template: html` <notification-time-setting-let></notification-time-setting-let> `
    }
  })

  // 7. 템플릿 파일 관리
  /*store.dispatch({
    type: ADD_MORENDA,
    morenda: {
      icon: html` <md-icon>upload_file</md-icon> `,
      name: html` <ox-i18n msgid="menu.template-file-management"></ox-i18n> `,
      action: () => {
        navigate('template-files')
      }
    }
  })*/
}
