import { MetaFormMixin } from '../mixin/meta-form-mixin'

import { LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

import '@operato/input/ox-input-code.js'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 기본 폼 엘리먼트
 */
export class BasicFormElement extends MetaFormMixin(p13n(localize(i18next)(LitElement))) {}

customElements.define('basic-form-element', BasicFormElement)
