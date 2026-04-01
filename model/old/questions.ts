import {
  DIAGNOSTIC_QUESTION_IDS,
  type AdaptiveQuestion,
  type DiagnosticAnswers,
  type QuestionId,
} from "./types";

const QUESTION_OPTIONS: Record<QuestionId, AdaptiveQuestion["options"]> = {
  understandsQuestion: [
    { value: "yes", label: "Yes, I understand it." },
    { value: "partly", label: "Partly, but pieces are unclear." },
    { value: "no", label: "No, I do not understand it." },
  ],
  canSubmitBadInFiveMinutes: [
    { value: "yes", label: "Yes, I could submit something rough." },
    { value: "maybe", label: "Maybe, but I would hesitate." },
    { value: "no", label: "No, I freeze when I try." },
  ],
  strongestEmotion: [
    { value: "anxious", label: "Anxious" },
    { value: "numb", label: "Numb" },
    { value: "frustrated", label: "Frustrated" },
    { value: "scared", label: "Scared" },
    { value: "overwhelmed", label: "Overwhelmed" },
    { value: "guilty", label: "Guilty" },
  ],
  taskScope: [
    { value: "small_clear", label: "Small and clear" },
    { value: "large_clear", label: "Clear, but too big" },
    { value: "unclear", label: "Unclear what done means" },
  ],
  gradeWorry: [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ],
};

function getQuestionOrder(answers: Partial<DiagnosticAnswers>): QuestionId[] {
  const order: QuestionId[] = [
    "understandsQuestion",
    "canSubmitBadInFiveMinutes",
    "strongestEmotion",
    "taskScope",
    "gradeWorry",
  ];

  if (
    answers.understandsQuestion === "partly" ||
    answers.understandsQuestion === "no"
  ) {
    return [
      "understandsQuestion",
      "taskScope",
      "strongestEmotion",
      "canSubmitBadInFiveMinutes",
      "gradeWorry",
    ];
  }

  if (answers.canSubmitBadInFiveMinutes === "no") {
    return [
      "understandsQuestion",
      "canSubmitBadInFiveMinutes",
      "gradeWorry",
      "strongestEmotion",
      "taskScope",
    ];
  }

  return order;
}

function buildQuestion(
  id: QuestionId,
  answers: Partial<DiagnosticAnswers>,
): AdaptiveQuestion {
  switch (id) {
    case "understandsQuestion":
      return {
        id,
        prompt: "Do you understand what this assignment is asking?",
        helperText: "Quick gut answer, no overthinking.",
        options: QUESTION_OPTIONS[id],
      };
    case "canSubmitBadInFiveMinutes":
      return {
        id,
        prompt: "If you had to submit something rough in 5 minutes, could you?",
        helperText: "This checks fear/perfection friction, not skill.",
        options: QUESTION_OPTIONS[id],
      };
    case "strongestEmotion":
      return {
        id,
        prompt: "What emotion is strongest right now?",
        options: QUESTION_OPTIONS[id],
      };
    case "taskScope":
      return {
        id,
        prompt:
          answers.understandsQuestion === "yes"
            ? "Is the task clear but too large, or clear and small?"
            : "Is the task unclear, or clear but too large?",
        options: QUESTION_OPTIONS[id],
      };
    case "gradeWorry":
      return {
        id,
        prompt: "How worried are you about your grade on this task?",
        options: QUESTION_OPTIONS[id],
      };
    default: {
      const neverQuestion: never = id;
      throw new Error(`Unsupported question id: ${neverQuestion}`);
    }
  }
}

export function listQuestionnaire(
  answers: Partial<DiagnosticAnswers> = {},
): AdaptiveQuestion[] {
  return getQuestionOrder(answers).map((questionId) =>
    buildQuestion(questionId, answers),
  );
}

export function getNextQuestion(
  answers: Partial<DiagnosticAnswers>,
): AdaptiveQuestion | null {
  const order = getQuestionOrder(answers);

  for (const id of order) {
    if (answers[id] === undefined) {
      return buildQuestion(id, answers);
    }
  }

  return null;
}

export function isDiagnosticComplete(
  answers: Partial<DiagnosticAnswers>,
): answers is DiagnosticAnswers {
  return DIAGNOSTIC_QUESTION_IDS.every((id) => answers[id] !== undefined);
}
