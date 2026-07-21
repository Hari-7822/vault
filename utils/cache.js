const store = new Map();
export function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache(key, data, ttl = 60_000) {
  store.set(key, { data, expiry: Date.now() + ttl });
}

export function deleteCache(key) {
  store.delete(key);
}

export function clearCache(prefix = '') {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export const TTL = {
  SHORT:  30_000,   //  30 seconds
  MEDIUM: 120_000,  //   2 minutes
  LONG:   300_000,  //   5 minutes
};