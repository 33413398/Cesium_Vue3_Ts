<script setup lang="ts">
import { ref, nextTick } from "vue"
import { onMounted } from "vue"
import useMapStore from "@/store/mapStore"

onMounted(() => {
    // 仓库
    const mapStore = useMapStore()
    // 初始化地图
    mapStore.createViewer()
    nextTick(() => {
        mapStore.setMapLocatingSignals([116.39, 39.91, 100000], "flyTo")
        mapStore.createPoint([116.39, 39.91, 0])
        mapStore.createLine([116.39, 39.91, 116.4, 39.91])
        mapStore.createPlane([116.39, 39.91, 116.4, 39.91, 116.4, 39.99])
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
