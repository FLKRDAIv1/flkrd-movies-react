/**
 * Quantum Core Storage (IndexedDB)
 * Professional, high-capacity asynchronous storage for FLKRD
 * Enforces resilient fallback storage for iOS Safari / Private tabs
 */

const DB_NAME = 'FLKRD_QUANTUM_CORE';
const DB_VERSION = 3;
const STORE_NAME = 'dubbed_movies';

export const sanitizeLocalStorageQuota = () => {
    if (typeof window === 'undefined') return;
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('flkrd_translated_sub_') || key.startsWith('flkrd_sub_blob_'))) {
                try {
                    const val = localStorage.getItem(key);
                    if (val && val.length > 5000) { // Large subtitle text blob (>5KB)
                        keysToRemove.push(key);
                    }
                } catch (e) {}
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        if (keysToRemove.length > 0) {
            console.log(`[STORAGE] Purged ${keysToRemove.length} heavy subtitle items from LocalStorage to reclaim quota.`);
        }
    } catch (e) {}
};

// Execute quota cleanup on module import
sanitizeLocalStorageQuota();

// Fallback In-Memory and LocalStorage Cache
const fallbackStore: Record<string, Record<string, any>> = {
    [STORE_NAME]: {},
    tmdb_cache: {},
    user_avatars: {},
    subtitles_store: {}
};

// Try to pre-populate fallback store from localStorage for maximum persistence
try {
    if (typeof window !== 'undefined') {
        const cachedMovies = localStorage.getItem('flkrd_fallback_movies');
        if (cachedMovies) {
            const list = JSON.parse(cachedMovies);
            list.forEach((m: any) => {
                if (m && m.id) fallbackStore[STORE_NAME][String(m.id)] = m;
            });
        }
        const cachedTmdb = localStorage.getItem('flkrd_fallback_tmdb');
        if (cachedTmdb) {
            const map = JSON.parse(cachedTmdb);
            fallbackStore.tmdb_cache = map;
        }
    }
} catch (e) {
    console.warn("[STORAGE] LocalStorage fallback prepopulation failed", e);
}

let useFallback = false;

export const initDB = (): Promise<IDBDatabase | null> => {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            console.warn("[STORAGE] IndexedDB is not supported on this platform. Falling back to LocalStorage.");
            useFallback = true;
            return resolve(null);
        }

        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event: any) => {
                const dbInstance = event.target.result;
                if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                    dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
                if (!dbInstance.objectStoreNames.contains('tmdb_cache')) {
                    dbInstance.createObjectStore('tmdb_cache', { keyPath: 'key' });
                }
                if (!dbInstance.objectStoreNames.contains('user_avatars')) {
                    dbInstance.createObjectStore('user_avatars', { keyPath: 'key' });
                }
                if (!dbInstance.objectStoreNames.contains('subtitles_store')) {
                    dbInstance.createObjectStore('subtitles_store', { keyPath: 'key' });
                }
            };


            request.onsuccess = (event: any) => resolve(event.target.result);
            request.onerror = (event: any) => {
                console.warn("[STORAGE] IndexedDB connection failed. Falling back to LocalStorage.", event.target.error);
                useFallback = true;
                resolve(null);
            };
        } catch (err) {
            console.warn("[STORAGE] Security Error opening IndexedDB. Falling back to LocalStorage.", err);
            useFallback = true;
            resolve(null);
        }
    });
};

export const db = {
    async saveMovies(movies: any[]): Promise<void> {
        const database = await initDB();
        if (useFallback || !database) {
            fallbackStore[STORE_NAME] = {};
            movies.forEach(movie => {
                fallbackStore[STORE_NAME][String(movie.id)] = movie;
            });
            try {
                localStorage.setItem('flkrd_fallback_movies', JSON.stringify(movies));
            } catch (e) {}
            return;
        }

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            // Clear existing to ensure sync
            store.clear();

            movies.forEach(movie => {
                store.put(movie);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (err: any) => reject(err);
        });
    },

    async getMovies(): Promise<any[]> {
        const database = await initDB();
        if (useFallback || !database) {
            return Object.values(fallbackStore[STORE_NAME]);
        }

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = (err: any) => reject(err);
        });
    },

    async updateMovie(movie: any): Promise<void> {
        const database = await initDB();
        if (useFallback || !database) {
            fallbackStore[STORE_NAME][String(movie.id)] = movie;
            try {
                localStorage.setItem('flkrd_fallback_movies', JSON.stringify(Object.values(fallbackStore[STORE_NAME])));
            } catch (e) {}
            return;
        }

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.put(movie);
            transaction.oncomplete = () => resolve();
            transaction.onerror = (err: any) => reject(err);
        });
    },

    async deleteMovie(id: string | number): Promise<void> {
        const database = await initDB();
        if (useFallback || !database) {
            delete fallbackStore[STORE_NAME][String(id)];
            try {
                localStorage.setItem('flkrd_fallback_movies', JSON.stringify(Object.values(fallbackStore[STORE_NAME])));
            } catch (e) {}
            return;
        }

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.delete(id);
            transaction.oncomplete = () => resolve();
            transaction.onerror = (err: any) => reject(err);
        });
    },

    async setCache(key: string, data: any): Promise<void> {
        const database = await initDB();
        if (useFallback || !database) {
            fallbackStore.tmdb_cache[key] = { key, data, timestamp: Date.now() };
            try {
                localStorage.setItem('flkrd_fallback_tmdb', JSON.stringify(fallbackStore.tmdb_cache));
            } catch (e) {}
            return;
        }

        return new Promise((resolve, reject) => {
            const transaction = database.transaction('tmdb_cache', 'readwrite');
            const store = transaction.objectStore('tmdb_cache');
            store.put({ key, data, timestamp: Date.now() });
            transaction.oncomplete = () => resolve();
            transaction.onerror = (err: any) => reject(err);
        });
    },

    async getCache(key: string): Promise<any | null> {
        const database = await initDB();
        if (useFallback || !database) {
            const result = fallbackStore.tmdb_cache[key];
            if (!result) return null;
            // 24-hour cache expiry for professional performance
            if (Date.now() - result.timestamp > 24 * 60 * 60 * 1000) {
                this.clearCache(key);
                return null;
            }
            return result.data;
        }

        return new Promise((resolve, reject) => {
            const transaction = database.transaction('tmdb_cache', 'readonly');
            const store = transaction.objectStore('tmdb_cache');
            const request = store.get(key);
            request.onsuccess = () => {
                const result = request.result;
                if (!result) return resolve(null);
                // 24-hour cache expiry for professional performance
                if (Date.now() - result.timestamp > 24 * 60 * 60 * 1000) {
                    this.clearCache(key);
                    return resolve(null);
                }
                resolve(result.data);
            };
            request.onerror = (err: any) => reject(err);
        });
    },

    async clearCache(key?: string): Promise<void> {
        const database = await initDB();
        if (useFallback || !database) {
            if (key) {
                delete fallbackStore.tmdb_cache[key];
            } else {
                fallbackStore.tmdb_cache = {};
            }
            try {
                localStorage.setItem('flkrd_fallback_tmdb', JSON.stringify(fallbackStore.tmdb_cache));
            } catch (e) {}
            return;
        }

        return new Promise((resolve, reject) => {
            const transaction = database.transaction('tmdb_cache', 'readwrite');
            const store = transaction.objectStore('tmdb_cache');
            if (key) store.delete(key);
            else store.clear();
            transaction.oncomplete = () => resolve();
            transaction.onerror = (err: any) => reject(err);
        });
    },

    async saveAvatar(key: string, dataUrl: string): Promise<void> {
        const database = await initDB();
        if (useFallback || !database) {
            fallbackStore.user_avatars[key] = { key, dataUrl };
            return;
        }

        return new Promise((resolve) => {
            try {
                const transaction = database.transaction('user_avatars', 'readwrite');
                const store = transaction.objectStore('user_avatars');
                store.put({ key, dataUrl });
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => resolve();
            } catch (e) {
                resolve();
            }
        });
    },

    async getAvatar(key: string): Promise<string | null> {
        const database = await initDB();
        if (useFallback || !database) {
            return fallbackStore.user_avatars[key] ? fallbackStore.user_avatars[key].dataUrl : null;
        }

        return new Promise((resolve) => {
            try {
                const transaction = database.transaction('user_avatars', 'readonly');
                const store = transaction.objectStore('user_avatars');
                const request = store.get(key);
                request.onsuccess = () => {
                    const result = request.result;
                    resolve(result ? result.dataUrl : null);
                };
                request.onerror = () => resolve(null);
            } catch (e) {
                resolve(null);
            }
        });
    },

    async saveSubtitle(key: string, subData: any): Promise<void> {
        const database = await initDB();
        if (useFallback || !database) {
            fallbackStore.subtitles_store[key] = { key, ...subData };
            return;
        }

        return new Promise((resolve) => {
            try {
                const transaction = database.transaction('subtitles_store', 'readwrite');
                const store = transaction.objectStore('subtitles_store');
                store.put({ key, ...subData });
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => resolve();
            } catch (e) {
                resolve();
            }
        });
    },

    async getSubtitle(key: string): Promise<any | null> {
        const database = await initDB();
        if (useFallback || !database) {
            return fallbackStore.subtitles_store[key] || null;
        }

        return new Promise((resolve) => {
            try {
                const transaction = database.transaction('subtitles_store', 'readonly');
                const store = transaction.objectStore('subtitles_store');
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => resolve(null);
            } catch (e) {
                resolve(null);
            }
        });
    }
};

