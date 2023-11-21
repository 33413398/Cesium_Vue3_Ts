<script setup lang="ts" name="cesiumDevKit">
import { ref, onMounted, nextTick, onBeforeUnmount, reactive } from 'vue'
import { useRouter } from "vue-router"
// import { initCesium } from '@/utils/cesiumPluginsExtends/index'
import { initCesium } from 'cesium_dev_kit'
import * as Cesium from 'cesium'
const router = useRouter()

const isCollapse = ref(false)
const handleOpen = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}
const handleClose = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}

const menuItemClick = (e: any) => {
  if (e.index === 'base') {
    router.push('/')
  } else if (e.index === 'Vue3Cesium') {
    router.push(e.index)
  } else {

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
  },
  {
    id: 'cesiumDevKit',
    title: 'CesiumDevKit组件库', // https://github.com/dengxiaoning/cesium_dev_kit
  },
])

const defaultOpeneds = ref([1])

let c_viewer = ref(null)
let material = ref(null)
let graphics = ref(null)
function initMap() {
  const tempData = [
    {
      id: 3,
      name: '高德地图02',
      type: 'UrlTemplateImageryProvider',
      classConfig: {
        url: 'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
      },
      interfaceConfig: {},
      offset: '0,0',
      invertswitch: 0,
      filterRGB: '#ffffff',
      showswitch: 1,
      weigh: 13,
      createtime: 1624346908,
      updatetime: 1647395260,
    },
    {
      id: 14,
      name: '高德地图01',
      type: 'UrlTemplateImageryProvider',
      classConfig: {
        url: 'https://webst03.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&style=7',
      },
      interfaceConfig: {
        saturation: 0,
        brightness: 0.6,
        contrast: 1.8,
        hue: 1,
        gamma: 0.3,
      },
      offset: '0,0',
      invertswitch: 1,
      filterRGB: '#4e70a6',
      showswitch: 1,
      weigh: 0,
      createtime: 1624326728,
      updatetime: 1646979297,
    },
  ]
  const {
    viewer,   // viewer
    material, // 材质模块（修改实体材质）
    graphics, // 图形模块（如创建PolygonGraphics对象等）
    math3d, // 三维数学工具
    sceneMang,
    primitive, // 图元操作对象（如使用primivite创建polygon等）
    draw, // 绘制模块（如多边形，矩形）
    passEffect, // 后置处理模块
    customCesiumPlugin,
    control, // 控制模块（如模型位置调整，拖拽等）
    plugin, // 额外插件（如拓展css3的动画 ，地形裁剪）
    base, // 基础模块（如坐标转换，图层初始化等）
    analysis, // 分析模块（如坡度，坡向，可视域，通视分析）
    attackArrowObj, // 标绘（攻击）
    straightArrowObj,// 标绘（直击）
    pincerArrowObj, // 标绘（钳击）
  } = new initCesium(
    {
      cesiumGlobal: Cesium,
      containerId: 'cesiumContainer',
      viewerConfig: {
        infoBox: false,
        shouldAnimate: true,
      },
      extraConfig: {
        depthTest: true,
      },
      MapImageryList: tempData
    })


  c_viewer.value = viewer;

  material.value = material;
  graphics.value = graphics;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 999999999.0
  viewer.dataSources.add(Cesium.CzmlDataSource.load('static/data/file/beidou.czml'))
  viewer.scene.skyBox = graphics.value.setOneSkyBox();
  viewer.scene.globe.enableLighting = true;

  let mapGrid = new Cesium.GridImageryProvider();
  let layerGrid = viewer.imageryLayers.addImageryProvider(mapGrid)
  viewer.imageryLayers.raiseToTop(layerGrid)
  let _rota = Date.now();
  function rotate() {
    let a = .1;
    let t = Date.now();
    let n = (t - _rota) / 1e3;
    _rota = t;
    viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -a * n);
  }
  viewer.clock.onTick.addEventListener(rotate);
  setTimeout(() => {
    viewer.delegate.clock.onTick.removeEventListener(rotate);
  }, 2000000)
}
onMounted(() => {
  nextTick(() => {
    initMap()
  })
})
onBeforeUnmount(() => {
  c_viewer.value = null;
  material.value = null;
  graphics.value = null;
})
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
    <div id="cesiumContainer" class="map3d-contaner"></div>
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

.map3d-contaner {
  width: 100%;
  height: 100%;
  overflow: hidden;

  .ctrl-group {
    position: absolute;
    top: 10px;
    right: 20px;
    z-index: 999;

    .reset-home-btn {
      color: #36a3f7;
      cursor: pointer;
    }
  }
}
</style>