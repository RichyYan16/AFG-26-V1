/**
 * Simple test to verify the embedding model configuration
 */

// Check if the weights file exists and has the right structure
const fs = require('fs');
const path = require('path');

console.log("=== TESTING EMBEDDING MODEL CONFIGURATION ===\n");

// Test 1: Check weights file
const weightsPath = path.join(__dirname, '..', '..', 'public', 'logisticRegressionWeights.json');
console.log(`1. Checking weights file at: ${weightsPath}`);

try {
  const weightsData = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
  console.log("✅ Weights file loaded successfully");
  console.log(`   - Input dimension: ${weightsData.inputDim}`);
  console.log(`   - Output dimension: ${weightsData.outputDim}`);
  console.log(`   - Classes: ${weightsData.classes?.join(', ')}`);
  console.log(`   - Weights array length: ${weightsData.weights?.length}`);
  
  if (weightsData.classes && weightsData.classes.length === 6) {
    console.log("✅ All 6 stuck types are present in weights file");
  } else {
    console.log("❌ Missing stuck types in weights file");
  }
  
  // Check first few weights to ensure they're not all identical
  if (weightsData.weights && weightsData.weights.length > 0) {
    const firstRow = weightsData.weights[0];
    const uniqueValues = new Set(firstRow.map(v => Math.round(v * 1000) / 1000));
    console.log(`   - Unique values in first row: ${uniqueValues.size}`);
    
    if (uniqueValues.size > 1) {
      console.log("✅ Weights have variation (not all identical)");
    } else {
      console.log("❌ All weights in first row are identical");
    }
  }
  
} catch (error) {
  console.log("❌ Failed to load weights file:", error.message);
}

// Test 2: Check model configuration
console.log("\n2. Checking model configuration...");
try {
  const configPath = path.join(__dirname, 'weights.ts');
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  // Extract the EMBEDDING_MODEL_CONFIG
  const configMatch = configContent.match(/EMBEDDING_MODEL_CONFIG\s*=\s*{[^}]+}/s);
  if (configMatch) {
    console.log("✅ Model configuration found");
    const configText = configMatch[0];
    
    if (configText.includes('paraphrase-MiniLM-L3-v2')) {
      console.log("✅ Using lighter paraphrase-MiniLM-L3-v2 model");
    } else {
      console.log("⚠️  Still using older model");
    }
    
    if (configText.includes('dimension: 384')) {
      console.log("✅ Dimension set to 384");
    } else {
      console.log("❌ Dimension not set correctly");
    }
  } else {
    console.log("❌ Model configuration not found");
  }
} catch (error) {
  console.log("❌ Failed to read configuration:", error.message);
}

// Test 3: Check word embedding configuration
console.log("\n3. Checking word embedding configuration...");
try {
  const embeddingPath = path.join(__dirname, 'wordEmbedding.ts');
  const embeddingContent = fs.readFileSync(embeddingPath, 'utf8');
  
  if (embeddingContent.includes('paraphrase-MiniLM-L3-v2')) {
    console.log("✅ Word embedding using lighter model");
  } else {
    console.log("❌ Word embedding still using older model");
  }
  
  // Check anchor definitions
  const anchorMatch = embeddingContent.match(/STUCK_TYPE_ANCHORS[^}]+}/s);
  if (anchorMatch) {
    const anchorText = anchorMatch[0];
    const anchorTypes = ['confusion', 'ambiguity', 'fear', 'overwhelm', 'exhaustion', 'perfection_loop'];
    let allPresent = true;
    
    anchorTypes.forEach(type => {
      if (!anchorText.includes(type)) {
        allPresent = false;
      }
    });
    
    if (allPresent) {
      console.log("✅ All 6 stuck types have anchor definitions");
    } else {
      console.log("❌ Missing anchor definitions for some types");
    }
  }
} catch (error) {
  console.log("❌ Failed to read embedding configuration:", error.message);
}

console.log("\n=== TEST COMPLETE ===");
