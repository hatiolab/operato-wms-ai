import { html, css } from 'lit-element'

import { PageView } from '@operato/shell'
import { i18next, localize } from '@operato/i18n'
import '@operato/form/ox-search-form.js'

import { MetaPdaSimpleScreenMixin } from '@operato-app/metapage/client/mixin/meta-pda-simple-screen-mixin'
import { MetaPdaSearchformMixin } from '@operato-app/metapage/client/mixin/meta-pda-searchform-mixin'
import { MetaPdaListMixin } from '@operato-app/metapage/client/mixin/meta-pda-list-mixin'
import { CustomGristButtonMixin } from '@operato-app/metapage/client/mixin/custom-grist-button-mixin'

import { UiUtil } from '@operato-app/metapage/client/utils/ui-util'
import { MetaUiUtil } from '@operato-app/metapage/client/utils/meta-ui-util'
import { TermsUtil } from '@operato-app/metapage/client/utils/terms-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description List 기반 PDA 템플릿
 *  - Filter Form
 *      - 필터 폼 리셋
 *      - 입력 컴포넌트 별로 서비스 URL 다르게
 *      - 바코드 스캔 : 팝업이 정의되어 있다면 팝업 호출
 *      - Focus 이동
 *  - Grist
 *      - 카드 그리드
 *  - Popup
 *      - 팝업 실행 (다른 메뉴 실행)
 *  - Button
 *      - 추가, 삭제, 저장, 리셋, 검색 폼 클리어, 그리드 클리어, 화면 전체 클리어 버튼 기본 제공
 *      - 트랜잭션 처리 버튼
 *      - 팝업 실행 버튼
 */
export class PdaListTemplate1 extends MetaPdaSimpleScreenMixin(localize(i18next)(PageView)) {
  /**
   * @override Callback after transaction success
   ************************************************
   */
  async trxSuccessCallback() {
    return this.is_popup ? history.back() : this.reset_all()
  }
}

customElements.define('pda-list-template1', PdaListTemplate1)
