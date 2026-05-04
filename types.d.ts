/**
 * Shared type definitions for the diagnostic system
 * This is the only TypeScript file needed for type checking across JavaScript files
 */

// ============================================
// CORE STUCK TYPES
// ============================================
export type StuckType = 
  | "confusion"
  | "ambiguity"
  | "fear"
  | "overwhelm"
  | "exhaustion"
  | "perfection_loop";

export const STUCK_TYPES: readonly StuckType[] = [
  "confusion",
  "ambiguity",
  "fear",
  "overwhelm",
  "exhaustion",
  "perfection_loop",
];

// ============================================
// EMOTIONS
// ============================================
export type Emotion = 
  | "anxious"
  | "numb"
  | "frustrated"
  | "scared"
  | "overwhelmed"
  | "guilty";

export const EMOTIONS: readonly Emotion[] = [
  "anxious",
  "numb",
  "frustrated",
  "scared",
  "overwhelmed",
  "guilty",
];

// ============================================
// DISTORTION TYPES
// ============================================
export type DistortionType =
  | "catastrophizing"
  | "allOrNothing"
  | "mindReading"
  | "shouldStatements"
  | "overgeneralization";

export const DISTORTION_TYPES: readonly DistortionType[] = [
  "catastrophizing",
  "allOrNothing",
  "mindReading",
  "shouldStatements",
  "overgeneralization",
];

// ============================================
// DIAGNOSTIC QUESTIONS
// ============================================
export type QuestionId =
  | "internalVoice"
  | "eightyPercentThought"
  | "whyBestWork"
  | "avoidanceDuration"
  | "helpSeeking";

export const DIAGNOSTIC_QUESTION_IDS: readonly QuestionId[] = [
  "internalVoice",
  "eightyPercentThought",
  "whyBestWork",
  "avoidanceDuration",
  "helpSeeking",
];

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

export type QuestionKind = "text" | "slider";

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  minLabel?: string;
  maxLabel?: string;
  marks?: Array<{ value: number; label: string }>;
}

export interface AdaptiveQuestion {
  id: QuestionId;
  prompt: string;
  helperText?: string;
  options: readonly QuestionOption[];
  kind?: QuestionKind;
  slider?: SliderConfig;
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

export interface DiagnosisResult {
  primaryType: StuckType;
  confidence: number;
  rankedTypes: TypeScore[];
  summary: string;
  embeddingSimilarities?: Record<StuckType, number>;
  internalFollowUpQuestions?: string[];
  embeddingVector?: number[];
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

// ============================================
// MODULE EXPORTS FOR TESTING
// ============================================
export interface LogisticRegressionResult {
  predictions: Record<StuckType, number>;
  primaryType: StuckType;
  confidence: number;
}

export interface EmbeddingBreakdown {
  anchors: string[];
  similarities: number[];
}
