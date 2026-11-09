export type ActivityType = 
  | 'navigation' 
  | 'optimization' 
  | 'config' 
  | 'validation' 
  | 'export' 
  | 'theme' 
  | 'audit'
  | 'system'

export type ActivityStatus = 'success' | 'info' | 'warning' | 'error'

export interface ActivityLogItem {
  id: string
  timestamp: string // ISO
  timeFormatted: string // e.g. "Just now", "2m ago" or "10:45 AM"
  type: ActivityType
  title: string
  description?: string
  status: ActivityStatus
  pageId?: string
  meta?: Record<string, any>
}

export const ActivityLogItem = {}

const STORAGE_KEY = 'econocausal_activity_history'
const EVENT_NAME = 'econocausal_activity_updated'
const MAX_LOGS = 60

function getRelativeTime(timestampStr: string): string {
  try {
    const now = Date.now()
    const time = new Date(timestampStr).getTime()
    const diffSec = Math.floor((now - time) / 1000)

    if (diffSec < 15) return 'Just now'
    if (diffSec < 60) return `${diffSec}s ago`
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return new Date(timestampStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return 'Recently'
  }
}

const DEFAULT_INITIAL_ACTIVITIES: ActivityLogItem[] = [
  {
    id: 'act_init_1',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    timeFormatted: '12m ago',
    type: 'system',
    title: 'Platform Initialized',
    description: 'Loaded benchmark retail cohort (2,200 records, 0 missing values)',
    status: 'info',
    pageId: 'overview'
  },
  {
    id: 'act_init_2',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    timeFormatted: '8m ago',
    type: 'validation',
    title: 'Causal DAG Validated',
    description: 'DoWhy structural DAG unconfoundedness verified (ATE: +19.47 pp)',
    status: 'success',
    pageId: 'causal'
  },
  {
    id: 'act_init_3',
    timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    timeFormatted: '4m ago',
    type: 'optimization',
    title: 'Default Allocation Computed',
    description: 'MILP Knapsack allocated 500 customers under ₹5,000 budget (+102% lift)',
    status: 'success',
    pageId: 'optimization'
  },
  {
    id: 'act_init_4',
    timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
    timeFormatted: '1m ago',
    type: 'audit',
    title: 'Covariate Drift Check Passed',
    description: 'All 5 customer covariates verified stable (max PSI = 0.012)',
    status: 'success',
    pageId: 'drift'
  }
]

export const activityLogger = {
  getLogs(): ActivityLogItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_ACTIVITIES))
        return DEFAULT_INITIAL_ACTIVITIES
      }
      const parsed: ActivityLogItem[] = JSON.parse(stored)
      // refresh formatted time dynamically
      return parsed.map(item => ({
        ...item,
        timeFormatted: getRelativeTime(item.timestamp)
      }))
    } catch (e) {
      console.warn('Failed to parse activity logs from localStorage', e)
      return DEFAULT_INITIAL_ACTIVITIES
    }
  },

  log(
    type: ActivityType,
    title: string,
    description?: string,
    status: ActivityStatus = 'info',
    pageId?: string,
    meta?: Record<string, any>
  ): ActivityLogItem {
    const item: ActivityLogItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      timeFormatted: 'Just now',
      type,
      title,
      description,
      status,
      pageId,
      meta
    }

    try {
      const existing = this.getLogs()
      // Avoid duplicate consecutive navigation logs to the same page within 2 seconds
      if (
        type === 'navigation' &&
        existing.length > 0 &&
        existing[0].type === 'navigation' &&
        existing[0].pageId === pageId &&
        Date.now() - new Date(existing[0].timestamp).getTime() < 2000
      ) {
        return existing[0]
      }

      const updated = [item, ...existing].slice(0, MAX_LOGS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

      // Dispatch event for UI reactivity across all mounted components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: item }))
      }
    } catch (e) {
      console.warn('Failed to save activity log', e)
    }

    return item
  },

  clearLogs(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: null }))
      }
    } catch (e) {
      console.warn('Failed to clear activity logs', e)
    }
  },

  subscribe(callback: (logs: ActivityLogItem[]) => void): () => void {
    if (typeof window === 'undefined') return () => {}

    const handler = () => {
      callback(this.getLogs())
    }

    window.addEventListener(EVENT_NAME, handler)
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) handler()
    })

    return () => {
      window.removeEventListener(EVENT_NAME, handler)
    }
  }
}
