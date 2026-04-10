/**
 * Type definitions for the hybrid embedding + Gemini diagnostic model
 */

// ============================================
// CORE STUCK TYPES
// ============================================
export const STUCK_TYPES = [
  "confusion",
  "ambiguity",
  "fear",
  "overwhelm",
  "exhaustion",
  "perfection_loop",
] as const;

export type StuckType = (typeof STUCK_TYPES)[number];

// ============================================
// EMOTIONS
// ============================================
export const EMOTIONS = [
  "anxious",
  "numb",
  "frustrated",
  "scared",
  "overwhelmed",
  "guilty",
] as const;

export type Emotion = (typeof EMOTIONS)[number];

// ============================================
// DISTORTION TYPES
// ============================================
export const DISTORTION_TYPES = [
  "catastrophizing",
  "allOrNothing",
  "mindReading",
  "shouldStatements",
  "overgeneralization",
] as const;

export type DistortionType = (typeof DISTORTION_TYPES)[number];

// ============================================
// DIAGNOSTIC QUESTIONS
// ============================================
export const DIAGNOSTIC_QUESTION_IDS = [
  "internalVoice",
  "eightyPercentThought",
  "whyBestWork",
  "avoidanceDuration",
  "helpSeeking",
] as const;

export type QuestionId = (typeof DIAGNOSTIC_QUESTION_IDS)[number];

export interface DiagnosticAnswers {
  internalVoice: string;
  eightyPercentThought: string;
  whyBestWork: string;
  avoidanceDuration: string;
  helpSeeking: string;
}

// ============================================
// DIAGNOSTIC CONTEXT
// ============================================
export interface BehavioralSignals {
  rereading?: boolean;
  tabSwitching?: boolean;
  excessiveEditing?: boolean;
  physicalHeaviness?: boolean;
  repeatedStartStop?: boolean;
  procrastination?: boolean;
}

export interface DiagnosticContext {
  subject?: string;
  assignmentType?: string;
  timeStuckMinutes?: number;
  tasksOpenCount?: number;
  energyLevel?: number;
  panicLevel?: number;
  behavioralSignals?: BehavioralSignals;
  currentTimestamp?: string;
}

// ============================================
// QUESTIONS
// ============================================
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

// ============================================
// DIAGNOSIS
// ============================================
export interface TypeScore {
  type: StuckType;
  score: number;
  normalized: number;
  reasons: string[];
}

export type QuestionKind = 'text' | 'slider';

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  minLabel?: string;
  maxLabel?: string;
  marks?: { value: number; label: string }[];
}

export interface AdaptiveQuestion {
  id: keyof DiagnosticAnswers;
  prompt: string;
  options: readonly QuestionOption[];
  kind?: QuestionKind
  slider?: SliderConfig
}

export interface DiagnosisResult {
  primaryType: StuckType;
  confidence: number;
  rankedTypes: TypeScore[]; // Ranked HIGH to LOW confidence
  summary: string; // Very brief summary
  embeddingSimilarities?: Record<StuckType, number>;
  internalFollowUpQuestions?: string[]; // 5 questions for Gemini analysis
  embeddingVector?: number[]; // Raw [a, b, c, ...] vector [512-dim]
}

// ============================================
// COGNITIVE DISTORTIONS
// ============================================
export interface DistortionHit {
  type: DistortionType;
  severity: number;
  matched: string;
}

// ============================================
// INTERVENTIONS
// ============================================
export interface InterventionStep {
  timeMinutes: number;
  action: string;
  tip?: string;
}

export interface InterventionPlan {
  stuckType: StuckType;
  headline: string;
  whyItWorks: string;
  steps: InterventionStep[];
  reflectionPrompt: string;
  estimatedTotalMinutes: number;
}

// ============================================
// SESSION TRACKING
// ============================================
export type SessionOutcome = "started" | "finished" | "gave_up";

export interface SessionRecord {
  id: string;
  userId: string;
  timestamp: string;
  stuckType: StuckType;
  diagnosis: DiagnosisResult;
  interventionPlan: InterventionPlan;
  outcome: SessionOutcome;
  durationMinutes: number;
  distortions: DistortionHit[];
  safetyFlags: string[];
}

// ============================================
// STUDENT PROFILE
// ============================================
export interface StudentProfile {
  userId: string;
  totalSessions: number;
  averageTimeStuckMinutes: number;
  bySubjectAndType: Record<string, number>;
  distortionFrequency: Record<DistortionType, number>;
  sessionHistory: SessionRecord[];
}

// ============================================
// TREND INSIGHTS
// ============================================
export interface TrendInsight {
  type: "pattern" | "spike" | "escalation";
  description: string;
  stuckType?: StuckType;
  subject?: string;
  severity: "low" | "medium" | "high";
  recommendation: string;
}

// ============================================
// STUDENT INSIGHTS
// ============================================
export interface StudentInsights {
  userId: string;
  topBlockerType: StuckType;
  subjectSpecificPatterns: Record<string, StuckType>;
  trendInsights: TrendInsight[];
  riskFlags: string[];
}

// ============================================
// API RESPONSE TYPES
// ============================================
export interface IncompleteResponse {
  status: "needs_more_answers";
  nextQuestion: AdaptiveQuestion | null;
  questionQueue: AdaptiveQuestion[];
}

export interface DiagnosedResponse {
  status: "diagnosed";
  diagnosis: DiagnosisResult;
  plan: InterventionPlan;
  insights: TrendInsight[];
  profile: StudentProfile;
}

export type DiagnoseResponse = IncompleteResponse | DiagnosedResponse;

