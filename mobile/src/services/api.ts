import Constants from 'expo-constants';

const API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Simple cache for API responses
const responseCache = new Map<string, string>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GeminiContent {
  parts: {
    text: string;
  }[];
  role?: string;
}

export interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
  };
}

export interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

export const sendMessageToAPI = async (messages: ChatMessage[]): Promise<string> => {
  try {
    // Create cache key from last few messages
    const cacheKey = messages.slice(-3).map(msg => `${msg.role}:${msg.content}`).join('|');
    const cached = responseCache.get(cacheKey);
    
    if (cached) {
      console.log('Using cached response');
      return cached;
    }

    // Extract system message separately
    const systemMessage = messages.find(msg => msg.role === 'system')?.content;
    
    // Convert messages to Gemini format
    const geminiContents: GeminiContent[] = messages
      .filter(msg => msg.role !== 'system') // Remove system messages
      .map(msg => ({
        parts: [{ text: msg.content }],
        role: msg.role === 'assistant' ? 'model' : 'user'
      }));

    // If there's a system message, add it as the first user message
    if (systemMessage) {
      geminiContents.unshift({
        parts: [{ text: systemMessage }],
        role: 'user'
      });
    }

    const requestBody: GeminiRequest = {
      contents: geminiContents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    };

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
      const responseText = data.candidates[0].content.parts[0].text;
      
      // Cache the response
      responseCache.set(cacheKey, responseText);
      
      // Clear cache after duration
      setTimeout(() => {
        responseCache.delete(cacheKey);
      }, CACHE_DURATION);
      
      return responseText;
    } else {
      throw new Error('No response from Gemini API');
    }
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
