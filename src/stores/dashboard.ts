import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dashboardApi } from '../services/dashboardApi'
import { parseExcelWorkbook } from '../services/excelParser'
import type { DashboardData, PicaActionItem } from '../types/dashboard'

export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const periods = ref<string[]>([])
  const periodMetaList = ref<import('../services/dashboardApi').PeriodMetaItem[]>([])
  const selectedPeriod = ref<string>('Juli 2026')
  const dashboardData = ref<DashboardData | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const canUndo = ref<boolean>(typeof window !== 'undefined' ? dashboardApi.hasUndo() : false)

  // Local location filter state
  const selectedLocation = ref<string>('All')

  // Date selection overrides if the user overrides "Data As Of" locally
  const dataAsOfOverride = ref<string | null>(null)

  // Getters
  const currentData = computed(() => dashboardData.value)
  const isLoaded = computed(() => dashboardData.value !== null)

  const displayAsOfDate = computed({
    get: () => dataAsOfOverride.value || dashboardData.value?.dataAsOf || '',
    set: (val: string) => {
      dataAsOfOverride.value = val
    },
  })

  // Filtered utilization data based on selected location
  const filteredUtilization = computed(() => {
    if (!dashboardData.value) return []
    if (selectedLocation.value === 'All') return dashboardData.value.utilization
    return dashboardData.value.utilization.filter((u) =>
      u.location.toLowerCase().includes(selectedLocation.value.toLowerCase()),
    )
  })

  // Actions
  async function loadPeriods() {
    try {
      periods.value = await dashboardApi.getPeriods()
      if (periods.value.length > 0 && !selectedPeriod.value) {
        selectedPeriod.value = periods.value[0] || 'Juli 2026'
      }
      canUndo.value = dashboardApi.hasUndo()
      await loadPeriodMetaList()
    } catch (err: unknown) {
      console.error('Error fetching periods:', err)
      error.value = 'Failed to load periods.'
    }
  }

  async function loadPeriodMetaList() {
    try {
      periodMetaList.value = await dashboardApi.getPeriodMetadataList()
    } catch (err: unknown) {
      console.error('Error fetching period meta list:', err)
    }
  }

  async function loadDashboardData() {
    loading.value = true
    error.value = null
    try {
      const data = await dashboardApi.getDashboardData(selectedPeriod.value)
      dashboardData.value = data
      dataAsOfOverride.value = null
      canUndo.value = dashboardApi.hasUndo()
    } catch (err: unknown) {
      console.error('Error fetching dashboard data:', err)
      error.value = 'Failed to load dashboard data.'
    } finally {
      loading.value = false
    }
  }

  async function selectPeriod(period: string) {
    selectedPeriod.value = period
    await loadDashboardData()
  }

  async function importExcelFile(file: File, targetPeriodName?: string): Promise<string[]> {
    loading.value = true
    error.value = null
    try {
      const arrayBuffer = await file.arrayBuffer()
      const { periods: parsedPeriods, dataMap } = await parseExcelWorkbook(arrayBuffer, targetPeriodName)
      if (parsedPeriods.length === 0) {
        throw new Error('No valid dashboard data found in the uploaded Excel file.')
      }
      const physicalSaved = await dashboardApi.savePhysicalExcelFile(file, targetPeriodName)
      const fileSize = `${(file.size / 1024).toFixed(1)} KB`
      const registered = await dashboardApi.registerMultiplePeriods(dataMap, selectedPeriod.value, {
        fileName: physicalSaved.fileName,
        filePath: physicalSaved.filePath,
        fileSize,
      })
      canUndo.value = true
      await loadPeriods()
      const targetToSelect = targetPeriodName || (registered.length > 0 ? registered[0] : null)
      if (targetToSelect) {
        await selectPeriod(targetToSelect)
      }
      return registered


    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse Excel file.'
      error.value = msg
      console.error('Error importing Excel file:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deletePeriod(period: string): Promise<string> {
    loading.value = true
    error.value = null
    try {
      const nextActivePeriod = await dashboardApi.deletePeriod(period)
      await loadPeriods()
      if (selectedPeriod.value === period) {
        await selectPeriod(nextActivePeriod)
      } else {
        await loadDashboardData()
      }
      return nextActivePeriod
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete period.'
      error.value = msg
      console.error('Error deleting period:', err)
      throw err
    } finally {
      loading.value = false
    }
  }


  async function undo(): Promise<string | null> {
    loading.value = true
    error.value = null
    try {
      const result = await dashboardApi.undo()
      await loadPeriods()
      if (result?.restoredPeriod) {
        await selectPeriod(result.restoredPeriod)
      } else {
        await loadDashboardData()
      }
      canUndo.value = dashboardApi.hasUndo()
      return result?.restoredPeriod || null
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to undo.'
      error.value = msg
      console.error('Error in undo:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function resetToDefault(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await dashboardApi.resetToDefault()
      await loadPeriods()
      const first = periods.value[0] || 'Juli 2026'
      await selectPeriod(first)
      canUndo.value = false
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset data.'
      error.value = msg
      console.error('Error in reset:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function savePica(item: PicaActionItem) {
    if (!selectedPeriod.value) return
    try {
      const updatedItem = await dashboardApi.savePicaItem(selectedPeriod.value, item)
      if (dashboardData.value) {
        if (!dashboardData.value.picaItems) {
          dashboardData.value.picaItems = []
        }
        const index = dashboardData.value.picaItems.findIndex((p) => p.id === updatedItem.id)
        if (index > -1) {
          dashboardData.value.picaItems[index] = updatedItem
        } else {
          dashboardData.value.picaItems.push(updatedItem)
        }
      }
    } catch (err) {
      console.error('Error saving PICA item:', err)
      throw err
    }
  }

  async function deletePica(itemId: string) {
    if (!selectedPeriod.value) return
    try {
      const success = await dashboardApi.deletePicaItem(selectedPeriod.value, itemId)
      if (success && dashboardData.value) {
        dashboardData.value.picaItems = dashboardData.value.picaItems.filter((p) => p.id !== itemId)
      }
    } catch (err) {
      console.error('Error deleting PICA item:', err)
      throw err
    }
  }

  return {
    periods,
    periodMetaList,
    selectedPeriod,
    selectedLocation,
    dashboardData,
    loading,
    error,
    canUndo,
    currentData,
    isLoaded,
    displayAsOfDate,
    filteredUtilization,
    loadPeriods,
    loadPeriodMetaList,
    loadDashboardData,
    selectPeriod,
    importExcelFile,
    deletePeriod,
    undo,
    resetToDefault,
    savePica,
    deletePica,
  }
})



