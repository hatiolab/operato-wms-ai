import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'

class ConfigHome extends localize(i18next)(PageView) {
  static get styles() {
    return [
      css`
        :host {
          display: block;
          background-color: var(--md-sys-color-background);
          padding: var(--padding-wide);
          overflow: auto;
        }
        h2 {
          margin: var(--title-margin);
          font: var(--title-font);
          color: var(--title-text-color);
        }
        input {
          display: block;
        }
        [page-description] {
          margin: var(--page-description-margin);
          font: var(--page-description-font);
          color: var(--page-description-color);
        }
        [button-primary] {
          background-color: var(--button-primary-background-color);
          border: var(--button-border);
          border-radius: var(--button-border-radius);
          padding: var(--button-padding);
          color: var(--button-primary-color);
          font: var(--button-primary-font);
          text-transform: var(--button-text-transform);
          text-decoration: none;
        }
        [button-primary]:hover {
          background-color: var(--button-primary-active-background-color);
          box-shadow: var(--button-active-box-shadow);
        }
        img {
          max-width: 45%;
          float: right;
        }
        @media screen and (max-width: 600px) {
          img {
            display: none;
          }
        }
      `
    ]
  }

  static get properties() {
    return {
      bizplaces: Array
    }
  }

  get context() {
    return {
      title: `설정 관리`,
      actions: [
        {
          title: i18next.t('button.save')
        }
      ]
    }
  }

  render() {
    return html`
      <h2>설정 관리</h2>
      <p page-description>이 메뉴는 Operato WES 애플리케이션 설정을 관리하는 메뉴입니다.</p>

      <img src="/assets/images/config/config-home.png" />
    `
  }

  updated(changes) {
    /*
     * If this page properties are changed, this callback will be invoked.
     * This callback will be called back only when this page is activated.
     */
    if (changes.has('applications')) {
      /* do something */
    }
  }

  stateChanged(state) {
    // this.bizplaces = state.hub?.bizplaces
  }

  /*
   * page lifecycle
   *
   * - pageInitialized(lifecycle)
   * - pageUpdated(changes, lifecycle, changedBefore)
   * - pageDisposed(lifecycle)
   *
   * lifecycle value has
   * - active : this page is activated
   * - page : first path of href
   * - resourceId : second path of href
   * - params : search params object of href
   * - initialized : initialized state of this page
   *
   * you can update lifecycle values, or add custom values
   * by calling this.pageUpdate({ ...values }, force)
   * If lifecycle values changed by this.pageUpdate(...),
   * this.pageUpdated(...) will be called back right after.
   * If you want to invoke this.pageUpdated(...) callback,
   * set force argument to true.
   *
   * you can re-initialize this page
   * by calling this.pageReset().
   * this.pageInitialized(...) followed by this.pageDispose(...) will be invoked
   * by calling this.pageReset().
   *
   * you can invoke this.pageDisposed()
   * by calling this.pageDispose()
   */

  pageInitialized(lifecycle) {
    /*
     * This page is initialized.
     * It's right time to configure of this page.
     *
     * - called before when this page activated first
     * - called when i18next resource is updated (loaded, changed, ..)
     * - called right after this.pageReset()
     */
  }

  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      /*
       * this page is activated
       */
    } else {
      /* this page is deactivated */
    }
  }

  pageDisposed(lifecycle) {
    /*
     * This page is disposed.
     * It's right time to release system resources.
     *
     * - called just before (re)pageInitialized
     * - called right after when i18next resource updated (loaded, changed, ..)
     * - called right after this.pageReset()
     * - called right after this.pageDispose()
     */
  }
}

window.customElements.define('config-home', ConfigHome)
