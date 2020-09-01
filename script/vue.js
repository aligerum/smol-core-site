import BaseComponent from '$baseComponentPath'

let originalElement = document.querySelector('$componentName[data-smol-id-$componentId]')
let attributes = {}
for (let attr of Object.values(originalElement.attributes)) attributes[attr.name.split('-').map((segment, index) => index ? `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}` : segment).join('')] = attr.value
let ref = attributes.ref
delete(attributes.ref)

Vue.config.productionTip = false
Vue.config.devtools = false

new Vue({
  components: {
    BaseComponent,
  },
  el: originalElement,
  data() {
    return {attributes}
  },
  mounted() {
    if (!window.smolComponents) window.smolComponents = {}
    if (ref) window.smolComponents[ref] = this.$refs.baseComponent
  },
  template: '<base-component v-bind="attributes" ref="baseComponent"></base-component>',
})
