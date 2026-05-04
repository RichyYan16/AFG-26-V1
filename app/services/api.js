/**
 * API service for chat and Gemini integration
 * @typedef {Object} ChatMessage
 * @property {("user"|"assistant"|"system")} role
 * @property {string} content
 */

const API_URL = "/api/chat";

/**
 * Send messages to the chat API
 * @param {ChatMessage[]} messages
 * @returns {Promise<string>}
 */
export const sendMessageToAPI = async (messages) => {
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
        `HTTP error! status: ${response.status}, details: ${errorText}`
      );
    }

    const data = await response.json();
    if (!data.text) {
      throw new Error("No response from chat API");
    }
    return data.text;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};
