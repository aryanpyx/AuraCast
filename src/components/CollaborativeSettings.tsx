import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Bell,
  AlertTriangle,
  Users,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Smartphone,
  Volume2,
  VolumeX
} from 'lucide-react';

interface AlertThreshold {
  id: string;
  name: string;
  aqiThreshold: number;
  pollutants: {
    pm25?: number;
    pm10?: number;
    no2?: number;
    so2?: number;
    o3?: number;
    co?: number;
  };
  enabled: boolean;
  notificationMethods: ('push' | 'email' | 'inApp')[];
  zones: string[];
  createdBy: string;
  createdAt: number;
}

interface UserPreferences {
  userId: string;
  alertThresholds: AlertThreshold[];
  globalSettings: {
    enableSound: boolean;
    enableVibration: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
    language: string;
  };
}

interface CollaborativeSettingsProps {
  sessionId: string;
  currentUserId: string;
  onSettingsChange?: (settings: any) => void;
}

export function CollaborativeSettings({
  sessionId,
  currentUserId,
  onSettingsChange
}: CollaborativeSettingsProps) {
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [globalSettings, setGlobalSettings] = useState<UserPreferences['globalSettings']>({
    enableSound: true,
    enableVibration: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    language: 'en',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [selectedThreshold, setSelectedThreshold] = useState<AlertThreshold | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Convex queries and mutations
  const userPreferences = useQuery(api.aqi.getUserPreferences);
  const updatePreferences = useMutation(api.aqi.updateUserPreferences);

  // Load user preferences
  useEffect(() => {
    if (userPreferences?.alertThresholds) {
      setThresholds(userPreferences.alertThresholds as AlertThreshold[]);
    }
    if (userPreferences?.globalSettings) {
      setGlobalSettings(userPreferences.globalSettings as UserPreferences['globalSettings']);
    }
  }, [userPreferences]);

  const handleSaveSettings = async () => {
    try {
      await updatePreferences({
        alertThresholds: thresholds,
        globalSettings,
      });
      setIsEditing(false);
      onSettingsChange?.({ thresholds, globalSettings });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleAddThreshold = () => {
    const newThreshold: AlertThreshold = {
      id: `threshold_${Date.now()}`,
      name: 'New Alert Threshold',
      aqiThreshold: 100,
      pollutants: {},
      enabled: true,
      notificationMethods: ['inApp'],
      zones: [],
      createdBy: currentUserId,
      createdAt: Date.now(),
    };
    setThresholds([...thresholds, newThreshold]);
    setSelectedThreshold(newThreshold);
    setShowAddForm(false);
  };

  const handleUpdateThreshold = (updatedThreshold: AlertThreshold) => {
    setThresholds(thresholds.map(t =>
      t.id === updatedThreshold.id ? updatedThreshold : t
    ));
  };

  const handleDeleteThreshold = (thresholdId: string) => {
    setThresholds(thresholds.filter(t => t.id !== thresholdId));
    if (selectedThreshold?.id === thresholdId) {
      setSelectedThreshold(null);
    }
  };

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return "from-[#00F260] to-[#0575E6]";
    if (aqi <= 100) return "from-[#A8E063] to-[#F9D423]";
    if (aqi <= 150) return "from-[#FF8C00] to-[#FF6B35]";
    if (aqi <= 200) return "from-[#FF512F] to-[#DD2476]";
    return "from-[#DD2476] to-[#4A00E0]";
  };

  const getAQICategory = (aqi: number) => {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for Sensitive Groups";
    if (aqi <= 200) return "Unhealthy";
    return "Very Unhealthy";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-lg flex items-center justify-center">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Collaborative Settings</h3>
            <p className="text-xs text-gray-400">Manage alert thresholds and preferences</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              isEditing
                ? 'bg-[#00F260] text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {isEditing ? 'Editing' : 'Edit'}
          </button>

          {isEditing && (
            <button
              onClick={handleSaveSettings}
              className="px-3 py-1 bg-[#00F260] rounded-lg text-white text-sm hover:scale-105 transition-transform"
            >
              <Save className="w-4 h-4 inline mr-1" />
              Save
            </button>
          )}
        </div>
      </motion.div>

      {/* Global Settings */}
      <motion.div
        className="glass-card p-6 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h4 className="font-semibold text-white mb-4">Global Preferences</h4>

        <div className="space-y-4">
          {/* Sound & Vibration */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {globalSettings.enableSound ? (
                <Volume2 className="w-5 h-5 text-green-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="text-sm font-medium text-white">Sound Notifications</p>
                <p className="text-xs text-gray-400">Play sound for alerts</p>
              </div>
            </div>
            <button
              onClick={() => setGlobalSettings({
                ...globalSettings,
                enableSound: !globalSettings.enableSound
              })}
              disabled={!isEditing}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                globalSettings.enableSound ? 'bg-[#00F260]' : 'bg-gray-600'
              } ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  globalSettings.enableSound ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Smartphone className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-white">Vibration</p>
                <p className="text-xs text-gray-400">Vibrate for alerts</p>
              </div>
            </div>
            <button
              onClick={() => setGlobalSettings({
                ...globalSettings,
                enableVibration: !globalSettings.enableVibration
              })}
              disabled={!isEditing}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                globalSettings.enableVibration ? 'bg-[#00F260]' : 'bg-gray-600'
              } ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  globalSettings.enableVibration ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Quiet Hours */}
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-sm font-medium text-white">Quiet Hours</p>
                  <p className="text-xs text-gray-400">Disable notifications during specified hours</p>
                </div>
              </div>
              <button
                onClick={() => setGlobalSettings({
                  ...globalSettings,
                  quietHours: {
                    ...globalSettings.quietHours,
                    enabled: !globalSettings.quietHours.enabled
                  }
                })}
                disabled={!isEditing}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  globalSettings.quietHours.enabled ? 'bg-[#00F260]' : 'bg-gray-600'
                } ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    globalSettings.quietHours.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {globalSettings.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={globalSettings.quietHours.start}
                    onChange={(e) => setGlobalSettings({
                      ...globalSettings,
                      quietHours: {
                        ...globalSettings.quietHours,
                        start: e.target.value
                      }
                    })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00F260] disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">End Time</label>
                  <input
                    type="time"
                    value={globalSettings.quietHours.end}
                    onChange={(e) => setGlobalSettings({
                      ...globalSettings,
                      quietHours: {
                        ...globalSettings.quietHours,
                        end: e.target.value
                      }
                    })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00F260] disabled:opacity-50"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Alert Thresholds */}
      <motion.div
        className="glass-card p-6 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-white">Alert Thresholds</h4>
          {isEditing && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1 bg-[#00F260] rounded-lg text-white text-sm hover:scale-105 transition-transform"
            >
              Add Threshold
            </button>
          )}
        </div>

        <div className="space-y-3">
          {thresholds.map((threshold, index) => (
            <motion.div
              key={threshold.id}
              className="border border-white/10 rounded-lg p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getAQIColor(threshold.aqiThreshold)} flex items-center justify-center`}>
                    <span className="text-white font-bold text-sm">
                      {threshold.aqiThreshold}
                    </span>
                  </div>
                  <div>
                    <h5 className="font-medium text-white">{threshold.name}</h5>
                    <p className="text-xs text-gray-400">
                      {getAQICategory(threshold.aqiThreshold)} • {threshold.zones.length} zones
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    {threshold.notificationMethods.includes('inApp') && (
                      <Bell className="w-4 h-4 text-blue-400" />
                    )}
                    {threshold.notificationMethods.includes('email') && (
                      <Mail className="w-4 h-4 text-green-400" />
                    )}
                    {threshold.notificationMethods.includes('push') && (
                      <Smartphone className="w-4 h-4 text-purple-400" />
                    )}
                  </div>

                  {threshold.enabled ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}

                  {isEditing && (
                    <button
                      onClick={() => handleDeleteThreshold(threshold.id)}
                      className="p-1 hover:bg-red-500/20 rounded"
                    >
                      <XCircle className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Pollutant Thresholds */}
              {Object.keys(threshold.pollutants).length > 0 && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {Object.entries(threshold.pollutants).map(([pollutant, value]) => (
                    <div key={pollutant} className="text-center">
                      <span className="text-gray-400 uppercase">{pollutant}</span>
                      <div className="text-white font-medium">{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}

          {thresholds.length === 0 && (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-400 mb-3">No alert thresholds configured</p>
              {isEditing && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-[#00F260] rounded-lg text-white text-sm font-medium hover:scale-105 transition-transform"
                >
                  Create First Threshold
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Add Threshold Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass-card p-6 rounded-xl w-full max-w-md"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <h3 className="text-xl font-bold text-white mb-4">Add Alert Threshold</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Threshold Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., High Pollution Alert"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00F260]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    AQI Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    defaultValue="100"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00F260]"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleAddThreshold}
                    className="flex-1 px-4 py-2 bg-[#00F260] rounded-lg text-white font-medium hover:scale-105 transition-transform"
                  >
                    Add Threshold
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}