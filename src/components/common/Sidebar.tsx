import React from 'react';
import { useApp } from '../../context/AppContext';
import type { TabKey } from '../../types';

const NAV_ITEMS: Array<{
  tab: TabKey;
  label: string;
  num: string;
  icon: string;
}> = [
  { tab: 'entry', label: 'Daily Site Log', num: '01', icon: 'fa-layer-group' },
  {
    tab: 'history',
    label: 'Log Archive',
    num: '02',
    icon: 'fa-clock-rotate-left',
  },
  {
    tab: 'machinery',
    label: 'Plant & Machinery',
    num: '03',
    icon: 'fa-truck-monster',
  },
  {
    tab: 'milestones',
    label: 'Project Milestones',
    num: '04',
    icon: 'fa-chart-gantt',
  },
  {
    tab: 'analytics',
    label: 'Insights & Analytics',
    num: '05',
    icon: 'fa-chart-pie',
  },
  {
    tab: 'materials',
    label: 'Site Store & Materials',
    num: '06',
    icon: 'fa-boxes-stacked',
  },
];

export const Sidebar: React.FC = () => {
  const { activeTab, switchTab, mobileMenuOpen, closeMobileMenu } = useApp();

  return (
    <>
      <div
        id="mobile-sidebar-backdrop"
        className={`ae-sidebar-backdrop no-print ${
          mobileMenuOpen ? 'is-open' : ''
        }`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />
      <aside
        id="saas-sidebar"
        className={`saas-sidebar no-print ${
          mobileMenuOpen ? 'ae-mobile-drawer-open' : ''
        }`}
        aria-label="Main navigation"
      >
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">
            <svg viewBox="0 0 52 52" aria-label="AE logo">
              <path
                d="M7 39 18 13h6l11 26h-7l-2.2-5.5H16L13.8 39Z"
                fill="currentColor"
              />
              <path
                d="M18.4 27.8h5.8l-2.9-7.1Z"
                fill="#10162a"
              />
              <path
                d="M31 13h14v5.5H37v4.8h7.5v5.2H37v5h8V39H31Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span>
            <strong>AE WORKSITE</strong>
            <small>PROJECT OPERATIONS</small>
          </span>
          <button
            type="button"
            className="ae-drawer-close"
            onClick={closeMobileMenu}
            aria-label="Close navigation menu"
          >
            <i className="fa-solid fa-xmark ae-icon-polished" />
          </button>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        {NAV_ITEMS.map((item) => (
          <button
            key={item.tab}
            type="button"
            className={`side-link ${activeTab === item.tab ? 'active' : ''}`}
            data-nav-tab={item.tab}
            onClick={() => switchTab(item.tab)}
          >
            <i className={`fa-solid ${item.icon} ae-icon-polished`} />
            <span>{item.label}</span>
            <b>{item.num}</b>
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span className="status-pulse" />
            <span>
              <strong>Cloud workspace</strong>
              <small id="sidebar-sync-label">Live data connection</small>
            </span>
          </div>
          <div className="sidebar-footnote">
            ASSOCIATE ENGINEERS <span>FIELD OPERATIONS SUITE</span>
          </div>
        </div>
      </aside>
    </>
  );
};
