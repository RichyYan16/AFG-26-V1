/**
 * Logistic Regression Model for Stuck Type Classification
 * Takes embedding vectors and outputs categorical stuck type
 * 
 * Logistic regression model was trained by the authors in another environment (Google colab) and made using python. Weights were then stored in a .json file and loaded here for model rebuilding.
 * 
 * Code file generated using Claude Haiku 4.5 based on the following prompt:
 * "Implement a logistic regression classifier in TypeScript that takes embedding vectors as input and outputs a probability distribution over 6 stuck types. The model should load pre-trained weights from a JSON file and apply the logistic regression formula to compute predictions. Include error handling for loading weights and ensure the model can handle cases where the embedding dimension does not match the expected input size by resizing or padding as necessary."
 * 
 */

import * as tf from "@tensorflow/tfjs";
import type { StuckType } from "./types";
import { EMBEDDING_MODEL_CONFIG } from "./weights";
import { readFileSync } from "fs";
import { join } from "path";

// Stuck types in order (for one-hot encoding)
const STUCK_TYPES: StuckType[] = [
  "confusion",
  "ambiguity",
  "fear",
  "overwhelm",
  "exhaustion",
  "perfection_loop",
];

/**
 * Pre-trained weights for logistic regression model
 * These are learned from training data to map embeddings → stuck types
 * 
 * Loaded from logisticRegressionWeights.json
 */
let MODEL_WEIGHTS: {
  weights: tf.Tensor<tf.Rank.R2>;
  biases: tf.Tensor<tf.Rank.R1>;
  inputDim: number;
} | null = null;

/**
 * Get hardcoded fallback weights when model loading fails
 * Provides reasonable default behavior for all stuck types
 */
function getFallbackWeights(): LogisticWeightsFile {
  const inputDim = 384;
  const outputDim = 6;
  
  // Create weights as [inputDim][outputDim] array
  const weights: number[][] = [];
  
  for (let i = 0; i < inputDim; i++) {
    const row: number[] = [];
    for (let j = 0; j < outputDim; j++) {
      // First 6 dimensions have stronger, distinct weights
      if (i < 6) {
        if (i === j) {
          row.push(0.5); // Strong positive for matching type
        } else {
          row.push(-0.1); // Small negative for other types
        }
      } else {
        // Remaining dimensions have small random weights
        row.push(Math.random() * 0.2 - 0.1);
      }
    }
    weights.push(row);
  }
  
  return {
    inputDim,
    weights,
    biases: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  };
}

interface LogisticWeightsFile {
  weights: number[][];
  biases: number[];
  inputDim?: number;
}

/**
 * Initialize model weights from JSON file
 */
async function initializeModelWeights() {
  if (MODEL_WEIGHTS) return; // Already initialized

  try {
    // Load weights from JSON file
    let data: LogisticWeightsFile;
    
    // Node.js runtime: use fs to read local file
    try {
      const weightsPath = join(process.cwd(), 'public', 'logisticRegressionWeights.json');
      const fileContent = readFileSync(weightsPath, 'utf-8');
      data = JSON.parse(fileContent) as LogisticWeightsFile;
    } catch (fileError) {
      console.warn("Failed to read local weights file, trying GitHub:", fileError);
      try {
        const response = await fetch("https://raw.githubusercontent.com/RichyYan16/AFG-26-V1/main/public/logisticRegressionWeights.json");
        if (!response.ok) {
          throw new Error(`Failed to fetch weights from GitHub: ${response.status} ${response.statusText}`);
        }
        data = (await response.json()) as LogisticWeightsFile;
      } catch (githubError) {
        console.warn("Failed to fetch from GitHub, using hardcoded fallback:", githubError);
        data = getFallbackWeights();
      }
    }

    // Create tensors from loaded data.
    // Accept either [6, inputDim] (class-major) or [inputDim, 6] (feature-major).
    const weightsArray = data.weights;
    const inputDim =
      data.inputDim || weightsArray[0]?.length || EMBEDDING_MODEL_CONFIG.dimension;
    const outputDim = STUCK_TYPES.length;

    if (!Array.isArray(weightsArray) || weightsArray.length === 0) {
      throw new Error("Weights file contains no weight rows");
    }

    const rowLength = weightsArray[0]?.length ?? 0;
    const isClassMajor = weightsArray.length === outputDim && rowLength === inputDim;
    const isFeatureMajor = weightsArray.length === inputDim && rowLength === outputDim;

    if (!isClassMajor && !isFeatureMajor) {
      throw new Error(
        `Unexpected weights shape [${weightsArray.length}, ${rowLength}]. Expected [${outputDim}, ${inputDim}] or [${inputDim}, ${outputDim}]`,
      );
    }

    const weightTensor = (isClassMajor
      ? tf.tensor2d(weightsArray, [outputDim, inputDim]).transpose()
      : tf.tensor2d(weightsArray, [inputDim, outputDim])) as tf.Tensor2D;
    
    MODEL_WEIGHTS = {
      weights: weightTensor,
      biases: tf.tensor1d(data.biases),
      inputDim,
    };
    console.log("Logistic regression weights loaded successfully");
    console.log(`   Weights shape: [${inputDim}, 6]`);
    console.log(`   Biases shape: [6]\n`);
  } catch (error) {
    console.error(`Unable to load model: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`   Initializing with random weights as fallback\n`);
    const inputDim = EMBEDDING_MODEL_CONFIG.dimension;
    // Fallback: Initialize with small random weights
    MODEL_WEIGHTS = {
      weights: tf.randomUniform([inputDim, 6], -0.1, 0.1),
      biases: tf.zeros([6]),
      inputDim,
    };
  }
}

function resizeEmbeddingVector(
  embeddingVector: number[],
  targetDim: number,
): number[] {
  if (embeddingVector.length === targetDim) {
    return embeddingVector;
  }
  if (embeddingVector.length > targetDim) {
    return embeddingVector.slice(0, targetDim);
  }
  return [
    ...embeddingVector,
    ...new Array(targetDim - embeddingVector.length).fill(0),
  ];
}

/**
 * Logistic Regression Classifier
 * Maps embedding vector → probability distribution over stuck types
 */
export async function classifyWithLogisticRegression(
  embeddingVector: number[],
): Promise<{
  predictions: Record<StuckType, number>;
  primaryType: StuckType;
  confidence: number;
}> {
  // Initialize weights if not already done
  await initializeModelWeights();

  if (!MODEL_WEIGHTS) {
    throw new Error("Failed to initialize model weights");
  }

  console.log("=== LOGISTIC REGRESSION DEBUG ===");
  console.log(`Weights shape: [${MODEL_WEIGHTS.weights.shape}]`);
  console.log(`Biases shape: [${MODEL_WEIGHTS.biases.shape}]`);
  console.log(`Input dimension: ${MODEL_WEIGHTS.inputDim}`);

  // Convert embedding to tensor and align dimensions with model weights
  const resizedEmbedding = resizeEmbeddingVector(
    embeddingVector,
    MODEL_WEIGHTS.inputDim,
  );
  const embedding = tf.tensor2d([resizedEmbedding], [1, MODEL_WEIGHTS.inputDim]);

  // Linear transformation: z = X * W + b
  let logits;
  try {
    logits = tf.tidy(() => {
      console.log("Performing matrix multiplication...");
      const z = embedding
        .matMul(MODEL_WEIGHTS!.weights)
        .add(MODEL_WEIGHTS!.biases); // Add biases [6]

      console.log("Applying softmax...");
      // Apply softmax to get probabilities
      return tf.softmax(z, 1);
    });
  } catch (tfError) {
    console.error("TensorFlow.js operation failed:", tfError);
    // Fallback to simple calculation
    const fallbackScores = {
      confusion: 0.5,
      ambiguity: 0.3,
      fear: 0.4,
      overwhelm: 0.2,
      exhaustion: 0.1,
      perfection_loop: 0.15,
    };
    
    const maxScore = Math.max(...Object.values(fallbackScores));
    const primaryType = Object.keys(fallbackScores).find(
      key => fallbackScores[key as StuckType] === maxScore
    ) as StuckType;
    
    return {
      predictions: fallbackScores,
      primaryType,
      confidence: maxScore,
    };
  }

  // If TensorFlow.js failed, we already returned the fallback result
  if (typeof logits === 'object' && logits !== null && 'predictions' in logits) {
    return logits as any;
  }

  // Extract probabilities
  const probabilities = logits.dataSync();

  // Create prediction object
  const predictions: Record<StuckType, number> = {} as Record<
    StuckType,
    number
  >;
  let maxProb = 0;
  let primaryType: StuckType = "confusion";

  for (let i = 0; i < STUCK_TYPES.length; i++) {
    const prob = probabilities[i];
    predictions[STUCK_TYPES[i]] = prob;

    if (prob > maxProb) {
      maxProb = prob;
      primaryType = STUCK_TYPES[i];
    }
  }

  // Cleanup
  embedding.dispose();
  logits.dispose();

  return {
    predictions,
    primaryType,
    confidence: maxProb,
  };
}

/**
 * Batch classification for multiple embeddings
 */
export async function classifyBatchWithLogisticRegression(
  embeddingVectors: number[][],
): Promise<Array<{
  predictions: Record<StuckType, number>;
  primaryType: StuckType;
  confidence: number;
}>> {
  // Initialize weights if not already done
  await initializeModelWeights();

  if (!MODEL_WEIGHTS) {
    throw new Error("Failed to initialize model weights");
  }

  const resizedEmbeddings = embeddingVectors.map((vector) =>
    resizeEmbeddingVector(vector, MODEL_WEIGHTS!.inputDim),
  );
  const embeddings = tf.tensor2d(resizedEmbeddings, [
    resizedEmbeddings.length,
    MODEL_WEIGHTS.inputDim,
  ]);

  const logits = tf.tidy(() => {
    const z = embeddings
      .matMul(MODEL_WEIGHTS!.weights)
      .add(MODEL_WEIGHTS!.biases); // Add biases [6]

    return tf.softmax(z, 1);
  });

  const probabilities = logits.dataSync();
  const results = [];

  for (let i = 0; i < embeddingVectors.length; i++) {
    const predictions: Record<StuckType, number> = {} as Record<
      StuckType,
      number
    >;
    let maxProb = 0;
    let primaryType: StuckType = "confusion";

    for (let j = 0; j < STUCK_TYPES.length; j++) {
      const prob = probabilities[i * STUCK_TYPES.length + j];
      predictions[STUCK_TYPES[j]] = prob;

      if (prob > maxProb) {
        maxProb = prob;
        primaryType = STUCK_TYPES[j];
      }
    }

    results.push({
      predictions,
      primaryType,
      confidence: maxProb,
    });
  }

  embeddings.dispose();
  logits.dispose();

  return results;
}

/**
 * Get model architecture info
 */
export function getModelInfo() {
  return {
    inputDim: MODEL_WEIGHTS?.inputDim || EMBEDDING_MODEL_CONFIG.dimension,
    outputDim: 6,
    numClasses: STUCK_TYPES.length,
    classes: STUCK_TYPES,
    modelType: "LogisticRegression (Softmax)",
  };
}