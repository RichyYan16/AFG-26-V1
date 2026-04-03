import type { AdaptiveQuestion, DiagnosticAnswers } from "./types";

/**
 * 5 Open-Response Diagnostic Questions
 * Simplified questionnaire for capturing student stuck feelings
 */
export const DIAGNOSTIC_QUESTIONS: AdaptiveQuestion[] = [
  {
    id: "internalVoice",
    prompt: "The voice in my head about this task mostly sounds like:",
    helperText: "What does the critical voice say?",
    options: [],
  },
  {
    id: "eightyPercentThought",
    prompt:
      "Imagine submitting an assignment knowing it's only 80% of what you are capable of. What is going through your head?",
    helperText: "Describe what thoughts or feelings come up.",
    options: [],
  },
  {
    id: "whyBestWork",
    prompt: "Why do you want to do your best on this assignment?",
    helperText: "What's driving you to care about quality?",
    options: [],
  },
  {
    id: "avoidanceDuration",
    prompt: "How long have you been avoiding this task?",
    helperText: "Days, weeks, or since you got the assignment?",
    options: [],
  },
  {
    id: "helpSeeking",
    prompt: "The thought of asking my professor/teacher for help makes me feel:",
    helperText: "What emotions or thoughts come up?",
    options: [],
  },
];

/**
 * Check if all diagnostic questions have been answered
 */
export function isDiagnosticComplete(answers: Partial<DiagnosticAnswers>): boolean {
  return (
    Boolean(answers.internalVoice) &&
    Boolean(answers.eightyPercentThought) &&
    Boolean(answers.whyBestWork) &&
    Boolean(answers.avoidanceDuration) &&
    Boolean(answers.helpSeeking)
  );
}

/**
 * Get the list of unanswered questions
 */
export function getUnansweredQuestions(
  answers: Partial<DiagnosticAnswers>,
): AdaptiveQuestion[] {
  return DIAGNOSTIC_QUESTIONS.filter((q) => !answers[q.id]);
}

/**
 * Get the list of all diagnostic questions
 */
export function getAllDiagnosticQuestions(): AdaptiveQuestion[] {
  return DIAGNOSTIC_QUESTIONS;
}

/**
 * Get the next unanswered question
 */
export function getNextUnansweredQuestion(
  answers: Partial<DiagnosticAnswers>,
): AdaptiveQuestion | null {
  const unanswered = getUnansweredQuestions(answers);
  return unanswered.length > 0 ? unanswered[0] : null;
}
