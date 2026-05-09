/**
 * WEIGHTS REGISTRY
 * All scoring weights, thresholds, and tuning parameters in one place.
 * Makes it easy to A/B test, audit, and iterate on the model.
 */

/* Import the type unions used to keep weight maps strongly typed. */
import type { StuckType } from "./types";


// EMBEDDING MODEL WEIGHTS (Word2Vec/USE)

export const EMBEDDING_WEIGHTS: Record<
  StuckType,
  {
    boostMultiplier: number;
    similarityThreshold: number;
  }
> = {
  /* Slightly boost confidence when the embedding match is strong for confusion. */
  confusion: {
    boostMultiplier: 1.2,
    similarityThreshold: 0.4,
  },
  /* Allow ambiguity to trigger with a somewhat lower similarity threshold. */
  ambiguity: {
    boostMultiplier: 1.15,
    similarityThreshold: 0.35,
  },
  /* Increase weight for fear-related language because it tends to be high-signal. */
  fear: {
    boostMultiplier: 1.3,
    similarityThreshold: 0.45,
  },
  /* Overwhelm needs the strongest boost because it often appears indirectly. */
  overwhelm: {
    boostMultiplier: 1.4,
    similarityThreshold: 0.4,
  },
  /* Exhaustion gets moderate boosting so fatigue-related cues are not missed. */
  exhaustion: {
    boostMultiplier: 1.2,
    similarityThreshold: 0.38,
  },
  /* Perfection loops usually need a higher-than-average confidence bump. */
  perfection_loop: {
    boostMultiplier: 1.25,
    similarityThreshold: 0.42,
  },
} as const;


// DIAGNOSIS THRESHOLDS

export const DIAGNOSIS_THRESHOLDS = {
  /* Scores at or above this value are considered high-confidence. */
  highConfidence: 0.75,
  /* Scores at or above this value can still be used, but with caution. */
  lowConfidence: 0.5,
  /* This flag controls whether the system asks for follow-up context. */
  requiresFollowUp: false,
} as const;


// BEHAVIORAL SIGNAL WEIGHTS

export const BEHAVIORAL_SIGNAL_WEIGHTS: Record<
  string,
  { weight: number; stuckType: StuckType }
> = {
  /* Re-reading often maps to confusion or loss of comprehension. */
  rereading: { weight: 1.2, stuckType: "confusion" },
  /* Rapid switching can indicate overwhelm or decision paralysis. */
  tabSwitching: { weight: 1.5, stuckType: "overwhelm" },
  /* Over-editing is a common marker for perfection loops. */
  excessiveEditing: { weight: 1.3, stuckType: "perfection_loop" },
  /* Feeling physically heavy can reflect exhaustion or burnout. */
  physicalHeaviness: { weight: 1.4, stuckType: "exhaustion" },
  /* Starting and stopping repeatedly is often linked to fear. */
  repeatedStartStop: { weight: 1.2, stuckType: "fear" },
  /* General procrastination is a broad overwhelm signal. */
  procrastination: { weight: 1.1, stuckType: "overwhelm" },
} as const;

 
// CRISIS DETECTION WEIGHTS
 
export const CRISIS_WEIGHTS = {
  patterns: [
    /* Highly urgent language that may suggest immediate risk. */
    { text: /\bi want to disappear\b/i, severity: "critical", action: "escalate" },
    /* Direct self-harm references should always escalate. */
    { text: /\bhurt myself\b/i, severity: "critical", action: "escalate" },
    /* Low-worth statements still deserve a flag for review. */
    { text: /\bno point in trying\b/i, severity: "high", action: "flag" },
    /* Being absent from the world can be a serious warning sign. */
    { text: /\bwish i wasn't here\b/i, severity: "high", action: "flag" },
    /* Overwhelm plus hopelessness can indicate crisis escalation. */
    { text: /\bi can't take this\b/i, severity: "high", action: "flag" },
  ],
  /* Shame scores above this threshold contribute to crisis detection. */
  shameThreshold: 0.8,
  /* Panic values at or above this level are treated as urgent. */
  panicThreshold: 9,
} as const;

 
// INTERVENTION PLAN WEIGHTS
 
export const INTERVENTION_WEIGHTS = {
  timingByType: {
    /* Confusion usually benefits from a fast response. */
    confusion: 10,
    /* Ambiguity often needs gentle clarification before action. */
    ambiguity: 5,
    /* Fear should be handled promptly to reduce avoidance. */
    fear: 15,
    /* Overwhelm gets the strongest urgency in intervention timing. */
    overwhelm: 20,
    /* Exhaustion needs a slower, more supportive intervention pace. */
    exhaustion: 25,
    /* Perfection loops can be addressed with targeted support. */
    perfection_loop: 8,
  },
  /* Use a lightweight model for fast intervention generation. */
  model: "claude-3.5-sonnet",
  /* Moderate temperature keeps the output supportive but varied. */
  temperature: 0.7,
} as const;

 
// STUDENT PROFILE INSIGHTS WEIGHTS
 
export const INSIGHTS_WEIGHTS = {
  /* Recent observations matter more than older ones. */
  recencyBias: 0.7,
  /* Require repeated evidence before drawing stronger insights. */
  frequencyThreshold: 3,
  /* Look back across a two-week window for trend detection. */
  averageTimeWindow: 14,
  /* Use this threshold to decide whether a trend is meaningful. */
  trendThreshold: 0.2,
} as const;

 
// QUESTION ORDERING WEIGHTS
 
export const QUESTION_WEIGHTS = {
  /* Base question count for the initial diagnosis flow. */
  baseQuestions: 5,
  /* Additional questions that can be asked when more context is needed. */
  followUpQuestions: 5,
  /* Allow the system to adapt the order and number of questions dynamically. */
  adaptiveQuestionsEnabled: true,
} as const;

 
// MODEL SELECTION
 
export const EMBEDDING_MODEL_CONFIG = {
  /* The embedding model label used by the app's vector logic. */
  model: "sentence-bert",
  /* Sentence-BERT MiniLM produces 384-dimensional embeddings. */
  dimension: 384,
  /* Hosted model identifier used by Xenova's transformers runtime. */
  modelUrl: "Xenova/all-MiniLM-L6-v2",
  /* Cache embeddings locally to avoid repeated recomputation. */
  cacheEmbeddings: true,
} as const;

 
// CONFIDENCE CALIBRATION
 
export const CONFIDENCE_CALIBRATION = {
  /* Weight assigned to embedding-based confidence. */
  embeddingContribution: 0.5,
  /* Weight assigned to LLM-based confidence. */
  llmContribution: 0.5,
  /* Extra signal from behavior is deliberately smaller but still useful. */
  behavioralSignalContribution: 0.1,
} as const;

 
// UTILITY FUNCTIONS

export function applyWeights(
  baseScores: Record<string, number>,
  weights: Record<string, number>,
): Record<string, number> {
  /* Scale each score by the matching weight, defaulting to 1.0 when absent. */
  return Object.entries(baseScores).reduce(
    (acc, [key, score]) => {
      /* Store the weighted score for the current key. */
      acc[key] = score * (weights[key] || 1.0);
      /* Continue accumulating the remaining scores. */
      return acc;
    },
    {} as Record<string, number>,
  );
}

export function blendScores(
  ...scoreSources: Record<string, number>[]
): Record<string, number> {
  /* Start with an empty score map so we can merge all sources into one result. */
  const blended = {} as Record<string, number>;

  /* Pre-seed the output keys so every source can contribute safely. */
  scoreSources.forEach((source) => {
    Object.keys(source).forEach((key) => {
      /* Initialize missing keys to zero before adding weighted values. */
      if (!blended[key]) blended[key] = 0;
    });
  });

  /* Combine each source using the matching calibration weight. */
  scoreSources.forEach((source, index) => {
    /* Fall back to a small default weight when no calibration value exists. */
    const weight = Object.values(CONFIDENCE_CALIBRATION)[index] || 0.1;
    Object.entries(source).forEach(([key, score]) => {
      /* Accumulate the weighted score into the blended output. */
      blended[key] += score * weight;
    });
  });

  /* Return the merged score distribution. */
  return blended;
}
