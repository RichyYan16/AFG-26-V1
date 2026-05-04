/**
 * WEIGHTS REGISTRY
 * All scoring weights, thresholds, and tuning parameters in one place.
 * Makes it easy to A/B test, audit, and iterate on the model.
 *
 * @typedef {import('../types.d').StuckType} StuckType
 * @typedef {import('../types.d').DistortionType} DistortionType
 */

/**
 * Embedding model weights for each stuck type
 * @type {Record<StuckType, {boostMultiplier: number, similarityThreshold: number}>}
 */
export const EMBEDDING_WEIGHTS = {
  confusion: {
    boostMultiplier: 1.2,
    similarityThreshold: 0.4,
  },
  ambiguity: {
    boostMultiplier: 1.15,
    similarityThreshold: 0.35,
  },
  fear: {
    boostMultiplier: 1.3,
    similarityThreshold: 0.45,
  },
  overwhelm: {
    boostMultiplier: 1.4,
    similarityThreshold: 0.4,
  },
  exhaustion: {
    boostMultiplier: 1.2,
    similarityThreshold: 0.38,
  },
  perfection_loop: {
    boostMultiplier: 1.25,
    similarityThreshold: 0.42,
  },
};

/**
 * Cognitive distortion weights
 * @type {Record<DistortionType, {severity: number, patterns: RegExp[]}>}
 */
export const DISTORTION_WEIGHTS = {
  catastrophizing: {
    severity: 3,
    patterns: [/\bruin everything\b/i, /\bdoomed\b/i, /\bwill fail\b/i],
  },
  allOrNothing: {
    severity: 2,
    patterns: [/\beither|or\b/i, /\bperfect or fail\b/i, /\ball or nothing\b/i],
  },
  mindReading: {
    severity: 1,
    patterns: [/\bthey think\b/i, /\bwill judge\b/i, /\bthinking about me\b/i],
  },
  shouldStatements: {
    severity: 2,
    patterns: [/\bshould|must|have to|ought to\b/i],
  },
  overgeneralization: {
    severity: 2,
    patterns: [/\balways|never|every time\b/i, /\bnothing ever works\b/i],
  },
};

/**
 * Diagnosis thresholds
 * @type {{highConfidence: number, lowConfidence: number, requiresFollowUp: boolean}}
 */
export const DIAGNOSIS_THRESHOLDS = {
  highConfidence: 0.75,
  lowConfidence: 0.5,
  requiresFollowUp: false,
};

/**
 * Behavioral signal weights
 * @type {Record<string, {weight: number, stuckType: StuckType}>}
 */
export const BEHAVIORAL_SIGNAL_WEIGHTS = {
  rereading: { weight: 1.2, stuckType: "confusion" },
  tabSwitching: { weight: 1.5, stuckType: "overwhelm" },
  excessiveEditing: { weight: 1.3, stuckType: "perfection_loop" },
  physicalHeaviness: { weight: 1.4, stuckType: "exhaustion" },
  repeatedStartStop: { weight: 1.2, stuckType: "fear" },
  procrastination: { weight: 1.1, stuckType: "overwhelm" },
};

/**
 * Crisis detection weights
 * @type {{patterns: Array<{text: RegExp, severity: string, action: string}>, shameThreshold: number, panicThreshold: number}}
 */
export const CRISIS_WEIGHTS = {
  patterns: [
    { text: /\bi want to disappear\b/i, severity: "critical", action: "escalate" },
    { text: /\bhurt myself\b/i, severity: "critical", action: "escalate" },
    { text: /\bno point in trying\b/i, severity: "high", action: "flag" },
    { text: /\bwish i wasn't here\b/i, severity: "high", action: "flag" },
    { text: /\bi can't take this\b/i, severity: "high", action: "flag" },
  ],
  shameThreshold: 0.8,
  panicThreshold: 9,
};

/**
 * Intervention plan weights
 * @type {{timingByType: Record<StuckType, number>, geminiModel: string, temperature: number}}
 */
export const INTERVENTION_WEIGHTS = {
  timingByType: {
    confusion: 10,
    ambiguity: 5,
    fear: 15,
    overwhelm: 20,
    exhaustion: 25,
    perfection_loop: 8,
  },
  geminiModel: "gemini-2.5-flash-lite",
  temperature: 0.7,
};

/**
 * Student profile insights weights
 * @type {{recencyBias: number, frequencyThreshold: number, averageTimeWindow: number, trendThreshold: number}}
 */
export const INSIGHTS_WEIGHTS = {
  recencyBias: 0.7,
  frequencyThreshold: 3,
  averageTimeWindow: 14,
  trendThreshold: 0.2,
};

/**
 * Question ordering weights
 * @type {{baseQuestions: number, followUpQuestions: number, adaptiveQuestionsEnabled: boolean}}
 */
export const QUESTION_WEIGHTS = {
  baseQuestions: 5,
  followUpQuestions: 5,
  adaptiveQuestionsEnabled: true,
};

/**
 * Embedding model configuration
 * @type {{model: string, dimension: number, modelUrl: string, cacheEmbeddings: boolean}}
 */
export const EMBEDDING_MODEL_CONFIG = {
  model: "sentence-bert",
  dimension: 384,
  modelUrl: "Xenova/all-MiniLM-L6-v2",
  cacheEmbeddings: true,
};

/**
 * Confidence calibration weights
 * @type {{embeddingContribution: number, geminiContribution: number, behavioralSignalContribution: number}}
 */
export const CONFIDENCE_CALIBRATION = {
  embeddingContribution: 0.5,
  geminiContribution: 0.5,
  behavioralSignalContribution: 0.1,
};

/**
 * Apply weights to base scores
 * @param {Record<string, number>} baseScores
 * @param {Record<string, number>} weights
 * @returns {Record<string, number>}
 */
export function applyWeights(baseScores, weights) {
  return Object.entries(baseScores).reduce((acc, [key, score]) => {
    acc[key] = score * (weights[key] || 1.0);
    return acc;
  }, {});
}

/**
 * Blend multiple score sources using calibration weights
 * @param {...Record<string, number>[]} scoreSources
 * @returns {Record<string, number>}
 */
export function blendScores(...scoreSources) {
  const blended = {};

  // Pre-seed the output keys
  scoreSources.forEach((source) => {
    Object.keys(source).forEach((key) => {
      if (!blended[key]) blended[key] = 0;
    });
  });

  // Combine each source using the matching calibration weight
  scoreSources.forEach((source, index) => {
    const weight = Object.values(CONFIDENCE_CALIBRATION)[index] || 0.1;
    Object.entries(source).forEach(([key, score]) => {
      blended[key] += score * weight;
    });
  });

  return blended;
}
