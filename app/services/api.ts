/**
 * API Service Module
 * 
 * Handles communication with backend chat API endpoint (/api/chat).
 * Provides retry logic with exponential backoff for resilient API calls.
 * 
 * @module app/services/api
 */

const API_URL = "/api/chat";

/**
 * Chat message type for API communication
 * @typedef {Object} ChatMessage
 * @property {"user" | "assistant" | "system"} role - Message role/sender type
 * @property {string} content - Message text content
 */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Sends messages to the chat API with automatic retry logic.
 * Implements exponential backoff for transient failures (503 errors).
 * 
 * @async
 * @param {ChatMessage[]} messages - Array of messages to send to API
 * @returns {Promise<string>} The text response from the API
 * @throws {Error} If API request fails after max retries or returns invalid response
 * 
 * @example
 * const response = await sendMessageToAPI([
 *   { role: "user", content: "Generate follow-up questions" }
 * ]);
 */
export const sendMessageToAPI = async (
  messages: ChatMessage[],
): Promise<string> => {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second base delay
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Handle 503 Service Unavailable with retry logic
        if (response.status === 503 && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.warn(`Gemini API 503 error, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        console.error("Chat API Error Response:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, details: ${errorText}`,
        );
      }

      const data = (await response.json()) as { text?: string };
      if (!data.text) {
        throw new Error("No response from chat API");
      }
      return data.text;
    } catch (error) {
      console.error(`API Error (attempt ${attempt}/${maxRetries}):`, error);
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // For network errors or other issues, also retry with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`Network error, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw new Error("Max retries exceeded");
};
