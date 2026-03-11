import { html } from 'lit-element'

import { SearchFormRenderMixin } from './search-form-render-mixin'
import { CustomButtonMixin } from './custom-button-mixin'

import { Chart } from 'chart.js'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 메뉴 메타 데이터 기반 차트 화면 생성 믹스 인
 */
export const MetaChartMixin = superClass =>
  class extends SearchFormRenderMixin(CustomButtonMixin(superClass)) {
    /**
     * @description 메뉴 메타 정보 가져오기 때문에 async 처리
     * 부모의 connectedCallback 을 먼저 실행 하면 lifecycle 순서가 꼬임
     * 아래 순서로 진행 필수
     ***************************
     */
    async connectedCallback() {
      // 조회시 callBack 함수 지정
      this.fetch_callback = this.chartDataset
      this.fetchResultSetCallback = this.parseChartResultSet

      if (super.connectedCallback) {
        await super.connectedCallback()
      }
    }

    /**
     * @description Life Cycle - render
     ***************************
     * @returns HTML
     */
    render() {
      return html` ${this.getChartHtml} `
    }

    /**
     * @description 차트 리턴
     ***************************
     */
    get chart() {
      return this.renderRoot.querySelector('#chart')
    }

    /**
     * @description 차트 엘리먼트
     ***************************
     */
    get getChartHtml() {
      return html`
        ${this.getSearchFormHtml ? html`${this.getSearchFormHtml()}` : html``}
        <div id="container" class="container">
          <canvas id="chart"></canvas>
        </div>
        ${this.getButtonHtml ? html`${this.getButtonHtml()}` : html``}
      `
    }

    /**
     * @description Life Cycle - firstUpdated
     ***************************
     */
    async firstUpdated() {
      // 1. 기본 메타 셋팅
      if (super.firstUpdated) {
        await super.firstUpdated()
      }

      // 2. 차트 생성
      let chartOptionStr = this.menuParamValue('chart-options')
      let chartType = this.menuParamValue('chart-type')
      let chartTitle = this.menuParamValue('chart-title') || this.menu.title
      let legendPosition = this.menuParamValue('chart-legend-position')
      let chartOptions = chartOptionStr
        ? JSON.parse(chartOptionStr)
        : {
            type: chartType,
            data: {
              labels: [],
              datasets: []
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              legend: {
                display: legendPosition ? true : false,
                position: legendPosition
              },
              title: {
                display: chartTitle ? true : false,
                text: chartTitle
              }
            }
          }

      let ctx = this.chart.getContext('2d')
      this.chartObj = new Chart(ctx, chartOptions)

      // 메뉴 파라미터 서치폼 사용 여부에 따라 조회....
      if (this.useSearchForm()) {
        this.searchForm.submit()
      } else {
        this.fetchHandler()
      }
    }

    /**
     * @description 서비스 호출에 대한 response로 부터 차트 데이터 셋 설정
     ***************************
     * @param {Object} response 서비스 호출에 대한 response
     * @returns {Object}
     */
    parseChartResultSet(response) {
      let records = response ? (this.menu.items_res_field ? response[this.menu.items_res_field] : response) : []
      let total = response && this.menu.total_res_field ? response[this.menu.total_res_field] : records.length
      let chartDataSet = response ? response.chart : null

      let fetchResultSet = {
        total: total,
        records: records,
        chartDataSet: chartDataSet
      }

      return fetchResultSet
    }

    /**
     * @description 차트에 데이터 설정
     ***************************
     * @param {Object} fetchResult { total: Number, records: Array, chartDataSet: Object }
     */
    chartDataset(fetchResult) {
      if (fetchResult.chartDataSet) {
        this.configChartDataSetDirectly(fetchResult)
      } else {
        this.configChartDataSetByData(fetchResult)
      }
    }

    /**
     * @description fetchResult내 chartDataSet으로 차트 구성
     ********************************
     * @param {Object} fetchResult
     */
    configChartDataSetDirectly(fetchResult) {
      let chartDataSet = fetchResult.chartDataSet
      this.chartObj.config.data.labels = chartDataSet.labels || []
      this.chartObj.config.data.datasets = chartDataSet.datasets || []
      this.chartObj.update()
    }

    /**
     * @description 메뉴 메타와 fetchResult내 조회한 데이터로 차트 구성
     ********************************
     * @param {Object} fetchResult
     */
    configChartDataSetByData(fetchResult) {
      let items = fetchResult.records

      let chartLabel = this.menuParamValue('chart-label')
      let xValueField = this.menuParamValue('x-value-field')
      let yValueField = this.menuParamValue('y-value-field')
      let datasetCountVal = this.menuParamValue('dataset-count') || 1
      let datasetCount = Number.isInteger(datasetCountVal) ? datasetCountVal : parseInt(datasetCountVal)
      let chartColor = this.menuParamValue('chart-color')
      let chartBackgroundColor = this.menuParamValue('chart-background-color')

      let labels = items.map(function (item) {
        return item[xValueField]
      })

      let datasets = []
      let chartLabels = chartLabel.split(';')
      let yValueFields = yValueField.split(';')
      let backgroundColors = chartBackgroundColor.split(';')
      let chartColors = chartColor.split(';')

      for (var i = 0; i < datasetCount; i++) {
        let data = items.map(function (item) {
          return item[yValueFields[i]]
        })

        let dataset = {
          label: chartLabels[i],
          borderWidth: 1,
          backgroundColor: backgroundColors[i],
          borderColor: chartColors[i],
          data: data
        }

        datasets.push(dataset)
      }

      this.chartObj.config.data.labels = labels
      this.chartObj.config.data.datasets = datasets
      this.chartObj.update()
    }
  }
