module.exports = {
    licenseKey: '5eyJDdXN0b21lciI6ImhhdGlvbGFiLmNvbSIsIlByb2R1Y3QiOiJPcGVyYXRvIiwiTGljZW5zZSBUeXBlIjoiRXZhbHVhdGlvbiIsIlB1cmNoYXNlIERhdGUiOiIyMDI2LjA0LjEyIiwiRXhwaXJhdGlvbiBEYXRlIjoiMjAyNi4wNy4zMSIsIkhvc3QgQWRkcmVzcyI6IlVOTElNSVRFRCIsIk1heCBUYXJnZXQgQ291bnQiOjAsIk1heCBEb21haW4gQ291bnQiOjAsIlBlcm1pc3Npb25zIEZvciBCb2FyZCBVc2FnZSI6IlZpZXdlciwgTW9kZWxsZXIiLCJQZXJtaXNzaW9ucyBGb3IgVGFpbG9yIFRvb2wiOiJSdW5uZXIsIFN0dWRpbyIsIktleSI6IkF4Z3FKUXM0SGpFQUJEY0xFUUFtRmlNTUJqb0VHZ2dORFNjbUNCWS9HaFVTRmlaVEl3c2dTd1l2SWpnV0V4c0lFenNlRVJFaUdWa1RDUkJJSHdnREFCc25BQWtJS1RNWkdoWXROUWNKSUQ0ZkNRVUFIVGdTQndBYUVnY1FJZ05XQ2dnWlJSOExNamdNVFI0T0NTb2FDeXNrSFVnSUdnMDdHUWdyRUNJa0l5OFdQQ2N4S0FFcVdTTUlGVHNXQ1F3T0RqZ2lCd0laQkJVU0FDMGxFd2tRUGg4SkJRQWlTaXNZRkRzMEZpWVFPMW9mRGhsRkh3b01EUXdUR3dZUktSWUtFUVFaV2drWUdRZ2ZDeDRhR3lVQUV3OG9GaHNpSmlaVEl3b3hPZ01lTWhRV09DSU5DQ29YQmlNM05oRUtEUkU3R1FrekNpWkxPd2NERlNZY0VqYytTQXNLTGprWEx6czREVTRiQ0JNOEp4SXJBeTFNQ1F3eFFnVXVKZ2NORWpjWkdSY09GUkVBTFNNS0x4eExEaDR5RXd3U0pnMElKUjhyS3dNVlVCSUpBajRGQ0FNQ0d6Y3pDZ2dwRUJJYUVTWkpJQjRZSXc0Sktnc09PQjRaQVNrdkZCRVFMU2NLTGhrNUVob3VCdzBuTXhnWkdCWVZFamNJU1IwSUdDVUVDajhNRlRnakVoa1lHakVRRWgxUUNoZ1lDdz09In0=96222',
    port: 5907,
    protocol: 'http',
    useVirtualHostBasedDomain: false,
    subdomainOffset: 2,
    accessTokenCookieKey: 'access_token.wmsapp',
    operato: {
        baseUrl: 'http://localhost:9191/rest',
    },
    requestBody: {
        formLimit: '10mb',
        jsonLimit: '10mb',
        textLimit: '10mb',
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
    ormconfig4Tx: null,
    ormconfig: {
        name: 'default',
        type: 'postgres',
        database: 'britestone_3pl_dev',
        host: 'localhost',
        port: 15432,
        username: 'postgres',
        password: 'hatioLAB1008',
        synchronize: false,
        logging: ['debug', 'query'],
        extra: {
            keepAlive: true,
            keepAliveInitialDelayMillis: 30000
        }
    }
}