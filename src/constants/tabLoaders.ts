import type { ComponentType } from 'react';
import type { TabKey } from '../types';

type TabModuleLoader = () => Promise<{ default: ComponentType }>;

export const TAB_LOADERS: Record<TabKey, TabModuleLoader> = {
  entry: () => import('../features/daily-log/DailyLogTab'),
  history: () => import('../features/history/LogArchiveTab'),
  machinery: () => import('../features/machinery/MachineryTab'),
  milestones: () => import('../features/milestones/MilestonesTab'),
  analytics: () => import('../features/analytics/AnalyticsTab'),
  materials: () => import('../features/materials/MaterialsTab'),
};

const prefetchedTabs = new Set<TabKey>();

export function prefetchTabChunk(tab: TabKey): void {
  if (prefetchedTabs.has(tab)) return;
  prefetchedTabs.add(tab);
  TAB_LOADERS[tab]?.().catch(() => {
    prefetchedTabs.delete(tab);
  });
}
