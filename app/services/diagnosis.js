import { sendMessageToAPI } from "@/app/services/api.js";
import { requestDiagnosis } from "../utils.js";

/**
 * Compute word embeddings based on diagnostic answers
 * Uses pattern matching on response text to generate feature scores
 * 
 * @param {Partial<DiagnosticAnswers>} answers - Student's responses to diagnostic questions
 * @returns {Record<string, number>} Object mapping stuck type names to confidence scores
 * 
 * @typedef {Object} DiagnosticAnswers
 * @property {string} [internalVoice] - What the student's internal voice says
 * @property {string} [eightyPercentThought] - What prevents submitting 80% complete work
 * @property {string} [whyBestWork] - Whether their best work is good enough
 * @property {string} [avoidanceDuration] - How long they've been avoiding the task
 * @property {string} [helpSeeking] - How they feel about seeking help
 */
export function computeWordEmbeddings(answers) {
  const embeddings = {};
  
  // Simple word embedding based on response patterns
  // Using actual DiagnosticAnswers properties
  if (answers.internalVoice && answers.internalVoice.toLowerCase().includes('confused')) {
    embeddings.confusion = 0.8;
  }
  if (answers.internalVoice && answers.internalVoice.toLowerCase().includes('unclear')) {
    embeddings.ambiguity = 0.6;
  }
  if (answers.whyBestWork === 'no') {
    embeddings.perfection_loop = 0.7;
  }
  if (answers.whyBestWork === 'maybe') {
    embeddings.fear = 0.5;
  }
  if (answers.internalVoice && answers.internalVoice.toLowerCase().includes('scared')) {
    embeddings.fear = 0.9;
  }
  if (answers.internalVoice && answers.internalVoice.toLowerCase().includes('overwhelm')) {
    embeddings.overwhelm = 0.8;
  }
  if (answers.internalVoice && answers.internalVoice.toLowerCase().includes('tired')) {
    embeddings.exhaustion = 0.7;
  }
  if (answers.eightyPercentThought && answers.eightyPercentThought.toLowerCase().includes('unclear')) {
    embeddings.ambiguity = 0.8;
  }
  if (answers.avoidanceDuration && parseInt(answers.avoidanceDuration) > 30) {
    embeddings.fear = 0.8;
  }
  if (answers.helpSeeking === 'no') {
    embeddings.perfection_loop = 0.6;
  }
  
  return embeddings;
}

/**
 * Generate follow-up questions using Gemini API based on initial diagnostic answers
 * 
 * @param {Partial<DiagnosticAnswers>} answers - Student's initial responses
 * @returns {Promise<AdaptiveQuestion[]>} Array of follow-up questions with options
 * 
 * @typedef {Object} AdaptiveQuestion
 * @property {string} id - Unique question identifier
 * @property {string} prompt - The question text
 * @property {QuestionOption[]} options - Available answer options
 * 
 * @typedef {Object} QuestionOption
 * @property {string} value - Option value/id
 * @property {string} label - Option display label
 */
export async function generateGeminiQuestions(answers) {
  try {
    const embeddings = computeWordEmbeddings(answers);
    
    // Get the top stuck type, with fallback if embeddings is empty
    const embeddingEntries = Object.entries(embeddings);
    const topStuckType = embeddingEntries.length > 0 
      ? embeddingEntries.reduce((a, b) => b[1] > a[1] ? b : a)[0]
      : "confusion";
    
    // Use Gemini API to generate follow-up questions
    const messages = [
      {
        role: 'system',
        content: `You are an educational psychologist helping diagnose academic paralysis. Based on student's initial responses indicating ${topStuckType} tendencies, generate 5 follow-up questions to better understand their situation. Each question should have 3-4 answer options. Return as JSON array with format: [{id: "q1", prompt: "question", options: [{value: "a", label: "Option A"}]}]`
      },
      {
        role: 'user',
        content: `Student responses: ${JSON.stringify(answers)}. Generate 5 follow-up questions.`
      }
    ];
    
    const response = await sendMessageToAPI(messages);
    
    // Clean up the response - remove markdown formatting if present
    let cleanResponse = response;
    if (response.includes('```json')) {
      cleanResponse = response.replace(/```json\n?/g, '').replace(/```$/g, '');
    }
    
    // Try to parse JSON, fallback to empty array if fails
    let generatedQuestions;
    try {
      generatedQuestions = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', response);
      console.error('Cleaned response:', cleanResponse);
      generatedQuestions = [];
    }
    
    // Validate the parsed data
    if (!Array.isArray(generatedQuestions)) {
      console.error('Response is not an array:', generatedQuestions);
      return [];
    }
    
    return generatedQuestions.map((q, index) => ({
      id: `gemini_${index + 1}`,
      prompt: q.prompt || `Follow-up question ${index + 1}`,
      options: Array.isArray(q.options)
        ? q.options
        : [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "maybe", label: "Sometimes" },
          ],
    }));
  } catch (error) {
    console.error('Error generating Gemini questions:', error);
    return [];
  }
}

/**
 * Generate intervention plans using Gemini API based on diagnosis results
 * 
 * @param {DiagnosisResult} diagnosis - The diagnosis result from the model
 * @returns {Promise<string[]>} Array of intervention strategy strings
 * 
 * @typedef {Object} DiagnosisResult
 * @property {string} primaryType - The primary stuck type identified
 * @property {number} confidence - Confidence score (0-1)
 * @property {string} summary - Brief summary of diagnosis
 * @property {Object} [rankedTypes] - Rankings of other stuck types
 */
export async function generateInterventionPlans(diagnosis) {
  try {
    const messages = [
      {
        role: 'system',
        content: `You are an educational psychologist specializing in academic paralysis. Based on the diagnosis of ${diagnosis.primaryType} with ${Math.round(diagnosis.confidence * 100)}% confidence, generate 5 specific, actionable intervention strategies. Each should be concise (1-2 sentences) and practical for students. Return as a JSON array of strings.`
      },
      {
        role: 'user',
        content: `Diagnosis results: ${JSON.stringify(diagnosis)}. Generate 5 intervention plans.`
      }
    ];
    
    const response = await sendMessageToAPI(messages);
    
    // Clean up the response - remove markdown formatting if present
    let cleanResponse = response;
    if (response.includes('```json')) {
      cleanResponse = response.replace(/```json\n?/g, '').replace(/```$/g, '');
    }
    
    const plans = JSON.parse(cleanResponse);
    return Array.isArray(plans) ? plans : [];
  } catch (error) {
    console.error('Error generating intervention plans:', error);
    return [];
  }
}
