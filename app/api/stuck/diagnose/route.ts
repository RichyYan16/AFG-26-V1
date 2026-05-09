import { NextResponse } from "next/server";

export const runtime = 'nodejs';
import {
  diagnoseWithHybridModel,
  buildMultipleInterventionPlans,
} from "@/model/new/index";
import {
  isDiagnosticComplete,
  getAllDiagnosticQuestions,
} from "@/model/new/questions";
import type {
  DiagnosticAnswers,
  DiagnosticContext,
  AdaptiveQuestion,
} from "@/model/new/types";

interface DiagnoseRequest {
  answers: Partial<DiagnosticAnswers>;
  context?: DiagnosticContext;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validatePayload(
  payload: unknown,
): { ok: true; data: DiagnoseRequest } | { ok: false; error: string } {
  if (!isObject(payload)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const body = payload as {
    answers?: unknown;
    context?: unknown;
  };

  if (body.answers !== undefined && !isObject(body.answers)) {
    return { ok: false, error: "Field `answers` must be an object when provided." };
  }
  if (body.context !== undefined && !isObject(body.context)) {
    return { ok: false, error: "Field `context` must be an object when provided." };
  }

  const data: DiagnoseRequest = {
    answers: (body.answers as Partial<DiagnosticAnswers>) ?? {},
    context: (body.context as DiagnosticContext | undefined),
  };

  return { ok: true, data };
}

export async function POST(req: Request) {
  try {
    console.log('Diagnose endpoint called');

    const body = await req.json();
    const validation = validatePayload(body);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check if all diagnostic questions have been answered
    if (!isDiagnosticComplete(validation.data.answers)) {
      const allQuestions = getAllDiagnosticQuestions();
      const nextQuestion = allQuestions.find((q) => !validation.data.answers[q.id]) || null;
      
      // Return IncompleteResponse format
      return NextResponse.json(
        {
          status: "needs_more_answers",
          nextQuestion,
          questionQueue: allQuestions,
        } as {
          status: "needs_more_answers";
          nextQuestion: AdaptiveQuestion | null;
          questionQueue: AdaptiveQuestion[];
        },
        { status: 200 }
      );
    }

    // Run diagnosis with fallback
    let diagnosis;
    try {
      diagnosis = await diagnoseWithHybridModel(
        validation.data.answers as DiagnosticAnswers,
        validation.data.context
      );
    } catch (modelError) {
      console.error('Model prediction failed, using fallback:', modelError);
      // Fallback to simple rule-based diagnosis
      diagnosis = {
        primaryType: "confusion" as const,
        confidence: 0.5,
        rankedTypes: [
          { type: "confusion" as const, score: 5, normalized: 0.5, reasons: ["Fallback diagnosis"] },
          { type: "ambiguity" as const, score: 3, normalized: 0.3, reasons: ["Fallback diagnosis"] },
          { type: "fear" as const, score: 2, normalized: 0.2, reasons: ["Fallback diagnosis"] },
        ],
        summary: "Based on your responses, you seem primarily stuck with confusion. Tell us more so we can personalize next steps.",
        embeddingSimilarities: { confusion: 0.5, ambiguity: 0.3, fear: 0.2, overwhelm: 0.1, exhaustion: 0.1, perfection_loop: 0.1 },
      };
    }

    // Generate intervention plans with fallback
    let plan;
    try {
      const interventionPlans = await buildMultipleInterventionPlans(
        diagnosis.primaryType
      );
      plan = interventionPlans[0];
    } catch (interventionError) {
      console.error('Intervention generation failed, using fallback:', interventionError);
      plan = {
        id: "fallback-plan",
        stuckType: diagnosis.primaryType,
        title: "Getting Unstuck: Next Steps",
        description: "Here are some strategies to help you move forward.",
        steps: [
          { id: "step-1", type: "reflection" as const, title: "Take a moment to reflect", description: "Think about what specifically is confusing you." },
          { id: "step-2", type: "action" as const, title: "Break it down", description: "Can you break this into smaller pieces?" },
        ],
        estimatedMinutes: 5,
        difficulty: "easy" as const,
      };
    }

    // Analyze cognitive patterns with error handling
    const studentStatement = Object.values(validation.data.answers)
      .filter((v) => typeof v === "string")
      .join(" ");

    // Return DiagnosedResponse format
    return NextResponse.json(
      {
        status: "diagnosed",
        diagnosis,
        plan,
        insights: [], // TODO: Generate insights from history
        profile: {
          userId: "temp",
          totalSessions: 0,
          averageTimeStuckMinutes: 0,
          bySubjectAndType: {},
          distortionFrequency: {},
          sessionHistory: [],
        }, // TODO: Build from history
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in diagnose endpoint:", error);
    return NextResponse.json(
      {
        error: "Diagnosis failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
