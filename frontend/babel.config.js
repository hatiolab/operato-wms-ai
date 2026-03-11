const mode = process.env.NODE_ENV

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          browsers: ['last 2 Chrome versions', 'Safari 10']
        },
        debug: mode === 'development'
      }
    ],
    '@babel/preset-react',
    '@babel/preset-typescript'
  ],
  assumptions: {
    setPublicClassFields: true
  },
  plugins: [
    '@babel/plugin-transform-typescript',
    [
      '@babel/plugin-proposal-decorators',
      {
        version: '2018-09',
        decoratorsBeforeExport: true
      }
    ],
    '@babel/plugin-proposal-class-properties'
  ]
}