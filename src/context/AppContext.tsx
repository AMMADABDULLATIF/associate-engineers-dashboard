import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PAGE_META, STORAGE_KEYS } from '../constants/defaults';
import { prefetchTabChunk } from '../constants/tabLoaders';
import {
  authenticateLockedSite,
  checkGoogleRedirectOwner,
  checkSiteStatus,
  clearSiteSessionProof,
  deleteLogDoc,
  deleteMachineryDocAndSyncLogs,
  deleteMaterialDoc,
  deleteMilestoneDoc,
  getCompanySecurityMeta,
  hashMasterCode,
  hashSiteCode,
  initFirebaseApp,
  isFirebaseReady,
  normalizeAccessCode,
  registerNewSiteWithCode,
  resetCompanyCodesViaOwner,
  rotateSiteAccessCode,
  saveLogDoc,
  saveMachineryDocAndSyncLogs,
  saveMaterialDoc,
  saveMilestoneDoc,
  setupCompanySecurity,
  signInOwnerWithGoogle,
  signOutOwnerGoogleIfActive,
  subscribeToSiteCollections,
  syncSiteSessionProof,
  upgradeLegacySiteAccess,
} from '../services/firebase';
import {
  clearDailyDraft,
  clearStoredSession,
  getSiteLogs,
  getSiteMachinery,
  getSiteMaterials,
  getSiteMilestones,
  getSitesList,
  getStoredSession,
  getStoredTheme,
  makeSiteId,
  normalizeLoginText,
  saveSiteLogs,
  saveSiteMachinery,
  saveSiteMaterials,
  saveSiteMilestones,
  saveStoredSession,
  setStoredTheme,
  syncMachineryIntoLogs,
  upsertStoredSite,
} from '../services/storage';
import type {
  AuthRole,
  CompanySecurityMeta,
  DailyLogRecord,
  MachineryRecord,
  MaterialEntry,
  MilestoneRecord,
  SiteRecord,
  SyncState,
  TabKey,
  ThemeMode,
} from '../types';

export interface PageHeaderInfo {
  crumb: string;
  title: string;
  subtitle: string;
}

export interface LightboxState {
  images: string[];
  index: number;
}

export interface SecurityStatusState {
  loaded: boolean;
  configured: boolean;
  meta: CompanySecurityMeta | null;
  error: string | null;
}

export type LoginAttemptResult =
  | { ok: true }
  | { ok: false; action: 'error'; error: string }
  | { ok: false; action: 'first_setup'; siteName: string; username: string }
  | {
      ok: false;
      action: 'register_new';
      siteId: string;
      siteName: string;
      username: string;
    }
  | {
      ok: false;
      action: 'upgrade_legacy';
      site: SiteRecord;
      username: string;
    };

interface AppContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  sitesList: SiteRecord[];
  activeSite: SiteRecord | null;
  currentUser: string | null;
  authRole: AuthRole;
  securityStatus: SecurityStatusState;
  refreshSecurityMeta: () => Promise<void>;
  activeTab: TabKey;
  switchTab: (tab: TabKey) => void;
  pageHeader: PageHeaderInfo;
  setPageHeaderOverride: (info: PageHeaderInfo | null) => void;
  syncStatus: { text: string; state: SyncState };
  isOnline: boolean;
  isCloudMode: boolean;
  logs: DailyLogRecord[];
  machinery: MachineryRecord[];
  milestones: MilestoneRecord[];
  materials: MaterialEntry[];
  editingLogId: string | null;
  setEditingLogId: (id: string | null) => void;
  viewingLogId: string | null;
  setViewingLogId: (id: string | null) => void;
  startEditLog: (logId: string) => void;
  toastMessage: string;
  toastVisible: boolean;
  showToast: (msg: string) => void;
  lightboxState: LightboxState | null;
  openLightbox: (images: string[], index?: number) => void;
  closeLightbox: () => void;
  updateLightboxImages: (images: string[], index: number) => void;
  canInstallPWA: boolean;
  installPWA: () => Promise<void>;
  loginWithAccessCode: (
    siteName: string,
    username: string,
    accessCode: string
  ) => Promise<LoginAttemptResult>;
  completeFirstTimeSetup: (params: {
    ownerEmail: string;
    masterCode: string;
    setupCode: string;
  }) => Promise<string | null>;
  completeNewSiteRegistration: (params: {
    siteName: string;
    supervisorName: string;
    setupCode: string;
    siteAccessCode: string;
  }) => Promise<string | null>;
  completeLegacySiteUpgrade: (params: {
    site: SiteRecord;
    username: string;
    setupOrMasterCode: string;
    newSiteAccessCode: string;
  }) => Promise<string | null>;
  verifyOwnerGoogle: () => Promise<
    | { ok: true; email: string }
    | { ok: false; redirectStarted?: boolean; error: string }
  >;
  checkPendingGoogleOwner: () => Promise<string | null>;
  completeOwnerCodeReset: (params: {
    newMasterCode: string;
    newSetupCode?: string;
    newOwnerEmail?: string;
  }) => Promise<string | null>;
  resetCurrentSiteCode: (newSiteCode: string) => Promise<string | null>;
  logout: () => void;
  clearDeviceMemory: () => void;
  saveDailyLogEntry: (
    docId: string,
    payload: Omit<DailyLogRecord, 'id'>,
    isNewLog: boolean
  ) => void;
  deleteDailyLogEntry: (logId: string) => Promise<void>;
  saveMachineryEntry: (
    docId: string,
    payload: Omit<MachineryRecord, 'id'>,
    oldDate: string | null
  ) => void;
  deleteMachineryEntry: (id: string) => Promise<void>;
  saveMilestoneEntry: (
    docId: string,
    payload: Omit<MilestoneRecord, 'id'>
  ) => Promise<void>;
  deleteMilestoneEntry: (id: string) => Promise<void>;
  saveMaterialEntry: (docId: string, payload: MaterialEntry) => void;
  deleteMaterialEntry: (materialId: string) => Promise<void>;
  setFormDirty: (formId: string, dirty: boolean) => void;
  setFormSaving: (formId: string, saving: boolean) => void;
  adjustImageReads: (delta: number) => void;
  canAutoReloadSafely: () => boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

interface NavigationContextValue {
  activeTab: TabKey;
  switchTab: (tab: TabKey) => void;
  pageHeader: PageHeaderInfo;
  prefetchTab: (tab: TabKey) => void;
}

const NavigationContext = createContext<NavigationContextValue>({
  activeTab: 'entry',
  switchTab: () => {},
  pageHeader: PAGE_META.entry,
  prefetchTab: () => {},
});

function scheduleIdleWrite(fn: () => void): void {
  if (typeof window === 'undefined') {
    fn();
    return;
  }
  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(fn, { timeout: 600 });
  } else {
    window.setTimeout(fn, 48);
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());
  const [sitesList, setSitesList] = useState<SiteRecord[]>(() =>
    getSitesList()
  );
  const [activeSite, setActiveSite] = useState<SiteRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [authRole, setAuthRole] = useState<AuthRole>('local');
  const [sessionKeyHash, setSessionKeyHash] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey>('entry');
  const [pageHeaderOverride, setPageHeaderOverride] =
    useState<PageHeaderInfo | null>(null);

  const [securityStatus, setSecurityStatus] = useState<SecurityStatusState>({
    loaded: false,
    configured: false,
    meta: null,
    error: null,
  });

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  );
  const [isCloudMode, setIsCloudMode] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<{
    text: string;
    state: SyncState;
  }>({
    text: 'Local Device Mode',
    state: 'local',
  });

  const [logs, setLogs] = useState<DailyLogRecord[]>([]);
  const [machinery, setMachinery] = useState<MachineryRecord[]>([]);
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);

  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [viewingLogId, setViewingLogId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);

  const [lightboxState, setLightboxState] = useState<LightboxState | null>(
    null
  );
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const listenerGenerationRef = useRef<number>(0);
  const dirtyFormsRef = useRef<Set<string>>(new Set());
  const savingFormsRef = useRef<Set<string>>(new Set());
  const imageReadsInFlightRef = useRef<number>(0);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastVisible(false);
    }, 3400);
  }, []);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute(
        'content',
        theme === 'light' ? '#f3f6fb' : '#030712'
      );
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      setStoredTheme(next);
      return next;
    });
  }, []);

  const refreshSecurityMeta = useCallback(async () => {
    if (!isFirebaseReady()) {
      const resInit = initFirebaseApp();
      setIsCloudMode(resInit.initialized);
    }
    if (!isFirebaseReady() || !navigator.onLine) return;
    const res = await getCompanySecurityMeta();
    if (res.ok) {
      setSecurityStatus({
        loaded: true,
        configured: res.configured,
        meta: res.meta,
        error: null,
      });
    } else {
      const errCode = res.error?.code || '';
      const msg =
        errCode === 'auth/operation-not-allowed'
          ? 'Enable Anonymous Authentication in Firebase Console (Authentication -> Sign-in method -> Anonymous).'
          : res.error?.message || null;
      setSecurityStatus((prev) => ({
        loaded: true,
        configured: prev.configured,
        meta: prev.meta,
        error: msg,
      }));
    }
  }, []);

  const forceSecurityLogout = useCallback(
    (reason: string) => {
      listenerGenerationRef.current += 1;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      clearStoredSession();
      setActiveSite(null);
      setCurrentUser(null);
      setAuthRole('local');
      setSessionKeyHash('');
      setEditingLogId(null);
      setViewingLogId(null);
      setPageHeaderOverride(null);
      setActiveTab('entry');
      setLogs([]);
      setMachinery([]);
      setMilestones([]);
      setMaterials([]);
      dirtyFormsRef.current.clear();
      savingFormsRef.current.clear();
      showToast(reason);
    },
    [showToast]
  );

  // Initialize Firebase + restore stored session once
  useEffect(() => {
    const { initialized } = initFirebaseApp();
    setIsCloudMode(initialized);
    if (initialized) {
      setSyncStatus({ text: 'Firebase Ready', state: 'cloud' });
    }

    const session = getStoredSession();
    if (session) {
      // If online with Firebase ready and an old legacy unverified session has no keyHash, prompt re-login securely
      if (initialized && navigator.onLine && !session.keyHash) {
        clearStoredSession();
        showToast(
          'Security lock enabled! Please enter your Site Access Code once to verify.'
        );
      } else {
        setActiveSite(session.site);
        setCurrentUser(session.user);
        setAuthRole(session.role || 'local');
        setSessionKeyHash(session.keyHash || '');
        setLogs(getSiteLogs(session.site.id));
        setMachinery(getSiteMachinery(session.site.id));
        setMilestones(getSiteMilestones(session.site.id));
        setMaterials(getSiteMaterials(session.site.id));
        if (session.tab) {
          setActiveTab(session.tab);
        }
      }
    }

    if (initialized && navigator.onLine) {
      void getCompanySecurityMeta().then((res) => {
        if (res.ok) {
          setSecurityStatus({
            loaded: true,
            configured: res.configured,
            meta: res.meta,
            error: null,
          });
        } else {
          const errCode = res.error?.code || '';
          setSecurityStatus({
            loaded: true,
            configured: false,
            meta: null,
            error:
              errCode === 'auth/operation-not-allowed'
                ? 'Enable Anonymous Authentication in Firebase Console (Authentication -> Sign-in method -> Anonymous).'
                : res.error?.message || null,
          });
        }
      });
    }
  }, [showToast]);

  // Subscribe to site Firestore collections when activeSite & Firebase are ready
  const attachListeners = useCallback(
    async (siteId: string, keyHash: string, role: AuthRole) => {
      const gen = ++listenerGenerationRef.current;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (!isFirebaseReady()) return;

      if (!keyHash && navigator.onLine) {
        forceSecurityLogout(
          'Security verification required. Please sign in with your Access Code.'
        );
        return;
      }

      setSyncStatus({ text: 'Verifying secure session…', state: 'syncing' });

      if (keyHash && navigator.onLine) {
        const synced = await syncSiteSessionProof(siteId, keyHash, role);
        if (gen !== listenerGenerationRef.current) return;
        if (!synced) {
          forceSecurityLogout(
            'Access Code expired or changed by Owner. Please sign in again.'
          );
          return;
        }
      }

      if (gen !== listenerGenerationRef.current) return;

      setSyncStatus({ text: 'Connecting to Firebase…', state: 'syncing' });
      const { unsubscribeAll } = subscribeToSiteCollections(siteId, {
        onLogs: (incomingLogs, meta) => {
          setLogs(incomingLogs);
          scheduleIdleWrite(() => saveSiteLogs(siteId, incomingLogs));
          if (meta.fromCache) {
            setSyncStatus({
              text: 'Firebase cache — waiting for server…',
              state: 'syncing',
            });
          } else if (meta.hasPendingWrites) {
            setSyncStatus({ text: 'Syncing changes…', state: 'syncing' });
          } else {
            setSyncStatus({ text: 'Firebase Synced', state: 'cloud' });
          }
        },
        onLogsError: (err) => {
          console.error('Firestore realtime listener error:', err);
          if (err && err.code === 'permission-denied') {
            setSyncStatus({
              text: 'Access Revoked / Sign In Needed',
              state: 'error',
            });
            forceSecurityLogout(
              'Site Access Code was changed or session expired. Please sign in again.'
            );
          } else {
            setSyncStatus({
              text: 'Firebase Reconnecting…',
              state: 'syncing',
            });
          }
        },
        onMachinery: (incomingMachinery) => {
          setMachinery(incomingMachinery);
          scheduleIdleWrite(() => saveSiteMachinery(siteId, incomingMachinery));
        },
        onMilestones: (incomingMilestones) => {
          setMilestones(incomingMilestones);
          scheduleIdleWrite(() => saveSiteMilestones(siteId, incomingMilestones));
        },
        onMaterials: (incomingMaterials) => {
          setMaterials(incomingMaterials);
          scheduleIdleWrite(() => saveSiteMaterials(siteId, incomingMaterials));
        },
      });

      unsubscribeRef.current = unsubscribeAll;
    },
    [forceSecurityLogout]
  );

  useEffect(() => {
    if (activeSite && isCloudMode) {
      void attachListeners(activeSite.id, sessionKeyHash, authRole);
    }
    return () => {
      listenerGenerationRef.current += 1;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [activeSite, isCloudMode, sessionKeyHash, authRole, attachListeners]);

  // Network online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void refreshSecurityMeta();
      if (activeSite && isFirebaseReady()) {
        setSyncStatus({ text: 'Reconnecting…', state: 'syncing' });
        void attachListeners(activeSite.id, sessionKeyHash, authRole);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      if (isCloudMode) {
        setSyncStatus({
          text: 'Offline — changes queued',
          state: 'syncing',
        });
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [
    activeSite,
    isCloudMode,
    sessionKeyHash,
    authRole,
    attachListeners,
    refreshSecurityMeta,
  ]);

  // PWA beforeinstallprompt & appinstalled
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setDeferredInstallPrompt(null);
      showToast('ASSOCIATE LOG app installed successfully!');
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [showToast]);

  const installPWA = useCallback(async () => {
    if (deferredInstallPrompt) {
      await deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredInstallPrompt(null);
      } else {
        setDeferredInstallPrompt(null);
      }
    } else {
      showToast(
        "To install: Tap Chrome's menu (3 dots at top-right) and select 'Install app'."
      );
    }
  }, [deferredInstallPrompt, showToast]);

  // Lock body scroll only when fullscreen lightbox is open
  useEffect(() => {
    document.body.style.overflow = lightboxState ? 'hidden' : '';
  }, [lightboxState]);

  // Persist active session whenever site/user/tab/role/keyHash changes
  useEffect(() => {
    if (activeSite && currentUser) {
      scheduleIdleWrite(() => {
        saveStoredSession({
          site: activeSite,
          user: currentUser,
          role: authRole,
          keyHash: sessionKeyHash,
          tab: activeTab,
        });
      });
    }
  }, [activeSite, currentUser, authRole, sessionKeyHash, activeTab]);

  const prefetchTab = useCallback((tab: TabKey) => {
    prefetchTabChunk(tab);
  }, []);

  const switchTab = useCallback((tab: TabKey) => {
    prefetchTabChunk(tab);
    setViewingLogId(null);
    setPageHeaderOverride(null);
    setActiveTab(tab);
    if (window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const startEditLog = useCallback((logId: string) => {
    setEditingLogId(logId);
    setViewingLogId(null);
    setPageHeaderOverride(null);
    setActiveTab('entry');
    if (window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const finalizeLoginSession = useCallback(
    (
      site: SiteRecord,
      username: string,
      role: AuthRole,
      keyHash: string,
      cloudActive: boolean
    ) => {
      const updatedSites = upsertStoredSite(site);
      setSitesList(updatedSites);

      setLogs(getSiteLogs(site.id));
      setMachinery(getSiteMachinery(site.id));
      setMilestones(getSiteMilestones(site.id));
      setMaterials(getSiteMaterials(site.id));

      setEditingLogId(null);
      setViewingLogId(null);
      setPageHeaderOverride(null);
      setActiveTab('entry');
      setIsCloudMode(cloudActive);
      setAuthRole(role);
      setSessionKeyHash(keyHash);
      setActiveSite(site);
      setCurrentUser(username);

      saveStoredSession({
        site,
        user: username,
        role,
        keyHash,
        tab: 'entry',
      });

      const roleLabel =
        role === 'master' || role === 'owner'
          ? 'Owner / Master Access'
          : 'Site Supervisor';
      showToast(`Welcome ${username}! (${roleLabel}) — ${site.name}`);
    },
    [showToast]
  );

  const loginWithAccessCode = useCallback(
    async (
      siteNameRaw: string,
      usernameRaw: string,
      accessCodeRaw: string
    ): Promise<LoginAttemptResult> => {
      const siteNameInput = siteNameRaw.trim();
      const usernameInput = usernameRaw.trim();
      const accessCodeInput = normalizeAccessCode(accessCodeRaw);

      if (!siteNameInput || !usernameInput) {
        return {
          ok: false,
          action: 'error',
          error: 'Please enter both Site Name and Your / Supervisor Name.',
        };
      }

      const cleanSiteId = makeSiteId(siteNameInput);

      if (isFirebaseReady() && navigator.onLine) {
        // Check if Company Security Lock has been initialized by the Owner
        let configured = securityStatus.configured;
        if (!securityStatus.loaded || !configured) {
          const metaRes = await getCompanySecurityMeta();
          if (!metaRes.ok) {
            const code = metaRes.error?.code || '';
            return {
              ok: false,
              action: 'error',
              error:
                code === 'auth/operation-not-allowed'
                  ? 'Enable Anonymous Authentication in Firebase Console (Authentication -> Sign-in method -> Anonymous).'
                  : metaRes.error?.message ||
                    'Unable to reach Firebase authentication.',
            };
          }
          setSecurityStatus({
            loaded: true,
            configured: metaRes.configured,
            meta: metaRes.meta,
            error: null,
          });
          configured = metaRes.configured;
        }

        if (!configured) {
          return {
            ok: false,
            action: 'first_setup',
            siteName: siteNameInput,
            username: usernameInput,
          };
        }

        const siteStatus = await checkSiteStatus(cleanSiteId);
        if (!siteStatus.ok) {
          return { ok: false, action: 'error', error: siteStatus.error };
        }

        if (siteStatus.state.status === 'new') {
          return {
            ok: false,
            action: 'register_new',
            siteId: cleanSiteId,
            siteName: siteNameInput,
            username: usernameInput,
          };
        }

        if (siteStatus.state.status === 'legacy') {
          return {
            ok: false,
            action: 'upgrade_legacy',
            site: siteStatus.state.site,
            username: usernameInput,
          };
        }

        // Site is locked -> verify Master Passcode or Site Access Code
        if (!accessCodeInput) {
          return {
            ok: false,
            action: 'error',
            error: 'Please enter the Site Access Code or Master Passcode.',
          };
        }

        const authRes = await authenticateLockedSite({
          siteId: cleanSiteId,
          username: usernameInput,
          accessCode: accessCodeInput,
        });
        if (!authRes.ok) {
          return { ok: false, action: 'error', error: authRes.error };
        }

        finalizeLoginSession(
          authRes.site,
          usernameInput,
          authRes.role,
          authRes.keyHash,
          true
        );
        return { ok: true };
      }

      // Offline fallback: only allow previously cached sites on this device
      const localSites = getSitesList();
      const foundSite = localSites.find(
        (s) =>
          s.id === cleanSiteId ||
          normalizeLoginText(s.name) === normalizeLoginText(siteNameInput)
      );

      if (!foundSite) {
        return {
          ok: false,
          action: 'error',
          error:
            'Offline Mode: New sites require an internet connection + Company Setup Code for verification.',
        };
      }

      if (
        foundSite.supervisor &&
        normalizeLoginText(foundSite.supervisor) !==
          normalizeLoginText(usernameInput)
      ) {
        return {
          ok: false,
          action: 'error',
          error: 'Access Denied! Incorrect Supervisor Name for this saved site.',
        };
      }

      if (!accessCodeInput) {
        return {
          ok: false,
          action: 'error',
          error: 'Please enter your Site Access Code.',
        };
      }

      // Compute keyHash locally so if device regains connection, listeners sync if code matches
      const offlineKeyHash =
        accessCodeInput.length >= 6
          ? await hashSiteCode(foundSite.id, accessCodeInput).catch(() =>
              hashMasterCode(accessCodeInput)
            )
          : await hashSiteCode(foundSite.id, accessCodeInput);

      setSyncStatus({ text: 'Offline Device Mode', state: 'local' });
      finalizeLoginSession(foundSite, usernameInput, 'local', offlineKeyHash, false);
      return { ok: true };
    },
    [securityStatus, finalizeLoginSession]
  );

  const completeFirstTimeSetup = useCallback(
    async (params: {
      ownerEmail: string;
      masterCode: string;
      setupCode: string;
    }): Promise<string | null> => {
      const res = await setupCompanySecurity(params);
      if (!res.ok) return res.error;

      setSecurityStatus({
        loaded: true,
        configured: true,
        meta: {
          initialized: true,
          ownerEmail: params.ownerEmail.trim().toLowerCase(),
          updatedAt: new Date().toISOString(),
        },
        error: null,
      });
      showToast(
        'Company Security Lock activated! Master Passcode & Setup Code saved.'
      );
      return null;
    },
    [showToast]
  );

  const completeNewSiteRegistration = useCallback(
    async (params: {
      siteName: string;
      supervisorName: string;
      setupCode: string;
      siteAccessCode: string;
    }): Promise<string | null> => {
      const siteId = makeSiteId(params.siteName.trim());
      const res = await registerNewSiteWithCode({
        siteId,
        siteName: params.siteName.trim(),
        supervisorName: params.supervisorName.trim(),
        setupCode: params.setupCode,
        siteAccessCode: params.siteAccessCode,
      });
      if (!res.ok) return res.error;

      finalizeLoginSession(
        res.site,
        params.supervisorName.trim(),
        res.role,
        res.keyHash,
        true
      );
      return null;
    },
    [finalizeLoginSession]
  );

  const completeLegacySiteUpgrade = useCallback(
    async (params: {
      site: SiteRecord;
      username: string;
      setupOrMasterCode: string;
      newSiteAccessCode: string;
    }): Promise<string | null> => {
      const res = await upgradeLegacySiteAccess(params);
      if (!res.ok) return res.error;

      finalizeLoginSession(
        res.site,
        params.username.trim(),
        res.role,
        res.keyHash,
        true
      );
      return null;
    },
    [finalizeLoginSession]
  );

  const verifyOwnerGoogle = useCallback(async (): Promise<
    | { ok: true; email: string }
    | { ok: false; redirectStarted?: boolean; error: string }
  > => {
    const res = await signInOwnerWithGoogle();
    if (!res.ok) return res;

    let ownerEmail = securityStatus.meta?.ownerEmail || '';
    if (!ownerEmail) {
      const metaRes = await getCompanySecurityMeta();
      if (metaRes.ok && metaRes.meta?.ownerEmail) {
        ownerEmail = metaRes.meta.ownerEmail;
        setSecurityStatus({
          loaded: true,
          configured: metaRes.configured,
          meta: metaRes.meta,
          error: null,
        });
      }
    }

    if (
      ownerEmail &&
      res.email.trim().toLowerCase() !== ownerEmail.trim().toLowerCase()
    ) {
      await signOutOwnerGoogleIfActive();
      return {
        ok: false,
        error: `Google account "${res.email}" does not match the registered Owner Email.`,
      };
    }

    return { ok: true, email: res.email };
  }, [securityStatus.meta]);

  const checkPendingGoogleOwner = useCallback(async (): Promise<string | null> => {
    const { email } = await checkGoogleRedirectOwner();
    if (!email) return null;

    let ownerEmail = securityStatus.meta?.ownerEmail || '';
    if (!ownerEmail) {
      const metaRes = await getCompanySecurityMeta();
      if (metaRes.ok && metaRes.meta?.ownerEmail) {
        ownerEmail = metaRes.meta.ownerEmail;
      }
    }

    if (
      ownerEmail &&
      email.trim().toLowerCase() !== ownerEmail.trim().toLowerCase()
    ) {
      await signOutOwnerGoogleIfActive();
      return null;
    }
    return email;
  }, [securityStatus.meta]);

  const completeOwnerCodeReset = useCallback(
    async (params: {
      newMasterCode: string;
      newSetupCode?: string;
      newOwnerEmail?: string;
    }): Promise<string | null> => {
      const res = await resetCompanyCodesViaOwner(params);
      if (!res.ok) return res.error;
      setSecurityStatus({
        loaded: true,
        configured: true,
        meta: {
          initialized: true,
          ownerEmail: res.ownerEmail,
          updatedAt: new Date().toISOString(),
        },
        error: null,
      });
      await signOutOwnerGoogleIfActive();
      showToast(
        params.newOwnerEmail &&
          params.newOwnerEmail.trim().toLowerCase() !==
            securityStatus.meta?.ownerEmail?.toLowerCase()
          ? `Master Passcode updated & Owner Recovery transferred to ${res.ownerEmail}!`
          : 'Owner Master Passcode updated! Old code revoked.'
      );
      return null;
    },
    [securityStatus.meta?.ownerEmail, showToast]
  );

  const resetCurrentSiteCode = useCallback(
    async (newSiteCode: string): Promise<string | null> => {
      if (!activeSite) return 'No active site selected.';
      if (authRole !== 'master' && authRole !== 'owner') {
        return 'Only Owner / Project Head (logged in with Master Passcode) can reset a Site Access Code.';
      }
      const res = await rotateSiteAccessCode({
        siteId: activeSite.id,
        newSiteCode,
      });
      if (!res.ok) return res.error;
      showToast(
        `Site Access Code for ${activeSite.name} updated! Old supervisor access revoked.`
      );
      return null;
    },
    [activeSite, authRole, showToast]
  );

  const logout = useCallback(() => {
    listenerGenerationRef.current += 1;
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (activeSite) {
      clearDailyDraft(activeSite.id);
      void clearSiteSessionProof(activeSite.id);
    }
    void signOutOwnerGoogleIfActive();
    clearStoredSession();
    setActiveSite(null);
    setCurrentUser(null);
    setAuthRole('local');
    setSessionKeyHash('');
    setEditingLogId(null);
    setViewingLogId(null);
    setPageHeaderOverride(null);
    setActiveTab('entry');
    setLogs([]);
    setMachinery([]);
    setMilestones([]);
    setMaterials([]);
    dirtyFormsRef.current.clear();
    savingFormsRef.current.clear();
  }, [activeSite]);

  const clearDeviceMemory = useCallback(() => {
    if (
      !window.confirm(
        'Are you sure you want to clear all saved sites & logs from this device? (Cloud data in Firebase will stay safe).'
      )
    ) {
      return;
    }
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('AE_')) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => {
        if (k !== STORAGE_KEYS.THEME) {
          localStorage.removeItem(k);
        }
      });
    } catch {
      // ignore
    }
    setSitesList([]);
    showToast('Local device memory cleared.');
  }, [showToast]);

  const setFormDirty = useCallback((formId: string, dirty: boolean) => {
    if (dirty) dirtyFormsRef.current.add(formId);
    else dirtyFormsRef.current.delete(formId);
  }, []);

  const setFormSaving = useCallback((formId: string, saving: boolean) => {
    if (saving) savingFormsRef.current.add(formId);
    else savingFormsRef.current.delete(formId);
  }, []);

  const adjustImageReads = useCallback((delta: number) => {
    imageReadsInFlightRef.current = Math.max(
      0,
      imageReadsInFlightRef.current + delta
    );
  }, []);

  const canAutoReloadSafely = useCallback(() => {
    if (savingFormsRef.current.size > 0) return false;
    if (imageReadsInFlightRef.current > 0) return false;
    if (dirtyFormsRef.current.size > 0) return false;
    if (editingLogId) return false;
    return true;
  }, [editingLogId]);

  // Daily Logs CRUD
  const saveDailyLogEntry = useCallback(
    (
      docId: string,
      payload: Omit<DailyLogRecord, 'id'>,
      isNewLog: boolean
    ) => {
      if (!activeSite) return;
      const siteId = activeSite.id;

      setLogs((prev) => {
        const next = [...prev];
        const existingIndex = next.findIndex(
          (l) => l.id === docId || l.date === payload.date
        );
        if (existingIndex >= 0) {
          next[existingIndex] = {
            ...next[existingIndex],
            ...payload,
            id: docId,
          };
        } else {
          next.push({
            id: docId,
            createdAt: new Date().toISOString(),
            ...payload,
          });
        }
        saveSiteLogs(siteId, next);
        return next;
      });

      clearDailyDraft(siteId);
      setEditingLogId(null);

      if (isCloudMode && isFirebaseReady()) {
        setFormSaving('daily-log-form', true);
        setSyncStatus({ text: 'Saving to Firebase…', state: 'syncing' });
        saveLogDoc(siteId, docId, payload, isNewLog)
          .then(() => {
            setSyncStatus({ text: 'Firebase Synced', state: 'cloud' });
            showToast(
              `Daily Log for ${payload.date} successfully saved to Firebase.`
            );
          })
          .catch((err: any) => {
            console.error('Firestore save/update FAILED:', err);
            setSyncStatus({ text: 'Firebase Save Failed', state: 'error' });
            showToast(
              `Firebase update failed: ${
                err?.code || err?.message || 'Error'
              }. Local copy kept.`
            );
          })
          .finally(() => {
            setFormSaving('daily-log-form', false);
          });
      } else {
        showToast(`Daily Log for ${payload.date} saved locally!`);
      }
    },
    [activeSite, isCloudMode, setFormSaving, showToast]
  );

  const deleteDailyLogEntry = useCallback(
    async (logId: string) => {
      if (!activeSite || !logId) return;
      const target = logs.find((l) => l.id === logId);
      if (!target) return;

      const confirmed = window.confirm(
        `Are you sure you want to delete the log for ${target.date}?\n\nThis log will be permanently deleted from both Firebase Cloud Database and local storage.`
      );
      if (!confirmed) return;

      if (isCloudMode && isFirebaseReady()) {
        setSyncStatus({ text: 'Deleting from Firebase…', state: 'syncing' });
        try {
          await deleteLogDoc(activeSite.id, logId);
          setSyncStatus({ text: 'Firebase Synced', state: 'cloud' });
        } catch (err: any) {
          console.error('Firestore delete failed:', err);
          setSyncStatus({ text: 'Firebase Delete Failed', state: 'error' });
          showToast(
            `Firebase delete failed: ${err?.code || err?.message || 'Error'}`
          );
          return;
        }
      }

      const updated = logs.filter((l) => l.id !== logId);
      setLogs(updated);
      saveSiteLogs(activeSite.id, updated);
      showToast(
        `Log for ${target.date} successfully deleted from database!`
      );
    },
    [activeSite, isCloudMode, logs, showToast]
  );

  // Machinery CRUD
  const saveMachineryEntry = useCallback(
    (
      docId: string,
      payload: Omit<MachineryRecord, 'id'>,
      oldDate: string | null
    ) => {
      if (!activeSite) return;
      const siteId = activeSite.id;

      setMachinery((prev) => {
        const next = [...prev];
        const idx = next.findIndex((m) => m.id === docId);
        const record: MachineryRecord = { id: docId, ...payload };
        if (idx >= 0) next[idx] = record;
        else next.push(record);

        saveSiteMachinery(siteId, next);

        setLogs((prevLogs) => {
          const reconciled = syncMachineryIntoLogs(prevLogs, next);
          saveSiteLogs(siteId, reconciled);
          return reconciled;
        });

        return next;
      });

      if (isCloudMode && isFirebaseReady()) {
        setFormSaving('machinery-form', true);
        setSyncStatus({
          text: 'Saving Machinery to Firebase...',
          state: 'syncing',
        });
        saveMachineryDocAndSyncLogs(siteId, docId, payload, oldDate)
          .then(() => {
            setSyncStatus({ text: 'Firebase Synced', state: 'cloud' });
            showToast('Machinery log successfully saved to Firebase!');
          })
          .catch((err: any) => {
            console.error('Machinery save failed:', err);
            setSyncStatus({ text: 'Firebase Save Failed', state: 'error' });
            showToast(
              'Machinery saved locally. Firebase sync will retry when connection is available.'
            );
          })
          .finally(() => {
            setFormSaving('machinery-form', false);
          });
      } else {
        showToast('Machinery log saved locally!');
      }
    },
    [activeSite, isCloudMode, setFormSaving, showToast]
  );

  const deleteMachineryEntry = useCallback(
    async (id: string) => {
      if (!activeSite || !id) return;
      const confirmed = window.confirm(
        'Are you sure you want to delete this machinery entry?'
      );
      if (!confirmed) return;

      const itemToDelete = machinery.find((m) => m.id === id);
      const targetDate = itemToDelete ? itemToDelete.date : null;

      if (isCloudMode && isFirebaseReady()) {
        setSyncStatus({ text: 'Deleting from Firebase...', state: 'syncing' });
        try {
          await deleteMachineryDocAndSyncLogs(activeSite.id, id, targetDate);
          setSyncStatus({ text: 'Firebase Synced', state: 'cloud' });
        } catch (err) {
          console.error('Machinery delete failed:', err);
          setSyncStatus({ text: 'Firebase Delete Failed', state: 'error' });
        }
      }

      const updated = machinery.filter((m) => m.id !== id);
      setMachinery(updated);
      saveSiteMachinery(activeSite.id, updated);

      setLogs((prevLogs) => {
        const reconciled = syncMachineryIntoLogs(prevLogs, updated);
        saveSiteLogs(activeSite.id, reconciled);
        return reconciled;
      });

      showToast('Machinery entry deleted successfully!');
    },
    [activeSite, isCloudMode, machinery, showToast]
  );

  // Milestones CRUD
  const saveMilestoneEntry = useCallback(
    async (docId: string, payload: Omit<MilestoneRecord, 'id'>) => {
      if (!activeSite) return;
      const siteId = activeSite.id;
      const isEdit = milestones.some((m) => m.id === docId);

      if (isCloudMode && isFirebaseReady()) {
        setFormSaving('milestone-form', true);
        setSyncStatus({
          text: 'Saving milestone to Firebase...',
          state: 'syncing',
        });
        try {
          await saveMilestoneDoc(siteId, docId, payload);
          setSyncStatus({ text: 'Firebase Synced', state: 'cloud' });
          showToast(
            isEdit
              ? 'Milestone updated successfully!'
              : 'Milestone added successfully!'
          );
        } catch (err) {
          console.error('Milestone save failed:', err);
          setSyncStatus({ text: 'Firebase Save Failed', state: 'error' });
          showToast('Firebase save failed, local backup kept.');
        } finally {
          setFormSaving('milestone-form', false);
        }
      } else {
        showToast(
          isEdit
            ? 'Milestone updated locally!'
            : 'Milestone added locally!'
        );
      }

      setMilestones((prev) => {
        const next = [...prev];
        const idx = next.findIndex((m) => m.id === docId);
        if (idx >= 0) next[idx] = { id: docId, ...payload };
        else next.push({ id: docId, ...payload });
        saveSiteMilestones(siteId, next);
        return next;
      });
    },
    [activeSite, isCloudMode, milestones, setFormSaving, showToast]
  );

  const deleteMilestoneEntry = useCallback(
    async (id: string) => {
      if (!activeSite || !id) return;
      const item = milestones.find((m) => m.id === id);
      const confirmed = window.confirm(
        `Are you sure you want to delete the milestone "${
          item ? item.name : ''
        }"?`
      );
      if (!confirmed) return;

      if (isCloudMode && isFirebaseReady()) {
        setSyncStatus({
          text: 'Deleting milestone from Firebase...',
          state: 'syncing',
        });
        try {
          await deleteMilestoneDoc(activeSite.id, id);
          setSyncStatus({ text: 'Firebase Synced', state: 'cloud' });
        } catch (err) {
          console.error('Milestone delete failed:', err);
          setSyncStatus({ text: 'Firebase Delete Failed', state: 'error' });
        }
      }

      const updated = milestones.filter((m) => m.id !== id);
      setMilestones(updated);
      saveSiteMilestones(activeSite.id, updated);
      showToast('Milestone deleted successfully!');
    },
    [activeSite, isCloudMode, milestones, showToast]
  );

  // Materials CRUD
  const saveMaterialEntry = useCallback(
    (docId: string, payload: MaterialEntry) => {
      if (!activeSite) return;
      const siteId = activeSite.id;
      const isEdit = materials.some((m) => m.id === docId);

      setMaterials((prev) => {
        const next = [...prev];
        const existingIdx = next.findIndex((m) => m.id === docId);
        if (existingIdx !== -1) {
          next[existingIdx] = { ...next[existingIdx], ...payload };
        } else {
          next.unshift(payload);
        }
        next.sort((a, b) => {
          const dateDiff = String(b.date || '').localeCompare(
            String(a.date || '')
          );
          if (dateDiff !== 0) return dateDiff;
          return String(a.materialName || '').localeCompare(
            String(b.materialName || '')
          );
        });
        saveSiteMaterials(siteId, next);
        return next;
      });

      const online =
        typeof navigator === 'undefined' ? true : navigator.onLine !== false;
      showToast(
        online
          ? isEdit
            ? 'Material record updated successfully!'
            : 'New material added successfully!'
          : 'Saved locally (offline). Will sync to cloud when online.'
      );

      if (isCloudMode && isFirebaseReady()) {
        setFormSaving('material-form', true);
        if (online) {
          setSyncStatus({
            text: 'Saving Material to Firebase…',
            state: 'syncing',
          });
        }
        saveMaterialDoc(siteId, docId, payload)
          .then(() => {
            if (online) {
              setSyncStatus({ text: 'Firebase Synced', state: 'cloud' });
            }
          })
          .catch((err) => {
            console.error('Error saving material to Firestore:', err);
            setSyncStatus({ text: 'Local Copy Saved', state: 'error' });
          })
          .finally(() => {
            setFormSaving('material-form', false);
          });
      }
    },
    [activeSite, isCloudMode, materials, setFormSaving, showToast]
  );

  const deleteMaterialEntry = useCallback(
    async (materialId: string) => {
      if (!activeSite || !materialId) return;
      const item = materials.find((m) => m.id === materialId);
      const label =
        item && item.materialName
          ? `"${item.materialName}"`
          : 'this material entry';
      const confirmed = window.confirm(
        `Are you sure you want to delete ${label}?\n\nThis material record will be permanently deleted and cannot be undone.`
      );
      if (!confirmed) return;

      const updated = materials.filter((m) => m.id !== materialId);
      setMaterials(updated);
      saveSiteMaterials(activeSite.id, updated);
      showToast('Material entry deleted successfully.');

      if (isCloudMode && isFirebaseReady()) {
        const online =
          typeof navigator === 'undefined' ? true : navigator.onLine !== false;
        if (online) {
          setSyncStatus({
            text: 'Updating Firebase…',
            state: 'syncing',
          });
        }
        try {
          await deleteMaterialDoc(activeSite.id, materialId);
          if (online) {
            setSyncStatus({ text: 'Firebase Synced', state: 'cloud' });
          }
        } catch (err) {
          console.error('Error deleting material from Firestore:', err);
        }
      }
    },
    [activeSite, isCloudMode, materials, showToast]
  );

  const openLightbox = useCallback((images: string[], index = 0) => {
    if (!images.length) return;
    setLightboxState({
      images,
      index: Math.max(0, Math.min(index, images.length - 1)),
    });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxState(null);
  }, []);

  const updateLightboxImages = useCallback(
    (images: string[], index: number) => {
      if (!images.length) {
        setLightboxState(null);
      } else {
        setLightboxState({
          images,
          index: Math.max(0, Math.min(index, images.length - 1)),
        });
      }
    },
    []
  );

  const pageHeader = pageHeaderOverride || PAGE_META[activeTab];

  const appValue = useMemo<AppContextValue>(
    () => ({
      theme,
      toggleTheme,
      sitesList,
      activeSite,
      currentUser,
      authRole,
      securityStatus,
      refreshSecurityMeta,
      activeTab,
      switchTab,
      pageHeader,
      setPageHeaderOverride,
      syncStatus,
      isOnline,
      isCloudMode,
      logs,
      machinery,
      milestones,
      materials,
      editingLogId,
      setEditingLogId,
      viewingLogId,
      setViewingLogId,
      startEditLog,
      toastMessage,
      toastVisible,
      showToast,
      lightboxState,
      openLightbox,
      closeLightbox,
      updateLightboxImages,
      canInstallPWA: Boolean(deferredInstallPrompt),
      installPWA,
      loginWithAccessCode,
      completeFirstTimeSetup,
      completeNewSiteRegistration,
      completeLegacySiteUpgrade,
      verifyOwnerGoogle,
      checkPendingGoogleOwner,
      completeOwnerCodeReset,
      resetCurrentSiteCode,
      logout,
      clearDeviceMemory,
      saveDailyLogEntry,
      deleteDailyLogEntry,
      saveMachineryEntry,
      deleteMachineryEntry,
      saveMilestoneEntry,
      deleteMilestoneEntry,
      saveMaterialEntry,
      deleteMaterialEntry,
      setFormDirty,
      setFormSaving,
      adjustImageReads,
      canAutoReloadSafely,
    }),
    [
      theme,
      toggleTheme,
      sitesList,
      activeSite,
      currentUser,
      authRole,
      securityStatus,
      refreshSecurityMeta,
      activeTab,
      switchTab,
      pageHeader,
      syncStatus,
      isOnline,
      isCloudMode,
      logs,
      machinery,
      milestones,
      materials,
      editingLogId,
      viewingLogId,
      startEditLog,
      toastMessage,
      toastVisible,
      showToast,
      lightboxState,
      openLightbox,
      closeLightbox,
      updateLightboxImages,
      deferredInstallPrompt,
      installPWA,
      loginWithAccessCode,
      completeFirstTimeSetup,
      completeNewSiteRegistration,
      completeLegacySiteUpgrade,
      verifyOwnerGoogle,
      checkPendingGoogleOwner,
      completeOwnerCodeReset,
      resetCurrentSiteCode,
      logout,
      clearDeviceMemory,
      saveDailyLogEntry,
      deleteDailyLogEntry,
      saveMachineryEntry,
      deleteMachineryEntry,
      saveMilestoneEntry,
      deleteMilestoneEntry,
      saveMaterialEntry,
      deleteMaterialEntry,
      setFormDirty,
      setFormSaving,
      adjustImageReads,
      canAutoReloadSafely,
    ]
  );

  const navigationValue = useMemo<NavigationContextValue>(
    () => ({
      activeTab,
      switchTab,
      pageHeader,
      prefetchTab,
    }),
    [activeTab, switchTab, pageHeader, prefetchTab]
  );

  return (
    <AppContext.Provider value={appValue}>
      <NavigationContext.Provider value={navigationValue}>
        {children}
      </NavigationContext.Provider>
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}

export function useNavigation(): NavigationContextValue {
  return useContext(NavigationContext);
}
