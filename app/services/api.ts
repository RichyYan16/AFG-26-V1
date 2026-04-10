const API_URL = "/api/chat";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export const sendMessageToAPI = async (
  messages: ChatMessage[],
): Promise<string> => {
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
    console.error("API Error:", error);
    throw error;
  }
};
