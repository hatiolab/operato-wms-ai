import '@operato/i18n/ox-i18n.js'
import '@material/web/radio/radio.js'

import { css, html, LitElement } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { i18next, localize } from '@operato/i18n'
import { clientSettingStore } from '@operato/shell'
import { MdRadio } from '@material/web/radio/radio.js'
import { isInteger } from 'lodash'

@customElement('notification-time-setting-let')
export class NotificationTimeSettingLet extends localize(i18next)(LitElement) {
  static styles = [
    css`
      label {
        display: flex;
        gap: 10px;
        align-items: center;

        font: var(--label-font);
        color: var(--md-sys-color-on-surface);
        text-transform: var(--label-text-transform);
      }

      div[slot='content'] {
        display: flex;
        gap: 10px;
      }
    `
  ]

  @property({ type: Number, attribute: 'notification-time' }) notificationTime: 3000 | 5000 | 10000 | 20000 | 30000 = 5000

  render() {
    const notificationTime = this.notificationTime

    return html`
      <setting-let>
        <ox-i18n slot="title" msgid="title.notification time"></ox-i18n>

        <div slot="content" @change=${(e: Event) => this.onChangeNotiTime(e)}>
          <md-radio id="time3sec" name="noti-time" value=3000 ?checked=${notificationTime == 3000}></md-radio>
          <label for="time3sec">3 Sec</label>

          <md-radio id="time5sec" name="noti-time" value=5000 ?checked=${notificationTime == 5000}></md-radio>
          <label for="time5sec">5 Sec</label>

          <md-radio id="time10sec" name="noti-time" value=10000 ?checked=${notificationTime == 10000}></md-radio>
          <label for="time10sec">10 Sec</label>

          <md-radio id="time20sec" name="noti-time" value=20000 ?checked=${notificationTime == 20000}></md-radio>
          <label for="time20sec">20 Sec</label>

          <md-radio id="time30sec" name="noti-time" value=30000 ?checked=${notificationTime == 30000}></md-radio>
          <label for="time30sec">30 Sec</label>
        </div>
      </setting-let>
    `
  }

  async firstUpdated() {
    this.notificationTime = ((await clientSettingStore.get('notification'))?.value || {}).notificationTimer || 5000;
  }

  async onChangeNotiTime(e: Event) {
    const target = e.target as MdRadio
    const value = target.value
    const time = (this.querySelector('md-radio[checked]') as MdRadio)?.value || value

    if (time) {
      try {
        await clientSettingStore.put({
          key: 'notification',
          value: {
            notificationTimer:time
          }
        })

      } catch (e) {
        console.error(e)
      }
    }
  }
}
