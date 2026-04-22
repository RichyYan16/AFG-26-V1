import { sendMessageToAPI, type ChatMessage } from "@/app/services/api";
import type {
  AdaptiveQuestion,
  DiagnosticAnswers,
  DiagnoseResponse,
  DiagnosisResult,
  QuestionOption,
} from "@/model/new/types";
import { requestDiagnosis } from "../utils";

// Custom Word Embedding Algorithm
export function computeWordEmbeddings(answers: Partial<DiagnosticAnswers>): Record<string, number> {
  const embeddings: Record<string, number> = {};
  
  // Simple word embedding based on response patterns
  // Using actual DiagnosticAnswers properties
  if (answers.internalVoice && answers.internalVoice.toLowerCase().includes('confused')) embeddings.confusion = 0.8;
  if (answers.internalVoice && answers.internalVoice.toLowerCase().includes('unclear')) embeddings.ambiguity = 0.6;
  if (answers.whyBestWork === 'no') embeddings.perfection_loop = 0.7;
  if (answers.whyBestWork === 'maybe') embeddings.fear = 0.5;
  if (answers.internalVoice && answers.internalVoice.toLowerCase().includes('scared')) embeddings.fear = 0.9;
  if (answers.internalVoice && answers.internalVoice.toLowerCase().includes('overwhelm')) embeddings.overwhelm = 0.8;
  if (answers.internalVoice && answers.internalVoice.toLowerCase().includes('tired')) embeddings.exhaustion = 0.7;
  if (answers.eightyPercentThought && answers.eightyPercentThought.toLowerCase().includes('unclear')) embeddings.ambiguity = 0.8;
  if (answers.avoidanceDuration && parseInt(answers.avoidanceDuration) > 30) embeddings.fear = 0.8;
  if (answers.helpSeeking === 'no') embeddings.perfection_loop = 0.6;
  
  return embeddings;
}

// Generate Gemini questions based on initial responses
export async function generateGeminiQuestions(answers: Partial<DiagnosticAnswers>): Promise<AdaptiveQuestion[]> {
  try {
    const embeddings = computeWordEmbeddings(answers);
    
    // Get the top stuck type, with fallback if embeddings is empty
    const embeddingEntries = Object.entries(embeddings);
    const topStuckType = embeddingEntries.length > 0 
      ? embeddingEntries.reduce((a, b) => b[1] > a[1] ? b : a)[0]
      : "confusion";
    
    // Use Gemini API to generate follow-up questions
    const messages: ChatMessage[] = [
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
    
    type ParsedGeminiQuestion = {
      prompt?: string;
      options?: QuestionOption[];
    };

    return (generatedQuestions as ParsedGeminiQuestion[]).map((q, index) => ({
      id: `gemini_${index + 1}` as unknown as AdaptiveQuestion["id"],
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

// Generate intervention plans using Gemini API
export async function generateInterventionPlans(diagnosis: DiagnosisResult): Promise<string[]> {
  try {
    const messages: ChatMessage[] = [
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
