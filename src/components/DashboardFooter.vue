<script setup lang="ts">
import { Trophy } from 'lucide-vue-next'
</script>

<template>
  <footer class="dashboard-footer">
    <div class="footer-container">
      <!-- Left side: Summary note and trophy -->
      <div class="summary-note-section">
        <div class="trophy-frame">
          <Trophy class="trophy-icon" />
        </div>
        <div class="text-details">
          <h4 class="primary-note">Excellent service performance with strong SLA achievement.</h4>
          <p class="secondary-note">
            Continue monitoring capacity trend and security posture to ensure business continuity.
          </p>
        </div>
      </div>

      <!-- Right side: Color Legends -->
      <div class="legend-section">
        <div class="legend-items">
          <!-- Good -->
          <div class="legend-item">
            <span class="legend-dot good"></span>
            <span class="legend-label">Good</span>
          </div>
          <!-- Warning -->
          <div class="legend-item">
            <span class="legend-dot warning"></span>
            <span class="legend-label">Warning</span>
          </div>
          <!-- Critical -->
          <div class="legend-item">
            <span class="legend-dot critical"></span>
            <span class="legend-label">Critical</span>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.dashboard-footer {
  background-color: var(--color-navy-dark);
  color: #ffffff;
  padding: 6px var(--space-lg);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
}

.footer-container {
  max-width: 100%;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.summary-note-section {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.trophy-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 50%;
  color: var(--color-warning);
}

.trophy-icon {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}

.text-details {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.primary-note {
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
}

.secondary-note {
  font-size: 10px;
  color: var(--text-secondary);
}

.legend-section {
  display: flex;
  flex-direction: column;
}

.legend-items {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.good {
  background-color: var(--color-good);
}
.legend-dot.warning {
  background-color: var(--color-warning);
}
.legend-dot.critical {
  background-color: var(--color-critical);
}

.legend-label {
  font-size: 10.5px;
  font-weight: 600;
  color: white;
}

@media (max-width: 767px) {
  .footer-container {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-sm);
  }
}
</style>
