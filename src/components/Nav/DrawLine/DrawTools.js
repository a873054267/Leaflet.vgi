// 绘图工具类
export default {
  /**
   * 判断点是否在线上
   * @param latLngs
   * @param latlng
   * @return {boolean}
   */
  isOnLine (points, point) {
    for (let i = 0, len = points.length; i < len; i++){
      let start = points[i];
      // 端点
      if (start.x === point.x && start.y === point.y ) {
        return true;
      }
      if(i + 1 === len) {
        return false;
      }
      let end = points[i+1];
      // 不在端点，在线上
      let distance = L.LineUtil.pointToSegmentDistance(point, start, end);
      if (distance <= 1) {
        return true;
      }
    }
    return false;
  },
  /**
   * 根据线段的两个端点，绘制方向三角形，三角形的中心为线段的中间点
   * 以开始点为坐标原点
   * @param startPoint     开始端点经纬度
   * @param endPoint       结束端点经纬度
   * @return triangle     三角形三个顶点
   */
  getTrianglePoints (startPoint, endPoint, buffer) {
    let wd = buffer - 2;
    // 线段中间点的坐标
    let midPoint = Object.create(null);
    midPoint.x = (startPoint.x + endPoint.x)/2;
    midPoint.y = (startPoint.y + endPoint.y)/2;
    let distanceY = startPoint.y - endPoint.y;
    let distanceX = endPoint.x - startPoint.x;

    let angle;
    // 90度的情况下
    if (distanceX === 0) {
      angle = Math.PI/2;
    } else {
      angle = Math.atan(Math.abs(distanceY)/Math.abs(distanceX));
    }

    // 象限转换，线段中间点转换到第一象限
    midPoint.x = startPoint.x + Math.abs(startPoint.x - midPoint.x );
    midPoint.y = startPoint.y - Math.abs(startPoint.y - midPoint.y );

    // 三角形底部中间点的坐标
    let bottomMiddle = Object.create(null);
    bottomMiddle.x = midPoint.x - wd * Math.cos(angle);
    bottomMiddle.y = midPoint.y + wd * Math.sin(angle);

    // 默认是第一象限
    // 三角形顶点坐标
    let top = Object.create(null);
    top.x = midPoint.x + wd * Math.cos(angle);
    top.y = midPoint.y - wd * Math.sin(angle);

    // 三角形底部右侧点坐标
    let right = Object.create(null);
    right.x = midPoint.x + wd * Math.sin(angle);
    right.y = midPoint.y + wd * Math.cos(angle);

    // 三角形底部左侧点坐标
    let left = Object.create(null);
    left.x = midPoint.x - wd * Math.sin(angle);
    left.y = midPoint.y - wd * Math.cos(angle);

    // 第二象限
    if(distanceY >= 0 && distanceX < 0) {
      top.x = startPoint.x - (top.x - startPoint.x);
      right.x = startPoint.x - (right.x - startPoint.x);
      left.x = startPoint.x - (left.x - startPoint.x);
      // 第三象限
    } else if(distanceY < 0 && distanceX <= 0){
      top.x = startPoint.x - (top.x - startPoint.x);
      top.y = startPoint.y + (startPoint.y - top.y);
      right.x = startPoint.x - (right.x - startPoint.x);
      right.y = startPoint.y + (startPoint.y - right.y);
      left.x = startPoint.x - (left.x - startPoint.x);
      left.y = startPoint.y + (startPoint.y - left.y);
      // 第四象限
    } else if(distanceY < 0 && distanceX > 0) {
      top.y = startPoint.y + (startPoint.y - top.y);
      right.y = startPoint.y + (startPoint.y - right.y);
      left.y = startPoint.y + (startPoint.y - left.y);
    }
    return {
      top,
      right,
      left
    }
  },
  /**
   * 判断点是否在某一个范围内
   * @param movePoint
   * @param center
   * @param radius
   */
  isInBounds(movePoint, center, radius) {
    // 鼠标位置在圆内不发生移动
    if (movePoint.x >= center.x - radius && movePoint.x <= center.x + radius
      && movePoint.y >= center.y - radius && movePoint.y <= center.y + radius) {
      return true;
    }
  }
}
