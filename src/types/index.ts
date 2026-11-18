export type ThemeMode = 'dark' | 'light';

export type SyncState = 'cloud' | 'syncing' | 'local' | 'offline' | 'error';

export type TabKey =
  | 'entry'
  | 'history'
  | 'machinery'
  | 'milestones'
  | 'analytics'
  | 'materials';

export interface SiteRecord {
  id: string;
  name: string;
  supervisor: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoredUserSession {
  site: SiteRecord;
  user: string;
  tab?: TabKey;
}

export interface LaborTradeDefinition {
  id: string;
  label: string;
}

export interface LaborBreakdownValue {
  count: number;
  shift: string;
}

export interface CompletedTaskRow {
  task: string;
  location?: string;
}

export interface PendingTaskRow {
  task: string;
  targetDate?: string;
}

export interface DelayTaskRow {
  task: string;
  reason?: string;
}

export interface MachineryRecord {
  id: string;
  date: string;
  name: string;
  hours: number;
  fuel: number;
  remarks?: string;
  supervisor?: string;
  updatedAt?: string;
}

export interface DailyLogRecord {
  id: string;
  date: string;
  weather: string;
  supervisor: string;
  totalLabor: number;
  laborBreakdown: Record<string, LaborBreakdownValue | number>;
  completedTasks: CompletedTaskRow[];
  pendingTasks: PendingTaskRow[];
  delays: DelayTaskRow[];
  machineryLogs?: MachineryRecord[];
  images?: string[];
  createdAt?: unknown;
  updatedAt?: string;
}

export interface DailyDraftPayload {
  editingLogId: string | null;
  date: string;
  weather: string;
  supervisor: string;
  currentLaborTrades: LaborTradeDefinition[];
  laborCounts: Record<string, { count: number | string; shift: string }>;
  totalLabor: number;
  completedTasks: CompletedTaskRow[];
  pendingTasks: PendingTaskRow[];
  delays: DelayTaskRow[];
  images: string[];
  savedAt: number;
}

export type MilestoneStatus = 'Pending' | 'In Progress' | 'Completed';

export interface MilestoneRecord {
  id: string;
  name: string;
  startDate?: string;
  targetDate?: string;
  progress: number;
  status: MilestoneStatus | string;
  updatedAt?: string;
}

export interface MaterialEntry {
  id: string;
  materialName: string;
  category: string;
  unit: string;
  date: string;
  openingStock: number;
  receivedQty: number;
  usedQty: number;
  balance: number;
  minAlertLimit: number;
  supplier: string;
  note: string;
  siteId?: string;
  siteName?: string;
  updatedAt?: string;
  supervisor?: string;
}

export interface CumulativeMaterialStat {
  key: string;
  materialName: string;
  category: string;
  unit: string;
  initialOpening: number;
  totalReceived: number;
  totalUsed: number;
  currentBalance: number;
  minAlertLimit: number;
  latestDate: string;
  recordsCount: number;
  isLowStock: boolean;
}
