import { MetaAttributeMixin } from '../mixin/meta-attribute-mixin'

import { LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

import '@operato/input/ox-input-code.js'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author yang 
 * @description 기본 폼 엘리먼트
 */
export class BasicAttributesElement extends MetaAttributeMixin(p13n(localize(i18next)(LitElement))) {

}

customElements.define('basic-attributes-element', BasicAttributesElement)
