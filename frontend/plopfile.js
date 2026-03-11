const { readdirSync, existsSync } = require('fs')
const path = require('path')
const { camelCase, startCase } = require('lodash')
const { plural } = require('pluralize')
const { version } = require('./lerna.json')

const jsPackages = getPackages('js')
const timestamp = Date.now()

module.exports = function (plop) {
  plop.setGenerator('module', {
    description: 'Create a new module from the scratch',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: "What should this module's name be? e.g. minutes",
        validate: validatePackageName,
        filter: plop.getHelper('kebabCase')
      },
      {
        type: 'input',
        name: 'description',
        message: "What should this module's description be?",
        filter: stripDescription
      }
    ],
    actions: [
      {
        type: 'addMany',
        destination: 'packages/{{name}}',
        base: 'templates/module',
        templateFiles: 'templates/module/**/*',
        force: false,
        data: {
          version
        }
      }
    ]
  })

  plop.setGenerator('service', {
    description: 'Generate service from the scratch',
    prompts: [
      {
        type: 'input',
        name: 'packageName',
        message: "What is target package's name? (e.g. minutes)",
        validate: validatePackageName,
        filter: plop.getHelper('kebabCase')
      },
      {
        type: 'input',
        name: 'name',
        message: "What should this entitie's name be? (e.g. minutes)",
        validate: validatePackageName,
        filter: plop.getHelper('kebabCase')
      },
      {
        type: 'confirm',
        name: 'withMigration',
        message: 'Do you want generate seed migration sample for this entity?'
      }
    ],
    actions: function (data) {
      const actions = [
        {
          type: 'add',
          path: `packages/{{packageName}}/server/service/index.ts`,
          templateFile: 'templates/service/server/service/index.ts.hbs',
          skipIfExists: true,
          force: false
        },
        {
          type: 'addMany',
          destination: `packages/{{packageName}}/helps/{{packageName}}`,
          base: 'templates/service/helps',
          templateFiles: 'templates/service/helps/*.md.hbs',
          skipIfExists: true,
          force: false,
          data: {
            pluralPascalCase: function (name) {
              return startCase(camelCase(plural(name))).replace(/ /g, '')
            },
            pluralCamelCase: function (name) {
              return camelCase(plural(name))
            }
          }
        },
        {
          type: 'addMany',
          destination: `packages/{{packageName}}/client/pages/{{name}}`,
          base: 'templates/service/client/pages/entity',
          templateFiles: 'templates/service/client/pages/entity/*.ts.hbs',
          skipIfExists: true,
          force: false,
          data: {
            pluralPascalCase: function (name) {
              return startCase(camelCase(plural(name))).replace(/ /g, '')
            },
            pluralCamelCase: function (name) {
              return camelCase(plural(name))
            }
          }
        },
        {
          type: 'addMany',
          destination: 'packages/{{packageName}}/server/service/{{name}}',
          base: 'templates/service/server/service/entity',
          templateFiles: 'templates/service/server/service/entity/*.ts.hbs',
          skipIfExists: true,
          force: false,
          data: {
            pluralPascalCase: function (name) {
              return startCase(camelCase(plural(name))).replace(/ /g, '')
            },
            pluralCamelCase: function (name) {
              return camelCase(plural(name))
            }
          }
        },
        {
          type: 'modify',
          path: 'packages/{{packageName}}/server/service/index.ts',
          transform: (file, { name }) => {
            const pascalCaseName = startCase(camelCase(name)).replace(/ /g, '')
            file = file.replace(
              /\/\* EXPORT ENTITY TYPES \*\//,
              `/* EXPORT ENTITY TYPES */\nexport * from './${name}/${name}'`
            )
            file = file.replace(
              /\/\* IMPORT ENTITIES AND RESOLVERS \*\//,
              `/* IMPORT ENTITIES AND RESOLVERS */\nimport { entities as ${pascalCaseName}Entities, resolvers as ${pascalCaseName}Resolvers, subscribers as ${pascalCaseName}Subscribers } from './${name}'`
            )
            file = file.replace(/\/\* ENTITIES \*\//, `/* ENTITIES */\n\t...${pascalCaseName}Entities,`)
            file = file.replace(/\/\* SUBSCRIBERS \*\//, `/* SUBSCRIBERS */\n\t...${pascalCaseName}Subscribers,`)
            file = file.replace(
              /\/\* RESOLVER CLASSES \*\//,
              `/* RESOLVER CLASSES */\n\t\t...${pascalCaseName}Resolvers,`
            )
            return file
          }
        },
        {
          type: 'modify',
          path: 'packages/{{packageName}}/client/route.ts',
          transform: (file, { name }) => {
            return file.replace(
              /}\n}/,
              `
    case '${name}-list':
      import\('./pages/${name}/${name}-list-page'\)
      return page
  }
}`
            )
          }
        },
        {
          type: 'modify',
          path: 'packages/{{packageName}}/things-factory.config.js',
          transform: (file, { name }) => {
            return file.replace(
              /\n  \]/,
              `,
    { tagname: '${name}-list-page', page: '${name}-list' }
  ]`
            )
          }
        }
      ]

      if (data.withMigration) {
        actions.push({
          type: 'add',
          path: `packages/{{packageName}}/server/migrations/${timestamp}-Seed{{pascalCase name}}.ts`,
          templateFile: 'templates/service/server/migrations/timestamped-SeedEntity.ts.hbs',
          force: false,
          data: {
            timestamp
          }
        })
      }

      return actions
    }
  })

  plop.setGenerator('page', {
    description: 'Generate client page from the scratch',
    prompts: [
      {
        type: 'input',
        name: 'packageName',
        message: "What is target package's name? e.g. mfg-warehouse",
        validate: validatePackageName,
        filter: plop.getHelper('kebabCase')
      },
      {
        type: 'input',
        name: 'name',
        message: "What should this pages's name be? e.g. sample-page",
        validate: validatePackageName,
        filter: plop.getHelper('kebabCase')
      },
      {
        type: 'list',
        name: 'pageType',
        message: 'Select the type of page you want to generate:',
        choices: [
          { name: 'Simple Page', value: 'simple' },
          { name: 'List Page', value: 'list' }
          // { name: 'Mobile Page', value: 'mobile' }
        ]
      }
    ],
    actions: function (data) {
      const actions = [
        {
          type: 'modify',
          path: 'packages/{{packageName}}/client/route.ts',
          transform: (file, { name }) => {
            return file.replace(
              /}\n}/,
              `
    case '${name}':
      import\('./pages/${name}'\)
      return page
  }
}`
            )
          }
        },
        {
          type: 'modify',
          path: 'packages/{{packageName}}/things-factory.config.js',
          transform: (file, { name }) => {
            return file.replace(
              /\n  \]/,
              `,
    { tagname: '${name}', page: '${name}' }
  ]`
            )
          }
        }
      ]

      switch (data.pageType) {
        case 'simple':
          actions.unshift({
            type: 'add',
            path: 'packages/{{packageName}}/client/pages/{{name}}.ts',
            templateFile: 'templates/page/page.ts.hbs',
            force: false
          })
          break
        case 'list':
          actions.unshift({
            type: 'add',
            path: 'packages/{{packageName}}/client/pages/{{name}}.ts',
            templateFile: 'templates/page/page-list.ts.hbs',
            force: false,
            data: {
              pluralPascalCase: function (name) {
                return startCase(camelCase(plural(name))).replace(/ /g, '')
              },
              pluralCamelCase: function (name) {
                return camelCase(plural(name))
              }
            }
          })
          break
      }

      return actions
    }
  })

  plop.setGenerator('help', {
    description: 'Generate inline help page',
    prompts: [
      {
        type: 'input',
        name: 'packageName',
        message: "What is target package's name? e.g. mfg-warehouse",
        validate: validatePackageName,
        filter: plop.getHelper('kebabCase')
      },
      {
        type: 'input',
        name: 'topic',
        message: "What should this help page's topic be? e.g. mfg-warehouse/abc-concept"
      }
    ],
    actions: ['', '.ko', '.zh', '.ja', '.ms'].map(lng => {
      return {
        type: 'add',
        path: 'packages/{{packageName}}/helps/{{topic}}' + lng + '.md',
        templateFile: 'templates/help/template.md.hbs',
        force: false
      }
    })
  })

  plop.setGenerator('docs', {
    description: 'Generate root repo documentation',
    prompts: [],
    actions: [
      {
        type: 'add',
        path: 'README.md',
        templateFile: 'templates/docs/ROOT_README.hbs.md',
        force: true,
        data: { jsPackages }
      }
    ]
  })
}

function getPackages(type = 'js') {
  const packagesPath = path.join(__dirname, type === 'js' ? 'packages' : 'gems')

  return readdirSync(packagesPath).reduce((acc, packageName) => {
    const packageJSONPath = path.join(packagesPath, packageName, 'package.json')

    if (existsSync(packageJSONPath)) {
      const { name, description } = require(packageJSONPath)

      acc.push({ name: name.replace('@smart-village/', ''), description })
    }

    return acc
  }, [])
}

function validatePackageName(name) {
  return (
    /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/g.test(`@smart-village/${name}`) ||
    `Your package name (@smart-village/${name}) does not confirm to npm rules!`
  )
}

function stripDescription(desc) {
  return desc.replace(/[.\s]*$/g, '').replace(/^\s*/g, '')
}
