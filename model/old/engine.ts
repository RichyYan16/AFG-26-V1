import { diagnoseStuckType } from "./classifier";
import { buildTrendInsights, buildStudentProfile } from "./insights";
import { buildInterventionPlan } from "./interventions";
import {
  getNextQuestion,
  isDiagnosticComplete,
  listQuestionnaire,
} from "./questions";
import {
  type AdaptiveQuestion,
  type DiagnosticAnswers,
  type DiagnosticContext,
  type DiagnosisResult,
  type Emotion,
  type InterventionPlan,
  type SessionOutcome,
  type SessionRecord,
  type StudentProfile,
  type TrendInsight,
} from "./types";

export interface DiagnoseRequest {
  answers: Partial<DiagnosticAnswers>;
  context?: DiagnosticContext;
  history?: SessionRecord[];
}

interface IncompleteResponse {
  status: "needs_more_answers";
  nextQuestion: AdaptiveQuestion | null;
  questionQueue: AdaptiveQuestion[];
}

interface DiagnosedResponse {
  status: "diagnosed";
  diagnosis: DiagnosisResult;
  plan: InterventionPlan;
  insights: TrendInsight[];
  profile: StudentProfile;
}

export type DiagnoseResponse = IncompleteResponse | DiagnosedResponse;

export interface SessionCreationInput {
  id: string;
  userId: string;
  createdAt?: string;
  context: DiagnosticContext;
  diagnosis: DiagnosisResult;
  answers: DiagnosticAnswers;
  interventionUsed: string;
  outcome: SessionOutcome;
}

export function runStuckModel(request: DiagnoseRequest): DiagnoseResponse {
  const answers = request.answers ?? {};
  const context = request.context ?? {};
  const history = request.history ?? [];

  if (!isDiagnosticComplete(answers)) {
    return {
      status: "needs_more_answers",
      nextQuestion: getNextQuestion(answers),
      questionQueue: listQuestionnaire(answers),
    };
  }

  const diagnosis = diagnoseStuckType(answers, context);
  const plan = buildInterventionPlan(diagnosis, context, history);
  const insights = buildTrendInsights(history);
  const profile = buildStudentProfile(history);

  return {
    status: "diagnosed",
    diagnosis,
    plan,
    insights,
    profile,
  };
}

export function createSessionRecord(input: SessionCreationInput): SessionRecord {
  const subject = input.context.subject?.trim() || "unknown";
  const assignmentType = input.context.assignmentType?.trim() || "unknown";
  const emotion: Emotion = input.answers.strongestEmotion;

  return {
    id: input.id,
    userId: input.userId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    subject,
    assignmentType,
    stuckType: input.diagnosis.primaryType,
    emotion,
    timeStuckMinutes: input.context.timeStuckMinutes ?? 0,
    interventionUsed: input.interventionUsed,
    outcome: input.outcome,
  };
}
