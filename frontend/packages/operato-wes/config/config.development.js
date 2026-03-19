module.exports = {
    licenseKey: '5eyJDdXN0b21lciI6IkRldiIsIlByb2R1Y3QiOiJPcGVyYXRvIFdNUyIsIkxpY2Vuc2UgVHlwZSI6IkV2YWx1YXRpb24iLCJQdXJjaGFzZSBEYXRlIjoiMjAyNi4wMy4xOSIsIkV4cGlyYXRpb24gRGF0ZSI6IjIwMjYuMDYuMTkiLCJIb3N0IEFkZHJlc3MiOiJVTkxJTUlURUQiLCJNYXggVGFyZ2V0IENvdW50IjowLCJNYXggRG9tYWluIENvdW50IjowLCJQZXJtaXNzaW9ucyBGb3IgQm9hcmQgVXNhZ2UiOiJWaWV3ZXIiLCJQZXJtaXNzaW9ucyBGb3IgVGFpbG9yIFRvb2wiOiJSdW5uZXIiLCJLZXkiOiJBeGdxSlFzNEhqRUFCRGNMRVFBbUZpTUtFRDRFQ0NzS0prd3FHQUFFRmpBYk5oNUpIUWdZSWdVYUhoQVdPQm9WR1JnRUV4OFFKbE1qQ2haQ0R5OGVEQXdTRndZTUdnUVdHaFltRmlNS0RBUVBDZ1E0RmpnYUR3QUVOQWdvSmlVeENBa1lQQWNhTGhFVk15b2NDU29XQ3lzQkFFa2ZDU0ZMR2doQURpSlpPQmNUSlI4U0t3SVpGQWthQ2tzUENTSUhEUkk0QmhBWklqRWFGaVlXSXdrWlNSc0pHd3dpSkJNVUZTWURDQ2dtSlNrS0xoUUNIeHd1QWhVb0lnc0JCUnNJSlFBbE5oZ0tGaHdVREFnVUhUVWJDQllWSGhNYkVRaEhGaG9jU3c0dkhqa21KUjRWQWlrek1Tc0JBRmNnSGhnZ0R3a05BaDBuTXhNSktRUVVLeVFoVmdnS0xRSWZDUVVPSXlNaUVBZ3FIaE1URVNGYUN3b3BSd1VZTWlJTkV5TUdFVDh2QnhFRUhrY1dDUlE2RGk4ZkFDQkpJZ29CS1JJdUdoRW1TU0FlR0NNT0NTb0xEamdlR1FFcEx4UVJFQzBuQ2k0Wk9SSWFMZ2NOSnpNWUdSZ1dGUkkzQ0VrZENCZ2xCQW8vREJVNEl3Z0VJeXNrIn0=88724',
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
        logging: ['debug', 'query']
    }
}