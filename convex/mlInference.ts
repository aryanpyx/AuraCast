// ML Model Inference Functions for Convex
// Serverless functions for advanced ML processing

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Ensemble Prediction with Server-side Processing
export const runEnsemblePrediction = action({
  args: {
    zoneId: v.string(),
    includeWeather: v.optional(v.boolean()),
    modelVersions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<any> => {
    const { zoneId, includeWeather = true, modelVersions = ['v1', 'v2', 'v3'] } = args;

    try {
      // Get zone data
      const zone = await ctx.runQuery(internal.aqi.getZoneByIdInternal, { zoneId });
      if (!zone) {
        throw new Error(`Zone ${zoneId} not found`);
      }

      // Get recent forecasts for context
      const forecasts = await ctx.runQuery(internal.aqi.getForecast, { zoneId });

      // Prepare input data
      const inputData = {
        currentAqi: zone.currentAqi,
        pollutants: zone.pollutants,
        weatherData: zone.weatherData,
        historicalData: forecasts.slice(0, 24).map(f => f.predictedAqi),
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
      };

      // Run ensemble prediction
      const predictions = await runServerSideEnsemble(inputData, modelVersions);

      // Calculate ensemble result
      const ensembleResult = calculateEnsembleResult(predictions);

      // Store prediction results
      const predictionId = await ctx.runMutation(internal.mlInference.storePredictionResult, {
        zoneId,
        predictions,
        ensembleResult,
        inputData,
        timestamp: Date.now(),
      });

      return {
        predictionId,
        ...ensembleResult,
        modelPredictions: predictions,
      };
    } catch (error) {
      console.error('Ensemble prediction failed:', error);
      throw new Error(`ML inference failed: ${error.message}`);
    }
  },
});

// Batch Prediction for Multiple Zones
export const runBatchPrediction = action({
  args: {
    zoneIds: v.array(v.string()),
    predictionHorizon: v.optional(v.number()),
    includeWeather: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<any> => {
    const { zoneIds, predictionHorizon = 24, includeWeather = true } = args;

    try {
      const results = [];

      // Process zones in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < zoneIds.length; i += batchSize) {
        const batch = zoneIds.slice(i, i + batchSize);

        const batchPromises = batch.map(async (zoneId) => {
          try {
            const result = await ctx.runAction(internal.mlInference.runEnsemblePrediction, {
              zoneId,
              includeWeather,
            });
            return { zoneId, success: true, result };
          } catch (error) {
            return { zoneId, success: false, error: error.message };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches
        if (i + batchSize < zoneIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return {
        totalZones: zoneIds.length,
        successfulPredictions: results.filter(r => r.success).length,
        failedPredictions: results.filter(r => !r.success).length,
        results,
      };
    } catch (error) {
      console.error('Batch prediction failed:', error);
      throw new Error(`Batch ML inference failed: ${error.message}`);
    }
  },
});

// Anomaly Detection
export const detectAnomalies = action({
  args: {
    zoneId: v.string(),
    timeRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
    sensitivity: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any> => {
    const { zoneId, timeRange, sensitivity = 0.8 } = args;

    try {
      // Get historical data
      const endTime = timeRange?.end || Date.now();
      const startTime = timeRange?.start || (endTime - 7 * 24 * 60 * 60 * 1000); // 7 days

      const forecasts = await ctx.runQuery(internal.aqi.getForecast, { zoneId });
      const historicalData = forecasts
        .filter(f => f.timestamp >= startTime && f.timestamp <= endTime)
        .map(f => f.predictedAqi)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (historicalData.length < 24) {
        throw new Error('Insufficient historical data for anomaly detection');
      }

      // Run anomaly detection algorithm
      const anomalies = await detectAnomaliesInData(historicalData, sensitivity);

      // Store anomaly results
      const anomalyId = await ctx.runMutation(internal.mlInference.storeAnomalyResult, {
        zoneId,
        anomalies,
        timeRange: { start: startTime, end: endTime },
        sensitivity,
        timestamp: Date.now(),
      });

      return {
        anomalyId,
        anomalies: anomalies.filter(a => a.isAnomaly),
        totalAnomalies: anomalies.filter(a => a.isAnomaly).length,
        confidence: calculateAnomalyConfidence(anomalies),
      };
    } catch (error) {
      console.error('Anomaly detection failed:', error);
      throw new Error(`Anomaly detection failed: ${error.message}`);
    }
  },
});

// Pattern Recognition
export const recognizePatterns = action({
  args: {
    zoneIds: v.array(v.string()),
    patternType: v.optional(v.string()),
    timeRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  handler: async (ctx, args): Promise<any> => {
    const { zoneIds, patternType = 'all', timeRange } = args;

    try {
      const patterns = [];

      for (const zoneId of zoneIds) {
        // Get zone data and forecasts
        const zone = await ctx.runQuery(internal.aqi.getZoneByIdInternal, { zoneId });
        const forecasts = await ctx.runQuery(internal.aqi.getForecast, { zoneId });

        if (!zone || forecasts.length === 0) continue;

        // Analyze patterns
        const zonePatterns = await analyzeZonePatterns(zone, forecasts, patternType, timeRange);

        if (zonePatterns.length > 0) {
          patterns.push({
            zoneId,
            zoneName: zone.name,
            patterns: zonePatterns,
          });
        }
      }

      // Store pattern analysis results
      const patternId = await ctx.runMutation(internal.mlInference.storePatternResult, {
        zoneIds,
        patterns,
        patternType,
        timeRange,
        timestamp: Date.now(),
      });

      return {
        patternId,
        patterns,
        totalPatterns: patterns.reduce((sum, p) => sum + p.patterns.length, 0),
      };
    } catch (error) {
      console.error('Pattern recognition failed:', error);
      throw new Error(`Pattern recognition failed: ${error.message}`);
    }
  },
});

// Model Performance Analysis
export const analyzeModelPerformance = action({
  args: {
    zoneIds: v.optional(v.array(v.string())),
    timeRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
    metrics: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<any> => {
    const { zoneIds, timeRange, metrics = ['accuracy', 'precision', 'recall', 'latency'] } = args;

    try {
      const endTime = timeRange?.end || Date.now();
      const startTime = timeRange?.start || (endTime - 30 * 24 * 60 * 60 * 1000); // 30 days

      // Get prediction results from the period
      const predictionResults = await ctx.runQuery(internal.mlInference.getPredictionResults, {
        startTime,
        endTime,
        zoneIds,
      });

      // Analyze performance
      const performance = await analyzePredictionPerformance(predictionResults, metrics);

      // Store performance analysis
      const analysisId = await ctx.runMutation(internal.mlInference.storePerformanceAnalysis, {
        performance,
        timeRange: { start: startTime, end: endTime },
        zoneIds,
        metrics,
        timestamp: Date.now(),
      });

      return {
        analysisId,
        performance,
        summary: generatePerformanceSummary(performance),
      };
    } catch (error) {
      console.error('Model performance analysis failed:', error);
      throw new Error(`Performance analysis failed: ${error.message}`);
    }
  },
});

// Internal functions for ML processing
async function runServerSideEnsemble(inputData: any, modelVersions: string[]): Promise<any[]> {
  const predictions = [];

  // Simulate different model predictions
  for (const version of modelVersions) {
    const prediction = await simulateModelPrediction(inputData, version);
    predictions.push({
      modelVersion: version,
      predictedAqi: prediction,
      confidence: 0.8 + Math.random() * 0.15,
      latency: 50 + Math.random() * 100,
    });
  }

  return predictions;
}

async function simulateModelPrediction(inputData: any, version: string): Promise<number> {
  // Simple prediction simulation (in production, use actual ML models)
  const basePrediction = inputData.currentAqi;
  const timeFactor = Math.sin((inputData.timeOfDay / 24) * 2 * Math.PI) * 20;
  const weatherFactor = (inputData.weatherData.temperature - 25) * 0.5;
  const randomFactor = (Math.random() - 0.5) * 30;

  return Math.max(0, Math.round(basePrediction + timeFactor + weatherFactor + randomFactor));
}

function calculateEnsembleResult(predictions: any[]): any {
  const weights = { v1: 0.4, v2: 0.35, v3: 0.25 };
  let weightedSum = 0;
  let totalWeight = 0;

  predictions.forEach(pred => {
    const weight = weights[pred.modelVersion as keyof typeof weights] || 0.33;
    weightedSum += pred.predictedAqi * weight;
    totalWeight += weight;
  });

  const ensemblePrediction = weightedSum / totalWeight;
  const confidences = predictions.map(p => p.confidence);
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

  return {
    predictedAqi: Math.round(ensemblePrediction),
    confidence: avgConfidence,
    uncertainty: calculateUncertainty(predictions),
    confidenceInterval: calculateConfidenceInterval(predictions),
  };
}

function calculateUncertainty(predictions: any[]): number {
  const values = predictions.map(p => p.predictedAqi);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calculateConfidenceInterval(predictions: any[]): [number, number] {
  const values = predictions.map(p => p.predictedAqi);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const uncertainty = calculateUncertainty(predictions);
  const margin = 1.96 * uncertainty;

  return [
    Math.max(0, Math.round(mean - margin)),
    Math.round(mean + margin)
  ];
}

async function detectAnomaliesInData(data: number[], sensitivity: number): Promise<any[]> {
  const anomalies = [];
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const std = Math.sqrt(data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length);

  data.forEach((value, index) => {
    const zScore = Math.abs((value - mean) / std);
    const isAnomaly = zScore > (3 - sensitivity); // Adjust threshold based on sensitivity

    anomalies.push({
      index,
      value,
      zScore,
      isAnomaly,
      severity: isAnomaly ? (zScore > 4 ? 'high' : 'medium') : 'low',
    });
  });

  return anomalies;
}

function calculateAnomalyConfidence(anomalies: any[]): number {
  const anomalyCount = anomalies.filter(a => a.isAnomaly).length;
  const totalCount = anomalies.length;
  return Math.min(0.95, anomalyCount / totalCount + 0.5);
}

async function analyzeZonePatterns(zone: any, forecasts: any[], patternType: string, timeRange?: any): Promise<any[]> {
  const patterns = [];

  // Analyze daily patterns
  if (patternType === 'all' || patternType === 'daily') {
    const dailyPattern = analyzeDailyPattern(forecasts);
    if (dailyPattern) {
      patterns.push({
        type: 'daily',
        description: dailyPattern.description,
        confidence: dailyPattern.confidence,
        data: dailyPattern.data,
      });
    }
  }

  // Analyze seasonal patterns
  if (patternType === 'all' || patternType === 'seasonal') {
    const seasonalPattern = analyzeSeasonalPattern(forecasts);
    if (seasonalPattern) {
      patterns.push({
        type: 'seasonal',
        description: seasonalPattern.description,
        confidence: seasonalPattern.confidence,
        data: seasonalPattern.data,
      });
    }
  }

  return patterns;
}

function analyzeDailyPattern(forecasts: any[]): any {
  // Simple daily pattern analysis
  const hourlyData = new Array(24).fill(0).map(() => ({ sum: 0, count: 0 }));

  forecasts.forEach(forecast => {
    const hour = new Date(forecast.timestamp).getHours();
    hourlyData[hour].sum += forecast.predictedAqi;
    hourlyData[hour].count += 1;
  });

  const hourlyAverages = hourlyData.map(h => h.count > 0 ? h.sum / h.count : 0);
  const maxHour = hourlyAverages.indexOf(Math.max(...hourlyAverages));
  const minHour = hourlyAverages.indexOf(Math.min(...hourlyAverages));

  return {
    description: `Peak pollution at ${maxHour}:00, lowest at ${minHour}:00`,
    confidence: 0.8,
    data: { hourlyAverages, peakHour: maxHour, lowHour: minHour },
  };
}

function analyzeSeasonalPattern(forecasts: any[]): any {
  // Simple seasonal analysis based on time of day patterns
  const morningAvg = forecasts
    .filter(f => {
      const hour = new Date(f.timestamp).getHours();
      return hour >= 6 && hour <= 12;
    })
    .reduce((sum, f, _, arr) => sum + f.predictedAqi / arr.length, 0);

  const eveningAvg = forecasts
    .filter(f => {
      const hour = new Date(f.timestamp).getHours();
      return hour >= 17 && hour <= 22;
    })
    .reduce((sum, f, _, arr) => sum + f.predictedAqi / arr.length, 0);

  if (Math.abs(morningAvg - eveningAvg) > 20) {
    return {
      description: `Significant difference between morning (${Math.round(morningAvg)}) and evening (${Math.round(eveningAvg)}) AQI`,
      confidence: 0.75,
      data: { morningAvg, eveningAvg },
    };
  }

  return null;
}

async function analyzePredictionPerformance(results: any[], metrics: string[]): Promise<any> {
  const performance = {
    overall: {},
    byModel: {},
    byZone: {},
    trends: {},
  };

  // Calculate overall metrics
  metrics.forEach(metric => {
    // Implementation for calculating each metric
    performance.overall[metric] = 0.85 + Math.random() * 0.1; // Mock value
  });

  return performance;
}

function generatePerformanceSummary(performance: any): any {
  return {
    averageAccuracy: performance.overall.accuracy || 0,
    totalPredictions: 1000, // Mock value
    improvement: 0.05, // Mock improvement over time
  };
}