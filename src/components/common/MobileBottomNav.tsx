import React from 'react';
import { useNavigation } from '../../context/AppContext';
import type { TabKey } from '../../types';

const MOBILE_TABS: Array<{
  tab: TabKey;
  label: string;
  fullLabel: string;
  icon: string;
}> = [
  { tab: 'entry', label: 'Log', fullLabel: 'Daily Site Log', icon: 'fa-layer-group' },
  {
    tab: 'history',
    label: 'Archive',
    fullLabel: 'Log Archive',
    icon: 'fa-clock-rotate-left',
  },
  {
    tab: 'machinery',
    label: 'Plant',
    fullLabel: 'Plant & Machinery',
    icon: 'fa-truck-monster',
  },
  {
    tab: 'milestones',
    label: 'Stages',
    fullLabel: 'Project Milestones',
    icon: 'fa-chart-gantt',
  },
  {
    tab: 'analytics',
    label: 'Stats',
    fullLabel: 'Insights & Analytics',
    icon: 'fa-chart-pie',
  },
  {
    tab: 'materials',
    label: 'Store',
    fullLabel: 'Site Store & Materials',
    icon: 'fa-boxes-stacked',
  },
];

export const MobileBottomNav: React.FC = React.memo(() => {
  const { activeTab, switchTab, prefetchTab } = useNavigation();

  return (
    <nav
      id="ae-mobile-bottom-nav"
      className="ae-mobile-bottom-nav no-print"
      aria-label="Mobile quick navigation"
    >
      {MOBILE_TABS.map((item) => {
        const isActive = activeTab === item.tab;
        return (
          <button
            key={item.tab}
            type="button"
            className={`ae-bottom-nav-btn ${isActive ? 'is-active' : ''}`}
            data-bottom-tab={item.tab}
            aria-label={item.fullLabel}
            aria-current={isActive ? 'page' : undefined}
            onTouchStart={() => prefetchTab(item.tab)}
            onPointerDown={() => prefetchTab(item.tab)}
            onClick={() => switchTab(item.tab)}
          >
            <span className="ae-bottom-nav-icon">
              <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
            </span>
            <span className="ae-bottom-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
});
MobileBottomNav.displayName = 'MobileBottomNav';
