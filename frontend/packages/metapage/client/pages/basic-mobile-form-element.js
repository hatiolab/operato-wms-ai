import '@operato/input/ox-input-code.js'

import { LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

import { MetaMobileFormMixin } from '../mixin/meta-mobile-form-mixin'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 모바일 (폰, PDA, 태블릿) 폼 엘리먼트
 */
export class BasicMobileFormElement extends MetaMobileFormMixin(p13n(localize(i18next)(LitElement))) {}

customElements.define('basic-mobile-form-element', BasicMobileFormElement)
