import type {
  AdaptiveQuestion,
  StuckType,
  SessionOutcome,
} from "@/model/new/types";

export type AppTab =
  | "home"
  | "introduction"
  | "questionnaire"
  | "result"
  | "intervention"
  | "insights"
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
  insights: "Insights",
  history: "History",
};
