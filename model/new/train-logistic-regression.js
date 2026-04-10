#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs/promises");
const path = require("path");
const tf = require("@tensorflow/tfjs");

const DATASET_PATH = path.join(__dirname, "student_datav5.txt");
const OUTPUT_PATHS = [
  path.join(process.cwd(), "public", "logisticRegressionWeights.json"),
  path.join(__dirname, "logisticRegressionWeights.json"),
];
const CLASS_NAMES = [
  "confusion",
  "ambiguity",
  "fear",
  "overwhelm",
  "exhaustion",
  "perfection_loop",
];
const INPUT_DIM = 384;
const BATCH_SIZE = 32;
const EPOCHS = 18;
const LEARNING_RATE = 0.05;
const L2_WEIGHT = 1e-4;

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function inferLabel(record) {
  const primaryCause = record.primaryCause.toLowerCase();
  const joinedText = [
    record.headVoice,
    record.eightyPercentFeeling,
    record.whyDoBest,
    record.avoidanceDuration,
    record.askingHelpFeeling,
  ]
    .join(" ")
    .toLowerCase();

  if (primaryCause.includes("perfectionism")) {
    return "perfection_loop";
  }

  if (primaryCause.includes("burnout")) {
    return "exhaustion";
  }

  if (
    primaryCause.includes("validation") ||
    primaryCause.includes("self doubt")
  ) {
    return "fear";
  }

  const confusionPatterns = [
    /don't understand/i,
    /dont understand/i,
    /don't get it/i,
    /dont get it/i,
    /can't follow/i,
    /cant follow/i,
    /doesn't make sense/i,
    /doesnt make sense/i,
    /what does this even mean/i,
    /what does this question even mean/i,
    /missing key piece/i,
    /missing instructions/i,
    /first step/i,
    /can't read the rubric/i,
    /can't follow simple directions/i,
    /don't know where to start/i,
    /words aren't making sense/i,
    /words arent making sense/i,
  ];

  const ambiguityPatterns = [
    /unclear/i,
    /vague/i,
    /what exactly/i,
    /what counts/i,
    /requirements/i,
    /criteria/i,
    /don't know what done looks like/i,
    /dont know what done looks like/i,
    /path is invisible/i,
    /map/i,
    /rubric doesn't specify/i,
    /rubric doesnt specify/i,
    /not specified/i,
  ];

  const overwhelmPatterns = [
    /too many/i,
    /too much/i,
    /drowning/i,
    /firehose/i,
    /all over/i,
    /tabs?/i,
    /frozen/i,
    /scatter/i,
    /overwhelmed/i,
    /can't think/i,
    /cant think/i,
    /start button/i,
    /brain and hands aren't connected/i,
    /brain and hands arent connected/i,
    /organi[sz]ation is killing me/i,
  ];

  if (matchesAny(joinedText, confusionPatterns)) {
    return "confusion";
  }

  if (matchesAny(joinedText, ambiguityPatterns)) {
    return "ambiguity";
  }

  if (matchesAny(joinedText, overwhelmPatterns)) {
    return "overwhelm";
  }

  return "overwhelm";
}

function oneHot(index, size) {
  const vector = new Array(size).fill(0);
  vector[index] = 1;
  return vector;
}

function mulberry32(seed) {
  let value = seed;
  return function random() {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(array, seed = 42) {
  const random = mulberry32(seed);
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function computeAccuracy(predictions, labels) {
  let correct = 0;
  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i] === labels[i]) correct += 1;
  }
  return predictions.length === 0 ? 0 : correct / predictions.length;
}

function computeMacroF1(predictions, labels, classCount) {
  const f1Scores = [];

  for (let classIndex = 0; classIndex < classCount; classIndex++) {
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    for (let i = 0; i < predictions.length; i++) {
      const predicted = predictions[i] === classIndex;
      const actual = labels[i] === classIndex;

      if (predicted && actual) truePositives += 1;
      else if (predicted && !actual) falsePositives += 1;
      else if (!predicted && actual) falseNegatives += 1;
    }

    const precision =
      truePositives + falsePositives === 0
        ? 0
        : truePositives / (truePositives + falsePositives);
    const recall =
      truePositives + falseNegatives === 0
        ? 0
        : truePositives / (truePositives + falseNegatives);
    const f1 =
      precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    f1Scores.push(f1);
  }

  return f1Scores.reduce((sum, score) => sum + score, 0) / f1Scores.length;
}

async function loadDataset() {
  const content = await fs.readFile(DATASET_PATH, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  const records = [];

  for (let index = 1; index < lines.length; index++) {
    const values = parseCsvLine(lines[index]);
    if (values.length < 6) continue;

    const [headVoice, eightyPercentFeeling, whyDoBest, avoidanceDuration, askingHelpFeeling, primaryCause] = values;

    records.push({
      headVoice,
      eightyPercentFeeling,
      whyDoBest,
      avoidanceDuration,
      askingHelpFeeling,
      primaryCause,
      text: [headVoice, eightyPercentFeeling, whyDoBest, avoidanceDuration, askingHelpFeeling].join(" "),
    });
  }

  return records;
}

async function embedTexts(texts, embedder) {
  const batches = [];
  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    const batch = texts.slice(start, start + BATCH_SIZE);
    const output = await embedder(batch, { pooling: "mean", normalize: true });
    const rows = output.dims[0];
    const cols = output.dims[1];
    for (let row = 0; row < rows; row++) {
      const offset = row * cols;
      batches.push(Array.from(output.data.slice(offset, offset + cols)));
    }

    if ((start / BATCH_SIZE) % 25 === 0) {
      console.log(`Embedded ${Math.min(start + batch.length, texts.length)}/${texts.length} examples...`);
    }
  }

  return batches;
}

async function saveWeights(payload) {
  const json = JSON.stringify(payload, null, 2);
  await Promise.all(
    OUTPUT_PATHS.map(async (outputPath) => {
      await fs.writeFile(outputPath, json, "utf8");
      console.log(`Wrote ${outputPath}`);
    }),
  );
}

async function main() {
  const { pipeline } = await import("@xenova/transformers");
  const startTime = Date.now();
  const dataset = await loadDataset();

  console.log(`Loaded ${dataset.length} rows from dataset`);

  const classToIndex = new Map(CLASS_NAMES.map((name, index) => [name, index]));
  const features = [];
  const labels = [];
  const labelNames = [];

  for (const record of dataset) {
    const labelName = inferLabel(record);
    const classIndex = classToIndex.get(labelName);
    if (classIndex === undefined) continue;

    features.push(record.text);
    labels.push(classIndex);
    labelNames.push(labelName);
  }

  console.log("Label distribution:");
  for (const className of CLASS_NAMES) {
    const count = labelNames.filter((label) => label === className).length;
    console.log(`  ${className}: ${count}`);
  }

  console.log("Loading embedding model...");
  const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  console.log("Embedding texts...");
  const embeddings = await embedTexts(features, embedder);

  if (embeddings.length !== features.length) {
    throw new Error(`Embedding count mismatch: expected ${features.length}, got ${embeddings.length}`);
  }

  const indexes = Array.from({ length: embeddings.length }, (_, index) => index);
  shuffleInPlace(indexes, 2026);

  const trainCutoff = Math.floor(indexes.length * 0.85);
  const trainIndexes = indexes.slice(0, trainCutoff);
  const valIndexes = indexes.slice(trainCutoff);

  const inputData = embeddings;
  const targetData = labels.map((labelIndex) => oneHot(labelIndex, CLASS_NAMES.length));

  const trainLabels = trainIndexes.map((index) => labels[index]);
  const labelCounts = new Array(CLASS_NAMES.length).fill(0);
  for (const label of trainLabels) labelCounts[label] += 1;
  const classWeights = labelCounts.map((count) => (count === 0 ? 0 : trainLabels.length / (CLASS_NAMES.length * count)));

  const trainFeaturesArray = trainIndexes.map((index) => inputData[index]);
  const trainTargetArray = trainIndexes.map((index) => targetData[index]);
  const trainWeightArray = trainIndexes.map((index) => classWeights[labels[index]]);

  const valFeaturesArray = valIndexes.map((index) => inputData[index]);
  const valTargetArray = valIndexes.map((index) => targetData[index]);
  const valLabelArray = valIndexes.map((index) => labels[index]);

  const trainX = tf.tensor2d(trainFeaturesArray, [trainFeaturesArray.length, INPUT_DIM]);
  const trainY = tf.tensor2d(trainTargetArray, [trainTargetArray.length, CLASS_NAMES.length]);
  const trainW = tf.tensor1d(trainWeightArray);

  const valX = tf.tensor2d(valFeaturesArray, [valFeaturesArray.length, INPUT_DIM]);
  const valY = tf.tensor2d(valTargetArray, [valTargetArray.length, CLASS_NAMES.length]);

  const weights = tf.variable(tf.zeros([INPUT_DIM, CLASS_NAMES.length]));
  const biases = tf.variable(tf.zeros([CLASS_NAMES.length]));
  const optimizer = tf.train.adam(LEARNING_RATE);

  console.log(`Training logistic regression for ${EPOCHS} epochs...`);
  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    const epochIndexes = Array.from({ length: trainFeaturesArray.length }, (_, index) => index);
    shuffleInPlace(epochIndexes, 2026 + epoch);

    let epochLoss = 0;
    let batches = 0;

    for (let start = 0; start < epochIndexes.length; start += BATCH_SIZE) {
      const batchIndexes = epochIndexes.slice(start, start + BATCH_SIZE);
      const batchX = tf.gather(trainX, batchIndexes);
      const batchY = tf.gather(trainY, batchIndexes);
      const batchW = tf.gather(trainW, batchIndexes);

      const cost = optimizer.minimize(() => tf.tidy(() => {
        const logits = batchX.matMul(weights).add(biases);
        const logProbabilities = tf.logSoftmax(logits);
        const perExampleLoss = tf.neg(tf.sum(batchY.mul(logProbabilities), 1));
        const weightedLoss = perExampleLoss.mul(batchW);
        const l2Penalty = weights.square().mean().mul(L2_WEIGHT);
        return weightedLoss.mean().add(l2Penalty);
      }), true, [weights, biases]);

      epochLoss += cost.dataSync()[0];
      batches += 1;

      batchX.dispose();
      batchY.dispose();
      batchW.dispose();
      cost.dispose();
    }

    const averageLoss = epochLoss / Math.max(batches, 1);
    console.log(`Epoch ${epoch + 1}/${EPOCHS} - loss: ${averageLoss.toFixed(4)}`);
  }

  const valLogits = valX.matMul(weights).add(biases);
  const valProbabilities = tf.softmax(valLogits, 1);
  const predictedIndexes = Array.from(valProbabilities.argMax(1).dataSync());
  const validationAccuracy = computeAccuracy(predictedIndexes, valLabelArray);
  const validationMacroF1 = computeMacroF1(predictedIndexes, valLabelArray, CLASS_NAMES.length);

  console.log(`Validation accuracy: ${(validationAccuracy * 100).toFixed(2)}%`);
  console.log(`Validation macro F1: ${(validationMacroF1 * 100).toFixed(2)}%`);

  const finalWeights = await weights.transpose().array();
  const finalBiases = Array.from(biases.dataSync());

  const payload = {
    description: "Logistic regression weights trained on student_datav5 dataset",
    inputDim: INPUT_DIM,
    outputDim: CLASS_NAMES.length,
    classes: CLASS_NAMES,
    weights: finalWeights,
    biases: finalBiases,
    metadata: {
      trainingDate: new Date().toISOString(),
      trainingDataSize: features.length,
      trainSize: trainFeaturesArray.length,
      validationSize: valFeaturesArray.length,
      classCounts: Object.fromEntries(CLASS_NAMES.map((name, index) => [name, labelCounts[index]])),
      validationAccuracy,
      validationMacroF1,
      modelType: "MultinomialLogisticRegression",
      embeddingModel: "Xenova/all-MiniLM-L6-v2",
    },
  };

  await saveWeights(payload);

  trainX.dispose();
  trainY.dispose();
  trainW.dispose();
  valX.dispose();
  valY.dispose();
  valLogits.dispose();
  valProbabilities.dispose();
  weights.dispose();
  biases.dispose();

  const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Finished in ${elapsedSeconds}s`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
