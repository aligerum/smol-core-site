const smol = require('smol')

module.exports = {
  description: 'Static Component',
  files: [
    {
      from: 'component.js',
      to: filename => `component/${filename}/component.js`
    },
    {
      from: 'componentScript.js',
      to: filename => `component/${filename}/script.js`
    },
    {
      from: 'componentStyle.styl',
      to: filename => `component/${filename}/style.styl`,
      parse: template => {
        return smol.string.replace(template.content, {
          componentName: template.filename
        })
      },
    },
    {
      from: 'componentTemplate.pug',
      to: filename => `component/${filename}/template.pug`,
      parse: template => {
        return smol.string.replace(template.content, {
          componentName: template.filename
        })
      },
    },
    {
      from: 'componentDoc.md',
      to: (filename, core) => `../../doc/${require(process.cwd() + '/core/' + core + '/core.json').displayName}/Components/${filename}.md`,
      parse: template => {
        return smol.string.replace(template.content, {
          componentName: template.filename
        })
      },
    },
  ],
}
