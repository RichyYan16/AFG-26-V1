/**
 * App-wide constants and labels
 * @typedef {import('@/types.d').AdaptiveQuestion} AdaptiveQuestion
 * @typedef {import('@/types.d').StuckType} StuckType
 * @typedef {import('@/types.d').SessionOutcome} SessionOutcome
 */

/**
 * @typedef {("home"|"introduction"|"questionnaire"|"result"|"intervention"|"history")} AppTab
 */

export const STORAGE_KEY = "stuck_sessions_v1";
export const MAX_HISTORY = 300;

/** @type {Record<string, string>} */
export const QUESTION_TITLES = {
  internalVoice: "Internal Voice",
  eightyPercentThought: "80% Thought",
  whyBestWork: "Why Best Work",
  avoidanceDuration: "Avoidance Duration",
  helpSeeking: "Asking for Help",
};

/** @type {Record<StuckType, string>} */
export const STUCK_TYPE_LABELS = {
  confusion: "Confusion Stuck",
  ambiguity: "Ambiguity Stuck",
  fear: "Fear Stuck",
  overwhelm: "Overwhelm Stuck",
  exhaustion: "Exhaustion Stuck",
  perfection_loop: "Perfection Loop Stuck",
};

/** @type {Record<SessionOutcome, string>} */
export const OUTCOME_LABELS = {
  started: "Started",
  finished: "Finished",
  gave_up: "Gave Up",
};

/** @type {Record<AppTab, string>} */
export const TAB_LABELS = {
  home: "Home",
  introduction: "Introduction",
  questionnaire: "Questionnaire",
  result: "Result",
  intervention: "Plan",
  history: "History",
};
