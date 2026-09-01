<script setup lang="ts">
import BaseCard from './BaseCard.vue'
import type { InfraHealthMetric } from '../types/dashboard'

defineProps<{
  data: InfraHealthMetric[]
}>()

// Dynamic ApexCharts options for mini gauges
const getChartOptions = (metricVal: number) => {
  let fillColor = '#0F8B8D' // Teal primary for infra
  if (metricVal === 100) fillColor = '#22A447'
  else if (metricVal < 50) fillColor = '#FF1F2D'
  else if (metricVal < 98) fillColor = '#F59E0B'

  return {
    chart: {
      type: 'radialBar',
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: '56%',
        },
        track: {
          background: 'rgba(15, 139, 141, 0.08)',
          strokeWidth: '100%',
        },
        dataLabels: {
          name: { show: false },
          value: {
            offsetY: 4,
            fontSize: '11px',
            fontWeight: 800,
            color: '#14213D',
            formatter: (val: number) => `${val}%`,
          },
        },
      },
    },
    fill: {
      type: 'solid',
      colors: [fillColor],
    },
    stroke: {
      lineCap: 'round',
    },
  }
}
// const getHealthStatus = (value: number) => {
//   if (value < 90) return 'danger'
//   if (value < 70) return 'warning'
//   return 'healthy'
// }

// const getHealthLabel = (value: number) => {
//   if (value < 90) return 'Danger'
//   if (value < 70) return 'Warning'
//   return 'Healthy'
// }
</script>

<template>
  <BaseCard title="Infrastructure Health" subtitle="">
    <div class="health-body">
      <div class="gauges-container">
        <!-- 5 columns grid -->
        <div class="gauges-flex">
          <div v-for="metric in data" :key="metric.name" class="gauge-item">
            <span class="metric-name">{{ metric.name }}</span>

            <div class="chart-wrapper">
              <apexchart
                type="radialBar"
                height="70"
                width="70"
                :options="getChartOptions(metric.value)"
                :series="[metric.value]"
              />
            </div>

            <span class="metric-name"> Healthy</span>

            <!-- <span :class="['metric-status', getHealthStatus(metric.value)]">
              {{ getHealthLabel(metric.value) }}
            </span> -->
          </div>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.health-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
}

.gauges-container {
  width: 100%;
  overflow: hidden;
}

.gauges-flex {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 2px;
  align-items: center;
  justify-items: center;
  width: 100%;
}

.gauge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.chart-wrapper {
  width: 54px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-name {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  line-height: 1.1;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.metric-status {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.metric-status.healthy {
  color: #22a447;
}

.metric-status.warning {
  color: #f59e0b;
}

.metric-status.danger {
  color: #dc2626;
}
</style>
