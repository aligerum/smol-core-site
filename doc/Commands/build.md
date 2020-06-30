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

For this, you can edit the `data/build.js` file. This file is generated on core creation. In this file, you can define what template data is passed to each file by using the `options` key, which can be used within the targeted stylus and pug files for example.

```js
const smol = require('smol')
const smolConfig = smol.config()

module.exports = {
  files: [
    {src: 'public/index.pug', data: {appName: smolConfig.appName}},
  ],
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
let data = {
  appName: 'Some App',
}

module.exports = {
  files: [
    {src: 'public', data}
    {src: 'public/contact.pug', data: {color: 'blue'}},
  ],
}
```

In this example, `public/index.pug` would have access to `appName`, because everything in the `public` directory has access to that data, but `public/contact.pug` would have access to `appName` _and_ `color`, as that data was passed to it.

The order of these definitions does not matter, but the specificity does. More specific rules (longer paths) will add to less specific rules. Data is overwritten at the top level, meaning the contents of arrays and objects of the same name are not merged, they're replaced.