/**
 * Intervention Plan Generator
 * Uses Gemini to generate personalized, tiny intervention plans
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateInterventionPlan } from "./geminiIntegration";
import { SYSTEM_PROMPTS } from "./prompts";
import type {
  StuckType,
  StudentProfile,
  InterventionPlan,
} from "./types";
import { INTERVENTION_WEIGHTS } from "./weights";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Build a personalized intervention plan for a student
 * Combines Gemini generation with student history context
 */
export async function buildInterventionPlanForStudent(
  stuckType: StuckType,
  profile: StudentProfile,
): Promise<InterventionPlan> {
  const typicalDuration = INTERVENTION_WEIGHTS.timingByType[stuckType] || 15;
  const subject =
    Object.keys(profile.bySubjectAndType).find((key) =>
      key.startsWith(stuckType),
    ) || "your assignment";
  const previousAttempts = profile.totalSessions;

  const context = {
    averageStuckMinutes: profile.averageTimeStuckMinutes || 45,
    subject,
    previousAttempts,
  };

  // Call Gemini to generate intervention
  const geminiPlan = await generateInterventionPlan(stuckType, context);

  // geminiPlan is already type InterventionPlan, return as-is
  return geminiPlan;
}

/**
 * Generate multiple intervention plan options (list of ideas)
 * Returns an array of intervention plans for the student to choose from
 */
export async function buildMultipleInterventionPlans(
  stuckType: StuckType,
): Promise<InterventionPlan[]> {
  const plans: InterventionPlan[] = [];
  const context = {
    averageStuckMinutes: 45,
    subject: "this assignment",
    previousAttempts: 1,
  };

  // Generate primary plan
  const primaryPlan = await generateInterventionPlan(stuckType, context);
  plans.push(primaryPlan);

  // Generate alternative approaches (up to 3 total options)
  try {
    const model = genAI.getGenerativeModel({
      model: INTERVENTION_WEIGHTS.geminiModel,
    });

    const prompt = `Generate 2 alternative micro-intervention plans for ${stuckType} (different from the primary one).
    Format as JSON array of plans. Keep it brief - each plan ~5-15 minutes.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: SYSTEM_PROMPTS.intervention,
    });

    const responseText =
      result.response.candidates?.[0]?.content.parts[0]?.text || "";

    // Try to parse alternatives
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      for (const alt of parsed.slice(0, 2)) {
        // Max 2 alternatives
        plans.push({
          stuckType,
          headline: alt.headline || "Alternative approach",
          whyItWorks: alt.whyItWorks || "Different strategy",
          steps: (alt.steps || []).map((s: any) => ({
            timeMinutes: s.timeMinutes || 5,
            action: s.action || "Continue",
            tip: s.tip,
          })),
          reflectionPrompt: alt.reflectionPrompt || "How are you feeling?",
          estimatedTotalMinutes:
            (alt.steps || []).reduce((sum: number, s: any) => sum + s.timeMinutes, 0) || 15,
        });
      }
    }
  } catch (error) {
    console.error("Error generating alternative plans:", error);
    // Fallback: return just the primary plan
  }

  return plans;
}

/**
 * Get a quick intervention plan without full student history
 * Used when we just diagnosed a stuck type
 */
export async function buildQuickInterventionPlan(
  stuckType: StuckType,
): Promise<InterventionPlan> {
  const context = {
    averageStuckMinutes: 45,
    subject: "this assignment",
    previousAttempts: 1,
  };

  return await generateInterventionPlan(stuckType, context);
}
