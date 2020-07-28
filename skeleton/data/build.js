module.exports = async () => {

  // perform queries and requests
  // let someModels = await SomeModel.get()
  // let response = await axios.get('http://example.com/api/data')

  // generate data
  let data = {}

  // return build config
  return {
    files: [
      {src: 'public', data},
    ],
    publicPath: 'public',
    pageScriptPath: 'script/page',
    pageStylePath: 'style/page',
    siteScriptPath: 'script/site',
    siteStylePath: 'style/site',
    copyAfterBuild: [],
  }

}
