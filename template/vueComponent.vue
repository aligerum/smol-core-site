<template lang="pug">
.componentName
</template>

<style lang="stylus" scoped>
// .componentName
</style>

<script>
export default {
  components: {
  },
  data() {
    return {
      publicData: window.smolPublicData && window.smolPublicData.camelCaseComponentName ? window.smolPublicData.camelCaseComponentName : {},
    }
  },
  async mounted() {
  },
  methods: {
  },
  props: {
  },
  watch: {
  },
}
</script>
