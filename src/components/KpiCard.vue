<script setup lang="ts">
import { computed } from 'vue'
import { Network, Server, Cpu, Shield } from 'lucide-vue-next'
import BaseCard from './BaseCard.vue'

const props = defineProps<{
  name: string
  sla: number
  target: number
  status: 'good' | 'warning' | 'critical'
  color: 'blue' | 'purple' | 'orange' | 'teal'
  sparklineData: number[]
}>()

// Determine icon dynamically
const kpiIcon = computed(() => {
  if (props.color === 'blue') return Network
  if (props.color === 'purple') return Server
  if (props.color === 'orange') return Cpu
  return Shield
})

// CSS color values mapping
// const cssColorValue = computed(() => {
//   if (props.color === 'blue') return '#2563EB'
//   if (props.color === 'purple') return '#6D3DB5'
//   if (props.color === 'orange') return '#F59E0B'
//   return '#0F8B8D' // teal
// })

const targetAchieved = computed(() => props.sla >= props.target)

// Sparkline graph options
// const chartSeries = computed(() => [
//   {
//     name: 'SLA History',
//     data: props.sparklineData,
//   },
// ])

// const chartOptions = computed(() => ({
//   chart: {
//     type: 'line',
//     sparkline: {
//       enabled: true,
//     },
//   },
//   stroke: {
//     curve: 'smooth',
//     width: 2,
//   },
//   colors: [cssColorValue.value],
//   tooltip: {
//     fixed: {
//       enabled: false,
//     },
//     x: {
//       show: false,
//     },
//     y: {
//       formatter: (val: number) => `${val.toFixed(2)}%`,
//     },
//     marker: {
//       show: false,
//     },
//   },
// }))
</script>

<template>
  <BaseCard>
    <div class="kpi-card-content">
      <!-- Upper Section -->
      <div class="kpi-header">
        <div class="icon-frame" :class="color">
          <component :is="kpiIcon" class="kpi-icon" />
        </div>
        <!-- <div class="status-pill" :class="status">
          {{ status }}
        </div> -->
      </div>

      <!-- Metric Details -->
      <div class="kpi-details">
        <h4 class="service-name">{{ name }}</h4>
        <div class="sla-row">
          <div class="sla-main">
            <span class="sla-num">{{ sla.toFixed(2) }}%</span>
            <span class="cell-lbl">SLA</span>
          </div>
          <span class="target-badge" :class="{ pass: targetAchieved, fail: !targetAchieved }">
            Target &ge; {{ target.toFixed(2) }}%
          </span>
        </div>
      </div>

      <!-- Sparkline Trend Chart -->
      <!-- <div class="kpi-trend">
        <span class="trend-lbl">Weekly SLA Trend</span>
        <div class="chart-wrapper">
          <apexchart
            type="line"
            height="30"
            width="100%"
            :options="chartOptions"
            :series="chartSeries"
          />
        </div>
      </div> -->
    </div>
  </BaseCard>
</template>

<style scoped>
.kpi-card-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
  gap: var(--space-md);
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.icon-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
}

.icon-frame.blue {
  background-color: var(--color-blue-bg);
  color: var(--color-blue);
}
.icon-frame.purple {
  background-color: var(--color-purple-bg);
  color: var(--color-purple);
}
.icon-frame.orange {
  background-color: var(--color-warning-bg);
  color: var(--color-warning);
}
.icon-frame.teal {
  background-color: var(--color-teal-bg);
  color: var(--color-teal);
}

.kpi-icon {
  width: 18px;
  height: 18px;
}

.status-pill {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
}

.status-pill.good {
  background-color: var(--color-good-bg);
  color: var(--color-good);
  border-color: rgba(34, 164, 71, 0.2);
}
.status-pill.warning {
  background-color: var(--color-warning-bg);
  color: var(--color-warning);
  border-color: rgba(245, 158, 11, 0.2);
}
.status-pill.critical {
  background-color: var(--color-critical-bg);
  color: var(--color-critical);
  border-color: rgba(220, 38, 38, 0.2);
}

.kpi-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.service-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.sla-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.sla-num {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.cell-lbl {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 5px;
  line-height: 1.1;
}

.target-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.target-badge.pass {
  background-color: var(--color-good-bg);
  color: var(--color-good);
}

.target-badge.fail {
  background-color: var(--color-critical-bg);
  color: var(--color-critical);
}

.kpi-trend {
  border-top: 1px dashed var(--color-border);
  padding-top: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trend-lbl {
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.chart-wrapper {
  height: 30px;
}
</style>
