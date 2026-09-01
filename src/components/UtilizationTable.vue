<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import BaseCard from './BaseCard.vue'
import { Building2, Server } from 'lucide-vue-next'
import type { UtilizationMetric } from '../types/dashboard'

defineProps<{
  data: UtilizationMetric[]
}>()

// Helper to determine progress bar color
const getStorageColorClass = (val: number) => {
  if (val >= 90) return 'critical'
  if (val >= 75) return 'warning'
  return 'good'
}

// Sparkline configuration
const getSparkOptions = (color: string) => ({
  chart: {
    type: 'line',
    sparkline: { enabled: true },
    animations: { enabled: false },
  },
  stroke: {
    curve: 'smooth',
    width: 1.5,
  },
  colors: [color],
  tooltip: { enabled: false },
})

const getLocationIcon = (location: string) => {
  if (location.toLowerCase().includes('pluit')) return Server
  return Building2
}
</script>

<template>
  <BaseCard title="Infrastructure Utilization Summary" subtitle="">
    <div class="table-wrapper">
      <DataTable :value="data" responsiveLayout="scroll" class="p-datatable-sm custom-util-table">
        <!-- Location -->
        <Column field="location" header="Location" style="width: 120px">
          <template #body="{ data }">
            <div class="location-cell">
              <component :is="getLocationIcon(data.location)" class="loc-icon" />
              <span class="location-txt">{{ data.location }}</span>
            </div>
          </template>
        </Column>

        <!-- CPU (Avg / Peak) -->
        <Column header="CPU (Avg / Peak)">
          <template #body="{ data }">
            <div class="spark-cell">
              <div class="metric-vals">
                <span class="avg">{{ data.cpuAvg }}%</span>
                <span class="slash">/</span>
                <span class="peak">{{ data.cpuPeak }}%</span>
              </div>
              <div class="sparkline-wrapper">
                <apexchart
                  type="line"
                  height="12"
                  width="70"
                  :options="getSparkOptions('#2563EB')"
                  :series="[{ name: 'CPU', data: data.cpuSparkline }]"
                />
              </div>
            </div>
          </template>
        </Column>

        <!-- Memory (Avg / Peak) -->
        <Column header="Memory (Avg / Peak)">
          <template #body="{ data }">
            <div class="spark-cell">
              <div class="metric-vals">
                <span class="avg">{{ data.memAvg }}%</span>
                <span class="slash">/</span>
                <span class="peak">{{ data.memPeak }}%</span>
              </div>
              <div class="sparkline-wrapper">
                <apexchart
                  type="line"
                  height="12"
                  width="70"
                  :options="getSparkOptions('#6D3DB5')"
                  :series="[{ name: 'Memory', data: data.memSparkline }]"
                />
              </div>
            </div>
          </template>
        </Column>

        <!-- Storage Used -->
        <Column header="Storage Used" style="min-width: 120px">
          <template #body="{ data }">
            <div class="storage-cell">
              <div class="pct-row">
                <span class="pct-val">{{ data.storageUsed }}%</span>
              </div>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  :class="getStorageColorClass(data.storageUsed)"
                  :style="{ width: `${data.storageUsed}%` }"
                ></div>
              </div>
            </div>
          </template>
        </Column>

        <!-- WAN YTD -->
        <Column header="WAN YTD">
          <template #body="{ data }">
            <div class="ytd-cell">
              <span class="ytd-val">{{ data.wanYtd }}%</span>
            </div>
          </template>
        </Column>

        <!-- WAN Utilization (Avg / Peak) -->
        <Column header="WAN Utilization (Avg / Peak)">
          <template #body="{ data }">
            <div class="spark-cell">
              <div class="metric-vals">
                <span class="avg">{{ data.wanAvg }}%</span>
                <span class="slash">/</span>
                <span class="peak">{{ data.wanPeak }}%</span>
              </div>
              <div class="sparkline-wrapper">
                <apexchart
                  type="line"
                  height="12"
                  width="70"
                  :options="getSparkOptions('#0F8B8D')"
                  :series="[{ name: 'WAN', data: data.wanSparkline }]"
                />
              </div>
            </div>
          </template>
        </Column>

        <!-- Status -->
        <Column header="Status" style="width: 100px">
          <template #body="{ data }">
            <span class="status-cell">
              <span class="status-dot" :class="data.status.toLowerCase()"></span>
              <span class="status-txt">{{ data.status }}</span>
            </span>
          </template>
        </Column>
      </DataTable>
    </div>
  </BaseCard>
</template>

<style scoped>
.table-wrapper {
  width: 100%;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.location-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loc-icon {
  width: 15px;
  height: 15px;
  color: var(--color-navy);
}

.location-txt {
  font-weight: 700;
  color: var(--color-navy);
  font-size: 11.5px;
}

.spark-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
}

.metric-vals {
  display: flex;
  align-items: baseline;
}

.metric-vals .avg {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.metric-vals .slash {
  font-size: 10px;
  color: var(--text-secondary);
  margin: 0 2px;
}

.metric-vals .peak {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
}

.sparkline-wrapper {
  width: 70px;
  height: 12px;
  display: flex;
  align-items: center;
}

.storage-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  max-width: 110px;
}

.pct-row {
  display: flex;
  align-items: baseline;
  font-size: 10px;
  font-weight: 700;
}

.pct-val {
  font-size: 12px;
  color: var(--text-primary);
}

.bar-track {
  height: 5px;
  background-color: var(--bg-page);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  overflow: hidden;
  width: 100%;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius-sm);
}

.bar-fill.good {
  background-color: var(--color-good);
}
.bar-fill.warning {
  background-color: var(--color-warning);
}
.bar-fill.critical {
  background-color: var(--color-critical);
}

.status-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.good {
  background-color: var(--color-good);
}

.status-dot.warning {
  background-color: var(--color-warning);
}

.status-dot.critical {
  background-color: var(--color-critical);
}

.status-txt {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.ytd-cell {
  display: flex;
  align-items: center;
}

.ytd-val {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-primary);
}

/* Custom tightening of PrimeVue DataTable specifically for dashboard */
:deep(.custom-util-table.p-datatable) {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

:deep(.custom-util-table.p-datatable .p-datatable-wrapper) {
  flex-grow: 1;
}

:deep(.custom-util-table.p-datatable .p-datatable-tbody > tr) {
  height: 85px;
}

:deep(.custom-util-table.p-datatable .p-datatable-tbody > tr > td) {
  padding: 20px 10px !important;
  vertical-align: middle !important;
}

:deep(.custom-util-table.p-datatable .p-datatable-thead > tr > th) {
  padding: 6px 10px !important;
  font-size: 10px !important;
}
</style>
