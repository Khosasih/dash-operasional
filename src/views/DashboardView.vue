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
      <div v-if="store.loading && !store.isLoaded" class="loading-container">
        <div class="spinner"></div>
        <span class="loading-label">Fetching executive metrics...</span>
      </div>

      <main
        v-else-if="store.isLoaded"
        class="dashboard-elements"
        :style="{ '--dashboard-scale': String(dashboardScale) }"
      >
        <!-- Baris 1: Overall Highlight dan Key Highlights -->
        <section class="top-row">
          <BaseCard title="Overall Hightlight" subtitle="" class="overall-highlight-combined-card">
            <div class="overview-inner-layout">
              <div class="gauge-col">
                <OverallSlaGauge :value="store.currentData?.overallSla || 0" :noCard="true" />
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
          />
        </section>

        <!-- Baris 3: Utilization dan PICA -->
        <section class="bottom-row">
          <UtilizationTable :data="store.filteredUtilization" />
          <PicaActionPlan />
        </section>
      </main>
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
  gap: var(--space-md);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-blue);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-navy);
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
</style>
