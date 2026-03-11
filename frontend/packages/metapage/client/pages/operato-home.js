import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { p13n } from '@operato/p13n'

class OperatoHome extends p13n(localize(i18next)(PageView)) {
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          gap: 20px;

          position: relative;
          text-align: center;

          background-color: var(--system-info-background-color);
          color: var(--system-info-color);
          font: var(--system-info-font);
          height: 70vh;

          align-items: center;
          justify-content: center;
        }

        :host * {
          vertical-align: middle;
        }

        strong {
          font: var(--system-info-appname-font);
          color: var(--system-info-appname-color);
        }

        span {
          display: block;
        }

        span.description {
          padding: 14px;
          font: var(--system-info-description-font);
          color: var(--system-info-description-color);
        }
      `
    ]
  }

  get context() {
    var { title } = this.applicationMeta

    return {
      title
    }
  }

  render() {
    var { icon, title, description } = this.applicationMeta

    return html`
      <img src=${icon} alt="system logo" />

      <div>
        <strong>${title}</strong>
        <span class="description">${description}</span>
      </div>
    `
  }

  get applicationMeta() {
    if (!this._applicationMeta) {
      var iconLink = document.querySelector('link[rel="application-icon"]')
      var titleMeta = document.querySelector('meta[name="application-name"]')
      var descriptionMeta = document.querySelector('meta[name="application-description"]')
      var copyrightMeta = document.querySelector('meta[name="application-copyright"]')

      this._applicationMeta = {
        icon: iconLink?.href,
        title: titleMeta ? titleMeta.content : 'Operato Suite',
        description: descriptionMeta ? descriptionMeta.content : 'Reimagining Software',
        copyright: copyrightMeta ? copyrightMeta.content : 'Copyright © hatiolab.com. All Rights Reserved." />'
      }
    }

    return this._applicationMeta
  }
}

window.customElements.define('operato-home', OperatoHome)
