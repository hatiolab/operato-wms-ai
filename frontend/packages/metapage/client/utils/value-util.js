import isEqual from 'lodash-es/isEqual'

import { TermsUtil } from './terms-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 데이터 핸들링 관련 유틸리티 함수 정의
 */
export class ValueUtil {
  /**
   * @description object, string, number, array 빈 값 여부 검사
   **************************************
   * @param {Object} value 
   * @returns {Boolean}
   */
  static isEmpty(value) {
    if (value === undefined) {
      return true;
    } else if (value === null) {
      return true;
    } else if (typeof value === 'boolean') {
      return false;
    } else if (typeof value === 'string' || typeof value === 'number') {
      if (value == '') return true;
    } else if (Array.isArray(value)) {
      if (value.length == 0) return true;
    } else if (typeof value === 'object') {
      if (Object.keys(value).length == 0) return true;
    }

    return false;
  }

  /**
   * @description object, string, number, array 빈 값이 아닌지 여부 검사
   *****************************************************************
   * @param {Object} value 
   * @returns {Boolean}
   */
  static isNotEmpty(value) {
    return !ValueUtil.isEmpty(value);
  }

  /**
   * @description 두 객체가 동일한지 비교
   **********************************
   * @param {*} data1 
   * @param {*} data2 
   * @returns 
   */
  static isEquals(data1, data2) {
    return isEqual(data1, data2);
  }

  /**
   * @description config, data의 key 값을 비교 해 결과를 리턴한다.
   * 값에 * 는 체크하지 않는다.
   **************************************** 
   * @param {Object} config 
   * @param {Object} data 
   * @param {String Array} keys 
   * @returns 
   */
  static compareObjectValues(config, data, keys) {
    let isEquals = true;

    keys.forEach(key => {
      let compareValue = config[key];

      if (compareValue === '*') {
        return;
      }

      let recordValue = data[key] || '';

      if (ValueUtil.isEmpty(compareValue)) {
        if (ValueUtil.isNotEmpty(recordValue)) {
          isEquals = false;
        }
      } else {
        if (compareValue != recordValue) {
          isEquals = false;
        }
      }

      if(!isEquals) {
        return;
      }
    })

    return isEquals;
  }

  /**
   * @description dataObject 에서 key 값을 찾아 isTransMsg 옵션을 적용해 retObjct에 반영한다.
   ***********************************************************************
   * @param {Object} retObj 
   * @param {Object} dataObj 
   * @param {String} key 
   * @param {Boolean} isTransMsg 
   * @returns 
   */
  static setParams(retObj, dataObj, key, isTransMsg) {
    let value = ValueUtil.getParams(dataObj, key);

    if (ValueUtil.isNotEmpty(value)) {
      retObj[key] = isTransMsg === true ? TermsUtil.t(value) : value;
    }

    return retObj;
  }

  /**
   * @description data 에서 key(Array)를 찾아 리턴 
   **********************************************
   * @param {Object} data 
   * @param {...String} keys 
   * @returns 
   */
  static getParams(data, ...keys) {
    // keys 파라미터가 없으면 return 
    if (arguments.length <= 1) {
      return undefined;
    }

    let key = keys[0];
    // data 에 key가 없으면 return 
    if (ValueUtil.isEmpty(data[key])) {
      return undefined;
    }

    let paramData = data[key];

    if (keys.length > 1) {
      // 현재 이후에 키가 더 있으면 재귀 호출 
      return ValueUtil.getParams(paramData, ...keys.slice(1));
    } else {
      return paramData;
    }
  }

  /**
   * @description sourceList에 존재하는 오브젝트의 keys 필드들을 targetList로 복사
   ***********************************************************************
   * @param {Array} sourceList
   * @param {Array} targetList
   * @param {...String} keys 
   * @returns {Array} 복사한 객체 리스트
   */
  static populateArray(sourceList, targetList, ...keys) {
    targetList = targetList || [];
    keys = keys || Object.keys(sourceList);
    
    if(ValueUtil.isNotEmpty(keys)) {
      targetList = sourceList.map((source, index) => {
        let target = targetList.length > index ? targetList[index] : {};
        return ValueUtil.populateObject(source, target, keys);
      })
    }

    return targetList;
  }

  /**
   * @description source에 존재하는 keys 필드들을 target으로 복사
   ********************************************************
   * @param {Object} source
   * @param {Object} target
   * @param {...String} keys 
   * @returns {Object} 복사한 객체
   */
  static populateObject(source, target, ...keys) {
    target = target || {};
    keys = keys || Object.keys(source);

    if(ValueUtil.isNotEmpty(keys)) {
      keys.forEach(key => {
        target[key] = source[key];
      })
    }

    return target;
  }

  /**
   * @description sortField 필드로 배열 정렬
   ****************************************
   * @param {Array} arr
   * @param {String} sortField
   * @returns {Array}
   */
  static arraySortBy(arr, sortField) {
    arr.sort((a, b) => {
      return a[sortField] - b[sortField];
    });
    return arr;
  }
}