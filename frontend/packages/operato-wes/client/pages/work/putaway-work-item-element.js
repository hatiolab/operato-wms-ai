import { LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

import { MetaMobileFormMixin } from '@operato-app/metapage/dist-client/mixin/meta-mobile-form-mixin'

import { UiUtil } from '@operato-app/metapage/dist-client/utils/ui-util'
import { ValueUtil } from '@operato-app/metapage/dist-client/utils/value-util'
import { ServiceUtil } from '@operato-app/metapage/dist-client/utils/service-util'
import { TermsUtil } from '@operato-app/metapage/dist-client/utils/terms-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 적치 상세 처리 화면
 */
export class PutawayWorkItemElement extends MetaMobileFormMixin(p13n(localize(i18next)(LitElement))) {}

customElements.define('putaway-work-item-element', PutawayWorkItemElement)
