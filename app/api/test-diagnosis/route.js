/**
 * Test API Route for the Stuck Diagnosis Model
 * 
 * Usage: curl http://localhost:3000/api/test-diagnosis
 */

import {
  diagnoseWithHybridModel,
  buildMultipleInterventionPlans,
  detectThoughtDistortions,
  buildSafetyFlags,
} from "@/model/new/index.js";

/**
 * GET /api/test-diagnosis
 * Tests the diagnosis model with sample data
 * 
 * @param {Request} request - The request
 * @returns {Promise<Response>} Test results JSON
 */
export async function GET(request) {
  try {
    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        {
          error: "GEMINI_API_KEY not set",
          instructions:
            "Set GEMINI_API_KEY in .env.local and restart the server",
        },
        { status: 500 }
      );
    }

    console.log(" Running Stuck Diagnosis Model Test\n");

    // Test Case: Open-response answers
    const testAnswers = {
      internalVoice: "You're not smart enough for this. Everyone else gets it but you never will.",
      eightyPercentThought: "I feel guilty submitting anything less than perfect. People will judge me for not doing better.",
      whyBestWork: "I want to prove to myself I'm capable and not disappoint my professors.",
      avoidanceDuration: "About 2 weeks. I've been avoiding it since I got the assignment.",
      helpSeeking: "Intimidated and embarrassed. I feel like asking for help means admitting I'm not smart enough.",
    };

    console.log(" TEST: Diagnosis with sample answers");
    console.log("─".repeat(70));

    // Run diagnosis
    console.log("⏳ Running diagnosis...");
    const diagnosis = await diagnoseWithHybridModel(testAnswers);

    console.log(" DIAGNOSIS RESULT:");
    console.log(`   Primary Type: ${diagnosis.primaryType}`);
    console.log(`   Confidence: ${(diagnosis.confidence * 100).toFixed(1)}%`);
    console.log(`   Summary: ${diagnosis.summary}`);

    // Generate interventions
    console.log("\n⏳ Generating intervention plans...");
    const plans = await buildMultipleInterventionPlans(diagnosis.primaryType);
    console.log(` Generated ${plans.length} intervention plan(s)`);

    // Detect distortions
    console.log("\n⏳ Analyzing thought patterns...");
    const testStatement =
      "I'll never be able to do this, I'm completely hopeless";
    const distortions = detectThoughtDistortions({
      studentStatement: testStatement,
    });
    const safetyFlags = buildSafetyFlags({
      studentStatement: testStatement,
      shameScore: 0.7,
      panicScore: 0.5,
    });

    console.log(` Found ${distortions.length} thought distortion(s)`);
    console.log(` Found ${safetyFlags.length} safety flag(s)`);

    // Return results
    return Response.json(
      {
        status: "success",
        message: "Model is working correctly!",
        diagnosis: {
          primaryType: diagnosis.primaryType,
          confidence: diagnosis.confidence,
          rankedTypes: diagnosis.rankedTypes,
          summary: diagnosis.summary,
          embeddingVectorDimensions: diagnosis.embeddingVector?.length || 0,
          internalFollowUpQuestionsCount:
            diagnosis.internalFollowUpQuestions?.length || 0,
        },
        interventions: {
          count: plans.length,
          primaryPlan: plans[0]
            ? {
                headline: plans[0].headline,
                estimatedMinutes: plans[0].estimatedTotalMinutes,
                stepsCount: plans[0].steps.length,
              }
            : null,
        },
        cognition: {
          distortionsFound: distortions.length,
          safetyFlagsCount: safetyFlags.length,
          safetyFlags: safetyFlags,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(" Error:", error);
    return Response.json(
      {
        error: "Test failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
