import DrawTools from './DrawTools'

// 事件对象,处理自定义事件, 实现类之间的解耦
let evtMgr = new L.Evented();

// map 对象
let map;
// 唯一ID，用来标识图形
let lastId = 0;
// 拖拽移动线缓存
let cacheDragLines = [];
// 缓存被插入新的经纬度的线
let cacheInsertLines = [];

// 常用样式配置
const CONFIG = {
  // 圆半径缓冲常量，用来判断某一点是否在另一个点的范围内
  circleBuffer:14,
  // 线宽度缓冲常量，用来判断某一点是否在线的缓冲区内
  lineBuffer:9,
  // 端点
  end:{
    backStyle:{
      radius: 9,
      fillColor: '#E20100',
    },
    frontStyle:{
      radius: 6,
      fillColor: '#FFFFFF',
      color: '#3388ff',
    }
  },
  // 中间节点
  middle:{
    backStyle:{
      radius: 7,
      fillColor: '#E20100',
    },
    frontStyle:{
      radius: 4,
      fillColor: '#FFFFFF',
      color: '#3388ff',
    }
  },
  // 连接点
  link:{
    backStyle:{
      radius: 8
    },
    frontStyle:{
      fillColor: '#fffd0c',
      color: '#000000',
      radius: 5
    }
  },
  // 动画效果配置: beforeStyle->动画前的样式  afterStyle-> 动画后样式  defaultStyle-> 没有动画的默认样式
  animation:{
    circle:{
      beforeStyle:{
        radius: 10,
        fillOpacity: 0.5
      },
      afterStyle:{
        radius: 14,
        fillOpacity: 0.8
      },
      defaultStyle:{
        radius: 9,
        fillOpacity: 0
      }
    },
    line:{
      beforeStyle:{
        weight: 14,
        opacity:0.5
      },
      afterStyle:{
        weight: 19,
        opacity: 0.8
      },
      defaultStyle:{
        opacity: 0
      }
    }
  },
  // 三角形箭头样式
  triangle:{
    color: '#4e4e4e',
    weight: 1,
    fillColor: '#fff',
    fillOpacity: 0.8,
    pane: 'markerPane'
  }
}

/**
 * 工具类
 * @type {{latLngsToPoints(*): *}}
 */
let Util = {
  /**
   * 经纬度数组转成像素数组
   * @param latLngs
   * @return {Array}
   */
  latLngsToPoints (latLngs) {
    let points = [];
    for (let latLng of latLngs) {
      let point = map.latLngToContainerPoint(latLng);
      points.push(point);
    }
    return points;
  }
}

/**
 * 动画类
 * @type {{}}
 */
let Animation = {
  /**
   * 动画闪烁特效
   * @type 代表当前图形类型：圆或者线
   * @evt 代表触发动画的动作：点击线或者绘制完成
   */
  twinkle (type, evt) {
    // 触发onceClick，取消上一次动画
    map.fire('click');
    this.toggle = false;
    let self = this;
    // 样式配置
    this.setAnimationBeforeStyle ();
    this.intervalTimer = setInterval(() => {
      if(self.toggle){
        this.setAnimationBeforeStyle ();
      } else {
        this.setAnimationAfterStyle();
      }
      self.toggle = !self.toggle;
    }, 1000);
    // 暂时清除悬浮事件
    this.hoverEventOff();
    // 点击地图，取消闪烁效果
    map.once('click', this.cancelTwinkle.bind(this));
    // 添加三角形
    if (type == 'line'){
      this.attach.drawTriangles();
      // 代表点击事件
      if (evt) {
        // 回传当前点击线的数据（id和经纬度）
        evtMgr.fire('on-lineClick', {
          params:{
            attach:self.attach
          }
        });
      }
    }
  },
  /**
   * 取消闪烁
   */
  cancelTwinkle () {
    if (!this.intervalTimer){
      return;
    }
    // 清除定时器
    clearInterval(this.intervalTimer);
    this.intervalTimer = null;
    // 设置成默认样式
    this.setAnimationDefaultStyle();
    // 恢复悬浮事件
    this.hoverEventRegister();
    // 移除三角形
    if (this.attach && this.attach.triangles) {
      this.attach.triangles.remove();
      this.attach.triangles.cancelZoom();
    }
  }
}

/**
 * 图形类：圆组合和线组合
 */
let Shape = {
  initialize (options) {
    // 每个图形赋予一个唯一ID
    this.id = ++lastId;
    // 背景样式
    L.extend(this.backStyle, options.backStyle);
    // 前景样式
    L.extend(this.frontStyle, options.frontStyle);
    // 构造图形的函数
    let shapeFn = options.shapeFn;
    // 图形坐标
    let shapeCoors = options.shapeCoors;
    // 背景图形
    this.back = shapeFn(shapeCoors, this.backStyle);
    map.addLayer(this.back);
    // 前景图形
    this.front = shapeFn(shapeCoors, this.frontStyle);
    map.addLayer(this.front);
    // 图形所依附的编辑线实例，根据该实例可以找到线和圆数组
    this.attach = options.attach;
    // 事件监听
    this.initEventParent();
  },
  /**
   * 自定义事件监听
   */
  initEventParent () {
    // 恢复图形点击事件监听
    evtMgr.on('on-restoreClickEvent', this.clickEventRegister.bind(this));
  },
  /**
   * 图形事件，点击，悬浮
   */
  eventRegister () {
    this.clickEventRegister ();
    this.hoverEventRegister ();
    this.contextMenuEventRegister();
  },
  /**
   * 事件注册
   */
  clickEventRegister () {
    let type = this.getShapeType ();
    this.twinkleBindFn = this.twinkle.bind(this, type);
    this.back.off('click').on('click', this.twinkleBindFn);
    this.front.off('click').on('click', this.twinkleBindFn);
  },
  /**
   * 悬浮高亮事件
   */
  hoverEventRegister () {
    let self = this;
    this.back.on('mouseover', () => {
      self.hover();
    }).on('mouseout', () => {
      self.out();
    });
    this.front.on('mouseover', () => {
      self.hover();
    }).on('mouseout', () => {
      self.out();
    });
  },
  /**
   * 右键菜单
   */
  contextMenuEventRegister () {
    this.contextmenuBindFn = this.contextmenuHandler.bind(this);
    this.back.on('contextmenu', this.contextmenuBindFn);
    this.front.on('contextmenu', this.contextmenuBindFn);
  },
  /**
   * 右键菜单事件处理
   */
  contextmenuHandler (evt) {
    let point = evt.containerPoint;
    let latLng = evt.latlng;
    let contextMenu = document.getElementById('contextMenu');
    let addPoint, deletePoint;
    // 右键菜单DOM不存在，进行创建
    if (!contextMenu) {
      contextMenu = document.createElement('div');
      contextMenu.id = 'contextMenu';
      document.body.appendChild(contextMenu);
    }
    this.contextmenu(contextMenu, latLng);
    contextMenu.style.display = 'block';
    contextMenu.style.left = point.x + 10 + 'px';
    contextMenu.style.top = point.y + 10 + 'px';
    map.once('click', () => {
      contextMenu.style.display = 'none';
    });
  },
  /**
   * 取消鼠标滑过事件
   */
  hoverEventOff () {
    this.back.off('mouseover').off('mouseout');
    this.front.off('mouseover').off('mouseout');
  },
  /**
   * 获取图形类型
   */
  getShapeType () {
    let type = 'line';
    if (this instanceof CirclePair){
      type = 'circle';
    }
    return type;
  },
  /**
   * 设置动画前样式
   */
  setAnimationBeforeStyle () {
    let type = this.getShapeType ();
    // 样式配置
    let style = CONFIG.animation[type];
    let {beforeStyle} = style;
    // 设置动画闪烁后的样式
    this.back.setStyle(beforeStyle);
    if (type == 'circle')
      this.back.setRadius(beforeStyle.radius);
  },
  /**
   * 设置动画后样式
   */
  setAnimationAfterStyle () {
    let type = this.getShapeType ();
    // 样式配置
    let style = CONFIG.animation[type];
    let {afterStyle} = style;
    // 设置动画闪烁后的样式
    this.back.setStyle(afterStyle);
    if (type == 'circle')
      this.back.setRadius(afterStyle.radius);
  },
  /**
   * 恢复样式
   */
  setAnimationDefaultStyle () {
    let type = this.getShapeType ();
    // 样式配置
    let style = CONFIG.animation[type];
    let {defaultStyle} = style;
    // 设置动画闪烁后的样式
    this.back.setStyle(defaultStyle);
    if (type == 'circle')
      this.back.setRadius(defaultStyle.radius);
  },
  /**
   * 事件取消
   */
  cancelClickEvent () {
    this.back.off('click');
    this.front.off('click');
  },
  /**
   * 图形移除
   */
  remove () {
    this.attach = null;
    map.removeLayer(this.back);
    map.removeLayer(this.front);
  },
  /**
   * 图形移动,子类实现
   */
  move () {},
  /**
   * 图形设置样式，子类实现
   */
  setStyle () {},
};

/**
 * 圆类
 *由前景圆和背景圆组成，前景圆负责展示，背景圆负责动画特效
 */
let Circles = {
  // 背景圆样式
  backStyle:{
    ...CONFIG.end.backStyle,
    stroke: false,
    fillOpacity: 0,
    bubblingMouseEvents:false
  },
  // 前景圆样式
  frontStyle:{
    ...CONFIG.end.frontStyle,
    fillOpacity: 1,
    weight: 1,
    bubblingMouseEvents:false
  },
  /**
   * 初始化，创建大圆和小圆图形
   * @param options
   */
  initialize (options) {
    // 圆的位置：经纬度
    this.latLng = options.latLng;
    // 圆类型：端点->end，中间节点->middle，连接点->link
    this.type = options.type;
    // 图形构造函数
    options.shapeFn =  L.circleMarker;
    // 图形坐标
    options.shapeCoors =  this.latLng;
    // 调用父类的构造函数
    Shape.initialize.call(this, options);
  },
  /**
   * 右键菜单
   */
  contextmenu (cm) {
    cm.innerHTML = '<ul><li id="deletePoint">删除点</li></ul>';
    let deletePoint = document.getElementById('deletePoint');
    let self = this;
    deletePoint.addEventListener('click', function () {
      evtMgr.fire('on-lineDeletePoint', {
        params:{
          latLng:self.latLng
        }
      });
      cm.style.display = 'none';
    });
  },
  /**
   * 事件监听
   */
  eventRegister () {
    Shape.eventRegister.call(this);
    this.dragEventRegister();
  },
  /**
   * 拖拽事件监听
   */
  dragEventRegister () {
    this.mouseDownFn = this.mouseDown.bind(this);
    this.back.on('mousedown', this.mouseDownFn);
    this.front.on('mousedown', this.mouseDownFn);
  },
  /**
   * 鼠标按下，开始拖拽
   */
  mouseDown (evt) {
    map.dragging.disable();
    // 判断点是否被拖拽的标识
    this.dragging = false;
    // 存储初始位置
    this.initPoint = evt.containerPoint;
    map.fire('click');
    let latLng = this.latLng;
    // 移动点图层移至最上层，防止被其他图层压盖
    this.front.bringToFront();
    // 通知所有需要移动的线记录当前经纬度所对应的索引
    evtMgr.fire('on-getMoveIndexes', {
      params:{
        latLng
      }
    });
    this.mousemoveFn = this.mouseMove.bind(this);
    map.on('mousemove', this.mousemoveFn);
    this.mouseupFn = this.mouseUp.bind(this);
    map.on('mouseup', this.mouseupFn);
  },
  /**
   * 鼠标拖拽移动中
   */
  mouseMove (evt) {
    this.dragging = true;
    let latLng = evt.latlng;
    let self = this;
    // 目标线
    this.targetLine = null;
    // 是否在线的缓冲区内
    evtMgr.fire('on-isLatLngInBuffer', {
      params:{
        latLng,
        callback: (closetLatLng, line) => {
          latLng = closetLatLng;
          self.targetLine = line;
        }
      }
    });
    // 移动距离过小不发生移动
    let movePoint = map.latLngToContainerPoint(latLng);
    let inBounds = DrawTools.isInBounds(movePoint, this.initPoint, CONFIG.circleBuffer);
    if (inBounds){
      return;
    }
    // 移动圆
    this.move(latLng);
    // 移动所有关联线
    evtMgr.fire('on-lineMoveByLatLng', {
      params:{
        latLng
      }
    });
  },
  /**
   * 鼠标拖拽停止
   */
  mouseUp () {
    map.off('mousemove', this.mousemoveFn);
    map.off('mouseup', this.mouseupFn);
    // 所有移动线的索引数组归为初始值[]
    evtMgr.fire('on-restoreMoveIndexes');
    // 对已存在的圆需要融合成一个圆
    this.sameCirclesToMerge();
    // 判断点是否被拖拽的标识
    if (this.dragging){
      this.dragging = false;
      // 调用回调函数
      evtMgr.fire('on-lineDrag');
    }

    // 恢复地图拖动事件
    map.dragging.enable();
  },
  /**
   * 同一位置的圆需要合并为一个
   */
  sameCirclesToMerge () {
    let moveCircle = this, type;
    let existCircle = this.getCirclesInfo(moveCircle);
    // 其他位置存在圆
    if (existCircle){
      // 目标圆跟当前移动的圆是同一条线，将移动圆和已存在的圆删除，重新绘制圆，防止压盖
      this.circlesMerge(moveCircle, existCircle, 'link');
    } else if (this.targetLine){
      this.circleLineMerge (moveCircle);
    }
  },
  /**
   * 获取目标圆
   * @param moveCircle
   * @return {{existCircle: *, existLine: *, moveLine: *}}
   */
  getCirclesInfo (moveCircle) {
    let latLng = moveCircle.latLng;
    let existCircle;
    evtMgr.fire('on-isExistCircle', {
      params:{
        latLng,
        callback (circles) {
          if(!existCircle){
            // 对目标圆和与之对应的线进行存储
            existCircle = circles.find( circle => {
              return moveCircle.id != circle.id;
            });
          }
        }
      }
    });
    return existCircle;
  },
  /**
   * 两个圆相遇之后进行合并
   * @param moveCircle
   * @param targetCircle
   * @param type
   * @return {*}
   */
  circlesMerge (moveCircle, targetCircle, type) {
    let latLng = moveCircle.latLng;
    let lineId = targetCircle.attach.line.id;
    // 删除移动线上的圆
    evtMgr.fire('on-removeExistCircle',{
      params:{
        circle:moveCircle
      }
    });
    // 删除目标线的圆
    evtMgr.fire('on-removeExistCircle',{
      params:{
        circle:targetCircle
      }
    });
    // 创建新圆
    evtMgr.fire("on-insertCircle", {
      params:{
        type,
        latLng,
        lineId
      }
    });
  },
  /**
   * 圆落在了线上
   * @param moveCircle
   */
  circleLineMerge (moveCircle) {
    // 移动中的点落在了线上
    let latLng = moveCircle.latLng,
        type = '';
    let lineId = this.targetLine.id;
    let moveLineId = moveCircle.attach.line.id;
    // 圆的类型
    if (lineId === moveLineId) {
      type = 'middle';
    } else {
      type = 'link';
    }
    // 移除已有的圆
    evtMgr.fire('on-removeExistCircle',{
      params:{
        circle:moveCircle
      }
    });
    // 插入经纬度，新建圆
    evtMgr.fire("on-insertLatLng", {
      params:{
        latLng
      }
    });
    // 新建圆
    evtMgr.fire("on-insertCircle", {
      params:{
        type,
        latLng,
        lineId
      }
    });
  },
  /**
   * 大圆和小圆同时移动
   * @param latLng
   */
  move (latLng) {
    this.back.setLatLng(latLng);
    this.front.setLatLng(latLng);
    this.latLng = latLng;
  },
  setStyle (style) {
    let {backStyle, frontStyle} = style;
    this.back.setStyle(backStyle);
    this.front.setStyle(frontStyle);
    this.back.setRadius(backStyle.radius);
    this.front.setRadius(frontStyle.radius);
  },
  /**
   * 悬浮
   */
  hover () {
    let style = CONFIG.animation.circle.afterStyle;
    this.back.setStyle(style);
    this.back.setRadius(style.radius);
  },
  /**
   * 取消悬浮
   */
  out () {
    let style = CONFIG.animation.circle.defaultStyle;
    this.back.setStyle(style);
    this.back.setRadius(style.radius);
  },
  /**
   * 移除当前圆
   */
  remove () {
    // 经纬度为空
    this.latLng = null;
    // 调用父类的移除函数
    Shape.remove.call(this);
  }
}

/**
 * 线类
 * 由前景线和背景线组成，前景线负责展示，背景线负责动画特效
 */
let Lines = {
  // 背景线样式
  backStyle:{
    weight: 14,
    color: '#e2200b',
    opacity: 0,
    'stroke-linejoin': 'round',
    bubblingMouseEvents: false
  },
  // 前景线样式
  frontStyle:{
    weight: 3,
    color: '#ffffff',
    opacity: 1,
    bubblingMouseEvents: false
  },
  /**
   * 初始化，创建图形
   * @param options
   */
  initialize (options) {
    // 线的经纬度
    this.latLngs = options.latLngs;
    // 记录线被拖拽移动的点
    this.moveIndexes = [];
    // 插入的新点
    this.newInsertIdxes = [];
    // 图形构造函数
    options.shapeFn =  L.polyline;
    // 图形坐标
    options.shapeCoors =  this.latLngs;
    // 调用父类的构造函数
    Shape.initialize.call(this, options);
    // 初始化自定义事件
    this.initEvent();
  },
  /**
   * 初始事件
   */
  initEvent() {
    // 判断所给经纬度是否在缓冲区内,如果在，返回离该经纬度最近的线上的点
    evtMgr.on('on-isLatLngInBuffer', this.isLatLngInBuffer.bind(this));
    // 线动态插入经纬度
    evtMgr.on("on-insertLatLng", this.insertLatLng.bind(this));
    // 线上需要移动的经纬度所在的索引记录
    evtMgr.on("on-getMoveIndexes", this.getMoveIndexes.bind(this));
    // 线随着经纬度变化移动
    evtMgr.on('on-lineMoveByLatLng', this.lineMoveByLatLng.bind(this));
    // 索引数组恢复成默认值
    evtMgr.on('on-restoreMoveIndexes', this.restoreMoveIndexes.bind(this));
  },
  /**
   * 右键菜单
   */
  contextmenu (cm, latLng) {
    cm.innerHTML = '<ul><li id="addPoint">添加点</li><li id="deleteLine">删除线</li></ul>';
    let addPoint = document.getElementById('addPoint');
    let self = this;
    addPoint.addEventListener('click', function () {
      let latLng = this.getAttribute('data-latLng').split(',');
      latLng = L.latLng(Number(latLng[0]), Number(latLng[1]));
      self.addPointOnLine(latLng);
      evtMgr.fire('on-lineAddPoint', {
        params:{
          attach:self.attach
        }
      });
      cm.style.display = 'none';
    });
    let deleteLine = document.getElementById('deleteLine');
    deleteLine.addEventListener('click', function () {
      let lineId = this.getAttribute('data-lineId');
      evtMgr.fire('on-lineRemove', {
        params:{
          lineId
        }
      });
      cm.style.display = 'none';
    });
    addPoint.setAttribute('data-latLng', latLng.lat+','+latLng.lng);
    deleteLine.setAttribute('data-lineId', this.attach.lineId);
  },
  /**
   * 根据经纬度在线上添加点
   * @param latLng
   */
  addPointOnLine (latLng) {
    let closetPoint = this.getClosetPoint(latLng);
    let closetLatLng = map.containerPointToLatLng(closetPoint);
    // 添加圆点
    evtMgr.fire("on-insertCircle", {
      params:{
        latLng:closetLatLng,
        type:'middle',
        lineId:this.id
      }
    });
    // 添加经纬度到线上
    this.insertLatLng({
      params:{
        latLng:closetLatLng
      }
    });
    // 三角形如果是显示的，则重绘线上的三角形
    if (this.attach && this.attach.triangles) {
      this.attach.triangles.redraw(this.attach.line.latLngs);
    }
  },
  /**
   * 返回离所给经纬度最近的线上的点
   */
  isLatLngInBuffer (args) {
    let {latLng, callback} = args.params;
    let closetPoint = this.getClosetPoint(latLng);
    if (closetPoint) {
      let closetLatLng = map.containerPointToLatLng(closetPoint);
      callback(closetLatLng, this);
    }
  },
  /**
   * 线上插入经纬度
   * @param args
   */
  insertLatLng (args) {
    let {latLng} = args.params;
    let latLngs = this.latLngs;
    let point =  map.latLngToContainerPoint(latLng);
    for (let l = 0, len = latLngs.length; l < len; l++){
      let next = l + 1;
      if (next < len) {
        let start =  map.latLngToContainerPoint(latLngs[l]);
        let end =  map.latLngToContainerPoint(latLngs[next]);
        // 排除端点的情况
        if ((point.x === start.x && point.y === start.y)
          || (point.x === end.x && point.y === end.y)){
          continue;
        }
        // 线段上的情况
        let distance = L.LineUtil.pointToSegmentDistance(point, start, end);
        if (distance < 1){
          // 记录新插入的经纬度，为回退操作做准备
          if (this.newInsertIdxes.length === 0){
            cacheInsertLines.push(this);
          }
          this.newInsertIdxes.push(next);
          latLngs.splice(next, 0, latLng);
          return true;
        }
      }
    }
  },
  /**
   * 线上需要移动的经纬度所在的索引记录
   * @param args
   */
  getMoveIndexes (args) {
    let {latLng} = args.params;
    this.moveIndexes = [];
    let movePoint = map.latLngToContainerPoint(latLng);
    let self = this;
    this.latLngs.forEach((value, index) => {
      let center = map.latLngToContainerPoint(value);
      if(DrawTools.isInBounds(movePoint, center, CONFIG.circleBuffer)){
        self.moveIndexes.push(index);
      }
    });
    // 当前线参与了拖拽
    if (this.moveIndexes.length > 0) {
      cacheDragLines.push(this);
    }
  },
  /**
   * 依靠经纬度移动线
   * @param args
   */
  lineMoveByLatLng (args) {
    let {latLng} = args.params;
    if (this.moveIndexes.length === 0){
      return;
    }
    // 多个线段连接在同一点
    for (let m in this.moveIndexes){
      let moveIndex = this.moveIndexes[m];
      this.latLngs[moveIndex] = latLng;
    }

    // 重绘
    this.redraw (this.latLngs);
  },
  /**
   * 移动索引数组恢复成默认
   */
  restoreMoveIndexes () {
    this.moveIndexes = [];
  },
  /**
   *获取离当前点最近的线上的点或者线上的端点
   * @param latLng
   */
  getClosetPoint (latLng) {
    // 判断点是否在线的缓冲区
    let point = map.latLngToContainerPoint(latLng);
    let points = Util.latLngsToPoints(this.latLngs);
    let len = points.length, closetPoint;
    for(let l = 0; l < len; l++) {
      let start = points[l];
      // 当前移动点除外
      if (!this.moveIndexes.includes(l)) {
        // 如果在端点的缓冲区内
        if(DrawTools.isInBounds(point, start, CONFIG.circleBuffer)){
          closetPoint = start;
          break;
        }
      }

      if (l + 1 === len) {
        break;
      }

      // 当前点以及与之相连的线段除外
      if (this.moveIndexes.includes(l) || this.moveIndexes.includes(l+1)){
        continue;
      }

      let end = points[l+1];

      let distance = L.LineUtil.pointToSegmentDistance(point, start, end);
      if (distance <= CONFIG.lineBuffer){
        closetPoint = L.LineUtil.closestPointOnSegment(point, start, end);
        break;
      }
    }
    return closetPoint;
  },
  /**
   * 线重绘
   * @param latLngs
   */
  redraw (latLngs) {
    this.back.setLatLngs(latLngs);
    this.front.setLatLngs(latLngs);
    this.latLngs = latLngs;
  },
  /**
   * 线动态的添加点
   * @param latLng
   */
  addLatLng (latLng) {
    this.redraw([...this.latLngs, latLng]);
  },
  /**
   * 背景线和前景线同时移动
   * @param latLng
   */
  move (latLng) {
    this.back.setLatLngs([...this.latLngs, latLng]);
    this.front.setLatLngs([...this.latLngs, latLng]);
  },
  /**
   * 悬浮效果
   */
  hover () {
    this.back.setStyle(CONFIG.animation.line.beforeStyle);
  },
  /**
   * 取消悬浮
   */
  out () {
    this.back.setStyle(CONFIG.animation.line.defaultStyle);
  },
  /**
   * 移除当前线
   */
  remove () {
    // 经纬度为空
    this.latLngs = [];
    //调用父类的移除函数
    Shape.remove.call(this);
  }
}

/**
 * 三角形箭头类
 * @type {{}}
 */
let Triangles = {
  initialize (latLngs) {
    this.latLngs = latLngs;
  },
  /**
   * 地图级别变化，线上的三角形需要重绘
   */
  redraw (latLngs) {
    this.cancelZoom ();
    // 利用绑定传递参数，同时也方便后期移除该事件
    this.redrawTrianglesBindFn = this.redraw.bind(this, this.latLngs);
    // 地图级别变化，需要重绘箭头
    map.on('zoomend', this.redrawTrianglesBindFn);
    if (latLngs)
      this.latLngs = latLngs;
    this.remove();
    this.addTriangles();
  },
  /**
   * 线上叠加三角形
   */
  addTriangles () {
    let start, end, triangles = [];
    // 添加三角形箭头
    let latLngs = this.latLngs;
    let points = Util.latLngsToPoints(latLngs);
    for (let l = 0; l < points.length; l++) {
      start = points[l];
      if (l != points.length - 1) {
        end = points[l + 1];
        let trianglePoints = DrawTools.getTrianglePoints(start, end, CONFIG.lineBuffer);
        let {top, right, left} = trianglePoints;
        // 坐标转成经纬度绘制多边形
        let topLatLng = map.containerPointToLatLng(top);
        let rightLatLng = map.containerPointToLatLng(right);
        let leftLatLng = map.containerPointToLatLng(left);
        let triangle = L.polygon([topLatLng, rightLatLng, leftLatLng], CONFIG.triangle);
        triangles.push(triangle);
      }
    }
    this.triangleLayerGroup = L.layerGroup(triangles);
    map.addLayer(this.triangleLayerGroup);
  },
  /**
   * 删除三角形
   */
  remove () {
    if (this.triangleLayerGroup) {
      map.removeLayer(this.triangleLayerGroup);
      this.triangleLayerGroup = null;
    }
  },
  cancelZoom () {
    // 取消地图缩放事件
    if (this.redrawTrianglesBindFn){
      map.off('zoomend', this.redrawTrianglesBindFn);
    }
  }
}

/**
 * 线圆的组合类
 * 由圆和线组成，圆代表节点，线代表路径
 */
let LineCircles = {
  /**
   * 线圆的构造函数
   * @param options
   */
  initialize (options){
    // 线实例
    this.line = null;
    // 圆实例数组
    this.circles = [];
    // 三角形实例
    this.triangles = null;
    // 自定义事件监听
    this.initEvent ();
  },
  /**
   * 事件初始化
   */
  initEvent () {
    // 取消图形的点击事件
    evtMgr.on('on-cancelClickEvent', this.cancelClickEvent.bind(this));
    // 监听当前位置是否已经叠加过圆
    evtMgr.on('on-isExistCircle', this.isExistCircle.bind(this));
    // 监听移除当前位置圆的事件
    evtMgr.on('on-removeExistCircle', this.removeExistCircle.bind(this));
    // 插入新圆
    evtMgr.on("on-insertCircle", this.insertCircle.bind(this));
  },
  /**
   * 取消图形的点击事件
   */
  cancelClickEvent () {
    // 线点击事件取消
    if (this.line){
      this.line.cancelClickEvent();
    }
    // 圆点击事件取消
    this.circles.forEach(circle => {
      circle.cancelClickEvent();
    });
  },
  /**
   * 是否当前绘制位置已经存在圆节点,本身点除外
   * @param args
   */
  isExistCircle (args) {
    let {latLng, callback} = args.params;
    let circles = this.circles.filter(value => {
      let center = map.latLngToContainerPoint(value.latLng);
      let movePoint = map.latLngToContainerPoint(latLng);
      return DrawTools.isInBounds(movePoint, center, CONFIG.circleBuffer);
    });
    callback(circles);
  },
  /**
   * 移除旧圆
   * @param args
   */
  removeExistCircle (args) {
    let {circle} = args.params;
    let circles = this.circles;
    let idx = circles.findIndex(value => {
      return circle.id == value.id;
    });
    if(idx > -1) {
      circles.splice(idx, 1);
      circle.remove();
    }
  },
  /**
   * 新建新圆
   * @param args
   */
  insertCircle (args) {
    let {latLng, type, lineId} = args.params;
    if (!this.line || this.line.id != lineId) {
      return;
    }
    let circle = new CirclePair({attach:this, type, latLng, ...CONFIG[type]});
    circle.eventRegister();
    this.circles.push(circle);
  },
  /**
   * 返回离所给经纬度最近的线上的点
   * @param latLng
   * @return {*}
   */
  getClosetLatLng (latLng) {
    this.broadcastToLines (latLng, (moveLatLng) => {
      latLng = moveLatLng;
    });
    return latLng;
  },
  /**
   * 根据当前点击位置是否跟最后一次点击的位置重复，判断是否完成了绘制
   * @param latLng
   */
  isFinished (latLng) {
    if (!this.line){
      return false;
    }
    let latLngs = this.line.latLngs;
    // 当前编辑线的最后一个点
    let lastLatLng = latLngs[latLngs.length - 1];
    // 当前点击的位置是最后一个点，完成此次线的编辑
    let center = map.latLngToContainerPoint(lastLatLng);
    let point = map.latLngToContainerPoint(latLng);
    if (DrawTools.isInBounds(point, center, CONFIG.circleBuffer)){
      return true;
    }
    return false;
  },
  /**
   * 绘制完成
   */
  drawCompleted () {
    // 1、绘制完成，事件注销
    let latLngs = this.line.latLngs;
    evtMgr.fire('on-drawComplete', {
      params: {
        attach:this
      }
    });
    // 2、事件监听端点样式设置
    this.completeCommon();
    // // 3、绘制三角形
    this.drawTriangles();
    // 4、线动画闪烁
    this.line.twinkle('line');
  },
  /**
   * 新编辑的线和已有数据的线，绘制完成都需要调用的函数
   */
  completeCommon() {
    // 1、删除随鼠标移动的球
    this.ball.remove();
    this.ball = null;
    // 2、设置最后端点的样式
    this.resetEndPointStyle();
    // 3、圆事件(点击，悬浮)注册
    this.circles.forEach(circle => circle.eventRegister ());
    // 4、线事件(点击)注册
    this.line.eventRegister ();
    // 5、线点击事件监听
    evtMgr.fire('on-restoreClickEvent');
  },
  /**
   * 绘制三角形
   */
  drawTriangles() {
    if (!this.triangles){
      this.triangles = new Triangle(this.line.latLngs);
    }
    this.triangles.redraw(this.line.latLngs);
  },
  /**
   * 重新设置结束端点样式
   */
  resetEndPointStyle () {
    let len = this.circles.length;
    let circle = this.circles[len - 1];
    if (circle.type != 'middle') {
      return;
    }
    let frontStyle = {}, backStyle = {};
    let latLngs = this.line.latLngs;
    let points = Util.latLngsToPoints(latLngs);
    let point = map.latLngToContainerPoint(circle.latLng);
    // 是结束端点 [1,2,3,4,5]  5不在1，2，3，4所组成的线上
    if (len <= 2
      || !DrawTools.isOnLine(points.slice(0, len - 1), point)) {
      // 重置结束点为端点
      circle.type = 'end';
    }
    // 样式设置
    circle.setStyle(CONFIG[circle.type]);
  },
  /**
   * 绑定线ID
   * @param lineId
   */
  lineIdBind (lineId) {
    if (lineId){
      this.lineId = lineId;
    }
  },
  /**
   * 根据数据进行绘制
   * @param lineData
   */
  drawOld (lineData) {
    // 当前线ID，针对已存在线进行设置，点击线的时候，需要回传该ID
    this.lineId = lineData.id;
    let latLngs = lineData.latLngs;
    // 绘制线
    for (let l in latLngs) {
      this.draw (latLngs[l]);
    }
    // 绘制完成,样式设置，事件监听
    this.completeCommon();
  },
  /**
   * 绘制线
   * @param latLng
   */
  draw (latLng) {
    // 线不存在说明当前标的点是开始点，再判断开始点是否在其他线的缓冲区内，如果在，开始点自动移动到线上
    if (!this.line) {
      latLng = this.getClosetLatLng (latLng);
    }
    // 是否完成此次编辑
    if (this.isFinished(latLng)){
      // 绘制完成，处理注销，清除工作
      this.drawCompleted();
      return;
    }
    // 绘制线
    this.drawLine(latLng);
    // 绘制圆
    this.drawCircle(latLng);
    // 绘制随鼠标移动的圆
    this.drawBall (latLng);
  },
  /**
   * 绘制线
   * @param latLng
   */
  drawLine (latLng) {
    // 绘制线
    if (!this.line) {
      this.line = new LinePair({latLngs:[latLng], attach:this});
    } else {
      this.line.addLatLng (latLng);
    }
  },
  /**
   * 绘制圆
   * @param latLng
   */
  drawCircle (latLng) {
    // 圆对象
    let existCircle = null;
    // 圆类型：link->连接点, middle->中间点, end->端点
    let type = '';
    // 当前位置存在的圆数组
    let existCircles = this.getExistCircleByLatLng (latLng);
    // 当前位置已经存在圆了
    if (existCircles.length > 0) {
      // TODO:取第一个已经存在的圆
      existCircle = existCircles[0];
      let index = this.circles.findIndex(value => {
        return value.id == existCircle.id;
      });
      // 当前线上的圆,不绘制新圆
      if (index > -1) {
        existCircle.type = 'middle';
        existCircle.setStyle(CONFIG.middle);
        return;
      } else {
        // 其他线上的圆
        type = 'link';
        latLng = existCircle.latLng;
        // 移除其他线上已存在的圆，重新创建新圆，否则会出现线压盖已存在圆的情况
        evtMgr.fire('on-removeExistCircle', {
          params: {
            circle: existCircle
          }
        });
      }
    } else {
      // 创建新圆
      // 获取圆的类型
      type = this.getCircleType (latLng);
      // 如果连接点是在已存在的线上而不是端点，需要将该点添加到已存在的线上
      if (type === 'link') {
        let self = this;
        evtMgr.fire("on-insertLatLng", {
          params:{
            latLng
          }
        });
      }
    }
    // 创建新圆
    let circle = new CirclePair({attach:this, type, latLng, ...CONFIG[type]});
    this.circles.push(circle);
  },
  /**
   * 绘制随鼠标移动的球
   * @param latLng
   */
  drawBall (latLng) {
    // 绘制随鼠标移动的圆
    if (!this.ball){
      this.ball = new CirclePair({type:'end', latLng, ...CONFIG['end']});
    }
  },
  /**
   * 根据经纬度获取所对应的圆
   * @param latLng
   */
  getExistCircleByLatLng (latLng) {
    let existCircles = [];
    // 判断该点是否已经存在圆了，如果存在，判断该圆的类型，根据圆的类型更改样式
    evtMgr.fire('on-isExistCircle', {
      params:{
        latLng,
        callback (circles) {
          existCircles = existCircles.concat(circles);
        }
      }
    });
    return existCircles;
  },
  /**
   * 获取圆的样式
   * @param latLng
   * @return {{backStyle, frontStyle}}
   */
  getCircleType (latLng) {
    let isLinkNode = false,  // 是否是连接点
      type = 'end',           // 圆的类型
      self = this;
    // 判断该点是否是与其他线的连接点
    this.broadcastToLines(latLng, (latLng, lines)=>{
      // 已经是连接点，避免多次回掉
      if (isLinkNode){
        return;
      }
      // 该点连接多条线
      if (lines.length > 1){
        isLinkNode = true;
      }
    });

    // 开始端点，并且不是连接点
    if(this.circles.length === 0 && !isLinkNode){
      type = 'end';
    } else if (isLinkNode) {
      // 连接点
      type = 'link';
    } else {
      // 中间点
      type = 'middle';
    }
    return type;
  },
  /**
   * 广播给所有的线，只要当前位置在线的缓冲区内
   * @param latLng
   * @param callback
   */
  broadcastToLines (latLng, callback) {
    let self = this, lines = [];
    // 广播给所有的线，判断当前位置是否在线的缓冲区内，如果在，自动移到该线上
    evtMgr.fire('on-isLatLngInBuffer', {
      params:{
        latLng,
        callback (closetLatLng, line) {
          if (closetLatLng){
            latLng = closetLatLng;
          }
          lines.push(line);
        }
      }
    });
    callback(latLng, lines);
  },
  /**
   * 根据缓冲区自动移动到线上
   * @param latLng
   */
  autoMoveToLine (latLng) {
    let self = this;
    this.broadcastToLines(latLng, (latLng)=>{
      self.line.move(latLng);
      self.ball.move(latLng);
    });
  },
  // 移除当前标线
  remove () {
    this.line.remove();
    this.circles.map(circle => {
      circle.remove();
    });
    this.line = null;
    this.circles = [];
    if (this.triangles){
      this.triangles.remove();
      this.triangles = null;
    }
  }
}

// 标线的集合类
// options={
//     latLngs:  批量绘制
//     circleClick: 圆点击事件
//     lineClick:   线点击事件
// }
//  API={
//    draw：根据经纬度绘制
//    drawNewLine: params={ callback: 绘制完毕之后的回调函数 }
//}
let LinesSet = {
  /**
   * 线集合类
   * @param tdtMap 地图对象
   * @param options 可选参数，初始化展示已由线数据时有用
   */
  initialize (tdtMap, options) {
    let self = this;
    map = tdtMap;
    // 线圆组合实例数组
    this.lineCirclePairs = [];
    // 绘制已有的线
    this.lineDatas = options.lineDatas || [];
    // 线拖拽完成回调函数
    this.lineDrag = options.lineDrag;
    // 线点击回调函数
    this.lineClick = options.lineClick;
    // 线绘制完成的回调函数
    this.lineDrawEnd = options.lineDrawEnd;
    // 线删除的回调函数
    this.lineRemove = options.lineRemove;
    // 线添加点的回调函数
    this.lineAddPoint = options.lineAddPoint;
    // 线移除点的回调函数
    this.lineDeletePoint = options.lineDeletePoint;
    // 根据线数据自动绘制线
    this.lineDatas.forEach(lineData => {
      self.draw(lineData);
    });
    // 初始化事件
    this.initEvent();
  },
  /**
   * 自定义事件监听函数集
   */
  initEvent () {
    let self = this;
    // 绘制完成事件监听
    evtMgr.on('on-drawComplete', (args)=>{
      // 事件注销
      self.mapEventOff ();
      let {attach} = args.params;
      let lineData = {
        id:attach.lineId,
        latLngs:attach.line.latLngs
      }
      if (self.lineDrawEnd){
        let lineIdBindFn = attach.lineIdBind.bind(attach);
        self.lineDrawEnd(lineData, lineIdBindFn);
      }
    });
    // 线点击回调函数
    evtMgr.on('on-lineClick', (args) => {
      let {attach} = args.params;
      let lineData = {
        id:attach.lineId,
        latLngs:attach.line.latLngs
      }
      if (self.lineClick){
        self.lineClick(lineData);
      }
    });
    // 线拖拽结束
    evtMgr.on('on-lineDrag', () => {
      let lineDatas = [];
      cacheDragLines.forEach(line => {
        let attach = line.attach;
        let lineData = {
          id:attach.lineId,
          latLngs:attach.line.latLngs
        }
        lineDatas.push(lineData);
      });

      if (self.lineDrag){
        self.lineDrag(lineDatas);
      }

      // 清除缓存，等待下次拖拽完成，继续存储
      cacheDragLines = [];
    });

    // 线删除
    evtMgr.on('on-lineRemove', (args) => {
      // 删除地图上的线
      let {lineId} = args.params;
      self.remove(lineId);
      // 线删除回调函数
      if (self.lineRemove){
        self.lineRemove(lineId);
      }
    });

    // 线添加点
    evtMgr.on('on-lineAddPoint', (args) => {
      let {attach} = args.params;
      let lineData = {
        id:attach.lineId,
        latLngs:attach.line.latLngs
      }
      if (self.lineAddPoint){
        self.lineAddPoint(lineData);
      }
    });

    evtMgr.on('on-lineDeletePoint', (args) => {
      let {latLng} = args.params;
      let movePoint = map.latLngToContainerPoint(latLng);
      let lineDatas = [];
      self.lineCirclePairs.map(lineCirclePair => {
        let line = lineCirclePair.line;
        let latLngs = line.latLngs;
        let tempLatLngs = [];
        for (let l = 0; l < latLngs.length; l++) {
          let item = latLngs[l];
          let center = map.latLngToContainerPoint(item);

          if(!DrawTools.isInBounds(movePoint, center, CONFIG.circleBuffer)){
            tempLatLngs.push(item);
          }
        }

        // 二者不相等，说明删除的点在当前线上，需要重绘该线
        if (tempLatLngs.length != latLngs.length) {
          line.redraw(tempLatLngs);
          let lineData = {
            lineId:lineCirclePair.lineId,
            latLngs:tempLatLngs
          }
          lineDatas.push(lineData);
        }

        let circles = lineCirclePair.circles;
        let idx = circles.findIndex(circle => {
          let circleLatLng = circle.latLng;
          let center = map.latLngToContainerPoint(circleLatLng);
          return DrawTools.isInBounds(movePoint, center, CONFIG.circleBuffer);
        });

        if (idx > -1) {
          circles[idx].remove();
          circles.splice(idx, 1);
        }
      });
      if (self.lineDeletePoint){
        self.lineDeletePoint(lineDatas);
      }
    });
  },
  /**
   * 依靠经纬度数组绘制线
   * @param lineData
   */
  draw (lineData) {
    let id = lineData.id;
    let latLngs = lineData.latLngs;
    if (!latLngs || latLngs.length == 0 ){
      return;
    }
    // 叠加已有的线
    let lineCirclePair = new LineCirclePair();
    lineCirclePair.drawOld(lineData);

    // 存储已存在的线圆组合实例
    this.lineCirclePairs.push(lineCirclePair);
  },
  /**
   * 从头开始，绘制新线
   */
  drawNewLine () {
    // 删除上一次标绘但未保存的线
    this.remove();
    // 暂时取消所有图形的点击事件，绘制完成再恢复
    evtMgr.fire('on-cancelClickEvent');
    // 新编辑线实例
    let lineCirclePair = new LineCirclePair();
    // 注册地图点击事件
    this.mapClickFn = this.mapClick.bind(this, lineCirclePair);
    this.mouseMoveFn = null;
    map.on('click', this.mapClickFn, this);
    // 存储新绘制的线圆组合实例
    this.lineCirclePairs.push(lineCirclePair);
  },
  /**
   * 根据Id移除线
   * @param lineId
   */
  remove(lineId){
    if (lineId == 'undefined'){
      lineId = undefined;
    }
    let idx = this.lineCirclePairs.findIndex(lineCirclePair => {
      return lineCirclePair.lineId == lineId;
    });
    if (idx > -1){
      this.lineCirclePairs[idx].remove();
      this.lineCirclePairs.splice(idx, 1);
    }
    if (lineId){
      return;
    }
    // 回退新标的线与已存在的线的交点
    cacheInsertLines.forEach(line => {
      let idxes = line.newInsertIdxes;
      let tempLatLngs = [];
      line.latLngs.forEach((latLng, idx) => {
        if (!idxes.includes(idx)){
          tempLatLngs.push(latLng);
        }
      });
      // 重绘
      line.redraw(tempLatLngs);
      line.newInsertIdxes = [];
    });

    cacheInsertLines = [];
  },
  /**
   * 地图点击事件，开始绘制线
   * @param lineCirclePair
   */
  mapClick (lineCirclePair, evt) {
    let latLng = evt.latlng;
    // 经纬度以随鼠标移动的圆点为基准，因为圆点进入线的缓冲区会自动移动到线上，此时鼠标所在位置与圆点不同
    if (lineCirclePair.ball){
      latLng = lineCirclePair.ball.latLng;
    }
    // 开始绘制
    lineCirclePair.draw(latLng);
    // 鼠标移动事件注册
    if (!this.mouseMoveFn){
      this.mouseMoveFn = this.mapMouseMove.bind(this, lineCirclePair);
      map.on('mousemove', this.mouseMoveFn, this);
    }
  },
  /**
   * 鼠标移动事件
   */
  mapMouseMove (lineCirclePair, evt) {
    let latLng = evt.latlng;
    // 当前鼠标位置如果在线的缓冲区内，自动移动到线上
    lineCirclePair.autoMoveToLine(latLng);
  },
  /**
   * 取消地图事件，停止绘制线
   * @param lineCirclePair
   */
  mapEventOff () {
    map.off('click', this.mapClickFn, this);
    map.off('mousemove', this.mouseMoveFn, this);
  }
}

// 圆组合类,继承圆和图形类
let CirclePair = L.Class.extend(Animation).extend(Shape).extend(Circles);

// 线组合类,继承线和图形类
let LinePair = L.Class.extend(Animation).extend(Shape).extend(Lines);

// 三角形类
let Triangle = L.Class.extend(Triangles);

// 线、圆、三角形组合类
let LineCirclePair = L.Class.extend(LineCircles);

// 标线集合类
let PolyLine = L.Class.extend(LinesSet);

export default {
  PolyLine:PolyLine
}
