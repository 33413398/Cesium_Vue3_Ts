<script lang="ts" setup>
import { onMounted, ref, onBeforeUnmount } from 'vue'
import * as Cesium from 'cesium'
import 'cesium/Build/CesiumUnminified/Widgets/widgets.css'
import { useMapStore } from '@/stores/map'
import ShowLngLat from '@/components/ShowLngLat.vue'
import modifyMapStyle from '@/utils/modifyMapStyle'

// 实例化store
const mapStore = useMapStore()

// 传来的参数
interface Props {
  mapConfig: Cesium.Viewer.ConstructorOptions
}
const props = withDefaults(defineProps<Props>(), {
  mapConfig: undefined
})
// 传来的事件
const emit = defineEmits([])
const ShowLngLatRef = ref()
const viewerDivRef = ref<HTMLDivElement>()
let viewer: Cesium.Viewer | null = null
const sysBaseUrl = import.meta.env.BASE_URL
const mode = import.meta.env.MODE
const sourceCesiumBaseUrl = import.meta.env.VITE_CESIUM_BASE_URL

// 在不同的 base 路径下（vite.config.ts 中的 base 配置
// 尤其是开发模式用的是拷贝来的 CesiumJS 库文件，最好拼接上 base 路径
// 生产模式使用 CDN 则不用拼接 base 路径
const cesiumBaseUrl =
  mode === 'development' ? `${sysBaseUrl}${sourceCesiumBaseUrl}` : sourceCesiumBaseUrl
window.CESIUM_BASE_URL = cesiumBaseUrl
console.log(`模式: ${mode}, CESIUM_BASE_URL: ${cesiumBaseUrl}`)

const tdtKey = import.meta.env.VITE_TDT_KEY
onMounted(() => {
  viewer = new Cesium.Viewer(viewerDivRef.value as HTMLElement, {
    // imageryProvider: new TileMapServiceImageryProvider({
    //   // 对于 CESIUM_BASE_URL 下的静态资源，推荐用 buildModuleUrl 获取
    //   url: buildModuleUrl('Assets/Textures/NaturalEarthII'),
    // }),
    // @ts-ignore
    imageryProvider: new Cesium.WebMapTileServiceImageryProvider({
      url:
        'http://t{s}.tianditu.gov.cn/vec_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=vec&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=' +
        tdtKey,
      subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
      layer: 'tdtImgLayer',
      style: 'default',
      format: 'image/jpeg',
      tileMatrixSetID: 'GoogleMapsCompatible'
    }),
    ...props.mapConfig
  })
  // 配置地图
  // 解决文字标注不清晰问题
  viewer.scene.postProcessStages.fxaa.enabled = true
  // 隐藏太阳和月亮
  viewer.scene.sun.show = false
  viewer.scene.moon.show = false
  // 天地图添加
  viewer.imageryLayers.addImageryProvider(
    new Cesium.WebMapTileServiceImageryProvider({
      url:
        'http://t{s}.tianditu.gov.cn/vec_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=vec&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=' +
        tdtKey,
      subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
      layer: 'tdtImgLayer',
      style: 'default',
      format: 'image/jpeg',
      tileMatrixSetID: 'GoogleMapsCompatible'
    })
  )
  viewer.imageryLayers.addImageryProvider(
    new Cesium.WebMapTileServiceImageryProvider({
      url:
        'http://t{s}.tianditu.com/cva_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=cva&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=' +
        tdtKey,
      subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
      layer: 'tdtAnnoLayer',
      style: 'default',
      format: 'image/jpeg',
      tileMatrixSetID: 'GoogleMapsCompatible',
      maximumLevel: 18
    })
  )
  // 是否使用高动态范围渲染
  viewer.scene.highDynamicRange = false
  modifyMapStyle(viewer, {
    //反色?
    invertColor: false,
    //滤镜值
    filterRGB: [47,156,251],
  })
  const imageryLayer: any = viewer.imageryLayers.get(0)
  viewer.scene.globe.baseColor = new Cesium.Color(0, 40 / 255, 102 / 255)
  imageryLayer.alpha = 0.75 // 图层透明度值，取值范围为0.0~1.0。
  imageryLayer.brightness = 1 // 图层亮度值。值为1.0表示使用原图；值大于1.0时图像将变亮；值小于1.0时图像将变暗。
  imageryLayer.contrast = -1.2 // 图层对比度。值为1.0表示使用原图；值大于1.0表示增加对比度；值小于1.0表示降低对比度。
  imageryLayer.hue = 3 // 图层色调。值为0.0表示使用原图。
  // imageryLayer.saturation = 1 // 图层饱和度。值为1.0表示使用原图；值大于1.0表示增加饱和度；值小于1.0表示降低饱和度。
  // imageryLayer.gamma = 1 // 图层伽马校正。值为1.0表示使用原图。

  // 更换右键和中键
  viewer.scene.screenSpaceCameraController.tiltEventTypes = [
    Cesium.CameraEventType.RIGHT_DRAG,
    Cesium.CameraEventType.PINCH,
    {
      eventType: Cesium.CameraEventType.LEFT_DRAG,
      modifier: Cesium.KeyboardEventModifier.CTRL
    },
    {
      eventType: Cesium.CameraEventType.RIGHT_DRAG,
      modifier: Cesium.KeyboardEventModifier.CTRL
    }
  ]
  viewer.scene.screenSpaceCameraController.zoomEventTypes = [
    Cesium.CameraEventType.WHEEL,
    Cesium.CameraEventType.PINCH
  ]

  viewer.scene.screenSpaceCameraController.zoomEventTypes = [
    Cesium.CameraEventType.MIDDLE_DRAG,
    Cesium.CameraEventType.WHEEL,
    Cesium.CameraEventType.PINCH
  ]
  // 显示经纬度绑定事件
  ShowLngLatRef.value.initCesiumHandler(viewer)
  // 添加到仓库
  mapStore.setViewer(viewer)
  // 挂载到全局变量
  window.GViewer = viewer
  // 定位
  mapStore.setMapLocatingSignals([113.9332, 22.5212, 28860], 'noFlyTo')
})
onBeforeUnmount(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
    mapStore.setViewer(null)
  }
})
</script>

<template>
  <div ref="viewerDivRef" class="map"></div>
  <ShowLngLat ref="ShowLngLatRef" />
</template>
