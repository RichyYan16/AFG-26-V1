const API_URL = "/api/chat";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

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
