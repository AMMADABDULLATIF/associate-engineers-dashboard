import React from 'react';
import { AutoUpdateBanner } from './components/common/AutoUpdateBanner';
import { Header } from './components/common/Header';
import { ImageLightbox } from './components/common/ImageLightbox';
import { PageHeader } from './components/common/PageHeader';
import { Sidebar } from './components/common/Sidebar';
import { Toast } from './components/common/Toast';
import { AppProvider, useApp } from './context/AppContext';
import { AnalyticsTab } from './features/analytics/AnalyticsTab';
import { LoginView } from './features/auth/LoginView';
import { DailyLogTab } from './features/daily-log/DailyLogTab';
import { LogArchiveTab } from './features/history/LogArchiveTab';
import { MachineryTab } from './features/machinery/MachineryTab';
import { MaterialsTab } from './features/materials/MaterialsTab';
import { MilestonesTab } from './features/milestones/MilestonesTab';
import type { TabKey } from './types';

const LEGACY_TABS: Array<{
  tab: TabKey;
  label: string;
  icon: string;
}> = [
  {
    tab: 'entry',
    label: 'Daily Log Entry Form',
    icon: 'fa-pen-to-square',
  },
  {
    tab: 'history',
    label: 'History & Logs Archive',
    icon: 'fa-clock-rotate-left',
  },
  {
    tab: 'machinery',
    label: 'Machinery & Fuel Log',
    icon: 'fa-truck-fast',
  },
  {
    tab: 'milestones',
    label: 'Task / Milestone Progress',
    icon: 'fa-list-check',
  },
  {
    tab: 'analytics',
    label: 'Analytics & Summary',
    icon: 'fa-chart-simple',
  },
  {
    tab: 'materials',
    label: 'Site Store & Materials',
    icon: 'fa-boxes-stacked',
  },
];

const DashboardShell: React.FC = () => {
  const { activeSite, currentUser, activeTab, switchTab } = useApp();

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'entry':
        return <DailyLogTab />;
      case 'history':
        return <LogArchiveTab />;
      case 'machinery':
        return <MachineryTab />;
      case 'milestones':
        return <MilestonesTab />;
      case 'analytics':
        return <AnalyticsTab />;
      case 'materials':
        return <MaterialsTab />;
      default:
        return <DailyLogTab />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 w-full">
        {!activeSite || !currentUser ? (
          <LoginView />
        ) : (
          <div id="dashboard-view" className="space-y-6">
            <Sidebar />
            <PageHeader />

            <div className="legacy-tab-bar bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-wrap justify-between items-center gap-2 no-print shadow-lg">
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1">
                {LEGACY_TABS.map((t) => {
                  const isActive = activeTab === t.tab;
                  return (
                    <button
                      key={t.tab}
                      type="button"
                      id={`tab-btn-${t.tab}`}
                      onClick={() => switchTab(t.tab)}
                      className={
                        isActive
                          ? 'flex-shrink-0 px-4 py-2.5 rounded-lg font-semibold text-xs transition flex items-center justify-center gap-2 bg-amber-500 text-slate-950 shadow-md'
                          : 'flex-shrink-0 px-4 py-2.5 rounded-lg font-semibold text-xs transition flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800'
                      }
                    >
                      <i
                        className={`fa-solid ${t.icon} ${
                          isActive ? 'text-slate-950' : 'text-white'
                        } ae-icon-polished`}
                      />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {renderActiveTab()}
          </div>
        )}
      </main>

      <ImageLightbox />
      <Toast />
      <AutoUpdateBanner />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <DashboardShell />
    </AppProvider>
  );
};

export default App;
