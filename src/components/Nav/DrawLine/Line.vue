<template>
  <div class="d-item" @click="beginDraw">标线</div>
</template>
<script>
  import Line from './DrawLine'

  export default {
    props:{
      open:{
        type:Boolean,
        default:false
      }
    },
    mounted () {
      let map = L.tdtMap;
      // 测试数据
      let latLng1 = L.latLng(39.899994,116.359);
      let latLng2 = L.latLng(39.898983,116.36043);
      let latLng3 = L.latLng(39.90004,116.35799);
      let latLng4 = L.latLng(39.90259,116.3514);

      let latLng5 = L.latLng(39.905132, 116.349815);
      let latLng6 = L.latLng(39.900948, 116.35805);
      let latLng7 = L.latLng(39.90004, 116.35799);
      let latLng8 = L.latLng(39.90447, 116.35134);
      this.polyline = new Line.PolyLine(map, {
        latLngs:[
          [latLng1,latLng2,latLng3,latLng4],
          [latLng5,latLng6,latLng7,latLng8]
        ]
      });
    },
    methods:{
      beginDraw () {
        // 处在绘制状态
        if (this.open) {
          return;
        }
        // 改变父组件open的状态为开放
        this.$emit('beginDraw', true);
        let self = this;
        this.polyline.drawNewLine({
          callback () {
            self.$emit('beginDraw', false);
          }
        });
      }
    }
  }
</script>
