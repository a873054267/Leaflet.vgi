<template>
    <div class="drawNav">
      <DrawLine :open="open" @beginDraw="beginDraw"></DrawLine>
    </div>
</template>
<script>
import DrawLine from './DrawLine/Line'
export default {
    components:{
        DrawLine,
    },
    data(){
        return{
          open:false
        }
    },
    methods:{
      beginDraw (open) {
        this.open = open;
      }
    }
}
</script>
<style lang='less'>
    .drawNav{
        position: absolute;
        padding:10px 15px;
        background: #fff;
        box-shadow: 2px 2px 4px #cccccc;
        z-index: 999;
        font-size: 14px;
        top: 20px;
        left: 20px;
        border-radius: 2px;
        &:hover {
          background: #f2f2f2;
          cursor:pointer;
        }
    }
</style>


