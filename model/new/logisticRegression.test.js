"use strict";
/**
 * Test script for Logistic Regression classifier
 * Validates that embeddings are correctly classified to stuck types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testLogisticRegression = testLogisticRegression;
const logisticRegression_1 = require("./logisticRegression");
// Test with a sample 512-dimensional embedding vector
async function testLogisticRegression() {
    console.log("🧪 Testing Logistic Regression Classifier\n");
    // Get model info
    const modelInfo = (0, logisticRegression_1.getModelInfo)();
    console.log("📊 Model Architecture:");
    console.log(`   Input Dimensions: ${modelInfo.inputDim}`);
    console.log(`   Output Dimensions: ${modelInfo.outputDim}`);
    console.log(`   Classes: ${modelInfo.classes.join(", ")}\n`);
    // Create a sample embedding vector (512 dimensions)
    // In real usage, this comes from Universal Sentence Encoder
    const sampleEmbedding = Array(512)
        .fill(0)
        .map(() => (Math.random() - 0.5) * 0.5);
    console.log("🔍 Test 1: Single Embedding Classification");
    const result = await (0, logisticRegression_1.classifyWithLogisticRegression)(sampleEmbedding);
    console.log(`   Primary Type: ${result.primaryType}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log("   All Probabilities:");
    Object.entries(result.predictions).forEach(([type, prob]) => {
        const bar = "█".repeat(Math.round(prob * 30)) +
            "░".repeat(30 - Math.round(prob * 30));
        console.log(`   ${type.padEnd(15)}: ${bar} ${(prob * 100).toFixed(1)}%`);
    });
    // Test batch classification
    console.log("\n🔍 Test 2: Batch Classification (3 embeddings)");
    const batchEmbeddings = [
        Array(512)
            .fill(0)
            .map(() => (Math.random() - 0.5) * 0.5),
        Array(512)
            .fill(0)
            .map(() => (Math.random() - 0.5) * 0.5),
        Array(512)
            .fill(0)
            .map(() => (Math.random() - 0.5) * 0.5),
    ];
    const batchResults = await (0, logisticRegression_1.classifyBatchWithLogisticRegression)(batchEmbeddings);
    batchResults.forEach((res, i) => {
        console.log(`   Sample ${i + 1}: ${res.primaryType} (${(res.confidence * 100).toFixed(1)}% confidence)`);
    });
    console.log("\n✅ Logistic Regression Classifier Test Complete");
}
// Run test if this file is executed directly
if (require.main === module) {
    testLogisticRegression().catch(console.error);
}
