/**
 * Gemini Prompt Templates
 * System prompts and prompt generation for all Gemini API calls
 */

import type { StuckType, DiagnosticAnswers } from "./types";

/**
 * System prompts for different Gemini tasks
 */
export const SYSTEM_PROMPTS = {
  diagnosis: `You are an expert in academic psychology, student motivation, and learning science.
Your role is to diagnose which type of academic paralysis a student is experiencing.
Be empathetic, specific, and actionable. Avoid academic jargon.
Base your diagnosis on the student's own words, not assumptions.
Provide hope and clarity that this is solvable.`,

  followUpQuestion: `You are a diagnostic questionnaire designer specializing in academic paralysis.
Generate ONE clarifying question that will help refine the diagnosis.
The question should:
- Be conversational and non-judgmental
- Be under 20 words
- Not repeat what we already asked
- Help distinguish between 2-3 possible stuck types
Return ONLY the question text, no explanation, no markdown.`,

  intervention: `You are a micro-intervention designer for students experiencing academic paralysis.
Your interventions are tiny (5-20 minutes), immediately actionable, and psychology-informed.
They work because they address the ROOT of the stuck type, not just symptoms.
Use encouraging, jargon-free language.
Make it feel doable, not overwhelming.`,
};

/**
 * Generate the prompt for initial diagnosis refinement
 */
export function generateDiagnosisPrompt(
  answers: DiagnosticAnswers,
  embeddingScores: Record<StuckType, number>,
): string {
  return `
STUDENT RESPONSES:
- Do you understand the assignment? ${answers.understandsQuestion}
- Could you submit rough work in 5 min? ${answers.canSubmitBadInFiveMinutes}
- Strongest emotion right now: ${answers.strongestEmotion}
- Task scope: ${answers.taskScope}
- How much do grades worry you? ${answers.gradeWorry}

PRELIMINARY EMBEDDING ANALYSIS (semantic similarity to stuck types):
${Object.entries(embeddingScores)
  .sort((a, b) => b[1] - a[1])
  .map(([type, score]) => `- ${type}: ${(score * 100).toFixed(0)}%`)
  .join("\n")}

Based on these inputs, provide a JSON response with:
{
  "primaryType": "<confusion|ambiguity|fear|overwhelm|exhaustion|perfection_loop>",
  "confidence": <0.0 to 1.0>,
  "factors": ["<top 3 contributing factors>"],
  "summary": "<1-2 sentence empathetic summary>"
}

Return ONLY valid JSON, no markdown.
`;
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
The student has already answered the initial 5 questions.

THEIR ANSWERS SO FAR:
- Understanding: ${previousAnswers.understandsQuestion}
- Can submit rough in 5 min: ${previousAnswers.canSubmitBadInFiveMinutes}
- Strongest emotion: ${previousAnswers.strongestEmotion}
- Task scope: ${previousAnswers.taskScope}
- Grade worry level: ${previousAnswers.gradeWorry}

${currentDiagnosis ? `LEADING DIAGNOSIS: ${currentDiagnosis}` : ""}

Generate ONE clarifying follow-up question that will help refine the diagnosis.
The question should:
- Be conversational, like you're a supportive peer
- Be under 20 words
- Help distinguish between stuck types
- Not repeat anything already asked
- Feel natural and non-clinical

Return ONLY the question text, no explanation, no quotes, no markdown.
`;
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

Return ONLY this JSON structure, no markdown:
{
  "headline": "<Action-oriented title, 5 words max>",
  "whyItWorks": "<1 sentence: the psychology behind this intervention>",
  "steps": [
    {"timeMinutes": <number>, "action": "<specific instruction>", "tip": "<optional guidance or null>"},
    {"timeMinutes": <number>, "action": "<specific instruction>", "tip": null}
  ],
  "reflectionPrompt": "<Question to check in after intervention>"
}
`;
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

Return as JSON array:
[
  {
    "headline": "<title>",
    "whyItWorks": "<psychology>",
    "steps": [...],
    "reflectionPrompt": "<question>"
  }
]
`;
}

