import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { AQIMap } from "./components/AQIMap";
import { ForecastPanel } from "./components/ForecastPanel";
import { HealthTips } from "./components/HealthTips";
import { PollutantBreakdown } from "./components/PollutantBreakdown";
import { ZoneModal } from "./components/ZoneModal";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-[#F0F0F0] overflow-hidden">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/5 border-b border-white/10 h-16 flex justify-between items-center px-6">
        <motion.div 
          className="flex items-center space-x-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#00F260] to-[#0575E6] flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#00F260] to-[#0575E6] bg-clip-text text-transparent">
            AuraCast
          </h1>
          <div className="text-xs text-gray-400 hidden sm:block">
            AI-Powered • Hyperlocal • Real-time
          </div>
        </motion.div>
        <SignOutButton />
      </header>
      
      <main className="flex-1">
        <Content />
      </main>
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const seedData = useMutation(api.aqi.seedData);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await seedData();
        setTimeout(() => setIsLoading(false), 3000); // Show welcome message for 3 seconds
      } catch (error) {
        console.error("Failed to seed data:", error);
        setIsLoading(false);
      }
    };
    
    initializeApp();
  }, [seedData]);

  const handleZoneSelect = (zoneId: string) => {
    setSelectedZone(zoneId);
    setShowModal(true);
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  if (loggedInUser === undefined || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#00F260] to-[#0575E6] flex items-center justify-center">
            <motion.div
              className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <motion.div
            className="text-2xl font-bold bg-gradient-to-r from-[#00F260] to-[#0575E6] bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Initializing AuraCast...
          </motion.div>
          <motion.div
            className="text-gray-400 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Loading AI models and satellite data
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Authenticated>
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Main Map Section */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div 
              className="glass-card p-6 rounded-2xl"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold">Live AQI Map - Lucknow</h2>
                  <div className="text-sm text-gray-400">
                    1km² microzones • Updated every 15 minutes
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-300">
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                  <div className="text-xs text-green-400 flex items-center justify-end mt-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                    Live
                  </div>
                </div>
              </div>
              <AQIMap onZoneSelect={handleZoneSelect} />
            </motion.div>

            {selectedZone && (
              <motion.div 
                className="glass-card p-6 rounded-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <PollutantBreakdown zoneId={selectedZone} />
              </motion.div>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            <motion.div 
              className="glass-card p-6 rounded-2xl"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <ForecastPanel zoneId={selectedZone} />
            </motion.div>

            <motion.div 
              className="glass-card p-6 rounded-2xl"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <HealthTips zoneId={selectedZone} />
            </motion.div>
          </div>
        </motion.div>

        {/* Welcome Message */}
        <AnimatePresence>
          {!selectedZone && isLoading && (
            <motion.div 
              className="fixed inset-0 flex items-center justify-center pointer-events-none z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div 
                className="glass-card p-8 rounded-2xl text-center max-w-md pointer-events-auto relative"
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 20 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <button
                  onClick={() => setIsLoading(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  ✕
                </button>
                <motion.div
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#00F260] to-[#0575E6] flex items-center justify-center"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <span className="text-white font-bold text-xl">🌍</span>
                </motion.div>
                <h3 className="text-2xl font-bold mb-4">Welcome to AuraCast</h3>
                <p className="text-gray-300 mb-4">
                  Tap on any microzone on the map to view detailed air quality information, 
                  AI-powered forecasts, and personalized health recommendations.
                </p>
                <div className="text-sm text-gray-400 space-y-1 mb-4">
                  <div>🤖 AI-Powered LSTM Predictions</div>
                  <div>🛰️ Real-time Satellite Data</div>
                  <div>📍 1km² Hyperlocal Zones</div>
                </div>
                <button
                  onClick={() => setIsLoading(false)}
                  className="px-4 py-2 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-lg text-white text-sm font-medium hover:scale-105 transition-transform"
                >
                  Explore Map
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zone Detail Modal */}
        <AnimatePresence>
          {showModal && selectedZone && (
            <ZoneModal 
              zoneId={selectedZone} 
              onClose={() => setShowModal(false)} 
            />
          )}
        </AnimatePresence>
      </Authenticated>

      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[80vh] p-6">
          <motion.div 
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-center mb-8">
              <motion.div
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-[#00F260] to-[#0575E6] flex items-center justify-center shadow-2xl"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <span className="text-white font-bold text-2xl">A</span>
              </motion.div>
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-[#00F260] to-[#0575E6] bg-clip-text text-transparent">
                AuraCast
              </h1>
              <p className="text-xl text-gray-300 mb-2">
                Hyperlocal Air Quality Forecasting
              </p>
              <p className="text-gray-400 mb-4">
                AI-powered predictions for Lucknow microzones
              </p>
              <div className="flex justify-center space-x-4 text-sm text-gray-500">
                <span>🤖 LSTM AI</span>
                <span>🛰️ Satellite Data</span>
                <span>📍 1km² Zones</span>
              </div>
            </div>
            <SignInForm />
          </motion.div>
        </div>
      </Unauthenticated>
    </div>
  );
}
