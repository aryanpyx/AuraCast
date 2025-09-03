import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';
import { getPredictionEngine, MLPredictionWorker } from '../lib/EnsemblePredictionEngine';
import { getWeatherService } from '../lib/WeatherService';
import { useCollaborative } from '../lib/CollaborativeContext';

interface Zone {
  _id: string;
  zoneId: string;
  name: string;
  currentAqi: number;
  pollutants: {
    pm25: number;
    pm10: number;
    no2: number;
    so2: number;
    o3: number;
    co: number;
  };
  weatherData: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
  };
}

interface PredictionResult {
  predictedAqi: number;
  confidence: number;
  uncertainty: number;
  modelPredictions: {
    lstm: number;
    transformer: number;
    cnn: number;
    ensemble: number;
  };
  confidenceInterval: [number, number];
}

interface MLPredictionEngineProps {
  zoneId?: string;
  onPredictionUpdate?: (predictions: PredictionResult[]) => void;
}

export function MLPredictionEngine({ zoneId, onPredictionUpdate }: MLPredictionEngineProps) {
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'ensemble' | 'lstm' | 'transformer' | 'cnn'>('ensemble');
  const [timeRange, setTimeRange] = useState(24);
  const [showDetails, setShowDetails] = useState(false);
  const workerRef = useRef<MLPredictionWorker | null>(null);

  const { state: collabState } = useCollaborative();
  const zone = useQuery(api.aqi.getZoneById, zoneId ? { zoneId } : 'skip') as Zone | undefined;

  // Initialize ML worker
  useEffect(() => {
    const initWorker = async () => {
      try {
        workerRef.current = new MLPredictionWorker();
        await workerRef.current.initialize();
      } catch (error) {
        console.error('Failed to initialize ML worker:', error);
      }
    };

    initWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current.dispose();
      }
    };
  }, []);

  // Generate predictions when zone changes
  useEffect(() => {
    if (zone && workerRef.current) {
      generatePredictions();
    }
  }, [zone, timeRange]);

  const generatePredictions = async () => {
    if (!zone || !workerRef.current) return;

    setIsLoading(true);
    try {
      const weatherService = getWeatherService();

      // Get weather data for enhanced predictions
      const weatherData = await weatherService.getCurrentWeather(
        26.8467, // Lucknow latitude (should come from zone data)
        80.9462  // Lucknow longitude
      );

      // Prepare input for ML model
      const input = {
        currentAqi: zone.currentAqi,
        pollutants: zone.pollutants,
        weatherData: {
          temperature: weatherData.temperature,
          humidity: weatherData.humidity,
          windSpeed: weatherData.windSpeed,
          windDirection: weatherData.windDirection,
        },
        historicalData: [], // Would be populated with actual historical data
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
      };

      // Generate predictions for different time points
      const predictionPromises = [];
      for (let hour = 1; hour <= timeRange; hour++) {
        const hourInput = {
          ...input,
          timeOfDay: (input.timeOfDay + hour) % 24,
          dayOfWeek: new Date(Date.now() + hour * 60 * 60 * 1000).getDay(),
        };
        predictionPromises.push(workerRef.current.predict(hourInput));
      }

      const results = await Promise.all(predictionPromises);
      setPredictions(results);
      onPredictionUpdate?.(results);

    } catch (error) {
      console.error('Failed to generate predictions:', error);
      // Fallback predictions
      const fallbackPredictions = Array.from({ length: timeRange }, (_, i) => ({
        predictedAqi: zone.currentAqi + (Math.random() - 0.5) * 20,
        confidence: 0.5,
        uncertainty: 25,
        modelPredictions: {
          lstm: zone.currentAqi,
          transformer: zone.currentAqi,
          cnn: zone.currentAqi,
          ensemble: zone.currentAqi,
        },
        confidenceInterval: [zone.currentAqi - 25, zone.currentAqi + 25] as [number, number],
      }));
      setPredictions(fallbackPredictions);
    } finally {
      setIsLoading(false);
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-400";
    if (confidence >= 0.6) return "text-yellow-400";
    return "text-red-400";
  };

  if (!zone) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">Select a zone to view AI predictions</p>
        </motion.div>
      </div>
    );
  }

  const currentPrediction = predictions[0];
  const trend = predictions.length > 1 ?
    predictions[1].predictedAqi - predictions[0].predictedAqi : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Prediction Engine</h3>
            <p className="text-sm text-gray-400">Ensemble ML forecasting for {zone.name}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
          >
            <option value={6}>6 hours</option>
            <option value={12}>12 hours</option>
            <option value={24}>24 hours</option>
            <option value={48}>48 hours</option>
          </select>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </div>
      </motion.div>

      {/* Current Prediction Card */}
      <AnimatePresence>
        {currentPrediction && (
          <motion.div
            className="glass-card p-6 rounded-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getAQIColor(currentPrediction.predictedAqi)} flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">
                    {Math.round(currentPrediction.predictedAqi)}
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">Next Hour Prediction</h4>
                  <p className="text-sm text-gray-400">{getAQICategory(currentPrediction.predictedAqi)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className={`text-sm font-medium ${getConfidenceColor(currentPrediction.confidence)}`}>
                    {Math.round(currentPrediction.confidence * 100)}% confidence
                  </div>
                  <div className="text-xs text-gray-400">
                    ±{Math.round(currentPrediction.uncertainty)} uncertainty
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {trend > 5 && <TrendingUp className="w-4 h-4 text-red-400" />}
                  {trend < -5 && <TrendingUp className="w-4 h-4 text-green-400 rotate-180" />}
                  {Math.abs(trend) <= 5 && <div className="w-4 h-4 rounded-full bg-yellow-400" />}
                  <span className="text-sm text-gray-300">
                    {trend > 0 ? '+' : ''}{Math.round(trend)}
                  </span>
                </div>
              </div>
            </div>

            {/* Confidence Interval */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                <span>Confidence Interval (95%)</span>
                <span>
                  {Math.round(currentPrediction.confidenceInterval[0])} - {Math.round(currentPrediction.confidenceInterval[1])}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-[#00F260] to-[#0575E6] h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, ((currentPrediction.confidenceInterval[1] - currentPrediction.confidenceInterval[0]) / 200) * 100)}%`,
                    marginLeft: `${(currentPrediction.confidenceInterval[0] / 200) * 100}%`
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model Selection */}
      <motion.div
        className="flex space-x-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {[
          { key: 'ensemble', label: 'Ensemble', icon: Brain },
          { key: 'lstm', label: 'LSTM', icon: TrendingUp },
          { key: 'transformer', label: 'Transformer', icon: Zap },
          { key: 'cnn', label: 'CNN', icon: AlertTriangle },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSelectedModel(key as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedModel === key
                ? 'bg-gradient-to-r from-[#00F260] to-[#0575E6] text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </motion.div>

      {/* Prediction Chart */}
      <motion.div
        className="glass-card p-6 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h4 className="text-lg font-semibold text-white mb-4">Prediction Timeline</h4>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              className="w-8 h-8 border-2 border-[#00F260] border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {predictions.slice(0, 12).map((prediction, index) => {
              const hour = index + 1;
              const modelPrediction = prediction.modelPredictions[selectedModel];
              const isHighUncertainty = prediction.uncertainty > 30;

              return (
                <motion.div
                  key={hour}
                  className="flex items-center space-x-4 p-3 bg-white/5 rounded-lg"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">+{hour}h</span>
                  </div>

                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getAQIColor(modelPrediction)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white font-bold text-xs">
                        {Math.round(modelPrediction)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-300">
                        {getAQICategory(modelPrediction)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {Math.round(prediction.confidence * 100)}% confidence
                      </div>
                    </div>

                    {isHighUncertainty && (
                      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Detailed Analysis */}
      <AnimatePresence>
        {showDetails && currentPrediction && (
          <motion.div
            className="glass-card p-6 rounded-xl"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h4 className="text-lg font-semibold text-white mb-4">Model Analysis</h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(currentPrediction.modelPredictions).map(([model, prediction]) => (
                <div key={model} className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-sm text-gray-400 capitalize mb-1">{model}</div>
                  <div className="text-lg font-bold text-white">
                    {Math.round(prediction)}
                  </div>
                  <div className={`text-xs ${model === selectedModel ? 'text-[#00F260]' : 'text-gray-400'}`}>
                    {model === selectedModel ? 'Active' : 'Inactive'}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Ensemble Prediction:</span>
                  <span className="text-white ml-2 font-medium">
                    {Math.round(currentPrediction.predictedAqi)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Uncertainty:</span>
                  <span className="text-white ml-2 font-medium">
                    ±{Math.round(currentPrediction.uncertainty)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Confidence:</span>
                  <span className={`ml-2 font-medium ${getConfidenceColor(currentPrediction.confidence)}`}>
                    {Math.round(currentPrediction.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}