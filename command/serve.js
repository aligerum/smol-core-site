const execSync = require('child_process').execSync
const fs = require('fs')
const smol = require('smol')
const smolConfig = smol.config()
const coreConfig = smol.config(smol.coreName)

module.exports = {
  description: 'Serve on configured port',
  args: [
    'action?: Action to perform',
  ],
  argValues: {
    action: [
      'restart: Restart server background process',
      'status: Get status of server',
      'start: Start server as a background process',
      'stop: Stop server background process',
    ],
  },
  help: {
    Notes: 'Specify no action to serve from terminal to view console output',
  },
  exec: async command => {

    // status
    if (command.args.action == 'status') {
      console.log(`${smolConfig.appName} ${smol.coreName} core is configured to run at ${coreConfig.url}:${coreConfig.port}`)
      return command.run('pm2 status')
    }

    // create ecosystem file
    let serverPath = `${__dirname}/../script/server.js`
    let ecosystemPath = `${process.cwd()}/config/${smol.coreName}-ecosystem.config.js`
    let ecosystem = {
      apps: [{
        name: `${smol.string.kabobCase(smolConfig.appName.toLowerCase())}-${smol.coreName}`,
        script: serverPath,
        exec_mode: 'cluster',
        instances: coreConfig.serverInstances,
      }],
    }
    command.run(`mkdir -p ${process.cwd()}/config`)
    fs.writeFileSync(ecosystemPath, `module.exports = ${JSON.stringify(ecosystem, null, 2)}`)

    // normal serve
    if (!command.args.action) command.run(`pm2 start ${ecosystemPath} --no-daemon --watch`)

    // start
    if (command.args.action == 'start') command.run(`pm2 start ${ecosystemPath}; pm2 save --force`)

    // restart
    if (command.args.action == 'restart') command.run(`pm2 reload ${ecosystemPath}`)

    // stop
    if (command.args.action == 'stop') command.run(`pm2 stop ${ecosystemPath}; pm2 delete ${ecosystemPath}; pm2 save --force`)

  }
}
