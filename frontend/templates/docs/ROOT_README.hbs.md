[comment]: # 'NOTE: This file is generated and should not be modify directly. Update `templates/ROOT_README.hbs.md` instead'

# Things Factory&trade; Micro-Module Edition

[![Build Status](https://travis-ci.org/hatiolab/things-factory.svg?branch=master)](https://travis-ci.org/hatiolab/things-factory)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)

ThingsFactory&trade; is a software framework brand for the production of commercial-level web applications licensed by [Hatiolab](https://www.hatiolab.com).

ThingsFactory&trade; Micro-Module Edition implements an architecture that produces web applications by composing fine-grained micro modules.

These modules compose together to help you create performant modern JS apps that you love to develop and test. These packages are developed primarily to be used on top of the stack we like best for our JS apps; Typescript for the flavor, Koa for the server, LitElement for UI, Apollo for data fetching, and Jest for tests. That said, you can mix and match as you like.

## Usage

The things-factory repo is managed as a monorepo that is composed of {{jsPackages.length}} npm packages.
Each package has its own `README.md` and documentation describing usage.

```
# very first time
$ yarn install
$ yarn build:clean # build all packages
$ DEBUG=things-factory:*,typeorm:* yarn workspace @operato-app/operato-wes run migration
$ DEBUG=things-factory:* yarn workspace @operato-app/operato-wes run serve:dev
```

```
# after a new module package(ie. @things-factory/newbee) added
$ yarn install # make newbee package join
$ yarn workspace @things-factory/newbee build
$ DEBUG=things-factory:* yarn workspace @operato-app/operato-wes run serve:dev
```

```
# after a dependent package(ie. @things-factory/dependa) modified
$ yarn workspace @things-factory/dependa build
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
# generate new application (ie. @things-factory/operato-xyz)
$ yarn generate app
  ? What should this application's name be? e.g. operato-abc > # type "operato-xyz"

# generate new module (ie. @things-factory/notification)
$ yarn generate module
  ? What should this module's name be? e.g. menu > # type "notification"

# generate new entity in a module (ie. "sms" entity in @things-factory/notification module)
# please use 'service' instead if you are using typegraphql way for new entity.
$ yarn generate entity
  ? What is target package's name? e.g. biz-base, operato-wes > # type "notification"
  ? What should this entitie's name be? e.g. company, company-ext > # type "sms"

# generate new service in a module (ie. "sms" service in @things-factory/notification module)
$ yarn generate service
  ? What is target package's name? e.g. biz-base, operato-wes > # type "notification"
  ? What should this entitie's name be? e.g. company, company-ext > # type "sms"

# generate new page in a module (ie. "sms-view" page in @things-factory/notification module)
$ yarn generate page
  ? What is target package's name? e.g. biz-base, operato-wes > # type "notification"
  ? What should this pages's name be? e.g. abc-viewer > # type "sms-view"
```

### Package Index

| Package | Version | Description |
| ------- | ------- | ----------- |

{{#each jsPackages}}
| [{{name}}](packages/{{name}}) | <a href="https://badge.fury.io/js/%40things-factory%2F{{name}}"><img src="https://badge.fury.io/js/%40things-factory%2F{{name}}.svg" width="200px" /></a> | {{{description}}} |
{{/each}}

## Want to contribute?

Check out our [Contributing Guide](./.github/CONTRIBUTING.md)

## Copyright

Copyright © [Hatiolab](https://www.hatiolab.com/) Inc. All rights reserved.
See [EULA](EULA.md) for details.

<a href="http://www.hatiolab.com/"><img src="https://www.hatiolab.com/assets/img/logo.png" alt="Hatiolab" width="200" /></a>
