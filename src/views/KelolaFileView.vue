<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  FileSpreadsheet,
  Trash2,
  Eye,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  Calendar,
  // Layers,
  Sparkles,
  ArrowRight,
  X,
  Search,
  Download,
  HardDrive,
} from 'lucide-vue-next'

import { useDashboardStore } from '../stores/dashboard'
import { getNextPeriod, normalizePeriodName } from '../services/excelParser'
import * as XLSX from 'xlsx'

const router = useRouter()
const store = useDashboardStore()

const fileInputRef = ref<HTMLInputElement | null>(null)
const searchQuery = ref<string>('')
const toastSuccess = ref<string | null>(null)
const toastError = ref<string | null>(null)
const deletingPeriod = ref<string | null>(null)

// Upload modal state
const showUploadModal = ref<boolean>(false)
const pendingFile = ref<File | null>(null)
const detectedSheetPeriod = ref<string>('Juli 2026')
const periodOption = ref<'current' | 'next' | 'sheet' | 'custom'>('next')
const customPeriodText = ref<string>('')
const isUploading = ref<boolean>(false)

const latestPeriod = computed(() => {
  return store.periods[0] || store.selectedPeriod || 'Juli 2026'
})

const suggestedNextPeriod = computed(() => {
  return getNextPeriod(latestPeriod.value)
})

const filteredMetaList = computed(() => {
  if (!searchQuery.value.trim()) return store.periodMetaList
  const q = searchQuery.value.toLowerCase()
  return store.periodMetaList.filter(
    (item) =>
      item.period.toLowerCase().includes(q) ||
      item.fileName.toLowerCase().includes(q) ||
      item.uploadedAt.toLowerCase().includes(q),
  )
})

onMounted(async () => {
  await store.loadPeriods()
  await store.loadPeriodMetaList()
})

const triggerUpload = () => {
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }
}

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

  if (detectedSheetPeriod.value.toLowerCase() === (store.selectedPeriod || '').toLowerCase()) {
    periodOption.value = 'current'
  } else {
    periodOption.value = 'next'
  }

  showUploadModal.value = true
}

const confirmUpload = async () => {
  if (!pendingFile.value) return

  isUploading.value = true
  toastSuccess.value = null
  toastError.value = null

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
  showUploadModal.value = false
  pendingFile.value = null

  try {
    const importedPeriods = await store.importExcelFile(fileToUpload, targetPeriod)
    await store.loadPeriodMetaList()
    toastSuccess.value = `Berhasil! Data ${actionLabel} periode [${importedPeriods.join(', ')}] dari ${fileName}`
    setTimeout(() => {
      toastSuccess.value = null
    }, 5000)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal memproses file Excel.'
    toastError.value = msg
    setTimeout(() => {
      toastError.value = null
    }, 5000)
  } finally {
    isUploading.value = false
  }
}

const openPeriod = async (period: string) => {
  await store.selectPeriod(period)
  router.push('/')
}

const handleDeletePeriod = async (period: string) => {
  try {
    const nextPeriod = await store.deletePeriod(period)
    await store.loadPeriodMetaList()
    deletingPeriod.value = null
    toastSuccess.value = `Periode [${period}] berhasil dihapus. Periode aktif saat ini: [${nextPeriod}].`
    setTimeout(() => {
      toastSuccess.value = null
    }, 5000)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal menghapus periode.'
    toastError.value = msg
    setTimeout(() => {
      toastError.value = null
    }, 5000)
  }
}

const resetToSystemDefault = async () => {
  if (confirm('Apakah Anda yakin ingin mereset seluruh data kembali ke bawaan sistem? Seluruh periode kustom akan dihapus.')) {
    try {
      await store.resetToDefault()
      await store.loadPeriodMetaList()
      toastSuccess.value = 'Seluruh data berhasil dikembalikan ke bawaan sistem.'
      setTimeout(() => {
        toastSuccess.value = null
      }, 5000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mereset data.'
      toastError.value = msg
      setTimeout(() => {
        toastError.value = null
      }, 5000)
    }
  }
}
</script>

<template>
  <div class="kelola-file-page">
    <!-- Top Nav Header -->
    <header class="page-top-nav">
      <div class="nav-container">
        <div class="nav-left">
          <RouterLink to="/" class="btn-back">
            <ArrowLeft class="back-icon" />
            <span>Kembali ke Dashboard</span>
          </RouterLink>
          <div class="nav-divider"></div>
          <div class="page-brand">
            <div class="page-logo-box">
              <FolderKanban class="page-logo-icon" />
            </div>
            <div class="page-title-group">
              <h1 class="page-title">KELOLA FILE & PERIODE DATA</h1>
              <span class="page-subtitle">Manajemen berkas Excel dan alokasi periode bulanan</span>
            </div>
          </div>
        </div>

        <div class="nav-right">
          <!-- Hidden File Input -->
          <input ref="fileInputRef" type="file" accept=".xlsx, .xls, .csv" class="hidden-input"
            @change="onFileSelected" />

          <button class="btn-primary-upload" @click="triggerUpload">
            <Plus class="btn-icon" />
            <span>Upload Excel Baru</span>
          </button>

          <button class="btn-secondary-reset" @click="resetToSystemDefault" title="Kembalikan ke data bawaan">
            <RotateCcw class="btn-icon" />
            <span>Reset Default</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Toast Notifications -->
    <transition name="fade">
      <div v-if="toastSuccess" class="toast-floating success">
        <CheckCircle2 class="toast-icon" />
        <span>{{ toastSuccess }}</span>
      </div>
    </transition>
    <transition name="fade">
      <div v-if="toastError" class="toast-floating error">
        <AlertCircle class="toast-icon" />
        <span>{{ toastError }}</span>
      </div>
    </transition>

    <!-- Main Content Container -->
    <main class="page-body">
      <div class="body-container">
        <!-- Summary Stat Cards -->
        <section class="stats-summary-grid">
          <div class="stat-card">
            <div class="stat-icon-wrapper blue">
              <Calendar class="stat-icon" />
            </div>
            <div class="stat-info">
              <span class="stat-label">Total Periode Terdaftar</span>
              <span class="stat-number">{{ store.periods.length }} Periode</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrapper green">
              <Sparkles class="stat-icon" />
            </div>
            <div class="stat-info">
              <span class="stat-label">Periode Aktif Saat Ini</span>
              <span class="stat-number active-name">{{ latestPeriod }}</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrapper purple">
              <HardDrive class="stat-icon" />
            </div>
            <div class="stat-info">
              <span class="stat-label">Direktori File Proyek</span>
              <span class="stat-number status-text">📁 project/uploads/</span>
            </div>
          </div>
        </section>

        <!-- Main Card: Table / List of Files -->
        <section class="file-list-card">
          <div class="list-card-header">
            <div class="list-header-title">
              <h2>Daftar File & Periode Bulanan</h2>
              <span class="list-header-sub">Berkas tersimpan fisik pada direktori <code>project/uploads/</code>.</span>
            </div>

            <!-- Search Bar -->
            <div class="search-box">
              <Search class="search-icon" />
              <input type="text" v-model="searchQuery" placeholder="Cari periode atau nama file..."
                class="search-input" />
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredMetaList.length === 0" class="empty-state">
            <FileSpreadsheet class="empty-icon" />
            <h3>Tidak ada data periode ditemukan</h3>
            <p>Silakan upload file Excel baru untuk menambahkan periode.</p>
            <button class="btn-empty-upload" @click="triggerUpload">Upload Excel</button>
          </div>

          <!-- Table List -->
          <div v-else class="table-responsive">
            <table class="file-table">
              <thead>
                <tr>
                  <th>Periode Bulan</th>
                  <th>Berkas Project & Ukuran</th>
                  <th>Waktu Upload / Terakhir Update</th>
                  <th>Ringkasan Metrik</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in filteredMetaList" :key="item.period"
                  :class="{ 'active-row': store.selectedPeriod === item.period }">
                  <!-- Col 1: Period Name -->
                  <td>
                    <div class="period-cell">
                      <div class="file-icon-badge">
                        <FileSpreadsheet class="excel-icon" />
                      </div>
                      <div class="period-cell-info">
                        <span class="period-title">{{ item.period }}</span>
                        <span v-if="store.selectedPeriod === item.period" class="badge-active-tag">
                          Sedang Aktif
                        </span>
                      </div>
                    </div>
                  </td>

                  <!-- Col 2: File Name, Path & Size -->
                  <td>
                    <div class="file-info-cell">
                      <div class="file-names-group">
                        <span class="file-name-text">{{ item.fileName }}</span>
                        <span class="file-path-badge">📁 {{ item.filePath || ('uploads/' + item.fileName) }}</span>
                      </div>
                      <span class="file-size-tag">{{ item.fileSize }}</span>
                    </div>
                  </td>

                  <!-- Col 3: Upload Date -->
                  <td>
                    <span class="date-text">{{ item.uploadedAt }}</span>
                  </td>

                  <!-- Col 4: Metrics -->
                  <td>
                    <div class="metrics-cell">
                      <span class="metric-pill">Overall SLA: <strong>{{ item.overallSla }}%</strong></span>
                      <span class="metric-pill">Tickets: <strong>{{ item.totalTickets }}</strong></span>
                    </div>
                  </td>

                  <!-- Col 5: Actions -->
                  <td class="text-right">
                    <div class="actions-group">
                      <!-- Open in Dashboard Button -->
                      <button class="btn-action-view" @click="openPeriod(item.period)"
                        title="Buka periode ini di dashboard">
                        <Eye class="act-icon" />
                        <span>Buka</span>
                      </button>

                      <!-- Download Excel Button -->
                      <a :href="'/api/download-file?fileName=' + encodeURIComponent(item.fileName)"
                        :download="item.fileName" class="btn-action-download"
                        title="Unduh file Excel asli dari folder proyek">
                        <Download class="act-icon" />
                        <span>Download</span>
                      </a>

                      <!-- Delete Confirmation or Trigger -->
                      <div v-if="deletingPeriod === item.period" class="inline-confirm">
                        <span class="confirm-prompt">Yakin hapus?</span>
                        <button class="btn-del-yes" @click="handleDeletePeriod(item.period)">Ya</button>
                        <button class="btn-del-no" @click="deletingPeriod = null">Batal</button>
                      </div>

                      <button v-else class="btn-action-delete" @click="deletingPeriod = item.period"
                        title="Hapus periode data dan file fisiknya dari folder proyek">
                        <Trash2 class="act-icon" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>

    <!-- Modal Dialog: Upload Excel Baru -->
    <transition name="modal-fade">
      <div v-if="showUploadModal" class="modal-overlay" @click.self="showUploadModal = false">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="modal-icon-badge">
                <FileSpreadsheet class="modal-title-icon" />
              </div>
              <div>
                <h3 class="modal-title">Import Data Excel</h3>
                <span class="modal-subtitle">Pilih opsi penyimpanan periode</span>
              </div>
            </div>
            <button class="modal-close-btn" @click="showUploadModal = false">
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
            <div class="period-option-card" :class="{ active: periodOption === 'current' }"
              @click="periodOption = 'current'">
              <input type="radio" id="opt-p-current" value="current" v-model="periodOption" class="option-radio" />
              <label for="opt-p-current" class="option-label">
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
            <div class="period-option-card" :class="{ active: periodOption === 'next' }" @click="periodOption = 'next'">
              <input type="radio" id="opt-p-next" value="next" v-model="periodOption" class="option-radio" />
              <label for="opt-p-next" class="option-label">
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
            <div class="period-option-card" :class="{ active: periodOption === 'sheet' }"
              @click="periodOption = 'sheet'">
              <input type="radio" id="opt-p-sheet" value="sheet" v-model="periodOption" class="option-radio" />
              <label for="opt-p-sheet" class="option-label">
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
            <div class="period-option-card" :class="{ active: periodOption === 'custom' }"
              @click="periodOption = 'custom'">
              <input type="radio" id="opt-p-custom" value="custom" v-model="periodOption" class="option-radio" />
              <div class="option-label custom-label">
                <span class="option-name">Kustom Nama Periode / Bulan</span>
                <input v-if="periodOption === 'custom'" type="text" v-model="customPeriodText"
                  placeholder="Contoh: September 2026" class="custom-period-input" @click.stop />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" @click="showUploadModal = false">Batal</button>
            <button class="btn-confirm" @click="confirmUpload">
              <span>{{ periodOption === 'current' ? 'Update Bulan Ini' : 'Impor & Tampilkan' }}</span>
              <ArrowRight class="confirm-icon" />
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.kelola-file-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f1f5f9;
  color: var(--text-primary);
}

/* Top Nav Header */
.page-top-nav {
  background-color: var(--color-navy-dark);
  color: #ffffff;
  padding: 12px 24px;
  border-bottom: 3px solid var(--color-blue);
  box-shadow: var(--shadow-md);
  position: sticky;
  top: 0;
  z-index: 50;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-sm);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background-color: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateX(-2px);
}

.back-icon {
  width: 15px;
  height: 15px;
}

.nav-divider {
  width: 1px;
  height: 32px;
  background-color: rgba(255, 255, 255, 0.2);
}

.page-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-logo-box {
  width: 38px;
  height: 38px;
  background-color: #0284c7;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10px rgba(2, 132, 199, 0.4);
}

.page-logo-icon {
  width: 20px;
  height: 20px;
  color: #ffffff;
}

.page-title-group {
  display: flex;
  flex-direction: column;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #ffffff;
}

.page-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hidden-input {
  display: none;
}

.btn-primary-upload {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: #107c41;
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(16, 124, 65, 0.3);
}

.btn-primary-upload:hover {
  background-color: #0b6333;
  transform: translateY(-1px);
}

.btn-secondary-reset {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #f1f5f9;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary-reset:hover {
  background-color: rgba(220, 38, 38, 0.25);
  border-color: rgba(220, 38, 38, 0.5);
  color: #fca5a5;
}

.btn-icon {
  width: 15px;
  height: 15px;
}

/* Page Body */
.page-body {
  flex: 1;
  padding: 24px;
}

.body-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Stats Summary */
.stats-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-md, 10px);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-sm);
}

.stat-icon-wrapper {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-wrapper.blue {
  background-color: #e0f2fe;
  color: #0284c7;
}

.stat-icon-wrapper.green {
  background-color: #dcfce7;
  color: #107c41;
}

.stat-icon-wrapper.purple {
  background-color: #f3e8ff;
  color: #9333ea;
}

.stat-icon {
  width: 24px;
  height: 24px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-number {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.stat-number.active-name {
  color: #107c41;
}

.stat-number.status-text {
  font-size: 14px;
  color: #475569;
}

/* Main File List Card */
.file-list-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-md, 10px);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.list-card-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.list-header-title h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.list-header-sub {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
  display: block;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #f8fafc;
  border: 1px solid #cbd5e1;
  padding: 6px 12px;
  border-radius: 6px;
  width: 280px;
}

.search-icon {
  width: 16px;
  height: 16px;
  color: #94a3b8;
}

.search-input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 12px;
  width: 100%;
  color: #1e293b;
}

/* Table styling */
.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.file-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}

.file-table th {
  background-color: #f8fafc;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 12px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.file-table td {
  padding: 14px 20px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.file-table tbody tr:hover {
  background-color: #f8fafc;
}

.file-table tbody tr.active-row {
  background-color: #f0fdf4;
}

.period-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon-badge {
  width: 36px;
  height: 36px;
  background-color: #dcfce7;
  color: #107c41;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.excel-icon {
  width: 20px;
  height: 20px;
}

.period-cell-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.period-title {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.badge-active-tag {
  display: inline-block;
  font-size: 9px;
  font-weight: 800;
  background-color: #107c41;
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.03em;
  width: fit-content;
}

.file-info-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-names-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.file-name-text {
  font-weight: 700;
  color: #1e293b;
}

.file-path-badge {
  font-size: 11px;
  font-family: monospace;
  color: #0284c7;
  background-color: #f0f9ff;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid #bae6fd;
  width: fit-content;
}

.file-size-tag {
  font-size: 11px;
  color: #64748b;
  background-color: #f1f5f9;
  padding: 1px 6px;
  border-radius: 4px;
}

.date-text {
  color: #64748b;
  font-size: 12px;
}

.metrics-cell {
  display: flex;
  gap: 8px;
}

.metric-pill {
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #334155;
}

.actions-group {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.btn-action-view {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #0284c7;
  color: #ffffff;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-action-view:hover {
  background-color: #0369a1;
}

.btn-action-download {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #15803d;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-action-download:hover {
  background-color: #dcfce7;
  border-color: #86efac;
  color: #166534;
}


.btn-action-delete {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #fff1f2;
  border: 1px solid #fecdd3;
  color: #e11d48;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-action-delete:hover {
  background-color: #ffe4e6;
  border-color: #fda4af;
}

.act-icon {
  width: 14px;
  height: 14px;
}

.inline-confirm {
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: #fff1f2;
  border: 1px solid #fecdd3;
  padding: 3px 8px;
  border-radius: 6px;
}

.confirm-prompt {
  font-size: 11px;
  font-weight: 700;
  color: #e11d48;
}

.btn-del-yes {
  background-color: #e11d48;
  color: #ffffff;
  border: none;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-del-no {
  background-color: #cbd5e1;
  color: #334155;
  border: none;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.text-right {
  text-align: right;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #64748b;
  text-align: center;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: #cbd5e1;
  margin-bottom: 12px;
}

.empty-state h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.empty-state p {
  margin: 4px 0 16px 0;
  font-size: 13px;
}

.btn-empty-upload {
  background-color: #107c41;
  color: #ffffff;
  border: none;
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

/* Toast Floating */
.toast-floating {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 24px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  z-index: 1000;
}

.toast-floating.success {
  background: #064e3b;
  color: #a7f3d0;
  border: 1px solid #059669;
}

.toast-floating.error {
  background: #7f1d1d;
  color: #fecaca;
  border: 1px solid #dc2626;
}

.toast-icon {
  width: 18px;
  height: 18px;
}

/* Modal Styling */
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

.modal-card {
  background: #ffffff;
  color: var(--text-primary);
  border-radius: var(--radius-md, 12px);
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
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
}

.confirm-icon {
  width: 14px;
  height: 14px;
}

.modal-fade-enter-active,
.modal-fade-leave-active,
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to,
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
</style>
