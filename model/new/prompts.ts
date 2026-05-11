/**
 * OpenRouter API Prompt Templates
 * System prompts and prompt generation for all OpenRouter API calls
 * 
 * File code generated using Claude Hiaiku 4.5 based on the following prompt:
 * "Generate boilerplate code to implement prompts for different OpenRouter API tasks related to diagnosing and intervening in academic paralysis."
 * 
 */

import type { StuckType, DiagnosticAnswers } from "./types";

/**
 * System prompts for different OpenRouter tasks
 */
export const SYSTEM_PROMPTS = {
  diagnosis: `You are an expert in academic psychology, student motivation, and learning science.
Your role is to diagnose which type of academic paralysis a student is experiencing.
Be empathetic, specific, and actionable. Avoid academic jargon.
Base your diagnosis on the student's own words, not assumptions.
Provide hope and clarity that this is solvable.

Feel free to respond naturally while including the key information needed. You can use conversational language and add encouraging insights beyond just the facts.`,

  followUpQuestion: `You are a diagnostic questionnaire designer specializing in academic paralysis.
Generate ONE clarifying question that will help refine the diagnosis.
The question should:
- Be conversational and non-judgmental
- Be under 20 words
- Not repeat what we already asked
- Help distinguish between 2-3 possible stuck types

Feel free to make it sound natural and supportive, like you're actually talking to someone who needs help.`,

  intervention: `You are a micro-intervention designer for students experiencing academic paralysis.
Your interventions are tiny (5-20 minutes), immediately actionable, and psychology-informed.
They work because they address the ROOT of the stuck type, not just symptoms.
Use encouraging, jargon-free language.
Make it feel doable, not overwhelming.

You have flexibility to be creative with the intervention steps and explanations. Focus on what would genuinely help someone in this situation.`,
};

/**
 * Generate the prompt for initial diagnosis refinement
 */
export function generateDiagnosisPrompt(
  answers: DiagnosticAnswers,
  embeddingScores: Record<StuckType, number>,
): string {
  return `
STUDENT RESPONSES (OPEN-RESPONSE):
- Internal voice about this task: "${answers.internalVoice}"
- Thought about 80% submission: "${answers.eightyPercentThought}"
- Why doing their best: "${answers.whyBestWork}"
- Avoidance duration: "${answers.avoidanceDuration}"
- Feeling about asking for help: "${answers.helpSeeking}"

PRELIMINARY EMBEDDING ANALYSIS (semantic similarity to stuck types):
${Object.entries(embeddingScores)
  .sort((a, b) => b[1] - a[1])
  .map(([type, score]) => `- ${type}: ${(score * 100).toFixed(0)}%`)
  .join("\n")}

Based on these inputs, provide a diagnosis. Please include:
- The primary stuck type (confusion, ambiguity, fear, overwhelm, exhaustion, or perfection_loop)
- Your confidence level (0.0 to 1.0)
- The top 3 contributing factors you notice
- A brief empathetic summary (1-2 sentences)

You can respond in a natural, conversational way while including this information. Feel free to add encouraging insights or observations that might help the student feel understood.`;
}

/**
 * Generate the prompt for follow-up diagnostic questions
 */
export function generateFollowUpPrompt(
  previousAnswers: DiagnosticAnswers,
  questionNumber: number,
  currentDiagnosis?: StuckType,
): string {
  return `
CONTEXT: This is diagnostic question #${questionNumber} of 5.
The student has answered their initial assessment.

THEIR RESPONSES:
- Internal voice: "${previousAnswers.internalVoice}"
- 80% submission thought: "${previousAnswers.eightyPercentThought}"
- Why best work matters: "${previousAnswers.whyBestWork}"
- Avoidance duration: "${previousAnswers.avoidanceDuration}"
- Help-seeking feeling: "${previousAnswers.helpSeeking}"

${currentDiagnosis ? `LEADING DIAGNOSIS: ${currentDiagnosis}` : ""}

Generate ONE clarifying follow-up question that will help refine the diagnosis.
The question should:
- Be conversational, like you're a supportive peer
- Be under 20 words
- Help distinguish between stuck types
- Not repeat anything already asked
- Feel natural and non-clinical

Just give me the question itself - you can make it sound warm and encouraging.`;
}

/**
 * Generate the prompt for intervention plan generation
 */
export function generateInterventionPrompt(
  stuckType: StuckType,
  studentContext: {
    averageStuckMinutes: number;
    subject: string;
    previousAttempts: number;
  },
): string {
  const typicalDurations: Record<StuckType, number> = {
    confusion: 10,
    ambiguity: 5,
    fear: 15,
    overwhelm: 20,
    exhaustion: 25,
    perfection_loop: 8,
  };

  const suggestedDuration = typicalDurations[stuckType];

  return `
INTERVENTION DESIGN BRIEF:
- Stuck Type: ${stuckType}
- Subject: ${studentContext.subject}
- Usually stuck for: ~${studentContext.averageStuckMinutes} minutes
- This is attempt: #${studentContext.previousAttempts}
- Suggested duration: ${suggestedDuration} minutes

Generate a micro-intervention plan that:
1. Is specific to ${stuckType}
2. Takes ~${suggestedDuration} minutes total
3. Includes 3-4 concrete, doable steps
4. Explains WHY each step works (psychology)
5. Ends with a reflection prompt

Please structure your response with:
- A headline (action-oriented, 5 words max)
- Why it works (1 sentence about the psychology)
- Steps with time estimates and specific actions
- A reflection question

Feel free to be creative with the steps and make them genuinely helpful. You can add encouraging notes or tips that seem appropriate for someone experiencing ${stuckType}.`;
}

/**
 * Alternative prompt for generating multiple intervention options
 */
export function generateMultipleInterventionOptionsPrompt(
  stuckType: StuckType,
  studentContext: {
    averageStuckMinutes: number;
    subject: string;
    previousAttempts: number;
  },
): string {
  return `
Generate 3 different micro-intervention options for a student with ${stuckType}.

Student context:
- Subject: ${studentContext.subject}
- Usually stuck for: ${studentContext.averageStuckMinutes} minutes
- Attempt number: ${studentContext.previousAttempts}

Each intervention should:
- Be 5-20 minutes
- Work differently (e.g., one body-based, one cognitive, one environmental)
- Be specific to ${stuckType}

For each option, please include:
- A headline/title
- Why it works (the psychology behind it)
- 3-4 specific steps with time estimates
- A reflection prompt

Feel free to be creative and make these genuinely helpful. You can vary the approaches - some might be more reflective, others more action-oriented, etc. Present them as distinct options the student can choose from.`;
}
