<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  MapPin,
  RefreshCw,
  Monitor,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Undo2,
} from 'lucide-vue-next'

import { useDashboardStore } from '../stores/dashboard'
import { getNextPeriod, normalizePeriodName } from '../services/excelParser'
import Select from 'primevue/select'
import * as XLSX from 'xlsx'

const store = useDashboardStore()
const fileInputRef = ref<HTMLInputElement | null>(null)
const importSuccessMsg = ref<string | null>(null)
const importErrorMsg = ref<string | null>(null)
const isImporting = ref<boolean>(false)

// Modal import state
const showImportModal = ref<boolean>(false)
const pendingFile = ref<File | null>(null)
const detectedSheetPeriod = ref<string>('Juli 2026')
const periodOption = ref<'current' | 'next' | 'sheet' | 'custom'>('current')
const customPeriodText = ref<string>('')

// Calculate next month suggestion based on latest period in store
const latestPeriod = computed(() => {
  return store.periods[0] || store.selectedPeriod || 'Juli 2026'
})

const suggestedNextPeriod = computed(() => {
  return getNextPeriod(latestPeriod.value)
})

// Trigger reload of data
const reloadDashboard = async () => {
  await store.loadDashboardData()
}

// Trigger undo of last import / update
const handleUndo = async () => {
  try {
    const restoredPeriod = await store.undo()
    importSuccessMsg.value = null
    importSuccessMsg.value = `Perubahan dibatalkan! Kembali ke periode [${restoredPeriod || 'sebelumnya'}].`
    setTimeout(() => {
      importSuccessMsg.value = null
    }, 4500)

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal membatalkan perubahan.'
    importErrorMsg.value = msg
    setTimeout(() => {
      importErrorMsg.value = null
    }, 5000)
  }
}

// Trigger file picker
const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }
}

// Handle file selection
const onFileSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  pendingFile.value = file
  customPeriodText.value = suggestedNextPeriod.value

  try {
    const arrayBuffer = await file.arrayBuffer()
    const wb = XLSX.read(arrayBuffer, { type: 'array' })
    if (wb.SheetNames.length > 0 && wb.SheetNames[0]) {
      detectedSheetPeriod.value = normalizePeriodName(wb.SheetNames[0])
    }
  } catch {
    detectedSheetPeriod.value = 'Juli 2026'
  }

  // If detected sheet matches current period, default to 'current', otherwise default to 'next'
  if (detectedSheetPeriod.value.toLowerCase() === (store.selectedPeriod || '').toLowerCase()) {
    periodOption.value = 'current'
  } else {
    periodOption.value = 'next'
  }

  showImportModal.value = true
}

const cancelImport = () => {
  showImportModal.value = false
  pendingFile.value = null
}

const confirmImport = async () => {
  if (!pendingFile.value) return

  isImporting.value = true
  importSuccessMsg.value = null
  importErrorMsg.value = null

  let targetPeriod: string | undefined = undefined
  let actionLabel = 'ditambahkan ke'

  if (periodOption.value === 'current') {
    targetPeriod = store.selectedPeriod
    actionLabel = 'diperbarui pada'
  } else if (periodOption.value === 'next') {
    targetPeriod = suggestedNextPeriod.value
    actionLabel = 'ditambahkan ke'
  } else if (periodOption.value === 'sheet') {
    targetPeriod = detectedSheetPeriod.value
    actionLabel = 'diimpor ke'
  } else if (periodOption.value === 'custom') {
    targetPeriod = customPeriodText.value.trim() || store.selectedPeriod
    actionLabel = 'diimpor ke'
  }

  const fileName = pendingFile.value.name
  const fileToUpload = pendingFile.value
  showImportModal.value = false
  pendingFile.value = null

  try {
    const importedPeriods = await store.importExcelFile(fileToUpload, targetPeriod)
    importSuccessMsg.value = `Berhasil! Data ${actionLabel} periode [${importedPeriods.join(', ')}] dari ${fileName}`
    setTimeout(() => {
      importSuccessMsg.value = null
    }, 8000)

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal memproses file Excel.'
    importErrorMsg.value = msg
    setTimeout(() => {
      importErrorMsg.value = null
    }, 5000)
  } finally {
    isImporting.value = false
  }
}
</script>

<template>
  <header class="dashboard-header">
    <div class="header-container">
      <!-- Left side: Title and subtitle -->
      <div class="brand-section">
        <div class="logo-box">
          <Monitor class="logo-icon" />
        </div>
        <div class="title-meta">
          <h1 class="main-title">IT OPERATIONS DASHBOARD</h1>
          <span class="main-subtitle">Executive Summary – {{ store.selectedPeriod }}</span>
        </div>
      </div>

      <!-- Toast Feedback Notifications with Undo -->
      <transition name="fade">
        <div v-if="importSuccessMsg" class="import-toast success">
          <CheckCircle2 class="toast-icon" />
          <span class="toast-text">{{ importSuccessMsg }}</span>
          <button v-if="store.canUndo" class="toast-undo-btn" @click="handleUndo" title="Batalkan perubahan">
            <Undo2 class="toast-btn-icon" />
            <span>Batalkan (Undo)</span>
          </button>
        </div>
      </transition>
      <transition name="fade">
        <div v-if="importErrorMsg" class="import-toast error">
          <AlertCircle class="toast-icon" />
          <span>{{ importErrorMsg }}</span>
        </div>
      </transition>

      <!-- Right side: Mockup-style White Control Boxes -->
      <div class="controls-section">
        <!-- Hidden file input for Excel upload -->
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx, .xls, .csv"
          class="hidden-file-input"
          @change="onFileSelected"
        />

        <!-- Box 1: Reporting Period -->
        <div class="header-control-box">
          <div class="box-icon-container">
            <Calendar class="box-icon" />
          </div>
          <div class="box-content">
            <span class="box-label">Reporting Period</span>
            <Select
              v-model="store.selectedPeriod"
              :options="store.periods"
              placeholder="Select Period"
              class="period-select-custom"
              @change="store.selectPeriod(store.selectedPeriod)"
            />
          </div>
        </div>

        <!-- Box 2: Locations Monitored -->
        <div class="header-control-box static-box">
          <div class="box-icon-container">
            <MapPin class="box-icon" />
          </div>
          <div class="box-content">
            <span class="box-value-large"
              >{{ store.currentData?.locationsMonitored || 0 }} Locations</span
            >
            <span class="box-label-lower">Monitored</span>
          </div>
        </div>

        <!-- Box 3: Import Excel Button -->
        <button
          class="import-excel-btn"
          @click="triggerFileInput"
          :disabled="isImporting || store.loading"
          title="Upload Excel (.xlsx) untuk menambahkan data atau update bulan aktif"
        >
          <FileSpreadsheet class="btn-icon" :class="{ spinning: isImporting }" />
          <span class="btn-text">{{ isImporting ? 'Mengimpor...' : 'Import Excel' }}</span>
        </button>

        <!-- Sync Button -->
        <button
          class="sync-btn"
          @click="reloadDashboard"
          :disabled="store.loading"
          title="Sync/Reload Data"
        >
          <RefreshCw class="sync-icon" :class="{ spinning: store.loading }" />
        </button>
      </div>
    </div>


    <!-- Modal Dialog: Konfirmasi Periode Bulan Import Excel -->
    <transition name="modal-fade">
      <div v-if="showImportModal" class="modal-overlay" @click.self="cancelImport">
        <div class="import-modal-card">
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="modal-icon-badge">
                <FileSpreadsheet class="modal-title-icon" />
              </div>
              <div>
                <h3 class="modal-title">Import Data Excel</h3>
                <span class="modal-subtitle">Pilih opsi simpan atau perbarui data</span>
              </div>
            </div>
            <button class="modal-close-btn" @click="cancelImport">
              <X class="close-icon" />
            </button>
          </div>

          <div class="modal-body">
            <!-- File info pill -->
            <div class="file-info-pill">
              <span class="file-name">{{ pendingFile?.name }}</span>
              <span class="file-size">{{ ((pendingFile?.size || 0) / 1024).toFixed(1) }} KB</span>
            </div>

            <label class="section-heading">Tindakan untuk File Ini:</label>

            <!-- Option 1: Replace / Update Current Period -->
            <div
              class="period-option-card"
              :class="{ active: periodOption === 'current' }"
              @click="periodOption = 'current'"
            >
              <input
                type="radio"
                id="opt-current"
                value="current"
                v-model="periodOption"
                class="option-radio"
              />
              <label for="opt-current" class="option-label">
                <div class="option-title-row">
                  <span class="option-name">Replace / Update Bulan Ini</span>
                  <span class="badge-update">
                    <RotateCcw class="sparkle-icon" /> Update
                  </span>
                </div>
                <div class="option-desc">
                  Perbarui metrik bulan yang sedang aktif:
                  <strong class="target-period-highlight">{{ store.selectedPeriod }}</strong>
                </div>
              </label>
            </div>

            <!-- Option 2: Next Month (New Sub-Period) -->
            <div
              class="period-option-card"
              :class="{ active: periodOption === 'next' }"
              @click="periodOption = 'next'"
            >
              <input
                type="radio"
                id="opt-next"
                value="next"
                v-model="periodOption"
                class="option-radio"
              />
              <label for="opt-next" class="option-label">
                <div class="option-title-row">
                  <span class="option-name">Tambah sebagai Sub Bulan Berikutnya</span>
                  <span class="badge-recommended">
                    <Sparkles class="sparkle-icon" /> Baru
                  </span>
                </div>
                <div class="option-desc">
                  Simpan sebagai periode bulan baru:
                  <strong class="target-period-highlight">{{ suggestedNextPeriod }}</strong>
                </div>
              </label>
            </div>

            <!-- Option 3: Sheet Original Name -->
            <div
              class="period-option-card"
              :class="{ active: periodOption === 'sheet' }"
              @click="periodOption = 'sheet'"
            >
              <input
                type="radio"
                id="opt-sheet"
                value="sheet"
                v-model="periodOption"
                class="option-radio"
              />
              <label for="opt-sheet" class="option-label">
                <div class="option-title-row">
                  <span class="option-name">Sesuai Nama Sheet di Excel</span>
                </div>
                <div class="option-desc">
                  Gunakan nama bulan bawaan Excel:
                  <strong class="target-period-highlight">{{ detectedSheetPeriod }}</strong>
                </div>
              </label>
            </div>

            <!-- Option 4: Custom Month Name -->
            <div
              class="period-option-card"
              :class="{ active: periodOption === 'custom' }"
              @click="periodOption = 'custom'"
            >
              <input
                type="radio"
                id="opt-custom"
                value="custom"
                v-model="periodOption"
                class="option-radio"
              />
              <div class="option-label custom-label">
                <span class="option-name">Kustom Nama Periode / Bulan</span>
                <input
                  v-if="periodOption === 'custom'"
                  type="text"
                  v-model="customPeriodText"
                  placeholder="Contoh: September 2026"
                  class="custom-period-input"
                  @click.stop
                />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" @click="cancelImport">Batal</button>
            <button class="btn-confirm" @click="confirmImport">
              <span>{{ periodOption === 'current' ? 'Update Bulan Ini' : 'Impor & Tampilkan' }}</span>
              <ArrowRight class="confirm-icon" />
            </button>
          </div>
        </div>
      </div>
    </transition>
  </header>
</template>





<style scoped>
.dashboard-header {
  background-color: var(--color-navy-dark);
  color: #ffffff;
  padding: 8px var(--space-lg);
  border-bottom: 3px solid var(--color-blue);
  box-shadow: var(--shadow-md);
  width: 100%;
}

.header-container {
  max-width: 100%;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.brand-section {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.logo-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: var(--color-blue);
  border-radius: var(--radius-sm);
  box-shadow: 0 0 10px rgba(37, 99, 235, 0.4);
}

.logo-icon {
  width: 22px;
  height: 22px;
  color: #ffffff !important;
}

.title-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.main-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.03em;
  margin: 0;
  color: #ffffff !important;
}

.main-subtitle {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7) !important;
}

.controls-section {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.header-control-box {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  padding: 4px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: var(--shadow-sm);
  min-height: 44px;
}

.box-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-blue);
}

.box-icon {
  width: 18px;
  height: 18px;
  stroke-width: 2.2;
}

.box-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.box-label {
  font-size: 8px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.2;
}

.box-label-lower {
  font-size: 9px;
  font-weight: 600;
  color: var(--text-secondary);
  line-height: 1.2;
}

.box-value-large {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

/* Custom transparent styles for dropdown and datepicker */
:deep(.period-select-custom.p-select) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  height: auto !important;
  width: 100px !important;
}

:deep(.period-select-custom.p-select .p-select-label) {
  color: var(--text-primary) !important;
  padding: 0 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
}

:deep(.period-select-custom.p-select .p-select-dropdown) {
  color: var(--text-secondary) !important;
  width: 12px !important;
  height: 12px !important;
}

:deep(.header-datepicker-custom.p-datepicker) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  width: 100px !important;
}

:deep(.header-datepicker-custom.p-datepicker input) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: var(--text-primary) !important;
  padding: 0 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  width: 100% !important;
}

:deep(.header-datepicker-custom.p-datepicker button) {
  display: none !important; /* Hide default icon button since we have our custom icon */
}

.hidden-file-input {
  display: none;
}

.import-excel-btn {
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: var(--radius-sm);
  padding: 4px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--shadow-sm);
  min-height: 44px;
  cursor: pointer;
  color: #107c41;
  font-weight: 700;
  font-size: 11px;
  transition: all 0.2s ease;
}

.import-excel-btn:hover:not(:disabled) {
  background-color: #f0fdf4;
  border-color: #86efac;
  box-shadow: 0 2px 10px rgba(16, 185, 129, 0.2);
  transform: translateY(-1px);
}

.import-excel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.import-excel-btn .btn-icon {
  width: 17px;
  height: 17px;
  color: #107c41;
}

.import-excel-btn .btn-text {
  letter-spacing: 0.02em;
}

.import-toast {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  z-index: 100;
  pointer-events: auto;
}

.import-toast.success {
  background: #064e3b;
  color: #a7f3d0;
  border: 1px solid #059669;
}

.toast-undo-btn {
  background-color: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #ffffff;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toast-undo-btn:hover {
  background-color: rgba(255, 255, 255, 0.35);
  transform: scale(1.03);
}

.toast-btn-icon {
  width: 12px;
  height: 12px;
}

.undo-header-btn {
  background-color: #ffffff;
  border: 1px solid #f59e0b;
  border-radius: var(--radius-sm);
  padding: 4px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: var(--shadow-sm);
  min-height: 44px;
  cursor: pointer;
  color: #b45309;
  font-weight: 700;
  font-size: 11px;
  transition: all 0.2s ease;
  animation: pulseUndo 2.5s infinite;
}

.undo-header-btn:hover:not(:disabled) {
  background-color: #fffbeb;
  border-color: #d97706;
  box-shadow: 0 2px 10px rgba(245, 158, 11, 0.25);
  transform: translateY(-1px);
}

.undo-icon {
  width: 15px;
  height: 15px;
  color: #b45309;
}

@keyframes pulseUndo {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.15);
  }
}

.import-toast.error {
  background: #7f1d1d;
  color: #fecaca;
  border: 1px solid #dc2626;
}

.toast-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}


.sync-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-sm);
  color: var(--text-light);
  cursor: pointer;
  transition: var(--transition-smooth);
}

.sync-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
}

.sync-icon {
  width: 13px;
  height: 13px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 767px) {
  .header-container {
    flex-direction: column;
    align-items: flex-start;
  }
  .controls-section {
    width: 100%;
    justify-content: space-between;
  }
  .header-control-box {
    flex-grow: 1;
  }
}

/* Modal Overlay & Card */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.import-modal-card {
  background: #ffffff;
  color: var(--text-primary);
  border-radius: var(--radius-md, 12px);
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  background-color: #f8fafc;
}

.modal-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-icon-badge {
  width: 36px;
  height: 36px;
  background-color: #dcfce7;
  color: #107c41;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-title-icon {
  width: 20px;
  height: 20px;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.modal-subtitle {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.modal-close-btn:hover {
  background-color: #e2e8f0;
  color: #334155;
}

.close-icon {
  width: 18px;
  height: 18px;
}

.modal-body {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-info-pill {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
}

.file-name {
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.file-size {
  color: #64748b;
  font-size: 11px;
}

.section-heading {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 4px;
}

.period-option-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #ffffff;
}

.period-option-card:hover {
  border-color: #cbd5e1;
  background-color: #f8fafc;
}

.period-option-card.active {
  border-color: #107c41;
  background-color: #f0fdf4;
  box-shadow: 0 0 0 1px #107c41;
}

.option-radio {
  margin-top: 3px;
  cursor: pointer;
  accent-color: #107c41;
}

.option-label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: pointer;
  width: 100%;
}

.option-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.option-name {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.badge-recommended {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  background-color: #dcfce7;
  color: #15803d;
  padding: 2px 8px;
  border-radius: 12px;
  letter-spacing: 0.02em;
}

.badge-update {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  background-color: #dbeafe;
  color: #1d4ed8;
  padding: 2px 8px;
  border-radius: 12px;
  letter-spacing: 0.02em;
}


.sparkle-icon {
  width: 11px;
  height: 11px;
}

.option-desc {
  font-size: 12px;
  color: #64748b;
}

.target-period-highlight {
  color: #107c41;
  font-weight: 700;
}

.custom-label {
  width: 100%;
}

.custom-period-input {
  margin-top: 8px;
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
  transition: border-color 0.2s;
  background: #ffffff;
  color: #0f172a;
}

.custom-period-input:focus {
  border-color: #107c41;
  box-shadow: 0 0 0 2px rgba(16, 124, 65, 0.15);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #f1f5f9;
  background-color: #f8fafc;
}

.btn-cancel {
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cancel:hover {
  background-color: #f1f5f9;
  color: #1e293b;
}

.btn-confirm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 6px;
  border: none;
  background-color: #107c41;
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(16, 124, 65, 0.25);
  transition: all 0.2s ease;
}

.btn-confirm:hover {
  background-color: #0b6333;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(16, 124, 65, 0.35);
}

.confirm-icon {
  width: 14px;
  height: 14px;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Manage Files Button in Header */
.manage-files-btn {
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: var(--radius-sm);
  padding: 4px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--shadow-sm);
  min-height: 44px;
  cursor: pointer;
  color: #1e293b;
  font-weight: 700;
  font-size: 11px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.manage-files-btn:hover {
  background-color: #f8fafc;
  border-color: #94a3b8;
  color: #0284c7;
  transform: translateY(-1px);
}

.manage-files-btn .btn-icon {
  width: 16px;
  height: 16px;
  color: #0284c7;
}

.file-count-badge {
  background-color: #0284c7;
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}
</style>


