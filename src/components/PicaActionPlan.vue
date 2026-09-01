<script setup lang="ts">
import { Target, TrendingUp, Settings, Users } from 'lucide-vue-next'
import { useDashboardStore } from '../stores/dashboard'
import BaseCard from './BaseCard.vue'

const store = useDashboardStore()

const getLetterLabel = (l: string) => {
  if (l === 'P') return 'PLAN'
  if (l === 'I') return 'IMPROVE'
  if (l === 'C') return 'CONTROL'
  return 'ACT'
}

const getPhaseIcon = (l: string) => {
  if (l === 'P') return Target
  if (l === 'I') return TrendingUp
  if (l === 'C') return Settings
  return Users
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  const yearPart = parts[0]
  const monthPart = parts[1]
  const dayPart = parts[2]
  if (!yearPart || !monthPart || !dayPart) return dateStr

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const day = parseInt(dayPart, 10)
  const monthIdx = parseInt(monthPart, 10) - 1
  const year = yearPart
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${day} ${months[monthIdx]} ${year}`
  }
  return dateStr
}
</script>

<template>
  <BaseCard title="PICA Action Plan (Top Priorities)" subtitle="">
    <div class="pica-list-wrapper">
      <div v-if="!store.currentData?.picaItems?.length" class="empty-state">
        No PICA actions documented for this period.
      </div>

      <div v-else class="pica-list">
        <div v-for="item in store.currentData.picaItems" :key="item.id" class="pica-item-row">
          <!-- Left: Big Colored Letter Badge -->
          <div class="badge-col">
            <span class="pica-badge" :class="item.letter.toLowerCase()">{{ item.letter }}</span>
          </div>

          <!-- Middle: Phase Label + Icon -->
          <div class="phase-col" :class="item.letter.toLowerCase()">
            <span class="phase-label">{{ getLetterLabel(item.letter) }}</span>
            <component :is="getPhaseIcon(item.letter)" class="phase-icon" />
          </div>

          <!-- Middle: Action Plan Description -->
          <div class="desc-col">
            <span class="desc-text">{{ item.plan }}</span>
          </div>

          <!-- Right: Meta Columns (Target Date & Owner) -->
          <div class="meta-col">
            <div class="meta-item">
              <span class="meta-lbl">Target Date</span>
              <span class="meta-val">{{ formatDate(item.targetDate) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-lbl">Owner</span>
              <span class="meta-val">{{ item.owner }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.pica-list-wrapper {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

/* Custom scrollbar styling for a sleek, modern UI look */
.pica-list-wrapper::-webkit-scrollbar {
  width: 4px;
}

.pica-list-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.pica-list-wrapper::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.pica-list-wrapper::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.pica-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 100%;
}

.pica-item-row {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  background-color: var(--bg-page);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  gap: 12px;
  flex: 1;
  min-height: 44px;
}

.badge-col {
  flex-shrink: 0;
}

.pica-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  font-weight: 800;
  font-size: 16px;
  color: #ffffff;
}

.pica-badge.p {
  background-color: var(--color-blue);
}
.pica-badge.i {
  background-color: var(--color-warning);
}
.pica-badge.c {
  background-color: var(--color-good);
}
.pica-badge.a {
  background-color: var(--color-purple);
}

.phase-col {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 110px;
  flex-shrink: 0;
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.05em;
}

.phase-col.p {
  color: var(--color-blue);
}
.phase-col.i {
  color: var(--color-warning);
}
.phase-col.c {
  color: var(--color-good);
}
.phase-col.a {
  color: var(--color-purple);
}

.phase-icon {
  width: 14px;
  height: 14px;
  stroke-width: 2.2;
}

.desc-col {
  flex: 1;
  min-width: 0;
}

.desc-text {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  display: block;
}

.meta-col {
  display: flex;
  gap: 16px;
  flex-shrink: 0;
  width: 180px;
}

.meta-item {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.meta-lbl {
  font-size: 8px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.2;
}

.meta-val {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.empty-state {
  text-align: center;
  color: var(--text-secondary);
  padding: var(--space-md) 0;
  font-size: 12px;
}
</style>
