# build Command

The build command is used to generate all distributable assets for the site. The build process consists of copying all static assets from `core/<coreName>/static` to the output directory (which can be copied elsewhere, or have a web server pointed directly at it). All files in the `core/<coreName>/src` directory are then parsed, with their output being placed in the output directory alongside the static assets.

For example, the following setup would produce the files in the `output/` section:

```
core/
  someSite/
    src/
      public/
        script/
          app.js
        style/
          app.styl
        index.pug
    static/
      public/
        images/
          favicon.png
        .htaccess

output/
  someSite/
    public/
      images/
        favicon.png
      script/
        app.js
      style/
        app.css
      .htaccess
      index.html
```

Each item within the `static` directory is copied with no parsing whatsoever. Each item in the `src` directory is parsed according to its type to produce an output file.

# Data

One of the strengths of static site generation is to minimize the number of database calls required at request-time, and to prevent the need to build the page on each request.

Once the static files are generated (and placed in the output directory), they can populate a cache, but this means whatever data was present at build time is what will be permanently baked into that asset (until it's rebuilt). This means, you will need to pass the data required to build the page into the template itself at build time.

For this, you can edit the `data/build.js` file. This file is generated on core creation. In this file, you can define what template data is passed to each file by using the `files` key, which can be used within the targeted stylus and pug files for example.

```js
const smol = require('smol')
const smolConfig = smol.config()

module.exports = async () => {
  return {
    files: [
      {src: 'public/index.pug', data: {appName: smolConfig.appName}},
    ],
  }
}
```

```pug
doctype html
head
  meta(charset="utf-8")
  title #{appName}
  link(rel="icon" href="/images/favicon.png")
  link(rel="stylesheet" href="/style/app.css")
body
  #app
  script(src="/script/app.js")
```

In addition to specifying individual files, you can define directories, and all files within that directory and all subdirectories will have access to that data. Data cascades down, for example:

```js
module.exports = async () => {
  let data = {
    appName: 'Some App',
  }
  return {
    files: [
      {src: 'public', data}
      {src: 'public/contact.pug', data: {color: 'blue'}},
    ],
  }
}
```

In this example, `public/index.pug` would have access to `appName`, because everything in the `public` directory has access to that data, but `public/contact.pug` would have access to `appName` _and_ `color`, as that data was passed to it.

The order of these definitions does not matter, but the specificity does. More specific rules (longer paths) will add to less specific rules. Data is overwritten at the top level, meaning the contents of arrays and objects of the same name are not merged, they're replaced.

# Generated Assets

It is a common need to generate multiple pages based on the input data. For example, you have a store with multiple items for sale. For this, you can specify a template from `include/pug` as the `src`, and a filename for the `to`.

```js
const axios = require('axios')

module.exports = async () => {
  let items = (await axios.get('http://api.example.com/items')).data
  let data = {
    appName: 'Some App'
  }
  return {
    files: [
      {src: 'item', each: items, as: 'item', to: item => `public/items/${item.category}/${item.name}-${item.slug}`},
    ],
  }
}
```

Here, the list of items is fetched from an api. Each item has a name, category, and a slug.

The `each` key says to go through each of the entries in the `items` array. The `as` key says to add a variable called `item` within those pages that shows the current item. So within each generated page, you could output `#{item.name}` and so on in the pug.

The `src` key indicates to use `include/pug/item.pug` as the template. The `to` key is a function that returns the new filename, which is passed the item from the array. `.pug` is optional on the `src` key, and `.html` is optional on the `to` key.

You can also skip adding the `each` and `as` to hardcode entries you want to be pulled from templates and give them a string filename. Example:

```js
const axios = require('axios')

module.exports = async () => {
  let items = (await axios.get('http://api.example.com/items')).data
  let data = {
    appName: 'Some App',
  }
  let config = {
    files: [],
  }
  for (let item of items) {
    config.files.push({src: 'item', data: Object.assign({item}, data), to: `public/items/${item.category}/${item.name}-${item.slug}`}),
  }
  return config
}
```

Here, the items are being manually added into the page's data with each new entry to the files array.

# Copying Files

You may have files or directories you wish to copy into your output directory post-build. These may be files generated by other projects or packages, or just unversioned static assets you wish to keep out of the `static/` directory.

To have these files copied in afterwards, use the `copyAfterBuild` key.

```js
module.exports = async () => {
  return {
    copyAfterBuild: [
      {from: 'some-library/main.js', to: 'public/script/some-library.js'},
    ],
  }
}
```

The `from` key is relative to the root project directory. The `to` key is relative to the core's output directory (`projectRoot/output/<coreName>/`).
