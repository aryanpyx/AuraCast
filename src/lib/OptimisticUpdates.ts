// Optimistic Updates with Conflict Resolution for AuraCast
// Enables seamless collaborative editing with automatic conflict resolution

import { useCallback, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface OptimisticUpdate<T = any> {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: T;
  previousData?: T;
  timestamp: number;
  userId: string;
  conflictResolution?: ConflictResolutionStrategy;
}

interface ConflictResolutionStrategy {
  strategy: 'last-writer-wins' | 'merge' | 'manual' | 'version-based';
  version?: number;
  mergeFunction?: (local: any, remote: any) => any;
}

interface Conflict {
  id: string;
  localUpdate: OptimisticUpdate;
  remoteData: any;
  resolution: 'pending' | 'resolved' | 'manual';
  timestamp: number;
}

class OptimisticUpdateManager {
  private updates: Map<string, OptimisticUpdate> = new Map();
  private conflicts: Map<string, Conflict> = new Map();
  private subscribers: Set<(updates: OptimisticUpdate[]) => void> = new Set();
  private conflictSubscribers: Set<(conflicts: Conflict[]) => void> = new Set();

  // Apply optimistic update
  applyUpdate<T>(update: Omit<OptimisticUpdate<T>, 'id' | 'timestamp'>): string {
    const updateId = `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullUpdate: OptimisticUpdate<T> = {
      ...update,
      id: updateId,
      timestamp: Date.now(),
    };

    this.updates.set(updateId, fullUpdate);
    this.notifySubscribers();

    return updateId;
  }

  // Resolve update after server confirmation
  resolveUpdate(updateId: string, success: boolean, serverData?: any): void {
    const update = this.updates.get(updateId);
    if (!update) return;

    if (success) {
      // Update was successful, remove from pending
      this.updates.delete(updateId);
    } else {
      // Update failed, check for conflicts
      if (serverData) {
        this.handleConflict(update, serverData);
      } else {
        // Simple failure, remove update
        this.updates.delete(updateId);
      }
    }

    this.notifySubscribers();
  }

  // Handle conflicts
  private handleConflict(update: OptimisticUpdate, serverData: any): void {
    const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const conflict: Conflict = {
      id: conflictId,
      localUpdate: update,
      remoteData: serverData,
      resolution: 'pending',
      timestamp: Date.now(),
    };

    this.conflicts.set(conflictId, conflict);
    this.notifyConflictSubscribers();

    // Auto-resolve based on strategy
    if (update.conflictResolution) {
      this.resolveConflict(conflictId, update.conflictResolution);
    }
  }

  // Resolve conflict manually or automatically
  resolveConflict(conflictId: string, resolution: ConflictResolutionStrategy): void {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return;

    let resolvedData: any;

    switch (resolution.strategy) {
      case 'last-writer-wins':
        resolvedData = conflict.localUpdate.data;
        break;

      case 'merge':
        if (resolution.mergeFunction) {
          resolvedData = resolution.mergeFunction(conflict.localUpdate.data, conflict.remoteData);
        } else {
          resolvedData = { ...conflict.remoteData, ...conflict.localUpdate.data };
        }
        break;

      case 'version-based':
        // Use version numbers to determine which is newer
        const localVersion = resolution.version || 0;
        const remoteVersion = conflict.remoteData.version || 0;
        resolvedData = localVersion > remoteVersion ? conflict.localUpdate.data : conflict.remoteData;
        break;

      case 'manual':
        // Keep conflict for manual resolution
        conflict.resolution = 'manual';
        this.notifyConflictSubscribers();
        return;

      default:
        resolvedData = conflict.remoteData;
    }

    // Apply resolved data
    conflict.resolution = 'resolved';
    this.applyResolvedData(conflict.localUpdate, resolvedData);

    // Remove conflict and update
    this.conflicts.delete(conflictId);
    this.updates.delete(conflict.localUpdate.id);

    this.notifyConflictSubscribers();
    this.notifySubscribers();
  }

  private applyResolvedData(update: OptimisticUpdate, resolvedData: any): void {
    // Apply the resolved data to the local state
    // This would typically update the UI state
    console.log('Applying resolved data:', update.collection, resolvedData);
  }

  // Get pending updates
  getPendingUpdates(): OptimisticUpdate[] {
    return Array.from(this.updates.values());
  }

  // Get active conflicts
  getActiveConflicts(): Conflict[] {
    return Array.from(this.conflicts.values()).filter(c => c.resolution === 'pending' || c.resolution === 'manual');
  }

  // Subscribe to updates
  subscribe(callback: (updates: OptimisticUpdate[]) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Subscribe to conflicts
  subscribeToConflicts(callback: (conflicts: Conflict[]) => void): () => void {
    this.conflictSubscribers.add(callback);
    return () => this.conflictSubscribers.delete(callback);
  }

  private notifySubscribers(): void {
    const updates = this.getPendingUpdates();
    this.subscribers.forEach(callback => callback(updates));
  }

  private notifyConflictSubscribers(): void {
    const conflicts = this.getActiveConflicts();
    this.conflictSubscribers.forEach(callback => callback(conflicts));
  }

  // Clear all pending updates (useful for cleanup)
  clearPendingUpdates(): void {
    this.updates.clear();
    this.notifySubscribers();
  }

  // Get statistics
  getStats(): {
    pendingUpdates: number;
    activeConflicts: number;
    resolvedConflicts: number;
  } {
    const allConflicts = Array.from(this.conflicts.values());
    return {
      pendingUpdates: this.updates.size,
      activeConflicts: allConflicts.filter(c => c.resolution === 'pending' || c.resolution === 'manual').length,
      resolvedConflicts: allConflicts.filter(c => c.resolution === 'resolved').length,
    };
  }
}

// Singleton instance
let optimisticUpdateManager: OptimisticUpdateManager | null = null;

export function getOptimisticUpdateManager(): OptimisticUpdateManager {
  if (!optimisticUpdateManager) {
    optimisticUpdateManager = new OptimisticUpdateManager();
  }
  return optimisticUpdateManager;
}

// React Hook for Optimistic Updates
export function useOptimisticUpdates() {
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const manager = getOptimisticUpdateManager();

  // Subscribe to updates
  React.useEffect(() => {
    const unsubscribeUpdates = manager.subscribe(setPendingUpdates);
    const unsubscribeConflicts = manager.subscribeToConflicts(setConflicts);

    return () => {
      unsubscribeUpdates();
      unsubscribeConflicts();
    };
  }, [manager]);

  const applyOptimisticUpdate = useCallback(<T>(
    update: Omit<OptimisticUpdate<T>, 'id' | 'timestamp' | 'userId'>
  ) => {
    return manager.applyUpdate({
      ...update,
      userId: 'current-user', // Would be from auth context
    });
  }, [manager]);

  const resolveConflict = useCallback((conflictId: string, resolution: ConflictResolutionStrategy) => {
    manager.resolveConflict(conflictId, resolution);
  }, [manager]);

  return {
    pendingUpdates,
    conflicts,
    applyOptimisticUpdate,
    resolveConflict,
    stats: manager.getStats(),
  };
}

// Specific hooks for different data types
export function useOptimisticAnnotations(sessionId: string) {
  const { applyOptimisticUpdate, pendingUpdates, conflicts } = useOptimisticUpdates();
  const addAnnotation = useMutation(api.collaboration.addAnnotation);

  const optimisticAddAnnotation = useCallback(async (annotationData: any) => {
    // Apply optimistic update
    const updateId = applyOptimisticUpdate({
      type: 'create',
      collection: 'annotations',
      data: annotationData,
      conflictResolution: {
        strategy: 'last-writer-wins',
      },
    });

    try {
      // Perform actual mutation
      await addAnnotation({
        sessionId: sessionId as any,
        zoneId: annotationData.zoneId,
        type: annotationData.type,
        content: annotationData.content,
        position: annotationData.position,
      });

      // Resolve as successful
      getOptimisticUpdateManager().resolveUpdate(updateId, true);
    } catch (error) {
      // Resolve as failed (will trigger conflict resolution if needed)
      getOptimisticUpdateManager().resolveUpdate(updateId, false);
    }
  }, [applyOptimisticUpdate, addAnnotation, sessionId]);

  return {
    addAnnotation: optimisticAddAnnotation,
    pendingUpdates: pendingUpdates.filter(u => u.collection === 'annotations'),
    conflicts: conflicts.filter(c => c.localUpdate.collection === 'annotations'),
  };
}

export function useOptimisticChat(sessionId: string) {
  const { applyOptimisticUpdate, pendingUpdates, conflicts } = useOptimisticUpdates();
  const sendMessage = useMutation(api.collaboration.sendChatMessage);

  const optimisticSendMessage = useCallback(async (messageData: any) => {
    // Apply optimistic update
    const updateId = applyOptimisticUpdate({
      type: 'create',
      collection: 'chatMessages',
      data: messageData,
      conflictResolution: {
        strategy: 'last-writer-wins', // Chat messages always use last-writer-wins
      },
    });

    try {
      // Perform actual mutation
      await sendMessage({
        sessionId: sessionId as any,
        message: messageData.message,
        type: messageData.type || 'text',
      });

      // Resolve as successful
      getOptimisticUpdateManager().resolveUpdate(updateId, true);
    } catch (error) {
      // Resolve as failed
      getOptimisticUpdateManager().resolveUpdate(updateId, false);
    }
  }, [applyOptimisticUpdate, sendMessage, sessionId]);

  return {
    sendMessage: optimisticSendMessage,
    pendingUpdates: pendingUpdates.filter(u => u.collection === 'chatMessages'),
    conflicts: conflicts.filter(c => c.localUpdate.collection === 'chatMessages'),
  };
}

export function useOptimisticFilters(sessionId: string) {
  const { applyOptimisticUpdate, pendingUpdates, conflicts } = useOptimisticUpdates();
  const updateSharedFilters = useMutation(api.collaboration.updateSharedFilters);

  const optimisticUpdateFilters = useCallback(async (filters: any) => {
    // Apply optimistic update
    const updateId = applyOptimisticUpdate({
      type: 'update',
      collection: 'sharedFilters',
      data: { filters },
      conflictResolution: {
        strategy: 'merge',
        mergeFunction: (local: any, remote: any) => {
          // Merge filter objects
          return { ...remote, ...local };
        },
      },
    });

    try {
      // Perform actual mutation
      await updateSharedFilters({
        sessionId: sessionId as any,
        filters,
      });

      // Resolve as successful
      getOptimisticUpdateManager().resolveUpdate(updateId, true);
    } catch (error) {
      // Resolve as failed
      getOptimisticUpdateManager().resolveUpdate(updateId, false);
    }
  }, [applyOptimisticUpdate, updateSharedFilters, sessionId]);

  return {
    updateFilters: optimisticUpdateFilters,
    pendingUpdates: pendingUpdates.filter(u => u.collection === 'sharedFilters'),
    conflicts: conflicts.filter(c => c.localUpdate.collection === 'sharedFilters'),
  };
}

// Conflict Resolution UI Component
interface ConflictResolutionModalProps {
  conflicts: Conflict[];
  onResolve: (conflictId: string, resolution: ConflictResolutionStrategy) => void;
  onClose: () => void;
}

export function ConflictResolutionModal({
  conflicts,
  onResolve,
  onClose
}: ConflictResolutionModalProps) {
  if (conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-card p-6 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Resolve Conflicts</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="border border-white/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white">
                  {conflict.localUpdate.collection} • {conflict.localUpdate.type}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(conflict.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
                  <h4 className="text-sm font-medium text-red-400 mb-2">Your Changes</h4>
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                    {JSON.stringify(conflict.localUpdate.data, null, 2)}
                  </pre>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
                  <h4 className="text-sm font-medium text-blue-400 mb-2">Server Data</h4>
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                    {JSON.stringify(conflict.remoteData, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => onResolve(conflict.id, { strategy: 'last-writer-wins' })}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:scale-105 transition-transform"
                >
                  Use Mine
                </button>
                <button
                  onClick={() => onResolve(conflict.id, { strategy: 'merge' })}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:scale-105 transition-transform"
                >
                  Merge
                </button>
                <button
                  onClick={() => onResolve(conflict.id, { strategy: 'manual' })}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:scale-105 transition-transform"
                >
                  Review Later
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// React import (will be available at runtime)
declare const React: any;