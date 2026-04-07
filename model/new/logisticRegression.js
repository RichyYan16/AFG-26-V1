"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Logistic Regression Model for Stuck Type Classification
 * Takes embedding vectors (512-dim from USE) and outputs categorical stuck type
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyWithLogisticRegression = classifyWithLogisticRegression;
exports.classifyBatchWithLogisticRegression = classifyBatchWithLogisticRegression;
exports.getModelInfo = getModelInfo;
const tf = __importStar(require("@tensorflow/tfjs"));
// Stuck types in order (for one-hot encoding)
const STUCK_TYPES = [
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
let MODEL_WEIGHTS = null;
/**
 * Initialize model weights from JSON file
 */
async function initializeModelWeights() {
    if (MODEL_WEIGHTS)
        return; // Already initialized
    try {
        // Load weights from JSON file
        let data;
        // Check if running in Node.js by checking for require/process/global
        const isNode = typeof globalThis !== "undefined" &&
            typeof globalThis.process !== "undefined" &&
            globalThis.process.versions &&
            globalThis.process.versions.node;
        if (isNode) {
            // Node.js: use file system
            const fs = await Promise.resolve().then(() => __importStar(require("fs/promises")));
            const path = await Promise.resolve().then(() => __importStar(require("path")));
            const weightsPath = path.join(process.cwd(), "public", "logisticRegressionWeights.json");
            const fileContent = await fs.readFile(weightsPath, "utf-8");
            data = JSON.parse(fileContent);
        }
        else {
            // Browser: use fetch
            const response = await fetch("/logisticRegressionWeights.json");
            if (!response.ok) {
                throw new Error(`Failed to fetch weights: ${response.status} ${response.statusText}`);
            }
            data = await response.json();
        }
        // Create tensors from loaded data
        // Reshape weights from [6, 512] to [512, 6] (row-major to column-major)
        const weightsArray = data.weights;
        const flatWeights = weightsArray.flat(); // Flatten to 1D
        MODEL_WEIGHTS = {
            weights: tf.tensor2d(flatWeights, [512, 6]),
            biases: tf.tensor1d(data.biases),
        };
        console.log("✅ Logistic regression weights loaded successfully");
        console.log(`   Weights shape: [512, 6]`);
        console.log(`   Biases shape: [6]\n`);
    }
    catch (error) {
        console.error(`❌ Unable to load model: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`   Initializing with random weights as fallback\n`);
        // Fallback: Initialize with small random weights
        MODEL_WEIGHTS = {
            weights: tf.randomUniform([512, 6], -0.1, 0.1),
            biases: tf.zeros([6]),
        };
    }
}
/**
 * Logistic Regression Classifier
 * Maps embedding vector → probability distribution over stuck types
 */
async function classifyWithLogisticRegression(embeddingVector) {
    // Initialize weights if not already done
    await initializeModelWeights();
    if (!MODEL_WEIGHTS) {
        throw new Error("Failed to initialize model weights");
    }
    // Convert embedding to tensor
    const embedding = tf.tensor2d([embeddingVector]); // [1, 512]
    // Linear transformation: z = X * W + b
    const logits = tf.tidy(() => {
        const z = embedding
            .matMul(MODEL_WEIGHTS.weights) // [1, 512] * [512, 6] = [1, 6]
            .add(MODEL_WEIGHTS.biases); // Add biases [6]
        // Apply softmax to get probabilities
        return tf.softmax(z, 1);
    });
    // Extract probabilities
    const probabilities = logits.dataSync();
    // Create prediction object
    const predictions = {};
    let maxProb = 0;
    let primaryType = "confusion";
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
async function classifyBatchWithLogisticRegression(embeddingVectors) {
    // Initialize weights if not already done
    await initializeModelWeights();
    if (!MODEL_WEIGHTS) {
        throw new Error("Failed to initialize model weights");
    }
    const embeddings = tf.tensor2d(embeddingVectors); // [n, 512]
    const logits = tf.tidy(() => {
        const z = embeddings
            .matMul(MODEL_WEIGHTS.weights) // [n, 512] * [512, 6] = [n, 6]
            .add(MODEL_WEIGHTS.biases); // Add biases [6]
        return tf.softmax(z, 1);
    });
    const probabilities = logits.dataSync();
    const results = [];
    for (let i = 0; i < embeddingVectors.length; i++) {
        const predictions = {};
        let maxProb = 0;
        let primaryType = "confusion";
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
function getModelInfo() {
    return {
        inputDim: 512,
        outputDim: 6,
        numClasses: STUCK_TYPES.length,
        classes: STUCK_TYPES,
        modelType: "LogisticRegression (Softmax)",
    };
}
