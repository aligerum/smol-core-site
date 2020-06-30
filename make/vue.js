const smol = require('smol')

module.exports = {
  description: 'Static Component',
  files: [
    {
      from: 'vueComponent.vue',
      to: path => {
        let filename = path.split('/').slice(-1)[0]
        path = path.split('/').slice(0, -1).join('/')
        return `component/${path}/${smol.string.studlyCase(filename)}.vue`
      },
      parse: template => {
        return smol.string.replace(template.content, {
          componentName: smol.string.kabobCase(template.filename.split('/').slice(-1)[0])
        })
      },
    },
  ],
}
