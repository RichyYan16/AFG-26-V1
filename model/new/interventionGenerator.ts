/**
 * Intervention Plan Generator
 * Uses fallback logic to generate intervention plans
 * 
 * Boilerplate code generated using Claude Hiaiku 4.5 based on the following prompt:
 * "Implement boilerplate code for an intervention plan generator in TypeScript that creates personalized, actionable plans for students based on their diagnosed stuck type. The generator should produce a clear headline, a brief explanation of why the plan works, 3-5 specific steps with estimated time commitments, and a reflection prompt to encourage metacognition. Use fallback logic to provide a default intervention plan for each stuck type in case the Gemini API fails to generate a plan."
 */

import type {
  StuckType,
  StudentProfile,
  InterventionPlan,
} from "./types";
import { INTERVENTION_WEIGHTS } from "./weights";

interface AlternativeStep {
  timeMinutes?: number;
  action?: string;
  tip?: string;
}

interface AlternativePlanPayload {
  headline?: string;
  whyItWorks?: string;
  steps?: AlternativeStep[];
  reflectionPrompt?: string;
}

/**
 * Build a personalized intervention plan for a student
 * Uses fallback logic instead of Gemini generation
 */
export async function buildInterventionPlanForStudent(
  stuckType: StuckType,
  profile: StudentProfile,
): Promise<InterventionPlan> {
  // Use fallback intervention for now
  return getFallbackIntervention(stuckType);
}

/**
 * Generate multiple intervention plan options (list of ideas)
 * Returns an array of intervention plans for the student to choose from
 */
export async function buildMultipleInterventionPlans(
  stuckType: StuckType,
): Promise<InterventionPlan[]> {
  // Return just the fallback plan for now
  const primaryPlan = getFallbackIntervention(stuckType);
  return [primaryPlan];
}

/**
 * Get a quick intervention plan without full student history
 * Used when we just diagnosed a stuck type
 */
export async function buildQuickInterventionPlan(
  stuckType: StuckType,
): Promise<InterventionPlan> {
  // Use fallback intervention for now
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
