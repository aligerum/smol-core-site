const loaderUtils = require('loader-utils')

module.exports = function(source) {
  let templateBody = loaderUtils.getOptions(this).templateBody
  let templates = templateBody.match(/<template.+?<\/template>/g) || []
  templates = templates.map(template => {
    let name = template.match(/slot=["'].+?["']/)
    name = name ? name[0].slice(6, -1) : 'default'
    return {name, body: template.slice(template.indexOf('>') + 1, -11)}
  })
  templateBody = templateBody.replace(/<template.+?<\/template>/g, '')
  if (templateBody.trim()) templates.push({name: 'default', body: templateBody})
  source = source.replace(/slot\(.*?static.*?\)/g, slot => {
    let name = slot.match(/name=["'].+?["']/)
    name = name ? name[0].slice(6, -1) : 'default'
    let template = templates.find(template => template.name == name)
    if (template) return template.body
    return `//- ${slot}`
  })
  return source
}
