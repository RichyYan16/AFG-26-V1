# Public API Reference

## Core Diagnostic Functions

### `diagnoseWithHybridModel(answers, context?)`
**Full diagnostic pipeline: embedding → Gemini → blend**

```typescript
import { diagnoseWithHybridModel } from "@/model/new";

const diagnosis = await diagnoseWithHybridModel(
  {
    understandsQuestion: "no",
    canSubmitBadInFiveMinutes: "no",
    strongestEmotion: "overwhelmed",
    taskScope: "large_clear",
    gradeWorry: "high",
  },
  {
    subject: "Math",
    timeStuckMinutes: 45,
    panicLevel: 8,
    behavioralSignals: { tabSwitching: true },
  }
);

// Returns: DiagnosisResult {
//   primaryType: "overwhelm",
//   confidence: 0.87,
//   rankedTypes: [{ type, score, normalized, reasons }, ...],
//   summary: "...",
//   embeddingSimilarities: { ... }
// }
```

**Parameters:**
- `answers` (required): DiagnosticAnswers - the 5 base question responses
- `context` (optional): DiagnosticContext - additional context

**Returns:** Promise<DiagnosisResult>

**When to use:** Main diagnostic flow for students

---

### `diagnoseWithEmbeddingsOnly(answers, context?)`
**Fast diagnostic using only embeddings (no Gemini call)**

```typescript
const diagnosis = await diagnoseWithEmbeddingsOnly(answers);
```

**Returns:** Promise<DiagnosisResult>

**When to use:** Testing, fast fallback, no API key available

---

## Intervention Functions

### `buildQuickInterventionPlan(stuckType)`
**Generate intervention plan without student history**

```typescript
import { buildQuickInterventionPlan } from "@/model/new";

const plan = await buildQuickInterventionPlan("overwhelm");

// Returns: InterventionPlan {
//   stuckType: "overwhelm",
//   headline: "...",
//   whyItWorks: "...",
//   steps: [{ timeMinutes, action, tip }, ...],
//   reflectionPrompt: "...",
//   estimatedTotalMinutes: 10
// }
```

**Parameters:**
- `stuckType` (required): One of the 6 stuck types

**Returns:** Promise<InterventionPlan>

**When to use:** Right after diagnosis, no student history yet

---

### `buildInterventionPlanForStudent(stuckType, profile)`
**Generate intervention plan with personalization**

```typescript
import { buildInterventionPlanForStudent } from "@/model/new";

const plan = await buildInterventionPlanForStudent("fear", studentProfile);
```

**Parameters:**
- `stuckType` (required): The diagnosed stuck type
- `profile` (required): StudentProfile with history

**Returns:** Promise<InterventionPlan>

**When to use:** Returning student with session history

---

## Embedding Functions

### `computeEmbeddingScores(answers)`
**Get semantic similarity scores for all 6 stuck types**

```typescript
import { computeEmbeddingScores } from "@/model/new";

const scores = await computeEmbeddingScores({
  understandsQuestion: "partly",
  canSubmitBadInFiveMinutes: "no",
  strongestEmotion: "anxious",
  taskScope: "unclear",
  gradeWorry: "high",
});

// Returns: Record<StuckType, number>
// {
//   confusion: 0.62,
//   ambiguity: 0.71,
//   fear: 0.58,
//   overwhelm: 0.45,
//   exhaustion: 0.32,
//   perfection_loop: 0.28
// }
```

**Returns:** Promise<Record<StuckType, number>>

**When to use:** Intermediate debugging, custom pipelines

---

### `applyBehavioralSignalBoosts(scores, signals)`
**Boost scores based on observed behaviors**

```typescript
import { applyBehavioralSignalBoosts } from "@/model/new";

const boosted = applyBehavioralSignalBoosts(scores, {
  rereading: true,
  tabSwitching: false,
  excessiveEditing: true,
});

// confusion score +20%, perfection_loop +25%, etc.
```

**Returns:** Record<StuckType, number>

**When to use:** Custom diagnosis with behavioral data

---

### `getEmbeddingSimilarityBreakdown(answers)`
**Show detailed similarity to each anchor statement**

```typescript
import { getEmbeddingSimilarityBreakdown } from "@/model/new";

const breakdown = await getEmbeddingSimilarityBreakdown(answers);

// Returns breakdown[type] = {
//   anchors: ["I don't understand...", "I'm confused...", ...],
//   similarities: [0.72, 0.68, 0.55, ...]
// }
```

**Returns:** Promise<Record<StuckType, { anchors, similarities }>>

**When to use:** Transparency/debugging, show student reasoning

---

## Distortion & Safety Functions

### `detectThoughtDistortions(input)`
**Find cognitive distortions in student statements**

```typescript
import { detectThoughtDistortions } from "@/model/new";

const distortions = detectThoughtDistortions({
  studentStatement: "I should be able to do this easily, but I never can.",
  selfTalk: ["This is impossible", "I'm just not smart enough"],
});

// Returns: [
//   { type: "shouldStatements", severity: 2, matched: "I should be" },
//   { type: "overgeneralization", severity: 2, matched: "I never can" }
// ]
```

**Returns:** DistortionHit[]

**When to use:** Analyzing student language for thought patterns

---

### `buildSafetyFlags(input)`
**Generate safety flags from statement, shame, panic**

```typescript
import { buildSafetyFlags } from "@/model/new";

const flags = buildSafetyFlags({
  studentStatement: "I want to disappear from this class",
  shameScore: 0.95,
  panicScore: 9,
});

// Returns: [
//   "crisis:high",
//   "high_shame",
//   "high_panic"
// ]
```

**Returns:** string[]

**When to use:** Crisis detection, safety routing

---

### `buildDistortionReport(studentStatement)`
**Comprehensive distortion analysis**

```typescript
import { buildDistortionReport } from "@/model/new";

const report = buildDistortionReport(studentStatement);

// Returns: {
//   totalDistortions: 3,
//   byType: { shouldStatements: 2, catastrophizing: 1 },
//   topDistortion: "shouldStatements",
//   reframe: "Replace 'should' with 'want to'...",
//   riskLevel: "medium"
// }
```

**Returns:** DistortionReport

**When to use:** Comprehensive analysis, student feedback

---

## Gemini Integration Functions

### `refineDiagnosisWithGemini(answers, embeddingScores)`
**Refine diagnosis using Gemini**

```typescript
import { refineDiagnosisWithGemini } from "@/model/new";

const refined = await refineDiagnosisWithGemini(answers, scores);

// Returns: {
//   primaryType: "overwhelm",
//   confidence: 0.87,
//   factors: ["scope too large", "unclear deadline"],
//   summary: "You're experiencing overwhelm because..."
// }
```

**Returns:** Promise<DiagnosisFromGemini>

**When to use:** Part of hybrid pipeline (called by diagnoseWithHybridModel)

---

### `generateNextDiagnosticQuestion(answers, questionNumber, currentDiagnosis?)`
**Generate next follow-up question (called 5x)**

```typescript
import { generateNextDiagnosticQuestion } from "@/model/new";

const q = await generateNextDiagnosticQuestion(answers, 1, "overwhelm");
// Returns: "What would help you feel less overwhelmed right now?"
```

**Returns:** Promise<string>

**When to use:** Adaptive diagnostic questioning (optional)

---

### `generateInterventionPlan(stuckType, context)`
**Generate intervention from Gemini**

```typescript
import { generateInterventionPlan } from "@/model/new";

const plan = await generateInterventionPlan("fear", {
  averageStuckMinutes: 45,
  subject: "Biology",
  previousAttempts: 2,
});
```

**Returns:** Promise<InterventionPlan>

**When to use:** Part of intervention pipeline (called by builders)

---

## Type Exports

All types exported from `@/model/new`:

```typescript
import type {
  // Enums
  StuckType,
  Emotion,
  DistortionType,
  
  // Inputs
  DiagnosticAnswers,
  DiagnosticContext,
  BehavioralSignals,
  
  // Outputs
  DiagnosisResult,
  InterventionPlan,
  SessionRecord,
  StudentProfile,
  
  // Other
  TypeScore,
  DistortionHit,
  TrendInsight,
} from "@/model/new";
```

---

## Constants Exports

All tunable parameters exported from `@/model/new`:

```typescript
import {
  // Configuration
  EMBEDDING_WEIGHTS,
  DISTORTION_WEIGHTS,
  DIAGNOSIS_THRESHOLDS,
  BEHAVIORAL_SIGNAL_WEIGHTS,
  CRISIS_WEIGHTS,
  INTERVENTION_WEIGHTS,
  INSIGHTS_WEIGHTS,
  QUESTION_WEIGHTS,
  EMBEDDING_MODEL_CONFIG,
  CONFIDENCE_CALIBRATION,
  
  // Utilities
  applyWeights,
  blendScores,
} from "@/model/new";
```

---

## Error Handling

All functions handle errors gracefully:

```typescript
try {
  const diagnosis = await diagnoseWithHybridModel(answers);
} catch (error) {
  // Falls back to embedding-only diagnosis
  console.error(error);
  // Safe to show user: "Unable to refine diagnosis, using standard analysis"
}
```

Each function logs errors to console but returns safe fallback values.

---

## Performance Notes

| Function | Speed | Cost |
|----------|-------|------|
| `computeEmbeddingScores` | ~500ms | Free (local) |
| `diagnoseWithEmbeddingsOnly` | ~500ms | Free (local) |
| `diagnoseWithHybridModel` | ~2-3s | ~$0.001 (Gemini) |
| `generateInterventionPlan` | ~2-3s | ~$0.001 (Gemini) |
| `detectThoughtDistortions` | ~10ms | Free (local) |
| `buildSafetyFlags` | ~10ms | Free (local) |

---

## Testing Examples

```typescript
// Test diagnosis
const diagnosis = await diagnoseWithHybridModel({
  understandsQuestion: "no",
  canSubmitBadInFiveMinutes: "no",
  strongestEmotion: "overwhelmed",
  taskScope: "large_clear",
  gradeWorry: "high",
});

console.assert(diagnosis.primaryType === "overwhelm");
console.assert(diagnosis.confidence > 0.7);

// Test intervention
const plan = await buildQuickInterventionPlan("overwhelm");
console.assert(plan.steps.length >= 3);
console.assert(plan.estimatedTotalMinutes <= 25);

// Test distortions
const distortions = detectThoughtDistortions({
  studentStatement: "I'm never going to be good at this",
});
console.assert(distortions.length > 0);

// Test safety
const flags = buildSafetyFlags({
  studentStatement: "I want to hurt myself",
});
console.assert(flags.some(f => f.includes("crisis")));
```

---

**For more details, see USAGE.md and IMPLEMENTATION.md**
