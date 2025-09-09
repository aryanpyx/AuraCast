import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '../lib/mockApi';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, UserMinus, Crown, Clock, Wifi, WifiOff } from 'lucide-react';

interface CollaborativeSessionProps {
  onSessionChange?: (sessionId: string | null) => void;
}

interface Session {
  _id: string;
  name: string;
  createdBy: string;
  activeUsers: string[];
  settings: any;
}

interface SessionUser {
  _id: string;
  sessionId: string;
  userId: string;
  joinedAt: number;
  role: string;
  permissions: any;
}

interface UserPresence {
  _id: string;
  userId: string;
  sessionId: string;
  lastSeen: number;
  status: string;
}

export function CollaborativeSession({ onSessionChange }: CollaborativeSessionProps) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // Queries
  const activeSessions = useQuery('api.collaboration.getActiveSessions');
  const currentSession = useQuery(
    'api.collaboration.getSession',
    currentSessionId ? { sessionId: currentSessionId } : 'skip'
  );
  const sessionUsers = useQuery(
    'api.collaboration.getSessionUsers',
    currentSessionId ? { sessionId: currentSessionId } : 'skip'
  );
  const userPresence = useQuery(
    'api.collaboration.getUserPresence',
    currentSessionId ? { sessionId: currentSessionId } : 'skip'
  );

  // Mutations
  const createSession = useMutation('api.collaboration.createSession');
  const joinSession = useMutation('api.collaboration.joinSession');
  const leaveSession = useMutation('api.collaboration.leaveSession');
  const updatePresence = useMutation('api.collaboration.updateUserPresence');

  // Update presence every 30 seconds
  useEffect(() => {
    if (!currentSessionId) return;

    const interval = setInterval(() => {
      updatePresence({ sessionId: currentSessionId as any, status: 'online' });
    }, 30000);

    return () => clearInterval(interval);
  }, [currentSessionId, updatePresence]);

  // Handle session change
  useEffect(() => {
    onSessionChange?.(currentSessionId);
  }, [currentSessionId, onSessionChange]);

  const handleCreateSession = async () => {
    if (!sessionName.trim()) return;

    try {
      const sessionId = await createSession({ name: sessionName });
      setCurrentSessionId(sessionId);
      setShowCreateModal(false);
      setSessionName('');
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleJoinSession = async () => {
    if (!joinCode.trim()) return;

    try {
      // For now, we'll use the session ID directly
      // In a real app, you'd validate the join code
      await joinSession({ sessionId: joinCode as any });
      setCurrentSessionId(joinCode);
      setShowJoinModal(false);
      setJoinCode('');
    } catch (error) {
      console.error('Failed to join session:', error);
    }
  };

  const handleLeaveSession = async () => {
    if (!currentSessionId) return;

    try {
      await leaveSession({ sessionId: currentSessionId as any });
      setCurrentSessionId(null);
    } catch (error) {
      console.error('Failed to leave session:', error);
    }
  };

  const getPresenceStatus = (userId: string) => {
    if (!userPresence) return 'offline';

    const presence = userPresence.find(p => p.userId === userId);
    if (!presence) return 'offline';

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return presence.lastSeen > fiveMinutesAgo ? presence.status : 'offline';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-400';
      case 'away': return 'bg-yellow-400';
      default: return 'bg-gray-400';
    }
  };

  if (!activeSessions) {
    return (
      <div className="flex items-center justify-center p-4">
        <motion.div
          className="w-6 h-6 border-2 border-[#00F260] border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session Status */}
      {currentSession ? (
        <motion.div
          className="glass-card p-4 rounded-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{currentSession.name}</h3>
                <p className="text-xs text-gray-400">
                  {sessionUsers?.length || 0} participants
                </p>
              </div>
            </div>
            <button
              onClick={handleLeaveSession}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
            >
              Leave
            </button>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Participants</h4>
            <div className="flex flex-wrap gap-2">
              {sessionUsers?.map((user) => (
                <motion.div
                  key={user._id}
                  className="flex items-center space-x-2 bg-white/5 rounded-lg px-3 py-2"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <div className="relative">
                    <div className="w-6 h-6 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {user.userId.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${getStatusColor(getPresenceStatus(user.userId))}`} />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm text-gray-300">
                      User {user.userId.slice(-4)}
                    </span>
                    {user.role === 'admin' && (
                      <Crown className="w-3 h-3 text-yellow-400" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="glass-card p-4 rounded-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center">
            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h3 className="font-semibold text-white mb-2">Join a Collaborative Session</h3>
            <p className="text-sm text-gray-400 mb-4">
              Work together with others to analyze air quality data in real-time
            </p>
            <div className="flex space-x-3 justify-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-lg text-white text-sm font-medium hover:scale-105 transition-transform"
              >
                Create Session
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Join Session
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Available Sessions */}
      {activeSessions.length > 0 && !currentSession && (
        <motion.div
          className="glass-card p-4 rounded-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h4 className="font-semibold text-white mb-3">Available Sessions</h4>
          <div className="space-y-2">
            {activeSessions.slice(0, 5).map((session) => (
              <motion.div
                key={session._id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => {
                  setJoinCode(session._id);
                  setShowJoinModal(true);
                }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h5 className="font-medium text-white">{session.name}</h5>
                    <p className="text-xs text-gray-400">
                      {session.activeUsers.length} participants
                    </p>
                  </div>
                </div>
                <UserPlus className="w-4 h-4 text-gray-400" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Create Session Modal */}
      <AnimatePresence>
        {showCreateModal && (
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
              <h3 className="text-xl font-bold text-white mb-4">Create New Session</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Session Name
                  </label>
                  <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00F260]"
                    placeholder="Enter session name..."
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleCreateSession}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-lg text-white font-medium hover:scale-105 transition-transform"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
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

      {/* Join Session Modal */}
      <AnimatePresence>
        {showJoinModal && (
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
              <h3 className="text-xl font-bold text-white mb-4">Join Session</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Session Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00F260]"
                    placeholder="Enter session code..."
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleJoinSession}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-lg text-white font-medium hover:scale-105 transition-transform"
                  >
                    Join
                  </button>
                  <button
                    onClick={() => setShowJoinModal(false)}
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