import {
  BUILT_IN_FIREBASE_CONFIG,
  FIREBASE_APP_CHECK_SITE_KEY,
} from '../constants/defaults';
import type {
  AuthRole,
  CompanySecurityMeta,
  DailyLogRecord,
  MachineryRecord,
  MaterialEntry,
  MilestoneRecord,
  SiteRecord,
} from '../types';
import { normalizeLoginText } from './storage';

let dbInstance: any = null;
let authInstance: any = null;
let appCheckActivated = false;
let firebaseInitialized = false;
let initAttempted = false;

export function isFirebaseReady(): boolean {
  return Boolean(firebaseInitialized && dbInstance);
}

export function normalizeAccessCode(code: string | undefined | null): string {
  return String(code || '').trim();
}

// Pure-JS SHA-256 fallback so hashing works even on non-HTTPS LAN testing where crypto.subtle is undefined
function sha256FallbackHex(ascii: string): string {
  const bytes = new TextEncoder().encode(ascii);
  const rightRotate = (value: number, amount: number) =>
    (value >>> amount) | (value << (32 - amount));

  const maxWord = Math.pow(2, 32);
  const words: number[] = [];
  const asciiBitLength = bytes.length * 8;

  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  const padded = Array.from(bytes);
  padded.push(0x80);
  while (padded.length % 64 !== 56) padded.push(0);

  for (let i = 0; i < padded.length; i++) {
    words[i >> 2] |= padded[i] << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength | 0;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0, 8);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export async function sha256Hex(input: string): Promise<string> {
  if (
    typeof crypto !== 'undefined' &&
    crypto.subtle &&
    typeof crypto.subtle.digest === 'function'
  ) {
    try {
      const data = new TextEncoder().encode(input);
      const buf = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      return sha256FallbackHex(input);
    }
  }
  return sha256FallbackHex(input);
}

export async function hashMasterCode(code: string): Promise<string> {
  return sha256Hex('AE_MASTER_V1:' + normalizeAccessCode(code));
}

export async function hashSetupCode(code: string): Promise<string> {
  return sha256Hex('AE_SETUP_V1:' + normalizeAccessCode(code));
}

export async function hashSiteCode(
  siteId: string,
  code: string
): Promise<string> {
  return sha256Hex(`AE_SITE_V1:${siteId}:${normalizeAccessCode(code)}`);
}

export function initFirebaseApp(): { initialized: boolean; db: any } {
  if (initAttempted) {
    return { initialized: firebaseInitialized, db: dbInstance };
  }
  initAttempted = true;

  try {
    if (!window.firebase) {
      return { initialized: false, db: null };
    }

    if (!window.firebase.apps || !window.firebase.apps.length) {
      window.firebase.initializeApp(BUILT_IN_FIREBASE_CONFIG);
    }

    if (
      !appCheckActivated &&
      FIREBASE_APP_CHECK_SITE_KEY &&
      typeof window.firebase.appCheck === 'function'
    ) {
      try {
        window.firebase
          .appCheck()
          .activate(FIREBASE_APP_CHECK_SITE_KEY, true);
        appCheckActivated = true;
      } catch (acErr) {
        console.warn('App Check activation skipped:', acErr);
      }
    }

    if (typeof window.firebase.auth === 'function') {
      authInstance = window.firebase.auth();
    }

    dbInstance = window.firebase.firestore();
    firebaseInitialized = true;

    try {
      dbInstance
        .enablePersistence({ synchronizeTabs: true })
        .catch(() => {
          // ignore persistence contention when multiple tabs or unsupported
        });
    } catch {
      // ignore synchronous enablePersistence throw
    }

    return { initialized: true, db: dbInstance };
  } catch (err) {
    console.warn('Firebase initialization warning:', err);
    firebaseInitialized = false;
    dbInstance = null;
    return { initialized: false, db: null };
  }
}

export async function ensureFirebaseAuth(): Promise<
  { ok: true; uid: string; email: string | null; isAnonymous: boolean } | { ok: false; error: any }
> {
  if (!isFirebaseReady()) {
    initFirebaseApp();
  }
  if (!isFirebaseReady()) {
    return { ok: false, error: new Error('Firebase unavailable') };
  }
  if (!authInstance && typeof window.firebase?.auth === 'function') {
    authInstance = window.firebase.auth();
  }
  if (!authInstance) {
    return { ok: false, error: new Error('Firebase Auth SDK not loaded') };
  }

  try {
    if (authInstance.currentUser) {
      return {
        ok: true,
        uid: authInstance.currentUser.uid,
        email: authInstance.currentUser.email || null,
        isAnonymous: Boolean(authInstance.currentUser.isAnonymous),
      };
    }
    const cred = await authInstance.signInAnonymously();
    return {
      ok: true,
      uid: cred.user.uid,
      email: cred.user.email || null,
      isAnonymous: Boolean(cred.user.isAnonymous),
    };
  } catch (err: any) {
    return { ok: false, error: err };
  }
}

export function getCurrentAuthUserInfo(): {
  uid: string | null;
  email: string | null;
  isAnonymous: boolean;
} {
  const user = authInstance?.currentUser;
  if (!user) {
    return { uid: null, email: null, isAnonymous: true };
  }
  return {
    uid: user.uid || null,
    email: user.email || null,
    isAnonymous: Boolean(user.isAnonymous),
  };
}

export async function signInOwnerWithGoogle(): Promise<
  | { ok: true; email: string; uid: string }
  | { ok: false; redirectStarted?: boolean; error: string }
> {
  if (!authInstance) {
    initFirebaseApp();
  }
  if (!authInstance || !window.firebase?.auth?.GoogleAuthProvider) {
    return { ok: false, error: 'Firebase Auth is not ready yet.' };
  }

  try {
    const provider = new window.firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const res = await authInstance.signInWithPopup(provider);
    const email = res?.user?.email;
    const uid = res?.user?.uid;
    if (!email || !uid) {
      return { ok: false, error: 'Google account did not provide an email.' };
    }
    return { ok: true, email, uid };
  } catch (err: any) {
    const code = err?.code || '';
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      try {
        const provider = new window.firebase.auth.GoogleAuthProvider();
        await authInstance.signInWithRedirect(provider);
        return {
          ok: false,
          redirectStarted: true,
          error: 'Redirecting to Google Sign-In...',
        };
      } catch (redirErr: any) {
        return {
          ok: false,
          error: redirErr?.message || 'Google Sign-In failed.',
        };
      }
    }
    if (code === 'auth/popup-closed-by-user') {
      return { ok: false, error: 'Google sign-in popup was closed.' };
    }
    if (code === 'auth/operation-not-allowed') {
      return {
        ok: false,
        error:
          'Google Sign-In is not enabled in Firebase Console (Authentication -> Sign-in method -> Google).',
      };
    }
    return { ok: false, error: err?.message || 'Google authentication failed.' };
  }
}

export async function checkGoogleRedirectOwner(): Promise<{
  email: string | null;
  uid: string | null;
}> {
  if (!authInstance || typeof authInstance.getRedirectResult !== 'function') {
    return { email: null, uid: null };
  }
  try {
    const res = await authInstance.getRedirectResult();
    if (res?.user?.email && !res.user.isAnonymous) {
      return { email: res.user.email, uid: res.user.uid };
    }
  } catch {
    // ignore
  }
  const cur = authInstance.currentUser;
  if (cur && cur.email && !cur.isAnonymous) {
    return { email: cur.email, uid: cur.uid };
  }
  return { email: null, uid: null };
}

export async function signOutOwnerGoogleIfActive(): Promise<void> {
  if (!authInstance) return;
  try {
    const cur = authInstance.currentUser;
    if (cur && !cur.isAnonymous) {
      await authInstance.signOut();
    }
  } catch {
    // ignore
  }
}

export async function getCompanySecurityMeta(): Promise<
  | { ok: true; configured: boolean; meta: CompanySecurityMeta | null }
  | { ok: false; error: any }
> {
  const auth = await ensureFirebaseAuth();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const snap = await dbInstance
      .collection('companyConfig')
      .doc('security_meta')
      .get();
    if (!snap.exists) {
      return { ok: true, configured: false, meta: null };
    }
    const data = snap.data() as CompanySecurityMeta;
    return { ok: true, configured: Boolean(data?.initialized), meta: data };
  } catch (err) {
    return { ok: false, error: err };
  }
}

export async function setupCompanySecurity(params: {
  ownerEmail: string;
  masterCode: string;
  setupCode: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cleanEmail = params.ownerEmail.trim().toLowerCase();
  const cleanMaster = normalizeAccessCode(params.masterCode);
  const cleanSetup = normalizeAccessCode(params.setupCode);

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { ok: false, error: 'Please enter a valid Owner recovery email.' };
  }
  if (cleanMaster.length < 6) {
    return {
      ok: false,
      error: 'Owner/Head Master Passcode must be at least 6 characters.',
    };
  }
  if (cleanSetup.length < 4) {
    return {
      ok: false,
      error: 'Company Setup Code must be at least 4 characters.',
    };
  }
  if (cleanMaster === cleanSetup) {
    return {
      ok: false,
      error:
        'Master Passcode and Company Setup Code must be different for security.',
    };
  }

  const auth = await ensureFirebaseAuth();
  if (!auth.ok) {
    return {
      ok: false,
      error: formatAuthErrorMessage(auth.error),
    };
  }

  try {
    const [masterHash, setupHash] = await Promise.all([
      hashMasterCode(cleanMaster),
      hashSetupCode(cleanSetup),
    ]);
    const now = new Date().toISOString();

    await dbInstance
      .collection('companyVault')
      .doc('hashes')
      .set({ masterKeyHash: masterHash, setupKeyHash: setupHash, updatedAt: now });

    await Promise.all([
      dbInstance
        .collection('companyAuth')
        .doc(masterHash)
        .set({ role: 'master', active: true, updatedAt: now }),
      dbInstance
        .collection('companyAuth')
        .doc(setupHash)
        .set({ role: 'setup', active: true, updatedAt: now }),
    ]);

    await dbInstance.collection('companyConfig').doc('security_meta').set({
      initialized: true,
      ownerEmail: cleanEmail,
      updatedAt: now,
    });

    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Failed to save security configuration.',
    };
  }
}

export async function resetCompanyCodesViaOwner(params: {
  newMasterCode: string;
  newSetupCode: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cleanMaster = normalizeAccessCode(params.newMasterCode);
  const cleanSetup = normalizeAccessCode(params.newSetupCode);

  if (cleanMaster.length < 6) {
    return {
      ok: false,
      error: 'New Master Passcode must be at least 6 characters.',
    };
  }
  if (cleanSetup.length < 4) {
    return {
      ok: false,
      error: 'New Company Setup Code must be at least 4 characters.',
    };
  }
  if (cleanMaster === cleanSetup) {
    return {
      ok: false,
      error: 'Master Passcode and Company Setup Code must be different.',
    };
  }

  const cur = authInstance?.currentUser;
  if (!cur || !cur.email || cur.isAnonymous) {
    return { ok: false, error: 'Please sign in with the Owner Google account first.' };
  }

  try {
    const vaultRef = dbInstance.collection('companyVault').doc('hashes');
    const oldVaultSnap = await vaultRef.get();
    const oldMasterHash = oldVaultSnap.exists
      ? (oldVaultSnap.data()?.masterKeyHash as string | undefined)
      : undefined;
    const oldSetupHash = oldVaultSnap.exists
      ? (oldVaultSnap.data()?.setupKeyHash as string | undefined)
      : undefined;

    const [newMasterHash, newSetupHash] = await Promise.all([
      hashMasterCode(cleanMaster),
      hashSetupCode(cleanSetup),
    ]);
    const now = new Date().toISOString();

    await Promise.all([
      dbInstance
        .collection('companyAuth')
        .doc(newMasterHash)
        .set({ role: 'master', active: true, updatedAt: now }),
      dbInstance
        .collection('companyAuth')
        .doc(newSetupHash)
        .set({ role: 'setup', active: true, updatedAt: now }),
    ]);

    await vaultRef.set({
      masterKeyHash: newMasterHash,
      setupKeyHash: newSetupHash,
      updatedAt: now,
    });

    const cleanupOps: Promise<void>[] = [];
    if (oldMasterHash && oldMasterHash !== newMasterHash) {
      cleanupOps.push(
        dbInstance.collection('companyAuth').doc(oldMasterHash).delete().catch(() => {})
      );
    }
    if (oldSetupHash && oldSetupHash !== newSetupHash) {
      cleanupOps.push(
        dbInstance.collection('companyAuth').doc(oldSetupHash).delete().catch(() => {})
      );
    }
    await Promise.all(cleanupOps);

    return { ok: true };
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      return {
        ok: false,
        error:
          'This Google account does not match the registered Owner recovery email.',
      };
    }
    return { ok: false, error: err?.message || 'Failed to reset codes.' };
  }
}

export async function verifySetupOrMasterProof(
  code: string
): Promise<{ valid: boolean; proofHash: string; role: 'master' | 'setup' | null }> {
  const clean = normalizeAccessCode(code);
  if (!clean) return { valid: false, proofHash: '', role: null };

  const [masterHash, setupHash] = await Promise.all([
    hashMasterCode(clean),
    hashSetupCode(clean),
  ]);

  try {
    const masterDoc = await dbInstance
      .collection('companyAuth')
      .doc(masterHash)
      .get();
    if (
      masterDoc.exists &&
      masterDoc.data()?.active === true &&
      masterDoc.data()?.role === 'master'
    ) {
      return { valid: true, proofHash: masterHash, role: 'master' };
    }
  } catch {
    // ignore
  }

  try {
    const setupDoc = await dbInstance
      .collection('companyAuth')
      .doc(setupHash)
      .get();
    if (
      setupDoc.exists &&
      setupDoc.data()?.active === true &&
      setupDoc.data()?.role === 'setup'
    ) {
      return { valid: true, proofHash: setupHash, role: 'setup' };
    }
  } catch {
    // ignore
  }

  return { valid: false, proofHash: '', role: null };
}

export type SiteLookupState =
  | { status: 'locked' }
  | { status: 'legacy'; site: SiteRecord }
  | { status: 'new' };

export async function checkSiteStatus(
  siteId: string
): Promise<{ ok: true; state: SiteLookupState } | { ok: false; error: string }> {
  const auth = await ensureFirebaseAuth();
  if (!auth.ok) {
    return { ok: false, error: formatAuthErrorMessage(auth.error) };
  }

  try {
    const regSnap = await dbInstance.collection('siteRegistry').doc(siteId).get();
    if (regSnap.exists) {
      return { ok: true, state: { status: 'locked' } };
    }

    try {
      const legacySnap = await dbInstance.collection('sites').doc(siteId).get();
      if (legacySnap.exists) {
        const data = legacySnap.data() as Omit<SiteRecord, 'id'>;
        if (data.accessLocked) {
          return { ok: true, state: { status: 'locked' } };
        }
        return {
          ok: true,
          state: { status: 'legacy', site: { id: legacySnap.id, ...data } },
        };
      }
      return { ok: true, state: { status: 'new' } };
    } catch (siteErr: any) {
      if (siteErr?.code === 'permission-denied') {
        return { ok: true, state: { status: 'locked' } };
      }
      return {
        ok: false,
        error: siteErr?.message || 'Unable to verify site status.',
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Unable to reach Firebase security service.',
    };
  }
}

export async function syncSiteSessionProof(
  siteId: string,
  keyHash: string,
  role: AuthRole
): Promise<boolean> {
  const auth = await ensureFirebaseAuth();
  if (!auth.ok) return false;

  try {
    await dbInstance
      .collection('sites')
      .doc(siteId)
      .collection('sessions')
      .doc(auth.uid)
      .set({
        keyHash,
        role,
        updatedAt: new Date().toISOString(),
      });
    return true;
  } catch {
    return false;
  }
}

export async function clearSiteSessionProof(siteId: string): Promise<void> {
  if (!isFirebaseReady() || !authInstance?.currentUser?.uid) return;
  try {
    await dbInstance
      .collection('sites')
      .doc(siteId)
      .collection('sessions')
      .doc(authInstance.currentUser.uid)
      .delete();
  } catch {
    // ignore
  }
}

export async function authenticateLockedSite(params: {
  siteId: string;
  username: string;
  accessCode: string;
}): Promise<
  | { ok: true; role: AuthRole; keyHash: string; site: SiteRecord }
  | { ok: false; error: string }
> {
  const cleanCode = normalizeAccessCode(params.accessCode);
  if (!cleanCode) {
    return { ok: false, error: 'Please enter the Site or Master Access Code.' };
  }

  const auth = await ensureFirebaseAuth();
  if (!auth.ok) {
    return { ok: false, error: formatAuthErrorMessage(auth.error) };
  }

  try {
    const [masterHash, siteHash] = await Promise.all([
      hashMasterCode(cleanCode),
      hashSiteCode(params.siteId, cleanCode),
    ]);

    let verifiedRole: AuthRole | null = null;
    let provenHash = '';

    // 1. Check Master Passcode (allows Owner / Project Head across all sites)
    try {
      const masterSnap = await dbInstance
        .collection('companyAuth')
        .doc(masterHash)
        .get();
      if (
        masterSnap.exists &&
        masterSnap.data()?.active === true &&
        masterSnap.data()?.role === 'master'
      ) {
        verifiedRole = 'master';
        provenHash = masterHash;
      }
    } catch {
      // ignore
    }

    // 2. Otherwise check Site-specific Access Code
    if (!verifiedRole) {
      try {
        const keySnap = await dbInstance
          .collection('sites')
          .doc(params.siteId)
          .collection('accessKeys')
          .doc(siteHash)
          .get();
        if (keySnap.exists && keySnap.data()?.active === true) {
          verifiedRole = 'supervisor';
          provenHash = siteHash;
        }
      } catch {
        // ignore
      }
    }

    if (!verifiedRole || !provenHash) {
      return {
        ok: false,
        error: 'Access Denied! Invalid Site or Master Access Code.',
      };
    }

    // 3. Record server-verified session doc before reading protected site record
    const sessionOk = await syncSiteSessionProof(
      params.siteId,
      provenHash,
      verifiedRole
    );
    if (!sessionOk) {
      return {
        ok: false,
        error: 'Access Denied! Unable to verify secure site session.',
      };
    }

    const siteSnap = await dbInstance.collection('sites').doc(params.siteId).get();
    if (!siteSnap.exists) {
      await clearSiteSessionProof(params.siteId);
      return { ok: false, error: 'Site record was not found.' };
    }

    const siteData = siteSnap.data() as Omit<SiteRecord, 'id'>;
    const site: SiteRecord = { id: siteSnap.id, ...siteData };

    // Supervisors must match the assigned supervisor name; Master/Owner can enter their own or supervisor name
    if (
      verifiedRole === 'supervisor' &&
      site.supervisor &&
      normalizeLoginText(site.supervisor) !== normalizeLoginText(params.username)
    ) {
      await clearSiteSessionProof(params.siteId);
      return {
        ok: false,
        error: 'Access Denied! Incorrect Supervisor Name for this site.',
      };
    }

    return { ok: true, role: verifiedRole, keyHash: provenHash, site };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Authentication failed.',
    };
  }
}

export async function registerNewSiteWithCode(params: {
  siteId: string;
  siteName: string;
  supervisorName: string;
  setupCode: string;
  siteAccessCode: string;
}): Promise<
  | { ok: true; role: AuthRole; keyHash: string; site: SiteRecord }
  | { ok: false; error: string }
> {
  const cleanSiteCode = normalizeAccessCode(params.siteAccessCode);
  if (cleanSiteCode.length < 4) {
    return {
      ok: false,
      error: 'New Site Access Code must be at least 4 characters.',
    };
  }

  const auth = await ensureFirebaseAuth();
  if (!auth.ok) {
    return { ok: false, error: formatAuthErrorMessage(auth.error) };
  }

  try {
    const proof = await verifySetupOrMasterProof(params.setupCode);
    if (!proof.valid || !proof.proofHash) {
      return {
        ok: false,
        error:
          'Invalid Company Setup Code! Only authorized Supervisors or Owner can register a new site.',
      };
    }

    const siteKeyHash = await hashSiteCode(params.siteId, cleanSiteCode);
    const now = new Date().toISOString();
    const newSite: SiteRecord = {
      id: params.siteId,
      name: params.siteName.trim(),
      supervisor: params.supervisorName.trim(),
      accessLocked: true,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Create protected site record with proof hash
    await dbInstance
      .collection('sites')
      .doc(params.siteId)
      .set({ ...newSite, setupProofHash: proof.proofHash });

    // 2. Create hashed site key doc
    await dbInstance
      .collection('sites')
      .doc(params.siteId)
      .collection('accessKeys')
      .doc(siteKeyHash)
      .set({
        active: true,
        role: 'supervisor',
        setupProofHash: proof.proofHash,
        createdAt: now,
      });

    // 3. Create minimal siteRegistry existence marker (no sensitive fields)
    await dbInstance.collection('siteRegistry').doc(params.siteId).set({
      id: params.siteId,
      accessLocked: true,
    });

    const role: AuthRole = proof.role === 'master' ? 'master' : 'supervisor';
    const sessionKeyHash =
      role === 'master' ? proof.proofHash : siteKeyHash;

    await syncSiteSessionProof(params.siteId, sessionKeyHash, role);

    // 4. Store active site key pointer inside protected security/meta doc for clean rotation
    await dbInstance
      .collection('sites')
      .doc(params.siteId)
      .collection('security')
      .doc('meta')
      .set({
        activeKeyHash: siteKeyHash,
        updatedAt: now,
      });

    return { ok: true, role, keyHash: sessionKeyHash, site: newSite };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Failed to register new site.',
    };
  }
}

export async function upgradeLegacySiteAccess(params: {
  site: SiteRecord;
  username: string;
  setupOrMasterCode: string;
  newSiteAccessCode: string;
}): Promise<
  | { ok: true; role: AuthRole; keyHash: string; site: SiteRecord }
  | { ok: false; error: string }
> {
  const cleanSiteCode = normalizeAccessCode(params.newSiteAccessCode);
  if (cleanSiteCode.length < 4) {
    return {
      ok: false,
      error: 'New Site Access Code must be at least 4 characters.',
    };
  }

  const auth = await ensureFirebaseAuth();
  if (!auth.ok) {
    return { ok: false, error: formatAuthErrorMessage(auth.error) };
  }

  try {
    const proof = await verifySetupOrMasterProof(params.setupOrMasterCode);
    if (!proof.valid || !proof.proofHash) {
      return {
        ok: false,
        error:
          'Invalid Company Setup Code or Master Passcode! Required once to lock this existing site.',
      };
    }

    if (
      proof.role !== 'master' &&
      params.site.supervisor &&
      normalizeLoginText(params.site.supervisor) !==
        normalizeLoginText(params.username)
    ) {
      return {
        ok: false,
        error: 'Access Denied! Incorrect Supervisor Name for this site.',
      };
    }

    const siteKeyHash = await hashSiteCode(params.site.id, cleanSiteCode);
    const now = new Date().toISOString();

    await dbInstance
      .collection('sites')
      .doc(params.site.id)
      .collection('accessKeys')
      .doc(siteKeyHash)
      .set({
        active: true,
        role: 'supervisor',
        setupProofHash: proof.proofHash,
        createdAt: now,
      });

    await dbInstance
      .collection('sites')
      .doc(params.site.id)
      .update({
        accessLocked: true,
        setupProofHash: proof.proofHash,
        updatedAt: now,
      });

    await dbInstance.collection('siteRegistry').doc(params.site.id).set({
      id: params.site.id,
      accessLocked: true,
    });

    const role: AuthRole = proof.role === 'master' ? 'master' : 'supervisor';
    const sessionKeyHash = role === 'master' ? proof.proofHash : siteKeyHash;

    await syncSiteSessionProof(params.site.id, sessionKeyHash, role);

    await dbInstance
      .collection('sites')
      .doc(params.site.id)
      .collection('security')
      .doc('meta')
      .set({
        activeKeyHash: siteKeyHash,
        updatedAt: now,
      });

    return {
      ok: true,
      role,
      keyHash: sessionKeyHash,
      site: { ...params.site, accessLocked: true },
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Failed to upgrade site security.',
    };
  }
}

export async function rotateSiteAccessCode(params: {
  siteId: string;
  newSiteCode: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cleanCode = normalizeAccessCode(params.newSiteCode);
  if (cleanCode.length < 4) {
    return {
      ok: false,
      error: 'New Site Access Code must be at least 4 characters.',
    };
  }

  try {
    const metaRef = dbInstance
      .collection('sites')
      .doc(params.siteId)
      .collection('security')
      .doc('meta');
    const metaSnap = await metaRef.get();
    const oldKeyHash = metaSnap.exists
      ? (metaSnap.data()?.activeKeyHash as string | undefined)
      : undefined;

    const newKeyHash = await hashSiteCode(params.siteId, cleanCode);
    const now = new Date().toISOString();

    await dbInstance
      .collection('sites')
      .doc(params.siteId)
      .collection('accessKeys')
      .doc(newKeyHash)
      .set({
        active: true,
        role: 'supervisor',
        createdAt: now,
      });

    await metaRef.set({
      activeKeyHash: newKeyHash,
      updatedAt: now,
    });

    if (oldKeyHash && oldKeyHash !== newKeyHash) {
      await dbInstance
        .collection('sites')
        .doc(params.siteId)
        .collection('accessKeys')
        .doc(oldKeyHash)
        .delete()
        .catch(() => {});
    }

    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Failed to update Site Access Code.',
    };
  }
}

function formatAuthErrorMessage(err: any): string {
  const code = err?.code || '';
  if (code === 'auth/operation-not-allowed') {
    return 'Enable Anonymous Authentication in Firebase Console (Authentication -> Sign-in method -> Anonymous).';
  }
  return err?.message || 'Firebase authentication error.';
}

export interface SiteListeners {
  unsubscribeAll: () => void;
}

export function subscribeToSiteCollections(
  siteId: string,
  callbacks: {
    onLogs: (
      logs: DailyLogRecord[],
      meta: { fromCache: boolean; hasPendingWrites: boolean }
    ) => void;
    onLogsError: (err: any) => void;
    onMachinery: (items: MachineryRecord[]) => void;
    onMilestones: (items: MilestoneRecord[]) => void;
    onMaterials: (items: MaterialEntry[]) => void;
  }
): SiteListeners {
  if (!isFirebaseReady()) {
    return { unsubscribeAll: () => {} };
  }

  const unsubs: Array<() => void> = [];

  try {
    const unsubLogs = dbInstance
      .collection('sites')
      .doc(siteId)
      .collection('logs')
      .onSnapshot(
        { includeMetadataChanges: true },
        (snapshot: any) => {
          const logs: DailyLogRecord[] = [];
          snapshot.forEach((doc: any) => {
            logs.push({ id: doc.id, ...doc.data() });
          });
          callbacks.onLogs(logs, {
            fromCache: Boolean(snapshot.metadata?.fromCache),
            hasPendingWrites: Boolean(snapshot.metadata?.hasPendingWrites),
          });
        },
        (err: any) => callbacks.onLogsError(err)
      );
    unsubs.push(unsubLogs);
  } catch (err) {
    callbacks.onLogsError(err);
  }

  try {
    const unsubMach = dbInstance
      .collection('sites')
      .doc(siteId)
      .collection('machinery')
      .onSnapshot(
        (snapshot: any) => {
          const list: MachineryRecord[] = [];
          snapshot.forEach((doc: any) => {
            list.push({ id: doc.id, ...doc.data() });
          });
          callbacks.onMachinery(list);
        },
        (err: any) => console.error('Machinery listener error:', err)
      );
    unsubs.push(unsubMach);
  } catch (err) {
    console.error('Machinery listener init error:', err);
  }

  try {
    const unsubMile = dbInstance
      .collection('sites')
      .doc(siteId)
      .collection('milestones')
      .onSnapshot(
        (snapshot: any) => {
          const list: MilestoneRecord[] = [];
          snapshot.forEach((doc: any) => {
            list.push({ id: doc.id, ...doc.data() });
          });
          callbacks.onMilestones(list);
        },
        (err: any) => console.error('Milestones listener error:', err)
      );
    unsubs.push(unsubMile);
  } catch (err) {
    console.error('Milestones listener init error:', err);
  }

  try {
    const unsubMat = dbInstance
      .collection('sites')
      .doc(siteId)
      .collection('materials')
      .onSnapshot(
        (snapshot: any) => {
          const list: MaterialEntry[] = [];
          snapshot.forEach((doc: any) => {
            list.push({ id: doc.id, ...doc.data() });
          });
          list.sort((a, b) => {
            const dateDiff = String(b.date || '').localeCompare(
              String(a.date || '')
            );
            if (dateDiff !== 0) return dateDiff;
            return String(a.materialName || '').localeCompare(
              String(b.materialName || '')
            );
          });
          callbacks.onMaterials(list);
        },
        (err: any) => console.error('Materials listener error:', err)
      );
    unsubs.push(unsubMat);
  } catch (err) {
    console.error('Materials listener init error:', err);
  }

  return {
    unsubscribeAll: () => {
      unsubs.forEach((fn) => {
        try {
          fn();
        } catch {
          // ignore
        }
      });
    },
  };
}

export async function saveLogDoc(
  siteId: string,
  docId: string,
  payload: Omit<DailyLogRecord, 'id'>,
  isNewLog: boolean
): Promise<void> {
  if (!isFirebaseReady()) return;
  const cloudPayload: Record<string, unknown> = { ...payload };
  if (isNewLog && window.firebase?.firestore?.FieldValue) {
    cloudPayload.createdAt =
      window.firebase.firestore.FieldValue.serverTimestamp();
  }
  await dbInstance
    .collection('sites')
    .doc(siteId)
    .collection('logs')
    .doc(docId)
    .set(cloudPayload);
}

export async function deleteLogDoc(siteId: string, logId: string): Promise<void> {
  if (!isFirebaseReady()) return;
  await dbInstance
    .collection('sites')
    .doc(siteId)
    .collection('logs')
    .doc(logId)
    .delete();
}

export async function saveMachineryDocAndSyncLogs(
  siteId: string,
  docId: string,
  payload: Omit<MachineryRecord, 'id'>,
  oldDate: string | null
): Promise<void> {
  if (!isFirebaseReady()) return;

  await dbInstance
    .collection('sites')
    .doc(siteId)
    .collection('machinery')
    .doc(docId)
    .set(payload, { merge: true });

  if (oldDate && oldDate !== payload.date) {
    const oldLogRef = dbInstance
      .collection('sites')
      .doc(siteId)
      .collection('logs')
      .doc('log_' + oldDate);
    const oldLogDoc = await oldLogRef.get();
    if (oldLogDoc.exists) {
      const oldData = oldLogDoc.data();
      const oldItems: MachineryRecord[] = Array.isArray(oldData.machineryLogs)
        ? oldData.machineryLogs
        : [];
      await oldLogRef.update({
        machineryLogs: oldItems.filter((m) => m.id !== docId),
      });
    }
  }

  const newLogRef = dbInstance
    .collection('sites')
    .doc(siteId)
    .collection('logs')
    .doc('log_' + payload.date);
  const newLogDoc = await newLogRef.get();
  if (newLogDoc.exists) {
    const snap = await dbInstance
      .collection('sites')
      .doc(siteId)
      .collection('machinery')
      .where('date', '==', payload.date)
      .get();
    const fresh: MachineryRecord[] = [];
    snap.forEach((d: any) => fresh.push({ id: d.id, ...d.data() }));
    await newLogRef.update({ machineryLogs: fresh });
  }
}

export async function deleteMachineryDocAndSyncLogs(
  siteId: string,
  id: string,
  targetDate: string | null
): Promise<void> {
  if (!isFirebaseReady()) return;

  await dbInstance
    .collection('sites')
    .doc(siteId)
    .collection('machinery')
    .doc(id)
    .delete();

  if (targetDate) {
    const dailyLogRef = dbInstance
      .collection('sites')
      .doc(siteId)
      .collection('logs')
      .doc('log_' + targetDate);
    const dailyLogDoc = await dailyLogRef.get();
    if (dailyLogDoc.exists) {
      const existing = dailyLogDoc.data().machineryLogs;
      const arr: MachineryRecord[] = Array.isArray(existing) ? existing : [];
      await dailyLogRef.update({
        machineryLogs: arr.filter((m) => m.id !== id),
      });
    }
  }
}

export async function saveMilestoneDoc(
  siteId: string,
  docId: string,
  payload: Omit<MilestoneRecord, 'id'>
): Promise<void> {
  if (!isFirebaseReady()) return;
  await dbInstance
    .collection('sites')
    .doc(siteId)
    .collection('milestones')
    .doc(docId)
    .set(payload, { merge: true });
}

export async function deleteMilestoneDoc(
  siteId: string,
  id: string
): Promise<void> {
  if (!isFirebaseReady()) return;
  await dbInstance
    .collection('sites')
    .doc(siteId)
    .collection('milestones')
    .doc(id)
    .delete();
}

export async function saveMaterialDoc(
  siteId: string,
  docId: string,
  payload: MaterialEntry
): Promise<void> {
  if (!isFirebaseReady()) return;
  await dbInstance
    .collection('sites')
    .doc(siteId)
    .collection('materials')
    .doc(docId)
    .set(payload, { merge: true });
}

export async function deleteMaterialDoc(
  siteId: string,
  materialId: string
): Promise<void> {
  if (!isFirebaseReady()) return;
  await dbInstance
    .collection('sites')
    .doc(siteId)
    .collection('materials')
    .doc(materialId)
    .delete();
}
