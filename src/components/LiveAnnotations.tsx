import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Plus,
  Edit3,
  Trash2,
  MessageCircle,
  AlertTriangle,
  Factory,
  Car,
  Cloud,
  Wind,
  Eye,
  EyeOff,
  Layers,
  Settings,
  X
} from 'lucide-react';

interface Annotation {
  id: string;
  userId: string;
  zoneId: string;
  type: 'marker' | 'note' | 'alert' | 'pollution_source';
  content: string;
  position: { lat: number; lng: number };
  timestamp: number;
  color?: string;
  metadata?: {
    pollutionType?: 'industrial' | 'traffic' | 'construction' | 'natural';
    severity?: 'low' | 'medium' | 'high' | 'critical';
    radius?: number;
    category?: string;
  };
}

interface LiveAnnotationsProps {
  sessionId: string;
  currentUserId: string;
  onAnnotationSelect?: (annotation: Annotation) => void;
  className?: string;
}

const POLLUTION_TYPES = {
  industrial: { icon: Factory, color: '#FF6B35', label: 'Industrial' },
  traffic: { icon: Car, color: '#FF8C00', label: 'Traffic' },
  construction: { icon: AlertTriangle, color: '#FF512F', label: 'Construction' },
  natural: { icon: Cloud, color: '#A8E063', label: 'Natural' },
};

const SEVERITY_LEVELS = {
  low: { color: '#A8E063', bgColor: '#A8E06320' },
  medium: { color: '#F9D423', bgColor: '#F9D42320' },
  high: { color: '#FF8C00', bgColor: '#FF8C0020' },
  critical: { color: '#FF512F', bgColor: '#FF512F20' },
};

export function LiveAnnotations({
  sessionId,
  currentUserId,
  onAnnotationSelect,
  className = ''
}: LiveAnnotationsProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState<Partial<Annotation>>({
    type: 'marker',
    content: '',
    position: { lat: 0, lng: 0 },
  });
  const [showLayers, setShowLayers] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock API queries and mutations
  const convexAnnotations = useQuery('api.collaboration.getAnnotations', {
    sessionId
  });
  const addAnnotationMutation = useMutation('api.collaboration.addAnnotation');

  // Sync with Convex data
  useEffect(() => {
    if (convexAnnotations) {
      const formattedAnnotations: Annotation[] = convexAnnotations.map(ann => ({
        id: ann._id,
        userId: ann.userId,
        zoneId: ann.zoneId,
        type: ann.type as 'marker' | 'note' | 'alert' | 'pollution_source',
        content: ann.content,
        position: ann.position,
        timestamp: ann.timestamp,
      }));
      setAnnotations(formattedAnnotations);
    }
  }, [convexAnnotations]);

  const handleAddAnnotation = async (position: { lat: number; lng: number }) => {
    if (!newAnnotation.content?.trim()) return;

    try {
      const annotationData = {
        sessionId: sessionId as any,
        zoneId: 'current', // Would be determined by map position
        type: newAnnotation.type!,
        content: newAnnotation.content,
        position,
        metadata: newAnnotation.metadata,
      };

      await addAnnotationMutation(annotationData);

      setNewAnnotation({
        type: 'marker',
        content: '',
        position: { lat: 0, lng: 0 },
      });
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to add annotation:', error);
    }
  };

  const handleDeleteAnnotation = (annotationId: string) => {
    // In a real implementation, this would call a mutation
    setAnnotations(annotations.filter(ann => ann.id !== annotationId));
    if (selectedAnnotation?.id === annotationId) {
      setSelectedAnnotation(null);
    }
  };

  const getAnnotationIcon = (annotation: Annotation) => {
    if (annotation.type === 'pollution_source' && annotation.metadata?.pollutionType) {
      const pollutionType = POLLUTION_TYPES[annotation.metadata.pollutionType as keyof typeof POLLUTION_TYPES];
      const Icon = pollutionType.icon;
      return <Icon className="w-5 h-5" style={{ color: pollutionType.color }} />;
    }

    switch (annotation.type) {
      case 'marker':
        return <MapPin className="w-5 h-5 text-blue-400" />;
      case 'note':
        return <MessageCircle className="w-5 h-5 text-green-400" />;
      case 'alert':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <MapPin className="w-5 h-5 text-gray-400" />;
    }
  };

  const getAnnotationColor = (annotation: Annotation) => {
    if (annotation.type === 'pollution_source' && annotation.metadata?.severity) {
      return SEVERITY_LEVELS[annotation.metadata.severity as keyof typeof SEVERITY_LEVELS].color;
    }
    return annotation.color || '#00F260';
  };

  const filteredAnnotations = annotations.filter(ann => {
    const matchesType = filterType === 'all' || ann.type === filterType;
    const matchesSearch = !searchQuery ||
      ann.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.userId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-lg flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Live Annotations</h3>
            <p className="text-xs text-gray-400">{filteredAnnotations.length} annotations</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowLayers(!showLayers)}
            className={`p-2 rounded-lg transition-colors ${
              showLayers ? 'bg-[#00F260] text-white' : 'bg-white/10 text-gray-400'
            }`}
          >
            {showLayers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsCreating(!isCreating)}
            className={`p-2 rounded-lg transition-colors ${
              isCreating ? 'bg-[#00F260] text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="flex items-center space-x-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00F260]"
        >
          <option value="all">All Types</option>
          <option value="marker">Markers</option>
          <option value="note">Notes</option>
          <option value="alert">Alerts</option>
          <option value="pollution_source">Pollution Sources</option>
        </select>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search annotations..."
          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00F260]"
        />
      </motion.div>

      {/* Create Annotation Form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            className="glass-card p-4 rounded-xl"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h4 className="font-semibold text-white mb-3">Add Annotation</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={newAnnotation.type}
                  onChange={(e) => setNewAnnotation({
                    ...newAnnotation,
                    type: e.target.value as Annotation['type']
                  })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00F260]"
                >
                  <option value="marker">Marker</option>
                  <option value="note">Note</option>
                  <option value="alert">Alert</option>
                  <option value="pollution_source">Pollution Source</option>
                </select>
              </div>

              {newAnnotation.type === 'pollution_source' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Pollution Type
                    </label>
                    <select
                      value={newAnnotation.metadata?.pollutionType || ''}
                      onChange={(e) => setNewAnnotation({
                        ...newAnnotation,
                        metadata: {
                          ...newAnnotation.metadata,
                          pollutionType: e.target.value as any
                        }
                      })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00F260]"
                    >
                      <option value="">Select type</option>
                      {Object.entries(POLLUTION_TYPES).map(([key, type]) => (
                        <option key={key} value={key}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Severity
                    </label>
                    <select
                      value={newAnnotation.metadata?.severity || ''}
                      onChange={(e) => setNewAnnotation({
                        ...newAnnotation,
                        metadata: {
                          ...newAnnotation.metadata,
                          severity: e.target.value as any
                        }
                      })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00F260]"
                    >
                      <option value="">Select severity</option>
                      {Object.entries(SEVERITY_LEVELS).map(([key, level]) => (
                        <option key={key} value={key}>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Content
                </label>
                <textarea
                  value={newAnnotation.content}
                  onChange={(e) => setNewAnnotation({
                    ...newAnnotation,
                    content: e.target.value
                  })}
                  placeholder="Enter annotation content..."
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00F260] resize-none"
                  rows={3}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleAddAnnotation({ lat: 26.8467, lng: 80.9462 })} // Default position
                  className="flex-1 px-4 py-2 bg-[#00F260] rounded-lg text-white font-medium hover:scale-105 transition-transform"
                >
                  Add Annotation
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Annotations List */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <AnimatePresence>
          {filteredAnnotations.map((annotation, index) => (
            <motion.div
              key={annotation.id}
              className="glass-card p-4 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => {
                setSelectedAnnotation(annotation);
                onAnnotationSelect?.(annotation);
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getAnnotationIcon(annotation)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-white">
                        {annotation.userId.slice(-4)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(annotation.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-sm text-gray-300 mb-2">
                      {annotation.content}
                    </p>

                    {annotation.type === 'pollution_source' && annotation.metadata && (
                      <div className="flex items-center space-x-2">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: SEVERITY_LEVELS[annotation.metadata.severity as keyof typeof SEVERITY_LEVELS]?.bgColor,
                            color: SEVERITY_LEVELS[annotation.metadata.severity as keyof typeof SEVERITY_LEVELS]?.color,
                          }}
                        >
                          {annotation.metadata.severity?.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400">
                          {POLLUTION_TYPES[annotation.metadata.pollutionType as keyof typeof POLLUTION_TYPES]?.label}
                        </span>
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      {annotation.position.lat.toFixed(4)}, {annotation.position.lng.toFixed(4)}
                    </div>
                  </div>
                </div>

                {annotation.userId === currentUserId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAnnotation(annotation.id);
                    }}
                    className="p-1 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredAnnotations.length === 0 && (
          <motion.div
            className="text-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-400">
              {searchQuery ? 'No annotations match your search' : 'No annotations yet'}
            </p>
            {!isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                className="mt-3 px-4 py-2 bg-[#00F260] rounded-lg text-white text-sm font-medium hover:scale-105 transition-transform"
              >
                Add First Annotation
              </button>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Annotation Detail Modal */}
      <AnimatePresence>
        {selectedAnnotation && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAnnotation(null)}
          >
            <motion.div
              className="glass-card p-6 rounded-xl w-full max-w-md"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getAnnotationIcon(selectedAnnotation)}
                  <div>
                    <h3 className="font-semibold text-white">
                      {selectedAnnotation.type === 'pollution_source' ? 'Pollution Source' : 'Annotation'}
                    </h3>
                    <p className="text-xs text-gray-400">
                      by {selectedAnnotation.userId.slice(-4)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAnnotation(null)}
                  className="p-2 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-gray-300">{selectedAnnotation.content}</p>

                {selectedAnnotation.type === 'pollution_source' && selectedAnnotation.metadata && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-400">Type</span>
                      <p className="text-sm text-white">
                        {POLLUTION_TYPES[selectedAnnotation.metadata.pollutionType as keyof typeof POLLUTION_TYPES]?.label}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Severity</span>
                      <p className="text-sm text-white capitalize">
                        {selectedAnnotation.metadata.severity}
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-white/10">
                  <div className="text-xs text-gray-500">
                    Location: {selectedAnnotation.position.lat.toFixed(4)}, {selectedAnnotation.position.lng.toFixed(4)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(selectedAnnotation.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}