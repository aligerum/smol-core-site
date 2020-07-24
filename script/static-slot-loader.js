const loaderUtils = require('loader-utils')

module.exports = function(source) {
  let templateBody = loaderUtils.getOptions(this).templateBody
  let templates = templateBody.match(/<template.+?<\/template>/g) || []
  templates = templates.map(template => {
    let name = template.match(/slot=["'].+?["']/)
    name = name ? name[0].slice(6, -1) : 'default'
    return {name, body: template.slice(template.indexOf('>') + 1, -11), prepend: !!template.match(/prepend/), append: !!template.match(/append/)}
  })
  templateBody = templateBody.replace(/<template.+?<\/template>/g, '')
  if (templateBody.trim()) templates.push({name: 'default', body: templateBody})

  source = source.replace(/<template[\s\S]+?<\/template>/, vueTemplate => {
    let lines = vueTemplate.split('\n')
    for (let i=1; i<lines.length-1; i++) {
      let line = lines[i]
      if (!line.match(/slot\(.*?static.*?\)/)) continue
      let newLines = []
      let name = line.match(/name=["'].+?["']/)
      name = name ? name[0].slice(6, -1) : 'default'
      let originalSlotContent = []
      let indent = line.match(/^\s+/) ? line.match(/^\s+/)[0].length : 0
      for (let j=i+1; j<lines.length-1; j++) {
        let jLine = lines[j]
        let jIndent = jLine.match(/^\s+/) ? jLine.match(/^\s+/)[0].length : 0
        if (jIndent <= indent) break
        originalSlotContent.push(jLine)
      }
      originalSlotContent = originalSlotContent.map(oLine => oLine.slice(2))
      newLines = originalSlotContent.slice()
      let template = templates.find(template => template.name == name)
      if (template) {
        let pugBody = ''
        while (pugBody.length < indent) pugBody += '  '
        pugBody += template.body
        if (template.append) newLines.push(pugBody)
        else if (template.prepend) newLines.unshift(pugBody)
        else newLines = [pugBody]
      }
      lines.splice(i, originalSlotContent.length + 1, ...newLines)
    }
    return lines.join('\n')
  })

  return source
}
