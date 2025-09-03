// Vector Search Engine for AuraCast
// Enables intelligent AQI data queries and semantic search

interface VectorDocument {
  id: string;
  content: string;
  metadata: {
    type: 'zone' | 'forecast' | 'health_tip' | 'annotation' | 'pattern';
    zoneId?: string;
    timestamp?: number;
    aqi?: number;
    pollutants?: Record<string, number>;
    location?: { lat: number; lng: number };
    tags?: string[];
  };
  vector: number[];
  createdAt: number;
}

interface SearchResult {
  document: VectorDocument;
  score: number;
  highlights: string[];
}

interface SearchQuery {
  text?: string;
  vector?: number[];
  filters?: {
    type?: string[];
    zoneId?: string[];
    dateRange?: [number, number];
    aqiRange?: [number, number];
    location?: {
      center: { lat: number; lng: number };
      radius: number;
    };
  };
  limit?: number;
  threshold?: number;
}

class VectorSearchEngine {
  private documents: Map<string, VectorDocument> = new Map();
  private index: Map<string, Set<string>> = new Map(); // term -> document IDs
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize with sample data
    await this.loadSampleData();
    this.buildIndex();

    this.isInitialized = true;
    console.log('Vector search engine initialized');
  }

  private async loadSampleData(): Promise<void> {
    // Sample AQI zone data
    const sampleZones = [
      {
        id: 'zone_lko_001',
        content: 'Hazratganj Central zone in Lucknow with high traffic pollution and commercial activity',
        metadata: {
          type: 'zone',
          zoneId: 'LKO_001',
          aqi: 156,
          pollutants: { pm25: 89, pm10: 145, no2: 45, so2: 12, o3: 78, co: 1.2 },
          location: { lat: 26.8467, lng: 80.9462 },
          tags: ['traffic', 'commercial', 'urban', 'high-pollution'],
        },
        vector: this.generateVector('Hazratganj Central zone Lucknow high traffic pollution commercial activity'),
        createdAt: Date.now(),
      },
      {
        id: 'zone_lko_002',
        content: 'Gomti Nagar Extension residential and office area with moderate air quality',
        metadata: {
          type: 'zone',
          zoneId: 'LKO_002',
          aqi: 134,
          pollutants: { pm25: 76, pm10: 128, no2: 38, so2: 9, o3: 65, co: 0.9 },
          location: { lat: 26.8512, lng: 81.0082 },
          tags: ['residential', 'office', 'moderate', 'suburban'],
        },
        vector: this.generateVector('Gomti Nagar Extension residential office area moderate air quality'),
        createdAt: Date.now(),
      },
      {
        id: 'forecast_pattern',
        content: 'Morning rush hour pattern shows 30% increase in PM2.5 and NO2 levels between 7-10 AM',
        metadata: {
          type: 'pattern',
          tags: ['rush-hour', 'morning', 'traffic', 'pm25', 'no2'],
        },
        vector: this.generateVector('Morning rush hour pattern 30% increase PM2.5 NO2 levels 7-10 AM'),
        createdAt: Date.now(),
      },
      {
        id: 'health_tip_1',
        content: 'For AQI levels above 150, sensitive groups should avoid prolonged outdoor activities',
        metadata: {
          type: 'health_tip',
          aqi: 150,
          tags: ['health', 'sensitive-groups', 'outdoor-activity', 'precaution'],
        },
        vector: this.generateVector('AQI levels above 150 sensitive groups avoid prolonged outdoor activities'),
        createdAt: Date.now(),
      },
    ];

    sampleZones.forEach(doc => this.documents.set(doc.id, doc));
  }

  private generateVector(text: string): number[] {
    // Simple text-to-vector conversion (in production, use proper embeddings)
    const words = text.toLowerCase().split(/\s+/);
    const vector: number[] = new Array(128).fill(0);

    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      const position = Math.abs(hash) % 128;
      vector[position] += 1;

      // Add some context from neighboring words
      if (index > 0) {
        const prevWord = words[index - 1];
        const combinedHash = this.simpleHash(prevWord + word);
        const combinedPosition = Math.abs(combinedHash) % 128;
        vector[combinedPosition] += 0.5;
      }
    });

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  private buildIndex(): void {
    this.index.clear();

    for (const [docId, doc] of this.documents) {
      const terms = this.extractTerms(doc.content);

      terms.forEach(term => {
        if (!this.index.has(term)) {
          this.index.set(term, new Set());
        }
        this.index.get(term)!.add(docId);
      });
    }
  }

  private extractTerms(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    let candidateDocs = new Set<string>();

    // Text-based search
    if (query.text) {
      const queryTerms = this.extractTerms(query.text);
      const docScores = new Map<string, number>();

      queryTerms.forEach(term => {
        const docs = this.index.get(term);
        if (docs) {
          docs.forEach(docId => {
            const currentScore = docScores.get(docId) || 0;
            docScores.set(docId, currentScore + 1);
          });
        }
      });

      // Sort by relevance and take top candidates
      const sortedDocs = Array.from(docScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100);

      sortedDocs.forEach(([docId]) => candidateDocs.add(docId));
    } else {
      // If no text query, consider all documents
      candidateDocs = new Set(this.documents.keys());
    }

    // Vector similarity search
    let results: SearchResult[] = [];

    for (const docId of candidateDocs) {
      const doc = this.documents.get(docId);
      if (!doc) continue;

      let score = 0;

      // Vector similarity
      if (query.vector) {
        score = this.cosineSimilarity(doc.vector, query.vector);
      } else if (query.text) {
        // Fallback scoring for text queries
        score = this.calculateTextRelevance(doc, query.text);
      }

      // Apply filters
      if (this.matchesFilters(doc, query.filters)) {
        results.push({
          document: doc,
          score,
          highlights: this.generateHighlights(doc, query.text || ''),
        });
      }
    }

    // Sort by score and apply limits
    results.sort((a, b) => b.score - a.score);

    if (query.threshold !== undefined) {
      results = results.filter(r => r.score >= query.threshold!);
    }

    return results.slice(0, query.limit || 20);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private calculateTextRelevance(doc: VectorDocument, query: string): number {
    const queryTerms = this.extractTerms(query);
    const docTerms = this.extractTerms(doc.content);

    let relevance = 0;
    queryTerms.forEach(term => {
      if (docTerms.includes(term)) {
        relevance += 1;
      }
    });

    return relevance / queryTerms.length;
  }

  private matchesFilters(doc: VectorDocument, filters?: SearchQuery['filters']): boolean {
    if (!filters) return true;

    // Type filter
    if (filters.type && !filters.type.includes(doc.metadata.type)) {
      return false;
    }

    // Zone filter
    if (filters.zoneId && doc.metadata.zoneId && !filters.zoneId.includes(doc.metadata.zoneId)) {
      return false;
    }

    // Date range filter
    if (filters.dateRange && doc.metadata.timestamp) {
      const [start, end] = filters.dateRange;
      if (doc.metadata.timestamp < start || doc.metadata.timestamp > end) {
        return false;
      }
    }

    // AQI range filter
    if (filters.aqiRange && doc.metadata.aqi) {
      const [min, max] = filters.aqiRange;
      if (doc.metadata.aqi < min || doc.metadata.aqi > max) {
        return false;
      }
    }

    // Location filter
    if (filters.location && doc.metadata.location) {
      const distance = this.calculateDistance(
        filters.location.center,
        doc.metadata.location
      );
      if (distance > filters.location.radius) {
        return false;
      }
    }

    return true;
  }

  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private generateHighlights(doc: VectorDocument, query: string): string[] {
    const highlights: string[] = [];
    const queryTerms = this.extractTerms(query);

    queryTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      if (regex.test(doc.content)) {
        highlights.push(term);
      }
    });

    return highlights;
  }

  // Advanced search methods
  async findSimilarZones(zoneId: string, limit: number = 5): Promise<SearchResult[]> {
    const zoneDoc = Array.from(this.documents.values())
      .find(doc => doc.metadata.zoneId === zoneId);

    if (!zoneDoc) return [];

    return this.search({
      vector: zoneDoc.vector,
      filters: { type: ['zone'] },
      limit,
    });
  }

  async findHealthTipsForAQI(aqi: number): Promise<SearchResult[]> {
    return this.search({
      text: `health recommendations for AQI ${aqi}`,
      filters: {
        type: ['health_tip'],
        aqiRange: [aqi - 20, aqi + 20],
      },
      limit: 5,
    });
  }

  async findPollutionPatterns(query: string): Promise<SearchResult[]> {
    return this.search({
      text: query,
      filters: { type: ['pattern'] },
      limit: 10,
    });
  }

  async searchNearbyAnnotations(
    center: { lat: number; lng: number },
    radius: number,
    query?: string
  ): Promise<SearchResult[]> {
    return this.search({
      text: query,
      filters: {
        type: ['annotation'],
        location: { center, radius },
      },
      limit: 20,
    });
  }

  // Index management
  async addDocument(doc: Omit<VectorDocument, 'vector'>): Promise<void> {
    const document: VectorDocument = {
      ...doc,
      vector: this.generateVector(doc.content),
    };

    this.documents.set(doc.id, document);
    this.buildIndex();
  }

  async removeDocument(docId: string): Promise<void> {
    this.documents.delete(docId);
    this.buildIndex();
  }

  async updateDocument(docId: string, updates: Partial<VectorDocument>): Promise<void> {
    const existing = this.documents.get(docId);
    if (!existing) return;

    const updated = { ...existing, ...updates };
    if (updates.content) {
      updated.vector = this.generateVector(updates.content);
    }

    this.documents.set(docId, updated);
    this.buildIndex();
  }

  getStats(): {
    totalDocuments: number;
    documentsByType: Record<string, number>;
    indexSize: number;
  } {
    const documentsByType: Record<string, number> = {};

    for (const doc of this.documents.values()) {
      documentsByType[doc.metadata.type] = (documentsByType[doc.metadata.type] || 0) + 1;
    }

    return {
      totalDocuments: this.documents.size,
      documentsByType,
      indexSize: this.index.size,
    };
  }
}

// Singleton instance
let vectorSearchEngine: VectorSearchEngine | null = null;

export function getVectorSearchEngine(): VectorSearchEngine {
  if (!vectorSearchEngine) {
    vectorSearchEngine = new VectorSearchEngine();
  }
  return vectorSearchEngine;
}

export function disposeVectorSearchEngine(): void {
  vectorSearchEngine = null;
}

export type { VectorDocument, SearchResult, SearchQuery };