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

/**
 * @typedef {Object} DiagnoseRequest
 * @property {Partial<DiagnosticAnswers>} answers - Student's answers
 * @property {DiagnosticContext} [context] - Session context
 */

/**
 * Type guard to check if value is a plain object
 * @param {unknown} value - Value to check
 * @returns {value is Record<string, unknown>} Whether value is a plain object
 */
function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validate the request payload structure
 * @param {unknown} payload - The request payload
 * @returns {{ok: true, data: DiagnoseRequest} | {ok: false, error: string}} Validation result
 */
function validatePayload(payload) {
  if (!isObject(payload)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const body = payload;

  if (body.answers !== undefined && !isObject(body.answers)) {
    return { ok: false, error: "Field `answers` must be an object when provided." };
  }
  if (body.context !== undefined && !isObject(body.context)) {
    return { ok: false, error: "Field `context` must be an object when provided." };
  }

  const data = {
    answers: body.answers ?? {},
    context: body.context,
  };

  return { ok: true, data };
}

/**
 * POST /api/stuck/diagnose
 * Main endpoint for running the stuck diagnosis model
 * 
 * Request body:
 * {
 *   answers: Partial<DiagnosticAnswers>,
 *   context?: DiagnosticContext
 * }
 * 
 * Responses:
 * - 200: {status: "diagnosed", diagnosis, plan, insights, profile}
 * - 200: {status: "needs_more_answers", nextQuestion, questionQueue}
 * - 400: {error: string}
 * - 500: {error: string, message: string}
 * 
 * @param {Request} req - The request
 * @returns {Promise<NextResponse>} Response with diagnosis or next question
 */
export async function POST(req) {
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
        },
        { status: 200 }
      );
    }

    // Run diagnosis with hybrid model
    const diagnosis = await diagnoseWithHybridModel(
      validation.data.answers,
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
