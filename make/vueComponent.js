const smol = require('smol')

module.exports = {
  description: 'Static Vue Component',
  files: [
    {
      from: 'vueComponent.js',
      to: filename => `component/${filename}/component.js`,
      parse: template => {
        return smol.string.replace(template.content, {
          componentName: smol.string.studlyCase(template.filename),
        })
      },
    },
    {
      from: 'vueComponent.vue',
      to: filename => `component/${filename}/${smol.string.studlyCase(filename)}.vue`,
      parse: template => {
        return smol.string.replace(template.content, {
          componentName: template.filename,
          camelCaseComponentName: smol.string.camelCase(template.filename),
        })
      },
    },
    {
      from: 'vueComponentDoc.md',
      to: (filename, core) => `../../doc/${require(process.cwd() + '/core/' + core + '/core.json').displayName}/Components/${filename}.md`,
      parse: template => {
        return smol.string.replace(template.content, {
          componentName: template.filename
        })
      },
    },
  ],
}
