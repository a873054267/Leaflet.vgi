<template>
  <div id="app">
    <Map @initMap="initMap"/>
    <Nav v-if="show"/>
  </div>
</template>
<script>
import Map from './components/Map/Map'
import Nav from './components/Nav/Nav'

export default {
  name: 'App',
  components: {
    Map,
    Nav
  },
  data () {
    return {
      show:false,
    }
  },
  methods:{
    initMap (map) {
      this.show = true;
    }
  }
}
</script>

<style lang="less">
  *{
    padding:0px;
    margin:0px;
    box-sizing:border-box;
    outline: none;
  }

  html, body, #app{
    width: 100%;
    height: 100%;
    overflow:hidden;
  }

  #app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    position: relative;
  }
</style>
