import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  MessageSquare,
  Users,
  Smile,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Settings,
  Search,
  Hash,
  AtSign,
  Image,
  File,
  Mic,
  MicOff,
  X
} from 'lucide-react';

interface ChatMessage {
  _id: string;
  sessionId: string;
  userId: string;
  message: string;
  timestamp: number;
  type: 'text' | 'image' | 'file' | 'system';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    imageUrl?: string;
    mentions?: string[];
  };
}

interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: number;
}

interface RealTimeChatProps {
  sessionId: string;
  currentUserId: string;
  onClose?: () => void;
  compact?: boolean;
}

export function RealTimeChat({ sessionId, currentUserId, onClose, compact = false }: RealTimeChatProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock API queries and mutations
  const messages = useQuery('api.collaboration.getChatMessages', { sessionId, limit: 50 });
  const userPresence = useQuery('api.collaboration.getUserPresence', { sessionId });
  const sendMessage = useMutation('api.collaboration.sendChatMessage');

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing indicator
  useEffect(() => {
    if (message.trim()) {
      setIsTyping(true);
      const timeout = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timeout);
    } else {
      setIsTyping(false);
    }
  }, [message]);

  const handleSendMessage = async () => {
    if (!message.trim() && !selectedFile) return;

    try {
      let messageType: 'text' | 'image' | 'file' = 'text';
      let metadata: any = {};

      if (selectedFile) {
        // Handle file upload
        if (selectedFile.type.startsWith('image/')) {
          messageType = 'image';
          // In a real app, you'd upload the file and get a URL
          metadata.imageUrl = URL.createObjectURL(selectedFile);
        } else {
          messageType = 'file';
          metadata.fileName = selectedFile.name;
          metadata.fileSize = selectedFile.size;
        }
      }

      await sendMessage({
        sessionId: sessionId as any,
        message: message.trim() || `[${messageType === 'image' ? 'Image' : 'File'}]`,
        type: messageType,
        ...(Object.keys(metadata).length > 0 && { metadata }),
      });

      setMessage('');
      setSelectedFile(null);
      setIsTyping(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const filteredMessages = messages?.filter(msg =>
    !searchQuery ||
    msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.userId.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (compact) {
    return (
      <motion.div
        className="glass-card p-4 rounded-xl h-96 flex flex-col"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-[#00F260]" />
            <span className="text-sm font-medium text-white">Team Chat</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-gray-400">{userPresence?.length || 0} online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-3">
          {filteredMessages.slice(-5).map((msg) => (
            <motion.div
              key={msg._id}
              className="text-xs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="text-gray-400">{msg.userId.slice(-4)}:</span>
              <span className="text-white ml-1">{msg.message}</span>
            </motion.div>
          ))}
        </div>

        {/* Input */}
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00F260]"
          />
          <button
            onClick={handleSendMessage}
            className="px-3 py-2 bg-[#00F260] rounded-lg text-white hover:scale-105 transition-transform"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="glass-card rounded-xl flex flex-col h-full max-h-[600px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Team Chat</h3>
              <p className="text-xs text-gray-400">
                {userPresence?.length || 0} participants online
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSearchQuery('')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Search className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {searchQuery !== undefined && (
            <motion.div
              className="mt-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00F260]"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Participants */}
      <div className="px-4 py-2 border-b border-white/10">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {userPresence?.slice(0, 8).map((presence) => (
            <motion.div
              key={presence.userId}
              className="flex items-center space-x-2 bg-white/5 rounded-lg px-3 py-1 flex-shrink-0"
              whileHover={{ scale: 1.05 }}
            >
              <div className="relative">
                <div className="w-6 h-6 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {presence.userId.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${getStatusColor(presence.status)}`} />
              </div>
              <span className="text-xs text-gray-300">
                {presence.userId.slice(-4)}
              </span>
            </motion.div>
          ))}
          {userPresence && userPresence.length > 8 && (
            <div className="text-xs text-gray-400 px-2">
              +{userPresence.length - 8} more
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {filteredMessages.map((msg, index) => (
            <motion.div
              key={msg._id}
              className={`flex ${msg.userId === currentUserId ? 'justify-end' : 'justify-start'}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.userId === currentUserId
                  ? 'bg-[#00F260] text-white'
                  : 'bg-white/10 text-white'
              }`}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs opacity-75">
                    {msg.userId === currentUserId ? 'You' : msg.userId.slice(-4)}
                  </span>
                  <span className="text-xs opacity-50">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                {msg.type === 'text' && (
                  <p className="text-sm">{msg.message}</p>
                )}

                {msg.type === 'image' && msg.metadata?.imageUrl && (
                  <div>
                    <img
                      src={msg.metadata.imageUrl}
                      alt="Shared image"
                      className="rounded-lg max-w-full h-auto"
                    />
                    {msg.message && <p className="text-sm mt-2">{msg.message}</p>}
                  </div>
                )}

                {msg.type === 'file' && msg.metadata?.fileName && (
                  <div className="flex items-center space-x-2">
                    <File className="w-4 h-4" />
                    <span className="text-sm">{msg.metadata.fileName}</span>
                    {msg.metadata.fileSize && (
                      <span className="text-xs opacity-50">
                        ({(msg.metadata.fileSize / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              className="flex justify-start"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-white/10 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span className="text-xs text-gray-400">Someone is typing...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            className="px-4 py-2 border-t border-white/10"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                {selectedFile.type.startsWith('image/') ? (
                  <Image className="w-5 h-5 text-[#00F260]" />
                ) : (
                  <File className="w-5 h-5 text-[#00F260]" />
                )}
                <div>
                  <p className="text-sm text-white">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-1 hover:bg-red-500/20 rounded"
              >
                <X className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00F260] resize-none"
            />

            {/* Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white/10 rounded"
            >
              <Paperclip className="w-4 h-4 text-gray-400" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
          </div>

          {/* Voice Recording Button */}
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`p-3 rounded-lg transition-colors ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() && !selectedFile}
            className="px-4 py-3 bg-[#00F260] rounded-lg text-white hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Message Actions */}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            <span>Press Enter to send</span>
            <span>Shift + Enter for new line</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 hover:bg-white/10 rounded"
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}