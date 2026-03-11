module.exports = {
  port: 5908,
  protocol: 'http',
  useVirtualHostBasedDomain: false,
  subdomainOffset: 2,
  accessTokenCookieKey: 'access_token.wmsapp',
  publicHomeRoute: '/auth/signin',
  operato: {
    baseUrl: 'http://localhost:9191/rest'
  },
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
    type: 'bigint',
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
  ormconfig4Tx: null,
  ormconfig: {
    name: 'default',
    type: 'mysql',
    database: 'wms',
    host: '8.147.128.107',
    port: 3366,
    username: 'wmms',
    password: 'Wmms123$',
    synchronize: false,
    logging: ['debug', 'query'],
    charset: 'utf8mb4_general_ci',
    keepConnectionAlive: true,
    extra: {
      connectionLimit: 10,
      queueLimit: 0,
      waitForConnections: true,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    },
    connectTimeout: 60000,
    timeout: 60000,
    driver: require('mysql2')
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
