import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/homeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'homeView',
      component: HomeView
    },
    {
      path: '/Vue3Cesium',
      name: 'Vue3Cesium',
      component: () => import('@/views/Vue3Cesium.vue')
    },
    {
      path: '/cesiumDevKit',
      name: 'cesiumDevKit',
      component: () => import('@/views/cesiumDevKit.vue')
    }
  ]
})

export default router
