/**
 * Diagnosis Engine
 * Orchestrates the embedding-based diagnostic pipeline
 */

import {
  computeEmbeddingVector,
  computeEmbeddingScores,
  applyBehavioralSignalBoosts,
} from "./wordEmbedding";
import { classifyWithLogisticRegression } from "./logisticRegression";
import { blendScores } from "./weights";
import type {
  DiagnosticAnswers,
  DiagnosisResult,
  StuckType,
  DiagnosticContext,
} from "./types";

/**
 * Main diagnostic function - EMBEDDINGS ONLY
 * 1. Computes embedding vector [a, b, c, ...] from responses
 * 2. Logistic Regression classifier turns vector into stuck type prediction
 * 3. Returns ranked confidence levels (high to low) + summary
 */
export async function diagnoseWithHybridModel(
  answers: DiagnosticAnswers,
  context?: DiagnosticContext,
): Promise<DiagnosisResult> {
  console.log("\n" + "=".repeat(80));
  console.log(" EMBEDDINGS-ONLY DIAGNOSIS ENGINE STARTED");
  console.log("=".repeat(80) + "\n");

  try {
    // Step 1: Compute raw embedding vector [a, b, c, ...]
    console.log(" Step 1: Computing embedding vector...");
    const embeddingVector = await computeEmbeddingVector(answers);
    console.log(` Embedding vector computed: ${embeddingVector.length} dimensions`);
    console.log(`   Sample values: [${embeddingVector.slice(0, 5).map(v => v.toFixed(3)).join(", ")}...]\n`);

    // Step 1b: Use Logistic Regression classifier on embedding vector
    console.log(" Step 2: Logistic regression classification...");
    let logregPrediction;
    try {
      logregPrediction = await classifyWithLogisticRegression(embeddingVector);
      console.log(` Classification complete`);
      console.log(`   Primary type: ${logregPrediction.primaryType}`);
      console.log(`   Confidence: ${(logregPrediction.confidence * 100).toFixed(1)}%`);
      console.log(`   All predictions:`);
      Object.entries(logregPrediction.predictions).forEach(([type, score]) => {
        const bar = "█".repeat(Math.round(score * 20)) + "░".repeat(20 - Math.round(score * 20));
        console.log(`     ${type.padEnd(16)}: ${bar} ${(score * 100).toFixed(1)}%`);
      });
      console.log("");
    } catch (e) {
      console.error(` Unable to load model: ${e instanceof Error ? e.message : String(e)}\n`);
      throw e;
    }

    // Convert logistic regression predictions to score format for compatibility
    const embeddingScores = logregPrediction.predictions;

    // Step 3: Apply behavioral signal boosts if provided
    console.log(" Step 3: Applying behavioral signal boosts...");
    let finalScores = embeddingScores;
    if (context?.behavioralSignals) {
      finalScores = applyBehavioralSignalBoosts(embeddingScores, context.behavioralSignals);
      console.log(` Behavioral signals applied`);
    } else {
      console.log(` No behavioral signals provided`);
    }
    console.log("");

    // Step 4: Rank all types by final scores (high to low confidence)
    console.log(" Step 4: Ranking by confidence...");
    const rankedTypes = Object.entries(finalScores)
      .map(([type, score]) => ({
        type: type as StuckType,
        score: score * 10, // Scale to 0-10
        normalized: score, // Keep 0-1 for calibration
        reasons: ["Embedding-based diagnosis"],
      }))
      .sort((a, b) => b.score - a.score); // HIGH TO LOW

    console.log(` Final rankings (HIGH → LOW):`);
    rankedTypes.forEach((rank, i) => {
      const bar = "█".repeat(Math.round(rank.normalized * 20)) + "░".repeat(20 - Math.round(rank.normalized * 20));
      console.log(`   ${i + 1}. ${rank.type.padEnd(16)}: ${bar} ${(rank.normalized * 100).toFixed(1)}%`);
    });
    console.log("");

    const result = {
      primaryType: rankedTypes[0].type,
      confidence: rankedTypes[0].normalized,
      rankedTypes, // Ranked high → low (as per spec)
      summary: `Based on your responses, you seem primarily stuck with ${rankedTypes[0].type}. Tell us more so we can personalize next steps.`,
      embeddingSimilarities: embeddingScores, // For transparency
    };

    console.log("=".repeat(80));
    console.log(" DIAGNOSIS COMPLETE");
    console.log("=".repeat(80) + "\n");

    return result;
  } catch (e) {
    console.error("\n" + "=".repeat(80));
    console.error(" DIAGNOSIS FAILED");
    console.error("=".repeat(80));
    console.error(`Error: ${e instanceof Error ? e.message : String(e)}\n`);
    throw e;
  }
}

/**
 * Quick diagnostic using only embeddings (same as main function now)
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
