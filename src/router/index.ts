import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/homeView/homeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'homeView',
      component: HomeView
    }
    // {
    //   path: '/BigScreen',
    //   name: 'BigScreen',
    //   component: () => import('@/views/BigScreen.vue')
    // },
  ]
})

export default router
