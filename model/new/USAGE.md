# Integration Example: Using the Model in Your App

## Basic Usage Pattern

```typescript
import {
  diagnoseWithHybridModel,
  buildQuickInterventionPlan,
  buildSafetyFlags,
  detectThoughtDistortions,
  type DiagnosticAnswers,
} from "@/model/new";

// ============================================
// STEP 1: Collect Initial 5 Questions
// ============================================
const answers: DiagnosticAnswers = {
  understandsQuestion: "no", // yes | partly | no
  canSubmitBadInFiveMinutes: "no", // yes | maybe | no
  strongestEmotion: "overwhelmed", // anxious | numb | frustrated | scared | overwhelmed | guilty
  taskScope: "large_clear", // small_clear | large_clear | unclear
  gradeWorry: "high", // low | medium | high
};

// ============================================
// STEP 2: Run Diagnosis (embedding + Gemini)
// ============================================
const diagnosis = await diagnoseWithHybridModel(answers, {
  subject: "Organic Chemistry",
  timeStuckMinutes: 45,
  panicLevel: 8,
  behavioralSignals: {
    tabSwitching: true,
    excessiveEditing: false,
    rereading: true,
  },
});

console.log(diagnosis);
// {
//   primaryType: "overwhelm",
//   confidence: 0.87,
//   rankedTypes: [
//     { type: "overwhelm", score: 8.7, normalized: 0.87, reasons: [...] },
//     { type: "fear", score: 6.2, normalized: 0.62, reasons: [...] },
//     ...
//   ],
//   summary: "You're experiencing overwhelm because the scope feels massive...",
//   embeddingSimilarities: { ... }
// }

// ============================================
// STEP 3: Check for Safety Concerns
// ============================================
const studentStatement = "I just want to disappear, this is pointless.";
const safetyFlags = buildSafetyFlags({
  studentStatement,
  panicScore: 9,
  shameScore: 0.9,
});

if (safetyFlags.includes("crisis:critical")) {
  // Route to crisis support
  window.location.href = "/crisis-support";
  return;
}

// ============================================
// STEP 4: Detect Cognitive Distortions
// ============================================
const distortions = detectThoughtDistortions({
  studentStatement,
  selfTalk: [
    "I should be able to do this easily",
    "I'll never be good at this",
  ],
});

// distortions = [
//   { type: "shouldStatements", severity: 2, matched: "I should be able" },
//   { type: "overgeneralization", severity: 2, matched: "I'll never be good" },
// ]

// ============================================
// STEP 5: Generate Intervention Plan
// ============================================
const plan = await buildQuickInterventionPlan(diagnosis.primaryType);

console.log(plan);
// {
//   stuckType: "overwhelm",
//   headline: "Break it into one tiny piece",
//   whyItWorks: "Overwhelm lives in the big picture; action lives in small steps.",
//   steps: [
//     {
//       timeMinutes: 2,
//       action: "List the 3-5 main parts of this assignment",
//       tip: null
//     },
//     {
//       timeMinutes: 3,
//       action: "Pick the smallest, least scary part",
//       tip: "Not the most important—the most doable"
//     },
//     {
//       timeMinutes: 5,
//       action: "Work on just that part for 5 minutes",
//       tip: "Set a timer if it helps"
//     }
//   ],
//   reflectionPrompt: "Does the assignment feel smaller now?",
//   estimatedTotalMinutes: 10
// }

// ============================================
// STEP 6: Display Results to Student
// ============================================
function renderDiagnosis(diagnosis: DiagnosisResult) {
  return (
    <div className="diagnosis-card">
      <h2>Your Diagnosis</h2>
      
      {/* Confidence levels */}
      <div className="confidence-levels">
        {diagnosis.rankedTypes.map((type) => (
          <div key={type.type} className="confidence-item">
            <span>{type.type}</span>
            <ProgressBar value={type.normalized} />
            <span>{(type.normalized * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <p className="summary">{diagnosis.summary}</p>

      {/* Call to action */}
      <button onClick={() => renderIntervention(plan)}>
        What's the plan?
      </button>
    </div>
  );
}

function renderIntervention(plan: InterventionPlan) {
  return (
    <div className="intervention-card">
      <h2>{plan.headline}</h2>
      
      <div className="why-it-works">
        <strong>Why this works:</strong> {plan.whyItWorks}
      </div>

      <div className="steps">
        {plan.steps.map((step, idx) => (
          <div key={idx} className="step">
            <div className="timer">{step.timeMinutes} min</div>
            <div className="action">{step.action}</div>
            {step.tip && <div className="tip">💡 {step.tip}</div>}
          </div>
        ))}
      </div>

      <div className="total-time">
        Total time: ~{plan.estimatedTotalMinutes} minutes
      </div>

      <button onClick={() => startTimer(plan.estimatedTotalMinutes)}>
        Start Intervention
      </button>
    </div>
  );
}

// ============================================
// STEP 7: Optional - Follow-Up Questions (5 rounds)
// ============================================
import { generateNextDiagnosticQuestion } from "@/model/new";

for (let i = 1; i <= 5; i++) {
  const followUpQ = await generateNextDiagnosticQuestion(
    answers,
    i,
    diagnosis.primaryType,
  );
  
  console.log(`Question ${i}:`, followUpQ);
  // Shows student the question, waits for answer
  // Could use this to refine diagnosis further
}

// ============================================
// STEP 8: Optional - Store Session
// ============================================
import { SessionRecord, SessionOutcome } from "@/model/new";

const session: SessionRecord = {
  id: crypto.randomUUID(),
  userId: currentUser.id,
  timestamp: new Date().toISOString(),
  stuckType: diagnosis.primaryType,
  diagnosis,
  interventionPlan: plan,
  outcome: "finished" as SessionOutcome, // or "started" | "gave_up"
  durationMinutes: 12,
  distortions: detectThoughtDistortions({ studentStatement }),
  safetyFlags,
};

// Save to database
await db.sessions.create(session);

// Later: build student profile from history
const profile = buildStudentProfile(userId);
const interventionWithHistory = await buildInterventionPlanForStudent(
  diagnosis.primaryType,
  profile,
);
```

## React Component Example

```tsx
"use client";

import { useState } from "react";
import {
  diagnoseWithHybridModel,
  buildQuickInterventionPlan,
  buildSafetyFlags,
  type DiagnosticAnswers,
  type DiagnosisResult,
  type InterventionPlan,
} from "@/model/new";

export function StuckAssistant() {
  const [step, setStep] = useState<"questions" | "loading" | "diagnosis" | "intervention">("questions");
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [plan, setPlan] = useState<InterventionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmitAnswers(answers: DiagnosticAnswers) {
    try {
      setStep("loading");
      const result = await diagnoseWithHybridModel(answers);
      
      // Check safety first
      const flags = buildSafetyFlags({
        studentStatement: answers.gradeWorry === "high" ? "Very worried" : "",
      });
      
      if (flags.includes("crisis:critical")) {
        window.location.href = "/crisis-support";
        return;
      }

      setDiagnosis(result);
      setStep("diagnosis");
    } catch (err) {
      setError("Unable to diagnose. Please try again.");
      console.error(err);
    }
  }

  async function handleStartIntervention() {
    if (!diagnosis) return;
    
    try {
      setStep("loading");
      const interventionPlan = await buildQuickInterventionPlan(
        diagnosis.primaryType,
      );
      setPlan(interventionPlan);
      setStep("intervention");
    } catch (err) {
      setError("Unable to generate plan. Please try again.");
      console.error(err);
    }
  }

  if (step === "questions") {
    return <DiagnosticQuestionnaire onSubmit={handleSubmitAnswers} />;
  }

  if (step === "loading") {
    return <LoadingAnimation message="Analyzing your situation..." />;
  }

  if (step === "diagnosis" && diagnosis) {
    return (
      <DiagnosisDisplay
        diagnosis={diagnosis}
        onStartIntervention={handleStartIntervention}
      />
    );
  }

  if (step === "intervention" && plan) {
    return <InterventionDisplay plan={plan} />;
  }

  return <div>{error}</div>;
}
```

## Advanced: Custom Model Configuration

```typescript
import {
  EMBEDDING_WEIGHTS,
  CONFIDENCE_CALIBRATION,
} from "@/model/new";

// Increase sensitivity for fear detection
EMBEDDING_WEIGHTS.fear.boostMultiplier = 1.5; // was 1.3

// Give more weight to embeddings, less to Gemini
const customCalibration = {
  ...CONFIDENCE_CALIBRATION,
  embeddingContribution: 0.6, // was 0.5
  geminiContribution: 0.4, // was 0.5
};

// Use in diagnosis
const diagnosis = await diagnoseWithHybridModel(answers);
```

## Testing

```typescript
// Test with mock data
const mockAnswers: DiagnosticAnswers = {
  understandsQuestion: "partly",
  canSubmitBadInFiveMinutes: "maybe",
  strongestEmotion: "frustrated",
  taskScope: "unclear",
  gradeWorry: "medium",
};

const diagnosis = await diagnoseWithHybridModel(mockAnswers);
console.assert(
  diagnosis.primaryType !== undefined,
  "Diagnosis should have primary type",
);
console.assert(
  diagnosis.confidence > 0 && diagnosis.confidence <= 1,
  "Confidence should be 0-1",
);
```

---

This pattern covers the full diagnostic journey: collect answers → diagnose → check safety → generate intervention → display.
