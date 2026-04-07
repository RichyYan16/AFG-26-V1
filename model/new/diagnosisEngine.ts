/**
 * Diagnosis Engine
 * Orchestrates the hybrid embedding + Gemini diagnostic pipeline
 */

import {
  computeEmbeddingVector,
  computeEmbeddingScores,
  applyBehavioralSignalBoosts,
} from "./wordEmbedding";
import { classifyWithLogisticRegression } from "./logisticRegression";
import {
  refineDiagnosisWithGemini,
  generateFollowUpQuestions,
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
 * 2. Logistic Regression classifier turns vector into stuck type prediction
 * 3. Generates 5 internal follow-up questions for Gemini analysis
 * 4. Combines logistic regression output + Gemini analysis for diagnosis
 * 5. Returns ranked confidence levels (high to low) + summary
 */
export async function diagnoseWithHybridModel(
  answers: DiagnosticAnswers,
  context?: DiagnosticContext,
): Promise<DiagnosisResult & { internalFollowUpQuestions: string[] }> {
  console.log("\n" + "=".repeat(80));
  console.log("🔄 HYBRID DIAGNOSIS ENGINE STARTED");
  console.log("=".repeat(80) + "\n");

  try {
    // Step 1: Compute raw embedding vector [a, b, c, ...]
    console.log("📊 Step 1: Computing embedding vector...");
    const embeddingVector = await computeEmbeddingVector(answers);
    console.log(`✅ Embedding vector computed: ${embeddingVector.length} dimensions`);
    console.log(`   Sample values: [${embeddingVector.slice(0, 5).map(v => v.toFixed(3)).join(", ")}...]\n`);

    // Step 1b: Use Logistic Regression classifier on embedding vector
    console.log("🤖 Step 2: Logistic regression classification...");
    let logregPrediction;
    try {
      logregPrediction = await classifyWithLogisticRegression(embeddingVector);
      console.log(`✅ Classification complete`);
      console.log(`   Primary type: ${logregPrediction.primaryType}`);
      console.log(`   Confidence: ${(logregPrediction.confidence * 100).toFixed(1)}%`);
      console.log(`   All predictions:`);
      Object.entries(logregPrediction.predictions).forEach(([type, score]) => {
        const bar = "█".repeat(Math.round(score * 20)) + "░".repeat(20 - Math.round(score * 20));
        console.log(`     ${type.padEnd(16)}: ${bar} ${(score * 100).toFixed(1)}%`);
      });
      console.log("");
    } catch (e) {
      console.error(`❌ Unable to load model: ${e instanceof Error ? e.message : String(e)}\n`);
      throw e;
    }

    // Get initial max diagnosis from logistic regression
    const maxDiagnosis = logregPrediction.primaryType;

    // Convert logistic regression predictions to score format for compatibility
    const embeddingScores = logregPrediction.predictions;

    // Step 3: Generate 5 INTERNAL follow-up questions (always done, not shown to user yet)
    console.log("❓ Step 3: Generating internal follow-up questions...");
    let internalFollowUpQuestions: string[] = [];
    try {
      const internalFollowUps = await generateFollowUpQuestions(
        answers,
        embeddingScores,
        maxDiagnosis,
      );
      internalFollowUpQuestions = internalFollowUps.map((item) => item.prompt);
      console.log(`✅ Generated ${internalFollowUpQuestions.length} follow-up questions`);
      internalFollowUpQuestions.forEach((q, i) => {
        console.log(`   ${i + 1}. ${q.substring(0, 70)}...`);
      });
      console.log("");
    } catch (e) {
      console.error(`⚠️  Unable to load model: ${e instanceof Error ? e.message : String(e)}`);
      console.error(`   Continuing without follow-up questions...\n`);
      internalFollowUpQuestions = [];
    }

    // Step 4: Refine with Gemini using embedding vector + internal questions
    // (Gemini uses these to understand the emotional/semantic essence better)
    console.log("🌟 Step 4: Gemini refinement analysis...");
    let geminiDiagnosis;
    try {
      geminiDiagnosis = await refineDiagnosisWithGemini(
        answers,
        embeddingScores,
      );
      console.log(`✅ Gemini analysis complete`);
      console.log(`   Primary type: ${geminiDiagnosis.primaryType}`);
      console.log(`   Confidence: ${(geminiDiagnosis.confidence * 100).toFixed(1)}%`);
      console.log(`   Summary: ${geminiDiagnosis.summary}`);
      console.log("");
    } catch (e) {
      console.error(`❌ Unable to load model: ${e instanceof Error ? e.message : String(e)}`);
      console.error(`   Using logistic regression results only...\n`);
      geminiDiagnosis = {
        primaryType: maxDiagnosis,
        confidence: logregPrediction.confidence,
        summary: `Based on your responses, you seem stuck with ${maxDiagnosis}.`,
        factors: [],
      };
    }

    // Step 5: Combine embedding vector + Gemini analysis into final diagnosis
    console.log("🔗 Step 5: Blending scores...");
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
    console.log(`✅ Scores blended`);
    console.log(`   Embedding scores + Gemini scores = Final scores\n`);

    // Step 6: Rank all types by final blended scores (high to low confidence)
    console.log("📋 Step 6: Ranking by confidence...");
    const rankedTypes = Object.entries(blendedScores)
      .map(([type, score]) => ({
        type: type as StuckType,
        score: score * 10, // Scale to 0-10
        normalized: score, // Keep 0-1 for calibration
        reasons: geminiDiagnosis.primaryType === type ? geminiDiagnosis.factors : [],
      }))
      .sort((a, b) => b.score - a.score); // HIGH TO LOW

    console.log(`✅ Final rankings (HIGH → LOW):`);
    rankedTypes.forEach((rank, i) => {
      const bar = "█".repeat(Math.round(rank.normalized * 20)) + "░".repeat(20 - Math.round(rank.normalized * 20));
      console.log(`   ${i + 1}. ${rank.type.padEnd(16)}: ${bar} ${(rank.normalized * 100).toFixed(1)}%`);
    });
    console.log("");

    const result = {
      primaryType: rankedTypes[0].type,
      confidence: rankedTypes[0].normalized,
      rankedTypes, // Ranked high → low (as per spec)
      summary: geminiDiagnosis.summary, // Very brief summary
      embeddingSimilarities: embeddingScores, // For transparency
      internalFollowUpQuestions, // 5 questions for Gemini analysis
      embeddingVector, // Raw [a, b, c, ...] vector representation
    };

    console.log("=".repeat(80));
    console.log("✨ DIAGNOSIS COMPLETE");
    console.log("=".repeat(80) + "\n");

    return result;
  } catch (e) {
    console.error("\n" + "=".repeat(80));
    console.error("❌ DIAGNOSIS FAILED");
    console.error("=".repeat(80));
    console.error(`Error: ${e instanceof Error ? e.message : String(e)}\n`);
    throw e;
  }
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
