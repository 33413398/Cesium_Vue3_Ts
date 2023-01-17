<script setup lang="ts">
import { ref, nextTick } from "vue"
import * as Cesium from "cesium"
import { onMounted } from "vue"
import { useMapStore } from "@/store/mapStore"
// 仓库
const mapStore = useMapStore()
// 地图实例
const myMap = ref()
onMounted(() => {
    myMap.value = new Cesium.Viewer("map", {
        infoBox: false, // 禁用沙箱，解决控制台报错
    })
    nextTick(() => {
        // 保存地图实例到全局状态管理器
        mapStore.setMapObj(myMap.value)
    })
})
</script>

<template>
    <div class="map" id="map"></div>
</template>

<style scoped>
.map {
    width: 100%;
    height: 100%;
}
</style>
