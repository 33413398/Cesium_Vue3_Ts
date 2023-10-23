<script setup lang="ts" name="homeView">
import MyMap from '@/components/MyMap.vue';
import { Viewer } from 'cesium'
import { ref } from 'vue'

const isCollapse = ref(false)
const handleOpen = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}
const handleClose = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}

const menuItemClick = (e: any) => {
  console.log(e.index);
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
      }
    ]
  }
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
    <div class="layout-menu" :style="!isCollapse ? 'left: 0;' : 'left: -2rem;'">
      <div class="menu-btn" @click="isCollapse = !isCollapse">
        <img src="/images/right.png" v-if="isCollapse" alt="展开">
        <img src="/images/left.png" v-else alt="收缩">
      </div>
      <el-menu :default-openeds="defaultOpeneds" background-color="#001428" text-color="#c0c4cc" active-text-color="#fff"
        class="el-menu-vertical-demo" :collapse="isCollapse" @open="handleOpen" @close="handleClose" popper-effect="dark">
        <el-scrollbar height="80%">
          <el-sub-menu :index="item.id" v-for="item in menuItemList" :key="item.id">
            <template #title>
              <span>{{ item.title }}</span>
            </template>
            <template v-if="item.children?.length">
              <el-menu-item @click="menuItemClick" :index="citem.id" v-for="citem in item.children" :key="citem.id">{{
                citem.title
              }}</el-menu-item>
            </template>
          </el-sub-menu>
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

  .layout-menu {
    position: absolute;
    top: 5%;
    left: 0;
    z-index: 9;
    width: 2rem;
    height: 80%;
    // background-color: rgba(000, 000, 000, .5);
    border-radius: 0.1rem;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    transition: all .3s;

    .menu-btn {
      position: absolute;
      right: -0.35rem;
      top: 1%;
      // transform: translateY(-50%);
      cursor: pointer;
      transition: all .3s;

      img {
        width: 0.35rem;
        height: 0.5rem;
      }
    }
  }
}
</style>