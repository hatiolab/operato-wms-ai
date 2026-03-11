# Developing WES

## [WES GitHub Repository](#new-wes-github-repository)

- **Before:** [https://github.com/hatiolab/operato-wms-ui](https://github.com/hatiolab/operato-wms-ui)
- **After:** [https://github.com/hatiolab/operato-app](https://github.com/hatiolab/operato-app)

## [Install & Build](#install--build)

1. **Initial Install**

   After checking out the repository for the first time, install the development environment and dependency modules.

   ```bash
   $ yarn install
   ```

2. **Building All Modules**

   Build the modules developed within the project.

   All modules are located under the `operato-app/packages/` folder.

   - Meaning of build: Compile the client and server sources to generate (or update) dist-xxxx.

     `/client` => `/dist-client`

     `/server` => `/dist-server`

   ```bash
   $ yarn build
   ```

3. **Building Each Module**

   If only the changed modules need to be built, you can build only those specific modules.

   Refer to the name property in the package.json of each module for the module names.

   Here are the names of the 6 modules being developed in this project.

   - @operato-app/metapage
   - @operato-app/mfg-warehouse
   - @operato-app/operato-logis-system-ui
   - @operato-app/operato-wes
   - @operato-app/operato-mes
   - @operato-app/operatofill

   ```bash
   // Build only the client part
   $ yarn workspace {{module name}} build:client

   // Build only the server part
   $ yarn workspace {{module name}} build:server

   // Build both client and server parts
   $ yarn workspace {{module name}} build

   // Example
   $ yarn workspace @operato-app/mfg-warehouse build
   ```

4. **Clean Build**

   Reinstall all npm modules and rebuild all modules.

   - Remove all node_modules folders and reinstall.
   - Delete all dist-xxxx and rebuild.

     - When things-factory or operato is upgraded, you can reflect this by performing a clean build.

   ```bash
   $ yarn build:clean
   ```

## [Configure Application](#configure-application)

The module for running the WES application in the operato-apps project is the @operato-app/operato-wes module.

You can set the execution configuration in the config.development.js and config.production.js files in the packages/operato-wes/config folder.

[Click this link to refer to the configuration setup method](../config/index.md)

These files are treated as source, so do not include sensitive server information and authentication information.

Therefore, set the execution configuration in personalized config.development.js and config.production.js files in the packages/operato-wes folder.

## [Run Application - Development](#run-application---development)

The module for running the application in the operato-apps project is the @operato-app/operato-wes module.

```bash
// In this case, config.development.js is applied
$ yarn workspace @operato-app/operato-wes serve:dev
```

## [Run Application - Production](#run-application---production)

```bash
// Create the final application image in the dist-app folder
$ yarn workspace @operato-app/operato-wes build:app

// Run dist-app
// In this case, config.production.js is applied
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
// Since the client source has been changed, build again.
$ yarn workspace @operato-app/mfg-warehouse build:client
```

![generate-page-01]
![generate-page-03]
![generate-page-03]
![generate-page-04]

---

## [Debugging - Server Part](#debugging-server)

Run the application with the VSCode debugger.

![server-debugging]

## [Debugging - Client Part](#debugging-client)

Open the source file in the Source tab of Chrome's developer tools.

![client-debugging-01]
![client-debugging-02]

[Note] Since the pages defined in each client module's route are dynamically loaded, debugging can be done after loading the respective page.

[server-debugging]: ./images/server-debugging.png
[client-debugging-01]: ./images/client-debugging-01.png
[client-debugging-02]: ./images/client-debugging-02.png
[generate-page-01]: ./images/generate-page-01.png
[generate-page-02]: ./images/generate-page-02.png
[generate-page-03]: ./images/generate-page-03.png
[generate-page-04]: ./images/generate-page-04.png
