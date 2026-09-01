export interface ServiceKpi {
  name: string
  sla: number
  target: number
  status: 'good' | 'warning' | 'critical'
  color: 'blue' | 'purple' | 'orange' | 'teal'
  sparklineData: number[]
}

export interface KeyHighlight {
  id: string
  text: string
}

export interface IncidentSummary {
  totalTickets: number
  p1Incidents: number
  problemTickets: number
  trendData: {
    categories: string[]
    series: { name: string; data: number[] }[]
  }
}

export interface ServiceDesk {
  firstResponseTime: number // MIN
  avgResolutionTime: number // HRS
  firstCallResolution: number // %
  ticketBacklog: number
}

export interface SecuritySummary {
  criticalSecurityIncidents: number
  criticalVulnerabilitiesOpen: number
  patchCompliance: number
}

export interface InfraHealthMetric {
  name: string
  value: number
}

export interface UtilizationMetric {
  location: string
  cpuAvg: number
  cpuPeak: number
  memAvg: number
  memPeak: number
  storageUsed: number
  wanYtd: number
  wanAvg: number
  wanPeak: number
  status: 'Good' | 'Warning' | 'Critical'
  cpuSparkline: number[]
  memSparkline: number[]
  wanSparkline: number[]
}

export interface PicaActionItem {
  id: string
  letter: 'P' | 'I' | 'C' | 'A'
  title: string // e.g. "Capacity Planning", "Reduce Problem Tickets", etc.
  plan: string // Full description
  targetDate: string
  owner: string
}

export interface DashboardData {
  reportingPeriod: string
  dataAsOf: string
  locationsMonitored: number
  overallSla: number
  services: ServiceKpi[]
  highlights: KeyHighlight[]
  incidents: IncidentSummary
  serviceDesk: ServiceDesk
  security: SecuritySummary
  infraHealth: InfraHealthMetric[]
  utilization: UtilizationMetric[]
  picaItems: PicaActionItem[]
}
