<script setup lang="ts" name="homeView">
import MyMap from '@/components/MyMap.vue';
import { Viewer } from 'cesium'
import { ref } from 'vue'
import { useMapStore } from '@/stores/map'

// 实例化store
const mapStore = useMapStore()

const isCollapse = ref(false)
const handleOpen = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}
const handleClose = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}

const menuItemClick = (e: any) => {
  // mapStore.clearMapAll(e.index === 'clearAll')
  mapStore.clearMapAll(false)
  if (e.index === 'point' || e.index === 'clusterPoint') {
    mapStore.createPoint(e.index)
  } else if (e.index === 'heatMap') {
    mapStore.cerateCesiumHeatMap()
  } else if (e.index === 'colorLayer') {
    mapStore.cerateColorLayer()
  } else if (e.index === 'maskReverseSelect') {
    mapStore.cerateMaskReverseSelect()
  } else if (e.index === 'roadEntity') {
    mapStore.cerateRoadEntity()
  } else if (e.index === 'roadPrimitive') {
    mapStore.cerateRoadPrimitive()
  } else if (e.index === 'radiant') {
    mapStore.cerateRadiant()
  } else if (e.index === 'diffuse') {
    mapStore.cerateDiffuse()
  } else if (e.index === 'water') {
    mapStore.cerateWater()
  } else if (e.index === 'skybox') {
    mapStore.cerateSkybox()
  } else if (e.index === 'draw-point'
    || e.index === 'draw-line'
    || e.index === 'draw-surface') {
    mapStore.cerateDraw(e.index)
  } else if (e.index === 'measure-jl'
    || e.index === 'measure-mj'
    || e.index === 'measure-sj') {
    mapStore.cerateMeasure(e.index)
  } else if (e.index === 'waterFlood') {
    mapStore.cerateWaterFlood()
  } else if (e.index === 'skyLine') {
    mapStore.cerateSkyLine()
  } else if (e.index === 'timeLine') {
    mapStore.cerateTimeLine()
  } else if (e.index === 'snow') {
    mapStore.cerateSnow()
  } else if (e.index === 'rain') {
    mapStore.cerateRain()
  } else if (e.index === 'fog') {
    mapStore.cerateFog()
  } else if (e.index === 'fire') {
    mapStore.cerateFire()
  } else {
    if (e.index != 'clearAll') {
      console.log('当前选中项未匹配到:' + e.index);
    }
  }

}

const menuItemList = ref([
  {
    id: 'base',
    title: 'Cesium基础',
    children: [
      {
        id: 'point',
        title: '普通撒点',
      },
      {
        id: 'clusterPoint',
        title: '聚合撒点',
      },
      {
        id: 'heatMap',
        title: '热力图',
      },
      {
        id: 'colorLayer',
        title: '四色图',
      },
      {
        id: 'maskReverseSelect',
        title: '遮罩反选',
      },
      {
        id: 'roadEntity',
        title: '路网穿梭(entity渲染)',
      },
      {
        id: 'roadPrimitive',
        title: '路网穿梭(primitive渲染)',
      },
      {
        id: 'radiant',
        title: '辐射圈',
      },
      {
        id: 'diffuse',
        title: '圆扩散',
      },
      {
        id: 'scene',
        title: '场景相关',
        children: [
          {
            id: 'water',
            title: '流动水面',
          },
          {
            id: 'skybox',
            title: '天空盒',
          },
          {
            id: 'skyLine',
            title: '天际线分析',
          },
          {
            id: 'timeLine',
            title: '时间轴(白/夜分界线)',
          },
        ]
      },
      {
        id: 'particle',
        title: '粒子效果',
        children: [
          {
            id: 'snow',
            title: '下雪',
          },
          {
            id: 'rain',
            title: '下雨',
          },
          {
            id: 'fog',
            title: '大雾',
          },
          {
            id: 'fire',
            title: '火焰',
          },
          {
            id: 'clearAll2',
            title: '清空地图',
          },
        ]
      },
      {
        id: 'geometry',
        title: '几何相关',
        children: [
          {
            id: 'draw-point',
            title: '绘制点',
          },
          {
            id: 'draw-line',
            title: '绘制线',
          },
          {
            id: 'draw-surface',
            title: '绘制面',
          },
          {
            id: 'measure-jl',
            title: '空间距离',
          },
          {
            id: 'measure-mj',
            title: '空间面积',
          },
          {
            id: 'measure-sj',
            title: '三角量测',
          },
          // {
          //   id: 'waterFlood',
          //   title: '水淹模拟',
          // },
          {
            id: 'clearAll3',
            title: '清空地图',
          },
        ]
      },
      {
        id: 'clearAll',
        title: '清空地图',
      },
    ]
  },
  {
    id: 'Vue3Cesium',
    title: 'CesiumVue3组件库',
    children: []
  },
  {
    id: 'cesium_dev_kit',
    title: 'CesiumKit组件库',
    children: []
  },
])

const defaultOpeneds = ref([1])
// 地图配置
const mapConfig: Viewer.ConstructorOptions = {
  animation: false, // 是否开启动画
  infoBox: false, // 禁用沙箱，不显示图形信息，解决控制台报错
  baseLayerPicker: false, // 隐藏默认地图
  fullscreenButton: false, // 全屏按钮是否显示
  geocoder: false, //是否显示搜索组件
  homeButton: false, // 是否显示主页按钮
  requestRenderMode: false, // 启用请求渲染模式
  useBrowserRecommendedResolution: true, //是否使用浏览器推荐的分辨率
  // maximumRenderTimeChange: Infinity, // 无操作时自动渲染帧率，设为数字会消耗性能，Infinity为无操作不渲染
  sceneModePicker: false, // 是否显示 3D/2D 切换按钮
  navigationHelpButton: false, // 是否显示导航帮助按钮
  timeline: false, // 是否显示时间线
  selectionIndicator: false, // 是否显示选取指示器组件
  shouldAnimate: true, // 自动播放动画控件
  shadows: false, // 是否显示光照投影的阴影
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
            <el-sub-menu :index="item.id">
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
          </template>
        </el-scrollbar>
      </el-menu>
    </div>
    <MyMap :mapConfig="mapConfig"></MyMap>
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
</style>