import { i18next } from '@operato/i18n'

export class OperatoTerms {
  /**
   * termKey로 용어 변환하여 리턴
   ****************************
   * @param {String} termKey
   */
  static t1(termKey: string) {
    return i18next.t(termKey) as string
  }

  /**
   * category, name으로 termKey를 구성하여 용어 변환하여 리턴
   ***************************************************
   * @param {String} category
   * @param {String} name
   */
  static t2(category: string, name: string) {
    return i18next.t(`${category}.${name}`) as string
  }

  /**
   * termKey로 용어 변환하고 변수를 parameters에서 찾아서 치환하여 리턴
   **********************************************************
   * @param {String} termKey
   * @param {Object} parameters
   */
  static t3(termKey: string, parameters: object) {
    return i18next.t(termKey, { ...parameters }) as string
  }

  /**
   * category, name으로 termKey를 구성하여 용어 변환하고 변수를 parameters에서 찾아서 치환하여 리턴
   ***********************************************************************************
   * @param {String} category
   * @param {String} name
   * @param {Object} parameters
   */
  static t4(category: string, name: string, parameters: object) {
    return i18next.t(`${category}.${name}`, { ...parameters }) as string
  }
}
