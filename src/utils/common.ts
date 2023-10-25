// 公共常用工具函数
import * as Cesium from 'cesium'

/**
 * @description: 获取相机位置
 * @param {*} viewer
 * @return {*}
 */
export const getCameraView = (viewer: any) => {
  viewer = viewer || window.GViewer
  if (!viewer) {
    console.error('缺少viewer对象')
    return
  }
  let camera = viewer.camera
  let position = camera.position
  let heading = camera.heading
  let pitch = camera.pitch
  let roll = camera.roll
  let lnglat = Cesium.Cartographic.fromCartesian(position)

  let cameraV = {
    x: Cesium.Math.toDegrees(lnglat.longitude),
    y: Cesium.Math.toDegrees(lnglat.latitude),
    z: lnglat.height,
    heading: Cesium.Math.toDegrees(heading),
    pitch: Cesium.Math.toDegrees(pitch),
    roll: Cesium.Math.toDegrees(roll)
  }
  return cameraV
}
