<script setup lang="ts">
import BaseCard from './BaseCard.vue'
import type { ServiceDesk } from '../types/dashboard'

defineProps<{
  data: ServiceDesk
}>()
</script>

<template>
  <BaseCard title="Service Desk Performance" subtitle="(This Month)">
    <div class="perf-body">
      <div class="metrics-grid">
        <!-- Avg Resolution -->
        <div class="perf-cell">
          <span class="cell-val">
            {{ data.avgResolutionTime.toFixed(1) }} <span class="cell-unit">HRS</span>
          </span>
          <span class="cell-lbl">Actual SLA</span>
          <span class="cell-target">(Target &lt; 48 Hrs)</span>
        </div>

        <!-- FCR -->
        <div class="perf-cell">
          <span class="cell-val">{{ data.firstCallResolution }}%</span>
          <span class="cell-lbl">Actual SLA</span>
          <span class="cell-target">(Target &gt; 80%)</span>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.perf-body {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background-color: var(--color-border);
  gap: 1px;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.perf-cell {
  background-color: #ffffff;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  justify-content: center;
  min-height: 56px;
}

.cell-val {
  font-size: 36px;
  font-weight: 800;
  color: var(--color-navy);
  line-height: 1.1;
}

.cell-val.critical-text {
  color: var(--color-critical);
}

.cell-unit {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}

.cell-lbl {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  margin-top: 3px;
  line-height: 1.1;
}

.cell-target {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 1px;
}
</style>
