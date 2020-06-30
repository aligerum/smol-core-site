# Vue Components

> A good understanding of the Components doc and Vue.js is required to continue.

Vue compilation is provided by default. While most components benefit from being baked into the static pages, for more complex functionality and reactivity, the use of a frontend framework like Vue is required.

In order to make a Vue component, you can use `smol make <coreName> vueComponent <componentName>`. This works similarly to regular components with the `script` option pointing to the root `.vue` file. The `template` and `style` options are not compiled. Those features are instead provided within the component's `.vue` file itself. The `data` function is also not used. All other `component.js` options work.

During build, `id` tags are generated for each vue component on the page and the Vue component is mounted to its unique id.

# Enhanced Vue Functionality

Typically, root Vue components are not able to access `props` or have slots. Vue components within `smol` are automatically wrapped within a parent component to allow for this functionality to work.

If you commonly store data and methods at `$root`, you will need to access `$root.$refs.baseComponent` instead.

# Static Slots

Slots work as usual within the Vue component, but you also have access to static slots (see Static Slots within the Components doc). This provides a very powerful way to access data within the Vue component within the page's template.

Consider the following example:

```vue
import axios from 'axios'

<template lang="pug">
.some-component
  slot(name="top" static)
  div Some content
  div(v-for="person in people")
    slot(name="people" static)
</template>

<script>
export default {
  data() {
    return {
      userName: null,
      people: [
        {name: }
      ],
    }
  }
  async mounted() {
    let response = await axios.get('https://example.com/api/user')
    this.userName = response.data.user.name
  },
}
</script>
```

```pug
extends /page

block body
  some-component
    template(slot="top")
      div(v-if="userName") The logged in user is {{ userName }}
    template(slot="people")
      div {{ person.name }}
```

At build time, the static content from the page actually replaces the static slots within the vue template. This means you can use vue directives such as `v-if` and access data within the vue component using `{{ }}`, even within loops (as shown above).

Note that since the data replaces the content in the vue template, you also have access to all data within the static site's data, so you can use both, of course the static data is determined at build time and is thus, not reactive:

```pug
extends /page

block body
  some-component
    template(slot="top")
      div(v-if="userName") The logged in user is {{ userName }} and the app name is #{ appName }
```

Because it is not readily apparent what data is available within each component/slot, it is vital that you provide proper documentation and examples for static vue components.

Normal slots work as usual. Only slots with the `static` attribute will be replaced in this way at build time.

# Normal Vue Components

Normal Vue Components work as usual, just place them anywhere within the component's directory, within `core/<coreName>/include/vue`, or from an npm package that provides common Vue components (see Components doc for information about import/require aliases).

```vue
<template lang="pug">
.componentName
  some-sub-component
  another-component
  third-component
  fourth-component
</template>

<style lang="stylus" scoped>
// .componentName
</style>

<script>
import SomeSubComponent from './SomeSubComponent.vue'
import AnotherComponent from 'include/AnotherComponent.vue
import { ThirdComponent, FourthComponent } from 'my-vue-package'

export default {
  components: {
    SomeSubComponent,
    AnotherComponent,
    ThirdComponent,
    FourthComponent,
  },
  data() {
    return {
    }
  },
  mounted() {
  },
  methods: {
  },
  props: {
  },
  watch: {
  },
}
</script>
```

You can make new normal vue components by using `smol make <siteCore> vue <path>`. For example:

```
$ smol make mySite vue my-vue-component/SomeSubComponent
Created core/mySite/component/my-vue-component/SomeSubComponent.vue
```

# Static Components

You cannot use static components within Vue components.
