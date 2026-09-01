<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import BaseCard from './BaseCard.vue'
import type { KeyHighlight } from '../types/dashboard'

defineProps<{
  items: KeyHighlight[]
}>()
</script>

<template>
  <BaseCard title="Key Highlights" subtitle="">
    <div class="highlights-container">
      <div v-if="items.length === 0" class="empty-state">No key highlights available.</div>
      <div v-else class="highlights-list">
        <div v-for="item in items" :key="item.id" class="highlight-row">
          <div class="check-box">
            <Check class="check-icon" />
          </div>
          <span class="highlight-text">{{ item.text }}</span>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.highlights-container {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 6px;
}

/* Custom scrollbar styling for a sleek, modern UI look */
.highlights-container::-webkit-scrollbar {
  width: 4px;
}

.highlights-container::-webkit-scrollbar-track {
  background: transparent;
}

.highlights-container::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.highlights-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.empty-state {
  color: var(--text-secondary);
  font-size: 13px;
  text-align: center;
  padding: var(--space-md) 0;
}

.highlights-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.highlight-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 8px 12px;
  background-color: var(--bg-page);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  transition: var(--transition-smooth);
}

.highlight-row:hover {
  transform: translateX(4px);
  border-color: rgba(34, 164, 71, 0.3);
}

.check-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background-color: var(--color-good-bg);
  border-radius: 50%;
  color: var(--color-good);
  flex-shrink: 0;
}

.check-icon {
  width: 14px;
  height: 14px;
  stroke-width: 3;
}

.highlight-text {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
}
</style>
