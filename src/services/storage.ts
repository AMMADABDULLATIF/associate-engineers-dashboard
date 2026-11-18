import { STORAGE_KEYS } from '../constants/defaults';
import type {
  CumulativeMaterialStat,
  DailyDraftPayload,
  DailyLogRecord,
  MachineryRecord,
  MaterialEntry,
  MilestoneRecord,
  SiteRecord,
  StoredUserSession,
  ThemeMode,
} from '../types';

export function getLocalTodayDate(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

export function normalizeLoginText(value: string | undefined | null): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

export function makeSiteId(siteName: string): string {
  return 'site_' + siteName.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('localStorage write warning:', err);
  }
}

export function getStoredTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function setStoredTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch {
    // ignore storage errors
  }
}

export function getSitesList(): SiteRecord[] {
  const list = readJson<SiteRecord[]>(STORAGE_KEYS.SITES, []);
  return Array.isArray(list) ? list : [];
}

export function saveSitesList(sites: SiteRecord[]): void {
  writeJson(STORAGE_KEYS.SITES, sites);
}

export function upsertStoredSite(site: SiteRecord): SiteRecord[] {
  const sites = getSitesList();
  const normName = normalizeLoginText(site.name);
  const idx = sites.findIndex(
    (s) =>
      (s.id && site.id && s.id === site.id) ||
      normalizeLoginText(s.name) === normName
  );
  if (idx >= 0) {
    sites[idx] = { ...sites[idx], ...site };
  } else {
    sites.push(site);
  }
  saveSitesList(sites);
  return sites;
}

export function getStoredSession(): StoredUserSession | null {
  const parsed = readJson<StoredUserSession | null>(STORAGE_KEYS.SESSION, null);
  if (parsed && parsed.site && parsed.user) return parsed;
  return null;
}

export function saveStoredSession(session: StoredUserSession): void {
  writeJson(STORAGE_KEYS.SESSION, session);
}

export function clearStoredSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  } catch {
    // ignore
  }
}

export function getSiteLogs(siteId: string): DailyLogRecord[] {
  const list = readJson<DailyLogRecord[]>(STORAGE_KEYS.LOGS_PREFIX + siteId, []);
  return Array.isArray(list) ? list : [];
}

export function saveSiteLogs(siteId: string, logs: DailyLogRecord[]): void {
  writeJson(STORAGE_KEYS.LOGS_PREFIX + siteId, logs);
}

export function getSiteMachinery(siteId: string): MachineryRecord[] {
  const list = readJson<MachineryRecord[]>(
    STORAGE_KEYS.MACHINERY_PREFIX + siteId,
    []
  );
  return Array.isArray(list) ? list : [];
}

export function saveSiteMachinery(
  siteId: string,
  machinery: MachineryRecord[]
): void {
  writeJson(STORAGE_KEYS.MACHINERY_PREFIX + siteId, machinery);
}

export function getSiteMilestones(siteId: string): MilestoneRecord[] {
  const list = readJson<MilestoneRecord[]>(
    STORAGE_KEYS.MILESTONES_PREFIX + siteId,
    []
  );
  return Array.isArray(list) ? list : [];
}

export function saveSiteMilestones(
  siteId: string,
  milestones: MilestoneRecord[]
): void {
  writeJson(STORAGE_KEYS.MILESTONES_PREFIX + siteId, milestones);
}

export function getSiteMaterials(siteId: string): MaterialEntry[] {
  const list = readJson<MaterialEntry[]>(
    STORAGE_KEYS.MATERIALS_PREFIX + siteId,
    []
  );
  return Array.isArray(list) ? list : [];
}

export function saveSiteMaterials(
  siteId: string,
  materials: MaterialEntry[]
): void {
  writeJson(STORAGE_KEYS.MATERIALS_PREFIX + siteId, materials);
}

export function getDailyDraft(siteId: string): DailyDraftPayload | null {
  const draft = readJson<DailyDraftPayload | null>(
    STORAGE_KEYS.DRAFT_PREFIX + siteId,
    null
  );
  if (draft && draft.date) return draft;
  return null;
}

export function saveDailyDraft(
  siteId: string,
  draft: DailyDraftPayload
): void {
  writeJson(STORAGE_KEYS.DRAFT_PREFIX + siteId, draft);
}

export function clearDailyDraft(siteId: string): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.DRAFT_PREFIX + siteId);
  } catch {
    // ignore
  }
}

export function syncMachineryIntoLogs(
  logs: DailyLogRecord[],
  machinery: MachineryRecord[]
): DailyLogRecord[] {
  return logs.map((log) => ({
    ...log,
    machineryLogs: machinery
      .filter((item) => item.date === log.date)
      .map((item) => ({ ...item })),
  }));
}

export function getCumulativeMaterialStats(
  materials: MaterialEntry[]
): CumulativeMaterialStat[] {
  const groups: Record<string, CumulativeMaterialStat> = {};

  materials.forEach((m) => {
    const name = (m.materialName || '').trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (!groups[key]) {
      groups[key] = {
        key,
        materialName: name,
        category: m.category || 'General',
        unit: m.unit || 'Units',
        initialOpening: Number(m.openingStock) || 0,
        totalReceived: 0,
        totalUsed: 0,
        currentBalance: 0,
        minAlertLimit: Number(m.minAlertLimit) || 0,
        latestDate: m.date || '',
        recordsCount: 0,
        isLowStock: false,
      };
    }
    const g = groups[key];
    g.totalReceived += Number(m.receivedQty) || 0;
    g.totalUsed += Number(m.usedQty) || 0;
    g.recordsCount += 1;
    const minVal = Number(m.minAlertLimit) || 0;
    if (minVal > g.minAlertLimit) {
      g.minAlertLimit = minVal;
    }
    if (m.date && (!g.latestDate || m.date > g.latestDate)) {
      g.latestDate = m.date;
    }
  });

  Object.values(groups).forEach((g) => {
    g.currentBalance =
      Math.round((g.initialOpening + g.totalReceived - g.totalUsed) * 100) / 100;
    g.totalReceived = Math.round(g.totalReceived * 100) / 100;
    g.totalUsed = Math.round(g.totalUsed * 100) / 100;
    g.isLowStock = g.minAlertLimit > 0 && g.currentBalance < g.minAlertLimit;
  });

  return Object.values(groups).sort((a, b) =>
    a.materialName.localeCompare(b.materialName)
  );
}
