import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const LoginView: React.FC = () => {
  const { sitesList, isOnline, login, clearDeviceMemory } = useApp();
  const [siteName, setSiteName] = useState('');
  const [username, setUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const err = await login(siteName, username);
      if (err) {
        setErrorMsg(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="login-view"
      className="w-full max-w-md mx-auto my-4 sm:my-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-amber-600" />

      <div className="text-center mb-6">
        <div
          id="login-supervisor-badge"
          className="ae-supervisor-badge relative inline-flex items-center justify-center mb-4"
        >
          <div className="ae-badge-inner relative z-10 flex items-center justify-center">
            <i className="fa-solid fa-building-user text-3xl ae-icon-polished" />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-white">
          Site Supervisor Login
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Enter site name &amp; supervisor name to access multi-device sync
        </p>
      </div>

      {!isOnline && (
        <div
          id="ae-offline-login-hint"
          className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
          role="status"
        >
          Offline mode: login will use this device&apos;s saved site data.
        </div>
      )}

      <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i className="fa-solid fa-location-dot text-amber-400 ae-icon-polished" />
            Construction Site Name
          </label>
          <input
            type="text"
            id="login-site-name"
            list="existing-sites-list"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            required
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="e.g. Horizon Commercial Complex"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
          />
          <datalist id="existing-sites-list">
            {sitesList.map((site) => (
              <option key={site.id} value={site.name} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i className="fa-solid fa-user-gear text-amber-400 ae-icon-polished" />
            Supervisor Name
          </label>
          <input
            type="text"
            id="login-username"
            name="supervisor_login_field"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. Engr. Ali Khan"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
          />
        </div>

        {errorMsg && (
          <div
            id="login-error"
            className="text-xs text-rose-300 bg-rose-950/70 border border-rose-800/80 p-3 rounded-xl flex items-center gap-2"
          >
            <i className="fa-solid fa-circle-exclamation text-rose-400 ae-icon-polished" />
            <span id="login-error-text">{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          id="login-submit-btn"
          disabled={submitting}
          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 mt-1"
        >
          <i className="fa-solid fa-cloud-arrow-down text-slate-950 ae-icon-polished" />
          <span>{submitting ? 'Syncing...' : 'Sync & Access Dashboard'}</span>
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
        <button
          type="button"
          onClick={clearDeviceMemory}
          className="ae-clear-memory-btn text-[11px] text-slate-500 hover:text-slate-400 transition inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg"
        >
          <i className="fa-solid fa-rotate-left text-slate-500 ae-icon-polished" />
          Clear Local Device Memory
        </button>
      </div>
    </section>
  );
};
export default LoginView;
