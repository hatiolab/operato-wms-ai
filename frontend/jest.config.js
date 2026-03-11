const { readdirSync, existsSync } = require('fs')
const path = require('path')
const debug = require('debug')('operato-app:jest.config')

const moduleNameMapper = getPackageNames().reduce((accumulator, name) => {
  const scopedName = `@operato-app/${name}$`
  accumulator[scopedName] = `<rootDir>/packages/${name}/server/index.ts`
  return accumulator
}, {})

debug('module names', moduleNameMapper)

module.exports = {
  setupFiles: ['./test/setup.ts'],
  setupFilesAfterEnv: ['./test/each-test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.[t|j]sx?$': 'babel-jest',
    '\\.(gql|graphql)$': 'jest-transform-graphql'
  },
  watchPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/packages/web-worker/.*/fixtures'],
  testRegex: '.*\\.test\\.tsx?$',
  testEnvironmentOptions: {
    url: 'http://localhost:3000/'
  },
  coverageDirectory: './coverage/',
  collectCoverage: true,
  moduleNameMapper
}

function getPackageNames() {
  const packagesPath = path.join(__dirname, 'packages')
  return readdirSync(packagesPath).filter(packageName => {
    const packageJSONPath = path.join(packagesPath, packageName, 'package.json')
    return existsSync(packageJSONPath)
  })
}
