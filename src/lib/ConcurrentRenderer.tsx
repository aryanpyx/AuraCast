// Concurrent Rendering System for AuraCast
// Enables smooth real-time updates with React Concurrent Features

import React, { Suspense, useDeferredValue, useMemo, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Concurrent Data Fetching Hook
export function useConcurrentData<T>(
  data: T,
  priority: 'high' | 'normal' | 'low' = 'normal'
): T {
  // Use deferred value for non-critical updates
  const deferredData = useDeferredValue(data);

  // Return immediate data for high priority, deferred for others
  return priority === 'high' ? data : deferredData;
}

// Concurrent List Renderer
interface ConcurrentListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  priority?: 'high' | 'normal' | 'low';
  maxConcurrentRenders?: number;
}

export function ConcurrentList<T>({
  items,
  renderItem,
  keyExtractor,
  priority = 'normal',
  maxConcurrentRenders = 10,
}: ConcurrentListProps<T>) {
  const deferredItems = useConcurrentData(items, priority);

  // Limit concurrent renders for performance
  const limitedItems = useMemo(() => {
    return deferredItems.slice(0, maxConcurrentRenders);
  }, [deferredItems, maxConcurrentRenders]);

  return (
    <AnimatePresence mode="popLayout">
      {limitedItems.map((item, index) => (
        <motion.div
          key={keyExtractor(item, index)}
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{
            duration: 0.3,
            delay: Math.min(index * 0.05, 0.5), // Stagger animations
          }}
        >
          <Suspense fallback={<ListItemSkeleton />}>
            {renderItem(item, index)}
          </Suspense>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

// Concurrent Chat Messages
interface ConcurrentChatMessagesProps {
  messages: Array<{
    id: string;
    userId: string;
    message: string;
    timestamp: number;
    type: string;
  }>;
  currentUserId: string;
}

export function ConcurrentChatMessages({
  messages,
  currentUserId
}: ConcurrentChatMessagesProps) {
  return (
    <ConcurrentList
      items={messages}
      keyExtractor={(msg) => msg.id}
      priority="high"
      maxConcurrentRenders={50}
      renderItem={(msg, index) => (
        <ChatMessageItem
          message={msg}
          isCurrentUser={msg.userId === currentUserId}
          index={index}
        />
      )}
    />
  );
}

// Concurrent Annotations
interface ConcurrentAnnotationsProps {
  annotations: Array<{
    id: string;
    userId: string;
    type: string;
    content: string;
    position: { lat: number; lng: number };
    timestamp: number;
  }>;
}

export function ConcurrentAnnotations({ annotations }: ConcurrentAnnotationsProps) {
  return (
    <ConcurrentList
      items={annotations}
      keyExtractor={(ann) => ann.id}
      priority="normal"
      maxConcurrentRenders={100}
      renderItem={(ann, index) => (
        <AnnotationItem
          annotation={ann}
          index={index}
        />
      )}
    />
  );
}

// Concurrent Dashboard Widgets
interface ConcurrentDashboardProps {
  widgets: Array<{
    id: string;
    type: string;
    title: string;
    component: React.ComponentType<any>;
    props?: any;
  }>;
}

export function ConcurrentDashboard({ widgets }: ConcurrentDashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <ConcurrentList
        items={widgets}
        keyExtractor={(widget) => widget.id}
        priority="normal"
        maxConcurrentRenders={12}
        renderItem={(widget, index) => (
          <Suspense
            fallback={<DashboardWidgetSkeleton />}
            key={widget.id}
          >
            <ConcurrentDashboardWidget
              widget={widget}
              index={index}
            />
          </Suspense>
        )}
      />
    </div>
  );
}

// Transition Wrapper for Non-Urgent Updates
interface ConcurrentTransitionProps {
  children: React.ReactNode;
  timeoutMs?: number;
}

export function ConcurrentTransition({
  children,
  timeoutMs = 5000
}: ConcurrentTransitionProps) {
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => {
    startTransition(() => {
      // Wrap non-urgent updates in transition
    });
  }, [children]);

  return (
    <>
      {isPending && <LoadingIndicator />}
      {children}
    </>
  );
}

// Real-time Data Suspense Wrapper
interface RealtimeDataSuspenseProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  priority?: 'high' | 'normal' | 'low';
}

export function RealtimeDataSuspense({
  children,
  fallback,
  priority = 'normal'
}: RealtimeDataSuspenseProps) {
  const deferredChildren = useDeferredValue(children);

  return (
    <Suspense
      fallback={fallback || <RealtimeDataSkeleton />}
    >
      {priority === 'high' ? children : deferredChildren}
    </Suspense>
  );
}

// Performance Monitoring Hook
export function useConcurrentPerformance() {
  const [metrics, setMetrics] = React.useState({
    renderCount: 0,
    averageRenderTime: 0,
    longestRenderTime: 0,
    concurrentRenders: 0,
  });

  const measureRender = React.useCallback((renderTime: number) => {
    setMetrics(prev => ({
      renderCount: prev.renderCount + 1,
      averageRenderTime: (prev.averageRenderTime * prev.renderCount + renderTime) / (prev.renderCount + 1),
      longestRenderTime: Math.max(prev.longestRenderTime, renderTime),
      concurrentRenders: prev.concurrentRenders,
    }));
  }, []);

  return { metrics, measureRender };
}

// Skeleton Components
function ListItemSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center space-x-3 p-3">
        <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );
}

function ChatMessageItem({ message, isCurrentUser, index }: {
  message: any;
  isCurrentUser: boolean;
  index: number;
}) {
  return (
    <motion.div
      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
      initial={{ opacity: 0, x: isCurrentUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
    >
      <div className={`max-w-xs px-4 py-2 rounded-lg ${
        isCurrentUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
      }`}>
        <div className="text-xs opacity-75 mb-1">
          {message.userId.slice(-4)} • {new Date(message.timestamp).toLocaleTimeString()}
        </div>
        <p className="text-sm">{message.message}</p>
      </div>
    </motion.div>
  );
}

function AnnotationItem({ annotation, index }: { annotation: any; index: number }) {
  return (
    <motion.div
      className="p-3 bg-white/5 rounded-lg border border-white/10"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white">
          {annotation.type}
        </span>
        <span className="text-xs text-gray-400">
          {annotation.userId.slice(-4)}
        </span>
      </div>
      <p className="text-sm text-gray-300">{annotation.content}</p>
      <div className="text-xs text-gray-500 mt-1">
        {annotation.position.lat.toFixed(4)}, {annotation.position.lng.toFixed(4)}
      </div>
    </motion.div>
  );
}

function ConcurrentDashboardWidget({ widget, index }: { widget: any; index: number }) {
  const WidgetComponent = widget.component;

  return (
    <motion.div
      className="glass-card p-4 rounded-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <h3 className="font-semibold text-white mb-3">{widget.title}</h3>
      <WidgetComponent {...widget.props} />
    </motion.div>
  );
}

function DashboardWidgetSkeleton() {
  return (
    <div className="glass-card p-4 rounded-xl animate-pulse">
      <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-700 rounded"></div>
        <div className="h-3 bg-gray-700 rounded w-5/6"></div>
        <div className="h-3 bg-gray-700 rounded w-4/6"></div>
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <motion.div
      className="fixed top-4 right-4 z-50"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      <div className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>Updating...</span>
      </div>
    </motion.div>
  );
}

function RealtimeDataSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-gray-700 rounded-lg p-4">
          <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-600 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

// Concurrent Update Manager
export class ConcurrentUpdateManager {
  private static instance: ConcurrentUpdateManager;
  private updateQueue: Array<() => void> = [];
  private isProcessing = false;
  private maxConcurrentUpdates = 5;

  static getInstance(): ConcurrentUpdateManager {
    if (!ConcurrentUpdateManager.instance) {
      ConcurrentUpdateManager.instance = new ConcurrentUpdateManager();
    }
    return ConcurrentUpdateManager.instance;
  }

  queueUpdate(update: () => void): void {
    this.updateQueue.push(update);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.updateQueue.length === 0) return;

    this.isProcessing = true;

    const updatesToProcess = this.updateQueue.splice(0, this.maxConcurrentUpdates);

    // Process updates concurrently
    await Promise.all(
      updatesToProcess.map(update => {
        try {
          return update();
        } catch (error) {
          console.error('Concurrent update failed:', error);
          return Promise.resolve();
        }
      })
    );

    this.isProcessing = false;

    // Process remaining updates
    if (this.updateQueue.length > 0) {
      setTimeout(() => this.processQueue(), 16); // Next frame
    }
  }

  clearQueue(): void {
    this.updateQueue = [];
  }

  getQueueLength(): number {
    return this.updateQueue.length;
  }
}

// Export singleton instance
export const concurrentUpdateManager = ConcurrentUpdateManager.getInstance();