# Components

Components are defined in `core/<coreName>/component`. These static components are not to be confused with Web Components, Vue Components, etc. These are special component definitions that are compiled to static assets during the build process.

Components are stored within directories of the same name as the tag they should replace within a page. For example, if you'd like to make a `header-menu-component` component, you would run `smol make <coreName> component header-menu-component`, which would produce a `core/<coreName>/component/header-menu-component` directory.

Within the directory is the `component.js` file which defines properties of the component and how it is handled during the build process. During the build process, every instance of `<header-menu-component></header-menu-component>` is replaced with the component.

Ensure your custom component names do not conflict with existing html tag names. For this reason, you should make your component names at least two words and to be even more clear, it's a good design pattern to end components in `-component`, for example: `<header-menu-component>` rather than `<header-menu>`.

# Packaged Components

Project-level components are stored in `core/<coreName>/component`. Because you may have multiple sites that use the same common set of components, you can also store components within smol plugins. The plugin will need to store its components within a `core/site/component` directory. You can then install that plugin to the project and specify that the plugin should be used within the site core by using `smol plugin add <pluginName> <coreName>`. For example:

```
$ npm i --save smol-plugin-my-common-components
$ smol make core site someSite
$ smol plugin add my-common-components someSite
```

You can then use any of the components within that package with no additional configuration needed. Project-level components with the same name as package components override package components.

Project-level components may `require` or `import` any npm dependencies available within the project's `package.json`. Plugin components may `require` or `import` any npm dependencies available within the plugin's `package.json`, which allows you to keep all of the dependencies out of your project.

# Component Definition

The `component.js` file within the component's directory defines the behavior of the component. When you first make a component, its definition will look like this:

```js
// core/<coreName>/component/<some-component>/component.js
module.exports = {
  // template: 'template.pug',
  // style: 'style.styl',
  // script: 'script.js',
  props: {
  },
  data: async data => {
  },
  publicData: [],
  // publicData: async data => {
  // },
  tags: [
    // {tag: 'script', attributes: {src: "//somesite.com/somescript.js", async: true}},
  ],
}
```

# Templates

The `template` option defines a pug file within the component to load. This path is relative to the component's directory. Each instance of the component on a page is replaced with this template.

This template has access to all of the data available to the template using the component.

Templates within components can also use pug `include` directives that are relative to their filepath. Root includes such as `include /page` will come from `core/<coreName>/include/pug` just as with normal templates.

# Style

The `style` option defines a stylus file within the component to load. Just as with templates, this path is relative to the component's directory. Also, as with templates, the parent template's data is available to the stylus and `@import` and `@require` directives are relative to the stylus filepath, with root includes also available that pull from `core/<coreName>/include/stylus`.

Unlike templates, the style for the component is not directly placed into the page at the component's tag. Instead, all of the individual components' styles are placed into a generated css file specific to the page. This file is then referenced in the `<head>` of the page.

The filepath for this css is determined by the site's `data/build.js` file (see build Command doc). This css file must be publicly available and is computed as follows: `<buildJs.publicPath>/<buildJs.pageStylePath>/<pageRoute>`. So if your `publicPath` is `public` and your `pageStylePath` is `style/page`, then the css for `public/somepath/about.pug` would be stored at `public/style/page/somepath/about.css`. All of the styles for every component on that page would be included in that file and minified.

# Scoped Style

Style as defined in the component's stylus file can of course be different per instance of that component on a page. In order for the style of each of these to not conflict, the style is scoped only to that component. This means you are safe to define any styling without fear of it conflicting with other component instances or anything outside of the component on the page.

# Script

The `script` option defines a javascript file within the component to load. Like the style option, the script is not inserted directly into the page, but instead linked in the head. Also like the style option, the path to this file is stored in `<buildJs.publicPath>/<buildJs.pageScriptPath>/<pageRoute>`. So if your `publicPath` is `public` and your `pageScriptPath` is `script/page`, then the js for `public/somepath/about.pug` would be stored at `public/script/page/somepath/about.js`. All of the javascript for every component on that page would be included in that file and minified.

Unlike the `template` and `style` options, the `script` option does not receive access to the `data` object. Also, the script is only included once per page, even if there are multiple instances of the same component. Instead, you will need to look at the attributes provided on the component tags for data, or pull data from external endpoints.

You can use `require` and `import` directives in the script to import project-level (or plugin-level) npm packages and also provide relative paths from the `script.js` file (such as having other data within your component directory). The following aliases are also provided:

| Alias | Path |
| --- | --- |
| `cwd` | `<projectPath>` |
| `config` | `<projectPath>/config` |
| `corePath` | `<projectPath>/core/<coreName>` |
| `coreConfig` | `<projectPath>/config/<coreName>.json` |
| `smolConfig` | `<projectPath>/config/smol.json` |
| `include` | `<projectPath>/core/<coreName>/include` |

These aliases can be used within the javascript for convenience. For example:

```js
import moment from 'moment'
import Person from 'include/js/Person'
import smolConfig from 'smolConfig'

// you can access data from config
console.log(`The app name is ${smolConfig.appName}`)

// to can use classes and data from includes
for (let person of Person.list) console.log(person)

// you can add functionality to individual components on the page
window.addEventListener('load', () => {
  document.querySelectorAll('person-component').forEach(tag => {
    tag.addEventListener('click', e => {
      console.log(`You clicked ${tag.attributes.name.value} at ${moment.format('HH:mm:ss')}`)
    })
  })
})
```

The component's script will be run through babel and minified.

# Static Slots

It is common to want to place dom into specific components in the same way that pug can insert dom using blocks.

To do this, you can provide `<slot static>` tags within the component's template.

```pug
.some-component
  div This is above the slot
  slot(static)
  div This is below the slot
```

```pug
extends /page

block body
  some-component
    div This content will replace the slot
```

This will produce:

```html
<some-component>
  <div>This is above the slot</div>
  <div>This content will replace the slot</div>
  <div>This is below the slot</div>
</some-component>
```

You can also provide named components using the `template` tag:

```pug
.some-component
  slot(name="header" static)
  div This is above the slot
  slot(static)
  div This is below the slot
  slot(name="footer" static)
```

```pug
extends /page

block body
  some-component
    template(slot="header")
      div This is header content
    template
      div This content will replace the slot
    template(slot="footer")
      div This is footer content
```

Any `template` tags with no `slot=` will replace the unnamed slot. If there are no unnamed slots, the content will simply be ignored.

You can also set default content for slots by putting the data in the component:

```pug
.some-component
  div This is above the slot
  slot(static)
    div This is default content
  div This is below the slot
```

Default content will be replaced by any content on the page, if provided. Alternatively, you can add an `append` or `prepend` attribute to the template to add to the content, and this can be combined with he `name` attribute:

```pug
extends /page

block body
  //- This will show default content
  some-component
  some-component
    template(prepend)
      div This will be prepended to the default content
  some-component
    template(append)
      div This will be appended to the default content
  some-component
    template
      div This will replace the default content
  some-component
    div This will also replace the default content
```

# Props

Components would be much less useful if they had to be rewritten any time you want an instance to be slightly different. You can set attributes on individual component instances to alter its functionality.

For example, we could make a component like this:

```js
// person-component/component.js
module.exports = {
  template: 'template.pug',
  style: 'stylus.styl',
  script: 'script.js',
  props: {
    name: { default: null },
    favoriteColor: { default: 'black' },
  },
}
```

```pug
.person-component
  if (name)
    div My name is #{ name }
  else
    div I don't have a name
```

```stylus
.person-component
  border 1px solid favoriteColor
```

Then we could make a page like this:

```pug
extends /page

block body
  person-component(name="Bob" favorite-color="blue")
  person-component(name="Alice" favorite-color"red")
  person-component(name="Charlie")
  person-component
```

Note that only strings can be passed in this way (no arrays or objects). In order to get that data into a component, you should instead provide the data in the template data and pass in some object key or array index for it to access.

Even values that are not specified in the `props` object can be passed in and accessed, but it is good practice to provide them for the sake of documentation. Values passed as attributes overwrite already available data without polluting the page's data and is available within both the template and the stylus.

Note that props are assigned on the component in kabob-case and are accessed via camelCase (as shown in the above example).

# Data

When data is passed to component, you may wish to alter it first. This is possible with the `data` directive. This can provide a function that is passed the data to go to the component instance, which can then be modified or added to. For example, consider modifying the `person-component` defined above:

```js
// person-component/component.js
module.exports = {
  template: 'template.pug',
  style: 'stylus.styl',
  script: 'script.js',
  props: {
    name: { default: null },
    favoriteColor: { default: 'black' },
  },
  data: async data => {
    if (data.name) data.name = data.name.toUpperCase()
  },
}
```

This is run for each individual instance and does not pollute the template's data. If you do not provide a return value, the data object that you modified is used. If you provide a return value, the original data is discarded and the returned value will instead be used.

```js
// person-component/component.js
module.exports = {
  template: 'template.pug',
  style: 'stylus.styl',
  script: 'script.js',
  props: {
    name: { default: null },
    favoriteColor: { default: 'black' },
  },
  data: async data => {
    return {
      name: data.name.toUpperCase(),
      favoriteColor: data.favoriteColor,
    }
  },
}
```

In the above case, an object with just those two values will be available to the template and style. None of the other page data will be passed at all. You could also provide your own data.

Because this function is run for each component instance on every page across the site, it is _not_ recommended to pull data using queries here. It will become extremely expensive and time-consuming to do so. Instead, this function is simply meant for data transformation. Components are not responsible for sourcing their own data, that is the job of `data/build.js`.

# Public Data

Only strings (and number strings) can be passed to components via their attributes. However, you may wish more complex data to be available in the browser. To allow this, you may use the `publicData` option.

If you set `publicData` as an array of strings, those values will be available from the data passed to the page. For example:

```js
// build.js
let data = {
  theme: {
    color: 'white',
    backgroundColor: 'blue',
  },
  secretApiKey: 'af142c-341v3-2bf76-fb87f'
}

module.exports = {
  files: [
    src: {'public', data}
  ]
}
```

```js
// person-component/component.js
module.exports = {
  template: 'template.pug',
  style: 'stylus.styl',
  script: 'script.js',
  props: {
    name: { default: null },
    favoriteColor: { default: 'black' },
  },
  publicData: ['theme']
}
```

```js
// person-component/script.js
console.log(publicData.theme.color)
```

This public data is set on the page. Note that this is _sent to the browser_, meaning you should not put secret data here, or pass the entire `data` object for the page, only what is needed on the frontend.

You may instead provide a function that returns an object to be set as publicData. For example:

```js
// person-component/component.js
module.exports = {
  template: 'template.pug',
  style: 'stylus.styl',
  script: 'script.js',
  props: {
    name: { default: null },
    favoriteColor: { default: 'black' },
  },
  publicData: async data => {
    return {
      theme: data.theme,
    }
  })
}
```

This publicData is set for each component type on the page and does not account for individual attributes, and does not run through the component's `data` function (as that is run per component instance).

The `publicData` object is available within the script.js file for convenience (the script.js is wrapped in a scope that has this local variable set). You may also access the publicData for the component (or any other component). For instance: `console.log(window.smolPublicData.personComponent.theme.color)`. Each component's name is converted to camelCase and stored within `window.smolPublicData`.

# Tags

While it may be tempting to use `import` and `require` statements for large libraries, it is important to note that each component that requires them will need to have that library rolled up with it, increasing the size of each page's javascript payload. Instead, you should utilize public cdns. For example, rather than using `npm i --save moment` and `import moment from 'moment'`, just use the public cdn at `https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.27.0/moment.min.js`.

But of course you would need to put this in your main `include/pug/page.pug` template and have it load every page, even for pages that don't need moment. Instead, you should set it as a tag:

```js
// person-component/component.js
module.exports = {
  template: 'template.pug',
  style: 'stylus.styl',
  script: 'script.js',
  tags: [
    {tag: 'script', attributes: {src: '//cdnjs.cloudflare.com/ajax/libs/moment.js/2.27.0/moment.min.js'}},
  ],
}
```

This will automatically add this tag to the `<body>` of the page right before the page's component js is loaded, so it will be available. You can use this for external dependencies, or even load dependencies from your own site. This is also not limited to script. Any css, meta tags, links, etc. can be added to their appropriate places (`<link rel="stylesheet">` will be put in the head for example).

Any duplicate scripts will be added only once, so if you have 3 components with the same dependency, it will not be placed on the script 3 times, even if multiple component types have that same dependency.

It is common to use development versions of scripts that show errors when developing and then use minified production versions of scripts when in production. For this, you can conditionally add these tags:

```js
module.exports = {
  template: 'template.pug',
  style: 'stylus.styl',
  script: 'script.js',
  tags: [
    {tag: 'script', mode: 'development', attributes: {src: '//cdn.jsdelivr.net/npm/vue/dist/vue.js'}},
    {tag: 'script', mode: 'production', attributes: {src: '//cdn.jsdelivr.net/npm/vue'}},
  ],
}
```

For more complicated conditional tag inclusion, simply do your checks before `module.exports` and conditionally include the tags you want using `tags.push()`. If no `mode` is specified, the tag will always be added.
