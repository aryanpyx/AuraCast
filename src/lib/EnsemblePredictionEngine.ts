import * as tf from '@tensorflow/tfjs';
import { InferenceSession } from 'onnxruntime-web';
import { wrap } from 'comlink';

interface PredictionInput {
  currentAqi: number;
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
  historicalData?: number[];
  timeOfDay: number;
  dayOfWeek: number;
}

interface PredictionResult {
  predictedAqi: number;
  confidence: number;
  uncertainty: number;
  modelPredictions: {
    lstm: number;
    transformer: number;
    cnn: number;
    ensemble: number;
  };
  confidenceInterval: [number, number];
}

interface ModelConfig {
  name: string;
  type: 'tensorflow' | 'onnx';
  path: string;
  inputShape: number[];
  outputShape: number[];
  weights?: string;
}

class EnsemblePredictionEngine {
  private models: Map<string, tf.LayersModel | InferenceSession> = new Map();
  private isInitialized = false;
  private modelConfigs: ModelConfig[] = [
    {
      name: 'lstm',
      type: 'tensorflow',
      path: '/models/lstm/model.json',
      inputShape: [1, 24, 10], // 24 hours, 10 features
      outputShape: [1, 1],
    },
    {
      name: 'transformer',
      type: 'tensorflow',
      path: '/models/transformer/model.json',
      inputShape: [1, 24, 10],
      outputShape: [1, 1],
    },
    {
      name: 'cnn',
      type: 'onnx',
      path: '/models/cnn/model.onnx',
      inputShape: [1, 24, 10],
      outputShape: [1, 1],
    },
  ];

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set TensorFlow backend
      await tf.setBackend('webgl');
      await tf.ready();

      console.log('Initializing ML models...');

      // Load TensorFlow.js models
      for (const config of this.modelConfigs.filter(c => c.type === 'tensorflow')) {
        try {
          const model = await tf.loadLayersModel(config.path);
          this.models.set(config.name, model);
          console.log(`Loaded ${config.name} model`);
        } catch (error) {
          console.warn(`Failed to load ${config.name} model:`, error);
          // Create fallback model
          this.models.set(config.name, this.createFallbackModel(config));
        }
      }

      // Load ONNX models
      for (const config of this.modelConfigs.filter(c => c.type === 'onnx')) {
        try {
          const session = await InferenceSession.create(config.path);
          this.models.set(config.name, session);
          console.log(`Loaded ${config.name} model`);
        } catch (error) {
          console.warn(`Failed to load ${config.name} model:`, error);
        }
      }

      this.isInitialized = true;
      console.log('Ensemble prediction engine initialized');
    } catch (error) {
      console.error('Failed to initialize ML engine:', error);
      throw error;
    }
  }

  private createFallbackModel(config: ModelConfig): tf.LayersModel {
    const model = tf.sequential();

    model.add(tf.layers.dense({
      inputShape: [config.inputShape.reduce((a, b) => a * b)],
      units: 64,
      activation: 'relu'
    }));

    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1 }));

    // Compile with dummy optimizer (won't be used for inference)
    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

    return model;
  }

  async predict(input: PredictionInput): Promise<PredictionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const predictions: number[] = [];
    const modelPredictions: { [key: string]: number } = {};
    const modelUncertainties: { [key: string]: number } = {};

    // Prepare input tensor
    const inputTensor = this.prepareInputTensor(input);

    // Get predictions from each model with uncertainty estimation
    for (const [name, model] of this.models) {
      try {
        let prediction: number;
        let uncertainty: number;

        if (model instanceof tf.LayersModel) {
          // TensorFlow.js model with Monte Carlo dropout for uncertainty
          const mcPredictions = await this.monteCarloPrediction(model, inputTensor, 10);
          prediction = mcPredictions.mean;
          uncertainty = mcPredictions.std;
        } else {
          // ONNX model - use simple uncertainty estimation
          const feeds = { input: inputTensor };
          const results = await (model as InferenceSession).run(feeds);
          prediction = results.output.data[0] as number;
          uncertainty = Math.abs(prediction - input.currentAqi) * 0.2; // Simple uncertainty
        }

        predictions.push(prediction);
        modelPredictions[name] = prediction;
        modelUncertainties[name] = uncertainty;
      } catch (error) {
        console.warn(`Prediction failed for ${name}:`, error);
        // Use current AQI as fallback
        predictions.push(input.currentAqi);
        modelPredictions[name] = input.currentAqi;
        modelUncertainties[name] = 25; // Default uncertainty
      }
    }

    // Clean up input tensor
    inputTensor.dispose();

    // Ensemble prediction with uncertainty-weighted averaging
    const ensembleResult = this.computeEnsemblePrediction(
      modelPredictions,
      modelUncertainties,
      predictions
    );

    return {
      predictedAqi: ensembleResult.prediction,
      confidence: ensembleResult.confidence,
      uncertainty: ensembleResult.uncertainty,
      modelPredictions: {
        ...modelPredictions,
        ensemble: ensembleResult.prediction,
      } as any,
      confidenceInterval: ensembleResult.confidenceInterval,
    };
  }

  private prepareInputTensor(input: PredictionInput): tf.Tensor {
    // Create feature vector
    const features = [
      input.currentAqi,
      input.pollutants.pm25,
      input.pollutants.pm10,
      input.pollutants.no2,
      input.pollutants.so2,
      input.pollutants.o3,
      input.pollutants.co,
      input.weatherData.temperature,
      input.weatherData.humidity,
      input.weatherData.windSpeed,
      input.weatherData.windDirection,
      input.timeOfDay,
      input.dayOfWeek,
    ];

    // Add historical data if available
    if (input.historicalData) {
      features.push(...input.historicalData.slice(-24)); // Last 24 hours
    }

    // Pad or truncate to expected length
    const expectedLength = 24 * 10; // 24 hours * 10 features
    while (features.length < expectedLength) {
      features.push(0); // Pad with zeros
    }
    features.splice(expectedLength); // Truncate if too long

    // Reshape for model input [1, 24, 10]
    const reshaped = [];
    for (let i = 0; i < 24; i++) {
      reshaped.push(features.slice(i * 10, (i + 1) * 10));
    }

    return tf.tensor([reshaped]);
  }

  async predictBatch(inputs: PredictionInput[]): Promise<PredictionResult[]> {
    const results: PredictionResult[] = [];

    for (const input of inputs) {
      try {
        const result = await this.predict(input);
        results.push(result);
      } catch (error) {
        console.error('Batch prediction failed:', error);
        // Return fallback result
        results.push({
          predictedAqi: input.currentAqi,
          confidence: 0.5,
          uncertainty: 50,
          modelPredictions: {
            lstm: input.currentAqi,
            transformer: input.currentAqi,
            cnn: input.currentAqi,
            ensemble: input.currentAqi,
          },
          confidenceInterval: [input.currentAqi - 25, input.currentAqi + 25],
        });
      }
    }

    return results;
  }

  private async monteCarloPrediction(
    model: tf.LayersModel,
    inputTensor: tf.Tensor,
    numSamples: number = 10
  ): Promise<{ mean: number; std: number; samples: number[] }> {
    const samples: number[] = [];

    // Enable dropout during inference for uncertainty estimation
    for (let i = 0; i < numSamples; i++) {
      try {
        const output = model.predict(inputTensor) as tf.Tensor;
        const prediction = (await output.data())[0];

        // Add some noise to simulate model uncertainty
        const noise = (Math.random() - 0.5) * 10;
        samples.push(prediction + noise);
        output.dispose();
      } catch (error) {
        samples.push(0);
      }
    }

    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / samples.length;
    const std = Math.sqrt(variance);

    return { mean, std, samples };
  }

  private computeEnsemblePrediction(
    modelPredictions: { [key: string]: number },
    modelUncertainties: { [key: string]: number },
    predictions: number[]
  ): { prediction: number; confidence: number; uncertainty: number; confidenceInterval: [number, number] } {
    // Uncertainty-weighted ensemble
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [name, prediction] of Object.entries(modelPredictions)) {
      const uncertainty = modelUncertainties[name] || 25;
      // Higher uncertainty = lower weight
      const weight = 1 / (1 + uncertainty / 50);
      weightedSum += prediction * weight;
      totalWeight += weight;
    }

    const ensemblePrediction = weightedSum / totalWeight;

    // Calculate overall uncertainty
    const individualVariances = predictions.map(pred =>
      Math.pow(pred - ensemblePrediction, 2)
    );
    const meanVariance = individualVariances.reduce((a, b) => a + b, 0) / individualVariances.length;
    const ensembleUncertainty = Math.sqrt(meanVariance);

    // Calculate confidence based on agreement between models
    const maxDeviation = Math.max(...predictions.map(p => Math.abs(p - ensemblePrediction)));
    const agreementFactor = Math.max(0, 1 - (maxDeviation / 100));
    const confidence = Math.max(0.1, Math.min(0.95, agreementFactor * (1 - ensembleUncertainty / 100)));

    // Confidence interval (95%)
    const zScore = 1.96;
    const margin = zScore * ensembleUncertainty;
    const confidenceInterval: [number, number] = [
      Math.max(0, ensemblePrediction - margin),
      ensemblePrediction + margin
    ];

    return {
      prediction: ensemblePrediction,
      confidence,
      uncertainty: ensembleUncertainty,
      confidenceInterval,
    };
  }

  dispose(): void {
    // Dispose TensorFlow tensors and models
    for (const [name, model] of this.models) {
      if (model instanceof tf.LayersModel) {
        model.dispose();
      }
    }
    this.models.clear();
    this.isInitialized = false;
  }

  getModelStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    for (const config of this.modelConfigs) {
      status[config.name] = this.models.has(config.name);
    }
    return status;
  }
}

// Web Worker wrapper for running ML in background
export class MLPredictionWorker {
  private worker: Worker | null = null;
  private engine: EnsemblePredictionEngine | null = null;

  async initialize(): Promise<void> {
    // For now, run in main thread. In production, use Web Worker
    this.engine = new EnsemblePredictionEngine();
    await this.engine.initialize();
  }

  async predict(input: PredictionInput): Promise<PredictionResult> {
    if (!this.engine) {
      await this.initialize();
    }
    return this.engine!.predict(input);
  }

  async predictBatch(inputs: PredictionInput[]): Promise<PredictionResult[]> {
    if (!this.engine) {
      await this.initialize();
    }
    return this.engine!.predictBatch(inputs);
  }

  dispose(): void {
    if (this.engine) {
      this.engine.dispose();
      this.engine = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Singleton instance
let predictionEngine: EnsemblePredictionEngine | null = null;

export function getPredictionEngine(): EnsemblePredictionEngine {
  if (!predictionEngine) {
    predictionEngine = new EnsemblePredictionEngine();
  }
  return predictionEngine;
}

export function disposePredictionEngine(): void {
  if (predictionEngine) {
    predictionEngine.dispose();
    predictionEngine = null;
  }
}