'use strict'

const settings = {
  ignore_watch: ['data'],
  watch: ['./src', './*js'],
  namespace: 'Slashtags-Feeds'
}

module.exports = {
  apps: [
    {
      name: 'Slashtags Feeds',
      script: './start.js',
      env: {
        DEBUG: 'stfeed:*'
      },
      env_production: {},
      ...settings
    }
  ]
}
