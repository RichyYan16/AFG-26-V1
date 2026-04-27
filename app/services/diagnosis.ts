import { sendMessageToAPI, type ChatMessage } from "@/app/services/api";
import type {
  AdaptiveQuestion,
  DiagnosticAnswers,
  DiagnoseResponse,
  DiagnosisResult,
  QuestionOption,
} from "@/model/new/types";
import { requestDiagnosis } from "../utils";
import {
  getCachedGeminiQuestions,
  cacheGeminiQuestions,
  getCachedInterventionPlans,
  cacheInterventionPlans,
  initializeCache,
} from "../utils/cache";

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
  // Check cache first
  const cachedQuestions = getCachedGeminiQuestions(answers);
  if (cachedQuestions) {
    console.log('Using cached Gemini questions');
    return cachedQuestions;
  }

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

    const questions = (generatedQuestions as ParsedGeminiQuestion[]).map((q, index) => ({
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

    // Cache the generated questions
    cacheGeminiQuestions(answers, questions);
    
    return questions;
  } catch (error) {
    console.error('Error generating Gemini questions:', error);
    
    // Return fallback questions if Gemini fails
    return getFallbackQuestions();
  }
}

// Fallback questions when Gemini API fails
function getFallbackQuestions(): AdaptiveQuestion[] {
  return [
    {
      id: 'fallback_1' as AdaptiveQuestion["id"],
      prompt: 'How long have you been feeling stuck with this work?',
      options: [
        { value: 'few_hours', label: 'A few hours' },
        { value: 'day', label: 'About a day' },
        { value: 'few_days', label: 'Several days' },
        { value: 'week', label: 'A week or more' },
      ],
    },
    {
      id: 'fallback_2' as AdaptiveQuestion["id"],
      prompt: 'What specifically feels most challenging right now?',
      options: [
        { value: 'starting', label: 'Getting started' },
        { value: 'continuing', label: 'Staying focused' },
        { value: 'finishing', label: 'Completing it' },
        { value: 'quality', label: 'Making it good enough' },
      ],
    },
    {
      id: 'fallback_3' as AdaptiveQuestion["id"],
      prompt: 'Have you tried asking for help with this?',
      options: [
        { value: 'no', label: 'No, I havent tried' },
        { value: 'thinking', label: 'I thought about it' },
        { value: 'asked', label: 'I asked but didnt get help' },
        { value: 'helpful', label: 'Yes, I got some help' },
      ],
    },
  ];
}

// Generate intervention plans using Gemini API
export async function generateInterventionPlans(diagnosis: DiagnosisResult): Promise<string[]> {
  // Check cache first
  const cachedPlans = getCachedInterventionPlans(diagnosis.primaryType);
  if (cachedPlans) {
    console.log('Using cached intervention plans for', diagnosis.primaryType);
    return cachedPlans;
  }

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
    const parsedPlans = Array.isArray(plans) ? plans : [];
    
    // Cache the generated plans
    cacheInterventionPlans(diagnosis.primaryType, parsedPlans);
    
    return parsedPlans;
  } catch (error) {
    console.error('Error generating intervention plans:', error);
    
    // Return fallback intervention plans if Gemini fails
    return getFallbackInterventionPlans(diagnosis.primaryType);
  }
}

// Fallback intervention plans when Gemini API fails
function getFallbackInterventionPlans(stuckType: string): string[] {
  const fallbackPlans: Record<string, string[]> = {
    confusion: [
      "Re-read the instructions with a specific question in mind",
      "Break down the problem into smaller, manageable parts",
      "Try explaining the concept to someone else (or a rubber duck)",
      "Look for examples or similar problems to understand the pattern",
      "Take a 10-minute break and return with fresh eyes"
    ],
    ambiguity: [
      "Ask for clarification from your instructor or TA",
      "Write down 2-3 specific questions about what's unclear",
      "Compare your understanding with classmates or study group",
      "Look for additional resources or alternative explanations",
      "Make a reasonable assumption and note it for later verification"
    ],
    fear: [
      "Start with the smallest possible step to build momentum",
      "Write down the actual worst-case scenario (it's usually not that bad)",
      "Set a timer for just 10 minutes to begin working",
      "Talk through your fears with someone you trust",
      "Focus on progress, not perfection"
    ],
    overwhelm: [
      "List all tasks and pick just ONE to complete right now",
      "Use the Pomodoro technique: 25 minutes work, 5 minutes break",
      "Break the assignment into 15-minute chunks",
      "Eliminate distractions and focus on one thing at a time",
      "Ask yourself: What's the minimum viable version of this?"
    ],
    exhaustion: [
      "Take a genuine 20-minute break away from screens",
      "Do some light physical activity (walk, stretch)",
      "Hydrate and have a healthy snack",
      "Work on a simpler, different task for variety",
      "Set an earlier bedtime to recover properly"
    ],
    perfection_loop: [
      "Submit your current work as a 'rough draft'",
      "Set a time limit and stop when the timer goes off",
      "Focus on 'good enough' rather than perfect",
      "Get feedback from others instead of self-critiquing",
      "Remember: done is better than perfect"
    ]
  };
  
  return fallbackPlans[stuckType] || fallbackPlans.confusion;
}
