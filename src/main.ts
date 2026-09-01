import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import VueApexCharts from 'vue3-apexcharts'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Initialize PrimeVue with Aura preset
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.app-dark-mode-disabled', // Disables automatic dark mode theme switching from OS settings
    },
  },
})

// Initialize ApexCharts globally
app.use(VueApexCharts)

app.mount('#app')
