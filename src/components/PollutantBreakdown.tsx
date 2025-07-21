import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface PollutantBreakdownProps {
  zoneId: string;
}

export function PollutantBreakdown({ zoneId }: PollutantBreakdownProps) {
  const zone = useQuery(api.aqi.getZoneById, { zoneId });

  const pollutantInfo = {
    pm25: { name: "PM2.5", unit: "µg/m³", color: "#FF512F", safe: 25, description: "Fine particles" },
    pm10: { name: "PM10", unit: "µg/m³", color: "#DD2476", safe: 50, description: "Coarse particles" },
    no2: { name: "NO₂", unit: "µg/m³", color: "#4A00E0", safe: 40, description: "Nitrogen dioxide" },
    so2: { name: "SO₂", unit: "µg/m³", color: "#0575E6", safe: 20, description: "Sulfur dioxide" },
    o3: { name: "O₃", unit: "µg/m³", color: "#A8E063", safe: 100, description: "Ground-level ozone" },
    co: { name: "CO", unit: "mg/m³", color: "#F9D423", safe: 10, description: "Carbon monoxide" }
  };

  if (!zone) {
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

  const chartData = Object.entries(zone.pollutants).map(([key, value]) => ({
    name: pollutantInfo[key as keyof typeof pollutantInfo].name,
    value: value,
    safe: pollutantInfo[key as keyof typeof pollutantInfo].safe,
    color: pollutantInfo[key as keyof typeof pollutantInfo].color,
    unit: pollutantInfo[key as keyof typeof pollutantInfo].unit,
    description: pollutantInfo[key as keyof typeof pollutantInfo].description,
    ratio: value / pollutantInfo[key as keyof typeof pollutantInfo].safe
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-3 text-white">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm">{data.description}</p>
          <p className="text-sm">
            Current: <span style={{ color: data.color }}>{data.value} {data.unit}</span>
          </p>
          <p className="text-xs text-gray-300">Safe limit: {data.safe} {data.unit}</p>
          <p className="text-xs" style={{ color: data.ratio > 1 ? '#FF512F' : '#00F260' }}>
            {data.ratio > 1 ? `${(data.ratio * 100 - 100).toFixed(0)}% above safe limit` : 'Within safe limits'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold">Pollutant Analysis</h3>
          <p className="text-sm text-gray-400">{zone.name} • Real-time breakdown</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: zone.currentAqi > 100 ? '#FF512F' : '#00F260' }}>
            {zone.currentAqi}
          </div>
          <div className="text-xs text-gray-400">Overall AQI</div>
        </div>
      </div>

      {/* Chart */}
      <motion.div
        className="h-64 bg-white/5 rounded-lg p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="name" 
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
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(zone.pollutants).map(([key, value], index) => {
          const info = pollutantInfo[key as keyof typeof pollutantInfo];
          const ratio = value / info.safe;
          const isHigh = ratio > 1;
          
          return (
            <motion.div
              key={key}
              className="bg-white/5 rounded-lg p-4 border border-white/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, borderColor: info.color }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{info.name}</span>
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: info.color }}
                />
              </div>
              
              <div className="mb-2">
                <span className="text-lg font-bold" style={{ color: info.color }}>
                  {value}
                </span>
                <span className="text-xs text-gray-400 ml-1">{info.unit}</span>
              </div>
              
              <div className="text-xs text-gray-400 mb-2">{info.description}</div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <motion.div
                  className="h-2 rounded-full"
                  style={{ 
                    backgroundColor: isHigh ? '#FF512F' : info.color,
                    width: `${Math.min(ratio * 100, 100)}%`
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(ratio * 100, 100)}%` }}
                  transition={{ delay: index * 0.1 + 0.5, duration: 0.8 }}
                />
              </div>
              
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Safe: {info.safe}</span>
                <span className={isHigh ? 'text-red-400' : 'text-green-400'}>
                  {isHigh ? `+${((ratio - 1) * 100).toFixed(0)}%` : '✓ Safe'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Weather Context */}
      <motion.div
        className="bg-white/5 rounded-lg p-4 border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <h4 className="text-sm font-semibold mb-3 text-white">Weather Context</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-400">{zone.weatherData.temperature}°C</div>
            <div className="text-xs text-gray-400">Temperature</div>
          </div>
          <div>
            <div className="text-lg font-bold text-cyan-400">{zone.weatherData.humidity}%</div>
            <div className="text-xs text-gray-400">Humidity</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-400">{zone.weatherData.windSpeed} km/h</div>
            <div className="text-xs text-gray-400">Wind Speed</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-400">{zone.weatherData.windDirection}°</div>
            <div className="text-xs text-gray-400">Wind Direction</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
