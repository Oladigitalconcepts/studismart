// Lightweight offline cache + background sync queue.
// Uses localStorage so it works without IndexedDB plumbing. All keys are
// scoped per-user where relevant so switching accounts on the same device
// keeps caches isolated.

const VERSION = "v1";
const PREFIX = `studymind-cache-${VERSION}`;

type Json = unknown;

const safeGet = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const safeSet = (key: string, value: Json) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded — silently ignore. Caller still has live data.
  }
};

const safeRemove = (key: string) => {
  try { localStorage.removeItem(key); } catch { /* noop */ }
};

// ---------- Read-through cache helpers ----------

const userKey = (userId: string | null, name: string) =>
  `${PREFIX}:${userId ?? "anon"}:${name}`;

export const cacheGet = <T,>(userId: string | null, name: string): T | null => {
  return safeGet<T | null>(userKey(userId, name), null);
};

export const cacheSet = (userId: string | null, name: string, value: Json) => {
  safeSet(userKey(userId, name), value);
};

export const cacheClearForUser = (userId: string | null) => {
  try {
    const prefix = userKey(userId, "");
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) localStorage.removeItem(k);
    }
  } catch { /* noop */ }
};

// ---------- Sync queue ----------

export type SyncOp =
  | {
      kind: "answer_attempt";
      payload: {
        user_id: string;
        question_id: string;
        topic: string | null;
        is_correct: boolean;
      };
    }
  | {
      kind: "practice_attempt";
      payload: {
        user_id: string;
        study_pack_id: string | null;
        total: number;
        correct: number;
        duration_seconds: number;
      };
    };

export interface QueuedOp {
  id: string;
  queuedAt: number;
  attempts: number;
  op: SyncOp;
}

const QUEUE_KEY = `${PREFIX}:sync-queue`;

const readQueue = (): QueuedOp[] => safeGet<QueuedOp[]>(QUEUE_KEY, []);
const writeQueue = (q: QueuedOp[]) => safeSet(QUEUE_KEY, q);

export const enqueueOp = (op: SyncOp): QueuedOp => {
  const entry: QueuedOp = {
    id: crypto.randomUUID(),
    queuedAt: Date.now(),
    attempts: 0,
    op,
  };
  const q = readQueue();
  q.push(entry);
  writeQueue(q);
  notify();
  return entry;
};

export const getQueueSize = () => readQueue().length;

export const getQueueSnapshot = (): QueuedOp[] => readQueue();

export const clearQueue = () => { writeQueue([]); notify(); };

// ---------- Subscriber pattern so UI can react ----------

type Listener = () => void;
const listeners = new Set<Listener>();

export const subscribe = (l: Listener) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const notify = () => {
  listeners.forEach((l) => { try { l(); } catch { /* noop */ } });
};

// ---------- Flushing ----------

let flushing = false;

/**
 * Drains the queue against Supabase. Safe to call repeatedly — only one
 * pass runs at a time. Returns the number of ops successfully synced.
 */
export const flushQueue = async (
  client: {
    from: (t: string) => {
      insert: (rows: unknown) => Promise<{ error: { message: string } | null }>;
    };
  }
): Promise<{ synced: number; failed: number }> => {
  if (flushing) return { synced: 0, failed: 0 };
  if (!navigator.onLine) return { synced: 0, failed: 0 };
  flushing = true;
  let synced = 0;
  let failed = 0;
  try {
    let queue = readQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    const remaining: QueuedOp[] = [];
    for (const entry of queue) {
      const table =
        entry.op.kind === "answer_attempt" ? "answer_attempts" : "practice_attempts";
      const { error } = await client.from(table).insert(entry.op.payload);
      if (!error) {
        synced++;
      } else {
        entry.attempts += 1;
        // Keep the op for later unless it has clearly failed too many times
        // with a non-network error. We retry indefinitely since attempts
        // are user data we don't want to lose.
        remaining.push(entry);
        failed++;
      }
    }
    writeQueue(remaining);
    notify();
    return { synced, failed };
  } finally {
    flushing = false;
  }
};
