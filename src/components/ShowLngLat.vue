<template>
  <div class="ShowLngLatContainer">
    <span>lng:{{ lng }}</span> <span>lat:{{ lat }}</span> <span>height:{{ height }}</span>
  </div>
</template>
<script lang="ts" setup name="ShowLngLat">
import { ref, } from 'vue'
import * as Cesium from "cesium"

const lng = ref<string>()
const lat = ref<string>()
let height = ref<string>()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const initCesiumHandler = (Viewer: any) => {
  const canvas = Viewer.scene.canvas
  const ellipsoid = Viewer.scene.globe.ellipsoid
  const handler = new Cesium.ScreenSpaceEventHandler(canvas)
  handler.setInputAction(function (movement: any) {
    const cartesian = Viewer.camera.pickEllipsoid(
      movement.endPosition,
      ellipsoid
    )
    if (cartesian) {
      const cartographic = Viewer.scene.globe.ellipsoid.cartesianToCartographic(
        cartesian
      )
      lat.value = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4)
      lng.value = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4)
      height.value = (
        Viewer.camera.positionCartographic.height / 1000
      ).toFixed(2) + '千米'
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
}
defineExpose({
  initCesiumHandler
})
</script>
<style lang="scss">
.distance-legend {
  right: 1.4rem;
}
</style>
<style lang="scss" scoped>
.ShowLngLatContainer {
  position: absolute;
  bottom: 0px;
  padding: 0.2rem 0.3rem 0.2rem 0.3rem;
  color: white;
  font-size: 0.7rem;
  right: 0;
  background-color: #00000055;
  width: 8.75rem;

  span {
    margin-right: 0.3rem;
  }

  span:last-child {
    margin-right: 0.3rem;
  }
}
</style>