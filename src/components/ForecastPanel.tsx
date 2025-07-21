import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from "recharts";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface ForecastPanelProps {
  zoneId: string | null;
}

export function ForecastPanel({ zoneId }: ForecastPanelProps) {
  const zone = useQuery(api.aqi.getZoneById, zoneId ? { zoneId } : "skip");
  const forecasts = useQuery(api.aqi.getForecast, zoneId ? { zoneId } : "skip");
  const generateForecast = useAction(api.aqi.generateAIForecast);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateForecast = async () => {
    if (!zoneId) return;
    
    setIsGenerating(true);
    try {
      await generateForecast({ zoneId });
    } catch (error) {
      console.error("Failed to generate forecast:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return "#00F260";
    if (aqi <= 100) return "#A8E063";
    if (aqi <= 150) return "#FF8C00";
    if (aqi <= 200) return "#FF512F";
    return "#DD2476";
  };

  const formatChartData = () => {
    if (!forecasts || forecasts.length === 0) return [];
    
    return forecasts.map((forecast, index) => ({
      hour: new Date(forecast.timestamp).getHours(),
      time: new Date(forecast.timestamp).toLocaleTimeString('en-US', { 
        hour: 'numeric',
        hour12: true 
      }),
      aqi: forecast.predictedAqi,
      confidence: Math.round(forecast.confidence * 100),
      color: getAQIColor(forecast.predictedAqi)
    }));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-3 text-white">
          <p className="font-semibold">{`Time: ${data.time}`}</p>
          <p className="text-sm">
            <span style={{ color: data.color }}>AQI: {data.aqi}</span>
          </p>
          <p className="text-xs text-gray-300">Confidence: {data.confidence}%</p>
        </div>
      );
    }
    return null;
  };

  if (!zoneId) {
    return (
      <div className="text-center py-8">
        <motion.div
          className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#00F260] to-[#0575E6] flex items-center justify-center opacity-50"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        >
          <span className="text-white font-bold">🔮</span>
        </motion.div>
        <h3 className="text-lg font-semibold mb-2">AI Forecast</h3>
        <p className="text-gray-400 text-sm">
          Select a zone to view 24-hour AI-powered AQI predictions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">24-Hour AI Forecast</h3>
          <p className="text-sm text-gray-400">
            {zone?.name} • LSTM Model v1.2
          </p>
        </div>
        <motion.button
          className="px-4 py-2 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-lg text-white text-sm font-medium disabled:opacity-50"
          onClick={handleGenerateForecast}
          disabled={isGenerating}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isGenerating ? (
            <div className="flex items-center space-x-2">
              <motion.div
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span>Generating...</span>
            </div>
          ) : (
            "🤖 Generate"
          )}
        </motion.button>
      </div>

      {forecasts && forecasts.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formatChartData()}>
                <defs>
                  <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F260" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0575E6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="aqi"
                  stroke="#00F260"
                  strokeWidth={2}
                  fill="url(#aqiGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Forecast Summary */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Peak AQI</div>
              <div className="text-lg font-bold" style={{ color: getAQIColor(Math.max(...forecasts.map(f => f.predictedAqi))) }}>
                {Math.max(...forecasts.map(f => f.predictedAqi))}
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Average</div>
              <div className="text-lg font-bold text-gray-300">
                {Math.round(forecasts.reduce((sum, f) => sum + f.predictedAqi, 0) / forecasts.length)}
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Confidence</div>
              <div className="text-lg font-bold text-green-400">
                {Math.round(forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length * 100)}%
              </div>
            </div>
          </div>

          {/* AI Model Info */}
          <div className="mt-4 p-3 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Model: LSTM Neural Network</span>
              <span className="text-green-400">✓ Trained on 2+ years data</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-gray-400">Features: Weather, Traffic, Historical</span>
              <span className="text-blue-400">🛰️ Satellite validated</span>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="text-center py-8">
          <motion.div
            className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#FF8C00] to-[#FF6B35] flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-white">📊</span>
          </motion.div>
          <p className="text-gray-400 text-sm mb-4">
            No forecast data available for this zone
          </p>
          <motion.button
            className="px-4 py-2 bg-gradient-to-r from-[#00F260] to-[#0575E6] rounded-lg text-white text-sm font-medium"
            onClick={handleGenerateForecast}
            disabled={isGenerating}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Generate AI Forecast
          </motion.button>
        </div>
      )}
    </div>
  );
}
