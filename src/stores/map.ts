// 地图相关
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import Cesium, { Viewer, Cartesian3, Math, Color, Scene } from 'cesium'
import { getGeojson } from '@/api/base'
import { initCluster } from '@/utils/mapCluster'
import Dialog from '@/utils/dialog'
import CesiumHeatMap from '@/utils/cesiumHeatMap'
import RoadThroughLine from '@/utils/roadThrough'
import Radiant from '@/utils/radiant'
import CircleDiffusion from '@/utils/diffuse'
import SkyBoxOnGround from '@/utils/skyBoxOnGround'
import SkyLineAnalysis from '@/utils/skyLineAnalysis.js'
import Clock from '@/utils/clock'
import SnowEffect from '@/utils/snow'
import RainEffect from '@/utils/rain'
import FogEffect from '@/utils/fog'
import FireEffect from '@/utils/fire'
import DrawTool from '@/utils/drawGraphic'
import MeasureTool from '@/utils/measure'

export const useMapStore = defineStore('map', () => {
  // 要避免 Vue 的响应式劫持，响应式问题可以通过 Vue3 的 shallowRef 或 shallowReactive 来解决
  let viewer: Viewer | null = null
  let cesiumHeatMapObj: any = null
  // primitives 相关图层
  let primitivesArray: any = []
  // 默认经纬度定位
  const baseCartesian3 = [120.36, 36.09]
  const defaultCoordinateCartesian3 = Cesium.Cartesian3.fromDegrees(120.36, 36.09, 40000)
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
      primitivesArray.push(billboardsCollection)
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
      primitivesArray.push(labelCollection)
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
                  // @ts-ignore
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
        // @ts-ignore
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
      const primitives = viewer.scene.primitives.add(primitive)
      primitivesArray.push(primitives)
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

          viewer &&
            viewer.camera.flyTo({
              // 从以度为单位的经度和纬度值返回笛卡尔3位置。
              // @ts-ignore
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
  // 路网穿梭(entity渲染)
  function cerateRoadEntity() {
    if (viewer) {
      viewer.camera.setView({
        // 从以度为单位的经度和纬度值返回笛卡尔3位置。
        destination: defaultCoordinateCartesian3
      })
      // @ts-ignore
      const material = new RoadThroughLine(1000, '/images/spriteline.png')
      // 道路闪烁线
      Cesium.GeoJsonDataSource.load('/json/qingdaoRoad.geojson').then(function (dataSource) {
        // @ts-ignore
        viewer.dataSources.add(dataSource)
        const entities = dataSource.entities.values
        // 聚焦
        // viewer.zoomTo(entities);
        for (let i = 0; i < entities.length; i++) {
          let entity: any = entities[i]
          entity.polyline.width = 1.7
          entity.polyline.material = material
        }
      })
    }
  }
  // 路网穿梭(primitive渲染)
  async function cerateRoadPrimitive() {
    if (viewer) {
      viewer.camera.setView({
        // 从以度为单位的经度和纬度值返回笛卡尔3位置。
        destination: defaultCoordinateCartesian3
      })
      const res: any = await getGeojson('/json/qingdaoRoad.geojson')
      const features = res.features
      const instance: any = []
      if (features?.length) {
        features.forEach((item: any) => {
          const arr = item.geometry.coordinates
          arr.forEach((el: any) => {
            let arr1: any = []

            el.forEach((_el: any) => {
              arr1 = arr1.concat(_el)
            })
            const polyline = new Cesium.PolylineGeometry({
              positions: Cesium.Cartesian3.fromDegreesArray(arr1),
              width: 1.7,
              vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT
            })
            const geometry: any = Cesium.PolylineGeometry.createGeometry(polyline)
            instance.push(
              new Cesium.GeometryInstance({
                geometry
              })
            )
          })
        })
        let source = `czm_material czm_getMaterial(czm_materialInput materialInput)
                              {
                                czm_material material = czm_getDefaultMaterial(materialInput);
                                vec2 st = materialInput.st;
                                 vec4 colorImage = texture(image, vec2(fract((st.s - speed * czm_frameNumber * 0.001)), st.t));
                                 material.alpha = colorImage.a * color.a;
                                 material.diffuse = colorImage.rgb * 1.5 ;
                                return material;
                              }`

        const material = new Cesium.Material({
          fabric: {
            uniforms: {
              color: Cesium.Color.fromCssColorString('#7ffeff'),
              image: '/images/spriteline.png',
              speed: 10
            },
            source
          },
          translucent: function () {
            return true
          }
        })
        const appearance = new Cesium.PolylineMaterialAppearance()
        appearance.material = material
        const primitive = new Cesium.Primitive({
          geometryInstances: instance,
          appearance,
          asynchronous: false
        })

        const primitives = viewer.scene.primitives.add(primitive)
        primitivesArray.push(primitives)
      }
    }
  }

  // 辐射圈
  let circleWave: any = null
  function cerateRadiant() {
    if (viewer) {
      viewer.camera.setView({
        // 从以度为单位的经度和纬度值返回笛卡尔3位置。
        destination: defaultCoordinateCartesian3
      })
      // 水波纹扩散
      circleWave = new Radiant(viewer, 'cirCleWave1')
      circleWave.add([...baseCartesian3, 10], 'red', 1000, 3000)
    }
  }
  // 圆扩散
  let circleDiffusion: any = null
  function cerateDiffuse() {
    if (viewer) {
      viewer.camera.setView({
        // 从以度为单位的经度和纬度值返回笛卡尔3位置。
        destination: defaultCoordinateCartesian3
      })
      // 圆扩散
      circleDiffusion = new CircleDiffusion(viewer)
      circleDiffusion.add([...baseCartesian3, 10], '#F7EB08', 2000, 5000)
    }
  }
  // 流动水面
  function cerateWater() {
    if (viewer) {
      viewer.camera.setView({
        // 从以度为单位的经度和纬度值返回笛卡尔3位置。
        destination: defaultCoordinateCartesian3
      })
      const primitive = new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.RectangleGeometry({
            rectangle: Cesium.Rectangle.fromDegrees(120.34, 36.06, 120.42, 36.13),
            vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT
          })
        }),
        appearance: new Cesium.EllipsoidSurfaceAppearance({
          material: new Cesium.Material({
            fabric: {
              type: 'Water',
              uniforms: {
                baseWaterColor: new Cesium.Color(64 / 255.0, 157 / 255.0, 253 / 255.0, 0.5),
                normalMap: '/images/waterNormals.jpg',
                frequency: 1000.0,
                animationSpeed: 0.1,
                amplitude: 10,
                specularIntensity: 10
              }
            }
          })
        })
      })
      const primitives = viewer.scene.primitives.add(primitive)
      primitivesArray.push(primitives)
    }
  }
  // 天空盒
  let groundSkyBox: any = null
  function cerateSkybox() {
    if (viewer) {
      // 教程：https://blog.csdn.net/qq_25519615/article/details/128063735
      // 内天空盒
      groundSkyBox = new SkyBoxOnGround({
        sources: {
          positiveX: '/images/Standard-Cube-Map/px1.png',
          negativeX: '/images/Standard-Cube-Map/nx1.png',
          positiveY: '/images/Standard-Cube-Map/pz.png',
          negativeY: '/images/Standard-Cube-Map/nz1.png',
          positiveZ: '/images/Standard-Cube-Map/py.png',
          negativeZ: '/images/Standard-Cube-Map/ny1.png'
        }
      })
      groundSkyBox.setSkyBox(viewer)
    }
  }
  // 绘制
  let drawTool: any = null
  function cerateDraw(type: string) {
    if (viewer) {
      if (!drawTool) {
        drawTool = new DrawTool(viewer)
      }
      if (type === 'draw-point') {
        // 点
        drawTool.activate('Point')
      } else if (type === 'draw-line') {
        // 线
        drawTool.activate('Polyline')
      } else if (type === 'draw-surface') {
        // 面
        drawTool.activate('Polygon')
      } else {
        console.log('绘制类型未开发:', type)
      }
    }
  }
  // 量测
  let measure: any = null
  function cerateMeasure(type: string) {
    if (viewer) {
      viewer.camera.setView({
        // 从以度为单位的经度和纬度值返回笛卡尔3位置。
        destination: Cesium.Cartesian3.fromDegrees(120.36, 36.09, 40000)
      })
      if (!measure) {
        measure = new MeasureTool(viewer)
      }
      if (type === 'measure-jl') {
        // 空间距离
        measure.drawLineMeasureGraphics({
          clampToGround: true,
          callback: (e: any) => {
            console.log('空间距离', e)
          }
        })
      } else if (type === 'measure-mj') {
        // 空间面积
        measure.drawAreaMeasureGraphics({
          clampToGround: true,
          callback: () => {}
        })
      } else if (type === 'measure-sj') {
        // 三角量测
        measure.drawTrianglesMeasureGraphics({
          callback: () => {}
        })
      } else {
        console.log('测量类型未开发:', type)
      }
    }
  }
  // 水淹模拟
  let waterEntity: any = null
  let waterTimer: any = null
  function cerateWaterFlood() {
    if (viewer) {
      measure = new MeasureTool(viewer)
      let translation = Cesium.Cartesian3.fromArray([0, 0, 0])
      let m = Cesium.Matrix4.fromTranslation(translation)
      const url =
        'http://114.215.136.187:8080/spatio/resource-service/803c888b6e144462ab8fd5a8d539f7c9/38/'
      let tilesetJson = {
        url,
        modelMatrix: m,
        show: true, // 是否显示图块集(默认true)
        skipLevelOfDetail: true, // --- 优化选项。确定是否应在遍历期间应用详细级别跳过(默认false)
        baseScreenSpaceError: 1024, // --- When skipLevelOfDetailis true，在跳过详细级别之前必须达到的屏幕空间错误(默认1024)
        maximumScreenSpaceError: 32, // 数值加大，能让最终成像变模糊---用于驱动细节细化级别的最大屏幕空间误差(默认16)原128
        skipScreenSpaceErrorFactor: 16, // --- 何时skipLevelOfDetail是true，定义要跳过的最小屏幕空间错误的乘数。与 一起使用skipLevels来确定要加载哪些图块(默认16)
        skipLevels: 1, // --- WhenskipLevelOfDetail是true一个常量，定义了加载图块时要跳过的最小级别数。为 0 时，不跳过任何级别。与 一起使用skipScreenSpaceErrorFactor来确定要加载哪些图块。(默认1)
        immediatelyLoadDesiredLevelOfDetail: false, // --- 当skipLevelOfDetail是时true，只会下载满足最大屏幕空间错误的图块。忽略跳过因素，只加载所需的图块(默认false)
        loadSiblings: false, // 如果为true则不会在已加载完概况房屋后，自动从中心开始超清化房屋 --- 何时确定在遍历期间skipLevelOfDetail是否true始终下载可见瓦片的兄弟姐妹(默认false)
        cullWithChildrenBounds: false, // ---优化选项。是否使用子边界体积的并集来剔除瓦片（默认true）
        cullRequestsWhileMoving: false, // ---优化选项。不要请求由于相机移动而在返回时可能未使用的图块。这种优化只适用于静止的瓦片集(默认true)
        cullRequestsWhileMovingMultiplier: 10, // 值越小能够更快的剔除 ---优化选项。移动时用于剔除请求的乘数。较大的是更积极的剔除，较小的较不积极的剔除(默认60)原10
        preloadWhenHidden: true, // ---tileset.show时 预加载瓷砖false。加载图块，就好像图块集可见但不渲染它们(默认false)
        preloadFlightDestinations: true, // ---优化选项。在相机飞行时在相机的飞行目的地预加载图块(默认true)
        preferLeaves: true, // ---优化选项。最好先装载叶子(默认false)
        maximumMemoryUsage: 2048, // 内存分配变小有利于倾斜摄影数据回收，提升性能体验---瓦片集可以使用的最大内存量（以 MB 为单位）(默认512)原512 4096
        progressiveResolutionHeightFraction: 0.5, // 数值偏于0能够让初始加载变得模糊 --- 这有助于在继续加载全分辨率图块的同时快速放下图块层(默认0.3)
        dynamicScreenSpaceErrorDensity: 10, // 数值加大，能让周边加载变快 --- 用于调整动态屏幕空间误差的密度，类似于雾密度(默认0.00278)
        dynamicScreenSpaceErrorFactor: 1, // 不知道起了什么作用没，反正放着吧先 --- 用于增加计算的动态屏幕空间误差的因素(默认4.0)
        dynamicScreenSpaceErrorHeightFalloff: 0.25, // --- 密度开始下降的瓦片集高度的比率(默认0.25)
        foveatedScreenSpaceError: true, // --- 优化选项。通过暂时提高屏幕边缘周围图块的屏幕空间错误，优先加载屏幕中心的图块。一旦Cesium3DTileset#foveatedConeSize加载确定的屏幕中心的所有图块，屏幕空间错误就会恢复正常。(默认true)
        foveatedConeSize: 0.1, // --- 优化选项。当Cesium3DTileset#foveatedScreenSpaceError为 true 时使用来控制决定延迟哪些图块的锥体大小。立即加载此圆锥内的瓷砖。圆锥外的瓷砖可能会根据它们在圆锥外的距离及其屏幕空间误差而延迟。这是由Cesium3DTileset#foveatedInterpolationCallback和控制的Cesium3DTileset#foveatedMinimumScreenSpaceErrorRelaxation。将此设置为 0.0 意味着圆锥将是由相机位置及其视图方向形成的线。将此设置为 1.0 意味着锥体包含相机的整个视野,禁用效果(默认0.1)
        foveatedMinimumScreenSpaceErrorRelaxation: 0.0, // --- 优化选项。当Cesium3DTileset#foveatedScreenSpaceError为 true 时使用以控制中央凹锥之外的图块的起始屏幕空间误差松弛。屏幕空间错误将从 tileset 值开始Cesium3DTileset#maximumScreenSpaceError根据提供的Cesium3DTileset#foveatedInterpolationCallback.(默认0.0)
        // foveatedTimeDelay: 0.2, // ---优化选项。使用 whenCesium3DTileset#foveatedScreenSpaceError为 true 来控制在相机停止移动后延迟瓷砖开始加载之前等待的时间（以秒为单位）。此时间延迟可防止在相机移动时请求屏幕边缘周围的瓷砖。将此设置为 0.0 将立即请求任何给定视图中的所有图块。(默认0.2)
        luminanceAtZenith: 0.2, // --- 用于此模型的程序环境贴图的天顶处的太阳亮度（以千坎德拉每平方米为单位）(默认0.2)
        backFaceCulling: true, // --- 是否剔除背面几何体。当为 true 时，背面剔除由 glTF 材质的 doubleSided 属性确定；如果为 false，则禁用背面剔除(默认true)
        debugFreezeFrame: false, // --- 仅用于调试。确定是否应仅使用最后一帧的图块进行渲染(默认false)
        debugColorizeTiles: false, // --- 仅用于调试。如果为 true，则为每个图块分配随机颜色(默认false)
        debugWireframe: false, // --- 仅用于调试。如果为 true，则将每个图块的内容渲染为线框(默认false)
        debugShowBoundingVolume: false, // --- 仅用于调试。如果为 true，则为每个图块渲染边界体积(默认false)
        debugShowContentBoundingVolume: false, // --- 仅用于调试。如果为 true，则为每个图块的内容渲染边界体积(默认false)
        debugShowViewerRequestVolume: false, // --- 仅用于调试。如果为 true，则呈现每个图块的查看器请求量(默认false)
        debugShowGeometricError: false, // --- 仅用于调试。如果为 true，则绘制标签以指示每个图块的几何误差(默认false)
        debugShowRenderingStatistics: false, // --- 仅用于调试。如果为 true，则绘制标签以指示每个图块的命令、点、三角形和特征的数量(默认false)
        debugShowMemoryUsage: false, // --- 仅用于调试。如果为 true，则绘制标签以指示每个图块使用的纹理和几何内存（以兆字节为单位）(默认false)
        debugShowUrl: false, // --- 仅用于调试。如果为 true，则绘制标签以指示每个图块的 url(默认false)
        dynamicScreenSpaceError: true // 根据测试，有了这个后，会在真正的全屏加载完之后才清晰化房屋 --- 优化选项。减少距离相机较远的图块的屏幕空间错误(默认false)
      }
      const tileset = new Cesium.Cesium3DTileset(tilesetJson)
      // 非异步加载
      viewer.scene.primitives.add(tileset)
      viewer.flyTo(tileset, {
        offset: {
          heading: Cesium.Math.toRadians(120.0), //方向
          pitch: Cesium.Math.toRadians(-10), //倾斜角度
          range: 450
        }
      })
      tileset.allTilesLoaded.addEventListener(function () {
        console.log('模型已经全部加载完成')
      })
      const waterCoord = [
        113.06508063476562, 22.64993861205814, 50, 113.06527473705533, 22.64260237495509, 50,
        // eslint-disable-next-line no-loss-of-precision
        113.06027660076428, 22.643076702115824, 50, 113.060173479617576, 22.651161317346762, 50
      ]

      let startHeight = 50
      const targetHeight = 100
      waterEntity = viewer.entities.add({
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights(waterCoord),
          material: Cesium.Color.fromBytes(64, 157, 253, 200),
          perPositionHeight: true,
          extrudedHeight: new Cesium.CallbackProperty(() => {
            return startHeight
          }, false)
        }
      })
      waterTimer = setInterval(() => {
        if (startHeight < targetHeight) {
          startHeight += 0.1
          if (startHeight >= targetHeight) {
            startHeight = targetHeight
            clearInterval(waterTimer)
          }
          // 使用该方式会闪烁，改用 Cesium.CallbackProperty 平滑
          // this.waterEntity.polygon.extrudedHeight.setValue(startHeight)
        }
      }, 50)
    }
  }
  // 天际线分析
  let skyLineIns: any = null
  async function cerateSkyLine() {
    if (viewer) {
      skyLineIns = new SkyLineAnalysis(viewer)
      viewer.camera.flyTo({
        // 从以度为单位的经度和纬度值返回笛卡尔3位置。
        destination: Cesium.Cartesian3.fromDegrees(120.58193064609729, 36.125460378632766, 200),
        orientation: {
          // heading：默认方向为正北，正角度为向东旋转，即水平旋转，也叫偏航角。
          // pitch：默认角度为-90，即朝向地面，正角度在平面之上，负角度为平面下，即上下旋转，也叫俯仰角。
          // roll：默认旋转角度为0，左右旋转，正角度向右，负角度向左，也叫翻滚角
          heading: Cesium.Math.toRadians(0.0), // 正东，默认北
          pitch: Cesium.Math.toRadians(0),
          roll: 0.0 // 左右
        },
        duration: 3 // 飞行时间（s）
      })
      setTimeout(() => {
        skyLineIns.open()
      })
    }
  }
  // 时间轴
  function cerateTimeLine() {
    if (viewer) {
      new Clock(viewer)
    }
  }
  // 下雪
  let snow: any = null
  function cerateSnow() {
    if (viewer) {
      snow = new SnowEffect(viewer, {
        snowSize: 0.02, // 雪花大小
        snowSpeed: 60.0 // 雪速
      })
      snow.show(true)
    }
  }
  // 下雨
  let instance: any = null
  function cerateRain() {
    if (viewer) {
      instance = new RainEffect(viewer, {
        tiltAngle: -0.2, //倾斜角度
        rainSize: 1.0, // 雨大小
        rainSpeed: 120.0 // 雨速
      })
      instance.show(true)
    }
  }
  // 大雾
  let fog: any = null
  function cerateFog() {
    if (viewer) {
      fog = new FogEffect(viewer, {
        visibility: 0.2,
        color: new Color(0.8, 0.8, 0.8, 0.3)
      })
      instance.show(true)
    }
  }
  // 火焰
  let fire: any = null
  function cerateFire() {
    if (viewer) {
      viewer.camera.flyTo({
        // 从以度为单位的经度和纬度值返回笛卡尔3位置。
        destination: Cesium.Cartesian3.fromDegrees(120.361, 36.0885, 80),
        orientation: {
          direction: new Cesium.Cartesian3(
            0.7458181136018,
            -0.4270255968894706,
            0.5112773034515067
          ),
          up: new Cesium.Cartesian3(-0.19274344830978868, 0.5963500021825172, 0.7792410654159365)
        },
        duration: 3 // 飞行时间（s）
      })
      setTimeout(() => {
        fire = new FireEffect(viewer)
      }, 3000)
    }
  }

  // 关闭弹框
  const handleClose = () => {
    dialogs.value?.windowClose()
  }
  // 清空地图 -- 需要优化
  function clearMapAll(initFlag?: boolean) {
    if (viewer) {
      if (viewer && viewer.entities && viewer.entities.values.length) {
        viewer.entities.values.forEach((item: any) => {
          viewer && viewer.entities.remove(item)
        })
      }
      if (cesiumHeatMapObj) {
        cesiumHeatMapObj?.remove()
      }
      if (viewer.dataSources) {
        viewer.dataSources.removeAll()
      }
      if (primitivesArray?.length > 0) {
        primitivesArray.forEach((item: any) => {
          item && item?.removeAll && item?.removeAll()
        })
        viewer.scene.primitives.removeAll()
        primitivesArray = []
        handleClose()
      }
      if (circleWave) {
        circleWave.del('cirCleWave1')
        circleWave = null
      }
      if (circleDiffusion) {
        circleDiffusion.del('circle')
        circleDiffusion = null
      }
      if (groundSkyBox) {
        groundSkyBox.destroy()
        groundSkyBox = null
      }
      if (skyLineIns) {
        skyLineIns.close()
        skyLineIns = null
      }
      if (snow) {
        snow.show(false)
        snow = null
      }
      if (instance) {
        instance.show(false)
        instance = null
      }
      if (fog) {
        fog.show(false)
        fog = null
      }
      if (fire) {
        fire.remove()
        fire = null
      }
      if (drawTool) {
        drawTool.clearAll()
        drawTool = null
      }
      if (measure) {
        measure._drawLayer.entities.removeAll()
        measure = null
      }
      if (waterEntity) {
        viewer.entities.remove(waterEntity)
        waterEntity = null
      }
      if (waterTimer) {
        clearInterval(waterTimer)
      }
      // if (Arrow) {
      //   Arrow.disable()
      // }

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
    cerateMaskReverseSelect,
    cerateRoadEntity,
    cerateRoadPrimitive,
    cerateRadiant,
    cerateDiffuse,
    cerateWater,
    cerateSkybox,
    cerateDraw,
    cerateMeasure,
    cerateWaterFlood,
    cerateSkyLine,
    cerateTimeLine,
    cerateSnow,
    cerateRain,
    cerateFog,
    cerateFire
  }
})
