// ML Prediction Web Worker
// This runs the ensemble prediction engine in a separate thread

import * as tf from '@tensorflow/tfjs';
import { InferenceSession } from 'onnxruntime-web';
import { expose } from 'comlink';

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

class MLWorkerEngine {
  private models: Map<string, any> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set TensorFlow backend for Web Worker
      await tf.setBackend('cpu'); // Use CPU backend in worker
      await tf.ready();

      console.log('ML Worker: Initializing models...');

      // Initialize with simple models for demo
      // In production, load actual trained models
      this.createSimpleModels();

      this.isInitialized = true;
      console.log('ML Worker: Initialization complete');
    } catch (error) {
      console.error('ML Worker: Initialization failed:', error);
      throw error;
    }
  }

  private createSimpleModels(): void {
    // LSTM-like model
    const lstmModel = tf.sequential();
    lstmModel.add(tf.layers.dense({ inputShape: [13], units: 32, activation: 'relu' }));
    lstmModel.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    lstmModel.add(tf.layers.dense({ units: 1 }));
    lstmModel.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    this.models.set('lstm', lstmModel);

    // Transformer-like model
    const transformerModel = tf.sequential();
    transformerModel.add(tf.layers.dense({ inputShape: [13], units: 64, activation: 'relu' }));
    transformerModel.add(tf.layers.dropout({ rate: 0.2 }));
    transformerModel.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    transformerModel.add(tf.layers.dense({ units: 1 }));
    transformerModel.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    this.models.set('transformer', transformerModel);

    // CNN-like model
    const cnnModel = tf.sequential();
    cnnModel.add(tf.layers.dense({ inputShape: [13], units: 48, activation: 'relu' }));
    cnnModel.add(tf.layers.dense({ units: 24, activation: 'relu' }));
    cnnModel.add(tf.layers.dense({ units: 1 }));
    cnnModel.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    this.models.set('cnn', cnnModel);
  }

  async predict(input: PredictionInput): Promise<PredictionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const predictions: number[] = [];
    const modelPredictions: { [key: string]: number } = {};

    // Prepare input features
    const features = this.prepareFeatures(input);
    const inputTensor = tf.tensor2d([features]);

    // Get predictions from each model
    for (const [name, model] of this.models) {
      try {
        const output = model.predict(inputTensor) as tf.Tensor;
        const prediction = (await output.data())[0];

        // Add some randomization to simulate different model behaviors
        const randomFactor = 0.9 + Math.random() * 0.2;
        const adjustedPrediction = prediction * randomFactor;

        predictions.push(adjustedPrediction);
        modelPredictions[name] = adjustedPrediction;

        output.dispose();
      } catch (error) {
        console.warn(`ML Worker: Prediction failed for ${name}:`, error);
        predictions.push(input.currentAqi);
        modelPredictions[name] = input.currentAqi;
      }
    }

    inputTensor.dispose();

    // Ensemble prediction
    const ensemblePrediction = predictions.reduce((a, b) => a + b, 0) / predictions.length;

    // Calculate uncertainty
    const variance = predictions.reduce((acc, pred) =>
      acc + Math.pow(pred - ensemblePrediction, 2), 0) / predictions.length;
    const uncertainty = Math.sqrt(variance);
    const confidence = Math.max(0.1, Math.min(0.95, 1 - (uncertainty / 100)));

    // Confidence interval
    const margin = 1.96 * uncertainty;
    const confidenceInterval: [number, number] = [
      Math.max(0, ensemblePrediction - margin),
      ensemblePrediction + margin
    ];

    return {
      predictedAqi: ensemblePrediction,
      confidence,
      uncertainty,
      modelPredictions: {
        lstm: modelPredictions.lstm || input.currentAqi,
        transformer: modelPredictions.transformer || input.currentAqi,
        cnn: modelPredictions.cnn || input.currentAqi,
        ensemble: ensemblePrediction,
      },
      confidenceInterval,
    };
  }

  async predictBatch(inputs: PredictionInput[]): Promise<PredictionResult[]> {
    const results: PredictionResult[] = [];

    for (const input of inputs) {
      try {
        const result = await this.predict(input);
        results.push(result);
      } catch (error) {
        console.error('ML Worker: Batch prediction failed:', error);
        results.push(this.createFallbackResult(input));
      }
    }

    return results;
  }

  private prepareFeatures(input: PredictionInput): number[] {
    return [
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
  }

  private createFallbackResult(input: PredictionInput): PredictionResult {
    return {
      predictedAqi: input.currentAqi,
      confidence: 0.5,
      uncertainty: 25,
      modelPredictions: {
        lstm: input.currentAqi,
        transformer: input.currentAqi,
        cnn: input.currentAqi,
        ensemble: input.currentAqi,
      },
      confidenceInterval: [input.currentAqi - 25, input.currentAqi + 25],
    };
  }

  dispose(): void {
    for (const [name, model] of this.models) {
      if (model && typeof model.dispose === 'function') {
        model.dispose();
      }
    }
    this.models.clear();
    this.isInitialized = false;
  }

  getStatus(): { initialized: boolean; models: string[] } {
    return {
      initialized: this.isInitialized,
      models: Array.from(this.models.keys()),
    };
  }
}

// Expose the class to the main thread
const mlWorker = new MLWorkerEngine();
expose(mlWorker);

// Also export for direct use if needed
export default mlWorker;
export type { PredictionInput, PredictionResult };