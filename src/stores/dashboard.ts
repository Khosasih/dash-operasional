import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dashboardApi } from '../services/dashboardApi'
import type { DashboardData, PicaActionItem } from '../types/dashboard'

export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const periods = ref<string[]>([])
  const selectedPeriod = ref<string>('Juli 2026')
  const dashboardData = ref<DashboardData | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

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
    } catch (err: unknown) {
      console.error('Error fetching periods:', err)
      error.value = 'Failed to load periods.'
    }
  }

  async function loadDashboardData() {
    loading.value = true
    error.value = null
    try {
      const data = await dashboardApi.getDashboardData(selectedPeriod.value)
      dashboardData.value = data
      dataAsOfOverride.value = null
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
    selectedPeriod,
    selectedLocation,
    dashboardData,
    loading,
    error,
    currentData,
    isLoaded,
    displayAsOfDate,
    filteredUtilization,
    loadPeriods,
    loadDashboardData,
    selectPeriod,
    savePica,
    deletePica,
  }
})
