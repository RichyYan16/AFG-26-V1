/**
 * Model Package Exports
 * Main entry point for the diagnostic + intervention system
 */

// ============================================
// TYPE EXPORTS
// ============================================
export type {
  StuckType,
  Emotion,
  DistortionType,
  QuestionId,
  DiagnosticAnswers,
  BehavioralSignals,
  DiagnosticContext,
  QuestionOption,
  AdaptiveQuestion,
  TypeScore,
  DiagnosisResult,
  DistortionHit,
  InterventionStep,
  InterventionPlan,
  SessionOutcome,
  SessionRecord,
  StudentProfile,
  TrendInsight,
  StudentInsights,
} from "./types";

// ============================================
// DIAGNOSTIC ENGINE EXPORTS
// ============================================
export { diagnoseWithHybridModel, diagnoseWithEmbeddingsOnly } from "./diagnosisEngine";

// ============================================
// WORD EMBEDDING EXPORTS
// ============================================
export {
  computeEmbeddingVector,
  computeEmbeddingScores,
  applyBehavioralSignalBoosts,
  getEmbeddingSimilarityBreakdown,
} from "./wordEmbedding";

// ============================================
// LOGISTIC REGRESSION CLASSIFIER EXPORTS
// ============================================
export {
  classifyWithLogisticRegression,
  classifyBatchWithLogisticRegression,
  getModelInfo,
} from "./logisticRegression";

// ============================================
// QUESTIONS EXPORTS
// ============================================
export {
  isDiagnosticComplete,
  getUnansweredQuestions,
  getAllDiagnosticQuestions,
  getNextUnansweredQuestion,
} from "./questions";

// ============================================
// INTERVENTION GENERATOR EXPORTS
// ============================================
export {
  buildInterventionPlanForStudent,
  buildMultipleInterventionPlans,
  buildQuickInterventionPlan,
} from "./interventionGenerator";

// ============================================
// COGNITIVE DISTORTION EXPORTS
// ============================================
export {
  detectThoughtDistortions,
  buildSafetyFlags,
  buildDistortionReport,
  DISTORTION_REFRAMES,
} from "./cognitiveDistortions";

export type { DistortionReport } from "./cognitiveDistortions";

// ============================================
// WEIGHTS EXPORTS
// ============================================
export {
  EMBEDDING_WEIGHTS,
  DISTORTION_WEIGHTS,
  DIAGNOSIS_THRESHOLDS,
  BEHAVIORAL_SIGNAL_WEIGHTS,
  CRISIS_WEIGHTS,
  INTERVENTION_WEIGHTS,
  INSIGHTS_WEIGHTS,
  QUESTION_WEIGHTS,
  EMBEDDING_MODEL_CONFIG,
  CONFIDENCE_CALIBRATION,
  applyWeights,
  blendScores,
} from "./weights";

// ============================================
// PROMPT EXPORTS (for advanced usage)
// ============================================
export {
  SYSTEM_PROMPTS,
  generateDiagnosisPrompt,
  generateFollowUpPrompt,
  generateInterventionPrompt,
  generateMultipleInterventionOptionsPrompt,
} from "./prompts";
