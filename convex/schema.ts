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

  collaborativeSessions: defineTable({
    name: v.string(),
    createdBy: v.id("users"),
    activeUsers: v.array(v.id("users")),
    settings: v.any(),
  }).index("by_created_by", ["createdBy"]),

  sessionUsers: defineTable({
    sessionId: v.id("collaborativeSessions"),
    userId: v.id("users"),
    joinedAt: v.number(),
    role: v.string(),
    permissions: v.any(),
  }).index("by_session", ["sessionId"]).index("by_user", ["userId"]),

  annotations: defineTable({
    sessionId: v.id("collaborativeSessions"),
    userId: v.id("users"),
    zoneId: v.string(),
    type: v.string(),
    content: v.string(),
    position: v.object({
      lat: v.number(),
      lng: v.number(),
    }),
    timestamp: v.number(),
  }).index("by_session", ["sessionId"]).index("by_zone", ["zoneId"]),

  chatMessages: defineTable({
    sessionId: v.id("collaborativeSessions"),
    userId: v.id("users"),
    message: v.string(),
    timestamp: v.number(),
    type: v.string(),
  }).index("by_session", ["sessionId"]).index("by_timestamp", ["timestamp"]),

  sharedFilters: defineTable({
    sessionId: v.id("collaborativeSessions"),
    userId: v.id("users"),
    filters: v.any(),
    timestamp: v.number(),
  }).index("by_session", ["sessionId"]),

  userPresence: defineTable({
    userId: v.id("users"),
    sessionId: v.id("collaborativeSessions"),
    lastSeen: v.number(),
    status: v.string(),
  }).index("by_user", ["userId"]).index("by_session", ["sessionId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
