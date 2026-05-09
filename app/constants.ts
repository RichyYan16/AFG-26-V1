import type {
  AdaptiveQuestion,
  StuckType,
  SessionOutcome,
} from "@/model/new/types";

/**
 * Application-wide constants and type definitions
 * 
 * This file centralizes all constant values, type definitions, and label mappings used across the application. It includes:
 * - Type definitions for application tabs
 * - Storage keys and limits for session history
 * - Mappings of question IDs to user-friendly titles
 * - Mappings of stuck types to descriptive labels and explanations
 * - Mappings of session outcomes to display labels
 * 
 * By centralizing these constants, we ensure consistency across the app and make it easier to manage changes in one place.
 */

export type AppTab =
  | "home"
  | "introduction"
  | "questionnaire"
  | "result"
  | "intervention"
  | "history";

export const STORAGE_KEY = "stuck_sessions_v1";
export const MAX_HISTORY = 300;

export const QUESTION_TITLES: Record<AdaptiveQuestion["id"], string> = {
  internalVoice: "Internal Voice",
  eightyPercentThought: "80% Thought",
  whyBestWork: "Why Best Work",
  avoidanceDuration: "Avoidance Duration",
  helpSeeking: "Asking for Help",
};

export const STUCK_TYPE_LABELS: Record<StuckType, string> = {
  confusion: "Confusion Stuck",
  ambiguity: "Ambiguity Stuck",
  fear: "Fear Stuck",
  overwhelm: "Overwhelm Stuck",
  exhaustion: "Exhaustion Stuck",
  perfection_loop: "Perfection Loop Stuck",
};

export const STUCK_TYPE_DESCRIPTIONS: Record<StuckType, string> = {
  confusion: "You don't understand the material or requirements and feel lost about where to start.",
  ambiguity: "The instructions or expectations are unclear, leaving you uncertain about what to do.",
  fear: "You're afraid of failure, judgment, or consequences, which prevents you from beginning.",
  overwhelm: "The task feels too large or complex, making it hard to know how to approach it.",
  exhaustion: "You're mentally or physically drained and lack the energy to engage with the work.",
  perfection_loop: "You're caught in trying to make everything perfect, which prevents you from finishing.",
};

export const OUTCOME_LABELS: Record<SessionOutcome, string> = {
  started: "Started",
  finished: "Finished",
  gave_up: "Gave Up",
};

export const TAB_LABELS: Record<AppTab, string> = {
  home: "Home",
  introduction: "Introduction",
  questionnaire: "Questionnaire",
  result: "Result",
  intervention: "Plan",
  history: "History",
};
