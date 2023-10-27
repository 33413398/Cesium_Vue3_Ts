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
  function cerateDraw(type: string) {
    if (viewer) {
      if (type === 'draw-point') {
        // 点
      } else if (type === 'draw-line') {
        // 线
      } else if (type === 'draw-surface') {
        // 面
      } else {
        console.log('绘制类型未开发:', type)
      }
    }
  }
  // 量测
  function cerateMeasure(type: string) {
    if (viewer) {
      if (type === 'measure-jl') {
        // 空间距离
      } else if (type === 'measure-mj') {
        // 空间面积
      } else if (type === 'measure-sj') {
        // 三角量测
      } else {
        console.log('测量类型未开发:', type)
      }
    }
  }
  // 态势图
  function cerateArrow() {
    if (viewer) {
    }
  }
  // 水淹模拟
  function cerateWaterFlood() {
    if (viewer) {
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
  function cerateFire() {
    if (viewer) {
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
    cerateArrow,
    cerateWaterFlood,
    cerateSkyLine,
    cerateTimeLine,
    cerateSnow,
    cerateRain,
    cerateFog,
    cerateFire
  }
})
