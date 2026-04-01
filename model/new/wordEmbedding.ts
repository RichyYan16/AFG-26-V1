/**
 * Word2Vec/Universal Sentence Encoder-based Embedding Model
 * Computes semantic similarity between student responses and stuck type anchors
 */

import * as use from "@tensorflow-models/universal-sentence-encoder";
import type { DiagnosticAnswers, StuckType } from "./types";
import { EMBEDDING_WEIGHTS } from "./weights";

let modelCache: any = null;

/**
 * Load Universal Sentence Encoder model (cached)
 */
async function loadModel() {
  if (!modelCache) {
    modelCache = await use.load();
  }
  return modelCache;
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
 * Returns the 512-dimensional vector representation [a, b, c, ...]
 * This vector captures the semantic/emotional essence of their responses
 */
export async function computeEmbeddingVector(
  answers: DiagnosticAnswers,
): Promise<number[]> {
  const model = await loadModel();

  // Combine all answers into single text
  const studentText = Object.values(answers)
    .filter(Boolean)
    .join(" ");

  // Embed student response
  const studentEmbedding = await model.embed([studentText]);
  const studentVector = await studentEmbedding.array();
  const studentVec = studentVector[0] as number[];

  return studentVec;
}

/**
 * Compute embedding scores for all stuck types based on student answers
 * Uses the raw embedding vector [a, b, c, ...] to compute similarity
 * Returns normalized similarity scores (0-1) for each type
 */
export async function computeEmbeddingScores(
  answers: DiagnosticAnswers,
): Promise<Record<StuckType, number>> {
  const model = await loadModel();

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
  for (const [stuckType, anchors] of Object.entries(
    STUCK_TYPE_ANCHORS,
  ) as [StuckType, string[]][]) {
    const anchorEmbeddings = await model.embed(anchors);
    const anchorVectors = await anchorEmbeddings.array();

    let typeScore = 0;

    // Average similarity across all anchors for this type
    for (let i = 0; i < anchors.length; i++) {
      const anchorVec = anchorVectors[i] as number[];
      const similarity = cosineSimilarity(studentVec, anchorVec);
      typeScore += similarity;
    }

    scores[stuckType] = typeScore / anchors.length;
  }

  // Normalize scores
  return normalizeScores(scores);
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
  const studentText = Object.values(answers)
    .filter(Boolean)
    .join(" ");

  const studentEmbedding = await model.embed([studentText]);
  const studentVector = await studentEmbedding.array();
  const studentVec = studentVector[0] as number[];

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
    const anchorEmbeddings = await model.embed(anchors);
    const anchorVectors = await anchorEmbeddings.array();

    breakdown[stuckType].anchors = anchors;

    for (let i = 0; i < anchors.length; i++) {
      const anchorVec = anchorVectors[i] as number[];
      const similarity = cosineSimilarity(studentVec, anchorVec);
      breakdown[stuckType].similarities.push(similarity);
    }
  }

  return breakdown;
}
