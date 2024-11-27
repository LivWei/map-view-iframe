<template>
  <div id="app">
    <baseMap></baseMap>
  </div>
</template>

<script>
import baseMap from './components/map'
export default {
  name: 'App',
  components: {
    baseMap
  }
}
</script>

<style lang="less">
html, body, #app, #map {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
}
</style>
