module.exports = {
    licenseKey: '5eyJQcm9kdWN0IjoiT3BlcmF0by10b29scyIsIkxpY2Vuc2UgVHlwZSI6IkV2YWx1YXRpb24iLCJQdXJjaGFzZSBEYXRlIjoiMjAyMi4wNS4xMCIsIkV4cGlyYXRpb24gRGF0ZSI6IjIwMjMuMTIuMzEiLCJIb3N0IEFkZHJlc3MiOiJ0b29scy5oYXRpb2xhYi5jb20iLCJNYXggVGFyZ2V0IENvdW50IjoiNTAwIiwiTWF4IERvbWFpbiBDb3VudCI6IjEiLCJQZXJtaXNzaW9ucyBGb3IgQm9hcmQgVXNhZ2UiOiJWaWV3ZXIsIE1vZGVsbGVyIiwiUGVybWlzc2lvbnMgRm9yIFRhaWxvciBUb29sIjoiUnVubmVyLCBTdHVkaW8iLCJLZXkiOiJBeGdxR0F4Tk13b0NLUm94S3dFQVNSZ3VJRDRGREM0NURWazdNUUFFTHhJUkVDWlRJd29XUWc4dkhnd01FaGNHREJvRUZob1dKaFlqQ2d3RUR3b0VPQlk0R2c4QUJEUUlLQ1lsTVFnSkdEd0hHaTRSRlRNcUhBa3FGZ3NyQVFCSkh3a2hTeHNJUUE0aE16Z1hGUlVmRWlzQ0dSUUpHZ3BMRHdraUJ3MFNPQVlRR1NJeEdoWW1GaU1KR1VrYkNTY01JalFqRkJWTUl3Z29KaVVwQ2k0VUFoOGNMZ0lWS0NJTEFRVWJDQ1VBSlJBS0x5bEZCUmcvQmhZNEdnOEFCQkFIR3dBNlNnb3ZNanNjSGlvYkZqZ0ZCZ3daSWhnYU54a1FJeHdVU0FRS1B6a21TZ01JRkNZbkZpc0FDRWtZQ2h3R0h4d2lEUTAzSmc4QU95WWRFallaVlFnZUdRZ2ZDUzhBSXlNaUVBZ3FIaE1URVNGYUN3b3BSd1VZTWlJTkV5TUdFVDh2QnhFRUhrY1dDUlE2RGk4ZkFDQkpJZ29CS1JJdUdoRW1VeU1jTVVnT0doNEtEU2NXR0JrN0R3Z2ZJaGxaQ2dvS1RBVXZDQTBOVGg4R0VEOHZHQ3NqSFVnTENoWklCUWd5RkEwU014SVpQQWNJSHdVWlZRb01ERXNjSGpJVkN5Z1dDZ0VwTUFnT0dESWQifQ==93074',
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
        database: 'operatowms',
        host: 'localhost',
        port: 15432,
        username: 'postgres',
        password: 'hatioLAB1008',
        synchronize: false,
        logging: ['debug', 'query']
    }
}