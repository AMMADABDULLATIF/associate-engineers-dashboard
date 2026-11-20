import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { SiteRecord } from '../../types';

type AuthViewMode =
  | 'login'
  | 'first_setup'
  | 'register_new'
  | 'upgrade_legacy'
  | 'owner_recovery';

function maskEmailHint(email?: string | null): string {
  if (!email || !email.includes('@')) return '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

export const LoginView: React.FC = () => {
  const {
    sitesList,
    isOnline,
    isCloudMode,
    securityStatus,
    refreshSecurityMeta,
    loginWithAccessCode,
    completeFirstTimeSetup,
    completeNewSiteRegistration,
    completeLegacySiteUpgrade,
    verifyOwnerGoogle,
    checkPendingGoogleOwner,
    completeOwnerCodeReset,
    clearDeviceMemory,
  } = useApp();

  const [mode, setMode] = useState<AuthViewMode>('login');
  const [siteName, setSiteName] = useState('');
  const [username, setUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showMainCode, setShowMainCode] = useState(false);

  // First-time Owner setup state
  const [ownerEmail, setOwnerEmail] = useState('ammadrj18@gmail.com');
  const [masterCodeInput, setMasterCodeInput] = useState('');
  const [setupCodeInput, setSetupCodeInput] = useState('');
  const [showSetupSecrets, setShowSetupSecrets] = useState(false);

  // New site / legacy upgrade state
  const [pendingLegacySite, setPendingLegacySite] = useState<SiteRecord | null>(
    null
  );
  const [newSiteCodeInput, setNewSiteCodeInput] = useState('');
  const [showSubCodes, setShowSubCodes] = useState(false);

  // Owner Google recovery state
  const [verifiedOwnerEmail, setVerifiedOwnerEmail] = useState<string | null>(
    null
  );
  const [recoveryOwnerEmail, setRecoveryOwnerEmail] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-open First-Time Security Setup if online + Firebase ready + company security isn't locked yet
  useEffect(() => {
    if (
      isCloudMode &&
      isOnline &&
      securityStatus.loaded &&
      !securityStatus.configured &&
      !securityStatus.error &&
      mode === 'login'
    ) {
      setMode('first_setup');
    } else if (securityStatus.configured && mode === 'first_setup') {
      setMode('login');
    }
  }, [
    isCloudMode,
    isOnline,
    securityStatus.loaded,
    securityStatus.configured,
    securityStatus.error,
    mode,
  ]);

  // Check if mobile Google Redirect sign-in returned an authenticated Owner
  useEffect(() => {
    if (!isCloudMode || !isOnline) return;
    let cancelled = false;
    void checkPendingGoogleOwner().then((email) => {
      if (!cancelled && email) {
        setVerifiedOwnerEmail(email);
        setRecoveryOwnerEmail(email);
        setMode('owner_recovery');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isCloudMode, isOnline, checkPendingGoogleOwner]);

  const resetMessages = () => {
    setErrorMsg(null);
    setInfoMsg(null);
  };

  const openRegisterNewMode = () => {
    resetMessages();
    setSetupCodeInput('');
    setNewSiteCodeInput('');
    setMode('register_new');
  };

  const handleMainLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setSubmitting(true);
    try {
      const result = await loginWithAccessCode(siteName, username, accessCode);
      if (result.ok) {
        void refreshSecurityMeta();
        return;
      }

      if (result.action === 'first_setup') {
        setMode('first_setup');
        setInfoMsg(
          'One-time Owner activation needed before anyone can log in.'
        );
      } else if (result.action === 'register_new') {
        setSetupCodeInput('');
        setNewSiteCodeInput(accessCode.trim());
        setMode('register_new');
        setInfoMsg(
          `"${result.siteName}" is a new construction site. Enter the Company Setup Code to register it.`
        );
      } else if (result.action === 'upgrade_legacy') {
        setPendingLegacySite(result.site);
        setSetupCodeInput('');
        setNewSiteCodeInput('');
        setMode('upgrade_legacy');
        setInfoMsg(
          `Existing site "${result.site.name}" found. Lock it once with Company Setup / Master Code — all past data stays intact.`
        );
      } else {
        setErrorMsg(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setSubmitting(true);
    try {
      const err = await completeFirstTimeSetup({
        ownerEmail,
        masterCode: masterCodeInput,
        setupCode: setupCodeInput,
      });
      if (err) {
        setErrorMsg(err);
      } else {
        setMasterCodeInput('');
        setSetupCodeInput('');
        setMode('login');
        setInfoMsg(
          'Security Lock active! Now enter your Site Name, Name, and Access Code to continue.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterNewSite = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!siteName.trim() || !username.trim()) {
      setErrorMsg('Please enter both New Site Name and Assigned Supervisor Name.');
      return;
    }
    setSubmitting(true);
    try {
      const err = await completeNewSiteRegistration({
        siteName,
        supervisorName: username,
        setupCode: setupCodeInput,
        siteAccessCode: newSiteCodeInput,
      });
      if (err) {
        setErrorMsg(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpgradeLegacySite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingLegacySite) return;
    resetMessages();
    setSubmitting(true);
    try {
      const err = await completeLegacySiteUpgrade({
        site: pendingLegacySite,
        username,
        setupOrMasterCode: setupCodeInput,
        newSiteAccessCode: newSiteCodeInput,
      });
      if (err) {
        setErrorMsg(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOwnerGoogle = async () => {
    resetMessages();
    setSubmitting(true);
    try {
      const res = await verifyOwnerGoogle();
      if (res.ok) {
        setVerifiedOwnerEmail(res.email);
        setRecoveryOwnerEmail(res.email);
        setMasterCodeInput('');
        setSetupCodeInput('');
      } else {
        if (!res.redirectStarted) {
          setErrorMsg(res.error);
        } else {
          setInfoMsg(res.error);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOwnerCodeReset = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setSubmitting(true);
    try {
      const err = await completeOwnerCodeReset({
        newMasterCode: masterCodeInput,
        newSetupCode: setupCodeInput,
        newOwnerEmail: recoveryOwnerEmail,
      });
      if (err) {
        setErrorMsg(err);
      } else {
        setVerifiedOwnerEmail(null);
        setRecoveryOwnerEmail('');
        setMasterCodeInput('');
        setSetupCodeInput('');
        setAccessCode('');
        setMode('login');
        setInfoMsg(
          'New Master Passcode saved! You can now log in below.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const backToLogin = () => {
    resetMessages();
    setPendingLegacySite(null);
    setVerifiedOwnerEmail(null);
    setRecoveryOwnerEmail('');
    setSetupCodeInput('');
    setMasterCodeInput('');
    setNewSiteCodeInput('');
    setMode('login');
  };

  const maskedOwnerHint = maskEmailHint(securityStatus.meta?.ownerEmail);

  const badgeIcon =
    mode === 'first_setup'
      ? 'fa-shield-halved'
      : mode === 'register_new'
      ? 'fa-building-circle-check'
      : mode === 'upgrade_legacy'
      ? 'fa-lock'
      : mode === 'owner_recovery'
      ? 'fa-key'
      : 'fa-building-user';

  const headingTitle =
    mode === 'first_setup'
      ? 'Owner Security Activation'
      : mode === 'register_new'
      ? 'Register New Site'
      : mode === 'upgrade_legacy'
      ? 'Lock Existing Site'
      : mode === 'owner_recovery'
      ? 'Owner Recovery'
      : 'Authorized Site Login';

  const headingSubtitle =
    mode === 'first_setup'
      ? 'One-time setup to protect your sites from unauthorized access'
      : mode === 'register_new'
      ? 'Company Setup Code is required to register a new construction site'
      : mode === 'upgrade_legacy'
      ? 'One-time lock for your existing site — past records stay safe'
      : mode === 'owner_recovery'
      ? 'Verify with registered Owner Google Account to reset master codes'
      : 'Enter site name, your name & Site or Master Access Code';

  return (
    <section
      id="login-view"
      className="w-full max-w-md mx-auto my-4 sm:my-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-amber-600" />

      <div className="text-center mb-5">
        <div
          id="login-supervisor-badge"
          className="ae-supervisor-badge relative inline-flex items-center justify-center mb-4"
        >
          <div className="ae-badge-inner relative z-10 flex items-center justify-center">
            <i className={`fa-solid ${badgeIcon} text-3xl ae-icon-polished`} />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-white">
          {headingTitle}
        </h2>
        <p className="text-xs text-slate-400 mt-1">{headingSubtitle}</p>
      </div>

      {!isOnline && (
        <div
          id="ae-offline-login-hint"
          className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
          role="status"
        >
          Offline mode: you can open previously saved sites on this device.
        </div>
      )}

      {securityStatus.error && isOnline && (
        <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-950/60 px-3 py-2.5 text-xs text-amber-200 flex items-start gap-2">
          <i className="fa-solid fa-triangle-exclamation text-amber-400 mt-0.5 ae-icon-polished" />
          <div className="flex-1">
            <p className="font-semibold text-amber-100">
              Firebase Auth Connection Check
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed">
              {securityStatus.error}
            </p>
            <button
              type="button"
              onClick={() => void refreshSecurityMeta()}
              className="mt-1.5 text-[11px] font-bold text-amber-300 underline"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {infoMsg && (
        <div className="mb-3 rounded-xl border border-cyan-500/35 bg-cyan-950/50 px-3 py-2.5 text-xs text-cyan-200 flex items-start gap-2 ae-auth-info-banner">
          <i className="fa-solid fa-circle-info text-cyan-400 mt-0.5 ae-icon-polished" />
          <span>{infoMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          id="login-error"
          className="mb-3 text-xs text-rose-300 bg-rose-950/70 border border-rose-800/80 p-3 rounded-xl flex items-start gap-2"
        >
          <i className="fa-solid fa-circle-exclamation text-rose-400 mt-0.5 ae-icon-polished" />
          <span id="login-error-text">{errorMsg}</span>
        </div>
      )}

      {/* MODE 1: STANDARD AUTHORIZED LOGIN */}
      {mode === 'login' && (
        <form
          id="login-form"
          autoComplete="off"
          onSubmit={handleMainLogin}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="login-site-name"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
            >
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
              placeholder="e.g. Shifa Heights"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
            />
            <datalist id="existing-sites-list">
              {sitesList.map((site) => (
                <option key={site.id} value={site.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label
              htmlFor="login-username"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
            >
              <i className="fa-solid fa-user-gear text-amber-400 ae-icon-polished" />
              Supervisor / Your Name
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

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="login-access-code"
                className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
              >
                <i className="fa-solid fa-key text-amber-400 ae-icon-polished" />
                Site / Master Access Code
              </label>
              <button
                type="button"
                id="login-new-site-link"
                onClick={openRegisterNewMode}
                className="ae-inline-link-btn shrink-0"
              >
                New Site?
              </button>
            </div>
            <div className="ae-code-input-wrap relative">
              <input
                type="text"
                id="login-access-code"
                name="ae_site_access_pin"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter Site Code or Master Passcode"
                className={`w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-11 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm${
                  showMainCode ? '' : ' ae-masked-code'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowMainCode((v) => !v)}
                aria-label={
                  showMainCode ? 'Hide access code' : 'Show access code'
                }
                className="ae-eye-toggle-btn"
              >
                <i
                  className={`fa-solid ${
                    showMainCode ? 'fa-eye-slash' : 'fa-eye'
                  } ae-icon-polished`}
                />
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 mt-1"
          >
            <i className="fa-solid fa-shield-check text-slate-950 ae-icon-polished" />
            <span>
              {submitting ? 'Verifying...' : 'Sync & Access Dashboard'}
            </span>
          </button>
        </form>
      )}

      {/* MODE 2: FIRST-TIME OWNER SECURITY ACTIVATION */}
      {mode === 'first_setup' && (
        <form
          autoComplete="off"
          onSubmit={handleFirstTimeSetup}
          className="space-y-4"
        >
          <div className="ae-auth-subpanel rounded-xl border border-cyan-500/25 bg-slate-800/50 p-3 text-[11px] text-slate-300 leading-relaxed">
            Set these <strong>once as Owner</strong>. Anyone registering a new
            site will need the <strong>Company Setup Code</strong>, while Owner
            &amp; Project Head use the <strong>Master Passcode</strong> on any
            site.
          </div>

          <div>
            <label
              htmlFor="setup-owner-email"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
            >
              <i className="fa-brands fa-google text-amber-400 ae-icon-polished" />
              Owner Google Recovery Email
            </label>
            <input
              type="email"
              id="setup-owner-email"
              autoComplete="off"
              required
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="owner@gmail.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="setup-master-code"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
            >
              <i className="fa-solid fa-crown text-amber-400 ae-icon-polished" />
              Master Passcode (Owner &amp; Head)
            </label>
            <div className="ae-code-input-wrap relative">
              <input
                type="text"
                id="setup-master-code"
                name="ae_setup_master_pin"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                required
                minLength={6}
                value={masterCodeInput}
                onChange={(e) => setMasterCodeInput(e.target.value)}
                placeholder="Min 6 characters (keep private)"
                className={`w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-11 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm${
                  showSetupSecrets ? '' : ' ae-masked-code'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowSetupSecrets((v) => !v)}
                aria-label="Toggle passcode visibility"
                className="ae-eye-toggle-btn"
              >
                <i
                  className={`fa-solid ${
                    showSetupSecrets ? 'fa-eye-slash' : 'fa-eye'
                  } ae-icon-polished`}
                />
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="setup-company-code"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
            >
              <i className="fa-solid fa-building-lock text-amber-400 ae-icon-polished" />
              Company Setup Code (New Sites)
            </label>
            <input
              type="text"
              id="setup-company-code"
              name="ae_setup_company_pin"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              required
              minLength={4}
              value={setupCodeInput}
              onChange={(e) => setSetupCodeInput(e.target.value)}
              placeholder="Min 4 chars (share only to add a site)"
              className={`w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm${
                showSetupSecrets ? '' : ' ae-masked-code'
              }`}
            />
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-shield-halved text-slate-950 ae-icon-polished" />
            <span>
              {submitting ? 'Activating Lock...' : 'Activate Security Lock'}
            </span>
          </button>
        </form>
      )}

      {/* MODE 3: REGISTER NEW SITE */}
      {mode === 'register_new' && (
        <form
          autoComplete="off"
          onSubmit={handleRegisterNewSite}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="reg-site-name"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
            >
              <i className="fa-solid fa-location-dot text-amber-400 ae-icon-polished" />
              New Construction Site Name
            </label>
            <input
              type="text"
              id="reg-site-name"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              required
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="e.g. Horizon Commercial Complex"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="reg-supervisor-name"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
            >
              <i className="fa-solid fa-user-gear text-amber-400 ae-icon-polished" />
              Assigned Supervisor Name
            </label>
            <input
              type="text"
              id="reg-supervisor-name"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Engr. Bilal Ahmed"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="reg-setup-code"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
            >
              <i className="fa-solid fa-building-lock text-amber-400 ae-icon-polished" />
              Company Setup Code (or Master Code)
            </label>
            <div className="ae-code-input-wrap relative">
              <input
                type="text"
                id="reg-setup-code"
                name="ae_reg_company_pin"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                required
                value={setupCodeInput}
                onChange={(e) => setSetupCodeInput(e.target.value)}
                placeholder="Ask Owner / Head for Setup Code"
                className={`w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-11 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm${
                  showSubCodes ? '' : ' ae-masked-code'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowSubCodes((v) => !v)}
                aria-label="Toggle code visibility"
                className="ae-eye-toggle-btn"
              >
                <i
                  className={`fa-solid ${
                    showSubCodes ? 'fa-eye-slash' : 'fa-eye'
                  } ae-icon-polished`}
                />
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="reg-site-code"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
            >
              <i className="fa-solid fa-key text-amber-400 ae-icon-polished" />
              Create Site Access Code (Min 4 Chars)
            </label>
            <input
              type="text"
              id="reg-site-code"
              name="ae_reg_new_site_pin"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              required
              minLength={4}
              value={newSiteCodeInput}
              onChange={(e) => setNewSiteCodeInput(e.target.value)}
              placeholder="Supervisor will use this code daily"
              className={`w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm${
                showSubCodes ? '' : ' ae-masked-code'
              }`}
            />
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-plus-circle text-slate-950 ae-icon-polished" />
            <span>
              {submitting
                ? 'Creating Secured Site...'
                : 'Register Site & Open Dashboard'}
            </span>
          </button>

          <button
            type="button"
            onClick={backToLogin}
            className="w-full ae-auth-secondary-btn py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 border border-slate-700 hover:bg-slate-800 transition"
          >
            &larr; Back to Login
          </button>
        </form>
      )}

      {/* MODE 4: LOCK EXISTING LEGACY SITE */}
      {mode === 'upgrade_legacy' && pendingLegacySite && (
        <form
          autoComplete="off"
          onSubmit={handleUpgradeLegacySite}
          className="space-y-4"
        >
          <div className="ae-auth-subpanel rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-slate-200 space-y-1">
            <div className="font-semibold text-emerald-300">
              Existing Site: {pendingLegacySite.name}
            </div>
            <div className="text-[11px] text-slate-300">
              All existing daily logs, machinery, milestones &amp; store records
              remain untouched. Lock this site once to continue.
            </div>
          </div>

          <div>
            <label
              htmlFor="upgrade-setup-code"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
            >
              <i className="fa-solid fa-building-lock text-amber-400 ae-icon-polished" />
              Company Setup Code or Master Passcode
            </label>
            <div className="ae-code-input-wrap relative">
              <input
                type="text"
                id="upgrade-setup-code"
                name="ae_upgrade_company_pin"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                required
                value={setupCodeInput}
                onChange={(e) => setSetupCodeInput(e.target.value)}
                placeholder="Enter Company Setup or Master Code"
                className={`w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-11 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm${
                  showSubCodes ? '' : ' ae-masked-code'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowSubCodes((v) => !v)}
                aria-label="Toggle code visibility"
                className="ae-eye-toggle-btn"
              >
                <i
                  className={`fa-solid ${
                    showSubCodes ? 'fa-eye-slash' : 'fa-eye'
                  } ae-icon-polished`}
                />
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="upgrade-site-code"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
            >
              <i className="fa-solid fa-key text-amber-400 ae-icon-polished" />
              Set Site Access Code (Min 4 Chars)
            </label>
            <input
              type="text"
              id="upgrade-site-code"
              name="ae_upgrade_new_site_pin"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              required
              minLength={4}
              value={newSiteCodeInput}
              onChange={(e) => setNewSiteCodeInput(e.target.value)}
              placeholder="Choose Site Access Code for Supervisor"
              className={`w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm${
                showSubCodes ? '' : ' ae-masked-code'
              }`}
            />
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-lock text-slate-950 ae-icon-polished" />
            <span>
              {submitting ? 'Securing Site...' : 'Lock Site & Open Dashboard'}
            </span>
          </button>

          <button
            type="button"
            onClick={backToLogin}
            className="w-full ae-auth-secondary-btn py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 border border-slate-700 hover:bg-slate-800 transition"
          >
            &larr; Back to Login
          </button>
        </form>
      )}

      {/* MODE 5: OWNER GOOGLE RECOVERY */}
      {mode === 'owner_recovery' && (
        <div className="space-y-4">
          {!verifiedOwnerEmail ? (
            <>
              <div className="ae-auth-subpanel rounded-xl border border-slate-700/80 bg-slate-800/60 p-3.5 text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>
                  Only the registered <strong>Owner Google Account</strong> can
                  reset the Master Passcode &amp; Company Setup Code.
                </p>
                {maskedOwnerHint && (
                  <p className="text-amber-300 font-semibold">
                    Registered Owner: {maskedOwnerHint}
                  </p>
                )}
                <p className="text-[11px] text-slate-400">
                  Tip: If a Site Supervisor forgets their Site Access Code, the
                  Owner or Project Head can reset it directly inside the
                  dashboard header (&ldquo;Site Code&rdquo; button).
                </p>
              </div>

              <button
                type="button"
                id="login-submit-btn"
                disabled={submitting}
                onClick={handleVerifyOwnerGoogle}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
              >
                <i className="fa-brands fa-google text-slate-950 ae-icon-polished" />
                <span>
                  {submitting ? 'Verifying...' : 'Verify Owner with Google'}
                </span>
              </button>

              <button
                type="button"
                onClick={backToLogin}
                className="w-full ae-auth-secondary-btn py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 border border-slate-700 hover:bg-slate-800 transition"
              >
                &larr; Back to Login
              </button>
            </>
          ) : (
            <form
              autoComplete="off"
              onSubmit={handleOwnerCodeReset}
              className="space-y-4"
            >
              <div className="ae-auth-subpanel rounded-xl border border-emerald-500/35 bg-emerald-950/35 p-3 text-xs text-emerald-200 flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-emerald-400 ae-icon-polished" />
                <span>Verified Owner: {verifiedOwnerEmail}</span>
              </div>

              <div>
                <label
                  htmlFor="recover-master-code"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-crown text-amber-400 ae-icon-polished" />
                  New Master Passcode (Min 6 Chars)
                </label>
                <div className="ae-code-input-wrap relative">
                  <input
                    type="text"
                    id="recover-master-code"
                    name="ae_recover_master_pin"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    required
                    minLength={6}
                    value={masterCodeInput}
                    onChange={(e) => setMasterCodeInput(e.target.value)}
                    placeholder="Enter new Master Passcode"
                    className={`w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-11 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm${
                      showSetupSecrets ? '' : ' ae-masked-code'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupSecrets((v) => !v)}
                    aria-label="Toggle passcode visibility"
                    className="ae-eye-toggle-btn"
                  >
                    <i
                      className={`fa-solid ${
                        showSetupSecrets ? 'fa-eye-slash' : 'fa-eye'
                      } ae-icon-polished`}
                    />
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="recover-setup-code"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-building-lock text-amber-400 ae-icon-polished" />
                  New Setup Code (Optional — For New Sites)
                </label>
                <input
                  type="text"
                  id="recover-setup-code"
                  name="ae_recover_company_pin"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  value={setupCodeInput}
                  onChange={(e) => setSetupCodeInput(e.target.value)}
                  placeholder="Leave blank to keep existing Setup Code"
                  className={`w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm${
                    showSetupSecrets ? '' : ' ae-masked-code'
                  }`}
                />
              </div>

              <div>
                <label
                  htmlFor="recover-owner-email"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                >
                  <i className="fa-brands fa-google text-amber-400 ae-icon-polished" />
                  Owner Recovery Email (Optional Transfer)
                </label>
                <input
                  type="email"
                  id="recover-owner-email"
                  autoComplete="off"
                  value={recoveryOwnerEmail}
                  onChange={(e) => setRecoveryOwnerEmail(e.target.value)}
                  placeholder="Keep same or enter client Owner Gmail"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <button
                type="submit"
                id="login-submit-btn"
                disabled={submitting}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-floppy-disk text-slate-950 ae-icon-polished" />
                <span>{submitting ? 'Updating...' : 'Save Owner Settings'}</span>
              </button>

              <button
                type="button"
                onClick={backToLogin}
                className="w-full ae-auth-secondary-btn py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 border border-slate-700 hover:bg-slate-800 transition"
              >
                &larr; Cancel
              </button>
            </form>
          )}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-center">
        {mode !== 'owner_recovery' &&
          mode !== 'first_setup' &&
          isCloudMode &&
          securityStatus.configured && (
            <button
              type="button"
              onClick={() => {
                resetMessages();
                setMode('owner_recovery');
              }}
              className="ae-recovery-link-btn text-[11px] text-amber-400 hover:text-amber-300 transition inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            >
              <i className="fa-solid fa-key ae-icon-polished" />
              Owner Recovery (Forgot Code?)
            </button>
          )}

        <button
          type="button"
          onClick={clearDeviceMemory}
          className="ae-clear-memory-btn text-[11px] text-slate-500 hover:text-slate-400 transition inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg ml-auto"
        >
          <i className="fa-solid fa-rotate-left text-slate-500 ae-icon-polished" />
          Clear Local Memory
        </button>
      </div>
    </section>
  );
};
export default LoginView;
