/**
 * Sentence-BERT-based Embedding Model
 * Computes semantic similarity between student responses and stuck type anchors
 * Uses @xenova/transformers for efficient ONNX-based inference
 */

import { env, pipeline } from "@xenova/transformers";
import type { DiagnosticAnswers, StuckType } from "./types";
import { EMBEDDING_WEIGHTS } from "./weights";

const SBERT_MODEL_ID = process.env.SBERT_MODEL_ID || "Xenova/paraphrase-MiniLM-L3-v2";
const SBERT_ALLOW_REMOTE_MODELS =
  process.env.SBERT_ALLOW_REMOTE_MODELS !== "false";
const SBERT_LOCAL_MODEL_PATH = process.env.SBERT_LOCAL_MODEL_PATH;

// Sentence-BERT loading configuration:
// - local models always allowed
// - remote downloads enabled by default unless explicitly disabled
env.allowLocalModels = true;
env.allowRemoteModels = SBERT_ALLOW_REMOTE_MODELS;
if (SBERT_LOCAL_MODEL_PATH) {
  env.localModelPath = SBERT_LOCAL_MODEL_PATH;
}

interface EmbeddingResult {
  data: ArrayLike<number>;
}

type EmbeddingPipeline = (
  input: string,
  options: { pooling: "mean"; normalize: boolean },
) => Promise<EmbeddingResult>;

let modelCache: EmbeddingPipeline | null = null;
let anchorEmbeddingCache: Record<StuckType, number[][]> | null = null;

/**
 * Load Sentence-BERT model (cached)
 * Uses the all-MiniLM-L6-v2 model via @xenova/transformers
 */
async function loadModel() {
  if (!modelCache) {
    console.log("\n" + "=".repeat(60));
    console.log(" EMBEDDING MODEL LOADING STARTED");
    console.log("=".repeat(60));
    console.log(` Model ID: ${SBERT_MODEL_ID}`);
    console.log(` Allow remote models: ${SBERT_ALLOW_REMOTE_MODELS}`);
    console.log(` Local model path: ${SBERT_LOCAL_MODEL_PATH || 'Not specified'}`);
    console.log(` Transformers.js version: ${typeof pipeline !== 'undefined' ? 'loaded' : 'not loaded'}`);
    
    try {
      console.log(`\n🔄 Loading pipeline with model: ${SBERT_MODEL_ID}...`);
      const startTime = Date.now();
      
      const loadedModel = await pipeline("feature-extraction", SBERT_MODEL_ID);
      
      const loadTime = Date.now() - startTime;
      console.log(`✅ Pipeline loaded in ${loadTime}ms`);
      
      // Safety check: ensure loaded model is valid
      if (!loadedModel) {
        throw new Error('Model loading returned null/undefined');
      }
      
      console.log(`✅ Model object created successfully`);
      console.log(`   Model type: ${typeof loadedModel}`);
      console.log(`   Model constructor: ${loadedModel.constructor?.name || 'Unknown'}`);
      
      // Test the model with a simple input
      console.log(`\n🧪 Testing model with sample input...`);
      const testStartTime = Date.now();
      
      try {
        const testResult = await loadedModel("test", {
          pooling: "mean",
          normalize: true,
        });
        
        const testTime = Date.now() - testStartTime;
        console.log(`✅ Model test successful in ${testTime}ms`);
        console.log(`   Result type: ${typeof testResult}`);
        console.log(`   Has data property: ${testResult?.data ? 'yes' : 'no'}`);
        console.log(`   Data type: ${typeof testResult?.data}`);
        console.log(`   Data length: ${testResult?.data?.length || 0}`);
        console.log(`   Sample values: [${Array.from(testResult?.data || []).slice(0, 3).map(v => v.toFixed(3)).join(", ")}...]`);
        
      } catch (testError) {
        console.error(`❌ Model test failed:`, testError instanceof Error ? testError.message : String(testError));
        throw new Error(`Model test failed: ${testError instanceof Error ? testError.message : String(testError)}`);
      }
      
      modelCache = loadedModel as unknown as EmbeddingPipeline;
      console.log("\n✅ Sentence-BERT model loaded and cached successfully");
      console.log("=".repeat(60) + "\n");
      
    } catch (error) {
      console.error("\n❌ Failed to load Sentence-BERT model:");
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`   Allow remote models: ${SBERT_ALLOW_REMOTE_MODELS}`);
      console.error(`   Model ID: ${SBERT_MODEL_ID}`);
      
      if (error instanceof Error && error.stack) {
        console.error(`   Stack trace: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
      }
      
      console.log("=".repeat(60) + "\n");
      throw new Error(`Failed to load Sentence-BERT model: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    console.log("📦 Using cached embedding model");
  }
  
  // Safety check: ensure cached model is valid
  if (!modelCache) {
    console.error("❌ Model cache is null/undefined after loading");
    throw new Error('Model cache is null/undefined after loading');
  }
  
  return modelCache;
}

async function loadAnchorEmbeddings(
  model: EmbeddingPipeline,
): Promise<Record<StuckType, number[][]>> {
  if (anchorEmbeddingCache) {
    console.log("📦 Using cached anchor embeddings");
    return anchorEmbeddingCache;
  }

  console.log("\n" + "=".repeat(60));
  console.log(" ANCHOR EMBEDDINGS LOADING STARTED");
  console.log("=".repeat(60));

  // Safety check: ensure model is valid
  if (!model) {
    console.error('❌ Invalid model provided to loadAnchorEmbeddings');
    throw new Error('Invalid model: model is null or undefined');
  }

  console.log(`✅ Model validated for anchor processing`);
  console.log(`   Model type: ${typeof model}`);
  console.log(`   Model constructor: ${model.constructor?.name || 'Unknown'}`);

  const cache: Record<StuckType, number[][]> = {
    confusion: [],
    ambiguity: [],
    fear: [],
    overwhelm: [],
    exhaustion: [],
    perfection_loop: [],
  };

  console.log(`\n🔗 Processing ${Object.keys(STUCK_TYPE_ANCHORS).length} stuck types...`);
  
  let totalAnchors = 0;
  let successfulAnchors = 0;
  let failedAnchors = 0;

  for (const [stuckType, anchors] of Object.entries(
    STUCK_TYPE_ANCHORS,
  ) as [StuckType, string[]][]) {
    console.log(`\n📝 Processing ${stuckType} (${anchors.length} anchors)...`);
    totalAnchors += anchors.length;
    
    for (const anchor of anchors) {
      try {
        const anchorStartTime = Date.now();
        
        const anchorResult = await model(anchor, {
          pooling: "mean",
          normalize: true,
        });
        
        const anchorTime = Date.now() - anchorStartTime;
        
        // Safety check: ensure anchorResult and anchorResult.data are valid
        if (!anchorResult || !anchorResult.data) {
          console.error(`   ❌ Invalid anchor result for "${anchor.substring(0, 30)}...":`, anchorResult);
          failedAnchors++;
          continue;
        }
        
        const embeddingVector = Array.from(anchorResult.data) as number[];
        
        // Validate embedding vector
        if (!embeddingVector || embeddingVector.length === 0) {
          console.error(`   ❌ Empty embedding vector for "${anchor.substring(0, 30)}..."`);
          failedAnchors++;
          continue;
        }
        
        cache[stuckType].push(embeddingVector);
        successfulAnchors++;
        console.log(`   ✅ (${anchorTime}ms) "${anchor.substring(0, 40)}..." -> [${embeddingVector.length} dims]`);
        
      } catch (error) {
        console.error(`   ❌ Failed to process anchor "${anchor.substring(0, 30)}...":`, error instanceof Error ? error.message : String(error));
        failedAnchors++;
        // Continue with other anchors
      }
    }
    
    console.log(`   📊 ${stuckType}: ${cache[stuckType].length}/${anchors.length} anchors successful`);
  }

  anchorEmbeddingCache = cache;
  
  // Summary statistics
  console.log(`\n📈 ANCHOR EMBEDDINGS SUMMARY:`);
  console.log(`   Total anchors processed: ${totalAnchors}`);
  console.log(`   Successful: ${successfulAnchors} (${((successfulAnchors/totalAnchors)*100).toFixed(1)}%)`);
  console.log(`   Failed: ${failedAnchors} (${((failedAnchors/totalAnchors)*100).toFixed(1)}%)`);
  
  // Debug: Report anchor embedding counts
  console.log(`\n📊 Final anchor embedding counts:`);
  Object.entries(cache).forEach(([type, embeddings]) => {
    const status = embeddings.length > 0 ? '✅' : '❌';
    console.log(`   ${status} ${type}: ${embeddings.length} anchors`);
  });
  
  // Check if all types have anchors loaded
  const typesWithEmptyAnchors = Object.entries(cache)
    .filter(([type, embeddings]) => embeddings.length === 0)
    .map(([type]) => type);
    
  if (typesWithEmptyAnchors.length > 0) {
    console.log(`\n⚠️  TYPES WITH NO ANCHOR EMBEDDINGS: ${typesWithEmptyAnchors.join(', ')}`);
    console.log(`   This may cause identical scores for all types`);
    
    // Create fallback embeddings for types that failed
    const stuckTypeArray: StuckType[] = ["confusion", "ambiguity", "fear", "overwhelm", "exhaustion", "perfection_loop"];
    typesWithEmptyAnchors.forEach(type => {
      console.log(`   🔧 Creating fallback embeddings for ${type}`);
      // Create simple distinct vectors for each type
      const fallbackVector = new Array(384).fill(0);
      const typeIndex = stuckTypeArray.indexOf(type as StuckType);
      // Set a unique value for each type at different positions
      fallbackVector[typeIndex * 64] = 1.0;
      cache[type as StuckType] = [fallbackVector];
    });
    
    console.log(`\n🔧 FALLBACK EMBEDDINGS CREATED. Updated counts:`);
    Object.entries(cache).forEach(([type, embeddings]) => {
      const status = embeddings.length > 0 ? '✅' : '❌';
      console.log(`   ${status} ${type}: ${embeddings.length} anchors`);
    });
  } else {
    console.log(`\n✅ ALL TYPES HAVE ANCHOR EMBEDDINGS - No fallbacks needed`);
  }
  
  console.log("=".repeat(60) + "\n");
  return anchorEmbeddingCache;
}

/**
 * Reference anchor statements for each stuck type
 * These represent prototypical expressions of each type
 */
const STUCK_TYPE_ANCHORS: Record<StuckType, string[]> = {
  confusion: [
    "I don't understand what the assignment is asking for",
    "I'm confused about the concepts",
    "I don't know where to start",
    "I'm re-reading the material but it still doesn't make sense",
    "What does this question even mean?",
    "I don't get it",
    "This is unclear to me",
  ],
  ambiguity: [
    "The requirements are unclear to me",
    "I don't know what done looks like",
    "The rubric doesn't specify what counts",
    "It's vague what the teacher wants",
    "I'm unsure about the success criteria",
    "What exactly are they asking for?",
    "The requirements are ambiguous",
  ],
  fear: [
    "I'm terrified of failing this assignment",
    "My grade will be ruined if I submit this",
    "I'm anxious about what the professor will think",
    "What if I get it completely wrong?",
    "I'm scared this won't be good enough",
    "I'm worried about judgment",
    "What if I fail?",
  ],
  overwhelm: [
    "This assignment is way too much for me",
    "There are so many parts I don't know where to begin",
    "I feel paralyzed by how much work this is",
    "I'm frozen because it's so big",
    "Everything feels impossible right now",
    "It's too much to handle",
    "I'm drowning in work",
  ],
  exhaustion: [
    "I'm too tired to think about this",
    "I feel emotionally drained and numb",
    "I have no energy left for this work",
    "My brain is fried, I can't focus",
    "I feel burnt out and empty",
    "I'm just drained",
    "I can't think straight anymore",
  ],
  perfection_loop: [
    "This doesn't feel good enough to submit",
    "I keep editing because it's not perfect",
    "I can't submit rough work, it needs to be flawless",
    "Nothing I write is good enough",
    "I'm stuck rewriting the same thing over and over",
    "It has to be perfect",
    "I can't submit something imperfect",
  ],
} as const;

/**
 * Compute raw embedding vector from student answers
 * Returns the 384-dimensional vector representation [a, b, c, ...]
 * This vector captures the semantic/emotional essence of their responses
 */
export async function computeEmbeddingVector(
  answers: DiagnosticAnswers,
): Promise<number[]> {
  console.log("\n" + "=".repeat(60));
  console.log(" COMPUTING EMBEDDING VECTOR");
  console.log("=".repeat(60));
  
  try {
    console.log("🔄 Loading model...");
    const model = await loadModel();
    console.log("✅ Model loaded successfully");

    // Safety check: ensure answers is a valid object
    if (!answers || typeof answers !== 'object') {
      console.error('❌ Invalid answers provided to computeEmbeddingVector:', answers);
      throw new Error('Invalid answers: must be a valid object');
    }

    console.log(`✅ Answers validated: ${Object.keys(answers).length} fields`);

    // Combine all answers into single text
    const studentText = Object.values(answers)
      .filter(Boolean)
      .join(" ");

    console.log(`📝 Combined text length: ${studentText.length} characters`);
    console.log(`   Sample text: "${studentText.substring(0, 100)}${studentText.length > 100 ? '...' : ''}"`);

    // Ensure we have some text to embed
    if (!studentText.trim()) {
      console.error('❌ No valid text found in answers for embedding');
      throw new Error('No valid text found in answers for embedding');
    }

    console.log("🔄 Computing embedding...");
    const embedStartTime = Date.now();

    // Embed student response using Sentence-BERT
    const result = await model(studentText, {
      pooling: "mean",
      normalize: true,
    });

    const embedTime = Date.now() - embedStartTime;
    console.log(`✅ Embedding computed in ${embedTime}ms`);

    // Safety check: ensure result and result.data are valid
    if (!result || !result.data) {
      console.error('❌ Invalid model result:', result);
      throw new Error('Invalid model result: result or result.data is null/undefined');
    }

    // Extract embedding vector from result
    const studentVec = Array.from(result.data) as number[];

    // Safety check: ensure we got a valid vector
    if (!studentVec || studentVec.length === 0) {
      console.error('❌ Invalid embedding vector:', studentVec);
      throw new Error('Invalid embedding vector: empty or null');
    }

    console.log(`✅ Embedding vector computed successfully:`);
    console.log(`   Dimensions: ${studentVec.length}`);
    console.log(`   Min value: ${Math.min(...studentVec).toFixed(4)}`);
    console.log(`   Max value: ${Math.max(...studentVec).toFixed(4)}`);
    console.log(`   Mean value: ${(studentVec.reduce((a, b) => a + b, 0) / studentVec.length).toFixed(4)}`);
    console.log(`   Sample values: [${studentVec.slice(0, 5).map(v => v.toFixed(3)).join(", ")}...]`);
    
    console.log("=".repeat(60) + "\n");
    return studentVec;
  } catch (e) {
    console.error("\n❌ EMBEDDING COMPUTATION FAILED:");
    console.error(`   Error: ${e instanceof Error ? e.message : String(e)}`);
    if (e instanceof Error && e.stack) {
      console.error(`   Stack: ${e.stack.split('\n').slice(0, 3).join('\n')}`);
    }
    console.log("=".repeat(60) + "\n");
    throw e;
  }
}

/**
 * Compute embedding scores for all stuck types based on student answers
 * Uses the raw embedding vector [a, b, c, ...] to compute similarity
 * Returns normalized similarity scores (0-1) for each type
 */
export async function computeEmbeddingScores(
  answers: DiagnosticAnswers,
): Promise<Record<StuckType, number>> {
  try {
    const model = await loadModel();
    const anchorEmbeddings = await loadAnchorEmbeddings(model);

    // Get raw embedding vector
    const studentVec = await computeEmbeddingVector(answers);

    const scores: Record<StuckType, number> = {
      confusion: 0,
      ambiguity: 0,
      fear: 0,
      overwhelm: 0,
      exhaustion: 0,
      perfection_loop: 0,
    };

    // For each stuck type, compute similarity to anchor statements
    for (const [stuckType] of Object.entries(
      STUCK_TYPE_ANCHORS,
    ) as [StuckType, string[]][]) {
      let typeScore = 0;
      const anchorVectors = anchorEmbeddings[stuckType];

      // Average similarity across all anchors for this type
      for (const anchorVec of anchorVectors) {
        const similarity = cosineSimilarity(studentVec, anchorVec);
        typeScore += similarity;
      }

      scores[stuckType] = typeScore / anchorVectors.length;
    }

    console.log(` Computed embedding scores for all stuck types`);
    console.log(`   Raw scores:`, Object.entries(scores).map(([type, score]) => 
      `${type}: ${score.toFixed(3)}`
    ).join(", "));
    
    // Normalize scores
    const normalizedScores = normalizeScores(scores);
    console.log(`   Normalized scores:`, Object.entries(normalizedScores).map(([type, score]) => 
      `${type}: ${score.toFixed(3)}`
    ).join(", "));
    
    return normalizedScores;
  } catch (e) {
    console.error(` Unable to load model: ${e instanceof Error ? e.message : String(e)}`);
    throw e;
  }
}

/**
 * Compute cosine similarity between two vectors
 * Returns value between -1 and 1 (typically 0-1 for embeddings)
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Normalize scores to 0-1 range using min-max normalization
 */
function normalizeScores(
  scores: Record<StuckType, number>,
): Record<StuckType, number> {
  const maxScore = Math.max(...Object.values(scores));
  const minScore = Math.min(...Object.values(scores));
  const range = maxScore - minScore || 1;

  const normalized = Object.entries(scores).reduce(
    (acc, [type, score]) => {
      acc[type as StuckType] = (score - minScore) / range;
      return acc;
    },
    {} as Record<StuckType, number>,
  );

  return normalized;
}

/**
 * Apply behavioral signal boosts to embedding scores
 * E.g., "rereading" behavior boosts confusion score
 */
export function applyBehavioralSignalBoosts(
  scores: Record<StuckType, number>,
  signals: {
    rereading?: boolean;
    tabSwitching?: boolean;
    excessiveEditing?: boolean;
    physicalHeaviness?: boolean;
    repeatedStartStop?: boolean;
    procrastination?: boolean;
  },
): Record<StuckType, number> {
  const boosted = { ...scores };

  const signalMap: Record<string, StuckType> = {
    rereading: "confusion",
    tabSwitching: "overwhelm",
    excessiveEditing: "perfection_loop",
    physicalHeaviness: "exhaustion",
    repeatedStartStop: "fear",
    procrastination: "overwhelm",
  };

  for (const [signal, stuckType] of Object.entries(signalMap)) {
    if (signals[signal as keyof typeof signals]) {
      const boost = EMBEDDING_WEIGHTS[stuckType].boostMultiplier;
      boosted[stuckType] *= boost;
    }
  }

  // Re-normalize after boosts
  return normalizeScores(boosted);
}

/**
 * Get detailed similarity breakdown for transparency and debugging
 * Shows how similar student response is to each anchor statement
 */
export async function getEmbeddingSimilarityBreakdown(
  answers: DiagnosticAnswers,
): Promise<Record<StuckType, { anchors: string[]; similarities: number[] }>> {
  const model = await loadModel();
  const anchorEmbeddings = await loadAnchorEmbeddings(model);
  const studentText = Object.values(answers)
    .filter(Boolean)
    .join(" ");

  const studentResult = await model(studentText, {
    pooling: "mean",
    normalize: true,
  });
  const studentVec = Array.from(studentResult.data) as number[];

  const breakdown: Record<
    StuckType,
    { anchors: string[]; similarities: number[] }
  > = {
    confusion: { anchors: [], similarities: [] },
    ambiguity: { anchors: [], similarities: [] },
    fear: { anchors: [], similarities: [] },
    overwhelm: { anchors: [], similarities: [] },
    exhaustion: { anchors: [], similarities: [] },
    perfection_loop: { anchors: [], similarities: [] },
  };

  for (const [stuckType, anchors] of Object.entries(
    STUCK_TYPE_ANCHORS,
  ) as [StuckType, string[]][]) {
    breakdown[stuckType].anchors = anchors;
    const anchorVectors = anchorEmbeddings[stuckType];
    for (const anchorVec of anchorVectors) {
      const similarity = cosineSimilarity(studentVec, anchorVec);
      breakdown[stuckType].similarities.push(similarity);
    }
  }

  return breakdown;
}
