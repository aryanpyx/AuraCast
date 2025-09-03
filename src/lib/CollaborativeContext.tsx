import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface CollaborativeState {
  sessionId: string | null;
  viewport: {
    center: { lat: number; lng: number };
    zoom: number;
  };
  filters: {
    aqiRange: [number, number];
    pollutants: string[];
    timeRange: [number, number];
  };
  annotations: Annotation[];
  selectedZone: string | null;
  userPresence: UserPresence[];
}

interface Annotation {
  id: string;
  userId: string;
  zoneId: string;
  type: 'marker' | 'note' | 'alert';
  content: string;
  position: { lat: number; lng: number };
  timestamp: number;
  color?: string;
}

interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: number;
  cursor?: { lat: number; lng: number };
}

type CollaborativeAction =
  | { type: 'SET_SESSION'; payload: string | null }
  | { type: 'UPDATE_VIEWPORT'; payload: CollaborativeState['viewport'] }
  | { type: 'UPDATE_FILTERS'; payload: Partial<CollaborativeState['filters']> }
  | { type: 'ADD_ANNOTATION'; payload: Omit<Annotation, 'id'> }
  | { type: 'UPDATE_ANNOTATION'; payload: { id: string; updates: Partial<Annotation> } }
  | { type: 'REMOVE_ANNOTATION'; payload: string }
  | { type: 'SET_SELECTED_ZONE'; payload: string | null }
  | { type: 'UPDATE_USER_PRESENCE'; payload: UserPresence[] }
  | { type: 'SYNC_STATE'; payload: Partial<CollaborativeState> };

const initialState: CollaborativeState = {
  sessionId: null,
  viewport: {
    center: { lat: 26.8467, lng: 80.9462 }, // Lucknow center
    zoom: 12,
  },
  filters: {
    aqiRange: [0, 500],
    pollutants: ['pm25', 'pm10', 'no2', 'so2', 'o3', 'co'],
    timeRange: [Date.now() - 24 * 60 * 60 * 1000, Date.now()], // Last 24 hours
  },
  annotations: [],
  selectedZone: null,
  userPresence: [],
};

function collaborativeReducer(state: CollaborativeState, action: CollaborativeAction): CollaborativeState {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, sessionId: action.payload };

    case 'UPDATE_VIEWPORT':
      return { ...state, viewport: action.payload };

    case 'UPDATE_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };

    case 'ADD_ANNOTATION':
      const newAnnotation: Annotation = {
        ...action.payload,
        id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
      return { ...state, annotations: [...state.annotations, newAnnotation] };

    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map(ann =>
          ann.id === action.payload.id ? { ...ann, ...action.payload.updates } : ann
        ),
      };

    case 'REMOVE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.filter(ann => ann.id !== action.payload),
      };

    case 'SET_SELECTED_ZONE':
      return { ...state, selectedZone: action.payload };

    case 'UPDATE_USER_PRESENCE':
      return { ...state, userPresence: action.payload };

    case 'SYNC_STATE':
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

interface CollaborativeContextType {
  state: CollaborativeState;
  dispatch: React.Dispatch<CollaborativeAction>;
  // Helper functions
  updateViewport: (viewport: CollaborativeState['viewport']) => void;
  updateFilters: (filters: Partial<CollaborativeState['filters']>) => void;
  addAnnotation: (annotation: Omit<Annotation, 'id'>) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  setSelectedZone: (zoneId: string | null) => void;
}

const CollaborativeContext = createContext<CollaborativeContextType | undefined>(undefined);

interface CollaborativeProviderProps {
  children: ReactNode;
  sessionId?: string | null;
}

export function CollaborativeProvider({ children, sessionId }: CollaborativeProviderProps) {
  const [state, dispatch] = useReducer(collaborativeReducer, initialState);

  // Mock API mutations for persistence
  const updateSharedFilters = useMutation('api.collaboration.updateSharedFilters');
  const addAnnotationMutation = useMutation('api.collaboration.addAnnotation');

  // Sync session ID
  useEffect(() => {
    dispatch({ type: 'SET_SESSION', payload: sessionId || null });
  }, [sessionId]);

  // Load shared filters when session changes
  const sharedFilters = useQuery(
    'api.collaboration.getSharedFilters',
    state.sessionId ? { sessionId: state.sessionId } : 'skip'
  );

  // Load annotations when session changes
  const annotations = useQuery(
    'api.collaboration.getAnnotations',
    state.sessionId ? { sessionId: state.sessionId } : 'skip'
  );

  // Load user presence
  const userPresence = useQuery(
    'api.collaboration.getUserPresence',
    state.sessionId ? { sessionId: state.sessionId } : 'skip'
  );

  // Sync data from Convex
  useEffect(() => {
    if (sharedFilters) {
      dispatch({ type: 'UPDATE_FILTERS', payload: sharedFilters.filters });
    }
  }, [sharedFilters]);

  useEffect(() => {
    if (annotations) {
      const formattedAnnotations: Annotation[] = annotations.map(ann => ({
        id: ann._id,
        userId: ann.userId,
        zoneId: ann.zoneId,
        type: ann.type as 'marker' | 'note' | 'alert',
        content: ann.content,
        position: ann.position,
        timestamp: ann.timestamp,
      }));
      dispatch({ type: 'SYNC_STATE', payload: { annotations: formattedAnnotations } });
    }
  }, [annotations]);

  useEffect(() => {
    if (userPresence) {
      const formattedPresence: UserPresence[] = userPresence.map(p => ({
        userId: p.userId,
        status: p.status as 'online' | 'away' | 'offline',
        lastSeen: p.lastSeen,
      }));
      dispatch({ type: 'UPDATE_USER_PRESENCE', payload: formattedPresence });
    }
  }, [userPresence]);

  // Helper functions
  const updateViewport = (viewport: CollaborativeState['viewport']) => {
    dispatch({ type: 'UPDATE_VIEWPORT', payload: viewport });
  };

  const updateFilters = async (filters: Partial<CollaborativeState['filters']>) => {
    dispatch({ type: 'UPDATE_FILTERS', payload: filters });

    // Persist to Convex if in session
    if (state.sessionId) {
      try {
        await updateSharedFilters({
          sessionId: state.sessionId as any,
          filters: { ...state.filters, ...filters },
        });
      } catch (error) {
        console.error('Failed to update shared filters:', error);
      }
    }
  };

  const addAnnotation = async (annotation: Omit<Annotation, 'id'>) => {
    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });

    // Persist to Convex if in session
    if (state.sessionId) {
      try {
        await addAnnotationMutation({
          sessionId: state.sessionId as any,
          zoneId: annotation.zoneId,
          type: annotation.type,
          content: annotation.content,
          position: annotation.position,
        });
      } catch (error) {
        console.error('Failed to add annotation:', error);
      }
    }
  };

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
    dispatch({ type: 'UPDATE_ANNOTATION', payload: { id, updates } });
  };

  const removeAnnotation = (id: string) => {
    dispatch({ type: 'REMOVE_ANNOTATION', payload: id });
  };

  const setSelectedZone = (zoneId: string | null) => {
    dispatch({ type: 'SET_SELECTED_ZONE', payload: zoneId });
  };

  const contextValue: CollaborativeContextType = {
    state,
    dispatch,
    updateViewport,
    updateFilters,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    setSelectedZone,
  };

  return (
    <CollaborativeContext.Provider value={contextValue}>
      {children}
    </CollaborativeContext.Provider>
  );
}

export function useCollaborative() {
  const context = useContext(CollaborativeContext);
  if (context === undefined) {
    throw new Error('useCollaborative must be used within a CollaborativeProvider');
  }
  return context;
}

// Custom hooks for specific functionality
export function useCollaborativeViewport() {
  const { state, updateViewport } = useCollaborative();
  return { viewport: state.viewport, updateViewport };
}

export function useCollaborativeFilters() {
  const { state, updateFilters } = useCollaborative();
  return { filters: state.filters, updateFilters };
}

export function useCollaborativeAnnotations() {
  const { state, addAnnotation, updateAnnotation, removeAnnotation } = useCollaborative();
  return {
    annotations: state.annotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
  };
}

export function useCollaborativePresence() {
  const { state } = useCollaborative();
  return { userPresence: state.userPresence };
}

export function useCollaborativeZone() {
  const { state, setSelectedZone } = useCollaborative();
  return { selectedZone: state.selectedZone, setSelectedZone };
}