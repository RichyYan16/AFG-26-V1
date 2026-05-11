import type { AdaptiveQuestion, DiagnosticAnswers } from "./types";

/**
 * 5 Open-Response Diagnostic Questions
 * Simplified questionnaire for capturing student stuck feelings
 * 
 * Boilerplate code generated using Claude Hiaiku 4.5 based on the following prompt:
 * 
 * Prompt: I want to create a set of 5 open-response diagnostic questions for my Unstuck app to capture students' feelings and thoughts when they are stuck on an academic task. Please generate boilerplate code in TypeScript that defines these questions as an array of objects, where each object has an id, prompt text, and any necessary metadata for rendering (e.g., options for multiple choice, slider configuration). The questions should be designed to elicit insights about the student's internal voice, feelings about submitting imperfect work, reasons for wanting to do their best, duration of avoidance, and feelings about seeking help.
 * All logic was implemented by the authors
 */
export const DIAGNOSTIC_QUESTIONS: AdaptiveQuestion[] = [
  {
    id: "internalVoice",
    prompt: "The voice in my head about this task mostly sounds like:",
    options: [],
  },
  {
    id: "eightyPercentThought",
    prompt:
      "Imagine submitting an assignment knowing it's only 80% of what you are capable of. What is going through your head?",
    options: [],
  },
  {
    id: "whyBestWork",
    prompt: "Why do you want to do your best on this assignment?",
    options: [],
  },
  {
    id: "avoidanceDuration",
    prompt: "How long have you been avoiding this task?",
    options: [],
    kind: "slider",
    slider: {
      min: 0,
      max: 240,
      step: 5,
      marks: [
        { value: 0, label: "0 min" },
        { value: 60, label: "1 hr" },
        { value: 120, label: "2 hr" },
        { value: 180, label: "3 hr" },
        { value: 240, label: "4+ hr" },
        { value: 999, label: "More than 4 hr" },
      ],
    },
  },
  {
    id: "helpSeeking",
    prompt: "The thought of asking my professor/teacher for help makes me feel:",
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