[comment]: # 'NOTE: This file is generated and should not be modify directly. Update `templates/ROOT_README.hbs.md` instead'

# Things Factory&trade; Micro-Module Edition

[![Build Status](https://travis-ci.org/hatiolab/operato-app.svg?branch=master)](https://travis-ci.org/hatiolab/operato-app)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)

ThingsFactory&trade; is a software framework brand for the production of commercial-level web applications licensed by [Hatiolab](https://www.hatiolab.com).

ThingsFactory&trade; Micro-Module Edition implements an architecture that produces web applications by composing fine-grained micro modules.

These modules compose together to help you create performant modern JS apps that you love to develop and test. These packages are developed primarily to be used on top of the stack we like best for our JS apps; Typescript for the flavor, Koa for the server, LitElement for UI, Apollo for data fetching, and Jest for tests. That said, you can mix and match as you like.

## Usage

The operato-app repo is managed as a monorepo that is composed of 6 npm packages.
Each package has its own `README.md` and documentation describing usage.

```
# very first time
$ yarn install
$ yarn build:clean # build all packages
$ DEBUG=things-factory:*,typeorm:* yarn workspace @operato-app/operato-wes run migration
$ DEBUG=things-factory:* yarn workspace @operato-app/operato-wes run serve:dev
```

```
# after a new module package(ie. @operato-app/newbee) added
$ yarn install # make newbee package join
$ yarn workspace @operato-app/newbee build
$ DEBUG=things-factory:* yarn workspace @operato-app/operato-wes run serve:dev
```

```
# after a dependent package(ie. @operato-app/dependa) modified
$ yarn workspace @operato-app/dependa build
$ DEBUG=things-factory:* yarn workspace @operato-app/operato-wes run serve:dev
```

```
# run application (ie. @operato-app/operato-wes) in production mode
$ yarn workspace @operato-app/operato-wes build
$ yarn workspace @operato-app/operato-wes build:app
$ yarn workspace @operato-app/operato-wes run serve

# The way to use the config file is the same as before.
# Don't forget to give a config file to make the app run.
```

```
# publish packages that have changed since the last release
$ yarn release

# publish all packages
$ yarn release:force

# Don't forget to commit all changes before release
```

```
# dockerize application (ie. @operato-app/operato-wes)
$ yarn workspace @operato-app/operato-wes build
$ yarn workspace @operato-app/operato-wes build:client
$ yarn workspace @operato-app/operato-wes docker # build docker image
$ yarn workspace @operato-app/operato-wes docker:push # push docker image to docker repository
```

```
# generate new application (ie. @operato-app/operato-xyz)
$ yarn generate app
  ? What should this application's name be? e.g. operato-abc > # type "operato-xyz"

# generate new module (ie. @operato-app/notification)
$ yarn generate module
  ? What should this module's name be? e.g. menu > # type "notification"

# generate new entity in a module (ie. "sms" entity in @operato-app/notification module)
# please use 'service' instead if you are using typegraphql way for new entity.
$ yarn generate entity
  ? What is target package's name? e.g. biz-base, operato-wes > # type "notification"
  ? What should this entitie's name be? e.g. company, company-ext > # type "sms"

# generate new service in a module (ie. "sms" service in @operato-app/notification module)
$ yarn generate service
  ? What is target package's name? e.g. biz-base, operato-wes > # type "notification"
  ? What should this entitie's name be? e.g. company, company-ext > # type "sms"

# generate new page in a module (ie. "sms-view" page in @operato-app/notification module)
$ yarn generate page
  ? What is target package's name? e.g. biz-base, operato-wes > # type "notification"
  ? What should this pages's name be? e.g. abc-viewer > # type "sms-view"
```

### Package Index

| Package | Version | Description |
| ------- | ------- | ----------- |

| [@operato-app/metapage](packages/@operato-app/metapage) | <a href="https://badge.fury.io/js/%40things-factory%2F@operato-app/metapage"><img src="https://badge.fury.io/js/%40things-factory%2F@operato-app/metapage.svg" width="200px" /></a> | Framework Module for Auto Generate Screen By Menu Meta Data |
| [@operato-app/mfg-warehouse](packages/@operato-app/mfg-warehouse) | <a href="https://badge.fury.io/js/%40things-factory%2F@operato-app/mfg-warehouse"><img src="https://badge.fury.io/js/%40things-factory%2F@operato-app/mfg-warehouse.svg" width="200px" /></a> | A module that provides functions for in-process warehouse and raw material, semi-finished good, and finished good warehouse functions used in the manufacturing system. |
| [@operato-app/operato-logis-system-ui](packages/@operato-app/operato-logis-system-ui) | <a href="https://badge.fury.io/js/%40things-factory%2F@operato-app/operato-logis-system-ui"><img src="https://badge.fury.io/js/%40things-factory%2F@operato-app/operato-logis-system-ui.svg" width="200px" /></a> | System UI Module for Operato WES |
| [@operato-app/operato-mes](packages/@operato-app/operato-mes) | <a href="https://badge.fury.io/js/%40things-factory%2F@operato-app/operato-mes"><img src="https://badge.fury.io/js/%40things-factory%2F@operato-app/operato-mes.svg" width="200px" /></a> | Manager UI For Operato MES |
| [@operato-app/operato-wes](packages/@operato-app/operato-wes) | <a href="https://badge.fury.io/js/%40things-factory%2F@operato-app/operato-wes"><img src="https://badge.fury.io/js/%40things-factory%2F@operato-app/operato-wes.svg" width="200px" /></a> | Manager UI For Operato WES |
| [@operato-app/operatofill](packages/@operato-app/operatofill) | <a href="https://badge.fury.io/js/%40things-factory%2F@operato-app/operatofill"><img src="https://badge.fury.io/js/%40things-factory%2F@operato-app/operatofill.svg" width="200px" /></a> | Module for Interface with Spring Based Operato WES Server |

## Want to contribute?

Check out our [Contributing Guide](./.github/CONTRIBUTING.md)

## Copyright

Copyright © [Hatiolab](https://www.hatiolab.com/) Inc. All rights reserved.
See [EULA](EULA.md) for details.

<a href="http://www.hatiolab.com/"><img src="https://www.hatiolab.com/assets/img/logo.png" alt="Hatiolab" width="200" /></a>
