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

  const monthMap: Record<string, string> = {
    'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
    'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
    'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
  }

  async function loadDashboardData() {
    loading.value = true
    error.value = null
    try {
      const data = await dashboardApi.getDashboardData(selectedPeriod.value)
      
      // Override Network SLA with dynamic data
      try {
        const [monthName = '', year = ''] = selectedPeriod.value.split(' ')
        const monthNum = monthMap[monthName.toLowerCase()] || '01'
        const periodQuery = `${year}-${monthNum}`
        
        // 1. Ambil SLA Network
        const resSla = await fetch(`/api/sla-network?period=${periodQuery}`)
        if (resSla.ok) {
          const apiData = await resSla.json()
          if (apiData?.data?.[0]?.SLA) {
            const networkService = data.services.find(s => s.name.toLowerCase() === 'network')
            if (networkService) {
              networkService.sla = Number(apiData.data[0].SLA)
            }
          }
        }

        // 2. Ambil Infra Health Network Devices
        const resInfra = await fetch(`/api/infra-health?period=${periodQuery}`)
        if (resInfra.ok) {
          const apiData = await resInfra.json()
          if (apiData?.data?.[0]?.Health) {
            const netDevices = data.infraHealth?.find(i => i.name === 'Network Devices')
            if (netDevices) {
              netDevices.value = Number(apiData.data[0].Health)
            }
          }
        }

        // 2.5 Ambil CPU Utilization (Pluit, Semanggi, BSD)
        // Endpoint: http://10.10.10.64:8088/cpu?from=${__from}&to=${__to}
        // Request bulanan (from: awal bulan, to: akhir bulan dalam epoch ms)
        const startOfMonthMs = new Date(Number(year), Number(monthNum) - 1, 1, 0, 0, 0, 0).getTime()
        const endOfMonthMs = new Date(Number(year), Number(monthNum), 0, 23, 59, 59, 999).getTime()

        try {
          const resCpu = await fetch(`/api/cpu-utilization?period=${periodQuery}&from=${startOfMonthMs}&to=${endOfMonthMs}`)
          if (resCpu.ok) {
            const cpuData = await resCpu.json()
            const cpuList: Array<{ lokasi: string; cpu_avg: number | null; cpu_peak: number | null }> =
              Array.isArray(cpuData) ? cpuData : (cpuData?.data || [])

            for (const cpuItem of cpuList) {
              const loc = (cpuItem.lokasi || '').toLowerCase().trim()
              const util = data.utilization?.find(u =>
                u.location.toLowerCase().trim() === loc ||
                u.location.toLowerCase().includes(loc) ||
                loc.includes(u.location.toLowerCase().trim())
              )

              const avgVal = cpuItem.cpu_avg != null ? Number(cpuItem.cpu_avg) : 0
              const peakVal = cpuItem.cpu_peak != null ? Number(cpuItem.cpu_peak) : 0

              if (util) {
                util.cpuAvg = avgVal
                util.cpuPeak = peakVal
                util.cpuSparkline = [
                  Math.round(Math.max(0, avgVal * 0.8) * 100) / 100,
                  Math.round(Math.max(0, avgVal * 0.9) * 100) / 100,
                  avgVal,
                  Math.round(Math.max(0, avgVal * 0.95) * 100) / 100,
                  peakVal > 0 ? peakVal : Math.round(avgVal * 1.2 * 100) / 100,
                ]
              } else if (data.utilization) {
                data.utilization.push({
                  location: cpuItem.lokasi,
                  cpuAvg: avgVal,
                  cpuPeak: peakVal,
                  memAvg: 0,
                  memPeak: 0,
                  storageUsed: 0,
                  wanYtd: 0,
                  wanAvg: 0,
                  wanPeak: 0,
                  status: 'Good',
                  cpuSparkline: [
                    Math.round(Math.max(0, avgVal * 0.8) * 100) / 100,
                    Math.round(Math.max(0, avgVal * 0.9) * 100) / 100,
                    avgVal,
                    Math.round(Math.max(0, avgVal * 0.95) * 100) / 100,
                    peakVal > 0 ? peakVal : Math.round(avgVal * 1.2 * 100) / 100,
                  ],
                  memSparkline: [0, 0, 0, 0, 0],
                  wanSparkline: [0, 0, 0, 0, 0],
                })
              }
            }
          }
        } catch (cpuErr) {
          console.error('Gagal mengambil data CPU Utilization:', cpuErr)
        }

        // Helper status
        const getWanStatus = (val: number): 'Good' | 'Warning' | 'Critical' => {
          if (val >= 85) return 'Critical';
          if (val >= 70) return 'Warning';
          return 'Good';
        }

        // 3. Ambil WAN Utilization (Semanggi)
        const resWan = await fetch(`/api/wan-utilization?period=${periodQuery}&location=semanggi`)
        if (resWan.ok) {
          const apiData = await resWan.json()
          if (apiData?.avg != null) {
            const semanggiUtil = data.utilization?.find(u => u.location.toLowerCase() === 'semanggi')
            if (semanggiUtil) {
              semanggiUtil.wanAvg = Number(apiData.avg)
              if (apiData.peak != null) {
                semanggiUtil.wanPeak = Number(apiData.peak)
              }
              semanggiUtil.status = getWanStatus(semanggiUtil.wanPeak)
            }
          }
        }
        
        // 3.5 Ambil WAN Utilization YTD (Semanggi)
        const resWanYtd = await fetch(`/api/wan-utilization?period=${periodQuery}&location=semanggi&ytd=true`)
        if (resWanYtd.ok) {
          const apiDataYtd = await resWanYtd.json()
          if (apiDataYtd?.peak != null) {
            const semanggiUtil = data.utilization?.find(u => u.location.toLowerCase() === 'semanggi')
            if (semanggiUtil) {
              semanggiUtil.wanYtd = Number(apiDataYtd.peak)
            }
          }
        }

        // 4. Ambil WAN Utilization (Pluit)
        const resWanPluit = await fetch(`/api/wan-utilization?period=${periodQuery}&location=pluit`)
        if (resWanPluit.ok) {
          const apiData = await resWanPluit.json()
          if (apiData?.avg != null) {
            const pluitUtil = data.utilization?.find(u => u.location.toLowerCase() === 'pluit')
            if (pluitUtil) {
              pluitUtil.wanAvg = Number(apiData.avg)
              if (apiData.peak != null) {
                pluitUtil.wanPeak = Number(apiData.peak)
              }
              pluitUtil.status = getWanStatus(pluitUtil.wanPeak)
            }
          }
        }

        // 4.5 Ambil WAN Utilization YTD (Pluit)
        const resWanPluitYtd = await fetch(`/api/wan-utilization?period=${periodQuery}&location=pluit&ytd=true`)
        if (resWanPluitYtd.ok) {
          const apiDataYtd = await resWanPluitYtd.json()
          if (apiDataYtd?.peak != null) {
            const pluitUtil = data.utilization?.find(u => u.location.toLowerCase() === 'pluit')
            if (pluitUtil) {
              pluitUtil.wanYtd = Number(apiDataYtd.peak)
            }
          }
        }

        // 5. Ambil WAN Utilization (BSD)
        const resWanBsd = await fetch(`/api/wan-utilization?period=${periodQuery}&location=bsd`)
        if (resWanBsd.ok) {
          const apiData = await resWanBsd.json()
          if (apiData?.avg != null) {
            const bsdUtil = data.utilization?.find(u => u.location.toLowerCase() === 'bsd')
            if (bsdUtil) {
              bsdUtil.wanAvg = Number(apiData.avg)
              if (apiData.peak != null) {
                bsdUtil.wanPeak = Number(apiData.peak)
              }
              bsdUtil.status = getWanStatus(bsdUtil.wanPeak)
            }
          }
        }

        // 5.5 Ambil WAN Utilization YTD (BSD)
        const resWanBsdYtd = await fetch(`/api/wan-utilization?period=${periodQuery}&location=bsd&ytd=true`)
        if (resWanBsdYtd.ok) {
          const apiDataYtd = await resWanBsdYtd.json()
          if (apiDataYtd?.peak != null) {
            const bsdUtil = data.utilization?.find(u => u.location.toLowerCase() === 'bsd')
            if (bsdUtil) {
              bsdUtil.wanYtd = Number(apiDataYtd.peak)
            }
          }
        }

      } catch (err) {
        console.error('Gagal mengambil data dinamis:', err)
      }

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



