<template>
  <!--<div class="d-item" >-->
  <div class="d-item" @click="beginDraw">
    <a href="javascript:void(0)">
      <span class="draw-icon line-icon"></span>
      <span class="draw-text">线</span>
    </a>
  </div>
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
      let latLng1 = L.latLng(39.899994,116.359);
      let latLng2 = L.latLng(39.898983,116.36043);
      let latLng3 = L.latLng(39.90004,116.35799);
      let latLng4 = L.latLng(39.90259,116.3514);

      let latLng5 = L.latLng(39.905132, 116.349815);
      let latLng6 = L.latLng(39.900948, 116.35805);
      let latLng7 = L.latLng(39.90004, 116.35799);
      let latLng8 = L.latLng(39.90447, 116.35134);
      let self = this;
      this.polyline = new Line.PolyLine(map, {
        /**
         * 叠加已存在的线
         * */
        lineDatas:[
          {
            id:0,
            latLngs:[latLng1,latLng2,latLng3,latLng4]
          },
          {
            id:1,
            latLngs:[latLng5,latLng6,latLng7,latLng8]
          }
        ],
        /**
         * 线拖拽完成的回调函数
         * @param lineDatas
         */
        lineDrag (lineDatas) {
          // 返回的线中可能会包含未保存的线，需要注意
          console.log('lineDrag:', lineDatas);
        },
        /**
         * 线变化的回调函数：比如：绘制完成、点击线、添加点、删除点
         * @param lineData
         * @param lineIdBindFn 标线保存之后需要调用的回调函数，参数为该标线的ID
         */
        lineClick (lineData) {
          console.log('lineChange:', lineData);
        },
        /**
         * 线绘制完成的回调函数
         * @param lineData
         * @param lineIdBindFn 标线保存之后需要调用的回调函数，参数为该标线的ID
         */
        lineDrawEnd (lineData, lineIdBindFn) {
          // eg: lineIdBindFn(lineId);
          self.$emit('beginDraw', false);
        },
        /**
         * 线绘制完成的回调函数
         * @param lineId 线ID
         */
        lineRemove (lineId) {
          // eg: lineIdBindFn(lineId);
          console.log('线删除', lineId)
        },
        /**
         * 线添加点
         */
        lineAddPoint (lineData) {
          console.log('点增加', lineData)
        },
        /**
         * 线删除点
         */
        lineDeletePoint (lineData) {
          console.log('点删除', lineData)
        },
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
        // 开始标绘
        this.polyline.drawNewLine();
        //  移除指定ID的线
        // this.polyline.remove(lineId);
      }
    }
  }
</script>
<style lang="less">
  #contextMenu{
    position:absolute;
    z-index:500;
    ul li {
      padding:10px 20px;
      font-size: 13px;
      background: #ffffff;
      &:hover{
        background: #f2f2f2;
        cursor:pointer;
      }
      &:first-child{
        border-top-left-radius: 3px;
        border-top-right-radius: 3px;
      }
      &:last-child{
        border-bottom-left-radius: 3px;
        border-bottom-right-radius: 3px;
      }
      &:nth-child(odd){
        border-bottom: 1px solid #f2f2f2;
      }
    }
  }
</style>
