/**
 * Sentence-BERT MiniLM-L6-v2 - Embedding Model
 * Computes semantic similarity between student responses and stuck type anchors
 * Uses @xenova/transformers with TensorFlow.js backend
 * 
 * Sentence-BERT MiniLM-L6-v2 (384-dimensional):
 * - Fast and efficient semantic embeddings
 * - Good at capturing semantic similarity for educational content
 * - Optimized for performance and accuracy
 * - 384 dimensions for efficient processing
 * 
 * Boilerplate code generated using Claude Haiku 4.5 based on the following prompt:
 * "Implement boilerplate code for a word embedding module in TypeScript that uses the Sentence-BERT MiniLM-L6-v2 model to compute semantic similarity between student responses and prototypical stuck type statements. The module should load the embedding model, compute embedding vectors for student answers, and calculate similarity scores to reference anchor statements for each stuck type. Include error handling for model loading and embedding computation, and ensure the module can handle cases where the input text is empty or invalid."
 */

import type { DiagnosticAnswers, StuckType } from "./types";
import { EMBEDDING_WEIGHTS } from "./weights";
import { pipeline, env } from "@xenova/transformers";

// Configure environment for TensorFlow backend
env.allowLocalModels = true;
env.allowRemoteModels = true;

let embeddingModel: any = null;
let anchorEmbeddingCache: Record<StuckType, number[][]> | null = null;

/**
 * Load the Sentence-BERT MiniLM-L6-v2 embedding model (384-dimensional)
 */
async function loadModel() {
  if (embeddingModel) {
    return embeddingModel;
  }

  try {
    embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    return embeddingModel;
  } catch (error) {
    throw new Error(`Failed to load embedding model: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Load anchor embeddings using the Sentence-BERT MiniLM-L6-v2 model
 * These are pre-computed embeddings for each stuck type category
 * MiniLM embeddings (384-dim) provide good semantic similarity for educational content
 */
async function loadAnchorEmbeddings(): Promise<Record<StuckType, number[][]>> {
  if (anchorEmbeddingCache) {
    return anchorEmbeddingCache;
  }

  const model = await loadModel();

  const cache: Record<StuckType, number[][]> = {
    confusion: [],
    ambiguity: [],
    fear: [],
    overwhelm: [],
    exhaustion: [],
    perfection_loop: [],
  };

  try {
    // Add timeout for anchor processing (5 seconds)
    const anchorProcessingPromise = (async () => {
      for (const [stuckType, anchors] of Object.entries(
        STUCK_TYPE_ANCHORS,
      ) as [StuckType, string[]][]) {
        for (const anchor of anchors) {
          try {
            const result = await model(anchor, {
              pooling: "mean",
              normalize: true,
            });
            
            if (!result || !result.data) {
              continue;
            }
            
            cache[stuckType].push(Array.from(result.data) as number[]);
          } catch (error) {
            // Continue with other anchors
          }
        }
      }
      return cache;
    })();
    
    const timeoutPromise = new Promise<Record<StuckType, number[][]>>((_, reject) => 
      setTimeout(() => reject(new Error('Anchor embedding processing timeout')), 5000)
    );
    
    const result = await Promise.race([anchorProcessingPromise, timeoutPromise]);
    anchorEmbeddingCache = result;
    return anchorEmbeddingCache;
  } catch (error) {
    throw new Error(`Failed to load anchor embeddings: ${error}`);
  }
}

/**
 * Reference anchor statements for each stuck type
 * These represent prototypical expressions of each type
 */
const STUCK_TYPE_ANCHORS: Record<StuckType, string[]> = {
  confusion: [
    "I don't understand what the assignment is asking for",
    "I'm confused about the concepts",
    "I don't know where to start",
    "I'm re-reading the material but it still doesn't make sense",
    "What does this question even mean?",
    "I don't get it",
    "This is unclear to me",
  ],
  ambiguity: [
    "The requirements are unclear to me",
    "I don't know what done looks like",
    "The rubric doesn't specify what counts",
    "It's vague what the teacher wants",
    "I'm unsure about the success criteria",
    "What exactly are they asking for?",
    "The requirements are ambiguous",
  ],
  fear: [
    "I'm terrified of failing this assignment",
    "My grade will be ruined if I submit this",
    "I'm anxious about what the professor will think",
    "What if I get it completely wrong?",
    "I'm scared this won't be good enough",
    "I'm worried about judgment",
    "What if I fail?",
  ],
  overwhelm: [
    "This assignment is way too much for me",
    "There are so many parts I don't know where to begin",
    "I feel paralyzed by how much work this is",
    "I'm frozen because it's so big",
    "Everything feels impossible right now",
    "It's too much to handle",
    "I'm drowning in work",
  ],
  exhaustion: [
    "I'm too tired to think about this",
    "I feel emotionally drained and numb",
    "I have no energy left for this work",
    "My brain is fried, I can't focus",
    "I feel burnt out and empty",
    "I'm just drained",
    "I can't think straight anymore",
  ],
  perfection_loop: [
    "This doesn't feel good enough to submit",
    "I keep editing because it's not perfect",
    "I can't submit rough work, it needs to be flawless",
    "Nothing I write is good enough",
    "I'm stuck rewriting the same thing over and over",
    "It has to be perfect",
    "I can't submit something imperfect",
  ],
} as const;

/**
 * Compute raw embedding vector from student answers
 * Returns the 384-dimensional vector representation [a, b, c, ...]
 * This vector captures the semantic essence of their responses
 * MiniLM embeddings provide good semantic similarity for educational content
 */
export async function computeEmbeddingVector(
  answers: DiagnosticAnswers,
): Promise<number[]> {
  try {
    const model = await loadModel();

    if (!answers || typeof answers !== 'object') {
      throw new Error('Invalid answers: must be a valid object');
    }

    const studentText = Object.values(answers)
      .filter(Boolean)
      .join(" ");

    if (!studentText.trim()) {
      throw new Error('No valid text found in answers for embedding');
    }

    const result = await model(studentText, {
      pooling: "mean",
      normalize: true,
    });

    if (!result || !result.data) {
      throw new Error('Invalid model result: result or result.data is null/undefined');
    }

    const studentVec = Array.from(result.data) as number[];

    if (!studentVec || studentVec.length === 0) {
      throw new Error('Invalid embedding vector: empty or null');
    }

    return studentVec;
  } catch (e) {
    throw e;
  }
}

/**
 * Compute embedding scores for all stuck types based on student answers
 * Uses the raw embedding vector [a, b, c, ...] to compute similarity
 * Returns normalized similarity scores (0-1) for each type
 */
export async function computeEmbeddingScores(
  answers: DiagnosticAnswers,
): Promise<Record<StuckType, number>> {
  try {
    await loadModel(); // Ensure model is loaded
    const anchorEmbeddings = await loadAnchorEmbeddings();

    // Get raw embedding vector
    const studentVec = await computeEmbeddingVector(answers);

    const scores: Record<StuckType, number> = {
      confusion: 0,
      ambiguity: 0,
      fear: 0,
      overwhelm: 0,
      exhaustion: 0,
      perfection_loop: 0,
    };

    // For each stuck type, compute similarity to anchor statements
    for (const [stuckType] of Object.entries(
      STUCK_TYPE_ANCHORS,
    ) as [StuckType, string[]][]) {
      let typeScore = 0;
      const anchorVectors = anchorEmbeddings[stuckType];

      // Average similarity across all anchors for this type
      for (const anchorVec of anchorVectors) {
        const similarity = cosineSimilarity(studentVec, anchorVec);
        typeScore += similarity;
      }

      scores[stuckType] = typeScore / anchorVectors.length;
    }

    // Apply softmax normalization to ensure scores sum to 1 (100%)
    return normalizeWithSoftmax(scores);
  } catch (e) {
    throw e;
  }
}

// ... (rest of the code remains the same)
/**
 * Apply behavioral signal boosts to embedding scores
 * E.g., "rereading" behavior boosts confusion score
 */
export function applyBehavioralSignalBoosts(
  scores: Record<StuckType, number>,
  signals: {
    rereading?: boolean;
    tabSwitching?: boolean;
    excessiveEditing?: boolean;
    physicalHeaviness?: boolean;
    repeatedStartStop?: boolean;
    procrastination?: boolean;
  },
): Record<StuckType, number> {
  const boosted = { ...scores };

  const signalMap: Record<string, StuckType> = {
    rereading: "confusion",
    tabSwitching: "overwhelm",
    excessiveEditing: "perfection_loop",
    physicalHeaviness: "exhaustion",
    repeatedStartStop: "fear",
    procrastination: "overwhelm",
  };

  for (const [signal, stuckType] of Object.entries(signalMap)) {
    if (signals[signal as keyof typeof signals]) {
      const boost = EMBEDDING_WEIGHTS[stuckType].boostMultiplier;
      boosted[stuckType] *= boost;
    }
  }

  // Apply softmax normalization to ensure scores sum to 1 (100%)
  return normalizeWithSoftmax(boosted);
}

/**
 * Compute cosine similarity between two vectors
 * Returns value between -1 and 1 (typically 0-1 for embeddings)
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Apply softmax normalization to ensure scores sum to 1 (100%)
 * This maintains the probabilistic interpretation while allowing boosts
 */
function normalizeWithSoftmax(
  scores: Record<StuckType, number>,
): Record<StuckType, number> {
  const values = Object.values(scores);
  const maxVal = Math.max(...values);
  
  // Subtract max for numerical stability
  const expValues = values.map(v => Math.exp(v - maxVal));
  const sumExp = expValues.reduce((sum, val) => sum + val, 0);
  
  const normalized: Record<StuckType, number> = {} as Record<StuckType, number>;
  const types = Object.keys(scores) as StuckType[];
  
  for (let i = 0; i < types.length; i++) {
    normalized[types[i]] = expValues[i] / sumExp;
  }
  
  return normalized;
}

/**
 * Get detailed similarity breakdown for transparency and debugging
 * Shows how similar student response is to each anchor statement
 */
export async function getEmbeddingSimilarityBreakdown(
  answers: DiagnosticAnswers,
): Promise<Record<StuckType, { anchors: string[]; similarities: number[] }>> {
  const model = await loadModel();
  const anchorEmbeddings = await loadAnchorEmbeddings();
  const studentText = Object.values(answers)
    .filter(Boolean)
    .join(" ");

  const result = await model(studentText, {
    pooling: "mean",
    normalize: true,
  });
  const studentVec = Array.from(result.data) as number[];

const breakdown: Record<
  StuckType,
  { anchors: string[]; similarities: number[] }
> = {
  confusion: { anchors: [], similarities: [] },
  ambiguity: { anchors: [], similarities: [] },
  fear: { anchors: [], similarities: [] },
  overwhelm: { anchors: [], similarities: [] },
  exhaustion: { anchors: [], similarities: [] },
  perfection_loop: { anchors: [], similarities: [] },
};

for (const [stuckType, anchors] of Object.entries(
  STUCK_TYPE_ANCHORS,
) as [StuckType, string[]][]) {
  breakdown[stuckType].anchors = anchors;
  const anchorVectors = anchorEmbeddings[stuckType];
  for (const anchorVec of anchorVectors) {
    const similarity = cosineSimilarity(studentVec, anchorVec);
    breakdown[stuckType].similarities.push(similarity);
  }
}

return breakdown;
}