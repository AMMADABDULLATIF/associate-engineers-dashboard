import React from 'react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC = React.memo(() => {
  const {
    theme,
    toggleTheme,
    syncStatus,
    canInstallPWA,
    installPWA,
    activeSite,
    currentUser,
    logout,
  } = useApp();

  const isSyncing = syncStatus.state === 'syncing';
  const isCloudOk = syncStatus.state === 'cloud';

  const badgeClass = isSyncing
    ? 'bg-amber-950/60 border border-amber-700/60 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-amber-300 flex items-center gap-1.5 shadow-sm'
    : isCloudOk
    ? 'bg-emerald-950/60 border border-emerald-700/60 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5 shadow-sm'
    : 'bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-amber-400 flex items-center gap-1.5 shadow-sm';

  const dotClass = isSyncing
    ? 'w-2 h-2 rounded-full bg-amber-400 animate-pulse'
    : isCloudOk
    ? 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse'
    : 'w-2 h-2 rounded-full bg-amber-400';

  const iconClass = isSyncing
    ? 'fa-solid fa-arrows-rotate fa-spin text-amber-400 ae-icon-polished'
    : isCloudOk
    ? 'fa-solid fa-cloud text-emerald-400 ae-icon-polished'
    : 'fa-solid fa-hard-drive text-amber-400 ae-icon-polished';

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="ae-brandmark" aria-label="Associate Engineers logo">
            <svg viewBox="0 0 52 52" role="img" aria-label="AE monogram">
              <defs>
                <linearGradient
                  id="aeBrandGradient"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0" stopColor="#66e8ff" />
                  <stop offset="1" stopColor="#8275ff" />
                </linearGradient>
              </defs>
              <path
                d="M26 3 47 15v22L26 49 5 37V15Z"
                fill="none"
                stroke="url(#aeBrandGradient)"
                strokeWidth="2.5"
              />
              <path
                d="M14 34 24 14h5l10 20h-6l-2.1-4.5h-9.2L19.5 34Zm9.7-9h5.1l-2.6-5.7Z"
                fill="url(#aeBrandGradient)"
              />
              <path
                d="M32 14h8v4h-8zM34 21h6v3.5h-6z"
                fill="#66e8ff"
              />
            </svg>
          </div>

          <div>
            <h1 className="font-extrabold text-base sm:text-xl tracking-tight text-white flex items-center gap-2">
              ASSOCIATE ENGINEERS
            </h1>
            <p className="text-[10px] sm:text-xs text-amber-500 font-medium tracking-wide uppercase">
              Daily Site Log Dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            id="theme-toggle-btn"
            onClick={toggleTheme}
            title={
              theme === 'light'
                ? 'Switch to Dark Mode'
                : 'Switch to Light Mode'
            }
            aria-label="Toggle Light or Dark Mode"
            aria-pressed={theme === 'light'}
            className="ae-theme-toggle-btn"
          >
            <i
              id="theme-toggle-icon"
              className={`fa-solid ${
                theme === 'light' ? 'fa-moon' : 'fa-sun'
              } ae-icon-polished`}
            />
            <span id="theme-toggle-label" className="hidden sm:inline">
              {theme === 'light' ? 'Dark' : 'Light'}
            </span>
          </button>

          <div id="cloud-sync-badge" className={badgeClass}>
            <span id="sync-status-dot" className={dotClass} />
            <i id="sync-status-icon" className={iconClass} />
            <span id="sync-status-text" className="hidden sm:inline">
              {syncStatus.text}
            </span>
          </div>

          <button
            type="button"
            id="pwa-install-btn"
            onClick={installPWA}
            className={`${
              canInstallPWA ? 'inline-flex' : 'hidden'
            } bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs px-3 py-1.5 rounded-lg font-semibold transition items-center gap-1.5`}
          >
            <i className="fa-solid fa-download text-white ae-icon-polished" />
            <span>Install App</span>
          </button>

          {activeSite && currentUser && (
            <div
              id="header-user-section"
              className="flex items-center gap-2 sm:gap-3"
            >
              <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
                <span className="text-slate-400 hidden sm:inline">Site:</span>
                <strong
                  id="active-site-display"
                  className="text-amber-400 font-semibold max-w-[120px] sm:max-w-none truncate"
                >
                  {activeSite.name}
                </strong>
                <span className="text-slate-600 hidden sm:inline">|</span>
                <span className="text-slate-400 hidden sm:inline">
                  Supervisor:
                </span>
                <span
                  id="active-user-display"
                  className="text-slate-200 font-medium hidden sm:inline"
                >
                  {currentUser}
                </span>
              </div>

              <button
                type="button"
                onClick={logout}
                className="ae-btn-logout bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition flex items-center gap-1.5"
              >
                <i className="fa-solid fa-right-from-bracket text-white ae-icon-polished" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
});
Header.displayName = 'Header';
