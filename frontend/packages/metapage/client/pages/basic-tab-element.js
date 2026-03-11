import { MetaTabMixin } from '../mixin/meta-tab-mixin'

import { LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 기본 탭 엘리먼트
 */
export class BasicTabElement extends MetaTabMixin(p13n(localize(i18next)(LitElement))) {}

customElements.define('basic-tab-element', BasicTabElement)
