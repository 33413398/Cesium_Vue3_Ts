import './assets/styles/index.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
// 响应式rem
import '@/utils/reSize'
import VueCesium from 'vue-cesium'
import 'vue-cesium/dist/index.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)
// @ts-ignore
const sysBaseUrl = '/node_modules/cesium/Build/CesiumUnminified/Cesium.js'
// @ts-ignore
const mode = import.meta.env.MODE
// @ts-ignore
const sourceCesiumBaseUrl = import.meta.env.VITE_CESIUM_BASE_URL
const cesiumBaseUrl = mode === 'development' ? `${sysBaseUrl}` : sourceCesiumBaseUrl
app.use(createPinia())
app.use(router)
app.use(ElementPlus, { size: 'small', zIndex: 3000 })

app.use(VueCesium, {
  cesiumPath: cesiumBaseUrl, // 将默认使用 https://unpkg.com/cesium@latest/Build/Cesium/Cesium.js
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhYWM0YzcwMS1lOTQyLTRmZGUtYjI4NC04OTEwNzkwNjhlOGMiLCJpZCI6MTA5Mjg4LCJpYXQiOjE2NjQyMDY2Mzd9.3NK8SNjCMd8chjFa-lhZhvnoTmbaFDvmwnMDGTLi0o8' // 你的 Cesium Ion 访问令牌
})
// 由于Cesium更新可能有破坏性更新，建议在生产环境中锁定 Cesium 版本
// app.use(VueCesium, {
//   cesiumPath: 'https://unpkg.com/cesium@1.104.0/Build/Cesium/Cesium.js'
// })

app.mount('#app')
