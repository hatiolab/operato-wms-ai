import axios, { AxiosRequestConfig } from 'axios'
import { config, logger } from '@things-factory/env'
// import { Readable } from 'stream';

const operatoBaseUrl = config.get('operato/baseUrl')

async function getRawBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', chunk => {
      body += chunk.toString()
    })
    request.on('end', () => {
      resolve(body)
    })
    request.on('error', error => {
      reject(error)
    })
  })
}

async function processBaseUrl(context) {
  context.body = { baseUrl: operatoBaseUrl }
}

async function processRest(restUrl, context) {
  const { method, request, req } = context

  // query parameter가 있다면 URL에 추가
  if (request.search) {
    restUrl += request.search
  }

  // HTTP Request Options
  const options = {
    method,
    url: restUrl,
    headers: request.headers,
    data: await getRawBody(req)
  }

  // 에러 처리 포맷에 맟추기 위해 수정
  await axios(options)
    .then(response => {
      context.status = response.status
      context.body = response.data
    })
    .catch(error => {
      context.status = error.response.status
      context.body = error.response.data
    })
}

async function processStreamRest(restUrl, context) {
  const { method, request, req } = context

  // query parameter가 있다면 URL에 추가
  if (request.search) {
    restUrl += request.search
  }

  // HTTP Request Options
  let axiosConfig: AxiosRequestConfig = {
    method,
    url: restUrl,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      ...request.headers
    },
    data: await getRawBody(req),
    responseType: 'stream'
  }
  
  let currentTimestamp = Date.now()

  let fileName = currentTimestamp + '.pdf'

  // 에러 처리 포맷에 맟추기 위해 수정
  await axios(axiosConfig)
    .then(response => {
      context.status = response.status
      context.body = response.data
      context.set('Content-Type', 'application/pdf')  
      context.set('Content-Disposition', 'inline; filename="'+ fileName +'"')
    })
    .catch(error => {
      context.status = error.response.status
      context.body = error.response.data
    })

}

export function initMiddlewares(app) {
  if (operatoBaseUrl) {
    // 특정 context path로 시작되는 경우에 해당 서버로 rewriting
    app.use(async (context, next) => {
      const { path } = context
      // 요청된 URL의 맨 앞 부분이 context path로 사용됨
      const [_, rest, ...segments] = path.split('/')

      // 1. WES Server REST API 처리 전용
      if (rest == 'rest') {
        if (segments && segments.length > 1 && segments[0] == 'stream') {
          let restUrl: string = operatoBaseUrl + '/' + segments.splice(1).join('/')
          await processStreamRest(restUrl, context)
        } else {
          let restUrl: string = operatoBaseUrl + '/' + segments.join('/')
          await processRest(restUrl, context)
        }

        // 기본 things-factory 처리
      } else {
        if (segments && segments.length == 2 && segments[1] == 'base_url') {
          processBaseUrl(context)
        } else {
          await next()
        }
      }
    })
  }
}
