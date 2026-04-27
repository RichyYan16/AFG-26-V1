/**
 * Gemini API Integration
 * Handles all calls to Google Generative AI for diagnosis refinement,
 * follow-up question generation, and intervention plan creation.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  SYSTEM_PROMPTS,
  generateDiagnosisPrompt,
  generateFollowUpPrompt,
  generateInterventionPrompt,
} from "./prompts";
import type { StuckType, DiagnosticAnswers, InterventionPlan } from "./types";
import { INTERVENTION_WEIGHTS } from "./weights";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Response from Gemini when refining diagnosis
 */
export interface DiagnosisFromGemini {
  primaryType: StuckType;
  confidence: number;
  factors: string[];
  summary: string;
}

/**
 * Response from Gemini when generating intervention
 */
export interface InterventionFromGemini {
  headline: string;
  whyItWorks: string;
  steps: Array<{
    timeMinutes: number;
    action: string;
    tip?: string;
  }>;
  reflectionPrompt: string;
}

interface ParsedInterventionStep {
  timeMinutes?: number;
  action?: string;
  tip?: string;
}

interface ParsedInterventionPayload {
  headline?: string;
  whyItWorks?: string;
  steps?: ParsedInterventionStep[];
  reflectionPrompt?: string;
}

/**
 * Call Gemini to refine diagnosis based on embedding scores + answers
 * Adds context and nuance to the embedding-based scores
 */
export async function refineDiagnosisWithGemini(
  answers: DiagnosticAnswers,
  embeddingScores: Record<StuckType, number>,
): Promise<DiagnosisFromGemini> {
  const maxRetries = 3;
  const baseDelay = 1000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: INTERVENTION_WEIGHTS.geminiModel,
      });

      const prompt = generateDiagnosisPrompt(answers, embeddingScores);

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        systemInstruction: SYSTEM_PROMPTS.diagnosis,
      });

      const responseText =
        result.response.candidates?.[0]?.content.parts[0]?.text || "{}";

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : {
            primaryType: "overwhelm",
            confidence: 0.5,
            factors: ["Unable to parse response"],
            summary: "Error parsing Gemini response",
          };

      return {
        primaryType: parsed.primaryType as StuckType,
        confidence: parsed.confidence as number,
        factors: (parsed.factors as string[]) || [],
        summary: (parsed.summary as string) || "",
      };
    } catch (error) {
      console.error(`Error refining diagnosis with Gemini (attempt ${attempt}/${maxRetries}):`, error);
      
      // Check if it's a 503 error and we should retry
      if (error instanceof Error && error.message.includes('503') && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`Gemini 503 error, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If this is the last attempt or a different error, use fallback
      break;
    }
  }
  
  // Fallback to embedding-based diagnosis
  console.warn('Using fallback diagnosis due to Gemini API failures');
  const topType = Object.entries(embeddingScores).sort(
    (a, b) => b[1] - a[1],
  )[0];
  return {
    primaryType: topType[0] as StuckType,
    confidence: topType[1],
    factors: ["Fallback diagnosis due to API error"],
    summary:
      "Unable to refine with AI; using embedding analysis. Please try again.",
  };
}

/**
 * Generate follow-up questions to be displayed to the user
 * Returns array of 5 questions with options for user interaction
 */
export async function generateFollowUpQuestions(
  answers: DiagnosticAnswers,
  embeddingScores: Record<StuckType, number>,
  maxDiagnosis: StuckType,
): Promise<Array<{ id: string; prompt: string; options: Array<{ value: string; label: string }> }>> {
  const questions = [];

  for (let i = 1; i <= 5; i++) {
    try {
      const model = genAI.getGenerativeModel({
        model: INTERVENTION_WEIGHTS.geminiModel,
      });

      const prompt = generateFollowUpPrompt(answers, i, maxDiagnosis);

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        systemInstruction: SYSTEM_PROMPTS.followUpQuestion,
      });

      const questionText =
        result.response.candidates?.[0]?.content.parts[0]?.text ||
        `Tell me more about your experience.`;

      // Parse response to extract question and options
      questions.push({
        id: `follow_up_${i}`,
        prompt: questionText,
        options: [
          { value: "strongly_agree", label: "Strongly Agree" },
          { value: "agree", label: "Agree" },
          { value: "neutral", label: "Neutral" },
          { value: "disagree", label: "Disagree" },
        ],
      });
    } catch (error) {
      console.error(`Error generating follow-up question ${i}:`, error);
      questions.push({
        id: `follow_up_${i}`,
        prompt: `Can you provide more context about your situation?`,
        options: [
          { value: "strongly_agree", label: "Strongly Agree" },
          { value: "agree", label: "Agree" },
          { value: "neutral", label: "Neutral" },
          { value: "disagree", label: "Disagree" },
        ],
      });
    }
  }

  return questions;
}

/**
 * Generate personalized intervention plan for the diagnosed stuck type
 */
export async function generateInterventionPlan(
  stuckType: StuckType,
  context: {
    averageStuckMinutes: number;
    subject: string;
    previousAttempts: number;
  },
): Promise<InterventionPlan> {
  const maxRetries = 3;
  const baseDelay = 1000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: INTERVENTION_WEIGHTS.geminiModel,
      });

      const prompt = generateInterventionPrompt(stuckType, context);

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        systemInstruction: SYSTEM_PROMPTS.intervention,
      });

      const responseText =
        result.response.candidates?.[0]?.content.parts[0]?.text || "{}";

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const parsed: ParsedInterventionPayload = jsonMatch
        ? (JSON.parse(jsonMatch[0]) as ParsedInterventionPayload)
        : getFallbackIntervention(stuckType);

      const steps = parsed.steps || [];
      const estimatedTotal = steps.reduce(
        (sum: number, step) => sum + (step.timeMinutes || 5),
        0,
      );

      return {
        stuckType,
        headline: parsed.headline || "Take a small step",
        whyItWorks: parsed.whyItWorks || "Every small action builds momentum.",
        steps: steps.map((step) => ({
          timeMinutes: step.timeMinutes || 5,
          action: step.action || "Continue with next step",
          tip: step.tip || undefined,
        })),
        reflectionPrompt:
          parsed.reflectionPrompt ||
          "How are you feeling now compared to before?",
        estimatedTotalMinutes: estimatedTotal || 15,
      };
    } catch (error) {
      console.error(`Error generating intervention plan (attempt ${attempt}/${maxRetries}):`, error);
      
      // Check if it's a 503 error and we should retry
      if (error instanceof Error && error.message.includes('503') && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`Gemini 503 error, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If this is the last attempt or a different error, use fallback
      break;
    }
  }
  
  // Fallback intervention if Gemini fails
  console.warn('Using fallback intervention plan due to Gemini API failures');
  return getFallbackIntervention(stuckType);
}

/**
 * Fallback intervention if Gemini fails
 * Based on stuck type research
 */
function getFallbackIntervention(stuckType: StuckType): InterventionPlan {
  const fallbacks: Record<StuckType, InterventionPlan> = {
    confusion: {
      stuckType,
      headline: "Re-read with a question in mind",
      whyItWorks:
        "Having a specific target makes reading active, not passive.",
      steps: [
        { timeMinutes: 2, action: "Write down your #1 confusion point" },
        {
          timeMinutes: 3,
          action: "Re-read just that section, looking for the answer",
          tip: "Highlight/underline as you go",
        },
        {
          timeMinutes: 2,
          action: "Jot down what you found",
          tip: "Even if it's 'still confused,' that's progress",
        },
      ],
      reflectionPrompt: "Did that specific re-read help, even a little?",
      estimatedTotalMinutes: 7,
    },
    ambiguity: {
      stuckType,
      headline: "Ask for clarification",
      whyItWorks:
        "You can't read the professor's mind—but you can ask them.",
      steps: [
        {
          timeMinutes: 3,
          action: "Write your specific question (2-3 sentences max)",
          tip: "Not 'what do you want' but 'is this X or Y'",
        },
        {
          timeMinutes: 2,
          action: "Send it to the professor or TA right now",
          tip: "Don't wait; they're usually happy to clarify",
        },
      ],
      reflectionPrompt: "How does it feel to have asked instead of guessed?",
      estimatedTotalMinutes: 5,
    },
    fear: {
      stuckType,
      headline: "Separate imagination from reality",
      whyItWorks: "Our brains catastrophize; grounding helps.",
      steps: [
        {
          timeMinutes: 3,
          action: "Write the actual worst-case scenario (1 sentence)",
        },
        {
          timeMinutes: 2,
          action: "Write the most likely scenario",
          tip: "Usually much less scary",
        },
        {
          timeMinutes: 2,
          action: "Write one small action you can take right now",
        },
      ],
      reflectionPrompt:
        "Does the likely outcome feel more manageable than your fear?",
      estimatedTotalMinutes: 7,
    },
    overwhelm: {
      stuckType,
      headline: "Break it into one tiny piece",
      whyItWorks: "Overwhelm lives in the big picture; action lives in small steps.",
      steps: [
        {
          timeMinutes: 2,
          action: "List the 3-5 main parts of this assignment",
        },
        {
          timeMinutes: 3,
          action: "Pick the smallest, least scary part",
          tip: "Not the most important—the most doable",
        },
        {
          timeMinutes: 5,
          action: "Work on just that part for 5 minutes",
          tip: "Set a timer if it helps",
        },
      ],
      reflectionPrompt: "Does the assignment feel smaller now?",
      estimatedTotalMinutes: 10,
    },
    exhaustion: {
      stuckType,
      headline: "Restore, don't push",
      whyItWorks:
        "Exhaustion is your body's signal; rest is the intervention.",
      steps: [
        {
          timeMinutes: 5,
          action: "Do something non-productive: walk, stretch, snack, music",
          tip: "No phone; no 'productive' rest",
        },
        {
          timeMinutes: 3,
          action: "Drink water, get fresh air if possible",
        },
        {
          timeMinutes: 5,
          action: "After rest, return to ONE small task for 5 minutes",
          tip: "You might feel 10% better with a break",
        },
      ],
      reflectionPrompt: "Do you feel even slightly more awake?",
      estimatedTotalMinutes: 13,
    },
    perfection_loop: {
      stuckType,
      headline: "Submit the rough draft",
      whyItWorks:
        "Perfection is a loop; done is forward. Done can be improved; stuck cannot.",
      steps: [
        {
          timeMinutes: 2,
          action: "Set a timer for 10 min",
          tip: "You're not editing anymore—you're submitting",
        },
        {
          timeMinutes: 8,
          action: "Do your best for 10 minutes, then stop",
          tip: "No tweaks after the timer",
        },
        {
          timeMinutes: 2,
          action: "Submit / turn in before you can second-guess",
          tip: "Close the tab if you have to",
        },
      ],
      reflectionPrompt: "How does it feel to be done instead of perfect?",
      estimatedTotalMinutes: 12,
    },
  };

  return fallbacks[stuckType];
}
