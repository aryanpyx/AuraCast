import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  zones: defineTable({
    zoneId: v.string(),
    name: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    currentAqi: v.number(),
    aqiCategory: v.string(),
    lastUpdated: v.number(),
    pollutants: v.object({
      pm25: v.number(),
      pm10: v.number(),
      no2: v.number(),
      so2: v.number(),
      o3: v.number(),
      co: v.number(),
    }),
    weatherData: v.object({
      temperature: v.number(),
      humidity: v.number(),
      windSpeed: v.number(),
      windDirection: v.number(),
    }),
  }).index("by_zone_id", ["zoneId"]),

  forecasts: defineTable({
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
  }).index("by_zone_and_time", ["zoneId", "timestamp"]),

  healthTips: defineTable({
    aqiRange: v.string(),
    category: v.string(),
    tips: v.array(v.string()),
    activities: v.object({
      outdoor: v.string(),
      indoor: v.string(),
      exercise: v.string(),
      vulnerable: v.string(),
    }),
    recommendations: v.array(v.string()),
  }).index("by_aqi_range", ["aqiRange"]),

  userPreferences: defineTable({
    userId: v.id("users"),
    favoriteZones: v.array(v.string()),
    healthConditions: v.array(v.string()),
    notificationSettings: v.object({
      aqiThreshold: v.number(),
      enablePush: v.boolean(),
      enableEmail: v.boolean(),
    }),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
