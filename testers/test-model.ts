#!/usr/bin/env npx ts-node

/**
 * Test script for the Stuck Diagnosis Model
 * Run with: npx ts-node test-model.ts
 */

import {
  diagnoseWithHybridModel,
  buildMultipleInterventionPlans,
  detectThoughtDistortions,
  buildSafetyFlags,
} from "../model/new/index";
import type { DiagnosticAnswers } from "../model/new/types";

// Check for environment variable
if (!process.env.GEMINI_API_KEY) {
  console.error("\n ERROR: GEMINI_API_KEY not set");
  console.error("\nTo run this model, you need to:");
  console.error("1. Get an API key from https://ai.google.dev/");
  console.error("2. Set it as an environment variable:");
  console.error("   export GEMINI_API_KEY='your-api-key-here'");
  console.error("\nThen run: npx ts-node test-model.ts\n");
  process.exit(1);
}

async function runTest() {
  console.log(" Starting Stuck Diagnosis Model Test\n");
  console.log("=" .repeat(70));

  // Test Case 1: Confusion
  const confusionAnswers: DiagnosticAnswers = {
    internalVoice: "I can't figure this out, what if I'm not smart enough?",
    eightyPercentThought: "There's no way my work will be good enough for a passing grade",
    whyBestWork: "I've tried different approaches but none of them seem to work",
    avoidanceDuration: "I've been stuck for about 30 minutes",
    helpSeeking: "I haven't asked for help because I'm embarrassed",
  };

  console.log("\n TEST 1: Confusion Example");
  console.log("─".repeat(70));
  console.log("Internal Voice: I can't figure this out, what if I'm not smart enough?");
  console.log("80% Thought: There's no way my work will be good enough");
  console.log("\n⏳ Running diagnosis...\n");

  try {
    const diagnosis1 = await diagnoseWithHybridModel(confusionAnswers);

    console.log(" DIAGNOSIS RESULT:");
    console.log(`   Primary Type: ${diagnosis1.primaryType}`);
    console.log(`   Confidence: ${(diagnosis1.confidence * 100).toFixed(1)}%`);
    console.log(`   Summary: ${diagnosis1.summary}`);
    if (diagnosis1.embeddingVector) {
      console.log(`\n   Embedding Vector (first 10 dims): [${diagnosis1.embeddingVector.slice(0, 10).map(n => n.toFixed(3)).join(", ")}...]`);
      console.log(`   Total Vector Dimensions: ${diagnosis1.embeddingVector.length}`);
    }
    if (diagnosis1.internalFollowUpQuestions) {
      console.log(`\n   Internal Follow-up Questions (${diagnosis1.internalFollowUpQuestions.length}):`);
      diagnosis1.internalFollowUpQuestions.forEach((q, i) => {
        console.log(`     ${i + 1}. ${q}`);
      });
    }
    console.log(`\n   All Stuck Types (ranked HIGH→LOW):`);
    diagnosis1.rankedTypes.forEach((type, i) => {
      console.log(`     ${i + 1}. ${type.type} (${(type.normalized * 100).toFixed(1)}%)`);
    });

    // Generate intervention plans
    console.log("\n⏳ Generating intervention plans...\n");
    const plans = await buildMultipleInterventionPlans(diagnosis1.primaryType);

    console.log(" INTERVENTION PLANS:");
    plans.forEach((plan, i) => {
      console.log(`\n   Plan ${i + 1}: ${plan.headline}`);
      console.log(`   Why it works: ${plan.whyItWorks}`);
      console.log(`   Duration: ~${plan.estimatedTotalMinutes} minutes`);
      console.log(`   Steps:`);
      plan.steps.forEach((step, j) => {
        console.log(`     ${j + 1}. [${step.timeMinutes}min] ${step.action}`);
        if (step.tip) console.log(`         ${step.tip}`);
      });
    });

    // Detect thought distortions
    console.log("\n⏳ Analyzing thought patterns...\n");
    const testStatement = "I'll never be able to do this, I'm completely hopeless";
    const distortions = detectThoughtDistortions({
      studentStatement: testStatement,
    });
    const safetyFlags = buildSafetyFlags({
      studentStatement: testStatement,
      shameScore: 0.7,
      panicScore: 0.5,
    });

    console.log(" COGNITIVE ANALYSIS:");
    if (distortions.length > 0) {
      console.log(`   Thought Distortions Found: ${distortions.length}`);
      distortions.forEach((d) => {
        console.log(`     • ${d.type}: "${d.matched}" (severity: ${d.severity})`);
      });
    } else {
      console.log("   No major thought distortions detected");
    }

    console.log(`\n   Safety Flags: ${safetyFlags.length}`);
    if (safetyFlags.length > 0) {
      safetyFlags.forEach((flag) => {
        console.log(`     • ${flag}`);
      });
    } else {
      console.log("      No safety concerns detected");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(" Error:", error.message);
      if (error.message.includes("API key")) {
        console.error("\nMake sure GEMINI_API_KEY is set:");
        console.error("   export GEMINI_API_KEY='your-key-here'");
      }
    }
    process.exit(1);
  }

  console.log("\n" + "=".repeat(70));
  console.log(" Test Complete!\n");
}

// Run the test
runTest();
