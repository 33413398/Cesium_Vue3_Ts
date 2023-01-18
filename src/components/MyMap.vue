<script setup lang="ts">
import { ref, nextTick, reactive } from "vue"
import { onMounted } from "vue"
import useMapStore from "@/store/mapStore"
// 仓库
const mapStore = useMapStore()

onMounted(() => {
    // 仓库
    const mapStore = useMapStore()
    // 初始化地图
    mapStore.createViewer()
    nextTick(() => {
        mapStore.setMapLocatingSignals([116.39, 39.7, 20000], "flyTo")
    })
})
// 菜单项
const menuBtn = reactive([
    {
        id: 1,
        name: "点",
        fun: function () {
            mapStore.createPoint([116.39, 39.91, 0])
        },
    },
    {
        id: 2,
        name: "线",
        fun: function () {
            mapStore.createLine([116.39, 39.91, 116.6, 39.91])
        },
    },
    {
        id: 3,
        name: "面",
        fun: function () {
            mapStore.createPlane([116.39, 39.91, 0])
        },
    },
    {
        id: 4,
        name: "文本",
        fun: function () {
            mapStore.createText([116.39, 39.91, 0])
        },
    },
    {
        id: 5,
        name: "多边形",
        fun: function () {
            mapStore.createPolygon([116.39, 39.91, 116.39, 39.915, 116.395, 39.91])
        },
    },
    {
        id: 6,
        name: "模型",
        fun: function () {
            mapStore.createModel([116.39, 39.91], "/models/CesiumAir/Cesium_Air.glb", 1000)
        },
    },
    {
        id: 6,
        name: "移动模型",
        fun: function () {
            mapStore.createMoveModel([116.39, 39.91])
        },
    },
])
</script>

<template>
    <div class="map" id="map"></div>
    <div class="map-menu-list">
        <div class="map-menu-item" v-for="item in menuBtn" :key="item.id" @click="item.fun">
            {{ item.name }}
        </div>
    </div>
</template>

<style scoped lang="scss">
.map {
    width: 100%;
    height: 100%;
}
.map-menu-list {
    position: absolute;
    left: 0;
    top: 0;
    background-color: rgba(000, 000, 000, 0.5);
    color: #fff;
    padding: 10px;
    border-radius: 4px;
    overflow: hidden;
    overflow-y: auto;
    max-height: 800px;
    .map-menu-item {
        margin: 10px;
        transition: all 0.5s;
        font-size: 20px;
        padding: 5px 20px;
        border: 1px solid #fff;
        border-radius: 4px;
        text-align: center;
        &:hover {
            color: #fff;
            font-weight: 700;
            cursor: pointer;
            background-color: #2c507f;
        }
    }
}
</style>
