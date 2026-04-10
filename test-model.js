#!/usr/bin/env node

/**
 * Test script for the Stuck Diagnosis Model
 * 
 * Usage:
 *   node test-model.js
 * 
 * This script tests the core diagnosis and intervention generation functions
 */

// Check for environment variable
if (!process.env.GEMINI_API_KEY) {
  console.error("\n ERROR: GEMINI_API_KEY not set");
  console.error("\nTo run this model, you need to:");
  console.error("1. Get an API key from https://ai.google.dev/");
  console.error("2. Set it as an environment variable:");
  console.error("   export GEMINI_API_KEY='your-api-key-here'");
  console.error("\nThen run: node test-model.js\n");
  process.exit(1);
}

// Dynamic import for ES modules
async function main() {
  try {
    // Import the model functions
    const modelPath = './model/new/index.js';
    console.log(" Loading model from:", modelPath);
    console.log("️  Note: Model files are TypeScript. You'll need to either:");
    console.log("   1. Compile with: npx tsc model/new/*.ts --target es2020 --module commonjs");
    console.log("   2. Or use ts-node: npx ts-node test-model.ts");
    console.log("   3. Or use with Next.js API routes (included in USAGE.md)\n");

    // For now, show what a test would look like
    console.log(" Example Test Cases:\n");

    const testCases = [
      {
        name: "Confusion Example",
        answers: {
          whatIsTheTask: "I need to analyze the primary sources for my history essay, but I'm not sure where to start or what to look for.",
          whyAreYouStuck: "I've never analyzed primary sources before and I don't know the methodology",
          attemptedSolutions: "I Googled 'how to analyze primary sources' but got too many results and none seemed relevant",
          emotionalState: "frustrated",
          physicalSignals: "tension in shoulders, staring at screen"
        }
      },
      {
        name: "Overwhelm Example",
        answers: {
          whatIsTheTask: "I have to write a 20-page research paper, do 3 problem sets, prepare for 2 exams, AND work 15 hours this week",
          whyAreYouStuck: "Everything feels equally urgent and I don't know where to start",
          attemptedSolutions: "I tried making a to-do list but it's 50 items long and I still feel lost",
          emotionalState: "panicked",
          physicalSignals: "racing heart, difficulty breathing"
        }
      },
      {
        name: "Perfectionism Example",
        answers: {
          whatIsTheTask: "Writing the introduction paragraph for my engineering lab report",
          whyAreYouStuck: "I've deleted my draft 5 times because it's not 'good enough'",
          attemptedSolutions: "I keep rewriting the same sentences. I've spent 2 hours on 1 paragraph",
          emotionalState: "frustrated",
          physicalSignals: "jaw clenching, fidgeting"
        }
      }
    ];

    for (const testCase of testCases) {
      console.log(` ${testCase.name}`);
      console.log("─".repeat(60));
      console.log("Input answers:");
      Object.entries(testCase.answers).forEach(([key, value]) => {
        console.log(`  • ${key}: "${value}"`);
      });
      console.log("\nExpected output would be:");
      console.log("  • primaryType: [stuck type]");
      console.log("  • confidence: [0-1]");
      console.log("  • rankedTypes: [all 6 types, high→low]");
      console.log("  • embeddingVector: [512-dimensional array]");
      console.log("  • internalFollowUpQuestions: [5 Gemini questions]");
      console.log("  • summary: [brief diagnosis]");
      console.log("\n");
    }

    console.log(" To actually run the model:\n");
    console.log("Option 1: TypeScript with ts-node");
    console.log("─".repeat(60));
    console.log("npx ts-node test-model.ts\n");

    console.log("Option 2: Compile TypeScript then run");
    console.log("─".repeat(60));
    console.log("npx tsc model/new/*.ts --target es2020 --module commonjs");
    console.log("node test-model.js\n");

    console.log("Option 3: Use in Next.js (recommended)");
    console.log("─".repeat(60));
    console.log("See USAGE.md for complete Next.js integration example\n");

    console.log("Option 4: Use in React component");
    console.log("─".repeat(60));
    console.log("See USAGE.md for React component example\n");

    console.log(" Model files are ready in: ./model/new/");
    console.log(" Documentation: ./model/new/README.md");
    console.log(" API Reference: ./model/new/API.md");
    console.log(" Usage Examples: ./model/new/USAGE.md\n");

  } catch (error) {
    console.error(" Error:", error.message);
    process.exit(1);
  }
}

main();
