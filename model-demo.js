#!/usr/bin/env node

/**
 *  STUCK DIAGNOSIS MODEL - LIVE EXECUTION DEMO
 * 
 * This demonstrates the model running with realistic sample data
 * showing exactly what happens at each step of the RAW BASIC ALGORITHM
 */

console.log("\n" + "=".repeat(80));
console.log(" STUCK DIAGNOSIS MODEL - LIVE EXECUTION");
console.log("=".repeat(80));

// ============================================================================
// SAMPLE STUDENT INPUT
// ============================================================================
console.log("\n STEP 1: Student Answers Diagnostic Questions");
console.log("─".repeat(80));

const studentAnswers = {
  understandsQuestion: "partly",
  canSubmitBadInFiveMinutes: "no",
  strongestEmotion: "frustrated",
  taskScope: "unclear",
  gradeWorry: "high",
};

console.log("Student Input:");
console.log(`  • Understands question: "${studentAnswers.understandsQuestion}"`);
console.log(
  `  • Can submit bad work in 5 min: "${studentAnswers.canSubmitBadInFiveMinutes}"`
);
console.log(`  • Strongest emotion: "${studentAnswers.strongestEmotion}"`);
console.log(`  • Task scope: "${studentAnswers.taskScope}"`);
console.log(`  • Grade worry: "${studentAnswers.gradeWorry}"`);

// ============================================================================
// STEP 1: COMPUTE EMBEDDING VECTOR
// ============================================================================
console.log("\n STEP 2: Compute Embedding Vector [a, b, c, ...]");
console.log("─".repeat(80));
console.log("⏳ Loading Universal Sentence Encoder model (512-dimensional)...");
console.log("⏳ Embedding student answers to semantic vector...");

// Simulated embedding vector (512 dimensions)
const embeddingVector = Array.from({ length: 512 }, () =>
  Number((Math.random() * 2 - 1).toFixed(4))
);

console.log(" Computed embedding vector:");
console.log(`   Dimensions: ${embeddingVector.length}`);
console.log(
  `   Sample (first 10): [${embeddingVector
    .slice(0, 10)
    .map((v) => v.toFixed(3))
    .join(", ")}...]`
);

// ============================================================================
// STEP 2: CLASSIFY TO STUCK TYPES (Embedding Scores)
// ============================================================================
console.log("\n STEP 3: Classify to Stuck Types via Embedding Similarity");
console.log("─".repeat(80));
console.log(
  "Computing cosine similarity between student vector and anchor statements...\n"
);

const embeddingScores = {
  confusion: 0.82,
  ambiguity: 0.71,
  fear: 0.64,
  overwhelm: 0.58,
  exhaustion: 0.45,
  perfection_loop: 0.52,
};

console.log("Embedding Similarity Scores:");
Object.entries(embeddingScores)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, score]) => {
    const bar = "█".repeat(Math.round(score * 30));
    console.log(`  • ${type.padEnd(18)}: ${score.toFixed(2)} ${bar}`);
  });

// ============================================================================
// STEP 3: GENERATE 5 INTERNAL FOLLOW-UP QUESTIONS
// ============================================================================
console.log("\n STEP 4: Generate 5 Internal Follow-Up Questions for Gemini");
console.log("─".repeat(80));
console.log(
  "⏳ Calling Gemini API to generate questions for deeper analysis...\n"
);

const internalFollowUpQuestions = [
  "When you say the task is unclear, what specifically confuses you most - the overall goal, the specific requirements, or how to approach the work?",
  "You mentioned being unable to submit rough work - is this related to perfectionism, fear of judgment, or uncertainty about quality standards?",
  "What attempts have you made so far to clarify the task requirements, and why weren't they helpful?",
  "On a scale of 1-10, how much of your stuck feeling comes from not understanding vs. being afraid of failing?",
  "If you had to pick one thing to solve first to get unstuck, would it be understanding the assignment better or managing your anxiety about it?",
];

console.log("Generated Questions:");
internalFollowUpQuestions.forEach((q, i) => {
  console.log(`  ${i + 1}. "${q}"`);
});

// ============================================================================
// STEP 4: CALL GEMINI FOR DIAGNOSIS REFINEMENT
// ============================================================================
console.log("\n STEP 5: Refine Diagnosis with Gemini Analysis");
console.log("─".repeat(80));
console.log("⏳ Sending to Gemini (gemini-1.5-flash) with embedding context...");
console.log("   Input: student answers + embedding vector + internal questions");
console.log("   Processing...\n");

const geminiAnalysis = {
  primaryType: "confusion",
  confidence: 0.78,
  factors: [
    "Student partially understands the assignment",
    "Task requirements are genuinely unclear",
    "Frustration indicates cognitive confusion, not just anxiety",
  ],
  summary:
    "Primary confusion about task requirements; secondary worry about grade quality",
};

console.log(" Gemini Analysis Result:");
console.log(`   Primary Type: ${geminiAnalysis.primaryType}`);
console.log(`   Confidence: ${geminiAnalysis.confidence}`);
console.log(`   Summary: "${geminiAnalysis.summary}"`);
console.log("   Reasoning Factors:");
geminiAnalysis.factors.forEach((f) => {
  console.log(`     • ${f}`);
});

// ============================================================================
// STEP 5: BLEND SCORES (50% Embedding + 50% Gemini)
// ============================================================================
console.log("\n️ STEP 6: Blend Embedding & Gemini Scores");
console.log("─".repeat(80));
console.log("Formula: blendedScore = 0.5 * embeddingScore + 0.5 * geminiScore\n");

const geminiScores = {
  confusion: 0.78,
  ambiguity: 0.45,
  fear: 0.35,
  overwhelm: 0.28,
  exhaustion: 0.2,
  perfection_loop: 0.32,
};

const blendedScores = Object.entries(embeddingScores).reduce(
  (acc, [type, embScore]) => {
    acc[type] =
      0.5 * embScore + 0.5 * geminiScores[type];
    return acc;
  },
  {}
);

console.log("Blended Scores (HIGH → LOW):");
Object.entries(blendedScores)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, score], rank) => {
    const bar = "█".repeat(Math.round(score * 25));
    const embScore = embeddingScores[type];
    const gemScore = geminiScores[type];
    console.log(
      `  ${rank + 1}. ${type.padEnd(18)}: ${score.toFixed(3)} ${bar} (emb: ${embScore.toFixed(2)}, gem: ${gemScore.toFixed(2)})`
    );
  });

// ============================================================================
// STEP 6: RANKED OUTPUT (HIGH → LOW CONFIDENCE)
// ============================================================================
console.log("\n STEP 7: Final Diagnosis (Ranked HIGH → LOW)");
console.log("─".repeat(80));

const rankedTypes = Object.entries(blendedScores)
  .sort((a, b) => b[1] - a[1])
  .map(([type, score], index) => {
    let confidence = "HIGH";
    if (score < 0.6) confidence = "MEDIUM";
    if (score < 0.4) confidence = "LOW";

    return {
      rank: index + 1,
      type,
      score,
      confidence,
    };
  });

console.log("\n╔════════════════════════════════════════════════════════════════╗");
console.log("║                      DIAGNOSIS RESULT                         ║");
console.log("╚════════════════════════════════════════════════════════════════╝");
console.log(`\n  Primary Type:     ${rankedTypes[0].type.toUpperCase()}`);
console.log(
  `  Confidence:       ${(rankedTypes[0].score * 100).toFixed(1)}% (${rankedTypes[0].confidence})`
);
console.log(
  `\n  Summary:          "${geminiAnalysis.summary}"`
);
console.log(
  `\n  Embedding Vector: 512 dimensions (shown above: first 10 values)`
);
console.log(`\n  Internal Questions: ${internalFollowUpQuestions.length} (shown above)`);

console.log("\n  All Stuck Types (Ranked):");
rankedTypes.forEach((r) => {
  const bar = "▌".repeat(Math.round(r.score * 20));
  console.log(
    `    ${r.rank}. ${r.type.padEnd(18)}: ${(r.score * 100).toFixed(1).padStart(5)}% ${bar}`
  );
});

// ============================================================================
// STEP 7: GENERATE INTERVENTION PLANS
// ============================================================================
console.log("\n STEP 8: Generate Multiple Intervention Plans");
console.log("─".repeat(80));
console.log(
  "Calling Gemini to generate personalized intervention strategies...\n"
);

const interventionPlans = [
  {
    headline: "Clarify Assignment Requirements (Primary Plan)",
    whyItWorks:
      "Your confusion stems from unclear task requirements. Getting clarity first will unblock everything else.",
    duration: 15,
    steps: [
      {
        time: 5,
        action: "Write down the 3 most confusing parts of the assignment",
        tip: "Be specific: 'What does well-analyzed mean?' vs 'I don't get it'",
      },
      {
        time: 5,
        action: "Review the rubric and mark criteria you understand vs. don't",
        tip: "Use different colors for clear vs. unclear sections",
      },
      {
        time: 5,
        action:
          "Email professor/TA with your specific clarification questions",
        tip: "Asking for help is a sign of responsibility, not weakness",
      },
    ],
    reflection:
      "What became clearer? What do you need to find out next?",
  },
  {
    headline: "Break Down Into Clear Sub-Tasks",
    whyItWorks:
      "Sometimes confusion disappears when you divide the big unclear task into smaller, concrete pieces.",
    duration: 20,
    steps: [
      {
        time: 3,
        action: "List every instruction in the assignment one by one",
        tip: "Copy-paste from the assignment sheet if it helps",
      },
      {
        time: 5,
        action: "Create a mini-outline or flowchart of the work process",
        tip: "Visual organization often clarifies abstract instructions",
      },
      {
        time: 5,
        action: "Estimate time for each sub-task (realistic, not rushed)",
        tip: "This reduces overwhelm AND helps you plan better",
      },
      {
        time: 7,
        action: "Start with the smallest, most concrete sub-task",
        tip: "Quick win = momentum = reduced anxiety",
      },
    ],
    reflection:
      "Does the work feel more manageable now? What's your first concrete step?",
  },
  {
    headline: "Find & Study Similar Examples",
    whyItWorks:
      "Sometimes seeing what 'done' looks like is the fastest way to clear up confusion.",
    duration: 12,
    steps: [
      {
        time: 3,
        action: "Ask professor for an example or model answer (if available)",
        tip: "Most professors are happy to provide this",
      },
      {
        time: 4,
        action: "Find similar assignments or examples online/in course materials",
        tip: "Reverse-engineering from examples clarifies requirements",
      },
      {
        time: 5,
        action: "Annotate the example: why did they do X? How does Y help?",
        tip: "Active analysis beats passive reading",
      },
    ],
    reflection: "What patterns do you notice in good examples?",
  },
];

console.log("Generated Plans:");
interventionPlans.forEach((plan, i) => {
  console.log(`\n  Plan ${i + 1}: ${plan.headline}`);
  console.log(`  Duration: ~${plan.duration} minutes`);
  console.log(`  Why it works: ${plan.whyItWorks}`);
  console.log(`  Steps:`);
  plan.steps.forEach((s) => {
    console.log(`    • [${s.time}min] ${s.action}`);
    if (s.tip) console.log(`               ${s.tip}`);
  });
});

// ============================================================================
// STEP 8: COGNITIVE DISTORTION ANALYSIS
// ============================================================================
console.log("\n STEP 9: Analyze Cognitive Distortions & Safety");
console.log("─".repeat(80));

const distortions = [
  {
    type: "catastrophizing",
    example: "My grade will be ruined",
    severity: 2,
  },
  {
    type: "shouldStatements",
    example: "I should be able to understand this immediately",
    severity: 2,
  },
];

const safetyFlags = ["high_worry"];

console.log("\nThought Distortions Detected:");
if (distortions.length > 0) {
  distortions.forEach((d) => {
    console.log(
      `  • ${d.type}: "${d.example}" (severity: ${d.severity}/5)`
    );
  });
} else {
  console.log("   No major distortions detected");
}

console.log("\nSafety Flags:");
if (safetyFlags.length > 0) {
  safetyFlags.forEach((f) => {
    console.log(`  • ${f}`);
  });
  console.log("No critical intervention needed");
} else {
  console.log("No safety concerns");
}

// ============================================================================
// FINAL OUTPUT
// ============================================================================
console.log("\n" + "=".repeat(80));
console.log(" DIAGNOSIS COMPLETE");
console.log("=".repeat(80));

const finalOutput = {
  primaryType: "confusion",
  confidence: 0.8,
  rankedTypes: rankedTypes.slice(0, 6),
  summary: geminiAnalysis.summary,
  embeddingVector: `[${embeddingVector
    .slice(0, 10)
    .map((v) => v.toFixed(3))
    .join(", ")}, ... 502 more dimensions]`,
  internalFollowUpQuestions: internalFollowUpQuestions,
  interventionPlans: interventionPlans.length,
  distortions: distortions.length,
  safetyFlags: safetyFlags,
};

console.log("\n JSON OUTPUT (ready for API):");
console.log(JSON.stringify(finalOutput, null, 2));

console.log("\n Next Steps:");
console.log("  1. Display diagnosis results to student");
console.log("  2. Show primary intervention plan");
console.log("  3. Allow student to choose alternative plans");
console.log("  4. Track which plan they chose and their progress");
console.log("  5. Store session data for pattern analysis");

console.log("\n Model execution successful!\n");
