// 地图相关
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import Cesium, { Viewer, Cartesian3, Math, Scene } from 'cesium'
import { getGeojson } from '@/api/base'
import { initCluster } from '@/utils/mapCluster'
import Dialog from '@/utils/dialog'

export const useMapStore = defineStore('map', () => {
  // 要避免 Vue 的响应式劫持，响应式问题可以通过 Vue3 的 shallowRef 或 shallowReactive 来解决
  let viewer: Viewer | null = null
  // 点位图层
  let BillboardCollection: any = null
  const dialogs = ref()
  const getViewer = computed(() => viewer)
  function setViewer(myViewer: Viewer | null) {
    viewer = myViewer
  }
  // 定位到指定区域
  function setMapLocatingSignals(
    coordinate: number[],
    type: string = 'flyTo',
    more: boolean = false
  ) {
    if (!viewer) {
      console.error('请先初始化地图！')
      return
    }

    let position: any = Cartesian3.fromDegrees(coordinate[0], coordinate[1], coordinate[2])
    if (more) {
      position = Cartesian3.fromDegreesArray(coordinate)
    }
    if (type === 'flyTo') {
      // 带动画
      viewer.camera.flyTo({
        destination: position,
        orientation: {
          heading: Math.toRadians(0),
          pitch: Math.toRadians(-90),
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
          pitch: Math.toRadians(-90),
          roll: 0
        }
      })
    }
  }
  // 撒点方法
  async function createPoint(type: string) {
    if (viewer) {
      clearMapAll()
      let pointFeatures: any = []
      const billboardsCollection = viewer.scene.primitives.add(new Cesium.BillboardCollection())
      const billboardsCollectionCombine: any = new Cesium.BillboardCollection()
      const primitives = viewer.scene.primitives.add(new Cesium.PrimitiveCollection())
      BillboardCollection = billboardsCollection
      if (type === 'clusterPoint') {
        // 聚合
        initCluster(viewer, '/json/schools.geojson')
        // 跳转 - 得加延迟，不然图层生成不了
        setTimeout(() => {
          setMapLocatingSignals([120.07934560676443, 36.27146248837304, 279730])
        }, 500)
      } else {
        const res: any = await getGeojson('/json/chuzhong.geojson')
        pointFeatures = res.features
        billboardsCollection._id = `mark`
        // 普通撒点
        res.features.forEach((element: any) => {
          const coordinates = element.geometry.coordinates
          const position = Cesium.Cartesian3.fromDegrees(coordinates[0], coordinates[1], 1000)
          // 带图片的点
          billboardsCollection.add({
            image: '/images/mark-icon.png',
            width: 32,
            height: 32,
            position
          })
        })
        // 跳转 - 得加延迟，不然图层生成不了
        setTimeout(() => {
          // 获取中心点-笛卡尔坐标
          const center = billboardsCollection._boundingVolume.center
          // 转换为经纬度
          const cartographic = Cesium.Cartographic.fromCartesian(center)
          const longitude = Cesium.Math.toDegrees(cartographic.longitude)
          const latitude = Cesium.Math.toDegrees(cartographic.latitude)
          setMapLocatingSignals([longitude, latitude, 279730])
        }, 500)
        // 添加点击弹框事件
        const scene = viewer.scene
        const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas)
        handler.setInputAction((e) => {
          // 获取实体
          const pick = scene.pick(e.position)
          if (Cesium.defined(pick) && pick.collection._id.indexOf('mark') > -1) {
            const property = pointFeatures[pick.primitive._index]
            const opts = {
              viewer,
              position: {
                _value: pick.primitive.position
              },
              title: property.properties.name,
              content: property.properties.address
            }
            if (dialogs.value) {
              // 只允许一个弹窗出现
              dialogs.value.windowClose()
            }
            dialogs.value = new Dialog(opts)
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
      }
    } else {
      console.error('地图未初始化')
    }
  }
  // 关闭弹框
  const handleClose = () => {
    dialogs.value?.windowClose()
  }
  // 清空地图
  function clearMapAll() {
    if (viewer) {
      if (BillboardCollection) {
        BillboardCollection.removeAll()
        handleClose()
      }
      setMapLocatingSignals([113.9332, 22.5212, 28860])
    }
  }
  return { viewer, getViewer, setViewer, setMapLocatingSignals, createPoint, clearMapAll }
})
