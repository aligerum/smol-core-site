# Stylus

Stylus files are compiled to static css. Any `data` provided by `data/build` is passed in as global data. For example:

```js
// build.js
let data = {
  fontFamily: 'sans-serif',
  theme: {
    backgroundColor: 'blue',
    color: 'white',
  },
}

module.exports = {
  options: [
    {src: 'app.styl', data},
  ],
}
```

```stylus
// app.styl
body
  font-family fontFamily
  background theme['backgroundColor']
  color theme['color']
```

Will produce:

```css
body{font-family:sans-serif;background-color:#00f;color:#fff}
```

# Templates

Common stylus templates are stored in `core/<coreName>/stylus`. This is set as the base path for `@import` and `@require` statements. You can also store static css within `core/<coreName>/stylus` to be imported/required.

To require `core/mySite/stylus/test.styl` for instance, you can write:

```stylus
@require 'test'
```

`@require` and `@import` statements also work with `.css` files.
