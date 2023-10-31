<script setup lang="ts" name="Vue3Cesium">
import { ref } from 'vue'
import { useRouter } from "vue-router"

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
  } else if (e.index === 'cesiumDevKit') {
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