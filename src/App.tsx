import React, { Suspense, lazy, useEffect } from 'react';
import { AutoUpdateBanner } from './components/common/AutoUpdateBanner';
import { Header } from './components/common/Header';
import { ImageLightbox } from './components/common/ImageLightbox';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { PageHeader } from './components/common/PageHeader';
import { Sidebar } from './components/common/Sidebar';
import { Toast } from './components/common/Toast';
import { TAB_LOADERS } from './constants/tabLoaders';
import { AppProvider, useApp } from './context/AppContext';
import { LoginView } from './features/auth/LoginView';
import type { TabKey } from './types';

const DailyLogTab = lazy(TAB_LOADERS.entry);
const LogArchiveTab = lazy(TAB_LOADERS.history);
const MachineryTab = lazy(TAB_LOADERS.machinery);
const MilestonesTab = lazy(TAB_LOADERS.milestones);
const AnalyticsTab = lazy(TAB_LOADERS.analytics);
const MaterialsTab = lazy(TAB_LOADERS.materials);

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

const TabLoadingFallback: React.FC = () => (
  <div
    className="ae-tab-loader bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center"
    role="status"
    aria-live="polite"
  >
    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
      <i className="fa-solid fa-spinner fa-spin text-amber-400 text-base ae-icon-polished" />
    </div>
    <p className="text-xs font-semibold text-slate-400">
      Loading workspace module...
    </p>
  </div>
);

const DashboardShell: React.FC = () => {
  const { activeSite, currentUser, activeTab, switchTab } = useApp();
  const isAuthenticated = Boolean(activeSite && currentUser);

  // Warm inactive tab chunks during idle after authentication so offline PWA retains every module
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const loaders = [
      TAB_LOADERS.history,
      TAB_LOADERS.materials,
      TAB_LOADERS.machinery,
      TAB_LOADERS.milestones,
      TAB_LOADERS.analytics,
    ];
    const timer = window.setTimeout(() => {
      const runNext = (idx: number) => {
        if (cancelled || idx >= loaders.length) return;
        loaders[idx]().catch(() => {});
        const w = window as unknown as {
          requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        };
        if (typeof w.requestIdleCallback === 'function') {
          w.requestIdleCallback(() => runNext(idx + 1), { timeout: 600 });
        } else {
          window.setTimeout(() => runNext(idx + 1), 120);
        }
      };
      runNext(0);
    }, 650);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isAuthenticated]);

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
        {!isAuthenticated ? (
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

            <Suspense fallback={<TabLoadingFallback />}>
              {renderActiveTab()}
            </Suspense>
          </div>
        )}
      </main>

      {isAuthenticated && <MobileBottomNav />}
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
