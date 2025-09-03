// Offline Sync Hook for AuraCast
// Manages offline collaboration and data synchronization

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  lastSyncTime: number | null;
  syncQueue: SyncItem[];
}

interface SyncItem {
  id: string;
  type: 'chat' | 'annotation' | 'session' | 'filter';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface UseOfflineSyncOptions {
  sessionId?: string;
  autoSync?: boolean;
  syncInterval?: number;
}

export function useOfflineSync(options: UseOfflineSyncOptions = {}) {
  const { sessionId, autoSync = true, syncInterval = 30000 } = options;

  const [offlineState, setOfflineState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingChanges: 0,
    lastSyncTime: null,
    syncQueue: [],
  });

  // Convex mutations for syncing data
  const sendMessage = useMutation(api.collaboration.sendChatMessage);
  const addAnnotation = useMutation(api.collaboration.addAnnotation);
  const updateSharedFilters = useMutation(api.collaboration.updateSharedFilters);

  // Load pending changes from localStorage
  useEffect(() => {
    const loadPendingChanges = () => {
      try {
        const stored = localStorage.getItem('auracast_pending_changes');
        if (stored) {
          const pendingChanges: SyncItem[] = JSON.parse(stored);
          setOfflineState(prev => ({
            ...prev,
            syncQueue: pendingChanges,
            pendingChanges: pendingChanges.length,
          }));
        }
      } catch (error) {
        console.error('Failed to load pending changes:', error);
      }
    };

    loadPendingChanges();
  }, []);

  // Save pending changes to localStorage
  const savePendingChanges = useCallback((queue: SyncItem[]) => {
    try {
      localStorage.setItem('auracast_pending_changes', JSON.stringify(queue));
      setOfflineState(prev => ({
        ...prev,
        syncQueue: queue,
        pendingChanges: queue.length,
      }));
    } catch (error) {
      console.error('Failed to save pending changes:', error);
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setOfflineState(prev => ({ ...prev, isOnline: true }));
      if (autoSync && offlineState.syncQueue.length > 0) {
        syncPendingChanges();
      }
    };

    const handleOffline = () => {
      setOfflineState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSync, offlineState.syncQueue.length]);

  // Auto-sync interval
  useEffect(() => {
    if (!autoSync || !offlineState.isOnline) return;

    const interval = setInterval(() => {
      if (offlineState.syncQueue.length > 0) {
        syncPendingChanges();
      }
    }, syncInterval);

    return () => clearInterval(interval);
  }, [autoSync, offlineState.isOnline, offlineState.syncQueue.length, syncInterval]);

  // Service Worker communication
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data.type === 'SYNC_COMPLETE') {
        setOfflineState(prev => ({
          ...prev,
          lastSyncTime: event.data.timestamp,
          isSyncing: false,
        }));
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  // Queue operations for offline use
  const queueChatMessage = useCallback((messageData: any) => {
    const syncItem: SyncItem = {
      id: `chat_${Date.now()}_${Math.random()}`,
      type: 'chat',
      data: messageData,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const newQueue = [...offlineState.syncQueue, syncItem];
    savePendingChanges(newQueue);

    // If online, try to sync immediately
    if (offlineState.isOnline) {
      syncPendingChanges();
    }
  }, [offlineState.syncQueue, offlineState.isOnline, savePendingChanges]);

  const queueAnnotation = useCallback((annotationData: any) => {
    const syncItem: SyncItem = {
      id: `annotation_${Date.now()}_${Math.random()}`,
      type: 'annotation',
      data: annotationData,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const newQueue = [...offlineState.syncQueue, syncItem];
    savePendingChanges(newQueue);

    if (offlineState.isOnline) {
      syncPendingChanges();
    }
  }, [offlineState.syncQueue, offlineState.isOnline, savePendingChanges]);

  const queueFilterUpdate = useCallback((filterData: any) => {
    const syncItem: SyncItem = {
      id: `filter_${Date.now()}_${Math.random()}`,
      type: 'filter',
      data: filterData,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const newQueue = [...offlineState.syncQueue, syncItem];
    savePendingChanges(newQueue);

    if (offlineState.isOnline) {
      syncPendingChanges();
    }
  }, [offlineState.syncQueue, offlineState.isOnline, savePendingChanges]);

  // Sync pending changes
  const syncPendingChanges = useCallback(async () => {
    if (offlineState.isSyncing || !offlineState.isOnline || offlineState.syncQueue.length === 0) {
      return;
    }

    setOfflineState(prev => ({ ...prev, isSyncing: true }));

    const queue = [...offlineState.syncQueue];
    const successfulSyncs: string[] = [];
    const failedSyncs: SyncItem[] = [];

    for (const item of queue) {
      try {
        await syncItem(item);
        successfulSyncs.push(item.id);
      } catch (error) {
        console.error(`Failed to sync ${item.type}:`, error);

        // Increment retry count
        const updatedItem = { ...item, retryCount: item.retryCount + 1 };

        // Keep failed items if retry count < maxRetries
        if (updatedItem.retryCount < 3) {
          failedSyncs.push(updatedItem);
        }
      }
    }

    // Update queue with remaining failed items
    const newQueue = queue.filter(item => !successfulSyncs.includes(item.id) && failedSyncs.some(f => f.id === item.id));
    savePendingChanges(newQueue);

    setOfflineState(prev => ({
      ...prev,
      isSyncing: false,
      lastSyncTime: Date.now(),
    }));

    // Trigger service worker sync
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_PENDING',
      });
    }
  }, [offlineState.isSyncing, offlineState.isOnline, offlineState.syncQueue, savePendingChanges]);

  // Sync individual item
  const syncItem = async (item: SyncItem): Promise<void> => {
    switch (item.type) {
      case 'chat':
        if (sessionId) {
          await sendMessage({
            sessionId: sessionId as any,
            message: item.data.message,
            type: item.data.type || 'text',
          });
        }
        break;

      case 'annotation':
        if (sessionId) {
          await addAnnotation({
            sessionId: sessionId as any,
            zoneId: item.data.zoneId,
            type: item.data.type,
            content: item.data.content,
            position: item.data.position,
          });
        }
        break;

      case 'filter':
        if (sessionId) {
          await updateSharedFilters({
            sessionId: sessionId as any,
            filters: item.data.filters,
          });
        }
        break;

      default:
        throw new Error(`Unknown sync item type: ${item.type}`);
    }
  };

  // Clear all pending changes
  const clearPendingChanges = useCallback(() => {
    savePendingChanges([]);
  }, [savePendingChanges]);

  // Get sync status
  const getSyncStatus = useCallback(() => {
    return {
      isOnline: offlineState.isOnline,
      isSyncing: offlineState.isSyncing,
      pendingCount: offlineState.pendingChanges,
      lastSyncTime: offlineState.lastSyncTime,
      hasPendingChanges: offlineState.syncQueue.length > 0,
    };
  }, [offlineState]);

  return {
    // State
    isOnline: offlineState.isOnline,
    isSyncing: offlineState.isSyncing,
    pendingChanges: offlineState.pendingChanges,
    lastSyncTime: offlineState.lastSyncTime,
    syncQueue: offlineState.syncQueue,

    // Actions
    queueChatMessage,
    queueAnnotation,
    queueFilterUpdate,
    syncPendingChanges,
    clearPendingChanges,
    getSyncStatus,
  };
}

// Offline Data Manager
export class OfflineDataManager {
  private static instance: OfflineDataManager;
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  static getInstance(): OfflineDataManager {
    if (!OfflineDataManager.instance) {
      OfflineDataManager.instance = new OfflineDataManager();
    }
    return OfflineDataManager.instance;
  }

  private constructor() {
    this.initDB();
  }

  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('AuraCast_Offline', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('chat_messages')) {
          db.createObjectStore('chat_messages', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('annotations')) {
          db.createObjectStore('annotations', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('session_updates')) {
          db.createObjectStore('session_updates', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('user_actions')) {
          db.createObjectStore('user_actions', { keyPath: 'id' });
        }
      };
    });

    this.db = await this.dbPromise;
    return this.db;
  }

  async storeData(storeName: string, data: any): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.add({
        ...data,
        id: `${storeName}_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        synced: false,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUnsyncedData(storeName: string): Promise<any[]> {
    const db = await this.initDB();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const allData = request.result;
        const unsyncedData = allData.filter(item => !item.synced);
        resolve(unsyncedData);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markAsSynced(storeName: string, id: string): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.synced = true;
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(); // Item not found, consider it synced
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async clearOldData(storeName: string, maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const cutoffTime = Date.now() - maxAge;

    return new Promise((resolve, reject) => {
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (cursor.value.timestamp < cutoffTime && cursor.value.synced) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Service Worker Registration Hook
export function useServiceWorker() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered:', reg);
          setRegistration(reg);
          setIsRegistered(true);

          // Listen for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  const updateServiceWorker = useCallback(() => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setUpdateAvailable(false);
      window.location.reload();
    }
  }, [registration]);

  return {
    isRegistered,
    updateAvailable,
    updateServiceWorker,
    registration,
  };
}