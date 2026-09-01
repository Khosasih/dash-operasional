<script setup lang="ts">
import BaseCard from './BaseCard.vue'
import type { IncidentSummary } from '../types/dashboard'

defineProps<{
  data: IncidentSummary
}>()
</script>

<template>
  <BaseCard title="Incident Summary" subtitle="(This Month)">
    <div class="incident-body">
      <!-- Upper part: Total Tickets -->
      <div class="total-tickets-section">
        <span class="total-val">{{ data.totalTickets }}</span>
        <span class="total-lbl">Total Tickets</span>
      </div>

      <div class="divider-horizontal"></div>

      <!-- Lower part: P1 & Problem Tickets -->
      <div class="split-stats-section">
        <div class="stat-col">
          <span class="stat-val good-text">{{ data.p1Incidents }}</span>
          <span class="stat-lbl">Solved</span>
        </div>
        <div class="divider-vertical"></div>
        <div class="stat-col">
          <span class="stat-val" :class="{ 'critical-text': data.problemTickets > 0 }">{{
            data.problemTickets
          }}</span>
          <span class="stat-lbl">Unsolved</span>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.incident-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-around;
  padding: 4px 0;
}

.total-tickets-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.total-val {
  font-size: 30px;
  font-weight: 800;
  color: var(--color-navy);
  line-height: 1;
}

.total-lbl {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-top: 3px;
}

.divider-horizontal {
  height: 1px;
  background-color: var(--color-border);
  width: 100%;
  margin: 6px 0;
}

.split-stats-section {
  display: flex;
  align-items: center;
  width: 100%;
}

.stat-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-val {
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
}

.stat-val.critical-text {
  color: var(--color-critical);
}

.stat-val.warning-text {
  color: var(--color-warning);
}

.stat-val.good-text {
  color: var(--color-good);
}

.stat-lbl {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: 2px;
}

.divider-vertical {
  width: 1px;
  height: 32px;
  background-color: var(--color-border);
}
</style>
