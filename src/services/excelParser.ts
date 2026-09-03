import * as XLSX from 'xlsx'
import type {
  DashboardData,
  ServiceKpi,
  KeyHighlight,
  IncidentSummary,
  ServiceDesk,
  SecuritySummary,
  InfraHealthMetric,
  UtilizationMetric,
  PicaActionItem,
} from '../types/dashboard'

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

/**
 * Calculates the next sequential month/year given a period string (e.g. "Juli 2026" -> "Agustus 2026")
 */
export function getNextPeriod(currentPeriodStr?: string): string {
  if (!currentPeriodStr) return 'Agustus 2026'

  const match = currentPeriodStr.match(/([a-zA-Z]+)[_\s-]+(\d{4})/)
  if (!match || !match[1] || !match[2]) return 'Agustus 2026'

  const rawMonth = match[1].toLowerCase()
  const year = parseInt(match[2], 10)

  const monthMap: Record<string, number> = {
    january: 0, jan: 0, januari: 0,
    february: 1, feb: 1, februari: 1,
    march: 2, mar: 2, maret: 2,
    april: 3, apr: 3,
    may: 4, mei: 4,
    june: 5, jun: 5, juni: 5,
    july: 6, jul: 6, juli: 6,
    august: 7, aug: 7, agustus: 7,
    september: 8, sep: 8,
    october: 9, oct: 9, oktober: 9,
    november: 10, nov: 10,
    december: 11, dec: 11, desember: 11,
  }

  const idx = monthMap[rawMonth] ?? -1
  if (idx === -1) return `${rawMonth} ${year}`

  if (idx === 11) {
    return `Januari ${year + 1}`
  } else {
    return `${MONTH_NAMES_ID[idx + 1]} ${year}`
  }
}

/**
 * Sorts an array of period strings chronologically or reverse chronologically
 */
export function sortPeriods(periodList: string[], reverse = false): string[] {
  const parseVal = (str: string): number => {
    const match = str.match(/([a-zA-Z]+)[_\s-]+(\d{4})/)
    if (!match || !match[1] || !match[2]) return 0
    const rawMonth = match[1].toLowerCase()
    const year = parseInt(match[2], 10)
    const monthMap: Record<string, number> = {
      january: 0, jan: 0, januari: 0,
      february: 1, feb: 1, februari: 1,
      march: 2, mar: 2, maret: 2,
      april: 3, apr: 3,
      may: 4, mei: 4,
      june: 5, jun: 5, juni: 5,
      july: 6, jul: 6, juli: 6,
      august: 7, aug: 7, agustus: 7,
      september: 8, sep: 8,
      october: 9, oct: 9, oktober: 9,
      november: 10, nov: 10,
      december: 11, dec: 11, desember: 11,
    }
    const m = monthMap[rawMonth] ?? 0
    return year * 12 + m
  }

  return [...periodList].sort((a, b) => {
    const diff = parseVal(a) - parseVal(b)
    return reverse ? -diff : diff
  })
}

/**
 * Normalizes period names like "Dashboard Data July 2026", "July 2026", "Agustus 2026" -> "Juli 2026", "Agustus 2026"
 */
export function normalizePeriodName(sheetName: string): string {
  if (!sheetName) return 'Juli 2026'

  const monthMap: Record<string, string> = {
    january: 'Januari',
    jan: 'Januari',
    januari: 'Januari',
    february: 'Februari',
    feb: 'Februari',
    februari: 'Februari',
    march: 'Maret',
    mar: 'Maret',
    maret: 'Maret',
    april: 'April',
    apr: 'April',
    may: 'Mei',
    mei: 'Mei',
    june: 'Juni',
    jun: 'Juni',
    juni: 'Juni',
    july: 'Juli',
    jul: 'Juli',
    juli: 'Juli',
    august: 'Agustus',
    aug: 'Agustus',
    agustus: 'Agustus',
    september: 'September',
    sep: 'September',
    october: 'Oktober',
    oct: 'Oktober',
    oktober: 'Oktober',
    november: 'November',
    nov: 'November',
    december: 'Desember',
    dec: 'Desember',
    desember: 'Desember',
  }

  // 1. Search for 4-digit year (e.g. 2026, 2027)
  const yearMatch = sheetName.match(/\b(20\d\d)\b/)
  const year = yearMatch ? yearMatch[1] : '2026'

  // 2. Search for any recognized month name anywhere in sheetName
  const lower = sheetName.toLowerCase()
  for (const [key, idMonth] of Object.entries(monthMap)) {
    const regex = new RegExp(`(^|[^a-z])${key}([^a-z]|$)`, 'i')
    if (regex.test(lower)) {
      return `${idMonth} ${year}`
    }
  }

  // 3. If no month keyword found, check if it's already a formatted month name
  const match = sheetName.match(/([a-zA-Z]+)[_\s-]+(\d{4})/)
  if (
    match &&
    match[1] &&
    match[2] &&
    match[1].toLowerCase() !== 'data' &&
    match[1].toLowerCase() !== 'sheet' &&
    match[1].toLowerCase() !== 'dashboard'
  ) {
    const rawMonth = match[1].toLowerCase()
    const y = match[2]
    const month = monthMap[rawMonth] || rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1)
    return `${month} ${y}`
  }

  return `Juli ${year}`
}


function parseNum(val: unknown, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val
  if (typeof val === 'string') {
    const cleaned = val.replace(/%/g, '').replace(/,/g, '.').trim()
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? fallback : parsed
  }
  return fallback
}

function parseStr(val: unknown, fallback = ''): string {
  if (val === null || val === undefined) return fallback
  return String(val).trim()
}

/**
 * Parses an Excel worksheet matrix into a structured DashboardData object
 */
export function parseWorksheetToDashboardData(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  overridePeriodName?: string,
): DashboardData | null {
  const rows: (string | number)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
  })

  if (!rows || rows.length < 5) {
    return null
  }

  const periodName = overridePeriodName?.trim() || normalizePeriodName(sheetName)

  // Default values
  let overallSla = 98.24
  let targetSla = 95.0
  let networkSla = 99.75
  let serverSla = 97.34
  let appSla = 98.88
  let secSla = 96.99

  const highlights: KeyHighlight[] = []

  let totalTickets = 0
  let solvedTickets = 0
  let unsolvedTickets = 0

  let actualSlaHours = 3.2
  let targetSlaHours = 4.0
  let slaCompliance = 81.0
  let targetSlaCompliance = 80.0

  let criticalSecIncidents = 0
  let criticalVulnOpen = 0
  let patchCompliance = 95.0

  let netHealthy = 99.0
  let serverHealthy = 98.0
  let vmHealthy = 98.0
  let storageHealthy = 97.0
  let backupHealthy = 95.0

  const utilization: UtilizationMetric[] = []
  const picaItems: PicaActionItem[] = []

  // Iterate rows and find sections
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || []
    const firstCell = parseStr(row[0])

    // 1. Overall SLA
    if (firstCell.includes('1. OVERALL SLA') || firstCell.includes('tbl_overall_sla')) {
      const dataRow = rows[i + 2] || []
      overallSla = parseNum(dataRow[1], overallSla)
      targetSla = parseNum(dataRow[2], targetSla)
      networkSla = parseNum(dataRow[3], networkSla)
      serverSla = parseNum(dataRow[4], serverSla)
      appSla = parseNum(dataRow[5], appSla)
      secSla = parseNum(dataRow[6], secSla)
    }

    // 2. Key Highlights
    if (firstCell.includes('2. KEY HIGHLIGHTS') || firstCell.includes('tbl_key_highlights')) {
      for (let j = i + 2; j < rows.length; j++) {
        const hRow = rows[j] || []
        const hId = parseStr(hRow[0])
        const hMsg = parseStr(hRow[2])
        if (!hId || parseStr(hRow[0]).includes('3.') || isNaN(Number(hId))) break
        if (hMsg) {
          highlights.push({
            id: String(hId),
            text: hMsg,
          })
        }
      }
    }

    // 3. Incident Summary
    if (firstCell.includes('3. INCIDENT SUMMARY') || firstCell.includes('tbl_incident_summary')) {
      const incRow = rows[i + 2] || []
      totalTickets = parseNum(incRow[1], totalTickets)
      solvedTickets = parseNum(incRow[2], solvedTickets)
      unsolvedTickets = parseNum(incRow[3], unsolvedTickets)
    }

    // 4. Service Desk Performance
    if (firstCell.includes('4. SERVICE DESK') || firstCell.includes('tbl_service_desk')) {
      const sdRow = rows[i + 2] || []
      actualSlaHours = parseNum(sdRow[1], actualSlaHours)
      targetSlaHours = parseNum(sdRow[2], targetSlaHours)
      slaCompliance = parseNum(sdRow[3], slaCompliance)
      targetSlaCompliance = parseNum(sdRow[4], targetSlaCompliance)
    }


    // 5. Security Summary
    if (firstCell.includes('5. SECURITY SUMMARY') || firstCell.includes('tbl_security_summary')) {
      const secRow = rows[i + 2] || []
      criticalSecIncidents = parseNum(secRow[1], criticalSecIncidents)
      criticalVulnOpen = parseNum(secRow[2], criticalVulnOpen)
      patchCompliance = parseNum(secRow[3], patchCompliance)
    }

    // 6. Infrastructure Health
    if (firstCell.includes('6. INFRASTRUCTURE HEALTH') || firstCell.includes('tbl_infrastructure_health')) {
      const ihRow = rows[i + 2] || []
      netHealthy = parseNum(ihRow[1], netHealthy)
      serverHealthy = parseNum(ihRow[2], serverHealthy)
      vmHealthy = parseNum(ihRow[3], vmHealthy)
      storageHealthy = parseNum(ihRow[4], storageHealthy)
      backupHealthy = parseNum(ihRow[5], backupHealthy)
    }

    // 7. Infrastructure Utilization
    if (firstCell.includes('7. INFRASTRUCTURE UTILIZATION') || firstCell.includes('tbl_infrastructure_utilization')) {
      for (let j = i + 2; j < rows.length; j++) {
        const uRow = rows[j] || []
        const loc = parseStr(uRow[0])
        if (!loc || loc.includes('8.') || loc.startsWith('tbl_')) break

        const cpuAvg = parseNum(uRow[1])
        const cpuPeak = parseNum(uRow[2])
        const memAvg = parseNum(uRow[3])
        const memPeak = parseNum(uRow[4])
        const storageUsed = parseNum(uRow[5])
        const wanYtd = parseNum(uRow[6])
        const wanAvg = parseNum(uRow[7])
        const wanPeak = parseNum(uRow[8])
        const rawStatus = parseStr(uRow[9], 'Good')
        const status: 'Good' | 'Warning' | 'Critical' =
          rawStatus.toLowerCase() === 'critical'
            ? 'Critical'
            : rawStatus.toLowerCase() === 'warning'
              ? 'Warning'
              : 'Good'

        utilization.push({
          location: loc,
          cpuAvg,
          cpuPeak,
          memAvg,
          memPeak,
          storageUsed,
          wanYtd,
          wanAvg,
          wanPeak,
          status,
          cpuSparkline: [
            Math.max(1, cpuAvg * 0.8),
            Math.max(1, cpuAvg * 0.9),
            cpuAvg,
            Math.max(1, cpuAvg * 0.95),
            cpuPeak > 0 ? cpuPeak : cpuAvg * 1.2,
          ],
          memSparkline: [
            Math.max(1, memAvg * 0.85),
            Math.max(1, memAvg * 0.92),
            memAvg,
            Math.max(1, memAvg * 0.96),
            memPeak > 0 ? memPeak : memAvg * 1.1,
          ],
          wanSparkline: [
            Math.max(1, wanAvg * 0.7),
            Math.max(1, wanAvg * 0.85),
            wanAvg,
            Math.max(1, wanAvg * 0.9),
            wanPeak > 0 ? wanPeak : wanAvg * 1.3,
          ],
        })
      }
    }

    // 8. PICA Action Plan
    if (firstCell.includes('8. PICA ACTION PLAN') || firstCell.includes('tbl_pica')) {
      for (let j = i + 2; j < rows.length; j++) {
        const pRow = rows[j] || []
        const pId = parseStr(pRow[0])
        if (!pId || !pId.startsWith('PICA-')) break

        const category = parseStr(pRow[1]).toUpperCase()
        let letter: 'P' | 'I' | 'C' | 'A' = 'P'
        if (category.startsWith('I')) letter = 'I'
        else if (category.startsWith('C')) letter = 'C'
        else if (category.startsWith('A')) letter = 'A'

        const plan = parseStr(pRow[2])
        const targetDate = parseStr(pRow[3])
        const owner = parseStr(pRow[4])

        picaItems.push({
          id: pId,
          letter,
          title: category,
          plan,
          targetDate,
          owner,
        })
      }
    }
  }

  // Construct Services
  const getKpiStatus = (val: number, tgt: number): 'good' | 'warning' | 'critical' => {
    if (val >= tgt) return 'good'
    if (val >= tgt - 2) return 'warning'
    return 'critical'
  }

  const services: ServiceKpi[] = [
    {
      name: 'Network',
      sla: networkSla,
      target: targetSla,
      status: getKpiStatus(networkSla, targetSla),
      color: 'blue',
      sparklineData: [
        Number((networkSla - 0.05).toFixed(2)),
        Number((networkSla + 0.02).toFixed(2)),
        Number((networkSla - 0.04).toFixed(2)),
        Number((networkSla + 0.03).toFixed(2)),
        networkSla,
      ],
    },
    {
      name: 'Server',
      sla: serverSla,
      target: targetSla,
      status: getKpiStatus(serverSla, targetSla),
      color: 'purple',
      sparklineData: [
        Number((serverSla - 0.5).toFixed(2)),
        Number((serverSla + 0.3).toFixed(2)),
        Number((serverSla - 0.2).toFixed(2)),
        Number((serverSla + 0.4).toFixed(2)),
        serverSla,
      ],
    },
    {
      name: 'Application',
      sla: appSla,
      target: targetSla,
      status: getKpiStatus(appSla, targetSla),
      color: 'orange',
      sparklineData: [
        Number((appSla - 0.3).toFixed(2)),
        Number((appSla + 0.2).toFixed(2)),
        Number((appSla - 0.1).toFixed(2)),
        Number((appSla + 0.3).toFixed(2)),
        appSla,
      ],
    },
    {
      name: 'Security Services',
      sla: secSla,
      target: targetSla,
      status: getKpiStatus(secSla, targetSla),
      color: 'teal',
      sparklineData: [
        Number((secSla - 0.2).toFixed(2)),
        Number((secSla + 0.1).toFixed(2)),
        Number((secSla - 0.3).toFixed(2)),
        Number((secSla + 0.2).toFixed(2)),
        secSla,
      ],
    },
  ]

  const defaultHighlights: KeyHighlight[] =
    highlights.length > 0
      ? highlights
      : [
          { id: '1', text: `Overall SLA ${overallSla}% – ${overallSla >= targetSla ? 'Above Target' : 'Below Target'}` },
          { id: '2', text: `${solvedTickets} Tickets Solved within SLA` },
          { id: '3', text: `${criticalSecIncidents} Security Incidents Handled` },
        ]

  const incidents: IncidentSummary = {
    totalTickets,
    p1Incidents: solvedTickets,
    problemTickets: unsolvedTickets,
    trendData: {
      categories: ['W1', 'W2', 'W3', 'W4', 'W5'],
      series: [
        {
          name: 'Total Tickets',
          data: [
            Math.round(totalTickets * 0.18),
            Math.round(totalTickets * 0.23),
            Math.round(totalTickets * 0.19),
            Math.round(totalTickets * 0.22),
            Math.round(totalTickets * 0.18),
          ],
        },
        {
          name: 'Solved Tickets',
          data: [
            Math.round(solvedTickets * 0.18),
            Math.round(solvedTickets * 0.23),
            Math.round(solvedTickets * 0.19),
            Math.round(solvedTickets * 0.22),
            Math.round(solvedTickets * 0.18),
          ],
        },
        {
          name: 'Problem Tickets',
          data: [0, Math.round(unsolvedTickets * 0.5), 0, Math.round(unsolvedTickets * 0.5), 0],
        },
      ],
    },
  }

  const serviceDesk: ServiceDesk = {
    firstResponseTime: 11,
    avgResolutionTime: actualSlaHours,
    TargetHrs: targetSlaHours,
    TargetSLA: targetSlaCompliance,
    firstCallResolution: slaCompliance,
    ticketBacklog: 14,
  }


  const security: SecuritySummary = {
    criticalSecurityIncidents: criticalSecIncidents,
    criticalVulnerabilitiesOpen: criticalVulnOpen,
    patchCompliance,
  }

  const infraHealth: InfraHealthMetric[] = [
    { name: 'Network Devices', value: netHealthy },
    { name: 'Servers', value: serverHealthy },
    { name: 'Virtual Machines', value: vmHealthy },
    { name: 'Storage', value: storageHealthy },
    { name: 'Backup', value: backupHealthy },
  ]

  const finalUtilization =
    utilization.length > 0
      ? utilization
      : [
          {
            location: 'Semanggi',
            cpuAvg: 9.63,
            cpuPeak: 0,
            memAvg: 40.22,
            memPeak: 0,
            storageUsed: 39.9,
            wanAvg: 12.33,
            wanPeak: 106.82,
            wanYtd: 87.17,
            status: 'Critical' as const,
            cpuSparkline: [40, 45, 55, 48, 76],
            memSparkline: [60, 62, 65, 63, 82],
            wanSparkline: [30, 35, 40, 39, 81],
          },
        ]

  return {
    reportingPeriod: periodName,
    dataAsOf: new Date().toISOString().split('T')[0] || '2026-07-31',
    locationsMonitored: finalUtilization.length,
    overallSla,
    services,
    highlights: defaultHighlights,
    incidents,
    serviceDesk,
    security,
    infraHealth,
    utilization: finalUtilization,
    picaItems,
  }
}

/**
 * Parses an entire Excel Workbook from ArrayBuffer or File
 */
export async function parseExcelWorkbook(
  data: ArrayBuffer | Uint8Array,
  overridePeriodName?: string,
): Promise<{ periods: string[]; dataMap: Record<string, DashboardData> }> {
  const workbook = XLSX.read(data, { type: 'array' })
  const periods: string[] = []
  const dataMap: Record<string, DashboardData> = {}

  for (let i = 0; i < workbook.SheetNames.length; i++) {
    const sheetName = workbook.SheetNames[i]
    if (!sheetName) continue
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue

    const sheetOverride = workbook.SheetNames.length === 1 || i === 0 ? overridePeriodName : undefined
    const parsedData = parseWorksheetToDashboardData(sheet, sheetName, sheetOverride)
    if (parsedData) {
      const periodKey = parsedData.reportingPeriod
      if (!periods.includes(periodKey)) {
        periods.push(periodKey)
      }
      dataMap[periodKey] = parsedData
    }
  }

  return { periods, dataMap }
}
