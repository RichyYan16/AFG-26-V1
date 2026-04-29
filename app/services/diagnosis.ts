import { sendMessageToAPI, type ChatMessage } from "@/app/services/api";
import type {
  AdaptiveQuestion,
  DiagnosticAnswers,
  DiagnoseResponse,
  DiagnosisResult,
  QuestionOption,
} from "@/model/new/types";
import { requestAssessment } from "../utils";
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
      prompt: 'When you sit down to work on this, what physical sensations do you notice in your body?',
      options: [
        { value: 'tense_shoulders', label: 'Tense shoulders and jaw' },
        { value: 'racing_heart', label: 'Racing heart or shallow breathing' },
        { value: 'heavy_chest', label: 'Heavy feeling in my chest' },
        { value: 'restless_energy', label: 'Restless energy, cant sit still' },
      ],
    },
    {
      id: 'fallback_2' as AdaptiveQuestion["id"],
      prompt: 'What time of day do you typically find yourself avoiding this work the most?',
      options: [
        { value: 'morning', label: 'First thing in the morning' },
        { value: 'afternoon', label: 'Mid-afternoon energy dip' },
        { value: 'evening', label: 'Late evening when tired' },
        { value: 'middle_night', label: 'Middle of the night when I cant sleep' },
      ],
    },
    {
      id: 'fallback_3' as AdaptiveQuestion["id"],
      prompt: 'If this assignment could magically complete itself, what would you do with the freed-up mental energy?',
      options: [
        { value: 'relax_guilt', label: 'Finally relax without guilt' },
        { value: 'other_work', label: 'Tackle other pending assignments' },
        { value: 'creative_hobby', label: 'Work on creative projects I enjoy' },
        { value: 'social_time', label: 'Spend time with friends and family' },
      ],
    },
    {
      id: 'fallback_4' as AdaptiveQuestion["id"],
      prompt: 'What story do you tell yourself about why you havent started yet?',
      options: [
        { value: 'not_ready', label: 'Im not ready/prepared enough' },
        { value: 'wrong_time', label: 'The timing isnt right' },
        { value: 'too_perfect', label: 'My standards are too high' },
        { value: 'dont_know_how', label: 'I genuinely dont know where to begin' },
      ],
    },
    {
      id: 'fallback_5' as AdaptiveQuestion["id"],
      prompt: 'When you think about this assignment being incomplete, what emotion dominates?',
      options: [
        { value: 'shame', label: 'Shame and embarrassment' },
        { value: 'anxiety', label: 'Anxiety about consequences' },
        { value: 'frustration', label: 'Frustration with myself' },
        { value: 'numbness', label: 'Numbness or disconnection' },
      ],
    },
  ];
}

// Generate intervention plans using Gemini API
export async function generateInterventionPlans(assessment: DiagnosisResult): Promise<Array<{action: string; resources?: string[]}>> {
  // Check cache first
  const cachedPlans = getCachedInterventionPlans(assessment.primaryType);
  if (cachedPlans) {
    console.log('Using cached intervention plans for', assessment.primaryType);
    return cachedPlans.map(plan => ({ action: plan, resources: [] }));
  }

  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an educational psychologist specializing in academic paralysis. Based on the assessment of ${assessment.primaryType} with ${Math.round(assessment.confidence * 100)}% confidence, generate 5 specific, actionable intervention strategies. Each should include an action and 3-4 helpful resources. Return as JSON array with objects containing "action" and "resources" fields.`
      },
      {
        role: 'user',
        content: `Assessment results: ${JSON.stringify(assessment)}. Generate 5 intervention plans with actions and resources.`
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
    
    // Cache the generated plans (only actions for caching)
    const actionsOnly = parsedPlans.map((plan: any) => plan.action || plan);
    cacheInterventionPlans(assessment.primaryType, actionsOnly);
    
    return parsedPlans;
  } catch (error) {
    console.error('Error generating intervention plans:', error);
    
    // Return fallback intervention plans if Gemini fails
    return getFallbackInterventionPlans(assessment.primaryType);
  }
}

// Fallback intervention plans when Gemini API fails
function getFallbackInterventionPlans(stuckType: string): Array<{action: string; resources?: string[]}> {
  const fallbackPlans: Record<string, Array<{action: string; resources?: string[]}>> = {
    confusion: [
      {
        action: "Re-read the instructions with a specific question in mind",
        resources: ["Khan Academy", "YouTube tutorials", "Office hours", "Study groups"]
      },
      {
        action: "Break down the problem into smaller, manageable parts",
        resources: ["Trello/Notion for task breakdown", "Mind mapping tools", "Checklist templates"]
      },
      {
        action: "Try explaining the concept to someone else (or a rubber duck)",
        resources: ["Study partners", "Online forums", "Teaching assistants"]
      },
      {
        action: "Look for examples or similar problems to understand the pattern",
        resources: ["Solution manuals", "Past assignments", "Online problem banks"]
      },
      {
        action: "Take a 10-minute break and return with fresh eyes",
        resources: ["Pomodoro timers", "Meditation apps", "Stretching routines"]
      }
    ],
    ambiguity: [
      {
        action: "Ask for clarification from your instructor or TA",
        resources: ["Email templates", "Office hours scheduler", "Discussion forums"]
      },
      {
        action: "Write down 2-3 specific questions about what's unclear",
        resources: ["Question templates", "Note-taking apps", "Voice recorder apps"]
      },
      {
        action: "Compare your understanding with classmates or study group",
        resources: ["Study group finder", "Discord study servers", "Library study rooms"]
      },
      {
        action: "Look for additional resources or alternative explanations",
        resources: ["Alternative textbooks", "Online courses", "Subject-specific websites"]
      },
      {
        action: "Make a reasonable assumption and note it for later verification",
        resources: ["Assumption tracking templates", "Version control systems"]
      }
    ],
    fear: [
      {
        action: "Start with the smallest possible step to build momentum",
        resources: ["Two-minute rule app", "Task starters", "Motivation trackers"]
      },
      {
        action: "Write down the actual worst-case scenario (it's usually not that bad)",
        resources: ["Fear-setting worksheets", "Cognitive behavioral therapy apps", "Journaling apps"]
      },
      {
        action: "Set a timer for just 10 minutes to begin working",
        resources: ["Timer apps", "Focus music", "Distraction blockers"]
      },
      {
        action: "Talk through your fears with someone you trust",
        resources: ["Campus counseling", "Peer support groups", "Mentorship programs"]
      },
      {
        action: "Focus on progress, not perfection",
        resources: ["Progress tracking apps", "Habit trackers", "Accountability partners"]
      }
    ],
    overwhelm: [
      {
        action: "List all tasks and pick just ONE to complete right now",
        resources: ["Task prioritization matrices", "To-do list apps", " Eisenhower Matrix template"]
      },
      {
        action: "Use the Pomodoro technique: 25 minutes work, 5 minutes break",
        resources: ["Pomodoro apps", "Focus timers", "Break reminder apps"]
      },
      {
        action: "Break the assignment into 15-minute chunks",
        resources: ["Time blocking calendars", "Chunking templates", "Micro-task planners"]
      },
      {
        action: "Eliminate distractions and focus on one thing at a time",
        resources: ["Website blockers", "Focus mode apps", "Noise-cancelling headphones"]
      },
      {
        action: "Ask yourself: What's the minimum viable version of this?",
        resources: ["MVP templates", "Scope reduction guides", "Minimum viable product examples"]
      }
    ],
    exhaustion: [
      {
        action: "Take a genuine 20-minute break away from screens",
        resources: ["Screen time trackers", "Blue light filters", "Digital detox apps"]
      },
      {
        action: "Do some light physical activity (walk, stretch)",
        resources: ["Exercise apps", "Yoga videos", "Desk stretch routines"]
      },
      {
        action: "Hydrate and have a healthy snack",
        resources: ["Water reminder apps", "Healthy snack recipes", "Nutrition tracking"]
      },
      {
        action: "Work on a simpler, different task for variety",
        resources: ["Task switching guides", "Energy management tools", "Alternative task lists"]
      },
      {
        action: "Set an earlier bedtime to recover properly",
        resources: ["Sleep tracking apps", "Bedtime reminders", "Sleep hygiene guides"]
      }
    ],
    perfection_loop: [
      {
        action: "Submit your current work as a 'rough draft'",
        resources: ["Draft submission templates", "Version control systems", "Feedback request forms"]
      },
      {
        action: "Set a time limit and stop when the timer goes off",
        resources: ["Timer apps", "Time boxing tools", "Deadline calculators"]
      },
      {
        action: "Focus on 'good enough' rather than perfect",
        resources: ["Good enough checklists", "Quality vs completeness guides", "Perfectionism workbooks"]
      },
      {
        action: "Get feedback from others instead of self-critiquing",
        resources: ["Peer review platforms", "Feedback request templates", "Office hours booking"]
      },
      {
        action: "Remember: done is better than perfect",
        resources: ["Done is better than perfect quotes", "Completion celebration apps", "Progress rewards"]
      }
    ]
  };
  
  return fallbackPlans[stuckType] || fallbackPlans.confusion;
}
