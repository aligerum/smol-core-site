# Pug

Pug files are compiled into static html. `templateData` defined in `data/build` is passed in as available data.

Common pug templates are stored in `core/<coreName>/pug`. This is set as the base path for `extends` and `include` parameters. For example:

```pug
doctype html
html
  head
    title #{appName}
  body
    include /header
```

This would include the `core/<coreName>/pug/header.pug` template.

```pug
extends /page

block head
  link(rel="stylesheet" href="/style/app.css")

block body
  div Some body content.
```

This would extend the `core/<coreName>/pug/page.pug` template.

Note that any include/extends not starting with `/` are still resolved relative to the calling file's path.
