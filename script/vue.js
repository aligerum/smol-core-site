import BaseComponent from '$baseComponentPath'

let originalElement = document.querySelector('$componentName[data-smol-id-$componentId]')
let attributes = {}
for (let attr of originalElement.attributes) attributes[attr.name.split('-').map((segment, index) => index ? `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}` : segment).join('')] = attr.value

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
  template: '<base-component v-bind="attributes" ref="baseComponent"></base-component>',
})
