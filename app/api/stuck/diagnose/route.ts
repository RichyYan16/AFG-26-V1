import { NextResponse } from "next/server";
import {
  diagnoseWithHybridModel,
  buildMultipleInterventionPlans,
  detectThoughtDistortions,
  buildSafetyFlags,
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
    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

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

    // Run diagnosis with hybrid model
    const diagnosis = await diagnoseWithHybridModel(
      validation.data.answers as DiagnosticAnswers,
      validation.data.context
    );

    // Generate intervention plans (use first one as primary plan)
    const interventionPlans = await buildMultipleInterventionPlans(
      diagnosis.primaryType
    );
    const plan = interventionPlans[0];

    // Analyze cognitive patterns
    const studentStatement = Object.values(validation.data.answers)
      .filter((v) => typeof v === "string")
      .join(" ");

    detectThoughtDistortions({
      studentStatement,
    });

    buildSafetyFlags({
      studentStatement,
      shameScore: diagnosis.confidence > 0.8 ? 0.7 : 0.3,
    });

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
