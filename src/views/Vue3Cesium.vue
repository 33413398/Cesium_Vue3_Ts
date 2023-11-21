<script setup lang="ts" name="Vue3Cesium">
import { ref, onMounted, reactive } from 'vue'
import * as myCesium from 'cesium'
import { useRouter } from "vue-router"
import modifyMapStyle from '@/utils/modifyMapStyle'
import ShowLngLat from '@/components/ShowLngLat.vue'


const viewerRef = ref<HTMLElement>()

const Cesium = ref(null)
const viewer = ref<any>(null)
const ShowLngLatRef = ref()
// Cesium 变量即命名空间，你可以通过它访问 CesiumJS 原生的 API，例如 Cesium.Cartesian3；而 viewer 参数则是观察者实例，参考 CesiumJS 官方文档即可。
onMounted(() => {
  //  ref 模板引用在组件生命周期内随时获取这两个变量。
  // viewerRef.value.creatingPromise.then((readyObj: VcReadyObject) => {
  //   console.log(readyObj.Cesium) // Cesium namespace object
  //   console.log(readyObj.viewer) // instanceof Cesium.Viewer
  // })
})

// ready 事件回调函数的参数可以解构成 Cesium 和 viewer 两个变量
const onViewerReady = (readyObj: any) => {
  // console.log(readyObj.Cesium) // Cesium namespace object
  // console.log(readyObj.viewer) // instanceof Cesium.Viewer
  Cesium.value = readyObj.Cesium
  viewer.value = readyObj.viewer
  // 定位天津
  let position: any = myCesium.Cartesian3.fromDegrees(120.318595, 31.497397, 400000)
  readyObj.viewer.camera.setView({
    destination: position,
    orientation: {
      heading: myCesium.Math.toRadians(0),
      pitch: myCesium.Math.toRadians(-90),
      roll: 0
    }
  })
  // 显示经纬度绑定事件
  ShowLngLatRef.value.initCesiumHandler(readyObj.viewer)
  // 更换右键和中键
  readyObj.viewer.scene.screenSpaceCameraController.tiltEventTypes = [
    readyObj.Cesium.CameraEventType.RIGHT_DRAG,
    readyObj.Cesium.CameraEventType.PINCH,
    {
      eventType: readyObj.Cesium.CameraEventType.LEFT_DRAG,
      modifier: readyObj.Cesium.KeyboardEventModifier.CTRL
    },
    {
      eventType: readyObj.Cesium.CameraEventType.RIGHT_DRAG,
      modifier: readyObj.Cesium.KeyboardEventModifier.CTRL
    }
  ]
  readyObj.viewer.scene.screenSpaceCameraController.zoomEventTypes = [
    readyObj.Cesium.CameraEventType.WHEEL,
    readyObj.Cesium.CameraEventType.PINCH
  ]

  readyObj.viewer.scene.screenSpaceCameraController.zoomEventTypes = [
    readyObj.Cesium.CameraEventType.MIDDLE_DRAG,
    readyObj.Cesium.CameraEventType.WHEEL,
    readyObj.Cesium.CameraEventType.PINCH
  ]
}
const router = useRouter()
const isCollapse = ref(false)
const handleOpen = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}
const handleClose = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}

const currentMenu = ref('')
const menuItemClick = (e: any) => {
  currentMenu.value = e.index
  if (viewer.value) {
    if (e.index === 'base') {
      router.push('/')
    } else if (e.index === 'cesiumDevKit') {
      router.push(e.index)
    } else if (e.index === 'VcAnalysisFlood') {
      viewer.value.scene.globe.depthTestAgainstTerrain = true
      viewer.value.camera.setView({
        destination: new myCesium.Cartesian3(-1432246.8223880068, 5761224.588247942, 3297281.1889481535),
        orientation: {
          heading: 6.20312220367255,
          pitch: -0.9937536846355606,
          roll: 0.002443376981836387
        }
      })
    } else {

    }
  }

}

const menuItemList = ref<any>([
  {
    id: 'base',
    title: 'Cesium基础',
  },
  {
    id: 'Vue3Cesium',
    title: 'CesiumVue3组件库', // https://zouyaoji.top/vue-cesium/#/zh-CN
    children: [
      {
        id: 'VcAnalysisFlood',
        title: '淹没分析',
      },
      {
        id: 'VcOverlayWindmap',
        title: '风场图',
      },
      {
        id: 'VcOverlayTyphoon',
        title: '台风',
      },
    ]
  },
  {
    id: 'cesiumDevKit',
    title: 'CesiumDevKit组件库', // https://github.com/dengxiaoning/cesium_dev_kit
  },
])

const defaultOpeneds = ref([1])
const tdtKey = import.meta.env.VITE_TDT_KEY

function mapImageReady() {
  modifyMapStyle(viewer.value, {
    //反色?
    invertColor: false,
    //滤镜值
    filterRGB: [47, 156, 250],
  })
}

const options = {
}

// 淹没模拟
const flood = ref()
const minHeight = ref(-1)
const maxHeight = ref(4000)
const speed = ref(10)
const polygonHierarchy = ref([
  [102.1, 29.5],
  [106.2, 29.5],
  [106.2, 33.5],
  [102.1, 33.5]
])
const pausing = ref(false)
const starting = ref(false)

function unload() {
  flood.value.unload()
}
function load() {
  flood.value.load()
}
function reload() {
  flood.value.reload()
}
function start() {
  flood.value.start()
  pausing.value = false
  starting.value = true
}
function pause() {
  flood.value.pause()
  pausing.value = !pausing.value
}
function stop() {
  flood.value.stop()
  pausing.value = false
  starting.value = false
}
function onStoped(e: any) {
  pausing.value = false
  starting.value = false
  console.log(e)
}
</script>

<template>
  <div class="common-layout">
    <div class="layout-menu" :style="!isCollapse ? 'left: 0;' : 'left: -10rem;'">
      <div class="menu-btn" @click="isCollapse = !isCollapse">
        <img src="/images/right.png" v-if="isCollapse" alt="展开">
        <img src="/images/left.png" v-else alt="收缩">
      </div>
      <el-menu unique-opened :default-openeds="defaultOpeneds" background-color="#001428" text-color="#c0c4cc"
        active-text-color="#4D9EFC" class="el-menu-vertical-demo" :collapse="isCollapse" @open="handleOpen"
        @close="handleClose" popper-effect="dark">
        <el-scrollbar max-height="43rem">
          <template v-for="item in menuItemList" :key="item.id">
            <el-sub-menu :index="item.id" v-if="item?.children?.length">
              <template #title>
                <span>{{ item.title }}</span>
              </template>
              <template v-for="citem in item.children" :key="citem.id">
                <template v-if="citem?.children?.length">
                  <el-sub-menu :index="citem.id">
                    <template #title><span>{{ citem.title }}</span></template>
                    <el-menu-item @click="menuItemClick" :index="ccitem.id" v-for="ccitem in citem.children"
                      :key="ccitem.id">{{ ccitem.title }}</el-menu-item>
                  </el-sub-menu>
                </template>
                <template v-else>
                  <el-menu-item @click="menuItemClick" :index="citem.id">{{ citem.title }}</el-menu-item>
                </template>
              </template>
            </el-sub-menu>
            <el-menu-item v-else @click="menuItemClick" :index="item.id">{{ item.title }}</el-menu-item>
          </template>
        </el-scrollbar>
      </el-menu>
    </div>
    <!-- ecsium-vue 插件相关 -->
    <vc-viewer :options="options" ref="viewerRef" @ready="onViewerReady" :showCredit="false" touchHoldArg="500"
      containerId="cesiumContainer" :skyAtmosphere="false" :skyBox="false">
      <!-- 加载天地图 - 底图 -->
      <vc-layer-imagery :sortOrder="2" :show="true" :alpha="0.75">
        <vc-imagery-provider-singletile :rectangle="[80, 22, 130, 50]"
          url="https://mapv-data.oss-cn-hangzhou.aliyuncs.com/Cesium-1.82-hawk/background.png"></vc-imagery-provider-singletile>
      </vc-layer-imagery>

      <vc-layer-imagery @ready="mapImageReady" :sortOrder="1" :show="true" :alpha="1.6" :brightness="1" :contrast="-1.2"
        :hue="3.2" :colorToAlphaThreshold="0.3">
        <vc-imagery-provider-tianditu mapStyle="vec_w" :token="tdtKey"></vc-imagery-provider-tianditu>
      </vc-layer-imagery>
      <!-- 加载天地图 - 标记(省份名称之类的标签) -->
      <vc-layer-imagery :sortOrder="3" :show="true">
        <vc-imagery-provider-tianditu mapStyle="cva_w" :token="tdtKey"></vc-imagery-provider-tianditu>
      </vc-layer-imagery>
      <!-- 淹没模拟 -->
      <vc-analysis-flood ref="flood" :min-height="minHeight" :max-height="maxHeight" :speed="speed"
        :polygon-hierarchy="polygonHierarchy" @stop="onStoped" color="rgba(205,171,59,0.6)">
      </vc-analysis-flood>
      <template v-if="currentMenu === 'VcAnalysisFlood'">
        <vc-layer-imagery :sortOrder="1">
          <vc-imagery-provider-tianditu map-style="img_c" :token="tdtKey"></vc-imagery-provider-tianditu>
        </vc-layer-imagery>
        <vc-terrain-provider-cesium></vc-terrain-provider-cesium>
      </template>
    </vc-viewer>
    <ShowLngLat ref="ShowLngLatRef" />
    <!-- 淹没模拟相关操作 -->
    <template v-if="currentMenu === 'VcAnalysisFlood'">
      <el-row class="demo-toolbar">
        <el-button type="danger" round @click="unload">销毁</el-button>
        <el-button type="danger" round @click="load">加载</el-button>
        <el-button type="danger" round @click="reload">重载</el-button>
        <el-button type="danger" round @click="start">开始</el-button>
        <el-button :disabled="!starting" type="danger" round @click="pause">{{ pausing ? '继续' : '暂停' }}</el-button>
        <el-button type="danger" round @click="stop">结束</el-button>
      </el-row>
    </template>
  </div>
</template>
<style lang="scss" scoped>
.common-layout {
  position: relative;
  width: 100%;
  height: 100%;

  .el-menu {
    border-right: solid 1px transparent;
  }

  .layout-menu {
    position: absolute;
    top: 5%;
    left: 0;
    z-index: 9;
    width: 10rem;
    height: 80%;
    // background-color: rgba(000, 000, 000, .5);
    border-radius: 0.5rem;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    transition: all .3s;

    .menu-btn {
      position: absolute;
      right: -1.5rem;
      top: 1%;
      // transform: translateY(-50%);
      cursor: pointer;
      transition: all .3s;

      img {
        width: 1.5rem;
        height: 2rem;
      }
    }
  }
}

.demo-toolbar {
  position: absolute;
  left: 15%;
  top: 1%;
  z-index: 9;
  padding: 0.5rem;
  background-color: rgba(204, 204, 204, .6);
  border-radius: 1rem;
}
</style>