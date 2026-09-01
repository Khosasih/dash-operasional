<script setup lang="ts">
import BaseCard from './BaseCard.vue'
import type { SecuritySummary } from '../types/dashboard'

defineProps<{
  data: SecuritySummary
}>()
</script>

<template>
  <BaseCard title="Security Summary" subtitle="(This Month)">
    <div class="sec-body">
      <!-- Upper part: Critical Security Incidents -->
      <div class="incidents-section">
        <span
          class="incidents-val"
          :class="{ 'critical-text': data.criticalSecurityIncidents > 0 }"
        >
          {{ data.criticalSecurityIncidents }}
        </span>
        <span class="incidents-lbl">Critical Security Incidents</span>
      </div>

      <div class="divider-horizontal"></div>

      <!-- Lower part: Vulnerabilities & Patch Compliance -->
      <div class="split-stats-section">
        <div class="stat-col">
          <span class="stat-val" :class="{ 'warning-text': data.criticalVulnerabilitiesOpen > 0 }">
            {{ data.criticalVulnerabilitiesOpen }}
          </span>
          <span class="stat-lbl">Critical Vulns Open</span>
        </div>
        <div class="divider-vertical"></div>
        <div class="stat-col">
          <span class="stat-val good-text">{{ data.patchCompliance.toFixed(1) }}%</span>
          <span class="stat-lbl">Patch Compliance</span>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.sec-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-around;
  padding: 4px 0;
}

.incidents-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.incidents-val {
  font-size: 30px;
  font-weight: 800;
  color: var(--color-good); /* Good by default (green) if 0 */
  line-height: 1;
}

.incidents-val.critical-text {
  color: var(--color-critical);
}

.incidents-lbl {
  font-size: 10.5px;
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
  color: var(--color-navy);
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
