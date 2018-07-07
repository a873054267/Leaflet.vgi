<template>
  <div id="map"></div>
</template>

<script>
  import 'leaflet/dist/leaflet.css'
  export default {
    name: 'Map',
    mounted () {
      this.init();
    },
    methods: {
      init: function () {
        L.TileLayer.TdtLayer = L.TileLayer.extend({
          getTileUrl (pt) {
            let url = 'http://t0.tianditu.gov.cn/DataServer?T=img_w&x=' + pt.x + '&y=' + pt.y + '&l=' + pt.z;
            return url;
          }
        });

        let map = L.tdtMap = L.map('map', {
          center:L.latLng(39.90, 116.36),
          zoom:17,
          worldCopyJump: true,
          minZoom:1,
          maxZoom:18,
          maxBounds: L.latLngBounds(L.latLng(-90, -360), L.latLng(90, 360)),
          attributionControl: false,
          zoomControl:false,
          doubleClickZoom:false,
        });

        let layer = new L.TileLayer.TdtLayer();
        map.addLayer(layer);
        this.$emit('initMap', map);
      }
    }
  }
</script>

<style>
  #map {
    width: 100%;
    height: 100%;
  }
</style>
