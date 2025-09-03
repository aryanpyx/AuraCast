import { Authenticated, Unauthenticated } from "convex/react";

// Mock hooks for demo
const useQuery = (queryFn: any, ...args: any[]) => {
  if (typeof queryFn === 'function') {
    return queryFn(...args);
  }
  // Handle specific query patterns
  if (queryFn === 'api.aqi.getAllZones') return mockZones;
  if (queryFn === 'api.collaboration.getActiveSessions') return mockSessions;
  if (queryFn?.name?.includes('getSession')) return mockSessions[0];
  if (queryFn?.name?.includes('getSessionUsers')) return mockSessionUsers;
  if (queryFn?.name?.includes('getUserPresence')) return mockUserPresence;
  if (queryFn?.name?.includes('getChatMessages')) return mockChatMessages;
  if (queryFn?.name?.includes('getAnnotations')) return mockAnnotations;
  if (queryFn?.name?.includes('getSharedFilters')) return mockSharedFilters[0];
  return null;
};

const useMutation = (mutationFn: any) => {
  return async (data: any) => {
    console.log('Mock mutation:', mutationFn, data);
    if (mutationFn === 'api.collaboration.createSession') {
      return mockApi.collaboration.createSession(data);
    }
    if (mutationFn === 'api.collaboration.joinSession') {
      return mockApi.collaboration.joinSession();
    }
    if (mutationFn === 'api.collaboration.leaveSession') {
      return mockApi.collaboration.leaveSession();
    }
    if (mutationFn === 'api.collaboration.sendChatMessage') {
      return mockApi.collaboration.sendChatMessage(data);
    }
    if (mutationFn === 'api.collaboration.addAnnotation') {
      return mockApi.collaboration.addAnnotation(data);
    }
    if (mutationFn === 'api.collaboration.updateSharedFilters') {
      return mockApi.collaboration.updateSharedFilters(data);
    }
    return "mock result";
  };
};

// Mock API for demo purposes
const mockApi = {
  aqi: {
    seedData: async () => "Mock data seeded",
    getAllZones: () => mockZones,
  },
  auth: {
    loggedInUser: () => ({ _id: "demo-user", name: "Demo User" }),
  },
  collaboration: {
    getActiveSessions: () => mockSessions,
    getSession: (id: string) => mockSessions.find(s => s._id === id),
    getSessionUsers: (sessionId: string) => mockSessionUsers.filter(u => u.sessionId === sessionId),
    getUserPresence: (sessionId: string) => mockUserPresence.filter(p => p.sessionId === sessionId),
    getChatMessages: (sessionId: string) => mockChatMessages.filter(m => m.sessionId === sessionId),
    getAnnotations: (sessionId: string) => mockAnnotations.filter(a => a.sessionId === sessionId),
    getSharedFilters: (sessionId: string) => mockSharedFilters.find(f => f.sessionId === sessionId),
    createSession: async (data: any) => ({ ...data, _id: `session_${Date.now()}`, createdBy: "demo-user", activeUsers: ["demo-user"] }),
    joinSession: async () => "joined",
    leaveSession: async () => "left",
    updateUserPresence: async () => "updated",
    sendChatMessage: async (data: any) => ({ ...data, _id: `msg_${Date.now()}`, timestamp: Date.now() }),
    addAnnotation: async (data: any) => ({ ...data, _id: `ann_${Date.now()}`, timestamp: Date.now() }),
    updateSharedFilters: async (data: any) => ({ ...data, _id: `filter_${Date.now()}`, timestamp: Date.now() }),
  }
};

// Mock data
const mockZones = [
  {
    _id: "zone_1",
    zoneId: "LKO_001",
    name: "Hazratganj Central",
    latitude: 26.8467,
    longitude: 80.9462,
    currentAqi: 156,
    aqiCategory: "Unhealthy",
    lastUpdated: Date.now(),
    pollutants: { pm25: 89, pm10: 145, no2: 45, so2: 12, o3: 78, co: 1.2 },
    weatherData: { temperature: 28, humidity: 65, windSpeed: 8, windDirection: 270 }
  }
];

const mockSessions = [
  {
    _id: "session_1",
    name: "Demo Session",
    createdBy: "demo-user",
    activeUsers: ["demo-user"],
    settings: {}
  }
];

const mockSessionUsers = [
  {
    _id: "user_1",
    sessionId: "session_1",
    userId: "demo-user",
    joinedAt: Date.now(),
    role: "admin",
    permissions: { canInvite: true, canKick: true, canManageSettings: true }
  }
];

const mockUserPresence = [
  {
    _id: "presence_1",
    userId: "demo-user",
    sessionId: "session_1",
    lastSeen: Date.now(),
    status: "online"
  }
];

const mockChatMessages = [
  {
    _id: "msg_1",
    sessionId: "session_1",
    userId: "demo-user",
    message: "Welcome to the collaborative session!",
    timestamp: Date.now(),
    type: "text"
  }
];

const mockAnnotations = [
  {
    _id: "ann_1",
    sessionId: "session_1",
    userId: "demo-user",
    zoneId: "LKO_001",
    type: "marker",
    content: "High pollution area",
    position: { lat: 26.8467, lng: 80.9462 },
    timestamp: Date.now()
  }
];

const mockSharedFilters = [
  {
    _id: "filter_1",
    sessionId: "session_1",
    userId: "demo-user",
    filters: { aqiRange: [0, 200], pollutants: ["pm25", "pm10"] },
    timestamp: Date.now()
  }
];
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { AQIMap } from "./components/AQIMap";
import { ForecastPanel } from "./components/ForecastPanel";
import { HealthTips } from "./components/HealthTips";
import { PollutantBreakdown } from "./components/PollutantBreakdown";
import { ZoneModal } from "./components/ZoneModal";
import { CollaborativeSession } from "./components/CollaborativeSession";
import { RealTimeChat } from "./components/RealTimeChat";
import { LiveAnnotations } from "./components/LiveAnnotations";
import { MLPredictionEngine } from "./components/MLPredictionEngine";
import { DynamicDashboard } from "./components/DynamicDashboard";
import { PerformanceDashboard } from "./components/PerformanceDashboard";
import { CollaborativeProvider } from "./lib/CollaborativeContext";
import { MLErrorBoundary } from "./components/MLErrorBoundary";
import { useServiceWorker } from "./lib/useOfflineSync";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, MessageCircle, BarChart3, Settings, Wifi, WifiOff } from "lucide-react";

export default function App() {
  const { isRegistered, updateAvailable, updateServiceWorker } = useServiceWorker();

  // Check authentication state from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('auracast_authenticated') === 'true';
  });

  // Listen for authentication state changes
  useEffect(() => {
    const handleAuthStateChange = (event: CustomEvent) => {
      setIsAuthenticated(event.detail.authenticated);
    };

    window.addEventListener('authStateChanged', handleAuthStateChange as EventListener);

    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange as EventListener);
    };
  }, []);

  return (
    <MLErrorBoundary>
      <CollaborativeProvider>
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
                Collaborative • AI-Powered • Real-time
              </div>
            </motion.div>

            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2 text-xs">
                {navigator.onLine ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400" />
                )}
                <span className={navigator.onLine ? "text-green-400" : "text-red-400"}>
                  {navigator.onLine ? "Online" : "Offline"}
                </span>
              </div>

              {/* Service Worker Update */}
              {updateAvailable && (
                <button
                  onClick={updateServiceWorker}
                  className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs hover:bg-yellow-500/30 transition-colors"
                >
                  Update Available
                </button>
              )}

              <SignOutButton />
            </div>
          </header>

          <main className="flex-1">
            <Content isAuthenticated={isAuthenticated} />
          </main>
        </div>
      </CollaborativeProvider>
    </MLErrorBoundary>
  );
}

function Content({ isAuthenticated }: { isAuthenticated: boolean }) {
  // Get user from localStorage when authenticated
  const loggedInUser = isAuthenticated ? (() => {
    const storedUser = localStorage.getItem('auracast_user');
    return storedUser ? JSON.parse(storedUser) : mockApi.auth.loggedInUser();
  })() : null;
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('Initializing...');
  const [activeView, setActiveView] = useState<'dashboard' | 'collaboration' | 'ml' | 'performance'>('dashboard');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Mock seedData for demo - doesn't require Convex
  const seedData = useMutation('api.aqi.seedData');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Step 1: Initialize core systems
        setLoadingStep('Initializing core systems...');
        await new Promise(resolve => setTimeout(resolve, 200));

        // Step 2: Load collaborative features
        setLoadingStep('Loading collaborative features...');
        await new Promise(resolve => setTimeout(resolve, 200));

        // Step 3: Initialize AI models
        setLoadingStep('Initializing AI models...');
        await new Promise(resolve => setTimeout(resolve, 200));

        // Step 4: Seed data in background
        setLoadingStep('Loading air quality data...');
        await seedData({});

        // Step 5: Final setup
        setLoadingStep('Setting up real-time connections...');
        await new Promise(resolve => setTimeout(resolve, 200));

        // Always complete loading after all steps, regardless of Convex status
        setTimeout(() => {
          setIsLoading(false);
        }, 300);

      } catch (error) {
        console.error("Failed to initialize:", error);
        setIsLoading(false);
      }
    };

    initializeApp();

    // Safety fallback - ensure loading always completes
    const fallbackTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000); // 5 second absolute maximum

    return () => clearTimeout(fallbackTimeout);
  }, [seedData]); // Remove loggedInUser from dependencies to prevent re-running

  const handleZoneSelect = (zoneId: string) => {
    setSelectedZone(zoneId);
    setShowModal(true);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleSessionChange = (sessionId: string | null) => {
    setCurrentSessionId(sessionId);
  };

  // Simple loading condition - just check isLoading state
  if (isLoading) {
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
            className="text-gray-400 mt-2 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {loadingStep}
          </motion.div>
          <motion.div
            className="mt-4 w-48 h-1 bg-white/20 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isAuthenticated ? (
        <>
          {/* Navigation Tabs */}
          <motion.div
            className="flex justify-center mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="glass-card p-2 rounded-xl flex space-x-2">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'collaboration', label: 'Collaborate', icon: Users },
                { id: 'ml', label: 'AI Engine', icon: Settings },
                { id: 'performance', label: 'Analytics', icon: BarChart3 },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveView(id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                    activeView === id
                      ? 'bg-[#00F260] text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </motion.div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {activeView === 'dashboard' && (
            <motion.div
              key="dashboard"
              className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 max-w-7xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {/* Main Map Section */}
              <div className="lg:col-span-3 space-y-6">
                <motion.div
                  className="glass-card p-6 rounded-2xl"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-2xl font-bold">Live AQI Map - Lucknow</h2>
                      <div className="text-sm text-gray-400">
                        1km² microzones • Real-time collaborative monitoring
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-300">
                        Last updated: {new Date().toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-green-400 flex items-center justify-end mt-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                        Live • {currentSessionId ? 'Collaborative' : 'Personal'}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <AQIMap onZoneSelect={handleZoneSelect} />
                    {currentSessionId && (
                      <LiveAnnotations
                        sessionId={currentSessionId}
                        currentUserId={loggedInUser?._id || ''}
                      />
                    )}
                  </div>
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

                {/* Collaborative Session Panel */}
                <motion.div
                  className="glass-card p-6 rounded-2xl"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <CollaborativeSession onSessionChange={handleSessionChange} />
                </motion.div>
              </div>
            </motion.div>
          )}

          {activeView === 'collaboration' && (
            <motion.div
              key="collaboration"
              className="p-6 max-w-7xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <CollaborativeSession onSessionChange={handleSessionChange} />
                </div>
                <div>
                  {currentSessionId && (
                    <RealTimeChat
                      sessionId={currentSessionId}
                      currentUserId={loggedInUser?._id || ''}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'ml' && (
            <motion.div
              key="ml"
              className="p-6 max-w-7xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <MLPredictionEngine />
            </motion.div>
          )}

          {activeView === 'performance' && (
            <motion.div
              key="performance"
              className="p-6 max-w-7xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <PerformanceDashboard sessionId={currentSessionId || undefined} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome Message */}
        <AnimatePresence>
          {!selectedZone && !currentSessionId && (
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
                  Experience collaborative air quality intelligence with real-time multi-user sessions,
                  advanced AI predictions, and live annotations.
                </p>
                <div className="text-sm text-gray-400 space-y-1 mb-4">
                  <div>🔄 Real-time Collaboration</div>
                  <div>🧠 Ensemble AI Predictions</div>
                  <div>📊 Live Performance Analytics</div>
                  <div>💬 Integrated Communication</div>
                </div>
                <button
                  onClick={() => setIsLoading(false)}
                  className="px-4 py-2 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-lg text-white text-sm font-medium hover:scale-105 transition-transform"
                >
                  Start Exploring
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
        </>
      ) : (
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
                Collaborative Air Quality Intelligence
              </p>
              <p className="text-gray-400 mb-4">
                Join real-time sessions for advanced AI-powered air quality analysis
              </p>
              <div className="flex justify-center space-x-4 text-sm text-gray-500">
                <span>🔄 Real-time</span>
                <span>🤖 AI Ensemble</span>
                <span>👥 Collaborative</span>
              </div>
            </div>
            <SignInForm />
          </motion.div>
        </div>
      )}
    </div>
  );
}
