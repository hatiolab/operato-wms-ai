import { BrowserPrinter } from '@operato/barcode'
import { GhostPrint } from '@operato/ghost-print'

import { UiUtil } from './ui-util'
import { ValueUtil } from './value-util'
import { ServiceUtil } from './service-util'

import { operatoGet, operatoPost } from '@operato-app/operatofill'

// 브라우저 프린터
let browserPrinter = null

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 인쇄 관련 유틸리티 함수 정의
 */
export class PrintUtil {
  /**
   * @description 바코드 인쇄 처리
   ***********************************
   * @param {String} zpl ZPL Command
	 * @param {Number} printCount 인쇄 횟수
   */
  static async printBarcode(zpl, printCount) {
    if(browserPrinter == null) {
			browserPrinter = new BrowserPrinter()
		}

		if(ValueUtil.isEmpty(zpl)) {
			await UiUtil.showAlertPopup('title.error', 'ZPL is empty', 'error', 'confirm')
		} else {
			printCount || 1
			PrintUtil.printBarcodeLabels(printCount, 0, zpl)
		}
  }

  /**
   * @description 바코드 인쇄 횟수에 따라 바코드 인쇄
   *******************************************
	 * @param {Number} printCount 인쇄할 횟수
	 * @param {Number} doneCount 인쇄한 횟수
   * @param {String} zpl ZPL Command
   */
	static async printBarcodeLabels(printCount, doneCount, zpl) {
		if(doneCount < printCount) {
			doneCount++
			try {
				await browserPrinter.print(zpl)
				setTimeout(() => PrintUtil.printBarcodeLabels(printCount, doneCount, zpl), 1000)
			} catch(error) {
				let msg = error && error.message ? error.message : 'unkown error'
				UiUtil.showAlertPopup('title.error', msg, 'error', 'confirm')
			}
		}
	}

  /**
   * @override POST 서비스 호출을 통한 바코드 라벨 출력
   ****************************************
   * @param {String} labelTemplateUrl 라벨 템플릿을 추출할 서비스 URL
   * @param {Object} variables 라벨 템플릿을 추출할 변수 정보
   * @param {Number} printCount 인쇄 매수
   */
  static async printLabelByService(labelTemplateUrl, variables, printCount) {
		let template = await ServiceUtil.restPost(labelTemplateUrl, variables)
		if(template && template.template) {
      printCount = template.printCount ? template.printCount : (printCount ? printCount : 1)
			await PrintUtil.printBarcode(template.template, printCount)
		} else {
			let msg = template && template.error ? template.error : 'Failed to build ZPL template'
			UiUtil.showAlertPopup('Template Error', msg, 'error', 'confirm')
		}
	}

  static isAndroid() {
    return /Android/i.test(navigator.userAgent)
  }
  
  static isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent)
  }  

  /**
   * @override PDF 출력
   ****************************************
   * @param {String} pdfUrl PDF를 추출할 서비스 URL
   * @param {Object} parameters PDF 추출할 데이터 (그리드에서 선택한 데이터)
   */
  static async ghostPrintPdf(pdfUrl, parameters) {
    pdfUrl = `/rest/stream/${pdfUrl}`

    if ((PrintUtil.isAndroid() || PrintUtil.isIOS())) {
      await PrintUtil.openPdfInNewTab(pdfUrl)

    } else {
      GhostPrint.print({
        src: pdfUrl,
        onfinish: () => {
          history.back()
        }
      })  
    }
  }

  static async openPdfInNewTab(file) {
    const newTab = window.open(file, '_pdf_print')  
    if (newTab) {
      // 새 탭이 성공적으로 열렸다면 프린트 다이얼로그 표시
      newTab.addEventListener('load', () => {
        newTab.print()
      })
    }
  }
}