import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { ForecastPanel } from "./ForecastPanel";
import { HealthTips } from "./HealthTips";
import { PollutantBreakdown } from "./PollutantBreakdown";
import { useState } from "react";

interface ZoneModalProps {
  zoneId: string;
  onClose: () => void;
}

export function ZoneModal({ zoneId, onClose }: ZoneModalProps) {
  const zone = useQuery(api.aqi.getZoneById, { zoneId });
  const [activeTab, setActiveTab] = useState<'overview' | 'forecast' | 'health'>('overview');

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return "from-[#00F260] to-[#0575E6]";
    if (aqi <= 100) return "from-[#A8E063] to-[#F9D423]";
    if (aqi <= 150) return "from-[#FF8C00] to-[#FF6B35]";
    if (aqi <= 200) return "from-[#FF512F] to-[#DD2476]";
    return "from-[#DD2476] to-[#4A00E0]";
  };

  if (!zone) {
    return null;
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <motion.div
        className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-[#0f0c29]/95 via-[#302b63]/95 to-[#24243e]/95 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                className={`w-16 h-16 rounded-full bg-gradient-to-r ${getAQIColor(zone.currentAqi)} flex items-center justify-center shadow-lg`}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <span className="text-white font-bold text-lg">{zone.currentAqi}</span>
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-white">{zone.name}</h2>
                <p className="text-gray-300">{zone.aqiCategory}</p>
                <p className="text-sm text-gray-400">
                  Last updated: {new Date(zone.lastUpdated).toLocaleString()}
                </p>
              </div>
            </div>
            <motion.button
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ✕
            </motion.button>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mt-6 bg-white/5 rounded-lg p-1">
            {[
              { key: 'overview', label: 'Overview', icon: '📊' },
              { key: 'forecast', label: 'AI Forecast', icon: '🔮' },
              { key: 'health', label: 'Health Tips', icon: '💡' }
            ].map((tab) => (
              <motion.button
                key={tab.key}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-[#00F260] to-[#0575E6] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveTab(tab.key as any)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'overview' && (
                <PollutantBreakdown zoneId={zoneId} />
              )}
              {activeTab === 'forecast' && (
                <ForecastPanel zoneId={zoneId} />
              )}
              {activeTab === 'health' && (
                <HealthTips zoneId={zoneId} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-4">
              <span>🛰️ Satellite validated</span>
              <span>🤖 AI-powered</span>
              <span>📍 1km² precision</span>
            </div>
            <div>
              Zone ID: {zone.zoneId}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
