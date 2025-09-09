import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Session Management
export const createSession = mutation({
  args: {
    name: v.string(),
    settings: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const sessionId = await ctx.db.insert("collaborativeSessions", {
      name: args.name,
      createdBy: userId,
      activeUsers: [userId],
      settings: args.settings || {},
    });

    // Add creator to session users
    await ctx.db.insert("sessionUsers", {
      sessionId,
      userId,
      joinedAt: Date.now(),
      role: "admin",
      permissions: { canInvite: true, canKick: true, canManageSettings: true },
    });

    // Set user presence
    await ctx.db.insert("userPresence", {
      userId,
      sessionId,
      lastSeen: Date.now(),
      status: "online",
    });

    return sessionId;
  },
});

export const joinSession = mutation({
  args: { sessionId: v.id("collaborativeSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is already in session
    const existingUser = await ctx.db
      .query("sessionUsers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (existingUser) {
      // Update presence
      await updateUserPresence(ctx, { sessionId: args.sessionId, status: "online" });
      return args.sessionId;
    }

    // Add user to session
    await ctx.db.insert("sessionUsers", {
      sessionId: args.sessionId,
      userId,
      joinedAt: Date.now(),
      role: "member",
      permissions: { canInvite: false, canKick: false, canManageSettings: false },
    });

    // Update session active users
    const session = await ctx.db.get(args.sessionId);
    if (session) {
      await ctx.db.patch(args.sessionId, {
        activeUsers: [...session.activeUsers, userId],
      });
    }

    // Set user presence
    await ctx.db.insert("userPresence", {
      userId,
      sessionId: args.sessionId,
      lastSeen: Date.now(),
      status: "online",
    });

    return args.sessionId;
  },
});

export const leaveSession = mutation({
  args: { sessionId: v.id("collaborativeSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Remove user from session users
    const sessionUser = await ctx.db
      .query("sessionUsers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (sessionUser) {
      await ctx.db.delete(sessionUser._id);
    }

    // Update session active users
    const session = await ctx.db.get(args.sessionId);
    if (session) {
      await ctx.db.patch(args.sessionId, {
        activeUsers: session.activeUsers.filter((id) => id !== userId),
      });
    }

    // Remove user presence
    const presence = await ctx.db
      .query("userPresence")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first();

    if (presence) {
      await ctx.db.delete(presence._id);
    }

    return true;
  },
});

// Real-time Subscriptions
export const getSession = query({
  args: { sessionId: v.id("collaborativeSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const getSessionUsers = query({
  args: { sessionId: v.id("collaborativeSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessionUsers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const getUserPresence = query({
  args: { sessionId: v.id("collaborativeSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userPresence")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const getChatMessages = query({
  args: { sessionId: v.id("collaborativeSessions"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(limit)
      .reverse();
  },
});

export const getAnnotations = query({
  args: { sessionId: v.id("collaborativeSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("annotations")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const getSharedFilters = query({
  args: { sessionId: v.id("collaborativeSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sharedFilters")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
  },
});

// Chat and Annotations
export const sendChatMessage = mutation({
  args: {
    sessionId: v.id("collaborativeSessions"),
    message: v.string(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      userId,
      message: args.message,
      timestamp: Date.now(),
      type: args.type || "text",
    });
  },
});

export const addAnnotation = mutation({
  args: {
    sessionId: v.id("collaborativeSessions"),
    zoneId: v.string(),
    type: v.string(),
    content: v.string(),
    position: v.object({
      lat: v.number(),
      lng: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("annotations", {
      sessionId: args.sessionId,
      userId,
      zoneId: args.zoneId,
      type: args.type,
      content: args.content,
      position: args.position,
      timestamp: Date.now(),
    });
  },
});

export const updateSharedFilters = mutation({
  args: {
    sessionId: v.id("collaborativeSessions"),
    filters: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("sharedFilters", {
      sessionId: args.sessionId,
      userId,
      filters: args.filters,
      timestamp: Date.now(),
    });
  },
});

// User Presence
export const updateUserPresence = mutation({
  args: {
    sessionId: v.id("collaborativeSessions"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existingPresence = await ctx.db
      .query("userPresence")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first();

    if (existingPresence) {
      await ctx.db.patch(existingPresence._id, {
        lastSeen: Date.now(),
        status: args.status,
      });
    } else {
      await ctx.db.insert("userPresence", {
        userId,
        sessionId: args.sessionId,
        lastSeen: Date.now(),
        status: args.status,
      });
    }

    return true;
  },
});

// Session Management Queries
export const getUserSessions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const sessionUsers = await ctx.db
      .query("sessionUsers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const sessionIds = sessionUsers.map((su) => su.sessionId);
    const sessions = [];

    for (const sessionId of sessionIds) {
      const session = await ctx.db.get(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  },
});

export const getActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("collaborativeSessions").collect();
  },
});

// Clean up inactive users (can be called periodically)
export const cleanupInactiveUsers = action({
  args: { sessionId: v.id("collaborativeSessions") },
  handler: async (ctx, args) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    const inactiveUsers = await ctx.db
      .query("userPresence")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.lt(q.field("lastSeen"), fiveMinutesAgo))
      .collect();

    for (const presence of inactiveUsers) {
      // Remove from session users
      const sessionUser = await ctx.db
        .query("sessionUsers")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .filter((q) => q.eq(q.field("userId"), presence.userId))
        .first();

      if (sessionUser) {
        await ctx.db.delete(sessionUser._id);
      }

      // Update session active users
      const session = await ctx.db.get(args.sessionId);
      if (session) {
        await ctx.db.patch(args.sessionId, {
          activeUsers: session.activeUsers.filter((id) => id !== presence.userId),
        });
      }

      // Remove presence
      await ctx.db.delete(presence._id);
    }

    return inactiveUsers.length;
  },
});