import { LitElement, html, css } from 'lit-element'
import { GhostPrint } from '@operato/ghost-print'

export class BasicPdfPrint extends LitElement {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        background-color: var(--md-sys-color-background);
      }
    `
  }

  render() {
    return html``
  }

  async connectedCallback() {
    super.connectedCallback()

    await this.fetchHandler()
  }

  /* 이렇게 UI를 사용하는 방식 보다는, print 기능을 공통 API로 제공하고 menu에서 설정하는 것이 간편할 것이다. */
  async fetchHandler() {
    let params = {}
    let url = this.resource_url ? this.resource_url : `printouts/show_pdf/by_template/${this.parent_id}`
    url = `stream/${url}`

    let res = await operatoPost(url, params, false)
    let data = await res.arrayBuffer()
    const blob = new Blob([data], { type: 'application/pdf' })

    GhostPrint.print({
      src: URL.createObjectURL(blob),
      onfinish: () => {
        /* close this component here.. like history.back() */
      }
    })
  }
}

customElements.define('basic-pdf-print', BasicPdfPrint)
