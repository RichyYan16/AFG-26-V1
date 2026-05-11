/**
 * Test script to verify embedding model functionality
 * Run with: node test-embeddings.js
 */

// Import the functions we need to test
const { diagnoseWithEmbeddingsOnly } = require('./index.ts');

// Sample test data
const testAnswers = {
  internalVoice: "I'm completely lost and don't understand what to do",
  eightyPercentThought: "This is impossible and I'm going to fail",
  whyBestWork: "I need this to be perfect or it's worthless",
  avoidanceDuration: "I've been staring at this for hours",
  helpSeeking: "I'm too scared to ask for help because they'll think I'm stupid"
};

async function testEmbeddings() {
  console.log("=== TESTING EMBEDDING MODEL ===\n");
  
  try {
    console.log("Test answers:", testAnswers);
    console.log("");
    
    const result = await diagnoseWithEmbeddingsOnly(testAnswers);
    
    console.log("=== RESULTS ===");
    console.log(`Primary type: ${result.primaryType}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log("");
    
    console.log("All ranked types (should be 6):");
    result.rankedTypes.forEach((rank, i) => {
      console.log(`  ${i + 1}. ${rank.type}: ${(rank.normalized * 100).toFixed(1)}%`);
    });
    console.log("");
    
    console.log("Embedding similarities (should be 6 types):");
    Object.entries(result.embeddingSimilarities).forEach(([type, score]) => {
      console.log(`  ${type}: ${score.toFixed(3)}`);
    });
    
    // Verify we have all 6 types
    const expectedTypes = ["confusion", "ambiguity", "fear", "overwhelm", "exhaustion", "perfection_loop"];
    const actualTypes = result.rankedTypes.map(r => r.type);
    
    console.log("\n=== VALIDATION ===");
    console.log(`Expected ${expectedTypes.length} types, got ${actualTypes.length}`);
    
    const missingTypes = expectedTypes.filter(type => !actualTypes.includes(type));
    if (missingTypes.length > 0) {
      console.log("❌ Missing types:", missingTypes);
    } else {
      console.log("✅ All 6 stuck types present");
    }
    
    // Check if scores are identical
    const scores = actualTypes.map(type => 
      result.embeddingSimilarities[type]
    );
    const uniqueScores = new Set(scores.map(s => s.toFixed(4)));
    
    if (uniqueScores.size === 1) {
      console.log("❌ All scores are identical - this indicates a problem");
    } else {
      console.log(`✅ Scores are varied (${uniqueScores.size} unique values)`);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  }
}

testEmbeddings();
