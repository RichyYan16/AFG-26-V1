import { sendMessageToAPI, type ChatMessage } from "@/app/services/api";
import type {
  AdaptiveQuestion,
  DiagnosticAnswers,
  DiagnoseResponse,
  DiagnosisResult,
  QuestionOption,
} from "@/model/new/types";
import { requestAssessment } from "../utils";
import { STUCK_TYPE_DESCRIPTIONS } from "../constants";

// Helper function to clean and parse JSON responses from AI models
function cleanAndParseJSON(response: string): any {
  try {
    // First try direct parsing
    const result = JSON.parse(response);
    return result;
  } catch (error) {
    // Try to extract JSON from the response (handle markdown code blocks)
    let jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[1]);
        return result;
      } catch (innerError) {
        // Continue to next method
      }
    }
    
    // Try to find JSON array or object without markdown
    jsonMatch = response.match(/\[[\s\S]*\]/) || response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        return result;
      } catch (innerError) {
        // Continue to next method
      }
    }
    
    // Try to fix common JSON issues
    let cleaned = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
      .replace(/\\n/g, "\\n") // Fix newlines
      .replace(/\\"/g, '\\"') // Fix escaped quotes
      .trim();
    
    console.log("🧹 Attempting to parse cleaned response:", cleaned.substring(0, 200) + "...");
    
    // Try to find JSON array or object in cleaned text
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    
    if (arrayMatch) {
      try {
        const result = JSON.parse(arrayMatch[0]);
        console.log("✅ Successfully parsed cleaned array JSON");
        return result;
      } catch (e) {
        console.warn("⚠️ Failed to parse cleaned array JSON:", e);
      }
    }
    
    if (objectMatch) {
      try {
        const result = JSON.parse(objectMatch[0]);
        console.log("✅ Successfully parsed cleaned object JSON");
        return result;
      } catch (e) {
        console.warn("⚠️ Failed to parse cleaned object JSON:", e);
      }
    }
    
    console.error("❌ All JSON parsing attempts failed");
    throw new Error(`Could not parse JSON from response: ${response.substring(0, 200)}...`);
  }
}

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

// Generate follow-up questions based on initial responses
export async function generateFollowUpQuestions(answers: Partial<DiagnosticAnswers>): Promise<AdaptiveQuestion[]> {
  console.log("🔄 generateFollowUpQuestions called with:", answers);
  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are an expert academic coach helping students identify why they're stuck on assignments. 
Based on the student's responses, generate 5 targeted follow-up questions to better understand their specific stuck pattern.
Each question should help distinguish between different types of academic paralysis: confusion, ambiguity, fear, overwhelm, exhaustion, or perfection_loop.

CRITICAL: You must respond with ONLY a valid JSON array. No additional text, no explanations, no markdown formatting, no code blocks. Just the raw JSON.

Your response must be exactly in this format:
[
  {
    "id": "follow_up_1",
    "prompt": "Your question text here",
    "options": [
      {"value": "option1", "label": "First option"},
      {"value": "option2", "label": "Second option"},
      {"value": "option3", "label": "Third option"},
      {"value": "option4", "label": "Fourth option"}
    ]
  }
]

Make questions specific, insightful, and designed to reveal the underlying stuck pattern. Remember: respond with ONLY the JSON array, nothing else.`
      },
      {
        role: "user",
        content: `Student responses:
Internal Voice: "${answers.internalVoice || 'Not provided'}"
80% Thought: "${answers.eightyPercentThought || 'Not provided'}"
Why Best Work: "${answers.whyBestWork || 'Not provided'}"
Avoidance Duration: "${answers.avoidanceDuration || 'Not provided'} minutes"
Help Seeking: "${answers.helpSeeking || 'Not provided'}"

Please generate 5 follow-up questions to better understand this student's stuck pattern.`
      }
    ];

    const response = await sendMessageToAPI(messages);
    console.log("📥 API response received:", response);
    
    // Try to parse the JSON response with cleaning
    try {
      const parsedResponse = cleanAndParseJSON(response);
      console.log("✅ Successfully parsed API response:", parsedResponse);
      if (Array.isArray(parsedResponse) && parsedResponse.length > 0) {
        const result = parsedResponse.map((q, index) => ({
          id: q.id || `follow_up_${index + 1}` as AdaptiveQuestion["id"],
          prompt: q.prompt || q.question || `Follow-up question ${index + 1}`,
          options: Array.isArray(q.options) ? q.options : [
            { value: 'option1', label: 'Option 1' },
            { value: 'option2', label: 'Option 2' },
            { value: 'option3', label: 'Option 3' },
            { value: 'option4', label: 'Option 4' }
          ]
        }));
        console.log("🎯 Returning API-generated questions:", result);
        return result;
      }
    } catch (parseError) {
      console.warn("❌ Failed to parse API response as JSON, using fallback:", parseError);
    }
    
    // If we get here, parsing failed, so use fallback
    console.log("🔄 Using fallback questions");
    return getFallbackQuestions();
    
  } catch (error) {
    console.error("💥 API call failed for generateFollowUpQuestions, using fallback:", error);
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

// Generate AI-powered summary for diagnosis results
export async function generateAISummary(assessment: DiagnosisResult): Promise<string> {
  console.log("🔄 generateAISummary called with:", assessment.primaryType);
  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are an expert academic coach specializing in helping students overcome academic paralysis.
Based on the student's assessment results, generate a brief, empathetic summary (2-3 sentences) that explains their primary stuck pattern and offers hope.

CRITICAL: You must respond with ONLY the summary text. No additional text, no explanations, no markdown formatting, no code blocks, no JSON. Just the raw summary text.

Your summary should be:
- Empathetic and validating
- Brief (2-3 sentences maximum)
- Focused on the primary stuck type
- End with a hopeful note about improvement possibilities

Example format: "You're experiencing [stuck type], which means [brief explanation]. The good news is that [hopeful statement about improvement]."`
      },
      {
        role: "user",
        content: `Student Assessment Results:
Primary Stuck Type: ${assessment.primaryType}
Confidence: ${Math.round(assessment.confidence * 100)}%
Summary: ${assessment.summary}

Ranked Types:
${assessment.rankedTypes.map((type, index) => `${index + 1}. ${type.type} (score: ${type.score}): ${type.reasons.slice(0, 2).join(', ')}`).join('\n')}

Please generate a brief, empathetic summary for this student.`
      }
    ];

    const response = await sendMessageToAPI(messages);
    console.log("📥 Summary API response received:", response);
    
    // Clean the response to remove any potential formatting
    const cleanedSummary = response
      .replace(/```/g, "")
      .replace(/"/g, "")
      .trim();
    
    console.log("✅ Successfully generated AI summary:", cleanedSummary);
    return cleanedSummary;
    
  } catch (error) {
    console.error("💥 API call failed for generateAISummary, using fallback:", error);
    // Return fallback summary
    return `You're experiencing ${assessment.primaryType}, which means ${STUCK_TYPE_DESCRIPTIONS[assessment.primaryType]}. The good news is that with the right strategies, you can overcome this pattern and make progress on your academic work.`;
  }
}

// Generate intervention plans using API with fallback logic
export async function generateInterventionPlans(assessment: DiagnosisResult): Promise<Array<{action: string; resources?: string[]}>> {
  console.log("🔄 generateInterventionPlans called with:", assessment.primaryType);
  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are an expert academic coach specializing in helping students overcome academic paralysis.
Based on the student's assessment, generate 5 specific, actionable intervention strategies tailored to their stuck type.
Each strategy should be practical, evidence-based, and include relevant resources.

CRITICAL: You must respond with ONLY a valid JSON array. No additional text, no explanations, no markdown formatting, no code blocks. Just the raw JSON.

Your response must be exactly in this format:
[
  {
    "action": "Specific actionable step the student should take",
    "resources": ["Resource 1", "Resource 2", "Resource 3", "Resource 4"]
  }
]

Make interventions specific to the stuck type: confusion, ambiguity, fear, overwhelm, exhaustion, or perfection_loop.
Focus on practical, immediate actions students can take. Remember: respond with ONLY the JSON array, nothing else.`
      },
      {
        role: "user",
        content: `Student Assessment:
Primary Stuck Type: ${assessment.primaryType}
Confidence: ${assessment.confidence}
Summary: ${assessment.summary}

Ranked Types:
${assessment.rankedTypes.map((type, index) => `${index + 1}. ${type.type} (score: ${type.score}): ${type.reasons.join(', ')}`).join('\n')}

Please generate 5 specific intervention strategies for this student's ${assessment.primaryType} pattern.`
      }
    ];

    const response = await sendMessageToAPI(messages);
    console.log("📥 Intervention API response received:", response);
    
    // Try to parse the JSON response with cleaning
    try {
      const parsedResponse = cleanAndParseJSON(response);
      console.log("✅ Successfully parsed intervention API response:", parsedResponse);
      if (Array.isArray(parsedResponse) && parsedResponse.length > 0) {
        const result = parsedResponse.map((intervention) => ({
          action: intervention.action || intervention.strategy || "Default intervention action",
          resources: Array.isArray(intervention.resources) ? intervention.resources : []
        }));
        console.log("🎯 Returning API-generated interventions:", result);
        return result;
      }
    } catch (parseError) {
      console.warn("❌ Failed to parse intervention API response as JSON, using fallback:", parseError);
    }
    
    // If we get here, parsing failed, so use fallback
    console.log("🔄 Using fallback interventions");
    return getFallbackInterventionPlans(assessment.primaryType);
    
  } catch (error) {
    console.error("💥 API call failed for generateInterventionPlans, using fallback:", error);
    return getFallbackInterventionPlans(assessment.primaryType);
  }
}

// Fallback intervention plans
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
