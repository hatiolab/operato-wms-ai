# WES 개발하기

## [WES GitHub Repository](#new-wes-github-repository)

- **Before:** [https://github.com/hatiolab/operato-wms-ui](https://github.com/hatiolab/operato-wms-ui)
- **After:** [https://github.com/hatiolab/operato-app](https://github.com/hatiolab/operato-app)

## [Install & Build](#install--build)

1. **Initial Install**

   최초에 리파지토리를 checkout 한 후에 개발 환경 인스톨 및 디펜던시 모듈 설치

   ```bash
   $ yarn install
   ```

2. **Building All Modules**

   프로젝트 내에 개발된 모듈 빌드

   `operato-app/packages/` 폴더 아래에 모든 모듈들이 있다.

   - 빌드의 의미: client, server 소스를 컴파일해서 dist-xxxx 를 생성(또는 업데이트)

     `/client` => `/dist-client`

     `/server` => `/dist-server`

   ```bash
   $ yarn build
   ```

3. **Building Each Module**

   만약, 소스 변경된 모듈만 빌드할 필요가 있는 경우에는 다음과 같이 해당 모듈만을 빌드할 수 있다.

   모듈의 이름은 각 모듈의 package.json에 있는 name 속성을 참조한다.

   다음은 이 프로젝트에서 개발중인 모듈 6개의 이름이다.

   - @operato-app/metapage
   - @operato-app/mfg-warehouse
   - @operato-app/operato-logis-system-ui
   - @operato-app/operato-wes
   - @operato-app/operato-mes
   - @operato-app/operatofill

   ```bash
   // 클라이언트 파트만 빌드하기
   $ yarn workspace {{module name}} build:client

   // 서버 파트만 빌드하기
   $ yarn workspace {{module name}} build:server

   // 클라이언트 파트와 서버 파트 모두 빌드하기
   $ yarn workspace {{module name}} build

   // 예시
   $ yarn workspace @operato-app/mfg-warehouse build
   ```

4. **Clean Build**

   모든 npm 모듈들을 새로 인스톨하고, 전체 모듈을 새로 빌드함

   - 모든 node_modules 폴더를 제거하고 새로 설치함
   - 모든 dist-xxxx을 삭제한 후에 새로 빌드함

     - things-factory, operato 가 업그레이드 되면, 클린 빌드해서 반영할 수 있다.

   ```bash
   $ yarn build:clean
   ```

## [Configure Application](#configure-application)

operato-apps 프로젝트의 WES 실행 어플리케이션용 모듈은 @operato-app/operato-wes 모듈임

packages/operato-wes/config 폴더의 config.development.js 와 config.production.js 파일에 실행 컨피규레이션을 설정할 수 있다.

[Configration 설정방법을 참고하시려면 이 링크를 클릭하세요](../config/index.md)

이 파일들은 소스로 취급되므로, 민감한 서버정보와 인증정보는 포함하지 않도록 한다.

따라서, packages/operato-wes 폴더에 개인화된 config.development.js 와 config.production.js 파일에 실행 컨피규레이션을 설정하여 사용하도록 한다.

## [Run Application - Development](#run-application---development)

operato-apps 프로젝트의 실행 어플리케이션용 모듈은 @operato-app/operato-wes 모듈임

```bash
// 이 경우에는 config.development.js 가 적용됨
$ yarn workspace @operato-app/operato-wes serve:dev
```

## [Run Application - Production](#run-application---production)

```bash
// dist-app 폴더에 최종 어플리케이션 이미지 만들기
$ yarn workspace @operato-app/operato-wes build:app

// dist-app 를 실행하기
// 이 경우에는 config.production.js 가 적용됨
$ yarn workspace @operato-app/operato-wes serve
```

---

## [Generate New Page](#generate-new-page)

```bash
$ yarn generate
```

```bash
$ yarn generate
yarn run v1.22.22
$ plop
? [PLOP] Please choose a generator.
  module - Create a new module from the scratch
  service - Generate service from the scratch
❯ page - Generate client page from the scratch
  help - Generate inline help page
  docs - Generate root repo documentation
```

```bash
$ plop
? [PLOP] Please choose a generator. page - Generate client page from the scratch
? What is target package's name? e.g. mfg-warehouse mfg-warehouse
? What should this pages's name be? e.g. sample-page my-page
? Select the type of page you want to generate: List Page
✔  ++ /packages/mfg-warehouse/client/pages/my-page.ts
✔  +- /packages/mfg-warehouse/client/route.ts
✔  +- /packages/mfg-warehouse/things-factory.config.js
✨  Done in 109.17s.
```

```bash
// 클라이언트 소스가 변경되었기 때문에 다시 빌드한다.
$ yarn workspace @operato-app/mfg-warehouse build:client
```

![generate-page-01]
![generate-page-03]
![generate-page-03]
![generate-page-04]

---

## [Debugging - Server Part](#debugging-server)

어플리케이션을 VSCode의 디버거로 실행한다.

![server-debugging]

## [Debugging - Client Part](#debugging-client)

크롬 브라우저의 개발자환경의 Source 탭에서 소스파일을 오픈한다.

![client-debugging-01]
![client-debugging-02]

[주의] 각 클라이언트 모듈의 route에서 정의하는 페이지들은 동적로딩되므로, 해당페이지 로딩 이후에 디버깅을 할 수 있다.

[server-debugging]: ./images/server-debugging.png
[client-debugging-01]: ./images/client-debugging-01.png
[client-debugging-02]: ./images/client-debugging-02.png
[generate-page-01]: ./images/generate-page-01.png
[generate-page-02]: ./images/generate-page-02.png
[generate-page-03]: ./images/generate-page-03.png
[generate-page-04]: ./images/generate-page-04.png
