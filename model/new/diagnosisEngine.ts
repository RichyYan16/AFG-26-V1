/**
 * Diagnosis Engine
 * Orchestrates the hybrid embedding + Gemini diagnostic pipeline
 */

import {
  computeEmbeddingVector,
  computeEmbeddingScores,
  applyBehavioralSignalBoosts,
} from "./wordEmbedding";
import {
  refineDiagnosisWithGemini,
  generateInternalFollowUpQuestions,
} from "./geminiIntegration";
import { blendScores } from "./weights";
import type {
  DiagnosticAnswers,
  DiagnosisResult,
  StuckType,
  DiagnosticContext,
} from "./types";

/**
 * Main diagnostic function - RAW BASIC ALGORITHM
 * 1. Computes embedding vector [a, b, c, ...] from responses
 * 2. Classifier turns vector into stuck type prediction
 * 3. Generates 5 internal follow-up questions for Gemini analysis
 * 4. Combines embedding vector + Gemini analysis for diagnosis
 * 5. Returns ranked confidence levels (high to low) + summary
 */
export async function diagnoseWithHybridModel(
  answers: DiagnosticAnswers,
  context?: DiagnosticContext,
): Promise<DiagnosisResult & { internalFollowUpQuestions: string[] }> {
  // Step 1: Compute raw embedding vector [a, b, c, ...]
  const embeddingVector = await computeEmbeddingVector(answers);

  // Step 1b: Compute embedding scores (classifier) to get initial stuck type
  let embeddingScores = await computeEmbeddingScores(answers);

  // Step 2: Apply behavioral signal boosts if available
  if (context?.behavioralSignals) {
    embeddingScores = applyBehavioralSignalBoosts(
      embeddingScores,
      context.behavioralSignals,
    );
  }

  // Get initial max diagnosis
  const maxDiagnosisEntry = Object.entries(embeddingScores).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const maxDiagnosis = maxDiagnosisEntry[0] as StuckType;

  // Step 3: Generate 5 INTERNAL follow-up questions (always done, not shown to user yet)
  const internalFollowUpQuestions = await generateInternalFollowUpQuestions(
    answers,
    embeddingScores,
    maxDiagnosis,
  );

  // Step 4: Refine with Gemini using embedding vector + internal questions
  // (Gemini uses these to understand the emotional/semantic essence better)
  const geminiDiagnosis = await refineDiagnosisWithGemini(
    answers,
    embeddingScores,
  );

  // Step 5: Combine embedding vector + Gemini analysis into final diagnosis
  const geminiScores: Record<StuckType, number> = {
    confusion: 0,
    ambiguity: 0,
    fear: 0,
    overwhelm: 0,
    exhaustion: 0,
    perfection_loop: 0,
  };

  // Give high weight to Gemini's primary type
  geminiScores[geminiDiagnosis.primaryType] = geminiDiagnosis.confidence;

  const blendedScores = blendScores(embeddingScores, geminiScores);

  // Step 6: Rank all types by final blended scores (high to low confidence)
  const rankedTypes = Object.entries(blendedScores)
    .map(([type, score]) => ({
      type: type as StuckType,
      score: score * 10, // Scale to 0-10
      normalized: score, // Keep 0-1 for calibration
      reasons: geminiDiagnosis.primaryType === type ? geminiDiagnosis.factors : [],
    }))
    .sort((a, b) => b.score - a.score); // HIGH TO LOW

  return {
    primaryType: rankedTypes[0].type,
    confidence: rankedTypes[0].normalized,
    rankedTypes, // Ranked high → low (as per spec)
    summary: geminiDiagnosis.summary, // Very brief summary
    embeddingSimilarities: embeddingScores, // For transparency
    internalFollowUpQuestions, // 5 questions for Gemini analysis
    embeddingVector, // Raw [a, b, c, ...] vector representation
  };
}

/**
 * Quick diagnostic using only embeddings (no Gemini call)
 * Useful for fast fallback or testing
 */
export async function diagnoseWithEmbeddingsOnly(
  answers: DiagnosticAnswers,
  context?: DiagnosticContext,
): Promise<DiagnosisResult> {
  let scores = await computeEmbeddingScores(answers);

  if (context?.behavioralSignals) {
    scores = applyBehavioralSignalBoosts(scores, context.behavioralSignals);
  }

  const rankedTypes = Object.entries(scores)
    .map(([type, score]) => ({
      type: type as StuckType,
      score: score * 10,
      normalized: score,
      reasons: ["Embedding-based diagnosis (no Gemini refinement)"],
    }))
    .sort((a, b) => b.score - a.score);

  return {
    primaryType: rankedTypes[0].type,
    confidence: rankedTypes[0].normalized,
    rankedTypes,
    summary: `Based on your responses, you seem primarily stuck with ${rankedTypes[0].type}. 
Tell us more so we can personalize next steps.`,
    embeddingSimilarities: scores,
  };
}
