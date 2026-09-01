import axios from 'axios'
import type { DashboardData, PicaActionItem } from '../types/dashboard'
import { mockDashboardData, periods } from '../data/dashboard'

// Standard Axios setup for future extension
const _api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Clone local mock data to act as our simulated server-side memory
const localState: Record<string, DashboardData> = JSON.parse(JSON.stringify(mockDashboardData))

const delay = <T>(val: T, ms = 300): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(val), ms))
}

export const dashboardApi = {
  /**
   * Fetch available periods
   */
  async getPeriods(): Promise<string[]> {
    return delay(periods)
  },

  /**
   * Fetch dashboard data by reporting period
   */
  async getDashboardData(period: string): Promise<DashboardData> {
    const data = (localState[period] || localState['Juli 2026']) as DashboardData
    return delay(JSON.parse(JSON.stringify(data)))
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
        id: item.id || `PICA-${Math.floor(100 + Math.random() * 900)}`
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
  }
}
