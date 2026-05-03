/**
 * Quantum Core Storage (IndexedDB)
 * Professional, high-capacity asynchronous storage for FLKRD
 */

const DB_NAME = 'FLKRD_QUANTUM_CORE';
const DB_VERSION = 1;
const STORE_NAME = 'dubbed_movies';

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('tmdb_cache')) {
                db.createObjectStore('tmdb_cache', { keyPath: 'key' });
            }
        };

        request.onsuccess = (event: any) => resolve(event.target.result);
        request.onerror = (event: any) => reject(event.target.error);
    });
};

export const db = {
    async saveMovies(movies: any[]): Promise<void> {
        const database = await initDB();
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
        return new Promise((resolve, reject) => {
            const transaction = database.transaction('tmdb_cache', 'readwrite');
            const store = transaction.objectStore('tmdb_cache');
            if (key) store.delete(key);
            else store.clear();
            transaction.oncomplete = () => resolve();
            transaction.onerror = (err: any) => reject(err);
        });
    }
};
