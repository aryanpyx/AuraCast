// Global Mock API for Demo Mode
// This replaces Convex API calls when running without backend

export const mockApi = {
  aqi: {
    seedData: async () => "Data seeded successfully",
    getAllZones: () => mockZones,
  },
  auth: {
    loggedInUser: () => ({ _id: "demo-user", name: "Demo User" }),
  },
  collaboration: {
    getActiveSessions: () => mockSessions,
    getSession: (args: any) => mockSessions.find(s => s._id === args?.sessionId) || null,
    getSessionUsers: (args: any) => mockSessionUsers.filter(u => u.sessionId === args?.sessionId),
    getUserPresence: (args: any) => mockUserPresence.filter(p => p.sessionId === args?.sessionId),
    getChatMessages: (args: any) => mockChatMessages.filter(m => m.sessionId === args?.sessionId).slice(-50),
    getAnnotations: (args: any) => mockAnnotations.filter(a => a.sessionId === args?.sessionId),
    getSharedFilters: (args: any) => mockSharedFilters.find(f => f.sessionId === args?.sessionId) || null,
    createSession: async (data: any) => ({
      ...data,
      _id: `session_${Date.now()}`,
      createdBy: "demo-user",
      activeUsers: ["demo-user"]
    }),
    joinSession: async () => "joined",
    leaveSession: async () => "left",
    updateUserPresence: async () => "updated",
    sendChatMessage: async (data: any) => ({
      ...data,
      _id: `msg_${Date.now()}`,
      timestamp: Date.now()
    }),
    addAnnotation: async (data: any) => ({
      ...data,
      _id: `ann_${Date.now()}`,
      timestamp: Date.now()
    }),
    updateSharedFilters: async (data: any) => ({
      ...data,
      _id: `filter_${Date.now()}`,
      timestamp: Date.now()
    }),
  }
};

// Mock Data
const mockZones = [
  {
    _id: "zone_1",
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
    _id: "zone_2",
    zoneId: "LKO_002",
    name: "Gomti Nagar Extension",
    latitude: 26.8512,
    longitude: 81.0082,
    currentAqi: 134,
    aqiCategory: "Unhealthy for Sensitive Groups",
    lastUpdated: Date.now(),
    pollutants: { pm25: 76, pm10: 128, no2: 38, so2: 9, o3: 65, co: 0.9 },
    weatherData: { temperature: 29, humidity: 62, windSpeed: 12, windDirection: 290 }
  }
];

const mockSessions = [
  {
    _id: "session_1",
    name: "Demo Session",
    createdBy: "demo-user",
    activeUsers: ["demo-user"],
    settings: {}
  }
];

const mockSessionUsers = [
  {
    _id: "user_1",
    sessionId: "session_1",
    userId: "demo-user",
    joinedAt: Date.now(),
    role: "admin",
    permissions: { canInvite: true, canKick: true, canManageSettings: true }
  }
];

const mockUserPresence = [
  {
    _id: "presence_1",
    userId: "demo-user",
    sessionId: "session_1",
    lastSeen: Date.now(),
    status: "online"
  }
];

const mockChatMessages = [
  {
    _id: "msg_1",
    sessionId: "session_1",
    userId: "demo-user",
    message: "Welcome to the collaborative session!",
    timestamp: Date.now(),
    type: "text"
  },
  {
    _id: "msg_2",
    sessionId: "session_1",
    userId: "demo-user",
    message: "You can add annotations by clicking on the map",
    timestamp: Date.now() + 1000,
    type: "text"
  }
];

const mockAnnotations = [
  {
    _id: "ann_1",
    sessionId: "session_1",
    userId: "demo-user",
    zoneId: "LKO_001",
    type: "marker",
    content: "High pollution area - Industrial zone nearby",
    position: { lat: 26.8467, lng: 80.9462 },
    timestamp: Date.now()
  }
];

const mockSharedFilters = [
  {
    _id: "filter_1",
    sessionId: "session_1",
    userId: "demo-user",
    filters: { aqiRange: [0, 200], pollutants: ["pm25", "pm10"] },
    timestamp: Date.now()
  }
];

// Mock React hooks that work like Convex
export const useQuery = (queryFn: any, args?: any) => {
  // Handle different query types
  if (queryFn === 'api.aqi.getAllZones') {
    return mockZones;
  }
  if (queryFn === 'api.collaboration.getActiveSessions') {
    return mockSessions;
  }
  if (queryFn === 'api.collaboration.getSession' && args?.sessionId) {
    return mockSessions.find(s => s._id === args.sessionId) || null;
  }
  if (queryFn === 'api.collaboration.getSessionUsers' && args?.sessionId) {
    return mockSessionUsers.filter(u => u.sessionId === args.sessionId);
  }
  if (queryFn === 'api.collaboration.getUserPresence' && args?.sessionId) {
    return mockUserPresence.filter(p => p.sessionId === args.sessionId);
  }
  if (queryFn === 'api.collaboration.getChatMessages' && args?.sessionId) {
    const messages = mockChatMessages.filter(m => m.sessionId === args.sessionId);
    return args.limit ? messages.slice(-args.limit) : messages;
  }
  if (queryFn === 'api.collaboration.getAnnotations' && args?.sessionId) {
    return mockAnnotations.filter(a => a.sessionId === args.sessionId);
  }
  if (queryFn === 'api.collaboration.getSharedFilters' && args?.sessionId) {
    return mockSharedFilters.find(f => f.sessionId === args.sessionId) || null;
  }
  return null;
};

export const useMutation = (mutationFn: any) => {
  return async (data: any) => {
    console.log('Mock mutation:', mutationFn, data);

    if (mutationFn === 'api.collaboration.createSession') {
      return mockApi.collaboration.createSession(data);
    }
    if (mutationFn === 'api.collaboration.joinSession') {
      return mockApi.collaboration.joinSession();
    }
    if (mutationFn === 'api.collaboration.leaveSession') {
      return mockApi.collaboration.leaveSession();
    }
    if (mutationFn === 'api.collaboration.sendChatMessage') {
      return mockApi.collaboration.sendChatMessage(data);
    }
    if (mutationFn === 'api.collaboration.addAnnotation') {
      return mockApi.collaboration.addAnnotation(data);
    }
    if (mutationFn === 'api.collaboration.updateSharedFilters') {
      return mockApi.collaboration.updateSharedFilters(data);
    }
    if (mutationFn === 'api.collaboration.updateUserPresence') {
      return mockApi.collaboration.updateUserPresence();
    }
    return "mock result";
  };
};

// Export types
export type MockApi = typeof mockApi;