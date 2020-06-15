const execSync = require('child_process').execSync
const smol = require('smol')
const coreConfig = smol.config(smol.coreName)
const smolConfig = smol.config()

module.exports = {
  description: 'Open in browser',
  exec: async command => {
    command.spawn(`${smolConfig.browser} ${coreConfig.url}:${coreConfig.port}`)
  }
}
