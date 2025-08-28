import type { StoreState } from '../store';

const DB_NAME = 'LiveDevSandboxDB';
const DB_VERSION = 1;
const STORE_NAME = 'sandboxState';

class IndexedDBService {
    private db: IDBDatabase | null = null;

    public initDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve();
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject('Error opening IndexedDB.');
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    }

    public saveItem(key: string, value: any): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('DB not initialized.');
                return;
            }

            try {
                const transaction = this.db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(value, key);

                request.onsuccess = () => resolve();
                request.onerror = () => {
                    console.error(`Error saving item '${key}':`, request.error);
                    reject(`Could not save item '${key}' to IndexedDB.`);
                };
            } catch (error) {
                console.error(`Error creating transaction for saving item '${key}':`, error);
                reject(error);
            }
        });
    }

    public loadState(): Promise<Partial<Omit<StoreState, 'actions'>> | null> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('DB not initialized.');
                return;
            }

            try {
                const transaction = this.db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const getAllKeysReq = store.getAllKeys();

                getAllKeysReq.onerror = () => {
                    console.error('Error loading state keys:', getAllKeysReq.error);
                    reject('Could not load state keys from IndexedDB.');
                };
                
                getAllKeysReq.onsuccess = () => {
                    const keys = getAllKeysReq.result as (keyof StoreState)[];
                    if (!keys || keys.length === 0) {
                        return resolve(null);
                    }

                    const getAllValuesReq = store.getAll();
                    
                    getAllValuesReq.onerror = () => {
                        console.error('Error loading state values:', getAllValuesReq.error);
                        reject('Could not load state values from IndexedDB.');
                    };

                    getAllValuesReq.onsuccess = () => {
                        const values = getAllValuesReq.result;
                        const state: Partial<StoreState> = {};
                        keys.forEach((key, index) => {
                            (state as any)[key] = values[index];
                        });
                        resolve(state);
                    };
                };
            } catch (error) {
                 console.error("Error creating transaction for loading state:", error);
                 reject(error);
            }
        });
    }
}

const dbService = new IndexedDBService();
export default dbService;