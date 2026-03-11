import { PageView } from '@operato/shell'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'
import { MetaMobileGristTabMixin } from '../mixin/meta-mobile-grist-tab-mixin'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 모바일 그리스트 탭 페이지
 */
export class BasicMobileGristTabPage extends MetaMobileGristTabMixin(p13n(localize(i18next)(PageView))) {
}
  
customElements.define('basic-mobile-grist-tab-page', BasicMobileGristTabPage)  