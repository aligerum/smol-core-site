const fs = require('fs')
const smol = require('smol')
const pug = require('pug')
const stylus = require('stylus')
const webpack = require('webpack')
const buildConfig = fs.existsSync(`${process.cwd()}/core/${smol.coreName}/data/build.js`) ? require(`${process.cwd()}/core/${smol.coreName}/data/build.js`) : {}

let buildAssets = async (command, inputDir, outputDir) => {

  // build public files
  let handleDir = (path = '') => {
    let items = fs.readdirSync(`${inputDir}/${path}`)
    for (let item of items) {
      command.run(`mkdir -p ${outputDir}/${path}`)

      // recursively handle directories
      if (fs.statSync(`${inputDir}/${path}/${item}`).isDirectory()) {
        handleDir(`${path}/${item}`)
        continue
      }

      // get file options
      let templateData = {}
      if (buildConfig.options) {
        // load all parent directory options cascading down to current file
        // apply file options over parent directory options
        let filePath = `src/${path}/${item}`.split('/').filter(item => item).join('/')
        let fileOptions = buildConfig.options.find(option => option.file == filePath) || {}
        if (fileOptions.templateData) templateData = fileOptions.templateData
      }

      // parse based on extension
      let name = item.indexOf('.') ? item.slice(0, item.lastIndexOf('.')) : item
      let ext = item.indexOf('.') ? item.slice(item.lastIndexOf('.') + 1) : ''

      // build markup
      if (ext == 'pug') fs.writeFileSync(`${outputDir}/${path}/${name}.html`, pug.compileFile(`${inputDir}/${path}/${item}`)(templateData))

      // build style
      if (['styl', 'stylus'].includes(ext)) fs.writeFileSync(`${outputDir}/${path}/${name}.css`, stylus.render(fs.readFileSync(`${inputDir}/${path}/${item}`, 'utf8'), {compress: true}))

      // build script
      // if (ext == 'js') command.run(`npx webpack --display errors-only --entry ${process.cwd()}/${inputDir}/${path}/${item} --output ./${outputDir}/${path}/${item}`)

    }
  }
  handleDir()

}

module.exports = {
  description: "Build website",
  exec: async command => {

    // clear output directory
    console.log(command.colors.yellow(`Cleaning output/${smol.coreName}...`))
    command.run(`rm -rf ${process.cwd()}/output/${smol.coreName}`)

    // build src files
    let srcPath = `${process.cwd()}/core/${smol.coreName}/src`
    if (fs.existsSync(srcPath)) {
      console.log(command.colors.yellow('Building assets from src...'))
      await buildAssets(command, srcPath, `${process.cwd()}/output/${smol.coreName}`)
    }

    // copy static files
    command.run(`mkdir -p ${process.cwd()}/output/${smol.coreName}`)
    let staticPath = `${process.cwd()}/core/${smol.coreName}/static`
    if (fs.existsSync(staticPath)) {
      console.log(command.colors.yellow('Copying static assets...'))
      command.run(`cp -R ${staticPath}/* ${process.cwd()}/output/${smol.coreName}/`)
    }

    // copy after-build assets
    if (buildConfig.copyAfterBuild) {
      console.log(command.colors.yellow('Copying after-build assets...'))
      for (let file of buildConfig.copyAfterBuild) {
        let path = file.to.split('/').slice(0, -1).join('/')
        command.run(`mkdir -p ${process.cwd()}/output/${smol.coreName}/${path}`)
        command.run(`cp -R ${process.cwd()}/${file.from} ${process.cwd()}/output/${smol.coreName}/${file.to}`)
      }
    }

    // done
    console.log(command.colors.green(`Created static site at output/${smol.coreName}`))

  },
}
