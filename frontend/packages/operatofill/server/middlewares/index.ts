import axios, { AxiosRequestConfig } from 'axios'
import { config, logger } from '@things-factory/env'
import http from 'http'
import https from 'https'
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

/**
 * multipart/form-data 업로드 요청을 백엔드로 파이핑한다.
 * axios/getRawBody로 바이너리 스트림을 읽으면 boundary가 손상되므로
 * Node.js http.request로 직접 파이핑한다.
 */
async function processMultipartRest(restUrl, context) {
  const { method, request, req } = context

  if (request.search) {
    restUrl += request.search
  }

  return new Promise<void>((resolve, reject) => {
    const parsedUrl = new URL(restUrl)
    const isHttps = parsedUrl.protocol === 'https:'
    const transport = isHttps ? https : http

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + (parsedUrl.search || ''),
      method,
      headers: {
        ...request.headers,
        host: parsedUrl.host
      }
    }

    const proxyReq = transport.request(options, proxyRes => {
      context.status = proxyRes.statusCode || 200
      // 응답 헤더 중 필요한 것만 전달
      const ct = proxyRes.headers['content-type']
      if (ct) context.set('Content-Type', ct)

      const chunks: Buffer[] = []
      proxyRes.on('data', chunk => chunks.push(chunk))
      proxyRes.on('end', () => {
        const body = Buffer.concat(chunks).toString()
        try {
          context.body = JSON.parse(body)
        } catch {
          context.body = body
        }
        resolve()
      })
      proxyRes.on('error', reject)
    })

    proxyReq.on('error', reject)
    req.pipe(proxyReq)
  })
}

async function processRest(restUrl, context) {
  const { method, request, req } = context

  // multipart/form-data는 직접 스트림 파이핑으로 처리
  const contentType = request.headers['content-type'] || ''
  if (contentType.includes('multipart/form-data')) {
    return processMultipartRest(restUrl, context)
  }

  // query parameter가 있다면 URL에 추가
  if (request.search) {
    restUrl += request.search
  }

  // responseType: 'arraybuffer' 로 받아 바이너리 손상 방지.
  // axios 기본값(text/json)으로 받으면 이미지·PDF·Excel 등 바이너리가 UTF-8 디코딩으로 깨짐.
  const options: AxiosRequestConfig = {
    method,
    url: restUrl,
    headers: request.headers,
    data: await getRawBody(req),
    responseType: 'arraybuffer'
  }

  await axios(options)
    .then(response => {
      context.status = response.status

      // 백엔드 응답 헤더 중 다운로드에 필요한 헤더를 클라이언트에 그대로 전달
      const passthroughHeaders = ['content-type', 'content-disposition', 'content-length']
      passthroughHeaders.forEach(h => {
        if (response.headers[h]) context.set(h, response.headers[h])
      })

      const respContentType = (response.headers['content-type'] || '') as string
      if (respContentType.includes('application/json')) {
        // JSON 응답은 Buffer → 문자열 → 파싱
        context.body = JSON.parse(Buffer.from(response.data).toString('utf8'))
      } else {
        // 바이너리 응답(이미지, PDF, Excel 등)은 Buffer 그대로 반환
        context.body = Buffer.from(response.data)
      }
    })
    .catch(error => {
      context.status = error.response?.status || 500
      context.body = error.response?.data || 'Internal Server Error'
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
