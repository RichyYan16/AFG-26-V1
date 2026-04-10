/**
 * Test script to visualize Sentence-BERT embedding outputs
 */

(async () => {
  const { pipeline } = await import("@xenova/transformers");

  console.log(" Loading Sentence-BERT model (Xenova/all-MiniLM-L6-v2)...\n");
  const model = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

  // Test sentences
  const testSentences = [
    "I don't understand what the assignment is asking for",
    "The requirements are unclear to me",
    "I'm terrified of failing this assignment",
    "This assignment is way too much for me",
    "I'm too tired to think about this",
    "This doesn't feel good enough to submit",
  ];

  console.log(" Test Sentences:\n");
  testSentences.forEach((sent, i) => {
    console.log(`${i + 1}. "${sent}"`);
  });

  console.log("\n Computing embeddings...\n");

  for (const sentence of testSentences) {
    const result = await model(sentence, {
      pooling: "mean",
      normalize: true,
    });

    const embedding = Array.from(result.data);

    console.log(` Sentence: "${sentence}"`);
    console.log(`   Dimensions: ${embedding.length}`);
    console.log(`   First 10 values: [${embedding.slice(0, 10).map(v => v.toFixed(4)).join(", ")}...]`);
    console.log(`   Last 10 values: [...${embedding.slice(-10).map(v => v.toFixed(4)).join(", ")}]`);
    console.log(`   Magnitude (L2 norm): ${Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0)).toFixed(4)}`);
    console.log(`   Min value: ${Math.min(...embedding).toFixed(4)}, Max value: ${Math.max(...embedding).toFixed(4)}`);
    console.log("");
  }

  // Show cosine similarity between first two embeddings
  console.log(" Computing cosine similarity between first two embeddings...\n");

  const emb1 = Array.from((await model(testSentences[0], { pooling: "mean", normalize: true })).data);
  const emb2 = Array.from((await model(testSentences[1], { pooling: "mean", normalize: true })).data);

  const dotProduct = emb1.reduce((sum, val, i) => sum + val * emb2[i], 0);
  const similarity = dotProduct; // Already normalized

  console.log(`Sentence 1: "${testSentences[0]}"`);
  console.log(`Sentence 2: "${testSentences[1]}"`);
  console.log(`Cosine Similarity: ${similarity.toFixed(4)}\n`);

  console.log(" Done!");
})();
