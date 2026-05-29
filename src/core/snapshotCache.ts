type SnapshotRecord<T> = {
  value: T;
  fetchedAt: number;
};

type SnapshotOptions = RequestInit & {
  maxAgeMs?: number;
  timeoutMs?: number;
};

const memorySnapshots = new Map<string, SnapshotRecord<unknown>>();

function storageKey(key: string) {
  return `sportsedge.snapshot.${key}`;
}

export function readSnapshot<T>(key: string, maxAgeMs = 60_000): T | null {
  const now = Date.now();
  const memory = memorySnapshots.get(key) as SnapshotRecord<T> | undefined;
  if (memory && now - memory.fetchedAt <= maxAgeMs) return memory.value;

  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SnapshotRecord<T>;
    if (!parsed || !parsed.fetchedAt || now - parsed.fetchedAt > maxAgeMs) return null;
    memorySnapshots.set(key, parsed as SnapshotRecord<unknown>);
    return parsed.value;
  } catch {
    return null;
  }
}

export function writeSnapshot<T>(key: string, value: T) {
  const record: SnapshotRecord<T> = { value, fetchedAt: Date.now() };
  memorySnapshots.set(key, record as SnapshotRecord<unknown>);
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(record));
  } catch {
    // Snapshot storage is only a speed cache.
  }
}

export async function fetchJsonSnapshot<T>(key: string, url: string, options: SnapshotOptions = {}) {
  const { maxAgeMs = 60_000, timeoutMs = 5_000, signal, ...requestInit } = options;
  const cached = readSnapshot<T>(key, maxAgeMs);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(url, {
      ...requestInit,
      cache: requestInit.cache || "no-store",
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((payload as { detail?: string }).detail || "snapshot fetch failed");
    writeSnapshot(key, payload as T);
    return payload as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function refreshJsonSnapshot<T>(key: string, url: string, options: SnapshotOptions = {}) {
  const { timeoutMs = 5_000, signal, ...requestInit } = options;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(url, {
      ...requestInit,
      cache: requestInit.cache || "no-store",
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((payload as { detail?: string }).detail || "snapshot refresh failed");
    writeSnapshot(key, payload as T);
    return payload as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function warmJsonSnapshot<T>(key: string, url: string, options: SnapshotOptions = {}) {
  return refreshJsonSnapshot<T>(key, url, options).catch(() => readSnapshot<T>(key, options.maxAgeMs));
}
