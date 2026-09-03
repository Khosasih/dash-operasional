import type { DashboardData, PicaActionItem } from '../types/dashboard'
import { mockDashboardData, periods as defaultPeriods } from '../data/dashboard'
import { sortPeriods, parseExcelWorkbook, normalizePeriodName } from './excelParser'


// Clear any old/stale localStorage cache from previous versions
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('it_ops_dashboard_periods')
    localStorage.removeItem('it_ops_dashboard_data')
    localStorage.removeItem('it_ops_dashboard_files_meta')
  } catch (e) {
    console.warn('Could not clear legacy localStorage cache:', e)
  }
}

export interface PeriodMetaItem {
  period: string
  fileName: string
  filePath?: string
  uploadedAt: string
  fileSize?: string
  overallSla: number
  totalTickets: number
  isDefault: boolean
}

interface HistorySnapshot {
  periods: string[]
  data: Record<string, DashboardData>
  meta: Record<string, PeriodMetaItem>
  activePeriod: string
  description: string
}

const STORAGE_SNAPSHOT_KEY = 'it_ops_dashboard_snapshot'

function saveSnapshot(activePeriod: string, description: string) {
  try {
    const snapshot: HistorySnapshot = {
      periods: JSON.parse(JSON.stringify(currentPeriods)),
      data: JSON.parse(JSON.stringify(localState)),
      meta: JSON.parse(JSON.stringify(localMeta)),
      activePeriod,
      description,
    }
    sessionStorage.setItem(STORAGE_SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch (e) {
    console.warn('Could not save undo snapshot', e)
  }
}

function loadSnapshot(): HistorySnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_SNAPSHOT_KEY)
    if (raw) {
      return JSON.parse(raw) as HistorySnapshot
    }
  } catch (e) {
    console.warn('Could not load undo snapshot', e)
  }
  return null
}

function clearSnapshot() {
  try {
    sessionStorage.removeItem(STORAGE_SNAPSHOT_KEY)
  } catch (e) {
    console.warn('Could not clear undo snapshot', e)
  }
}

// In-memory server-synchronized state (NO localStorage cache)
let currentPeriods: string[] = []
let localState: Record<string, DashboardData> = {}
let localMeta: Record<string, PeriodMetaItem> = {}

/**
 * Directly synchronizes and parses physical Excel files stored in the project's uploads/ folder
 */
async function syncFromProjectUploads(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const res = await fetch('/api/load-all-excel-files-data')
    if (!res.ok) return
    const data = await res.json()

    if (data.files && Array.isArray(data.files) && data.files.length > 0) {
      const newPeriods: string[] = []
      const newState: Record<string, DashboardData> = {}
      const newMeta: Record<string, PeriodMetaItem> = {}

      for (const fileObj of data.files) {
        if (fileObj.base64) {
          const binaryString = window.atob(fileObj.base64)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }

          const targetOverride = fileObj.period || normalizePeriodName(fileObj.originalName || fileObj.fileName)
          const { dataMap } = await parseExcelWorkbook(bytes.buffer, targetOverride)
          for (const [period, pData] of Object.entries(dataMap)) {
            newState[period] = pData
            if (!newPeriods.includes(period)) {
              newPeriods.push(period)
            }
            newMeta[period] = {
              period,
              fileName: fileObj.originalName || fileObj.fileName,
              filePath: fileObj.filePath || `uploads/${fileObj.fileName}`,
              uploadedAt: fileObj.modifiedAt || 'Tersimpan di Proyek',
              fileSize: fileObj.fileSize || '16 KB',
              overallSla: pData.overallSla || 0,
              totalTickets: pData.incidents?.totalTickets || 0,
              isDefault: false,
            }
          }
        }
      }

      if (newPeriods.length > 0) {
        currentPeriods = sortPeriods(newPeriods, true)
        localState = newState
        localMeta = newMeta
        return
      }
    }
  } catch (e) {
    console.warn('Could not sync from project uploads directory:', e)
  }

  // Fallback to default baseline data only if uploads directory is empty
  if (currentPeriods.length === 0) {
    currentPeriods = sortPeriods([...defaultPeriods], true)
    localState = JSON.parse(JSON.stringify(mockDashboardData))
    localMeta = {}
    for (const p of currentPeriods) {
      const pData = localState[p]
      localMeta[p] = {
        period: p,
        fileName: 'IT_Dashboard_Data.xlsx',
        filePath: 'uploads/IT_Dashboard_Data.xlsx',
        uploadedAt: 'Data Awal Proyek',
        fileSize: '16.8 KB',
        overallSla: pData?.overallSla || 0,
        totalTickets: pData?.incidents?.totalTickets || 0,
        isDefault: true,
      }
    }
  }
}

const delay = <T>(val: T, ms = 50): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(val), ms))
}

export const dashboardApi = {
  /**
   * Fetch available periods fresh from project's uploads/ folder
   */
  async getPeriods(): Promise<string[]> {
    await syncFromProjectUploads()
    return delay([...currentPeriods])
  },

  /**
   * Manually trigger re-sync directly from project uploads/
   */
  async syncFromUploads(): Promise<void> {
    await syncFromProjectUploads()
  },

  /**
   * Check if undo is available in current session
   */
  hasUndo(): boolean {
    return loadSnapshot() !== null
  },

  /**
   * Fetch dashboard data fresh for a given period
   */
  async getDashboardData(period: string): Promise<DashboardData> {
    if (currentPeriods.length === 0 || !localState[period]) {
      await syncFromProjectUploads()
    }
    const fallbackKey = currentPeriods[0] || 'Juli 2026'
    const data = (localState[period] ||
      localState[fallbackKey] ||
      localState['Juli 2026'] ||
      mockDashboardData['Juli 2026']) as DashboardData
    return delay(JSON.parse(JSON.stringify(data)))
  },

  /**
   * Save physical Excel file to project's uploads/ folder via backend API and immediately sync
   */
  async savePhysicalExcelFile(
    file: File,
    targetPeriodName?: string,
  ): Promise<{ fileName: string; filePath: string; period?: string; size: number }> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const res = await fetch('/api/upload-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-file-name': encodeURIComponent(file.name),
          'x-period-name': encodeURIComponent(targetPeriodName || ''),
        },
        body: arrayBuffer,
      })
      if (res.ok) {
        const json = await res.json()
        await syncFromProjectUploads()
        return json
      }
    } catch (e) {
      console.warn('Could not save physical file to server uploads directory', e)
    }
    return {
      fileName: file.name,
      filePath: `uploads/${file.name}`,
      period: targetPeriodName,
      size: file.size,
    }
  },


  /**
   * Fetch list of all period files and metadata fresh from uploads/
   */
  async getPeriodMetadataList(): Promise<PeriodMetaItem[]> {
    await syncFromProjectUploads()
    const list: PeriodMetaItem[] = currentPeriods.map((period) => {
      const data = localState[period]
      const meta = localMeta[period]
      const isDefault = meta ? meta.isDefault : defaultPeriods.includes(period)

      const fileName = meta?.fileName || 'IT_Dashboard_Data.xlsx'
      const filePath = meta?.filePath || `uploads/${fileName}`

      return {
        period,
        fileName,
        filePath,
        uploadedAt: meta?.uploadedAt || 'Tersimpan di Proyek',
        fileSize: meta?.fileSize || '16.8 KB',
        overallSla: data?.overallSla || 0,
        totalTickets: data?.incidents?.totalTickets || 0,
        isDefault,
      }
    })

    return delay(list)
  },

  /**
   * Delete a period and its physical file from project's uploads/ folder
   */
  async deletePeriod(period: string): Promise<string> {
    saveSnapshot(period, `Hapus periode ${period}`)

    const meta = localMeta[period]
    if (meta?.fileName) {
      try {
        await fetch(`/api/delete-file?fileName=${encodeURIComponent(meta.fileName)}`, {
          method: 'DELETE',
        })
      } catch (e) {
        console.warn('Could not delete physical file on server', e)
      }
    }

    // Re-sync directly from remaining files in uploads/
    await syncFromProjectUploads()

    return delay(currentPeriods[0] || 'Juli 2026')
  },

  /**
   * Register or update period data (from Excel or other sources)
   */
  async registerPeriodData(
    period: string,
    data: DashboardData,
    activePeriod?: string,
    fileMeta?: { fileName: string; fileSize?: string; filePath?: string },
  ): Promise<void> {
    saveSnapshot(activePeriod || period, `Update ${period}`)
    localState[period] = JSON.parse(JSON.stringify(data))
    if (!currentPeriods.includes(period)) {
      currentPeriods.push(period)
    }

    if (fileMeta) {
      localMeta[period] = {
        period,
        fileName: fileMeta.fileName,
        filePath: fileMeta.filePath || `uploads/${fileMeta.fileName}`,
        uploadedAt: new Date().toLocaleString('id-ID', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        fileSize: fileMeta.fileSize,
        overallSla: data.overallSla || 0,
        totalTickets: data.incidents?.totalTickets || 0,
        isDefault: false,
      }
    }

    currentPeriods = sortPeriods(currentPeriods, true)
  },

  /**
   * Register multiple periods at once from a multi-sheet workbook
   */
  async registerMultiplePeriods(
    dataMap: Record<string, DashboardData>,
    activePeriod?: string,
    fileMeta?: { fileName: string; fileSize?: string; filePath?: string },
  ): Promise<string[]> {
    saveSnapshot(activePeriod || Object.keys(dataMap)[0] || 'Juli 2026', 'Import Excel Data')
    const addedPeriods: string[] = []
    const nowStr = new Date().toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    for (const [period, data] of Object.entries(dataMap)) {
      localState[period] = JSON.parse(JSON.stringify(data))
      if (!currentPeriods.includes(period)) {
        currentPeriods.push(period)
      }
      if (fileMeta) {
        localMeta[period] = {
          period,
          fileName: fileMeta.fileName,
          filePath: fileMeta.filePath || `uploads/${fileMeta.fileName}`,
          uploadedAt: nowStr,
          fileSize: fileMeta.fileSize,
          overallSla: data.overallSla || 0,
          totalTickets: data.incidents?.totalTickets || 0,
          isDefault: false,
        }
      }
      addedPeriods.push(period)
    }
    currentPeriods = sortPeriods(currentPeriods, true)
    return addedPeriods
  },

  /**
   * Revert last action using session snapshot
   */
  async undo(): Promise<{ restoredPeriod: string } | null> {
    const snapshot = loadSnapshot()
    if (!snapshot) return null

    currentPeriods = sortPeriods(snapshot.periods, true)
    localState = JSON.parse(JSON.stringify(snapshot.data))
    localMeta = JSON.parse(JSON.stringify(snapshot.meta || {}))

    clearSnapshot()
    return delay({ restoredPeriod: snapshot.activePeriod })
  },

  /**
   * Reset all periods and data back to factory default
   */
  async resetToDefault(): Promise<void> {
    // Delete custom uploaded files on server
    try {
      const res = await fetch('/api/uploaded-files')
      if (res.ok) {
        const json = await res.json()
        if (json.files && Array.isArray(json.files)) {
          for (const f of json.files) {
            if (f.fileName !== 'IT_Dashboard_Data.xlsx') {
              await fetch(`/api/delete-file?fileName=${encodeURIComponent(f.fileName)}`, {
                method: 'DELETE',
              })
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not reset server uploads:', e)
    }

    await syncFromProjectUploads()
    clearSnapshot()
  },

  /**
   * Save PICA item (handles add/edit)
   */
  async savePicaItem(period: string, item: PicaActionItem): Promise<PicaActionItem> {
    const data = (localState[period] || localState['Juli 2026']) as DashboardData

    if (!data.picaItems) {
      data.picaItems = []
    }

    const index = data.picaItems.findIndex((p) => p.id === item.id)
    if (index > -1) {
      // Edit
      data.picaItems[index] = { ...item }
    } else {
      // Add
      const newItem = {
        ...item,
        id: item.id || `PICA-${Math.floor(100 + Math.random() * 900)}`,
      }
      data.picaItems.push(newItem)
      item = newItem
    }

    return delay(item)
  },

  /**
   * Delete PICA item
   */
  async deletePicaItem(period: string, itemId: string): Promise<boolean> {
    const data = (localState[period] || localState['Juli 2026']) as DashboardData
    if (data.picaItems) {
      data.picaItems = data.picaItems.filter((p) => p.id !== itemId)
    }
    return delay(true)
  },
}
