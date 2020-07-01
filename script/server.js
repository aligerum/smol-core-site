const express = require('express')
const app = express()
const smol = require('smol')
const coreConfig = smol.config(smol.coreName)

// serve from output/<coreName>/public
app.use(express.static(`${process.cwd()}/output/${smol.coreName}/public`, {extensions: ['html', 'htm']}))

// remove powered by express header
app.disable('x-powered-by')

// listen on configured port
app.listen(coreConfig.port, () => console.log(smol.colors.green(`${smolConfig.appName} Site core (${smol.coreName}) listening on port ${coreConfig.port})))
