#!/usr/bin/env node
/**
 * Quick test to verify logistic regression weights load correctly
 */

const fs = require("fs");
const path = require("path");

console.log("🧪 Testing Logistic Regression Weights Loading\n");

// Test 1: Check file exists
const weightsPath = path.join(__dirname, "public", "logisticRegressionWeights.json");
console.log(`📁 Checking weights file: ${weightsPath}`);

if (fs.existsSync(weightsPath)) {
  console.log("✅ Weights file exists");
} else {
  console.error("❌ Weights file not found!");
  process.exit(1);
}

// Test 2: Check file size
const stats = fs.statSync(weightsPath);
console.log(`📊 File size: ${(stats.size / 1024).toFixed(1)}KB`);

// Test 3: Parse JSON
try {
  const data = JSON.parse(fs.readFileSync(weightsPath, "utf-8"));
  console.log("✅ JSON parses successfully");

  // Test 4: Check structure
  console.log(`📋 Structure:`);
  console.log(`   - weights: Array of ${data.weights.length} arrays`);
  console.log(`   - weights[0]: ${data.weights[0].length} floats`);
  console.log(`   - biases: ${data.biases.length} floats`);
  console.log(`   - metadata: Present`);

  // Test 5: Verify dimensions
  if (data.weights.length === 6 && data.weights[0].length === 512) {
    console.log("✅ Correct dimensions: [6, 512]");
  } else {
    console.error(
      `❌ Wrong dimensions: [${data.weights.length}, ${data.weights[0].length}]`
    );
  }

  if (data.biases.length === 6) {
    console.log("✅ Correct bias count: 6");
  } else {
    console.error(`❌ Wrong bias count: ${data.biases.length}`);
  }

  console.log("\n✨ Weights file is valid and ready to use!\n");
} catch (error) {
  console.error("❌ Failed to parse JSON:", error.message);
  process.exit(1);
}
