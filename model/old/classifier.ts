import {
  createEmptyTypeCounts,
  type DiagnosticAnswers,
  type DiagnosticContext,
  type DiagnosisResult,
  type StuckType,
  type TypeScore,
} from "./types";

const TYPE_LABELS: Record<StuckType, string> = {
  confusion: "Confusion Stuck",
  ambiguity: "Ambiguity Stuck",
  fear: "Fear Stuck",
  overwhelm: "Overwhelm Stuck",
  exhaustion: "Exhaustion Stuck",
  perfection_loop: "Perfection Loop Stuck",
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function diagnoseStuckType(
  answers: DiagnosticAnswers,
  context: DiagnosticContext = {},
): DiagnosisResult {
  const scores = createEmptyTypeCounts();
  const reasons: Record<StuckType, string[]> = {
    confusion: [],
    ambiguity: [],
    fear: [],
    overwhelm: [],
    exhaustion: [],
    perfection_loop: [],
  };

  const addScore = (type: StuckType, points: number, reason: string): void => {
    scores[type] += points;
    reasons[type].push(reason);
  };

  if (answers.understandsQuestion === "no") {
    addScore("confusion", 4, "You reported not understanding the assignment.");
    addScore("ambiguity", 1, "Low clarity can create uncertainty about done.");
  } else if (answers.understandsQuestion === "partly") {
    addScore(
      "confusion",
      3,
      "Partial understanding often leads to repeated rereading.",
    );
    addScore("ambiguity", 1, "Partly clear tasks can still feel undefined.");
  }

  if (answers.taskScope === "unclear") {
    addScore("ambiguity", 4, "Task completion criteria feel unclear.");
    addScore("overwhelm", 1, "Unclear tasks can trigger freeze.");
  } else if (answers.taskScope === "large_clear") {
    addScore("overwhelm", 3, "The task is clear but feels too big.");
  }

  if (answers.canSubmitBadInFiveMinutes === "no") {
    addScore("fear", 2, "Action feels risky right now.");
    addScore(
      "perfection_loop",
      3,
      "Unable to submit rough work often signals perfection pressure.",
    );
  } else if (answers.canSubmitBadInFiveMinutes === "maybe") {
    addScore("fear", 1, "Hesitation suggests performance anxiety.");
    addScore("perfection_loop", 1, "Quality concerns are slowing action.");
  }

  if (answers.gradeWorry === "high") {
    addScore("fear", 3, "High grade concern raises fear of failure.");
    addScore("perfection_loop", 2, "High grade concern can drive over-editing.");
  } else if (answers.gradeWorry === "medium") {
    addScore("fear", 1, "Moderate grade concern is present.");
    addScore("perfection_loop", 1, "Moderate grade concern can raise standards.");
  }

  switch (answers.strongestEmotion) {
    case "scared":
    case "anxious":
      addScore("fear", 3, "Your strongest emotion is fear-based.");
      break;
    case "overwhelmed":
      addScore("overwhelm", 4, "You reported overwhelm as the strongest state.");
      break;
    case "numb":
      addScore("exhaustion", 4, "Numbness often tracks with low cognitive energy.");
      break;
    case "frustrated":
      addScore("confusion", 1, "Frustration can reflect concept gaps.");
      addScore("ambiguity", 1, "Frustration can also reflect unclear instructions.");
      break;
    case "guilty":
      addScore("fear", 1, "Guilt can signal fear of disappointing outcomes.");
      addScore(
        "perfection_loop",
        1,
        "Guilt is often linked to over-control and over-revision.",
      );
      break;
    default: {
      const neverEmotion: never = answers.strongestEmotion;
      throw new Error(`Unsupported emotion: ${neverEmotion}`);
    }
  }

  if ((context.timeStuckMinutes ?? 0) >= 90) {
    addScore("overwhelm", 1, "Long stalls usually include overload.");
    addScore("exhaustion", 1, "Long stalls also deplete mental energy.");
  }

  if ((context.tasksOpenCount ?? 0) >= 4) {
    addScore("overwhelm", 2, "Many open tasks increase cognitive switching costs.");
  }

  if ((context.energyLevel ?? 5) <= 2) {
    addScore("exhaustion", 2, "Low energy points to recovery needs.");
  }

  if ((context.panicLevel ?? 1) >= 4) {
    addScore("fear", 1, "High panic level intensifies failure avoidance.");
    addScore("overwhelm", 1, "High panic level can trigger freezing.");
  }

  if (context.repeatedRereading) {
    addScore("confusion", 2, "Repeated rereading suggests unresolved understanding.");
  }

  if (context.excessiveEditing) {
    addScore("perfection_loop", 2, "Excessive editing signals completion anxiety.");
  }

  const rankedTypes: TypeScore[] = (Object.keys(scores) as StuckType[])
    .map((type) => ({
      type,
      score: scores[type],
      normalized: 0,
      reasons: reasons[type],
    }))
    .sort((a, b) => b.score - a.score);

  const totalScore =
    rankedTypes.reduce((sum, item) => sum + item.score, 0) || rankedTypes.length;

  const normalized = rankedTypes.map((item) => ({
    ...item,
    normalized: item.score / totalScore,
  }));

  const primary = normalized[0];
  const runnerUp = normalized[1];
  const spread = primary.score - runnerUp.score;
  const confidence = clamp(
    0.35 + primary.normalized * 0.45 + Math.min(spread, 4) * 0.08,
    0.2,
    0.96,
  );

  const summary = `${TYPE_LABELS[primary.type]} detected (${Math.round(
    confidence * 100,
  )}% confidence).`;

  return {
    primaryType: primary.type,
    confidence,
    rankedTypes: normalized,
    summary,
  };
}
