const babel = require('@babel/core')
const babelPresetEs2015 = require('babel-preset-es2015')
const babelPresetEnv = require('@babel/preset-env')
const execSync = require('child_process').execSync
const fs = require('fs')
const MinifyPlugin = require('babel-minify-webpack-plugin')
const pug = require('pug')
const smol = require('smol')
const smolConfig = smol.config()
const smolPlugins = smol.plugins()
const coreJson = smol.coreJson()
const stylus = require('stylus')
const uglify = require('uglify-js')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const webpack = require('webpack')

// load build config
const buildConfig = fs.existsSync(`${process.cwd()}/core/${smol.coreName}/data/build.js`) ? require(`${process.cwd()}/core/${smol.coreName}/data/build.js`) : {}
if (!buildConfig.publicPath) buildConfig.publicPath = 'public'
if (!buildConfig.pageStylePath) buildConfig.pageStylePath = 'style/page'
if (!buildConfig.pageScriptPath) buildConfig.pageScriptPath = 'script/page'

// clean and sort build options by length, so least specific rules are applied first
if (buildConfig.files) {
  buildConfig.files.forEach(file => {
    if (file.src) file.src = file.src.split('/').filter(item => item).join('/')
  })
  buildConfig.files.sort((a, b) => {
    if (!a.src && !b.src) return 0
    if (a.src && !b.src) return -1
    if (b.src && !a.src) return 1
    if (a.src == b.src) return 0
    if (a.src.length < b.src.length) return -1
    if (a.src.length > b.src.length) return 1
    return 0
  })
}

// determine component paths
let components = {}
let componentPaths = []
componentPaths.push({components: `${process.cwd()}/core/${smol.coreName}/component`, modules: `${process.cwd()}/node_modules`})
if (coreJson.plugins) {
  for (let plugin of coreJson.plugins) {
    let pluginDef = smolPlugins.find(def => def.name == plugin)
    if (fs.existsSync(`${pluginDef.path}/core/site/component`)) componentPaths.push({components: `${pluginDef.path}/core/site/component`, modules: `${pluginDef.path}/node_modules`})
  }
}
for (let path of componentPaths) {
  if (fs.existsSync(path.components)) fs.readdirSync(path.components).forEach(name => components[name] = null)
}

// get component, loading if not already loaded
let getComponent = name => {
  if (!components[name]) {
    for (let path of componentPaths) {
      if (fs.existsSync(`${path.components}/${name}`)) {
        components[name] = {name: name, path: `${path.components}/${name}`, modulePath: path.modules, def: require(`${path.components}/${name}/component.js`), styles: []}
        if (!components[name].def.script) components[name].def.script = ''
        break
      }
    }
  }
  return components[name]
}

// build pug
let buildPug = async (command, from, to, outputDir, templateData) => {

  // set options
  let pugOptions = {
    basedir: `${process.cwd()}/core/${smol.coreName}/include/pug`,
    filename: `${from}`,
  }

  // store style and script
  let pageStyle = []
  let pageScript = []
  let pagePublicData = []
  let pageIds = []
  let pageCommonTags = []

  // compile pug
  let output = pug.compile(fs.readFileSync(from, 'utf-8'), pugOptions)(templateData)

  // for each component type on the page
  for (let name of Object.keys(components)) {
    if (!output.match(new RegExp(`<${name}`, 'g'))) continue

    // get component definition
    let component = getComponent(name)

    // determine id, attributes, and data for each instance of component type
    let componentInstances = []
    for (let tag of output.match(new RegExp(`<${name}.*?>`, 'g'))) {
      let attributes = []
      tag = tag.slice(name.length+1)
      for (let attribute of (tag.match(/[^ =]+?=["'].+?["']/g) || [])) {
        let attributeName = attribute.split('=')[0]
        let attributeValue = attribute.split('=')[1].slice(1, -1)
        attributes[attributeName] = attributeValue
      }
      tag = tag.replace(/[^ =]+?=["'].+?["']/g, '')
      for (let booleanName of (tag.match(/[^ >]+/g) || [])) attributes[booleanName] = true
      let componentData = Object.assign({}, templateData)
      for (let attribute of Object.keys(attributes)) componentData[smol.string.camelCase(attribute)] = attributes[attribute]
      if (component.def.props) {
        for (let propName of Object.keys(component.def.props)) {
          if (!componentData.hasOwnProperty(propName) && component.def.props[propName].default !== undefined) componentData[propName] = component.def.props[propName].default
        }
      }
      if (component.def.data) {
        let newData = await component.def.data(componentData)
        if (newData) componentData = newData
      }
      while (true) {
        let id = smol.string.generate({length: 8, chars: 'abcdefghijklmnopqrstuvwxyz1234567890'})
        if (!pageIds.includes(id)) {
          pageIds.push(id)
          break
        }
      }
      componentInstances.push({id: pageIds[pageIds.length-1], data: componentData})
    }
    let instanceIndex = -1
    output = output.replace(new RegExp(`<${name}`, 'g'), s => {
      instanceIndex++
      return `<${name} data-smol-id-${componentInstances[instanceIndex].id}`
    })

    // add page common tags
    if (component.def.tags) pageCommonTags = pageCommonTags.concat(component.def.tags.filter(tag => !tag.mode || tag.mode == smolConfig.mode))

    // parse pug for each component instance
    if (component.def.template && !component.def.script.match(/\.vue$/)) {
      let instanceIndex = 0
      output = output.replace(new RegExp(`<${name}.*?(?=<\\/${name}>)`, 'g'), s => {
        let componentData = componentInstances[instanceIndex].data
        instanceIndex++
        let openingTag = s.match(new RegExp(`<${name}.*?>`))[0]
        let pugOptions = {
          basedir: `${process.cwd()}/core/${smol.coreName}/include/pug`,
          filename: `${component.path}/${component.def.template}`,
        }
        let content = pug.compile(fs.readFileSync(`${component.path}/${component.def.template}`, 'utf-8'), pugOptions)(componentData)
        let pageContent = s.slice(openingTag.length)

        // handle slots
        let templates = pageContent.match(/<template.+?<\/template>/g) || []
        templates = templates.map(template => {
          let name = template.match(/slot=["'].+?["']/)
          name = name ? name[0].slice(6, -1) : 'default'
          let position = 'replace'
          if (template.slice(0, template.indexOf('>')).match(/prepend/)) position = 'prepend'
          if (template.slice(0, template.indexOf('>')).match(/append/)) position = 'append'
          return {name, position, body: template.slice(template.indexOf('>') + 1, -11)}
        })
        pageContent = pageContent.replace(/<template.+?<\/template>/g, '')
        if (pageContent.trim()) templates.push({name: 'default', body: pageContent})
        pageContent = ''
        content = content.replace(/<slot.*?static.*?<\/slot>/g, slot => {
          let name = slot.match(/name=["'].+?["']/)
          name = name ? name[0].slice(6, -1) : 'default'
          let template = templates.find(template => template.name == name)
          slot = slot.slice(slot.indexOf('>') + 1, -7)
          if (template) {
            if (template.position == 'append') return `${slot}${template.body}`
            if (template.position == 'prepend') return `${template.body}${slot}`
            return template.body
          }
          return slot
        })

        // replace component instance
        content = content.slice(content.indexOf(' '), -6)
        return `${openingTag.slice(0, -1)}${content}${pageContent}`

      })
    }

    // parse stylus for each component instance of this type
    pageStyle.push(`${name}{display:block}`)
    if (component.def.style) {
      let labels = []
      let stylusTemplate = fs.readFileSync(`${component.path}/${component.def.style}`, 'utf8')
      let stylusSettings = stylus(stylusTemplate).set('filename', `${component.path}/${component.def.style}`).set('compress', true).set('paths', [`${process.cwd()}/core/${smol.coreName}/include/stylus`, `${process.cwd()}/core/${smol.coreName}/include/css`])
      for (let instanceIndex=0; instanceIndex<componentInstances.length; instanceIndex++) {
        let instance = componentInstances[instanceIndex]
        for (let key of Object.keys(instance.data)) {
          if (instance.data[key] && typeof instance.data[key] == 'object') stylusSettings.define(key, parseStylusObject(instance.data[key]))
          else stylusSettings.define(key, new stylus.nodes.Ident(instance.data[key]))
        }
        let outputStyle = stylusSettings.render()
        if (!component.styles.includes(outputStyle)) {
          while (true) {
            let label = smol.string.generate({length: 8, chars: 'abcdefghijklmnopqrstuvwxyz1234567890'})
            if (!labels.includes(label)) {
              labels.push(label)
              break
            }
          }
          component.styles.push(outputStyle)
        }
        let checkingIndex = -1
        output = output.replace(new RegExp(`<${name}`, 'g'), s => {
          checkingIndex++
          if (checkingIndex != instanceIndex) return s
          return `<${name} data-smol-${labels[component.styles.indexOf(outputStyle)]}`
        })
      }
      component.styles = component.styles.map((style, index) => style.replace(new RegExp(`${name}`, 'g'), s => `${name}[data-smol-${labels[index]}]`))
      pageStyle = pageStyle.concat(component.styles)
    }

    // build script for component type
    if (component.def.script.match(/\.vue$/)) {
      if (smolConfig.mode == 'development') pageCommonTags.push({tag: 'script', attributes: {src: '//cdn.jsdelivr.net/npm/vue/dist/vue.js'}})
      else pageCommonTags.push({tag: 'script', attributes: {src: '//cdn.jsdelivr.net/npm/vue'}})
      let instanceIndex = 0
      for (let match of output.match(new RegExp(`<${name}.*?(?=<\\/${name}>)`, 'g'))) {
        let instance = componentInstances[instanceIndex]
        instanceIndex++
        let templateBody = match.slice(match.indexOf('>') + 1)
        let script = fs.readFileSync(`${__dirname}/../script/vue.js`, 'utf-8')
        script = script.replace(/\$vuePath/g, `${__dirname}/../node_modules/vue`)
        script = script.replace(/\$baseComponentPath/g, `${component.path}/${component.def.script}`)
        script = script.replace(/\$componentName/g, component.name)
        script = script.replace(/\$componentId/g, instance.id)
        fs.writeFileSync(`${process.cwd()}/output/${smol.coreName}/_a`, script)
        await buildScript({inputFile: `${process.cwd()}/output/${smol.coreName}/_a`, outputFile: `${process.cwd()}/output/${smol.coreName}/_b`, templateBody, component})
        script = fs.readFileSync(`${process.cwd()}/output/${smol.coreName}/_b`, 'utf-8')
        command.run(`rm ${process.cwd()}/output/${smol.coreName}/_a; rm ${process.cwd()}/output/${smol.coreName}/_b`)
        pageScript.push(script)
      }
    } else if (component.def.script) {
      let script = fs.readFileSync(`${component.path}/${component.def.script}`, 'utf-8')
      if (script.match(/require/) || script.match(/import/)) {
        await buildScript({inputFile: `${component.path}/${component.def.script}`, outputFile: `${process.cwd()}/output/${smol.coreName}/_a`, component})
        script = fs.readFileSync(`${process.cwd()}/output/${smol.coreName}/_a`, 'utf-8')
        command.run(`rm ${process.cwd()}/output/${smol.coreName}/_a`)
      } else {
        script = `(() => {var publicData = (window.smolPublicData && window.smolPublicData.${smol.string.camelCase(name)}) ? window.smolPublicData.${smol.string.camelCase(name)} : {};${script}})()`
      }
      pageScript.push(script)
    }

    // add public data
    if (component.def.publicData) {
      let publicData = {}
      if (typeof component.def.publicData == 'string') component.def.publicData = []
      if (Array.isArray(component.def.publicData)) for (let key of component.def.publicData) publicData[key] = templateData[key]
      else publicData = await component.def.publicData(templateData)
      if (Object.keys(publicData).length) pagePublicData.push(`${smol.string.camelCase(name)}: ${JSON.stringify(publicData)}`)
    }

  }

  // add public data to page
  if (pagePublicData.length) {
    let publicDataScript = `smolPublicData = {${pagePublicData.join(',')}}`
    output = output.replace(/<\/body>/, `<script>${publicDataScript}</script></body>`)
  }

  // determine name
  let name = to.split('/').slice(-1)[0]
  let hrefPath = to.slice(`${outputDir}/${buildConfig.publicPath}/`.length).split('/').slice(0, -1).join('/')

  // add style to file and link in head
  if (pageStyle.filter(style => style).length) {
    command.run(`mkdir -p ${outputDir}/${buildConfig.publicPath}/${buildConfig.pageStylePath}/${hrefPath}`)
    fs.writeFileSync(`${outputDir}/${buildConfig.publicPath}/${buildConfig.pageStylePath}/${hrefPath}/${name}.css`, pageStyle.join(''))
    output = output.replace(/<\/head>/, `<link rel="stylesheet" href="/${buildConfig.pageStylePath}/${hrefPath ? hrefPath + '/' : ''}${name}.css"></head>`)
  }

  // add common tags
  pageCommonTags = pageCommonTags.map(tag => {
    let keys = Object.keys(tag.attributes).filter(key => key != 'tagType').sort().map(key => {
      let value = tag.attributes[key]
      if (typeof value == 'boolean') return key
      return `${key}="${value}"`
    })
    keys = keys.length ? ` ${keys.join(' ')}` : ''
    return `<${tag.tag}${keys}></${tag.tag}>`
  })
  pageCommonTags = pageCommonTags.filter((tag, index) => pageCommonTags.indexOf(tag) == index)
  let commonHeadTags = pageCommonTags.filter(tag => !tag.match(/<script/))
  let commonBodyTags = pageCommonTags.filter(tag => tag.match(/<script/))
  if (commonHeadTags.length) output = output.replace(/<\/head>/, `${commonHeadTags.join('')}</head>`)
  if (commonBodyTags.length) output = output.replace(/<\/body>/, `${commonBodyTags.join('')}</body>`)

  // add script to file and link in body
  if (pageScript.filter(script => script).length) {
    command.run(`mkdir -p ${outputDir}/${buildConfig.publicPath}/${buildConfig.pageScriptPath}/${hrefPath}`)
    let filename = `${outputDir}/${buildConfig.publicPath}/${buildConfig.pageScriptPath}/${hrefPath}/${name}.js`
    let script = await buildScript({script: pageScript.join(''), filename})
    fs.writeFileSync(filename, script)
    output = output.replace(/<\/body>/, `<script src="/${buildConfig.pageScriptPath}/${hrefPath ? hrefPath + '/' : ''}${name}.js"></script></body>`)
  }

  // write parsed file
  fs.writeFileSync(`${to}.html`, output)

}

// build and minify js file
let buildScript = async options => {

  // build input script
  if (options.script) {
    let script = options.script
    let babelOptions = {
      filename: options.filename,
      presets: [
        babelPresetEs2015,
        [babelPresetEnv, {targets: 'defaults', modules: 'auto'}],
      ],
    }
    script = babel.transform(script, babelOptions).code
    script = uglify.minify(script, {compress: true}).code
    return script
  }

  // build with webpack
  let config = {
    entry: options.inputFile,
    output: {
      path: options.outputFile.split('/').slice(0, -1).join('/'),
      filename: options.outputFile.split('/').slice(-1)[0],
    },
    mode: smolConfig.mode,
    module: {
      rules: [
        { test: /\.css$/, use: ['vue-style-loader', 'css-loader'] },
        { test: /\.js$/, use: 'babel-loader' },
        {
          test: /\.pug$/,
          use: {
            loader: 'pug-plain-loader',
            options: { doctype: '' },
          },
        },
        { test: /\.styl(us)?$/, use: ['vue-style-loader', 'css-loader', 'stylus-loader'] },
        { test: /\.vue$/, use: 'vue-loader' },
      ],
    },
    plugins: [
      new VueLoaderPlugin(),
      new MinifyPlugin(),
    ],
    resolveLoader: {
      modules: [
        `${process.cwd()}/node_modules`,
        `${process.cwd()}/node_modules/smol-core-site/node_modules`,
      ],
    },
    resolve: {
      modules: [
        `${process.cwd()}/node_modules`,
        `${process.cwd()}/node_modules/smol-core-site/node_modules`,
      ],
      alias: {
        config: `${process.cwd()}/config`,
        corePath: `${process.cwd()}/core/${smol.coreName}`,
        coreConfig: `${process.cwd()}/config/${smol.coreName}.json`,
        cwd: process.cwd(),
        include: `${process.cwd()}/core/${smol.coreName}/include`
        smolConfig: `${process.cwd()}/config/smol.json`,
      },
    },
  }
  if (options.templateBody) config.module.rules.find(rule => rule.use == 'vue-loader').use = ['vue-loader', {loader: `${__dirname}/../script/static-slot-loader.js`, options: {templateBody: options.templateBody}}]
  if (options.component) config.resolve.modules.push(options.component.modulePath)
  // if (smolConfig.mode == 'development') config.resolve.alias.vue = 'vue/dist/vue.js'

  let configs = [config]
  let compiler = webpack(configs)
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        console.log(smol.colors.yellow(`Error in build process:`))
        console.log(err)
        process.exit(1)
      }
      if (stats.hasErrors()) {
        console.log(smol.colors.yellow(`Error in build process:`))
        console.log(stats.toJson().errors[0])
        process.exit(1)
      }
      resolve()
    })
  })

}

// convert object to stylus data
let parseStylusObject = o => {
  let parsedObject = new stylus.nodes.Object()
  for (let key of Object.keys(o)) {
    if (o[key] && typeof o[key] == 'object') parsedObject.setValue(key, parseStylusObject(o[key]))
    else if (o[key]) parsedObject.setValue(key, new stylus.nodes.Ident(o[key]))
  }
  return parsedObject
}

// build src files
let handleDir = async (command, inputDir, outputDir, path = '') => {
  if (path.slice(0, 1) == '/') path = path.slice(1)
  let items = fs.readdirSync(`${inputDir}/${path}`)

  // get directory options
  let directoryData = {}
  if (buildConfig.files) {
    let dirPathSegments = path.split('/').filter(item => item)
    for (let file of buildConfig.files.filter(file => file.src && file.data)) {
      let filePathSegments = file.src.split('/').filter(item => item)
      if (dirPathSegments.slice(0, filePathSegments.length).join('/') == filePathSegments.join('/')) Object.assign(directoryData, file.data)
    }
  }

  // go through each item
  for (let item of items) {
    command.run(`mkdir -p ${outputDir}/${path}`)

    // recursively handle directories
    if (fs.statSync(`${inputDir}/${path}/${item}`).isDirectory()) {
      await handleDir(command, inputDir, outputDir, `${path}/${item}`)
      continue
    }

    // get file options
    let templateData = Object.assign({}, directoryData)
    let filePath = `src/${path}/${item}`.split('/').filter(item => item).join('/')
    if (buildConfig.files) {
      let fileOption = buildConfig.files.find(file => file.src && file.src.split('/').filter(item => item).join('/') == filePath.slice(4).split('/').filter(item => item).join('/')) || {}
      if (fileOption.data) Object.assign(templateData, fileOption.data)
    }

    // parse based on extension
    let name = item.indexOf('.') ? item.slice(0, item.lastIndexOf('.')) : item
    let ext = item.indexOf('.') ? item.slice(item.lastIndexOf('.') + 1) : ''

    // build markup
    if (ext == 'pug') await buildPug(command, `${inputDir}/${path}/${item}`, `${outputDir}/${path}/${name}`, outputDir, templateData)

    // build style
    if (['styl', 'stylus'].includes(ext)) {
      let stylusTemplate = fs.readFileSync(`${inputDir}/${path}/${item}`, 'utf8')
      let stylusSettings = stylus(stylusTemplate).set('filename', `${inputDir}/${path}/${item}`).set('compress', true).set('paths', [`${process.cwd()}/core/${smol.coreName}/include/stylus`, `${process.cwd()}/core/${smol.coreName}/include/css`])
      for (let key of Object.keys(templateData)) {
        if (typeof templateData[key] == 'object') stylusSettings.define(key, parseStylusObject(templateData[key]))
        else stylusSettings.define(key, new stylus.nodes.Ident(templateData[key]))
      }
      fs.writeFileSync(`${outputDir}/${path}/${name}.css`, stylusSettings.render())
    }

    // build script
    if (ext == 'js') await buildScript({inputFile: `${inputDir}/${path}/${item}`, outputFile: `${outputDir}/${path}/${name}.js`})

  }

}

// build generated files from templates
let buildAssets = async (command, outputDir) => {
  for (let fileDef of buildConfig.files.filter(def => def.to)) {

    // handle each item
    for (let item of fileDef.each) {

      // determine output filename
      let outputName = typeof fileDef.to == 'string' ? fileDef.to : fileDef.to(item)

      // determine template data
      let templateData = {}
      let dirPathSegments = outputName.split('/').filter(item => item)
      for (let file of buildConfig.files.filter(file => file.src && file.data)) {
        let filePathSegments = file.src.split('/').filter(item => item)
        if (dirPathSegments.slice(0, filePathSegments.length).join('/') == filePathSegments.join('/')) Object.assign(templateData, file.data)
      }
      if (fileDef.data) Object.assign(templateData, fileDef.data)
      if (fileDef.as) templateData[fileDef.as] = item

      // build template
      let dir = `${outputDir}/${outputName}`.split('/').slice(0, -1).join('/')
      command.run(`mkdir -p ${dir}`)
      await buildPug(command, `${process.cwd()}/core/${smol.coreName}/include/pug/${fileDef.src}`, `${outputDir}/${outputName}`, outputDir, templateData)

    }

  }
}

module.exports = async command => {

  // clear output directory
  console.log(command.colors.yellow(`Cleaning output/${smol.coreName}...`))
  command.run(`rm -rf ${process.cwd()}/output/${smol.coreName}`)

  // build src files
  let srcPath = `${process.cwd()}/core/${smol.coreName}/src`
  if (fs.existsSync(srcPath)) {
    console.log(command.colors.yellow('Building assets from src...'))
    await handleDir(command, srcPath, `${process.cwd()}/output/${smol.coreName}`)
  }

  // build generated assets
  if (buildConfig.files && buildConfig.files.filter(def => def.to).length) {
    console.log(command.colors.yellow('Building generated assets...'))
    await buildAssets(command, `${process.cwd()}/output/${smol.coreName}`)
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
}
