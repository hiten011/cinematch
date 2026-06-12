// Tiny in-memory TTL cache for upstream API responses (TMDB lists etc.).
// Keeps the homepage fast and avoids hammering TMDB on every request.

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

const store = new Map();

/**
 * Returns the cached value for `key`, or runs `producer`, caches and returns
 * its result. Concurrent calls for the same key share one in-flight promise.
 *
 * @param {string} key
 * @param {() => Promise<any>} producer
 * @param {number} [ttlMs]
 * @returns {Promise<any>}
 */
async function cached(key, producer, ttlMs = DEFAULT_TTL_MS) {
    const entry = store.get(key);
    if (entry && entry.expires > Date.now()) {
        return entry.promise;
    }

    const promise = Promise.resolve().then(producer);
    store.set(key, { promise, expires: Date.now() + ttlMs });

    try {
        return await promise;
    } catch (err) {
        store.delete(key); // don't cache failures
        throw err;
    }
}

/** Empties the cache (used by tests). */
function clearCache() {
    store.clear();
}

module.exports = { cached, clearCache };
