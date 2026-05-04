/**
 * Model Package Exports
 * Main entry point for the diagnostic + intervention system
 * 
 * @module @/model/new
 */

// ============================================
// TYPE EXPORTS - Re-exported from types.d.ts
// ============================================
// Types are now in the centralized types.d.ts file

// ============================================
// DIAGNOSTIC ENGINE EXPORTS
// ============================================
export { diagnoseWithHybridModel, diagnoseWithEmbeddingsOnly } from "./diagnosisEngine.js";

// ============================================
// WORD EMBEDDING EXPORTS
// ============================================
export {
  computeEmbeddingVector,
  computeEmbeddingScores,
  applyBehavioralSignalBoosts,
  getEmbeddingSimilarityBreakdown,
} from "./wordEmbedding.js";

// ============================================
// LOGISTIC REGRESSION CLASSIFIER EXPORTS
// ============================================
export {
  classifyWithLogisticRegression,
  classifyBatchWithLogisticRegression,
  getModelInfo,
} from "./logisticRegression.js";

// ============================================
// QUESTIONS EXPORTS
// ============================================
export {
  isDiagnosticComplete,
  getUnansweredQuestions,
  getAllDiagnosticQuestions,
  getNextUnansweredQuestion,
} from "./questions.js";

// ============================================
// GEMINI INTEGRATION EXPORTS
// ============================================
export {
  refineDiagnosisWithGemini,
  generateFollowUpQuestions,
  generateInterventionPlan,
} from "./geminiIntegration.js";

// ============================================
// INTERVENTION GENERATOR EXPORTS
// ============================================
export {
  buildInterventionPlanForStudent,
  buildMultipleInterventionPlans,
  buildQuickInterventionPlan,
} from "./interventionGenerator.js";

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
} from "./weights.js";

// ============================================
// PROMPT EXPORTS (for advanced usage)
// ============================================
export {
  SYSTEM_PROMPTS,
  generateDiagnosisPrompt,
  generateFollowUpPrompt,
  generateInterventionPrompt,
  generateMultipleInterventionOptionsPrompt,
} from "./prompts.js";
