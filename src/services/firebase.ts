import { BUILT_IN_FIREBASE_CONFIG } from '../constants/defaults';
import type {
  DailyLogRecord,
  MachineryRecord,
  MaterialEntry,
  MilestoneRecord,
  SiteRecord,
} from '../types';

let dbInstance: any = null;
let firebaseInitialized = false;
let initAttempted = false;

export function isFirebaseReady(): boolean {
  return Boolean(firebaseInitialized && dbInstance);
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

export async function getOrCreateCloudSite(
  siteId: string,
  siteName: string,
  username: string
): Promise<
  | { ok: true; exists: boolean; site: SiteRecord }
  | { ok: false; error: unknown }
> {
  if (!isFirebaseReady()) {
    return { ok: false, error: new Error('Firebase unavailable') };
  }

  try {
    const siteDocRef = dbInstance.collection('sites').doc(siteId);
    const doc = await siteDocRef.get();

    if (doc.exists) {
      const data = doc.data() as Omit<SiteRecord, 'id'>;
      return {
        ok: true,
        exists: true,
        site: { id: doc.id, ...data },
      };
    }

    const newSite: SiteRecord = {
      id: siteId,
      name: siteName,
      supervisor: username,
      createdAt: new Date().toISOString(),
    };
    await siteDocRef.set(newSite);
    return { ok: true, exists: false, site: newSite };
  } catch (err) {
    return { ok: false, error: err };
  }
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
