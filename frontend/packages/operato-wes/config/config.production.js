module.exports = {
  port: 5907,
  protocol: 'http',
  useVirtualHostBasedDomain: false,
  subdomainOffset: 2,
  accessTokenCookieKey: 'access_token.wms',
  publicHomeRoute: '/auth/signin',
  requestBody: {
    formLimit: '10mb',
    jsonLimit: '10mb',
    textLimit: '10mb'
  },
  fileUpload: {
    maxFileSize: '10mb',
    maxFiles: 10
  },
  domainPrimaryOption: {
    type: 'int8',
    strategy: null
  },
  logger: {
    file: {
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: false,
      maxSize: '20m',
      maxFiles: '1d',
      level: 'debug'
    },
    console: {
      level: 'debug'
    }
  },
  storage: {
    type: 'database'
  },
  cache: {
    middleware: 'database' /* 'database' | 'redis' */,
    autoClearStale: false
  },
  i18n: {
    languages: [
      {
        code: 'zh',
        display: '中文'
      },
      {
        code: 'ja',
        display: 'にほんご'
      },
      {
        code: 'ko',
        display: '한국어'
      },
      {
        code: 'en',
        display: 'English'
      }
    ],
    defaultLanguage: 'en',
    disableUserFavoredLanguage: false,
    disableCustomTerminologyFeature: false
  }
}
