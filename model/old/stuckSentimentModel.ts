export type StuckType =
  | "confusion_stuck"
  | "ambiguity_stuck"
  | "fear_stuck"
  | "overwhelm_stuck"
  | "exhaustion_stuck"
  | "perfection_loop_stuck";

export type StrongEmotion =
  | "anxious"
  | "numb"
  | "frustrated"
  | "scared"
  | "overwhelmed"
  | "guilty";

export type Outcome = "started" | "finished" | "gave_up";

export interface DiagnosticAnswers {
  understandsQuestion: "yes" | "partly" | "no";
  canSubmitBadIn5Min: "yes" | "maybe" | "no";
  strongestEmotion: StrongEmotion;
  taskScope: "small_clear" | "large" | "unclear" | "large_and_unclear";
  gradeWorry: "low" | "medium" | "high";
}

export interface BehavioralSignals {
  rereadingSameSentence?: boolean;
  repeatedGoogling?: boolean;
  tabSwitching?: boolean;
  startingAndStopping?: boolean;
  anxietySpikeOnOpen?: boolean;
  manyTasksOpen?: boolean;
  physicalHeaviness?: boolean;
  excessiveEditing?: boolean;
  minutesStuck?: number;
  shameLevel?: number;
  fearLevel?: number;
  energyLevel?: number;
}

export interface DiagnosticInput {
  subject: string;
  assignmentType: string;
  assignmentText?: string;
  studentStatement?: string;
  selfTalk?: string[];
  answers: DiagnosticAnswers;
  signals?: BehavioralSignals;
}

export interface DistortionHit {
  type:
    | "catastrophizing"
    | "all_or_nothing"
    | "fortune_telling"
    | "labeling"
    | "should_statement"
    | "identity_fusion";
  confidence: number;
  evidence: string[];
  reframe: string;
}

export interface SentimentProfile {
  label: "distressed" | "guarded" | "neutral" | "engaged";
  valence: number;
  arousal: number;
  shame: number;
  fear: number;
  overwhelm: number;
  mentalEnergy: number;
  dominantEmotion: StrongEmotion;
}

export interface InterventionPlan {
  stuckType: StuckType;
  explanation: string;
  tinyNextStep: string;
  timerMinutes: number;
  actions: string[];
  safetyNotes: string[];
  clarificationQuestions?: string[];
  helpRequestTemplate?: string;
  doneDefinitionChecklist?: string[];
}

export interface StuckDiagnosis {
  primaryType: StuckType;
  confidence: number;
  typeScores: Record<StuckType, number>;
  sentiment: SentimentProfile;
  distortions: DistortionHit[];
  intervention: InterventionPlan;
  safetyFlags: string[];
  guardrails: string[];
}

export interface SessionRecord {
  timestampIso: string;
  subject: string;
  assignmentType: string;
  stuckType: StuckType;
  emotion: StrongEmotion;
  timeStuckMinutes: number;
  interventionUsed: string;
  outcome: Outcome;
  shameLevel: number;
  fearLevel: number;
  selfTalk?: string[];
}

export interface WeeklyInsightsReport {
  summary: string;
  insights: string[];
  countsByStuckType: Record<StuckType, number>;
  subjectRiskHighlights: string[];
}

export interface AdaptiveQuestion {
  id:
    | "understandsQuestion"
    | "canSubmitBadIn5Min"
    | "strongestEmotion"
    | "taskScope"
    | "gradeWorry";
  prompt: string;
  options: string[];
}

const STUCK_TYPES: StuckType[] = [
  "confusion_stuck",
  "ambiguity_stuck",
  "fear_stuck",
  "overwhelm_stuck",
  "exhaustion_stuck",
  "perfection_loop_stuck",
];

const DISTRESS_TERMS = [
  "stuck",
  "panic",
  "ashamed",
  "guilty",
  "freeze",
  "frozen",
  "avoid",
  "anxious",
  "scared",
  "overwhelmed",
  "drained",
  "empty",
  "tired",
  "hopeless",
];

const CALM_TERMS = [
  "clear",
  "okay",
  "manageable",
  "ready",
  "understand",
  "confident",
  "can do",
  "start",
];

const STUCK_KEYWORDS: Record<StuckType, string[]> = {
  confusion_stuck: [
    "do not understand",
    "don't understand",
    "what is this asking",
    "confused",
    "reread",
    "keep googling",
    "prerequisite",
  ],
  ambiguity_stuck: [
    "not sure what done means",
    "what does done look like",
    "unclear instructions",
    "rubric",
    "expectation",
    "minimum submission",
    "acceptable",
  ],
  fear_stuck: [
    "if i fail",
    "gpa",
    "grade",
    "prove i am bad",
    "gifted",
    "anxiety",
    "scared to start",
  ],
  overwhelm_stuck: [
    "too much",
    "too many",
    "cannot start",
    "everything at once",
    "swamped",
    "drowning",
    "panic",
  ],
  exhaustion_stuck: [
    "brain is empty",
    "zoning out",
    "zone out",
    "drained",
    "exhausted",
    "heavy",
    "sleepy",
  ],
  perfection_loop_stuck: [
    "not good enough",
    "perfect",
    "keep rewriting",
    "editing forever",
    "never finished",
    "polish",
    "submit only when perfect",
  ],
};

const DISTORTION_RULES: Array<{
  type: DistortionHit["type"];
  patterns: RegExp[];
  reframe: string;
}> = [
  {
    type: "catastrophizing",
    patterns: [/\bthis will ruin everything\b/i, /\bi('?| a)m doomed\b/i, /\bdisaster\b/i],
    reframe: "Name the real worst case, then the most likely case. They are usually different.",
  },
  {
    type: "all_or_nothing",
    patterns: [/\bperfect or fail\b/i, /\ball or nothing\b/i, /\bcompletely useless\b/i],
    reframe: "Partial progress still changes your grade and learning trajectory.",
  },
  {
    type: "fortune_telling",
    patterns: [/\bi will fail\b/i, /\bthey will think i am dumb\b/i, /\bi already know it won't work\b/i],
    reframe: "Predictions are not outcomes. Gather one piece of evidence before concluding.",
  },
  {
    type: "labeling",
    patterns: [/\bi am lazy\b/i, /\bi am stupid\b/i, /\bi am a failure\b/i],
    reframe: "Describe the state, not your identity: 'I am overloaded right now' is actionable.",
  },
  {
    type: "should_statement",
    patterns: [/\bi should never struggle\b/i, /\bi should already know this\b/i],
    reframe: "Replace 'should' with a plan: what is one skill gap you can close in 10 minutes?",
  },
  {
    type: "identity_fusion",
    patterns: [/\bmy grade is my worth\b/i, /\bif this is bad i am bad\b/i],
    reframe: "Your identity and one assignment outcome are separate variables.",
  },
];

const CRISIS_PATTERNS = [
  /\bi want to disappear\b/i,
  /\bi don't want to be here\b/i,
  /\bhurt myself\b/i,
  /\bself harm\b/i,
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(" ")
    .filter(Boolean);
}

function countPhraseMatches(haystack: string, phrases: string[]): number {
  const normalized = normalizeText(haystack);
  return phrases.reduce((sum, phrase) => (normalized.includes(phrase) ? sum + 1 : sum), 0);
}

function scoreFromRange(value: number | undefined, low: number, high: number): number {
  if (value === undefined) {
    return 0;
  }
  return clamp((value - low) / (high - low), 0, 1);
}

function getAllText(input: DiagnosticInput): string {
  return [input.assignmentText, input.studentStatement, ...(input.selfTalk ?? [])]
    .filter(Boolean)
    .join(" ");
}

function detectThoughtDistortions(input: DiagnosticInput): DistortionHit[] {
  const lines = [input.studentStatement, ...(input.selfTalk ?? [])]
    .filter(Boolean)
    .map((line) => String(line));

  const hits: DistortionHit[] = [];

  for (const rule of DISTORTION_RULES) {
    const evidence: string[] = [];
    for (const line of lines) {
      if (rule.patterns.some((pattern) => pattern.test(line))) {
        evidence.push(line);
      }
    }
    if (evidence.length > 0) {
      hits.push({
        type: rule.type,
        confidence: clamp(0.4 + evidence.length * 0.25, 0, 1),
        evidence,
        reframe: rule.reframe,
      });
    }
  }

  return hits;
}

function scoreSentiment(input: DiagnosticInput): SentimentProfile {
  const text = getAllText(input);
  const tokens = tokenize(text);
  const signals = input.signals ?? {};

  const distressCount = DISTRESS_TERMS.reduce(
    (sum, term) => sum + tokens.filter((token) => token === term).length,
    0,
  );
  const calmCount = CALM_TERMS.reduce((sum, term) => sum + countPhraseMatches(text, [term]), 0);

  const explicitFear = input.answers.strongestEmotion === "scared" ? 1 : 0;
  const explicitOverwhelm = input.answers.strongestEmotion === "overwhelmed" ? 1 : 0;
  const explicitAnxiety = input.answers.strongestEmotion === "anxious" ? 1 : 0;
  const explicitNumb = input.answers.strongestEmotion === "numb" ? 1 : 0;
  const explicitGuilt = input.answers.strongestEmotion === "guilty" ? 1 : 0;
  const explicitFrustration = input.answers.strongestEmotion === "frustrated" ? 1 : 0;

  const shame = clamp(
    scoreFromRange(signals.shameLevel, 0, 10) * 0.6 + explicitGuilt * 0.35 + distressCount * 0.03,
    0,
    1,
  );
  const fear = clamp(
    scoreFromRange(signals.fearLevel, 0, 10) * 0.5 +
      explicitFear * 0.35 +
      explicitAnxiety * 0.2 +
      (input.answers.gradeWorry === "high" ? 0.2 : input.answers.gradeWorry === "medium" ? 0.1 : 0),
    0,
    1,
  );
  const overwhelm = clamp(
    explicitOverwhelm * 0.45 +
      (input.answers.taskScope === "large_and_unclear"
        ? 0.35
        : input.answers.taskScope === "large"
          ? 0.2
          : 0) +
      (signals.manyTasksOpen ? 0.2 : 0) +
      distressCount * 0.02,
    0,
    1,
  );
  const mentalEnergy = clamp(
    (signals.energyLevel !== undefined ? scoreFromRange(signals.energyLevel, 0, 10) : 0.6) -
      explicitNumb * 0.25 -
      (signals.physicalHeaviness ? 0.2 : 0) -
      scoreFromRange(signals.minutesStuck, 60, 240) * 0.2,
    0,
    1,
  );

  const valence = clamp((calmCount - distressCount) / (distressCount + calmCount + 4), -1, 1);
  const arousal = clamp(
    fear * 0.45 + overwhelm * 0.35 + explicitFrustration * 0.2 + explicitAnxiety * 0.2,
    0,
    1,
  );

  let label: SentimentProfile["label"] = "neutral";
  const distressIndex = clamp((fear + overwhelm + shame + (1 - mentalEnergy)) / 4, 0, 1);
  if (distressIndex > 0.68) {
    label = "distressed";
  } else if (distressIndex > 0.45) {
    label = "guarded";
  } else if (valence > 0.2 && mentalEnergy > 0.55) {
    label = "engaged";
  }

  const emotionWeights: Record<StrongEmotion, number> = {
    anxious: explicitAnxiety + fear * 0.6,
    numb: explicitNumb + (1 - mentalEnergy) * 0.75,
    frustrated: explicitFrustration + (input.answers.understandsQuestion === "partly" ? 0.25 : 0),
    scared: explicitFear + fear * 0.8,
    overwhelmed: explicitOverwhelm + overwhelm * 0.8,
    guilty: explicitGuilt + shame * 0.8,
  };

  let dominantEmotion: StrongEmotion = "anxious";
  let maxWeight = -1;
  for (const [emotion, weight] of Object.entries(emotionWeights)) {
    if (weight > maxWeight) {
      dominantEmotion = emotion as StrongEmotion;
      maxWeight = weight;
    }
  }

  return {
    label,
    valence,
    arousal,
    shame,
    fear,
    overwhelm,
    mentalEnergy,
    dominantEmotion,
  };
}

function initializeTypeScores(): Record<StuckType, number> {
  return {
    confusion_stuck: 0.1,
    ambiguity_stuck: 0.1,
    fear_stuck: 0.1,
    overwhelm_stuck: 0.1,
    exhaustion_stuck: 0.1,
    perfection_loop_stuck: 0.1,
  };
}

function normalizeTypeScores(scores: Record<StuckType, number>): Record<StuckType, number> {
  const total = STUCK_TYPES.reduce((sum, type) => sum + Math.max(scores[type], 0.001), 0);
  const normalized = initializeTypeScores();
  for (const type of STUCK_TYPES) {
    normalized[type] = Math.max(scores[type], 0.001) / total;
  }
  return normalized;
}

function scoreStuckTypes(
  input: DiagnosticInput,
  sentiment: SentimentProfile,
  distortions: DistortionHit[],
): Record<StuckType, number> {
  const scores = initializeTypeScores();
  const signals = input.signals ?? {};
  const text = getAllText(input);
  const answers = input.answers;

  if (answers.understandsQuestion === "no") {
    scores.confusion_stuck += 3;
  } else if (answers.understandsQuestion === "partly") {
    scores.confusion_stuck += 1.4;
    scores.ambiguity_stuck += 0.5;
  }

  if (answers.canSubmitBadIn5Min === "no") {
    scores.ambiguity_stuck += 1.6;
    scores.perfection_loop_stuck += 1.8;
    scores.fear_stuck += 1;
  } else if (answers.canSubmitBadIn5Min === "maybe") {
    scores.ambiguity_stuck += 0.8;
    scores.perfection_loop_stuck += 0.9;
  }

  if (answers.strongestEmotion === "scared") {
    scores.fear_stuck += 2.2;
  }
  if (answers.strongestEmotion === "overwhelmed") {
    scores.overwhelm_stuck += 2.4;
  }
  if (answers.strongestEmotion === "numb") {
    scores.exhaustion_stuck += 2.1;
  }
  if (answers.strongestEmotion === "frustrated") {
    scores.confusion_stuck += 0.8;
    scores.ambiguity_stuck += 0.8;
  }
  if (answers.strongestEmotion === "anxious") {
    scores.fear_stuck += 1.4;
    scores.overwhelm_stuck += 0.7;
  }
  if (answers.strongestEmotion === "guilty") {
    scores.fear_stuck += 0.8;
    scores.perfection_loop_stuck += 0.7;
  }

  switch (answers.taskScope) {
    case "large":
      scores.overwhelm_stuck += 2;
      break;
    case "unclear":
      scores.ambiguity_stuck += 1.8;
      scores.confusion_stuck += 0.6;
      break;
    case "large_and_unclear":
      scores.overwhelm_stuck += 2.2;
      scores.ambiguity_stuck += 1.5;
      scores.confusion_stuck += 0.8;
      break;
    default:
      break;
  }

  if (answers.gradeWorry === "high") {
    scores.fear_stuck += 2.2;
    scores.perfection_loop_stuck += 1;
  } else if (answers.gradeWorry === "medium") {
    scores.fear_stuck += 0.9;
  }

  if (signals.rereadingSameSentence) {
    scores.confusion_stuck += 1.1;
    scores.exhaustion_stuck += 0.5;
  }
  if (signals.repeatedGoogling) {
    scores.confusion_stuck += 1;
  }
  if (signals.startingAndStopping) {
    scores.ambiguity_stuck += 1.2;
    scores.perfection_loop_stuck += 0.8;
  }
  if (signals.anxietySpikeOnOpen) {
    scores.fear_stuck += 1.3;
  }
  if (signals.manyTasksOpen || signals.tabSwitching) {
    scores.overwhelm_stuck += 1.4;
  }
  if (signals.physicalHeaviness) {
    scores.exhaustion_stuck += 1.6;
  }
  if (signals.excessiveEditing) {
    scores.perfection_loop_stuck += 1.8;
  }
  if ((signals.minutesStuck ?? 0) > 120) {
    scores.exhaustion_stuck += 0.8;
    scores.overwhelm_stuck += 0.5;
  }

  for (const type of STUCK_TYPES) {
    scores[type] += countPhraseMatches(text, STUCK_KEYWORDS[type]) * 0.6;
  }

  scores.fear_stuck += sentiment.fear * 1.8;
  scores.overwhelm_stuck += sentiment.overwhelm * 1.8;
  scores.exhaustion_stuck += (1 - sentiment.mentalEnergy) * 1.8;
  scores.perfection_loop_stuck +=
    distortions.filter((hit) => hit.type === "all_or_nothing" || hit.type === "identity_fusion").length * 0.7;
  scores.fear_stuck +=
    distortions.filter((hit) => hit.type === "catastrophizing" || hit.type === "fortune_telling").length * 0.6;

  return normalizeTypeScores(scores);
}

function pickPrimaryType(typeScores: Record<StuckType, number>): {
  primaryType: StuckType;
  confidence: number;
} {
  const ranked = [...STUCK_TYPES].sort((a, b) => typeScores[b] - typeScores[a]);
  const primaryType = ranked[0];
  const second = ranked[1];
  const confidence = clamp(typeScores[primaryType] - typeScores[second] + 0.5, 0, 1);
  return { primaryType, confidence };
}

function buildConfusionPlan(input: DiagnosticInput): InterventionPlan {
  const clarificationQuestions = generateClarificationQuestions(input.assignmentText, input.subject);
  return {
    stuckType: "confusion_stuck",
    explanation: "You are not blocked by effort; you are blocked by a missing concept link.",
    tinyNextStep: "Write one sentence: 'The exact part I do not understand is ___.' Then define one prerequisite concept.",
    timerMinutes: 10,
    actions: [
      "Split the topic into prerequisite pieces (definition, formula, worked example).",
      "Attempt one micro-example before returning to the real assignment.",
      "Use the generated clarification questions to ask for targeted help.",
    ],
    safetyNotes: ["No answer-generation for graded work; this flow supports understanding only."],
    clarificationQuestions,
    helpRequestTemplate:
      "Hi [Teacher], I am stuck on [topic]. I understand [what I know], but I am confused about [exact gap]. Could you clarify [specific question]?",
  };
}

function buildAmbiguityPlan(input: DiagnosticInput): InterventionPlan {
  const minimumSubmission = buildMinimumViableSubmission(input.assignmentType);
  return {
    stuckType: "ambiguity_stuck",
    explanation: "Your brain is waiting for a clear definition of done.",
    tinyNextStep: "Create a minimum viable submission outline with 3 bullets and start with bullet #1 only.",
    timerMinutes: 10,
    actions: [
      "Define what 'acceptable completion' means for this assignment.",
      "Choose one reference example and match its structure, not its quality.",
      "Use a done-checklist before polishing.",
    ],
    safetyNotes: ["Focus on completion standards, not perfection standards."],
    doneDefinitionChecklist: minimumSubmission,
  };
}

function buildFearPlan(input: DiagnosticInput, distortions: DistortionHit[]): InterventionPlan {
  const distortionPrompt =
    distortions.find((hit) => hit.type === "identity_fusion")?.reframe ??
    "Separate identity from outcome: this assignment is data, not self-worth.";
  return {
    stuckType: "fear_stuck",
    explanation: "You likely understand enough to begin, but fear of negative evaluation is blocking action.",
    tinyNextStep: "Open the first prompt and write an intentionally rough draft for 3 minutes. No editing allowed.",
    timerMinutes: 5,
    actions: [
      "Run a realistic worst-case simulation: what is the actual grade impact of one imperfect task?",
      "Switch to 'ugly first draft' mode and produce raw work only.",
      "Complete a 5-minute exposure challenge: do the first visible action despite anxiety.",
    ],
    safetyNotes: [distortionPrompt],
  };
}

function buildOverwhelmPlan(input: DiagnosticInput): InterventionPlan {
  const oneAction = buildOneActionOnlyStep(input.assignmentType);
  return {
    stuckType: "overwhelm_stuck",
    explanation: "The task load is exceeding working-memory limits. Shrink scope, then act.",
    tinyNextStep: oneAction,
    timerMinutes: 10,
    actions: [
      "Collapse the assignment into one 10-minute unit.",
      "Hide all unrelated tabs and tasks until this unit is complete.",
      "Use one-action-only mode: do exactly one concrete move at a time.",
    ],
    safetyNotes: ["Volume is the blocker, not ability. Reduce input channels."],
  };
}

function buildExhaustionPlan(): InterventionPlan {
  return {
    stuckType: "exhaustion_stuck",
    explanation: "You are likely cognitively depleted. Forcing intensity now can increase burnout.",
    tinyNextStep: "Take a 12-minute reset (water + walk + no screen). Return for a low-energy starter action.",
    timerMinutes: 12,
    actions: [
      "Validate rest as a performance strategy, not a failure.",
      "Switch to energy-based scheduling (high-cognitive tasks during your best hours).",
      "Track repeated depletion signals to catch burnout patterns early.",
    ],
    safetyNotes: ["If exhaustion persists for many days, escalate to human support resources."],
  };
}

function buildPerfectionPlan(input: DiagnosticInput): InterventionPlan {
  return {
    stuckType: "perfection_loop_stuck",
    explanation: "Quality control has turned into avoidance. You need a finish rule, not more editing.",
    tinyNextStep: "Set a 15-minute submit timer. Make only content-critical edits, then submit version 1.",
    timerMinutes: 15,
    actions: [
      "Use diminishing-returns framing: each extra edit usually yields smaller grade gains.",
      "Estimate grade impact: compare likely score now vs. after another hour of polishing.",
      "Enable optional forced-submit timer for low-stakes assignments.",
    ],
    safetyNotes: [
      "The goal is academically sound completion, not endless optimization.",
      `Use this rule: ${buildMinimumViableSubmission(input.assignmentType).join(" | ")}`,
    ],
  };
}

function buildMinimumViableSubmission(assignmentType: string): string[] {
  const normalized = normalizeText(assignmentType);
  if (normalized.includes("essay")) {
    return [
      "Has a clear thesis statement.",
      "Contains at least two evidence-backed body points.",
      "Includes basic citation and a conclusion paragraph.",
    ];
  }
  if (normalized.includes("problem")) {
    return [
      "Shows formulas or method for each attempted question.",
      "Completes at least the required minimum question count.",
      "Adds one line of reasoning for each final answer.",
    ];
  }
  if (normalized.includes("lab")) {
    return [
      "States objective and method steps.",
      "Includes observed results table.",
      "Provides one paragraph interpretation.",
    ];
  }
  return [
    "Meets explicit instructions in the prompt.",
    "Contains one complete attempt across all required sections.",
    "Submitted by deadline with minimal formatting compliance.",
  ];
}

function buildOneActionOnlyStep(assignmentType: string): string {
  const normalized = normalizeText(assignmentType);
  if (normalized.includes("essay")) {
    return "Open a blank document and write only the thesis sentence. Stop after one sentence.";
  }
  if (normalized.includes("problem")) {
    return "Solve only question #1 for 10 minutes. Ignore every other question.";
  }
  if (normalized.includes("reading")) {
    return "Read one paragraph and write a 2-line summary in your own words.";
  }
  return "Define and execute one visible action that takes under 10 minutes.";
}

function buildIntervention(
  primaryType: StuckType,
  input: DiagnosticInput,
  distortions: DistortionHit[],
): InterventionPlan {
  switch (primaryType) {
    case "confusion_stuck":
      return buildConfusionPlan(input);
    case "ambiguity_stuck":
      return buildAmbiguityPlan(input);
    case "fear_stuck":
      return buildFearPlan(input, distortions);
    case "overwhelm_stuck":
      return buildOverwhelmPlan(input);
    case "exhaustion_stuck":
      return buildExhaustionPlan();
    case "perfection_loop_stuck":
      return buildPerfectionPlan(input);
    default:
      return buildOverwhelmPlan(input);
  }
}

function buildSafetyFlags(input: DiagnosticInput, sentiment: SentimentProfile): string[] {
  const text = getAllText(input);
  const flags: string[] = [];

  if (CRISIS_PATTERNS.some((pattern) => pattern.test(text))) {
    flags.push("possible_crisis_language_detected");
  }
  if (sentiment.label === "distressed" && sentiment.shame > 0.75) {
    flags.push("high_shame_distress");
  }
  if ((input.signals?.minutesStuck ?? 0) > 240) {
    flags.push("extended_paralysis_window");
  }
  if ((input.signals?.energyLevel ?? 10) <= 2) {
    flags.push("severe_energy_depletion");
  }

  return flags;
}

export function diagnoseStuck(input: DiagnosticInput): StuckDiagnosis {
  const distortions = detectThoughtDistortions(input);
  const sentiment = scoreSentiment(input);
  const typeScores = scoreStuckTypes(input, sentiment, distortions);
  const { primaryType, confidence } = pickPrimaryType(typeScores);
  const intervention = buildIntervention(primaryType, input, distortions);
  const safetyFlags = buildSafetyFlags(input, sentiment);

  return {
    primaryType,
    confidence,
    typeScores,
    sentiment,
    distortions,
    intervention,
    safetyFlags,
    guardrails: [
      "No homework completion on behalf of the student.",
      "No cheating support or hidden answer generation.",
      "Guidance is limited to diagnosis, emotional regulation, and process coaching.",
    ],
  };
}

export function generateAdaptiveQuestions(
  prior?: Partial<DiagnosticAnswers>,
): AdaptiveQuestion[] {
  const questions: AdaptiveQuestion[] = [
    {
      id: "understandsQuestion",
      prompt: "Do you understand what the question is asking?",
      options: ["yes", "partly", "no"],
    },
    {
      id: "canSubmitBadIn5Min",
      prompt: "If you had to submit something bad in 5 minutes, could you?",
      options: ["yes", "maybe", "no"],
    },
    {
      id: "strongestEmotion",
      prompt: "What emotion is strongest right now?",
      options: ["anxious", "numb", "frustrated", "scared", "overwhelmed", "guilty"],
    },
    {
      id: "taskScope",
      prompt: "Is the task large, unclear, or both?",
      options: ["small_clear", "large", "unclear", "large_and_unclear"],
    },
    {
      id: "gradeWorry",
      prompt: "How much are you worried about the grade impact?",
      options: ["low", "medium", "high"],
    },
  ];

  if (prior?.understandsQuestion === "no") {
    questions[3] = {
      id: "taskScope",
      prompt: "Is your confusion mostly from missing concepts or unclear instructions?",
      options: ["unclear", "large_and_unclear", "large", "small_clear"],
    };
  }

  if (prior?.canSubmitBadIn5Min === "no") {
    questions[4] = {
      id: "gradeWorry",
      prompt: "What feels riskier right now: grade drop or submitting imperfect work?",
      options: ["low", "medium", "high"],
    };
  }

  return questions;
}

export function generateClarificationQuestions(
  assignmentText: string | undefined,
  subject: string,
): string[] {
  const prompt = normalizeText(assignmentText ?? "");
  const subjectLabel = subject.trim() || "this subject";

  const questions = [
    `In ${subjectLabel}, which prerequisite concept should I review first before attempting this task?`,
    "What does a minimally correct first step look like for this assignment?",
    "Can you show one small example of expected reasoning format (not a full solution)?",
  ];

  if (prompt.includes("essay")) {
    questions.push("What level of argument depth is required for a passing submission?");
  }
  if (prompt.includes("lab")) {
    questions.push("How detailed should the method and analysis sections be for full credit?");
  }

  return questions.slice(0, 4);
}

export function rephraseAssignmentInstructions(assignmentText: string): string[] {
  const normalized = normalizeText(assignmentText);
  const steps: string[] = [];

  steps.push("Goal: Identify what must be submitted and by when.");
  steps.push("Deliverable: Convert the prompt into a checklist of required sections.");
  steps.push("First action: Complete the smallest section that can be done in 10 minutes.");

  if (normalized.includes("essay")) {
    steps.push("Sequence: thesis -> outline -> evidence paragraphs -> revision.");
  } else if (normalized.includes("problem")) {
    steps.push("Sequence: list formulas -> solve easiest question first -> show work.");
  } else if (normalized.includes("lab")) {
    steps.push("Sequence: objective -> method -> observations -> interpretation.");
  }

  return steps;
}

export function buildSessionRecord(
  input: DiagnosticInput,
  diagnosis: StuckDiagnosis,
  outcome: Outcome,
): SessionRecord {
  return {
    timestampIso: new Date().toISOString(),
    subject: input.subject,
    assignmentType: input.assignmentType,
    stuckType: diagnosis.primaryType,
    emotion: input.answers.strongestEmotion,
    timeStuckMinutes: input.signals?.minutesStuck ?? 0,
    interventionUsed: diagnosis.intervention.tinyNextStep,
    outcome,
    shameLevel: input.signals?.shameLevel ?? Math.round(diagnosis.sentiment.shame * 10),
    fearLevel: input.signals?.fearLevel ?? Math.round(diagnosis.sentiment.fear * 10),
    selfTalk: input.selfTalk,
  };
}

function countBy<T extends string>(values: T[]): Record<T, number> {
  return values.reduce(
    (acc, value) => {
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    },
    {} as Record<T, number>,
  );
}

function topKey<T extends string>(record: Record<T, number>): T | null {
  const entries = Object.entries(record) as Array<[T, number]>;
  if (entries.length === 0) {
    return null;
  }
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function topNumericKey(record: Record<number, number>): number | null {
  const entries = Object.entries(record);
  if (entries.length === 0) {
    return null;
  }
  entries.sort((a, b) => b[1] - a[1]);
  return Number(entries[0][0]);
}

function initializeTypeCounters(): Record<StuckType, number> {
  return {
    confusion_stuck: 0,
    ambiguity_stuck: 0,
    fear_stuck: 0,
    overwhelm_stuck: 0,
    exhaustion_stuck: 0,
    perfection_loop_stuck: 0,
  };
}

export function buildWeeklyInsights(sessions: SessionRecord[]): WeeklyInsightsReport {
  const countsByStuckType = initializeTypeCounters();
  for (const session of sessions) {
    countsByStuckType[session.stuckType] += 1;
  }

  const byTypeRounded: Record<StuckType, number> = {
    confusion_stuck: countsByStuckType.confusion_stuck,
    ambiguity_stuck: countsByStuckType.ambiguity_stuck,
    fear_stuck: countsByStuckType.fear_stuck,
    overwhelm_stuck: countsByStuckType.overwhelm_stuck,
    exhaustion_stuck: countsByStuckType.exhaustion_stuck,
    perfection_loop_stuck: countsByStuckType.perfection_loop_stuck,
  };

  if (sessions.length === 0) {
    return {
      summary: "No sessions yet. Start collecting stuck check-ins to generate insights.",
      insights: [],
      countsByStuckType: byTypeRounded,
      subjectRiskHighlights: [],
    };
  }

  const dominantType = topKey(byTypeRounded) ?? "overwhelm_stuck";
  const subjectFearCounts = sessions
    .filter((session) => session.stuckType === "fear_stuck")
    .reduce<Record<string, number>>((acc, session) => {
      const key = session.subject.trim().toLowerCase();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  const weekdayOverwhelm = sessions
    .filter((session) => session.stuckType === "overwhelm_stuck")
    .reduce<Record<number, number>>((acc, session) => {
      const day = new Date(session.timestampIso).getDay();
      acc[day] = (acc[day] ?? 0) + 1;
      return acc;
    }, {});

  const topFearSubject = topKey(subjectFearCounts);
  const topOverwhelmDay = topNumericKey(weekdayOverwhelm);
  const outcomes = countBy(sessions.map((session) => session.outcome));
  const gaveUpRate = (outcomes.gave_up ?? 0) / sessions.length;
  const averageShame =
    sessions.reduce((sum, session) => sum + session.shameLevel, 0) / Math.max(sessions.length, 1);

  const insights: string[] = [];
  insights.push(`Primary blocker pattern: ${humanizeType(dominantType)}.`);

  if (topFearSubject) {
    insights.push(`Fear-stuck appears most often in ${topFearSubject}.`);
  }

  if (topOverwhelmDay !== null) {
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
      Number(topOverwhelmDay)
    ];
    insights.push(`Overwhelm spikes most on ${dayName}.`);
  }

  if (gaveUpRate > 0.35) {
    insights.push("High give-up rate detected. Increase intervention intensity and shorten next-step timeboxes.");
  }

  if (averageShame >= 6.5) {
    insights.push("Shame levels are elevated. Prioritize identity-safe reframes before task execution.");
  }

  const subjectRiskHighlights = Object.entries(subjectFearCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([subject, count]) => `${subject}: ${count} fear-stuck sessions`);

  return {
    summary: `Your main blocker is ${humanizeType(dominantType)}. This is a pattern problem, not laziness.`,
    insights,
    countsByStuckType: byTypeRounded,
    subjectRiskHighlights,
  };
}

function humanizeType(type: StuckType): string {
  switch (type) {
    case "confusion_stuck":
      return "confusion-stuck";
    case "ambiguity_stuck":
      return "ambiguity-stuck";
    case "fear_stuck":
      return "fear-stuck";
    case "overwhelm_stuck":
      return "overwhelm-stuck";
    case "exhaustion_stuck":
      return "exhaustion-stuck";
    case "perfection_loop_stuck":
      return "perfection-loop stuck";
    default:
      return type;
  }
}
