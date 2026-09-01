<script setup lang="ts">
// import { computed } from 'vue'
import {
  MapPin,
  RefreshCw,
  Monitor,
  Calendar,
  // Clock
} from 'lucide-vue-next'
import { useDashboardStore } from '../stores/dashboard'
import Select from 'primevue/select'
// import DatePicker from 'primevue/datepicker'

const store = useDashboardStore()

// Local representation of date picker
// const datePickerModel = computed({
//   get: () => {
//     if (!store.displayAsOfDate) return null
//     return new Date(store.displayAsOfDate)
//   },
//   set: (val: Date | null) => {
//     if (!val) {
//       store.displayAsOfDate = ''
//       return
//     }
//     const yyyy = val.getFullYear()
//     const mm = String(val.getMonth() + 1).padStart(2, '0')
//     const dd = String(val.getDate()).padStart(2, '0')
//     store.displayAsOfDate = `${yyyy}-${mm}-${dd}`
//   },
// })

// Trigger reload of data
const reloadDashboard = async () => {
  await store.loadDashboardData()
}
</script>

<template>
  <header class="dashboard-header">
    <div class="header-container">
      <!-- Left side: Title and subtitle -->
      <div class="brand-section">
        <div class="logo-box">
          <Monitor class="logo-icon" />
        </div>
        <div class="title-meta">
          <h1 class="main-title">IT OPERATIONS DASHBOARD</h1>
          <span class="main-subtitle">Executive Summary – {{ store.selectedPeriod }}</span>
        </div>
      </div>

      <!-- Right side: Mockup-style White Control Boxes -->
      <div class="controls-section">
        <!-- Box 1: Reporting Period -->
        <div class="header-control-box">
          <div class="box-icon-container">
            <Calendar class="box-icon" />
          </div>
          <div class="box-content">
            <span class="box-label">Reporting Period</span>
            <Select
              v-model="store.selectedPeriod"
              :options="store.periods"
              placeholder="Select Period"
              class="period-select-custom"
              @change="store.selectPeriod(store.selectedPeriod)"
            />
          </div>
        </div>

        <!-- Box 2: Data as of -->
        <!-- <div class="header-control-box">
          <div class="box-icon-container">
            <Clock class="box-icon" />
          </div> -->
        <!-- <div class="box-content">
            <span class="box-label">Data as of</span>
            <DatePicker
              v-model="datePickerModel"
              dateFormat="yy-mm-dd"
              placeholder="Select Date"
              class="header-datepicker-custom"
            />
          </div> -->
        <!-- </div> -->

        <!-- Box 3: Locations Monitored -->
        <div class="header-control-box static-box">
          <div class="box-icon-container">
            <MapPin class="box-icon" />
          </div>
          <div class="box-content">
            <span class="box-value-large"
              >{{ store.currentData?.locationsMonitored || 0 }} Locations</span
            >
            <span class="box-label-lower">Monitored</span>
          </div>
        </div>

        <!-- Sync Button -->
        <button
          class="sync-btn"
          @click="reloadDashboard"
          :disabled="store.loading"
          title="Sync/Reload Data"
        >
          <RefreshCw class="sync-icon" :class="{ spinning: store.loading }" />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.dashboard-header {
  background-color: var(--color-navy-dark);
  color: #ffffff;
  padding: 8px var(--space-lg);
  border-bottom: 3px solid var(--color-blue);
  box-shadow: var(--shadow-md);
  width: 100%;
}

.header-container {
  max-width: 100%;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.brand-section {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.logo-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: var(--color-blue);
  border-radius: var(--radius-sm);
  box-shadow: 0 0 10px rgba(37, 99, 235, 0.4);
}

.logo-icon {
  width: 22px;
  height: 22px;
  color: #ffffff !important;
}

.title-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.main-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.03em;
  margin: 0;
  color: #ffffff !important;
}

.main-subtitle {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7) !important;
}

.controls-section {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.header-control-box {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  padding: 4px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: var(--shadow-sm);
  min-height: 44px;
}

.box-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-blue);
}

.box-icon {
  width: 18px;
  height: 18px;
  stroke-width: 2.2;
}

.box-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.box-label {
  font-size: 8px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.2;
}

.box-label-lower {
  font-size: 9px;
  font-weight: 600;
  color: var(--text-secondary);
  line-height: 1.2;
}

.box-value-large {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

/* Custom transparent styles for dropdown and datepicker */
:deep(.period-select-custom.p-select) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  height: auto !important;
  width: 100px !important;
}

:deep(.period-select-custom.p-select .p-select-label) {
  color: var(--text-primary) !important;
  padding: 0 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
}

:deep(.period-select-custom.p-select .p-select-dropdown) {
  color: var(--text-secondary) !important;
  width: 12px !important;
  height: 12px !important;
}

:deep(.header-datepicker-custom.p-datepicker) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  width: 100px !important;
}

:deep(.header-datepicker-custom.p-datepicker input) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: var(--text-primary) !important;
  padding: 0 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  width: 100% !important;
}

:deep(.header-datepicker-custom.p-datepicker button) {
  display: none !important; /* Hide default icon button since we have our custom icon */
}

.sync-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-sm);
  color: var(--text-light);
  cursor: pointer;
  transition: var(--transition-smooth);
}

.sync-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
}

.sync-icon {
  width: 13px;
  height: 13px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 767px) {
  .header-container {
    flex-direction: column;
    align-items: flex-start;
  }
  .controls-section {
    width: 100%;
    justify-content: space-between;
  }
  .header-control-box {
    flex-grow: 1;
  }
}
</style>
