import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/kelolaFile',
      name: 'kelola-file',
      component: () => import('../views/KelolaFileView.vue'),
    },
  ],

})

export default router

