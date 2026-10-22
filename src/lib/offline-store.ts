import type { Category, Question } from "./quiz";

export interface OfflinePack {
  userId: string;
  tier: string;
  subscriptionTier?: string;
  expiresAt: string | null;
  savedAt: string;
  launchAccess?: boolean;
  questions: Question[];
  categories: Category[];
  images: number;
  failedImages?: number;
}
export interface PendingSession {
  id: string;
  user_id: string;
  mode: string;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  score_percent: number;
  seconds_spent: number;
  completed_at: string;
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("carta-mz-offline", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("packs");
      request.result.createObjectStore("sessions", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function access<T>(
  store: string,
  mode: IDBTransactionMode,
  operation: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = operation(tx.objectStore(store));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export function loadPack(userId: string) {
  return access<OfflinePack | undefined>("packs", "readonly", (s) => s.get(userId));
}
export function savePack(pack: OfflinePack) {
  return access("packs", "readwrite", (s) => s.put(pack, pack.userId));
}
export function queueSession(session: PendingSession) {
  return access("sessions", "readwrite", (s) => s.put(session));
}
export function queuedSessions() {
  return access<PendingSession[]>("sessions", "readonly", (s) => s.getAll());
}
export function removeQueuedSession(id: string) {
  return access("sessions", "readwrite", (s) => s.delete(id));
}
export function validPack(pack: OfflinePack | undefined, now = Date.now()): pack is OfflinePack {
  if (!pack || pack.tier !== "premium" || pack.questions.length === 0) return false;
  if (pack.expiresAt === null) return true;
  return Date.parse(pack.expiresAt) > now;
}

export function offlinePackExpiry({
  now = Date.now(),
  launchAccess,
  subscriptionExpiresAt,
}: {
  now?: number;
  launchAccess: boolean;
  subscriptionExpiresAt: string | null;
}): string {
  const localExpiry = now + (launchAccess ? 365 : 30) * 24 * 60 * 60 * 1000;
  if (launchAccess || !subscriptionExpiresAt) return new Date(localExpiry).toISOString();

  const subscriptionExpiry = Date.parse(subscriptionExpiresAt);
  return new Date(
    Number.isFinite(subscriptionExpiry) && subscriptionExpiry > now
      ? Math.min(localExpiry, subscriptionExpiry)
      : localExpiry,
  ).toISOString();
}

export const OFFLINE_IMAGE_CACHE = "carta-mz-question-images-v1";
