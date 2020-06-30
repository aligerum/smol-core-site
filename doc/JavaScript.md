# JavaScript

Javascript files are transpiled to cs5 for browser compatibility via babel and minified. Webpack is used to handle dependencies. Vue components are supported.

`templateData` cannot be passed to javascript files via `data/build`. Instead, each js file is responsible for loading its own required data using `require` or `import` directives.
