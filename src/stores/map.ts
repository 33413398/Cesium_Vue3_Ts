// 地图相关
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { Viewer, Cartesian3, Math } from 'cesium'

export const useMapStore = defineStore('map', () => {
  // 要避免 Vue 的响应式劫持，响应式问题可以通过 Vue3 的 shallowRef 或 shallowReactive 来解决
  let viewer: Viewer | null = null
  const getViewer = computed(() => viewer)
  function setViewer(myViewer: Viewer | null) {
    viewer = myViewer
  }

  // 定位到指定区域
  function setMapLocatingSignals(coordinate: number[], type: string = 'flyTo', more: boolean = false) {
    if (!viewer) {
      console.error('请先初始化地图！');
      return
    }

    let position: any = Cartesian3.fromDegrees(coordinate[0], coordinate[1], coordinate[2]);
    if (more) {
      position = Cartesian3.fromDegreesArray(coordinate);
    }
    if (type === 'flyTo') {
      // 带动画
      viewer.camera.flyTo({
        destination: position,
        orientation: {
          heading: Math.toRadians(0),
          pitch: Math.toRadians(-45),
          roll: 0
        },
        duration: 2 // 动画持续 秒
      })
    } else {
      // 无动画，直接跳转
      viewer.camera.setView({
        destination: position,
        orientation: {
          heading: Math.toRadians(0),
          pitch: Math.toRadians(-45),
          roll: 0
        }
      })
    }
  }

  return { viewer, getViewer, setViewer, setMapLocatingSignals }
})
