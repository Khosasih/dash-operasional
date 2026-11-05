<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import BaseCard from './BaseCard.vue'

const props = withDefaults(
  defineProps<{
    value: number
    noCard?: boolean
  }>(),
  {
    noCard: false,
  },
)

const series = computed(() => [props.value])

const chartOptions = computed(() => ({
  chart: {
    type: 'radialBar',
    sparkline: {
      enabled: true,
    },
  },
  plotOptions: {
    radialBar: {
      startAngle: -120,
      endAngle: 120,
      hollow: {
        size: '72%',
      },
      track: {
        background: 'rgba(6, 43, 91, 0.05)',
        strokeWidth: '95%',
      },
      dataLabels: {
        name: {
          show: true,
          color: '#64748B',
          fontSize: '9px',
          fontWeight: 600,
          offsetY: 16,
        },
        value: {
          offsetY: -15,
          fontSize: '28px',
          fontWeight: 800,
          color: '#062B5B',
          formatter: (val: number) => `${val.toFixed(2)}%`,
        },
      },
    },
  },
  fill: {
    type: 'solid',
    colors: ['#22A447'], // Status good hijau
  },
  stroke: {
    lineCap: 'round',
  },
  labels: ['Overall SLA\nThis Month'],
}))
</script>

<template>
  <template v-if="noCard">
    <div class="gauge-container">
      <div class="chart-wrapper">
        <apexchart type="radialBar" height="145" :options="chartOptions" :series="series" />
      </div>

      <div class="target-row">
        <span class="check-box">
          <Check class="check-icon" />
        </span>
        <span class="target-lbl">Target &ge; 99.50%</span>
      </div>
    </div>
  </template>
  <BaseCard v-else title="Overall Highlight" subtitle="Monthly aggregated service level agreement score">
    <div class="gauge-container">
      <div class="chart-wrapper">
        <apexchart type="radialBar" height="190" :options="chartOptions" :series="series" />
      </div>

      <div class="target-row-default">
        <span class="target-lbl">Target: &ge; 98.00%</span>
        <span class="status-badge good">Good</span>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.gauge-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.chart-wrapper {
  margin-top: -5px;
}

.target-row {
  margin-top: -5px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.target-row-default {
  margin-top: -5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.target-lbl {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--text-secondary);
}

.check-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  background-color: var(--color-good);
  border-radius: 50%;
  color: #ffffff;
}

.check-icon {
  width: 9px;
  height: 9px;
  stroke-width: 4;
}
</style>
