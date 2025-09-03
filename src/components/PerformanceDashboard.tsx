import React, { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Target,
  RefreshCw
} from 'lucide-react';

interface PerformanceMetrics {
  timestamp: number;
  predictionAccuracy: number;
  modelLatency: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  errorRate: number;
  throughput: number;
}

interface ModelPerformance {
  modelName: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  latency: number;
  lastUpdated: number;
}

interface PerformanceDashboardProps {
  sessionId?: string;
  compact?: boolean;
}

export function PerformanceDashboard({ sessionId, compact = false }: PerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data generation (in real app, this would come from Convex)
  useEffect(() => {
    const generateMockData = () => {
      const now = Date.now();
      const mockMetrics: PerformanceMetrics[] = [];

      for (let i = 0; i < 24; i++) {
        mockMetrics.push({
          timestamp: now - (23 - i) * 60 * 60 * 1000,
          predictionAccuracy: 0.75 + Math.random() * 0.2,
          modelLatency: 50 + Math.random() * 100,
          memoryUsage: 60 + Math.random() * 20,
          cpuUsage: 40 + Math.random() * 30,
          networkLatency: 20 + Math.random() * 30,
          errorRate: Math.random() * 0.05,
          throughput: 100 + Math.random() * 50,
        });
      }

      setMetrics(mockMetrics);

      const mockModels: ModelPerformance[] = [
        {
          modelName: 'LSTM Ensemble',
          accuracy: 0.87,
          precision: 0.85,
          recall: 0.89,
          f1Score: 0.87,
          latency: 45,
          lastUpdated: now,
        },
        {
          modelName: 'Transformer',
          accuracy: 0.82,
          precision: 0.88,
          recall: 0.78,
          f1Score: 0.83,
          latency: 67,
          lastUpdated: now - 30 * 60 * 1000,
        },
        {
          modelName: 'CNN',
          accuracy: 0.79,
          precision: 0.81,
          recall: 0.76,
          f1Score: 0.78,
          latency: 38,
          lastUpdated: now - 60 * 60 * 1000,
        },
      ];

      setModelPerformance(mockModels);
    };

    generateMockData();
    const interval = setInterval(generateMockData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const getLatestMetrics = () => metrics[metrics.length - 1] || null;

  const getAverageAccuracy = () => {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.predictionAccuracy, 0);
    return sum / metrics.length;
  };

  const getAccuracyTrend = () => {
    if (metrics.length < 2) return 0;
    const recent = metrics.slice(-5);
    const older = metrics.slice(-10, -5);

    const recentAvg = recent.reduce((acc, m) => acc + m.predictionAccuracy, 0) / recent.length;
    const olderAvg = older.reduce((acc, m) => acc + m.predictionAccuracy, 0) / older.length;

    return recentAvg - olderAvg;
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-400';
    if (value >= thresholds.warning) return 'text-yellow-400';
    return 'text-red-400';
  };

  const latestMetrics = getLatestMetrics();
  const avgAccuracy = getAverageAccuracy();
  const accuracyTrend = getAccuracyTrend();

  if (compact) {
    return (
      <motion.div
        className="glass-card p-4 rounded-xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-[#00F260]" />
            <span className="text-sm font-medium text-white">Performance</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1 hover:bg-white/10 rounded disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-white">
              {formatPercentage(avgAccuracy)}
            </div>
            <div className="text-xs text-gray-400">Avg Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">
              {latestMetrics ? formatLatency(latestMetrics.modelLatency) : '--'}
            </div>
            <div className="text-xs text-gray-400">Latency</div>
          </div>
        </div>
      </motion.div>
    );
  }

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
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Performance Dashboard</h3>
            <p className="text-xs text-gray-400">ML model accuracy and system metrics</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00F260]"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Prediction Accuracy */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-blue-400" />
            <div className="flex items-center space-x-1">
              {accuracyTrend > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <span className={`text-xs ${accuracyTrend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {Math.abs(accuracyTrend * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatPercentage(avgAccuracy)}
          </div>
          <div className="text-xs text-gray-400">Prediction Accuracy</div>
        </div>

        {/* Model Latency */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <div className={`text-xs ${getStatusColor(
              latestMetrics?.modelLatency || 0,
              { good: 100, warning: 200 }
            )}`}>
              {latestMetrics ? formatLatency(latestMetrics.modelLatency) : '--'}
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {latestMetrics ? formatLatency(latestMetrics.modelLatency) : '--'}
          </div>
          <div className="text-xs text-gray-400">Model Latency</div>
        </div>

        {/* CPU Usage */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <div className={`text-xs ${getStatusColor(
              latestMetrics?.cpuUsage || 0,
              { good: 70, warning: 85 }
            )}`}>
              {latestMetrics ? formatPercentage(latestMetrics.cpuUsage / 100) : '--'}
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {latestMetrics ? Math.round(latestMetrics.cpuUsage) : '--'}%
          </div>
          <div className="text-xs text-gray-400">CPU Usage</div>
        </div>

        {/* Memory Usage */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <HardDrive className="w-5 h-5 text-green-400" />
            <div className={`text-xs ${getStatusColor(
              latestMetrics?.memoryUsage || 0,
              { good: 70, warning: 85 }
            )}`}>
              {latestMetrics ? formatPercentage(latestMetrics.memoryUsage / 100) : '--'}
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {latestMetrics ? Math.round(latestMetrics.memoryUsage) : '--'}%
          </div>
          <div className="text-xs text-gray-400">Memory Usage</div>
        </div>
      </motion.div>

      {/* Model Performance Table */}
      <motion.div
        className="glass-card p-6 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h4 className="font-semibold text-white mb-4">Model Performance</h4>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 text-gray-400">Model</th>
                <th className="text-center py-2 text-gray-400">Accuracy</th>
                <th className="text-center py-2 text-gray-400">Precision</th>
                <th className="text-center py-2 text-gray-400">Recall</th>
                <th className="text-center py-2 text-gray-400">F1 Score</th>
                <th className="text-center py-2 text-gray-400">Latency</th>
                <th className="text-center py-2 text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {modelPerformance.map((model, index) => (
                <motion.tr
                  key={model.modelName}
                  className="border-b border-white/5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <td className="py-3 text-white font-medium">{model.modelName}</td>
                  <td className="py-3 text-center">
                    <span className={`font-medium ${getStatusColor(model.accuracy, { good: 0.8, warning: 0.7 })}`}>
                      {formatPercentage(model.accuracy)}
                    </span>
                  </td>
                  <td className="py-3 text-center text-gray-300">
                    {formatPercentage(model.precision)}
                  </td>
                  <td className="py-3 text-center text-gray-300">
                    {formatPercentage(model.recall)}
                  </td>
                  <td className="py-3 text-center text-gray-300">
                    {formatPercentage(model.f1Score)}
                  </td>
                  <td className="py-3 text-center text-gray-300">
                    {formatLatency(model.latency)}
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* System Health */}
      <motion.div
        className="glass-card p-6 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h4 className="font-semibold text-white mb-4">System Health</h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Network Status */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Wifi className={`w-6 h-6 ${getStatusColor(
                latestMetrics?.networkLatency || 0,
                { good: 50, warning: 100 }
              )}`} />
            </div>
            <div className="text-lg font-bold text-white mb-1">
              {latestMetrics ? formatLatency(latestMetrics.networkLatency) : '--'}
            </div>
            <div className="text-xs text-gray-400">Network Latency</div>
          </div>

          {/* Error Rate */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              {latestMetrics && latestMetrics.errorRate < 0.01 ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-400" />
              )}
            </div>
            <div className="text-lg font-bold text-white mb-1">
              {latestMetrics ? formatPercentage(latestMetrics.errorRate) : '--'}
            </div>
            <div className="text-xs text-gray-400">Error Rate</div>
          </div>

          {/* Throughput */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-white mb-1">
              {latestMetrics ? Math.round(latestMetrics.throughput) : '--'}
            </div>
            <div className="text-xs text-gray-400">Predictions/min</div>
          </div>
        </div>
      </motion.div>

      {/* Performance Trends Chart */}
      <motion.div
        className="glass-card p-6 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h4 className="font-semibold text-white mb-4">Performance Trends</h4>

        <div className="h-64 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-3" />
            <p>Interactive performance charts would be displayed here</p>
            <p className="text-xs mt-1">Integration with charting library needed</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}