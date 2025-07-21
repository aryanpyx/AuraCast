import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Zone {
  _id: string;
  zoneId: string;
  name: string;
  latitude: number;
  longitude: number;
  currentAqi: number;
  aqiCategory: string;
  lastUpdated: number;
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

interface AQIMapProps {
  onZoneSelect: (zoneId: string) => void;
}

export function AQIMap({ onZoneSelect }: AQIMapProps) {
  const zones = useQuery(api.aqi.getAllZones) as Zone[] | undefined;
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return "from-[#00F260] to-[#0575E6]";
    if (aqi <= 100) return "from-[#A8E063] to-[#F9D423]";
    if (aqi <= 150) return "from-[#FF8C00] to-[#FF6B35]";
    if (aqi <= 200) return "from-[#FF512F] to-[#DD2476]";
    return "from-[#DD2476] to-[#4A00E0]";
  };

  const getAQIIntensity = (aqi: number) => {
    if (aqi <= 50) return 0.7;
    if (aqi <= 100) return 0.8;
    if (aqi <= 200) return 0.9;
    return 1.0;
  };

  const getWindDirection = (degrees: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(degrees / 45) % 8];
  };

  const handleZoneClick = (zone: Zone) => {
    setSelectedZone(zone.zoneId);
    onZoneSelect(zone.zoneId);
    
    // Haptic feedback simulation
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }
  };

  if (!zones) {
    return (
      <div className="h-96 flex items-center justify-center">
        <motion.div
          className="w-8 h-8 border-2 border-[#00F260] border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="relative h-96 bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-xl overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <motion.div 
          className="w-full h-full bg-gradient-to-br from-blue-900/20 to-purple-900/20"
          animate={{ 
            background: [
              "linear-gradient(to bottom right, rgba(30, 58, 138, 0.2), rgba(88, 28, 135, 0.2))",
              "linear-gradient(to bottom right, rgba(30, 58, 138, 0.3), rgba(88, 28, 135, 0.3))",
              "linear-gradient(to bottom right, rgba(30, 58, 138, 0.2), rgba(88, 28, 135, 0.2))"
            ]
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        
        {/* Animated Grid */}
        <div className="absolute inset-0">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={`h-${i}`}
              className="absolute w-full h-px bg-white/5"
              style={{ top: `${i * 8.33}%` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.1, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={`v-${i}`}
              className="absolute h-full w-px bg-white/5"
              style={{ left: `${i * 8.33}%` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.1, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>
      </div>

      {/* Zone Markers */}
      {zones.map((zone, index) => (
        <motion.div
          key={zone.zoneId}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10`}
          style={{
            left: `${15 + (index % 4) * 20}%`,
            top: `${20 + Math.floor(index / 4) * 25}%`,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            delay: index * 0.1,
            type: "spring",
            stiffness: 300,
            damping: 20
          }}
          whileHover={{ scale: 1.1, z: 20 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleZoneClick(zone)}
          onHoverStart={() => setHoveredZone(zone.zoneId)}
          onHoverEnd={() => setHoveredZone(null)}
        >
          {/* Zone Circle */}
          <motion.div
            className={`w-16 h-16 rounded-full bg-gradient-to-r ${getAQIColor(zone.currentAqi)} 
                       flex items-center justify-center shadow-lg transition-all duration-300
                       ${selectedZone === zone.zoneId ? 'ring-4 ring-white/50' : ''}
                       ${hoveredZone === zone.zoneId ? 'ring-2 ring-white/30' : ''}`}
            style={{ opacity: getAQIIntensity(zone.currentAqi) }}
            whileHover={{ boxShadow: "0 0 30px rgba(255, 255, 255, 0.3)" }}
          >
            <div className="text-white font-bold text-sm">{zone.currentAqi}</div>
          </motion.div>
          
          {/* Zone Label */}
          <AnimatePresence>
            {(hoveredZone === zone.zoneId || selectedZone === zone.zoneId) && (
              <motion.div 
                className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-20"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-white border border-white/20">
                  <div className="font-semibold">{zone.name}</div>
                  <div className="text-gray-300 mt-1">
                    {zone.aqiCategory} • {zone.weatherData.temperature}°C
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    Wind: {getWindDirection(zone.weatherData.windDirection)} {zone.weatherData.windSpeed}km/h
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pulsing Effect for High AQI */}
          {zone.currentAqi > 150 && (
            <motion.div
              className={`absolute inset-0 rounded-full bg-gradient-to-r ${getAQIColor(zone.currentAqi)}`}
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.3, 0, 0.3]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}

          {/* Wind Direction Indicator */}
          <motion.div
            className="absolute -top-2 -right-2 w-4 h-4 bg-white/20 rounded-full flex items-center justify-center"
            style={{
              transform: `rotate(${zone.weatherData.windDirection}deg)`
            }}
            animate={{ rotate: zone.weatherData.windDirection }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </motion.div>
        </motion.div>
      ))}

      {/* Legend */}
      <motion.div 
        className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-white/10"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1 }}
      >
        <div className="text-xs font-semibold mb-2 text-white">AQI Scale</div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#00F260] to-[#0575E6]"></div>
            <span className="text-xs text-gray-300">0-50 Good</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#A8E063] to-[#F9D423]"></div>
            <span className="text-xs text-gray-300">51-100 Moderate</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#FF8C00] to-[#FF6B35]"></div>
            <span className="text-xs text-gray-300">101-150 USG</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#FF512F] to-[#DD2476]"></div>
            <span className="text-xs text-gray-300">151-200 Unhealthy</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#DD2476] to-[#4A00E0]"></div>
            <span className="text-xs text-gray-300">201+ Hazardous</span>
          </div>
        </div>
      </motion.div>

      {/* Real-time Indicator */}
      <motion.div 
        className="absolute top-4 right-4 flex items-center space-x-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2 }}
      >
        <motion.div 
          className="w-2 h-2 bg-green-400 rounded-full"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span className="text-xs text-green-400 font-medium">Live Data</span>
      </motion.div>
    </div>
  );
}
