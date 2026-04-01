export const STUCK_TYPES = [
  "confusion",
  "ambiguity",
  "fear",
  "overwhelm",
  "exhaustion",
  "perfection_loop",
] as const;

export type StuckType = (typeof STUCK_TYPES)[number];

export const EMOTIONS = [
  "anxious",
  "numb",
  "frustrated",
  "scared",
  "overwhelmed",
  "guilty",
] as const;

export type Emotion = (typeof EMOTIONS)[number];

export const DIAGNOSTIC_QUESTION_IDS = [
  "understandsQuestion",
  "canSubmitBadInFiveMinutes",
  "strongestEmotion",
  "taskScope",
  "gradeWorry",
] as const;

export type QuestionId = (typeof DIAGNOSTIC_QUESTION_IDS)[number];

export interface DiagnosticAnswers {
  understandsQuestion: "yes" | "partly" | "no";
  canSubmitBadInFiveMinutes: "yes" | "maybe" | "no";
  strongestEmotion: Emotion;
  taskScope: "small_clear" | "large_clear" | "unclear";
  gradeWorry: "low" | "medium" | "high";
}

export interface DiagnosticContext {
  subject?: string;
  assignmentType?: string;
  timeStuckMinutes?: number;
  tasksOpenCount?: number;
  energyLevel?: 1 | 2 | 3 | 4 | 5;
  panicLevel?: 1 | 2 | 3 | 4 | 5;
  repeatedRereading?: boolean;
  excessiveEditing?: boolean;
  currentTimestamp?: string;
}

export interface QuestionOption {
  value: string;
  label: string;
}

export interface AdaptiveQuestion {
  id: QuestionId;
  prompt: string;
  helperText?: string;
  options: ReadonlyArray<QuestionOption>;
}

export interface TypeScore {
  type: StuckType;
  score: number;
  normalized: number;
  reasons: string[];
}

export interface DiagnosisResult {
  primaryType: StuckType;
  confidence: number;
  rankedTypes: TypeScore[];
  summary: string;
}

export interface InterventionStep {
  id: string;
  instruction: string;
  minutes: number;
}

export interface InterventionPlan {
  stuckType: StuckType;
  headline: string;
  whyThisWorks: string;
  firstAction: string;
  steps: InterventionStep[];
  reflectionPrompt: string;
  escalationPrompt?: string;
  guardrails: string[];
}

export type SessionOutcome = "started" | "finished" | "gave_up";

export interface SessionRecord {
  id: string;
  userId: string;
  createdAt: string;
  subject: string;
  assignmentType: string;
  stuckType: StuckType;
  emotion: Emotion;
  timeStuckMinutes: number;
  interventionUsed: string;
  outcome: SessionOutcome;
}

export type InsightConfidence = "low" | "medium" | "high";

export interface TrendInsight {
  key: string;
  message: string;
  confidence: InsightConfidence;
}

export interface StudentProfile {
  totalSessions: number;
  byType: Record<StuckType, number>;
  bySubjectAndType: Record<string, number>;
  averageTimeStuckMinutes: number;
}

export function createEmptyTypeCounts(): Record<StuckType, number> {
  return {
    confusion: 0,
    ambiguity: 0,
    fear: 0,
    overwhelm: 0,
    exhaustion: 0,
    perfection_loop: 0,
  };
}
