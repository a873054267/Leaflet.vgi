# 简介

> 使用leaflet在地图上进行标线，主要功能包含：  
>>1、使用鼠标标绘线  
>>2、提供经纬度数组自动绘制线  
>>3、标绘完成的线会包含标绘时的箭头方向  
>>4、可以通过拖拽节点调整线的位置，拖拽到指定节点可以实现节点合并  
>>5、鼠标位置如果在线的附近，会自动移动到线上  
>>[Demo](https://wlfei0502.github.io/Leaflet.vgi/)

# 需要引入的js
> 标线使用两个js文件(es6编写):  
>>1、src/components/Nav/DrawLine/DrawTools.js，包含了绘制线所需要的一些工具函数  
>>2、src/components/Nav/DrawLine/DrawLine.js，绘制线的主函数，在它内部已经导入了DrawTools.js  
例子可以参照：  
src/components/Nav/DrawLine/Line.vue

# 项目运行
``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8081
npm run dev
