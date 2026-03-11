import { MetaFormMixin } from './../mixin/meta-form-mixin'

import { PageView } from '@operato/shell'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 기본 폼 페이지
 */
export class BasicFormPage extends MetaFormMixin(p13n(localize(i18next)(PageView))) {}

customElements.define('basic-form-page', BasicFormPage)
