module.exports = {
  description: "Build website",
  exec: async command => {

    // build site
    let build = require('../script/build')
    await build(command)

  },
}
