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
    }
};
