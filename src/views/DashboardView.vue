<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useDashboardStore } from '../stores/dashboard'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import BaseCard from '../components/BaseCard.vue'
import OverallSlaGauge from '../components/OverallSlaGauge.vue'
import KpiCard from '../components/KpiCard.vue'
import KeyHighlights from '../components/KeyHighlights.vue'
import IncidentSummary from '../components/IncidentSummary.vue'
import ServiceDeskPerformance from '../components/ServiceDeskPerformance.vue'
import SecuritySummary from '../components/SecuritySummary.vue'
import InfrastructureHealth from '../components/InfrastructureHealth.vue'
import UtilizationTable from '../components/UtilizationTable.vue'
import PicaActionPlan from '../components/PicaActionPlan.vue'

const store = useDashboardStore()
const dashboardViewport = ref<HTMLElement | null>(null)
const dashboardScale = ref(1)

const DESIGN_WIDTH = 1440
const DESIGN_HEIGHT = 760

function fitDashboard() {
  if (!dashboardViewport.value) return

  const { width, height } = dashboardViewport.value.getBoundingClientRect()

  dashboardScale.value = Math.min(1, width / DESIGN_WIDTH, height / DESIGN_HEIGHT)
}

onMounted(async () => {
  await store.loadPeriods()
  await store.loadDashboardData()

  await nextTick()
  fitDashboard()

  window.addEventListener('resize', fitDashboard)
  window.addEventListener('orientationchange', fitDashboard)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', fitDashboard)
  window.removeEventListener('orientationchange', fitDashboard)
})
</script>

<template>
  <DashboardLayout>
    <div ref="dashboardViewport" class="dashboard-viewport">
      <!-- Initial Loading Screen (when data has never been loaded yet) -->
      <div v-if="store.loading && !store.isLoaded" class="loading-container">
        <div class="loading-card initial-card">
          <div class="spinner-visual">
            <div class="spinner-core"></div>
            <div class="spinner-pulse"></div>
          </div>
          <div class="loading-text-group">
            <span class="loading-period-title">Memuat IT Operations Dashboard</span>
            <span class="loading-period-desc">Mengambil data eksekutif & metrik sistem...</span>
          </div>
        </div>
      </div>

      <main
        v-else-if="store.isLoaded"
        class="dashboard-elements"
        :class="{ 'is-loading-data': store.loading }"
        :style="{ '--dashboard-scale': String(dashboardScale) }"
      >
        <!-- Baris 1: Overall Highlight dan Key Highlights -->
        <section class="top-row">
          <BaseCard title="Overall Hightlight" subtitle="" class="overall-highlight-combined-card">
            <div class="overview-inner-layout">
              <div class="gauge-col">
                <OverallSlaGauge :value="store.computedOverallSla" :noCard="true" />
              </div>
              <div class="divider-line"></div>
              <div class="kpis-col">
                <div class="kpis-grid">
                  <KpiCard
                    v-for="service in store.currentData?.services"
                    :key="service.name"
                    v-bind="service"
                  />
                </div>
              </div>
            </div>
          </BaseCard>

          <KeyHighlights :items="store.currentData?.highlights || []" />
        </section>

        <!-- Baris 2: 4 kartu ringkasan -->
        <section class="summaries-grid">
          <IncidentSummary
            v-if="store.currentData?.incidents"
            :data="store.currentData.incidents"
          />

          <ServiceDeskPerformance
            v-if="store.currentData?.serviceDesk"
            :data="store.currentData.serviceDesk"
          />

          <SecuritySummary v-if="store.currentData?.security" :data="store.currentData.security" />

          <InfrastructureHealth
            v-if="store.currentData?.infraHealth"
            :data="store.currentData.infraHealth"
            :utilization="store.filteredUtilization"
          />
        </section>

        <!-- Baris 3: Utilization dan PICA -->
        <section class="bottom-row">
          <UtilizationTable :data="store.filteredUtilization" />
          <PicaActionPlan />
        </section>
      </main>

      <!-- Smooth Loading Overlay for period change or refresh -->
      <transition name="loading-fade">
        <div v-if="store.loading && store.isLoaded" class="period-loading-overlay">
          <div class="loading-card">
            <div class="spinner-visual">
              <div class="spinner-core"></div>
              <div class="spinner-pulse"></div>
            </div>
            <div class="loading-text-group">
              <span class="loading-period-title">Memuat Periode {{ store.selectedPeriod }}</span>
              <span class="loading-period-desc">Mengambil data metrik performa & analitik...</span>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </DashboardLayout>
</template>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.dashboard-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

/* Grid layout for 1-screen Dashboard */
.dashboard-elements {
  display: grid;
  grid-template-rows: 1.15fr 1.1fr 1.75fr;
  gap: 12px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  transition: opacity 0.25s ease, filter 0.25s ease;
}

.dashboard-elements.is-loading-data {
  filter: blur(1.5px);
  opacity: 0.55;
  pointer-events: none;
  user-select: none;
}

/* Loading Overlay & Cards */
.period-loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(241, 245, 249, 0.45);
  backdrop-filter: blur(3px);
  z-index: 50;
  pointer-events: all;
}

.loading-card {
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06);
  border-radius: var(--radius-md, 12px);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  animation: scaleIn 0.25s ease-out;
}

.loading-card.initial-card {
  box-shadow: var(--shadow-md);
}

.spinner-visual {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.spinner-core {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: var(--color-blue, #2563eb);
  border-right-color: var(--color-blue, #2563eb);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(37, 99, 235, 0.25);
  animation: pulseLoader 1.5s ease-out infinite;
}

.loading-text-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.loading-period-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-navy-dark, #0f172a);
}

.loading-period-desc {
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

/* Row 1: Combined card + Highlights */
.top-row {
  display: grid;
  grid-template-columns: 2.2fr 1fr;
  gap: 12px;
  min-height: 0;
}

.overall-highlight-combined-card {
  height: 100%;
}

.overview-inner-layout {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 12px;
}

.gauge-col {
  width: 130px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.divider-line {
  width: 1px;
  height: 80%;
  background-color: var(--color-border);
  flex-shrink: 0;
}

.kpis-col {
  flex: 1;
  min-width: 0;
}

.kpis-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

/* Row 2: 4 cards */
.summaries-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  min-height: 0;
}

.summaries-grid > *:last-child {
  grid-column: span 2;
}

/* Row 3: Table + PICA */
.bottom-row {
  display: grid;
  grid-template-columns: 1.7fr 1fr;
  gap: 12px;
  min-height: 0;
}

/* Ensure all row grid components scale their contents without overflow */
.top-row > *,
.summaries-grid > *,
.bottom-row > * {
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulseLoader {
  0% {
    transform: scale(0.85);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.35);
    opacity: 0;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.94);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
