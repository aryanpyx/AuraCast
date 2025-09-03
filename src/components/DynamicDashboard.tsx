import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  Plus,
  Settings,
  Grid,
  BarChart3,
  Map,
  MessageSquare,
  Brain,
  Users,
  TrendingUp,
  X,
  GripVertical,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { AQIMap } from './AQIMap';
import { MLPredictionEngine } from './MLPredictionEngine';
import { CollaborativeSession } from './CollaborativeSession';
import { useCollaborative } from '../lib/CollaborativeContext';

interface DashboardWidget {
  id: string;
  type: 'map' | 'forecast' | 'chat' | 'analytics' | 'session' | 'custom';
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  position: { x: number; y: number };
  visible: boolean;
  settings?: any;
}

interface DynamicDashboardProps {
  sessionId?: string;
}

const defaultWidgets: DashboardWidget[] = [
  {
    id: 'main-map',
    type: 'map',
    title: 'AQI Map',
    size: 'large',
    position: { x: 0, y: 0 },
    visible: true,
  },
  {
    id: 'forecast',
    type: 'forecast',
    title: 'AI Predictions',
    size: 'medium',
    position: { x: 1, y: 0 },
    visible: true,
  },
  {
    id: 'analytics',
    type: 'analytics',
    title: 'Analytics',
    size: 'medium',
    position: { x: 0, y: 1 },
    visible: true,
  },
  {
    id: 'session',
    type: 'session',
    title: 'Collaborative Session',
    size: 'small',
    position: { x: 1, y: 1 },
    visible: true,
  },
];

export function DynamicDashboard({ sessionId }: DynamicDashboardProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [layout, setLayout] = useState<'grid' | 'masonry'>('grid');

  const { state: collabState, updateViewport, updateFilters } = useCollaborative();

  // Load user dashboard preferences
  const userPreferences = useQuery(api.aqi.getUserPreferences);
  const updatePreferences = useMutation(api.aqi.updateUserPreferences);

  // Load dashboard layout from user preferences
  useEffect(() => {
    if (userPreferences?.dashboardLayout) {
      try {
        const savedLayout = JSON.parse(userPreferences.dashboardLayout);
        setWidgets(savedLayout.widgets || defaultWidgets);
        setLayout(savedLayout.layout || 'grid');
      } catch (error) {
        console.error('Failed to load dashboard layout:', error);
      }
    }
  }, [userPreferences]);

  // Save dashboard layout
  const saveLayout = useCallback(async () => {
    try {
      await updatePreferences({
        dashboardLayout: JSON.stringify({ widgets, layout }),
      });
    } catch (error) {
      console.error('Failed to save dashboard layout:', error);
    }
  }, [widgets, layout, updatePreferences]);

  // Auto-save layout changes
  useEffect(() => {
    const timeoutId = setTimeout(saveLayout, 1000);
    return () => clearTimeout(timeoutId);
  }, [widgets, layout, saveLayout]);

  const addWidget = (type: DashboardWidget['type']) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type,
      title: getWidgetTitle(type),
      size: 'medium',
      position: { x: 0, y: 0 },
      visible: true,
    };
    setWidgets([...widgets, newWidget]);
  };

  const removeWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const updateWidget = (widgetId: string, updates: Partial<DashboardWidget>) => {
    setWidgets(widgets.map(w =>
      w.id === widgetId ? { ...w, ...updates } : w
    ));
  };

  const getWidgetTitle = (type: DashboardWidget['type']): string => {
    const titles = {
      map: 'AQI Map',
      forecast: 'AI Predictions',
      chat: 'Team Chat',
      analytics: 'Analytics Dashboard',
      session: 'Collaborative Session',
      custom: 'Custom Widget',
    };
    return titles[type] || 'Widget';
  };

  const getWidgetIcon = (type: DashboardWidget['type']) => {
    const icons = {
      map: Map,
      forecast: Brain,
      chat: MessageSquare,
      analytics: BarChart3,
      session: Users,
      custom: Settings,
    };
    return icons[type] || Settings;
  };

  const getWidgetSize = (size: DashboardWidget['size']) => {
    const sizes = {
      small: 'col-span-1 row-span-1',
      medium: 'col-span-2 row-span-1',
      large: 'col-span-2 row-span-2',
      full: 'col-span-4 row-span-2',
    };
    return sizes[size];
  };

  const renderWidget = (widget: DashboardWidget) => {
    const Icon = getWidgetIcon(widget.type);

    return (
      <motion.div
        key={widget.id}
        layout
        className={`glass-card p-4 rounded-xl relative group ${getWidgetSize(widget.size)}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
      >
        {/* Widget Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Icon className="w-5 h-5 text-[#00F260]" />
            <h3 className="font-semibold text-white">{widget.title}</h3>
          </div>

          {isEditMode && (
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => updateWidget(widget.id, {
                  size: widget.size === 'small' ? 'medium' : widget.size === 'medium' ? 'large' : 'small'
                })}
                className="p-1 hover:bg-white/10 rounded"
              >
                <Maximize2 className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => removeWidget(widget.id)}
                className="p-1 hover:bg-red-500/20 rounded"
              >
                <X className="w-4 h-4 text-red-400" />
              </button>
              <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
            </div>
          )}
        </div>

        {/* Widget Content */}
        <div className="h-full">
          {widget.type === 'map' && (
            <AQIMap onZoneSelect={setSelectedZone} />
          )}
          {widget.type === 'forecast' && (
            <MLPredictionEngine zoneId={selectedZone || undefined} />
          )}
          {widget.type === 'session' && (
            <CollaborativeSession onSessionChange={(sessionId) => {
              // Handle session changes
            }} />
          )}
          {widget.type === 'analytics' && (
            <AnalyticsWidget zoneId={selectedZone} />
          )}
          {widget.type === 'chat' && (
            <ChatWidget sessionId={sessionId} />
          )}
          {widget.type === 'custom' && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              Custom widget content
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h2 className="text-2xl font-bold text-white">Dynamic Dashboard</h2>
          <p className="text-gray-400">Customize your AQI intelligence workspace</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Layout Toggle */}
          <div className="flex bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setLayout('grid')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                layout === 'grid' ? 'bg-[#00F260] text-white' : 'text-gray-400'
              }`}
            >
              <Grid className="w-4 h-4 inline mr-1" />
              Grid
            </button>
            <button
              onClick={() => setLayout('masonry')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                layout === 'masonry' ? 'bg-[#00F260] text-white' : 'text-gray-400'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-1" />
              Masonry
            </button>
          </div>

          {/* Edit Mode Toggle */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isEditMode
                ? 'bg-[#00F260] text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            {isEditMode ? 'Done' : 'Edit'}
          </button>

          {/* Add Widget Button */}
          <div className="relative">
            <button
              onClick={() => {}}
              className="px-4 py-2 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-lg text-white text-sm font-medium hover:scale-105 transition-transform"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add Widget
            </button>

            {/* Widget Type Menu */}
            <AnimatePresence>
              {isEditMode && (
                <motion.div
                  className="absolute top-full mt-2 right-0 w-48 bg-gray-800/95 backdrop-blur-sm rounded-lg border border-white/10 shadow-xl z-10"
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                >
                  {[
                    { type: 'map', label: 'AQI Map', icon: Map },
                    { type: 'forecast', label: 'AI Predictions', icon: Brain },
                    { type: 'analytics', label: 'Analytics', icon: BarChart3 },
                    { type: 'chat', label: 'Team Chat', icon: MessageSquare },
                    { type: 'session', label: 'Session Manager', icon: Users },
                  ].map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => addWidget(type as DashboardWidget['type'])}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center space-x-3 first:rounded-t-lg last:rounded-b-lg"
                    >
                      <Icon className="w-4 h-4 text-[#00F260]" />
                      <span className="text-white text-sm">{label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Dashboard Grid */}
      <motion.div
        className={`grid gap-6 ${
          layout === 'grid'
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-fr'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-masonry'
        }`}
        layout
      >
        <AnimatePresence>
          {widgets
            .filter(widget => widget.visible)
            .map(widget => renderWidget(widget))}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {widgets.filter(w => w.visible).length === 0 && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Grid className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Empty Dashboard</h3>
          <p className="text-gray-400 mb-6">Add widgets to customize your workspace</p>
          <button
            onClick={() => setIsEditMode(true)}
            className="px-6 py-3 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-lg text-white font-medium hover:scale-105 transition-transform"
          >
            Start Customizing
          </button>
        </motion.div>
      )}
    </div>
  );
}

// Analytics Widget Component
function AnalyticsWidget({ zoneId }: { zoneId: string | null }) {
  const zone = useQuery(api.aqi.getZoneById, zoneId ? { zoneId } : 'skip');

  if (!zone) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400">
        Select a zone to view analytics
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-sm text-gray-400">Current AQI</div>
          <div className="text-2xl font-bold text-white">{zone.currentAqi}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-sm text-gray-400">Temperature</div>
          <div className="text-2xl font-bold text-white">{zone.weatherData.temperature}°C</div>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-3">
        <div className="text-sm text-gray-400 mb-2">Pollutant Breakdown</div>
        <div className="space-y-2">
          {Object.entries(zone.pollutants).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-gray-300 uppercase">{key}</span>
              <span className="text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Chat Widget Component (placeholder)
function ChatWidget({ sessionId }: { sessionId?: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-gray-400">
      <div className="text-center">
        <MessageSquare className="w-8 h-8 mx-auto mb-2" />
        <p>Real-time chat will be implemented here</p>
      </div>
    </div>
  );
}