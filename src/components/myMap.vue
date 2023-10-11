<script lang="ts" setup>
import { onMounted, ref, onBeforeUnmount } from 'vue'
import * as Cesium from "cesium"
import 'cesium/Build/CesiumUnminified/Widgets/widgets.css'
import { useMapStore } from "@/stores/map"

// 实例化store
const mapStore = useMapStore()

// 传来的参数
interface Props {
  mapConfig: Cesium.Viewer.ConstructorOptions
}
const props = withDefaults(defineProps<Props>(), {
  mapConfig: undefined
});
// 传来的事件
const emit = defineEmits([]);

const viewerDivRef = ref<HTMLDivElement>()
let viewer: Cesium.Viewer | null = null
const sysBaseUrl = import.meta.env.BASE_URL
const mode = import.meta.env.MODE
const sourceCesiumBaseUrl = import.meta.env.VITE_CESIUM_BASE_URL

// 在不同的 base 路径下（vite.config.ts 中的 base 配置
// 尤其是开发模式用的是拷贝来的 CesiumJS 库文件，最好拼接上 base 路径
// 生产模式使用 CDN 则不用拼接 base 路径
const cesiumBaseUrl = mode === 'development' ? `${sysBaseUrl}${sourceCesiumBaseUrl}` : sourceCesiumBaseUrl
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
    imageryProvider: new Cesium.WebMapTileServiceImageryProvider(
      {
        url: "http://t{s}.tianditu.gov.cn/vec_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=vec&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=" + tdtKey,
        subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
        layer: "tdtImgLayer",
        style: "default",
        format: "image/jpeg",
        tileMatrixSetID: "GoogleMapsCompatible"
      }
    ),
    ...props.mapConfig
  })
  // 配置地图
  // 解决文字标注不清晰问题
  viewer.scene.postProcessStages.fxaa.enabled = true
  // 隐藏太阳和月亮
  viewer.scene.sun.show = false
  viewer.scene.moon.show = false
  // 天地图添加
  viewer.imageryLayers.addImageryProvider(new Cesium.WebMapTileServiceImageryProvider({
    url: "http://t{s}.tianditu.gov.cn/vec_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=vec&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=" + tdtKey,
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
    layer: "tdtImgLayer",
    style: "default",
    format: "image/jpeg",
    tileMatrixSetID: "GoogleMapsCompatible"
  }))
  viewer.imageryLayers.addImageryProvider(new Cesium.WebMapTileServiceImageryProvider({
    url: "http://t{s}.tianditu.com/cva_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=cva&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=" + tdtKey,
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
    layer: "tdtAnnoLayer",
    style: "default",
    format: "image/jpeg",
    tileMatrixSetID: "GoogleMapsCompatible",
    maximumLevel: 18
  }))
  // 是否使用高动态范围渲染
  viewer.scene.highDynamicRange = false
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

  viewer.scene.screenSpaceCameraController.zoomEventTypes = [Cesium.CameraEventType.MIDDLE_DRAG, Cesium.CameraEventType.WHEEL, Cesium.CameraEventType.PINCH]
  // 添加到仓库
  mapStore.setViewer(viewer)
  // 定位
  mapStore.setMapLocatingSignals([116.39, 39.7, 20000], "flyTo")
})
onBeforeUnmount(() => {
  if (viewer) {
    viewer.destroy();
    viewer = null
    mapStore.setViewer(null)
  }
})
</script>


<template>
  <div ref="viewerDivRef" class="map"></div>
</template>
