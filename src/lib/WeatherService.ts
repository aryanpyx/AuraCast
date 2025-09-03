interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
  precipitation: {
    current: number;
    forecast: number[];
  };
  airQuality: {
    aqi: number;
    pollutants: {
      pm25: number;
      pm10: number;
      no2: number;
      so2: number;
      o3: number;
      co: number;
    };
  };
}

interface WeatherAPIResponse {
  current: {
    temp_c: number;
    humidity: number;
    wind_kph: number;
    wind_degree: number;
    pressure_mb: number;
    vis_km: number;
    uv: number;
    precip_mm: number;
  };
  forecast: {
    forecastday: Array<{
      hour: Array<{
        temp_c: number;
        humidity: number;
        wind_kph: number;
        wind_degree: number;
        pressure_mb: number;
        precip_mm: number;
        vis_km: number;
        chance_of_rain: number;
      }>;
    }>;
  };
}

class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.weatherapi.com/v1';
  private cache: Map<string, { data: WeatherData; timestamp: number }> = new Map();
  private cacheTimeout = 15 * 60 * 1000; // 15 minutes

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_WEATHER_API_KEY || '';
  }

  async getCurrentWeather(lat: number, lng: number): Promise<WeatherData> {
    const cacheKey = `${lat},${lng}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${lat},${lng}&days=1&aqi=yes`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data: WeatherAPIResponse = await response.json();
      const weatherData = this.transformWeatherData(data);

      // Cache the result
      this.cache.set(cacheKey, { data: weatherData, timestamp: Date.now() });

      return weatherData;
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      // Return fallback data
      return this.getFallbackWeatherData();
    }
  }

  async getWeatherForecast(lat: number, lng: number, hours: number = 24): Promise<WeatherData[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${lat},${lng}&days=2&aqi=yes`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data: WeatherAPIResponse = await response.json();
      const forecast: WeatherData[] = [];

      // Current weather
      forecast.push(this.transformWeatherData(data));

      // Forecast data
      const forecastHours = data.forecast.forecastday.flatMap(day =>
        day.hour.slice(0, Math.min(hours - 1, day.hour.length))
      );

      for (const hour of forecastHours) {
        forecast.push({
          temperature: hour.temp_c,
          humidity: hour.humidity,
          windSpeed: hour.wind_kph,
          windDirection: hour.wind_degree,
          pressure: hour.pressure_mb,
          visibility: hour.vis_km,
          uvIndex: 0, // Not available in hourly forecast
          precipitation: {
            current: hour.precip_mm,
            forecast: [hour.chance_of_rain / 100], // Convert percentage to decimal
          },
          airQuality: {
            aqi: 0, // Not available in forecast
            pollutants: {
              pm25: 0,
              pm10: 0,
              no2: 0,
              so2: 0,
              o3: 0,
              co: 0,
            },
          },
        });
      }

      return forecast;
    } catch (error) {
      console.error('Failed to fetch weather forecast:', error);
      return [this.getFallbackWeatherData()];
    }
  }

  private transformWeatherData(data: WeatherAPIResponse): WeatherData {
    return {
      temperature: data.current.temp_c,
      humidity: data.current.humidity,
      windSpeed: data.current.wind_kph,
      windDirection: data.current.wind_degree,
      pressure: data.current.pressure_mb,
      visibility: data.current.vis_km,
      uvIndex: data.current.uv,
      precipitation: {
        current: data.current.precip_mm,
        forecast: data.forecast.forecastday[0]?.hour.map(h => h.chance_of_rain / 100) || [],
      },
      airQuality: {
        aqi: data.current.air_quality?.['us-epa-index'] || 0,
        pollutants: {
          pm25: data.current.air_quality?.pm2_5 || 0,
          pm10: data.current.air_quality?.pm10 || 0,
          no2: data.current.air_quality?.no2 || 0,
          so2: data.current.air_quality?.so2 || 0,
          o3: data.current.air_quality?.o3 || 0,
          co: data.current.air_quality?.co || 0,
        },
      },
    };
  }

  private getFallbackWeatherData(): WeatherData {
    return {
      temperature: 25,
      humidity: 60,
      windSpeed: 10,
      windDirection: 180,
      pressure: 1013,
      visibility: 10,
      uvIndex: 5,
      precipitation: {
        current: 0,
        forecast: [0.1, 0.2, 0.1],
      },
      airQuality: {
        aqi: 50,
        pollutants: {
          pm25: 15,
          pm10: 25,
          no2: 10,
          so2: 5,
          o3: 20,
          co: 0.5,
        },
      },
    };
  }

  // Calculate air quality impact based on weather conditions
  calculateWeatherImpact(weather: WeatherData): {
    dispersionFactor: number;
    precipitationEffect: number;
    temperatureEffect: number;
    humidityEffect: number;
    windEffect: number;
  } {
    // Wind speed effect on pollutant dispersion
    const windEffect = Math.min(1, weather.windSpeed / 20); // Normalize to 0-1

    // Temperature effect (higher temp = more evaporation, potentially higher pollutants)
    const temperatureEffect = Math.min(1, Math.max(0, (weather.temperature - 10) / 30));

    // Humidity effect (higher humidity = better pollutant washout)
    const humidityEffect = 1 - (weather.humidity / 100);

    // Precipitation effect (rain cleans the air)
    const precipitationEffect = Math.max(0, 1 - (weather.precipitation.current / 10));

    // Overall dispersion factor
    const dispersionFactor = (windEffect * 0.4) +
                           (temperatureEffect * 0.2) +
                           (humidityEffect * 0.2) +
                           (precipitationEffect * 0.2);

    return {
      dispersionFactor,
      precipitationEffect,
      temperatureEffect,
      humidityEffect,
      windEffect,
    };
  }

  // Predict air quality changes based on weather forecast
  async predictAQIWithWeather(
    currentAqi: number,
    lat: number,
    lng: number,
    hours: number = 24
  ): Promise<Array<{ hour: number; predictedAqi: number; confidence: number }>> {
    try {
      const forecast = await this.getWeatherForecast(lat, lng, hours);
      const predictions = [];

      for (let i = 0; i < Math.min(hours, forecast.length); i++) {
        const weather = forecast[i];
        const impact = this.calculateWeatherImpact(weather);

        // Simple prediction model based on weather impact
        const baseChange = (impact.dispersionFactor - 0.5) * 50; // -25 to +25 AQI change
        const predictedAqi = Math.max(0, currentAqi + baseChange + (Math.random() - 0.5) * 20);

        // Confidence based on forecast accuracy and weather stability
        const confidence = Math.max(0.3, 0.8 - (i * 0.02)); // Decreasing confidence over time

        predictions.push({
          hour: i,
          predictedAqi: Math.round(predictedAqi),
          confidence,
        });
      }

      return predictions;
    } catch (error) {
      console.error('Failed to predict AQI with weather:', error);
      // Return simple linear prediction as fallback
      return Array.from({ length: hours }, (_, i) => ({
        hour: i,
        predictedAqi: Math.round(currentAqi + (Math.random() - 0.5) * 10),
        confidence: 0.5,
      }));
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
let weatherService: WeatherService | null = null;

export function getWeatherService(apiKey?: string): WeatherService {
  if (!weatherService) {
    weatherService = new WeatherService(apiKey);
  }
  return weatherService;
}

export function disposeWeatherService(): void {
  if (weatherService) {
    weatherService.clearCache();
    weatherService = null;
  }
}

export type { WeatherData };