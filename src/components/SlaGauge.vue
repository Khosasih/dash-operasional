<script setup lang="ts">
import { computed } from 'vue'
import BaseCard from './BaseCard.vue'

const props = defineProps<{
  value: number
}>()

const chartSeries = computed(() => [props.value])

const chartOptions = computed(() => ({
  chart: {
    type: 'radialBar',
    sparkline: {
      enabled: true
    }
  },
  plotOptions: {
    radialBar: {
      startAngle: -110,
      endAngle: 110,
      hollow: {
        size: '72%'
      },
      track: {
        background: 'rgba(6, 43, 91, 0.05)',
        strokeWidth: '97%'
      },
      dataLabels: {
        name: {
          show: true,
          color: '#64748B',
          fontSize: '11px',
          fontWeight: 600,
          offsetY: 20
        },
        value: {
          offsetY: -15,
          fontSize: '28px',
          fontWeight: 700,
          color: '#062B5B',
          formatter: (val: number) => `${val.toFixed(2)}%`
        }
      }
    }
  },
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'light',
      type: 'horizontal',
      shadeIntensity: 0.5,
      gradientToColors: ['#22A447'], // Green
      inverseColors: true,
      opacityFrom: 1,
      opacityTo: 1,
      stops: [0, 100],
      colorStops: [
        {
          offset: 0,
          color: '#2563EB', // Blue
          opacity: 1
        },
        {
          offset: 100,
          color: '#22A447', // Green
          opacity: 1
        }
      ]
    }
  },
  stroke: {
    lineCap: 'round'
  },
  labels: ['OVERALL SLA Target: 99.9%']
}))
</script>

<template>
  <BaseCard title="Overall SLA Status" subtitle="Combined metrics across monitored channels">
    <div class="gauge-container">
      <apexchart
        type="radialBar"
        height="180"
        :options="chartOptions"
        :series="chartSeries"
      />
      
      <div class="target-indicator">
        <span class="status-pill" :class="value >= 99.9 ? 'good' : 'warning'">
          {{ value >= 99.9 ? 'Target Achieved' : 'Below Target' }}
        </span>
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
  position: relative;
  padding-top: var(--space-xs);
}

.target-indicator {
  margin-top: -10px;
  text-align: center;
}
</style>
