// 地图相关
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import Cesium, { Viewer, Cartesian3, Math, Scene } from 'cesium'
import { getGeojson } from '@/api/base'
import { initCluster } from '@/utils/mapCluster'
import Dialog from '@/utils/dialog'
import CesiumHeatMap from '@/utils/cesiumHeatMap'

export const useMapStore = defineStore('map', () => {
  // 要避免 Vue 的响应式劫持，响应式问题可以通过 Vue3 的 shallowRef 或 shallowReactive 来解决
  let viewer: Viewer | null = null
  let cesiumHeatMapObj: any = null
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
      let pointFeatures: any = []
      const billboardsCollection = viewer.scene.primitives.add(new Cesium.BillboardCollection())
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
        handler.setInputAction((e: any) => {
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
  // 热力图方法
  async function cerateCesiumHeatMap() {
    const res: any = await getGeojson('/json/heatMap.json')
    const { features } = res
    let heatData = []
    if (features?.length) {
      heatData = features.map((item: any) => {
        return {
          x: item.properties.lng - 0.05,
          y: item.properties.lat - 0.04,
          value: item.properties.num
        }
      })
    }
    cesiumHeatMapObj = new CesiumHeatMap(viewer, {
      zoomToLayer: true,
      points: heatData,
      heatmapDataOptions: { max: 1, min: 0 },
      heatmapOptions: {
        maxOpacity: 1,
        minOpacity: 0
      }
    })
  }
  // 四色图
  async function cerateColorLayer() {
    const res: any = await getGeojson('/json/qingdaoArea.geojson')
    const pointRes: any = await getGeojson('/json/areaPoint.geojson')
    const features = res.features
    if (viewer) {
      const labelCollection = viewer.scene.primitives.add(new Cesium.LabelCollection())
      const colorArrs: any = [
        'AQUAMARINE',
        'BEIGE',
        'CORNFLOWERBLUE',
        'DARKORANGE',
        'GOLD',
        'GREENYELLOW',
        'LIGHTPINK',
        'ORANGERED',
        'YELLOWGREEN',
        'TOMATO'
      ]
      const areaPointCenter: any = []
      let instances = []
      for (let i = 0; i < features.length; i++) {
        const curFeatures = features[i]
        for (let j = 0; j < curFeatures.geometry.coordinates.length; j++) {
          const polygonArray = curFeatures.geometry.coordinates[j].toString().split(',').map(Number)
          const polygon = new Cesium.PolygonGeometry({
            polygonHierarchy: new Cesium.PolygonHierarchy(
              Cesium.Cartesian3.fromDegreesArray(polygonArray)
            ),
            vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
            // 设置面的拉伸高度
            extrudedHeight: 100
            // height: 100, // 多边形和椭球表面之间的距离（以米为单位）。
          })
          // console.log('---', polygon)
          // const polygonPositions = polygon.polygonHierarchy.getValue
          const geometry: any = Cesium.PolygonGeometry.createGeometry(polygon)
          instances.push(
            new Cesium.GeometryInstance({
              id: `polygon-${i}`,
              geometry: geometry,
              attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(
                  Cesium.Color.fromAlpha(Cesium.Color[colorArrs[i]], 0.6)
                ),
                show: new Cesium.ShowGeometryInstanceAttribute(true)
                // color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromRandom({ alpha: 0.7 })),
              }
            })
          )
        }
        // 寻找中心点位，添加标签
        const p = pointRes.features.find(
          (item: any) => item.properties['ID'] == curFeatures['properties']['id']
        )
        const carter3Position = Cesium.Cartesian3.fromDegrees(...p['geometry']['coordinates'])
        areaPointCenter.push(p['geometry']['coordinates'])
        labelCollection.add({
          text: curFeatures['properties']['name'],
          font: 'bold 15px Microsoft YaHei',
          blendOption: Cesium.BlendOption.TRANSLUCENT, // 半透明，提高性能2倍
          position: carter3Position,
          // 竖直对齐方式
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          // 水平对齐方式
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT
        })
      }
      // 合并单个geometry,提高渲染效率
      const primitive = new Cesium.Primitive({
        releaseGeometryInstances: false,
        geometryInstances: instances,
        appearance: new Cesium.PerInstanceColorAppearance({
          translucent: true, // 当 true 时，几何体应该是半透明的，因此 PerInstanceColorAppearance#renderState 启用了 alpha 混合。
          closed: false // 当 true 时，几何体应该是关闭的，因此 PerInstanceColorAppearance#renderState 启用了背面剔除。
        }),
        asynchronous: false
      })
      viewer.scene.primitives.add(primitive)
      // 添加点击事件
      const scene = viewer.scene
      const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas)
      handler.setInputAction((e: any) => {
        // 获取实体
        const pick = scene.pick(e.position)
        if (Cesium.defined(pick) && pick.id.indexOf('polygon') > -1) {
          const id = pick.id.replace(/polygon-/g, '')

          // 单击变色(TODO:遇到多个相同id的instance会失效)
          // const attributes = pick.primitive.getGeometryInstanceAttributes(pick.id)
          // attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.WHITE);

          viewer.camera.flyTo({
            // 从以度为单位的经度和纬度值返回笛卡尔3位置。
            destination: Cesium.Cartesian3.fromDegrees(...areaPointCenter[id], 40000),
            orientation: {
              // heading：默认方向为正北，正角度为向东旋转，即水平旋转，也叫偏航角。
              // pitch：默认角度为-90，即朝向地面，正角度在平面之上，负角度为平面下，即上下旋转，也叫俯仰角。
              // roll：默认旋转角度为0，左右旋转，正角度向右，负角度向左，也叫翻滚角
              heading: Cesium.Math.toRadians(0.0), // 正东，默认北
              pitch: Cesium.Math.toRadians(-90), // 向正下方看
              roll: 0.0 // 左右
            },
            duration: 2 // 飞行时间（s）
          })
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
      // 定位到数据区域
      setMapLocatingSignals([120.36, 36.09, 40000])
    }
  }
  // 遮罩反选
  async function cerateMaskReverseSelect() {
    if (viewer) {
      const res: any = await getGeojson('json/tianjin.json')
      const features = res.features
      const maskpointArray = []
      const arr = features[0].geometry.coordinates[0]
      for (let i = 0, l = arr.length; i < l; i++) {
        maskpointArray.push(arr[i][0])
        maskpointArray.push(arr[i][1])
      }
      let maskspoint = Cesium.Cartesian3.fromDegreesArray(maskpointArray)
      const area = new Cesium.Entity({
        id: '1',
        polygon: {
          // @ts-ignore
          hierarchy: {
            positions: Cesium.Cartesian3.fromDegreesArray([100, 0, 100, 89, 160, 89, 160, 0]), //外部区域
            holes: [
              {
                positions: maskspoint //挖空区域
              }
            ]
          },
          material: Cesium.Color.BLACK.withAlpha(0.6) //外部颜色
        }
      })
      const line = new Cesium.Entity({
        id: '2',
        polyline: {
          positions: maskspoint,
          width: 2, //边界线宽
          material: Cesium.Color.fromCssColorString('#6dcdeb') //边界线颜色
        }
      })
      viewer.entities.add(area)
      viewer.entities.add(line)
      viewer.flyTo(line, { duration: 3 })
    }
  }
  // 关闭弹框
  const handleClose = () => {
    dialogs.value?.windowClose()
  }
  // 清空地图 -- 需要优化
  function clearMapAll(initFlag?: boolean) {
    if (viewer) {
      if (BillboardCollection) {
        BillboardCollection.removeAll()
        handleClose()
      }
      if (cesiumHeatMapObj) {
        cesiumHeatMapObj?.remove()
      }
      if (viewer.scene.primitives) {
        viewer.scene.primitives.removeAll()
      }
      if (viewer && viewer.entities && viewer.entities.values.length) {
        viewer.entities.values.forEach((item: any) => {
          viewer.entities.remove(item)
        })
      }
      initFlag && setMapLocatingSignals([113.9332, 22.5212, 28860])
    }
  }
  return {
    viewer,
    getViewer,
    setViewer,
    setMapLocatingSignals,
    createPoint,
    clearMapAll,
    cerateCesiumHeatMap,
    cerateColorLayer,
    cerateMaskReverseSelect
  }
})
