/**
 * Sentence-BERT-based Embedding Model
 * Computes semantic similarity between student responses and stuck type anchors
 * Uses @xenova/transformers for efficient ONNX-based inference
 */

import { env, pipeline } from "@xenova/transformers";
import type { DiagnosticAnswers, StuckType } from "./types";
import { EMBEDDING_WEIGHTS } from "./weights";

const SBERT_MODEL_ID = process.env.SBERT_MODEL_ID || "Xenova/all-MiniLM-L6-v2";
const SBERT_ALLOW_REMOTE_MODELS =
  process.env.SBERT_ALLOW_REMOTE_MODELS !== "false";
const SBERT_LOCAL_MODEL_PATH = process.env.SBERT_LOCAL_MODEL_PATH;

// Sentence-BERT loading configuration:
// - local models always allowed
// - remote downloads enabled by default unless explicitly disabled
env.allowLocalModels = true;
env.allowRemoteModels = SBERT_ALLOW_REMOTE_MODELS;
if (SBERT_LOCAL_MODEL_PATH) {
  env.localModelPath = SBERT_LOCAL_MODEL_PATH;
}

interface EmbeddingResult {
  data: ArrayLike<number>;
}

type EmbeddingPipeline = (
  input: string,
  options: { pooling: "mean"; normalize: boolean },
) => Promise<EmbeddingResult>;

let modelCache: EmbeddingPipeline | null = null;
let anchorEmbeddingCache: Record<StuckType, number[][]> | null = null;

/**
 * Load Sentence-BERT model (cached)
 * Uses the all-MiniLM-L6-v2 model via @xenova/transformers
 */
async function loadModel() {
  if (!modelCache) {
    console.log(`Loading Sentence-BERT model: ${SBERT_MODEL_ID}...`);
    try {
      const loadedModel = await pipeline("feature-extraction", SBERT_MODEL_ID);
      modelCache = loadedModel as unknown as EmbeddingPipeline;
      console.log(" Sentence-BERT model loaded successfully");
    } catch (error) {
      console.error(
        ` Failed to load Sentence-BERT model (allowRemoteModels=${SBERT_ALLOW_REMOTE_MODELS}):`,
        error,
      );
      throw error;
    }
  }
  return modelCache;
}

async function loadAnchorEmbeddings(
  model: EmbeddingPipeline,
): Promise<Record<StuckType, number[][]>> {
  if (anchorEmbeddingCache) {
    return anchorEmbeddingCache;
  }

  const cache: Record<StuckType, number[][]> = {
    confusion: [],
    ambiguity: [],
    fear: [],
    overwhelm: [],
    exhaustion: [],
    perfection_loop: [],
  };

  for (const [stuckType, anchors] of Object.entries(
    STUCK_TYPE_ANCHORS,
  ) as [StuckType, string[]][]) {
    for (const anchor of anchors) {
      const anchorResult = await model(anchor, {
        pooling: "mean",
        normalize: true,
      });
      cache[stuckType].push(Array.from(anchorResult.data) as number[]);
    }
  }

  anchorEmbeddingCache = cache;
  return anchorEmbeddingCache;
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
 * This vector captures the semantic/emotional essence of their responses
 */
export async function computeEmbeddingVector(
  answers: DiagnosticAnswers,
): Promise<number[]> {
  try {
    const model = await loadModel();

    // Combine all answers into single text
    const studentText = Object.values(answers)
      .filter(Boolean)
      .join(" ");

    // Embed student response using Sentence-BERT
    const result = await model(studentText, {
      pooling: "mean",
      normalize: true,
    });

    // Extract embedding vector from result
    const studentVec = Array.from(result.data) as number[];

    console.log(` Computed embedding vector with ${studentVec.length} dimensions`);
    return studentVec;
  } catch (e) {
    console.error(` Unable to load model: ${e instanceof Error ? e.message : String(e)}`);
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
    const model = await loadModel();
    const anchorEmbeddings = await loadAnchorEmbeddings(model);

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

    console.log(` Computed embedding scores for all stuck types`);
    // Normalize scores
    return normalizeScores(scores);
  } catch (e) {
    console.error(` Unable to load model: ${e instanceof Error ? e.message : String(e)}`);
    throw e;
  }
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
 * Normalize scores to 0-1 range using min-max normalization
 */
function normalizeScores(
  scores: Record<StuckType, number>,
): Record<StuckType, number> {
  const maxScore = Math.max(...Object.values(scores));
  const minScore = Math.min(...Object.values(scores));
  const range = maxScore - minScore || 1;

  const normalized = Object.entries(scores).reduce(
    (acc, [type, score]) => {
      acc[type as StuckType] = (score - minScore) / range;
      return acc;
    },
    {} as Record<StuckType, number>,
  );

  return normalized;
}

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

  // Re-normalize after boosts
  return normalizeScores(boosted);
}

/**
 * Get detailed similarity breakdown for transparency and debugging
 * Shows how similar student response is to each anchor statement
 */
export async function getEmbeddingSimilarityBreakdown(
  answers: DiagnosticAnswers,
): Promise<Record<StuckType, { anchors: string[]; similarities: number[] }>> {
  const model = await loadModel();
  const anchorEmbeddings = await loadAnchorEmbeddings(model);
  const studentText = Object.values(answers)
    .filter(Boolean)
    .join(" ");

  const studentResult = await model(studentText, {
    pooling: "mean",
    normalize: true,
  });
  const studentVec = Array.from(studentResult.data) as number[];

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
