import { i18next } from '@operato/i18n'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 용어 처리 유틸리티
 */
export class TermsUtil {
  /**
   * @description 메뉴 menuName을 다국어 변환하여 리턴
   ***********************************************
   * @param {String} menuName
   * @returns 번역된 메뉴 명
   */
  static tMenu(menuName: string) {
    return TermsUtil.translate('menu', menuName, null, menuName)
  }

  /**
   * @description 라벨 (필드) labelName을 다국어 변환하여 리턴
   ***********************************************
   * @param {String} labelName
   * @param {Object} params
   * @returns 번역된 라벨 (필드) 명
   */
  static tLabel(labelName: string, params?: any) {
    let labelValue = TermsUtil.translate('label', labelName, params)
    return labelValue ? labelValue : TermsUtil.translate('field', labelName, params, labelName)
  }

  /**
   * @description 필드 fieldName을 다국어 변환하여 리턴
   ***********************************************
   * @param {String} fieldName
   * @param {Object} params
   * @returns 번역된 필드 명
   */
  static tField(fieldName: string, params?: any) {
    return TermsUtil.translate('field', fieldName, params, fieldName)
  }

  /**
   * @description 버튼 buttonName을 다국어 변환하여 리턴
   ***********************************************
   * @param {String} buttonName
   * @returns 번역된 버튼 명
   */
  static tButton(buttonName: string) {
    return TermsUtil.translate('button', buttonName, null, buttonName)
  }

  /**
   * @description 타이틀 titleName을 다국어 변환하여 리턴
   ***********************************************
   * @param {String} titleName
   * @param {Object} params
   * @returns 번역된 타이틀 명
   */
  static tTitle(titleName: string, params?: any) {
    return TermsUtil.translate('title', titleName, params, titleName)
  }

  /**
   * @description 텍스트 textName을 다국어 변환하여 리턴
   ***********************************************
   * @param {String} textName
   * @param {Object} params
   * @returns 번역된 텍스트 값
   */
  static tText(textName: string, params?: any) {
    return TermsUtil.translate('text', textName, params, textName)
  }

  /**
   * @description 에러 errorName을 다국어 변환하여 리턴
   ***********************************************
   * @param {String} errorName
   * @param {Object} params
   * @returns 번역된 에러 메시지
   */
  static tError(errorName: string, params?: any) {
    return TermsUtil.translate('error', errorName, params, errorName)
  }

  /**
   * @description termKey로 다국어 변환하여 parameters로 파라미터 처리하여 리턴, 변환값이 없다면 defaultValue 리턴, defaultValue가 없다면 null 리턴
   ***********************************************
   * @param {String} termCategory 용어 카테고리 (label, field, title, menu, button, text, error, ...)
   * @param {String} termName 용어 이름
   * @param {Object} parameters 용어 이름에 파라미터가 있는 경우 파라미터 치환 처리할 오브젝트 데이터 {key1 : value1, key2 : value2} 형식 ...
   * @param {String} defaultValue
   * @returns termKey 다국어 변환 값
   */
  static translate(termCategory: string, termName: string, parameters: any, defaultValue?: string) {
    let termKey = termCategory + '.' + termName
    return TermsUtil.t(termKey, parameters, defaultValue) as string
  }

  /**
   * @description termKey로 다국어 변환하여 parameters로 파라미터 처리하여 리턴, 변환값이 없다면 defaultValue 리턴, defaultValue가 없다면 null 리턴
   ***********************************************
   * @param {String} termKey 용어 키 : {용어 카테고리}'.'{용어 이름}
   * @param {Object} parameters 용어 이름에 파라미터가 있는 경우 파라미터 치환 처리할 오브젝트 데이터 {key1 : value1, key2 : value2} 형식 ...
   * @param {String} defaultValue
   * @returns termKey 다국어 변환 값
   */
  static t(termKey: string, parameters: any, defaultValue?: string) {
    return i18next.t(`${termKey}`, {
      ...parameters,
      defaultValue: defaultValue || termKey
    }) as string
  }
}
