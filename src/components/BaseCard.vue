<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
  noPadding?: boolean
}>()
</script>

<template>
  <div class="base-card">
    <!-- Card Header -->
    <div v-if="title || subtitle || $slots.header || $slots.actions" class="card-header">
      <div class="title-section">
        <slot name="header">
          <h3 v-if="title" class="card-title">{{ title }}</h3>
        </slot>
        <p v-if="subtitle" class="card-subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="actions-section">
        <slot name="actions"></slot>
      </div>
    </div>

    <!-- Card Body -->
    <div class="card-body" :class="{ 'no-padding': noPadding }">
      <slot></slot>
    </div>

    <!-- Card Footer -->
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<style scoped>
.base-card {
  background-color: var(--bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-smooth);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.base-card:hover {
  box-shadow: var(--shadow-md);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid var(--color-border);
  gap: var(--space-md);
}

.title-section {
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-navy);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.card-subtitle {
  font-size: 10px;
  color: var(--text-muted);
  margin: 1px 0 0 0;
}

.actions-section {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.card-body {
  padding: 12px 14px;
  flex-grow: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-body.no-padding {
  padding: 0;
}

.card-footer {
  padding: 8px 14px;
  border-top: 1px solid var(--color-border);
  background-color: rgba(6, 43, 91, 0.01);
}
</style>
