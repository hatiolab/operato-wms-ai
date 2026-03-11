# 开发 WES

## [WES GitHub Repository](#new-wes-github-repository)

- **以前:** [https://github.com/hatiolab/operato-wms-ui](https://github.com/hatiolab/operato-wms-ui)
- **以后:** [https://github.com/hatiolab/operato-app](https://github.com/hatiolab/operato-app)

## [安装和构建](#install--build)

1. **初始安装**

   首次检出仓库后，安装开发环境和依赖模块。

   ```bash
   $ yarn install
   ```

2. **构建所有模块**

   构建项目中开发的模块。

   所有模块都位于 `operato-app/packages/` 文件夹下。

   - 构建的意义：编译客户端和服务器源代码以生成（或更新）dist-xxxx。

     `/client` => `/dist-client`

     `/server` => `/dist-server`

   ```bash
   $ yarn build
   ```

3. **构建各个模块**

   如果只需要构建更改过的模块，可以仅构建那些特定的模块。

   模块名称请参阅每个模块的 package.json 中的 name 属性。

   以下是本项目中开发的 6 个模块的名称。

   - @operato-app/metapage
   - @operato-app/mfg-warehouse
   - @operato-app/operato-logis-system-ui
   - @operato-app/operato-wes
   - @operato-app/operato-mes
   - @operato-app/operatofill

   ```bash
   // 仅构建客户端部分
   $ yarn workspace {{module name}} build:client

   // 仅构建服务器部分
   $ yarn workspace {{module name}} build:server

   // 同时构建客户端和服务器部分
   $ yarn workspace {{module name}} build

   // 示例
   $ yarn workspace @operato-app/mfg-warehouse build
   ```

4. **干净构建**

   重新安装所有 npm 模块并重建所有模块。

   - 删除所有 node_modules 文件夹并重新安装。
   - 删除所有 dist-xxxx 并重建。

     - 当 things-factory 或 operato 升级时，可以通过执行干净构建来反映这一点。

   ```bash
   $ yarn build:clean
   ```

## [配置应用程序](#configure-application)

在 operato-apps 项目中运行 WES 应用程序的模块是 @operato-app/operato-wes 模块。

您可以在 packages/operato-wes/config 文件夹中的 config.development.js 和 config.production.js 文件中设置执行配置。

[点击此链接以参考配置设置方法](../config/index.md)

这些文件被视为源文件，因此不要包含敏感的服务器信息和认证信息。

因此，在 packages/operato-wes 文件夹中设置个性化的 config.development.js 和 config.production.js 文件中的执行配置。

## [运行应用程序 - 开发](#run-application---development)

在 operato-apps 项目中运行应用程序的模块是 @operato-app/operato-wes 模块。

```bash
// 在这种情况下，应用 config.development.js
$ yarn workspace @operato-app/operato-wes serve:dev
```

## [运行应用程序 - 生产](#run-application---production)

```bash
// 在 dist-app 文件夹中

创建最终应用程序映像
$ yarn workspace @operato-app/operato-wes build:app

// 运行 dist-app
// 在这种情况下，应用 config.production.js
$ yarn workspace @operato-app/operato-wes serve
```

---

## [生成新页面](#generate-new-page)

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
// 由于客户端源代码已更改，请重新构建。
$ yarn workspace @operato-app/mfg-warehouse build:client
```

![generate-page-01]
![generate-page-03]
![generate-page-03]
![generate-page-04]

---

## [调试 - 服务器部分](#debugging-server)

使用 VSCode 调试器运行应用程序。

![server-debugging]

## [调试 - 客户端部分](#debugging-client)

在 Chrome 浏览器的开发者工具的 Source 选项卡中打开源文件。

![client-debugging-01]
![client-debugging-02]

[注意] 由于每个客户端模块的路由中定义的页面是动态加载的，因此可以在加载相应页面后进行调试。

[server-debugging]: ./images/server-debugging.png
[client-debugging-01]: ./images/client-debugging-01.png
[client-debugging-02]: ./images/client-debugging-02.png
[generate-page-01]: ./images/generate-page-01.png
[generate-page-02]: ./images/generate-page-02.png
[generate-page-03]: ./images/generate-page-03.png
[generate-page-04]: ./images/generate-page-04.png
