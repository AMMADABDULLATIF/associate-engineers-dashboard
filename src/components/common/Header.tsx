import React, { useState } from 'react';
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
    authRole,
    isCloudMode,
    resetCurrentSiteCode,
    logout,
  } = useApp();

  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [newSiteCode, setNewSiteCode] = useState('');
  const [showNewCode, setShowNewCode] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [savingCode, setSavingCode] = useState(false);

  const canManageSiteCode =
    Boolean(activeSite && isCloudMode) &&
    (authRole === 'master' || authRole === 'owner');

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

  const openSecurityModal = () => {
    setNewSiteCode('');
    setShowNewCode(false);
    setModalError(null);
    setSecurityModalOpen(true);
  };

  const closeSecurityModal = () => {
    if (savingCode) return;
    setSecurityModalOpen(false);
    setModalError(null);
    setNewSiteCode('');
  };

  const handleSaveSiteCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSavingCode(true);
    try {
      const err = await resetCurrentSiteCode(newSiteCode);
      if (err) {
        setModalError(err);
      } else {
        setSecurityModalOpen(false);
        setNewSiteCode('');
      }
    } finally {
      setSavingCode(false);
    }
  };

  return (
    <>
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
                className="flex items-center gap-2 sm:gap-2.5"
              >
                <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
                  <span className="text-slate-400 hidden sm:inline">Site:</span>
                  <strong
                    id="active-site-display"
                    className="text-amber-400 font-semibold max-w-[110px] sm:max-w-none truncate"
                  >
                    {activeSite.name}
                  </strong>
                  <span className="text-slate-600 hidden sm:inline">|</span>
                  <span className="text-slate-400 hidden sm:inline">
                    {authRole === 'master' || authRole === 'owner'
                      ? 'Master:'
                      : 'Supervisor:'}
                  </span>
                  <span
                    id="active-user-display"
                    className="text-slate-200 font-medium hidden sm:inline"
                  >
                    {currentUser}
                  </span>
                </div>

                {canManageSiteCode && (
                  <button
                    type="button"
                    id="header-site-code-btn"
                    onClick={openSecurityModal}
                    title="Reset Supervisor Site Access Code"
                    className="ae-site-code-btn bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-700/50 text-xs px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition flex items-center gap-1.5 font-semibold"
                  >
                    <i className="fa-solid fa-key text-cyan-300 ae-icon-polished" />
                    <span className="hidden sm:inline">Site Code</span>
                  </button>
                )}

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

      {securityModalOpen && activeSite && (
        <div
          id="site-security-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="site-security-modal-title"
          className="ae-security-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSecurityModal();
          }}
        >
          <div className="ae-security-modal-card w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 p-5 sm:p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3
                  id="site-security-modal-title"
                  className="text-base sm:text-lg font-bold text-white flex items-center gap-2"
                >
                  <i className="fa-solid fa-key text-cyan-400 ae-icon-polished" />
                  Reset Site Access Code
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Site: <strong className="text-amber-300">{activeSite.name}</strong>{' '}
                  {activeSite.supervisor ? `• Supervisor: ${activeSite.supervisor}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={closeSecurityModal}
                aria-label="Close modal"
                className="ae-modal-close-btn w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="ae-auth-subpanel rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200 mb-4 leading-relaxed">
              Updating this code immediately revokes the previous supervisor code
              and logs out old supervisor sessions on this site.
            </div>

            {modalError && (
              <div className="mb-3 text-xs text-rose-300 bg-rose-950/70 border border-rose-800/80 p-3 rounded-xl flex items-start gap-2">
                <i className="fa-solid fa-circle-exclamation text-rose-400 mt-0.5 ae-icon-polished" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSiteCode} className="space-y-4">
              <div>
                <label
                  htmlFor="modal-new-site-code"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  New Site Access Code (Min 4 Chars)
                </label>
                <div className="ae-code-input-wrap relative">
                  <input
                    type="text"
                    id="modal-new-site-code"
                    name="ae_site_pin_reset"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    required
                    minLength={4}
                    autoFocus
                    value={newSiteCode}
                    onChange={(e) => setNewSiteCode(e.target.value)}
                    placeholder="Enter new Site Access Code"
                    className={`w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-11 py-3 text-slate-100 focus:outline-none focus:border-cyan-400 text-sm${
                      showNewCode ? '' : ' ae-masked-code'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewCode((v) => !v)}
                    aria-label={showNewCode ? 'Hide code' : 'Show code'}
                    className="ae-eye-toggle-btn"
                  >
                    <i
                      className={`fa-solid ${
                        showNewCode ? 'fa-eye-slash' : 'fa-eye'
                      } ae-icon-polished`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeSecurityModal}
                  className="ae-auth-secondary-btn px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 border border-slate-700 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCode}
                  className="ae-modal-primary-btn px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg transition flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-shield-check ae-icon-polished" />
                  <span>{savingCode ? 'Updating...' : 'Update Site Code'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
});
Header.displayName = 'Header';
