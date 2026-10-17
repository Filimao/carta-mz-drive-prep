import type { Question } from "./quiz";

export interface OfflinePack {
  userId: string;
  expiresAt: string;
  savedAt: string;
  questions: Question[];
  images: number;
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
async function access<T>(store: string, mode: IDBTransactionMode, operation: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = operation(tx.objectStore(store));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}
export function loadPack(userId: string) { return access<OfflinePack | undefined>("packs", "readonly", (s) => s.get(userId)); }
export function savePack(pack: OfflinePack) { return access("packs", "readwrite", (s) => s.put(pack, pack.userId)); }
export function queueSession(session: PendingSession) { return access("sessions", "readwrite", (s) => s.put(session)); }
export function queuedSessions() { return access<PendingSession[]>("sessions", "readonly", (s) => s.getAll()); }
export function removeQueuedSession(id: string) { return access("sessions", "readwrite", (s) => s.delete(id)); }
export function validPack(pack: OfflinePack | undefined, now = Date.now()): pack is OfflinePack {
  return Boolean(pack && Date.parse(pack.expiresAt) > now && pack.questions.length > 0);
}
export const OFFLINE_IMAGE_CACHE = "carta-mz-question-images-v1";