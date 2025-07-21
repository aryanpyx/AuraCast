import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const getAllZones = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("zones").collect();
  },
});

export const getZoneById = query({
  args: { zoneId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("zones")
      .withIndex("by_zone_id", (q) => q.eq("zoneId", args.zoneId))
      .unique();
  },
});

export const getZoneByIdInternal = internalQuery({
  args: { zoneId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("zones")
      .withIndex("by_zone_id", (q) => q.eq("zoneId", args.zoneId))
      .unique();
  },
});

export const getForecast = query({
  args: { zoneId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const next24Hours = now + 24 * 60 * 60 * 1000;
    
    return await ctx.db
      .query("forecasts")
      .withIndex("by_zone_and_time", (q) => 
        q.eq("zoneId", args.zoneId).gte("timestamp", now).lt("timestamp", next24Hours)
      )
      .order("asc")
      .collect();
  },
});

export const getHealthTips = query({
  args: { aqiCategory: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("healthTips")
      .withIndex("by_aqi_range", (q) => q.eq("aqiRange", args.aqiCategory))
      .first();
  },
});

export const getUserPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    return await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const updateUserPreferences = mutation({
  args: {
    favoriteZones: v.optional(v.array(v.string())),
    healthConditions: v.optional(v.array(v.string())),
    notificationSettings: v.optional(v.object({
      aqiThreshold: v.number(),
      enablePush: v.boolean(),
      enableEmail: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        favoriteZones: args.favoriteZones || [],
        healthConditions: args.healthConditions || [],
        notificationSettings: args.notificationSettings || {
          aqiThreshold: 100,
          enablePush: true,
          enableEmail: false,
        },
      });
    }
  },
});

export const generateAIForecast = action({
  args: { zoneId: v.string() },
  handler: async (ctx, args): Promise<any[]> => {
    // Simulate AI model prediction using LSTM-like logic
    const zone: any = await ctx.runQuery(internal.aqi.getZoneByIdInternal, { zoneId: args.zoneId });
    if (!zone) throw new Error("Zone not found");

    const now = Date.now();
    const forecasts = [];

    // Generate 24-hour forecasts with realistic patterns
    for (let hour = 1; hour <= 24; hour++) {
      const timestamp = now + hour * 60 * 60 * 1000;
      
      // Simulate diurnal patterns (higher AQI during morning/evening rush hours)
      const hourOfDay = new Date(timestamp).getHours();
      let timeMultiplier = 1.0;
      
      if (hourOfDay >= 7 && hourOfDay <= 10) timeMultiplier = 1.3; // Morning rush
      else if (hourOfDay >= 17 && hourOfDay <= 20) timeMultiplier = 1.2; // Evening rush
      else if (hourOfDay >= 22 || hourOfDay <= 5) timeMultiplier = 0.8; // Night time
      
      // Add some randomness and trend
      const randomFactor = 0.9 + Math.random() * 0.2;
      const trendFactor = 1 - (hour * 0.01); // Slight improvement over time
      
      const predictedAqi = Math.round(
        zone.currentAqi * timeMultiplier * randomFactor * trendFactor
      );
      
      // Calculate pollutant predictions
      const pollutantMultiplier = predictedAqi / zone.currentAqi;
      
      forecasts.push({
        zoneId: args.zoneId,
        timestamp,
        predictedAqi: Math.max(10, Math.min(500, predictedAqi)),
        confidence: 0.75 + Math.random() * 0.2,
        pollutants: {
          pm25: Math.round(zone.pollutants.pm25 * pollutantMultiplier),
          pm10: Math.round(zone.pollutants.pm10 * pollutantMultiplier),
          no2: Math.round(zone.pollutants.no2 * pollutantMultiplier),
          so2: Math.round(zone.pollutants.so2 * pollutantMultiplier),
          o3: Math.round(zone.pollutants.o3 * pollutantMultiplier),
          co: Math.round(zone.pollutants.co * pollutantMultiplier),
        },
        aiModel: "LSTM-v1.2",
      });
    }

    // Store forecasts in database
    for (const forecast of forecasts) {
      await ctx.runMutation(internal.aqi.storeForecastInternal, forecast);
    }

    return forecasts;
  },
});

export const storeForecast = mutation({
  args: {
    zoneId: v.string(),
    timestamp: v.number(),
    predictedAqi: v.number(),
    confidence: v.number(),
    pollutants: v.object({
      pm25: v.number(),
      pm10: v.number(),
      no2: v.number(),
      so2: v.number(),
      o3: v.number(),
      co: v.number(),
    }),
    aiModel: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("forecasts", args);
  },
});

export const storeForecastInternal = internalMutation({
  args: {
    zoneId: v.string(),
    timestamp: v.number(),
    predictedAqi: v.number(),
    confidence: v.number(),
    pollutants: v.object({
      pm25: v.number(),
      pm10: v.number(),
      no2: v.number(),
      so2: v.number(),
      o3: v.number(),
      co: v.number(),
    }),
    aiModel: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("forecasts", args);
  },
});

export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing data
    const existingZones = await ctx.db.query("zones").collect();
    for (const zone of existingZones) {
      await ctx.db.delete(zone._id);
    }

    const existingForecasts = await ctx.db.query("forecasts").collect();
    for (const forecast of existingForecasts) {
      await ctx.db.delete(forecast._id);
    }

    const existingTips = await ctx.db.query("healthTips").collect();
    for (const tip of existingTips) {
      await ctx.db.delete(tip._id);
    }

    // Seed zones data for Lucknow (1km² microzones)
    const zones = [
      {
        zoneId: "LKO_001",
        name: "Hazratganj Central",
        latitude: 26.8467,
        longitude: 80.9462,
        currentAqi: 156,
        aqiCategory: "Unhealthy",
        lastUpdated: Date.now(),
        pollutants: { pm25: 89, pm10: 145, no2: 45, so2: 12, o3: 78, co: 1.2 },
        weatherData: { temperature: 28, humidity: 65, windSpeed: 8, windDirection: 270 }
      },
      {
        zoneId: "LKO_002", 
        name: "Gomti Nagar Extension",
        latitude: 26.8512,
        longitude: 81.0082,
        currentAqi: 134,
        aqiCategory: "Unhealthy for Sensitive Groups",
        lastUpdated: Date.now(),
        pollutants: { pm25: 76, pm10: 128, no2: 38, so2: 9, o3: 65, co: 0.9 },
        weatherData: { temperature: 29, humidity: 62, windSpeed: 12, windDirection: 290 }
      },
      {
        zoneId: "LKO_003",
        name: "Aminabad Market",
        latitude: 26.8515,
        longitude: 80.9194,
        currentAqi: 178,
        aqiCategory: "Unhealthy",
        lastUpdated: Date.now(),
        pollutants: { pm25: 98, pm10: 167, no2: 52, so2: 15, o3: 89, co: 1.5 },
        weatherData: { temperature: 30, humidity: 68, windSpeed: 6, windDirection: 250 }
      },
      {
        zoneId: "LKO_004",
        name: "Alambagh Industrial",
        latitude: 26.8206,
        longitude: 80.9008,
        currentAqi: 142,
        aqiCategory: "Unhealthy for Sensitive Groups", 
        lastUpdated: Date.now(),
        pollutants: { pm25: 82, pm10: 135, no2: 41, so2: 11, o3: 71, co: 1.1 },
        weatherData: { temperature: 31, humidity: 70, windSpeed: 9, windDirection: 280 }
      },
      {
        zoneId: "LKO_005",
        name: "Indira Nagar Residential",
        latitude: 26.8769,
        longitude: 80.9999,
        currentAqi: 98,
        aqiCategory: "Moderate",
        lastUpdated: Date.now(),
        pollutants: { pm25: 54, pm10: 89, no2: 28, so2: 7, o3: 45, co: 0.7 },
        weatherData: { temperature: 27, humidity: 58, windSpeed: 15, windDirection: 310 }
      },
      {
        zoneId: "LKO_006",
        name: "Charbagh Railway",
        latitude: 26.8235,
        longitude: 80.9220,
        currentAqi: 189,
        aqiCategory: "Unhealthy",
        lastUpdated: Date.now(),
        pollutants: { pm25: 105, pm10: 178, no2: 58, so2: 18, o3: 95, co: 1.8 },
        weatherData: { temperature: 32, humidity: 72, windSpeed: 5, windDirection: 240 }
      },
      {
        zoneId: "LKO_007",
        name: "Mahanagar Green Zone",
        latitude: 26.8890,
        longitude: 81.0150,
        currentAqi: 87,
        aqiCategory: "Moderate",
        lastUpdated: Date.now(),
        pollutants: { pm25: 48, pm10: 78, no2: 24, so2: 6, o3: 42, co: 0.6 },
        weatherData: { temperature: 26, humidity: 55, windSpeed: 18, windDirection: 320 }
      },
      {
        zoneId: "LKO_008",
        name: "Aliganj Commercial",
        latitude: 26.8650,
        longitude: 80.9800,
        currentAqi: 165,
        aqiCategory: "Unhealthy",
        lastUpdated: Date.now(),
        pollutants: { pm25: 92, pm10: 152, no2: 48, so2: 13, o3: 82, co: 1.3 },
        weatherData: { temperature: 29, humidity: 64, windSpeed: 10, windDirection: 260 }
      }
    ];

    for (const zone of zones) {
      await ctx.db.insert("zones", zone);
    }

    // Seed health tips
    const healthTips = [
      {
        aqiRange: "Good",
        category: "0-50",
        tips: [
          "Perfect day for outdoor activities!",
          "Great time for morning jogs and cycling",
          "Windows can be kept open for fresh air",
          "Ideal conditions for children to play outside"
        ],
        activities: {
          outdoor: "All outdoor activities recommended",
          indoor: "Normal ventilation is fine",
          exercise: "High-intensity outdoor exercise is safe",
          vulnerable: "No restrictions for sensitive groups"
        },
        recommendations: [
          "Enjoy outdoor sports and activities",
          "Perfect for photography walks",
          "Great day for picnics and outdoor dining"
        ]
      },
      {
        aqiRange: "Moderate",
        category: "51-100", 
        tips: [
          "Generally acceptable air quality",
          "Sensitive individuals should limit prolonged outdoor exertion",
          "Consider indoor activities during peak pollution hours",
          "Monitor air quality if you have respiratory conditions"
        ],
        activities: {
          outdoor: "Moderate outdoor activities are fine",
          indoor: "Use air purifiers if available",
          exercise: "Light to moderate exercise outdoors is okay",
          vulnerable: "Limit prolonged outdoor activities"
        },
        recommendations: [
          "Check AQI before planning outdoor activities",
          "Keep rescue inhalers handy if asthmatic",
          "Consider wearing masks during high traffic hours"
        ]
      },
      {
        aqiRange: "Unhealthy for Sensitive Groups",
        category: "101-150",
        tips: [
          "Children, elderly, and people with respiratory conditions should limit outdoor activities",
          "Wear N95 masks when going outside",
          "Keep windows closed and use air purifiers",
          "Avoid outdoor exercise during peak hours"
        ],
        activities: {
          outdoor: "Limited outdoor activities for sensitive groups",
          indoor: "Stay indoors with air purification",
          exercise: "Indoor exercise recommended",
          vulnerable: "Avoid prolonged outdoor exposure"
        },
        recommendations: [
          "Use air purifiers indoors",
          "Keep emergency medications accessible",
          "Monitor symptoms closely"
        ]
      },
      {
        aqiRange: "Unhealthy",
        category: "151-200",
        tips: [
          "Everyone should avoid prolonged outdoor exertion",
          "Wear high-quality masks (N95/N99) when outside",
          "Use air purifiers and keep indoor plants",
          "Limit time spent outdoors"
        ],
        activities: {
          outdoor: "Avoid prolonged outdoor activities",
          indoor: "Stay indoors with good air filtration",
          exercise: "Indoor exercise only",
          vulnerable: "Stay indoors as much as possible"
        },
        recommendations: [
          "Seal windows and doors",
          "Use HEPA air purifiers",
          "Avoid cooking that produces smoke"
        ]
      },
      {
        aqiRange: "Very Unhealthy",
        category: "201-300",
        tips: [
          "Avoid all outdoor activities",
          "Stay indoors with air purifiers running",
          "Seek medical attention if experiencing breathing difficulties",
          "Emergency health warnings in effect"
        ],
        activities: {
          outdoor: "Avoid all outdoor activities",
          indoor: "Sealed indoor environment with air purification",
          exercise: "Light indoor exercise only",
          vulnerable: "Emergency precautions required"
        },
        recommendations: [
          "Emergency health measures",
          "Contact healthcare provider if symptoms worsen",
          "Consider relocating temporarily if possible"
        ]
      }
    ];

    for (const tip of healthTips) {
      await ctx.db.insert("healthTips", tip);
    }

    return "Data seeded successfully";
  },
});
