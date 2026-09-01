<script setup lang="ts">
import DashboardHeader from '../components/DashboardHeader.vue'
import DashboardFooter from '../components/DashboardFooter.vue'
import { useDashboardStore } from '../stores/dashboard'
import { AlertCircle } from 'lucide-vue-next'

const store = useDashboardStore()
</script>

<template>
  <div class="layout-wrapper">
    <!-- Header -->
    <DashboardHeader />

    <!-- Core Body -->
    <main class="main-content">
      <div class="content-container">
        <!-- Error Bar -->
        <div v-if="store.error" class="error-banner">
          <AlertCircle class="error-icon" />
          <span>{{ store.error }}</span>
        </div>

        <slot></slot>
      </div>
    </main>

    <!-- Footer -->
    <DashboardFooter />
  </div>
</template>

<style scoped>
.layout-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background-color: var(--bg-page);
}

.main-content {
  flex-grow: 1;
  min-height: 0;
  padding: 12px 16px;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-container {
  max-width: 100%;
  margin: 0 auto;
  width: 100%;
  flex-grow: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background-color: var(--color-critical-bg);
  color: var(--color-critical);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(220, 38, 38, 0.2);
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 13px;
}

.error-icon {
  width: 16px;
  height: 16px;
}
</style>
