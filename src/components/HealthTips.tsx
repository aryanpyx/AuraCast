import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface HealthTipsProps {
  zoneId: string | null;
}

export function HealthTips({ zoneId }: HealthTipsProps) {
  const zone = useQuery(api.aqi.getZoneById, zoneId ? { zoneId } : "skip");
  const healthTips = useQuery(api.aqi.getHealthTips, 
    zone ? { aqiCategory: zone.aqiCategory } : "skip"
  );
  const [activeTab, setActiveTab] = useState<'tips' | 'activities' | 'recommendations'>('tips');

  const getHealthIcon = (category: string) => {
    switch (category) {
      case "Good": return "😊";
      case "Moderate": return "😐";
      case "Unhealthy for Sensitive Groups": return "😷";
      case "Unhealthy": return "⚠️";
      case "Very Unhealthy": return "🚨";
      default: return "❓";
    }
  };

  const getHealthColor = (category: string) => {
    switch (category) {
      case "Good": return "from-[#00F260] to-[#0575E6]";
      case "Moderate": return "from-[#A8E063] to-[#F9D423]";
      case "Unhealthy for Sensitive Groups": return "from-[#FF8C00] to-[#FF6B35]";
      case "Unhealthy": return "from-[#FF512F] to-[#DD2476]";
      case "Very Unhealthy": return "from-[#DD2476] to-[#4A00E0]";
      default: return "from-gray-500 to-gray-600";
    }
  };

  if (!zoneId || !zone) {
    return (
      <div className="text-center py-8">
        <motion.div
          className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#A8E063] to-[#F9D423] flex items-center justify-center opacity-50"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <span className="text-white font-bold text-xl">💡</span>
        </motion.div>
        <h3 className="text-lg font-semibold mb-2">Health Recommendations</h3>
        <p className="text-gray-400 text-sm">
          Select a zone to get personalized health tips and activity recommendations
        </p>
      </div>
    );
  }

  if (!healthTips) {
    return (
      <div className="text-center py-8">
        <motion.div
          className="w-8 h-8 mx-auto border-2 border-[#00F260] border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Health Guidance</h3>
          <p className="text-sm text-gray-400">{zone.name}</p>
        </div>
        <motion.div
          className={`px-3 py-1 rounded-full bg-gradient-to-r ${getHealthColor(zone.aqiCategory)} text-white text-sm font-medium flex items-center space-x-2`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <span>{getHealthIcon(zone.aqiCategory)}</span>
          <span>{zone.aqiCategory}</span>
        </motion.div>
      </div>

      {/* AQI Status */}
      <motion.div
        className="p-4 bg-white/5 rounded-lg border border-white/10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Current AQI</span>
          <span className="text-2xl font-bold" style={{ color: getHealthColor(zone.aqiCategory).split(' ')[1].replace('to-[', '').replace(']', '') }}>
            {zone.currentAqi}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          Category: {healthTips.category} • Last updated: {new Date(zone.lastUpdated).toLocaleTimeString()}
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
        {[
          { key: 'tips', label: 'Tips', icon: '💡' },
          { key: 'activities', label: 'Activities', icon: '🏃' },
          { key: 'recommendations', label: 'Advice', icon: '📋' }
        ].map((tab) => (
          <motion.button
            key={tab.key}
            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-[#00F260] to-[#0575E6] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab(tab.key as any)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          {activeTab === 'tips' && (
            <div className="space-y-2">
              {healthTips.tips.map((tip, index) => (
                <motion.div
                  key={index}
                  className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#00F260] to-[#0575E6] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{tip}</p>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-3">
              {Object.entries(healthTips.activities).map(([key, value], index) => (
                <motion.div
                  key={key}
                  className="p-3 bg-white/5 rounded-lg"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium capitalize text-white">
                      {key === 'vulnerable' ? 'Sensitive Groups' : key}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent"></div>
                  </div>
                  <p className="text-sm text-gray-300">{value}</p>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-2">
              {healthTips.recommendations.map((rec, index) => (
                <motion.div
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#A8E063] to-[#F9D423] flex-shrink-0"></div>
                  <p className="text-sm text-gray-300">{rec}</p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Emergency Contact */}
      {zone.currentAqi > 200 && (
        <motion.div
          className="p-4 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-red-400">🚨</span>
            <span className="text-red-400 font-semibold text-sm">Health Emergency Alert</span>
          </div>
          <p className="text-xs text-red-300">
            Air quality is hazardous. If experiencing breathing difficulties, contact emergency services immediately.
          </p>
        </motion.div>
      )}
    </div>
  );
}
