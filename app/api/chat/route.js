import { NextResponse } from "next/server";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/**
 * @typedef {Object} ChatMessage
 * @property {"user" | "assistant" | "system"} role - Message role
 * @property {string} content - Message content
 */

/**
 * @typedef {Object} GeminiContent
 * @property {{text: string}[]} parts - Parts of the message
 * @property {"user" | "model"} [role] - Role in Gemini API
 */

/**
 * @typedef {Object} GeminiRequest
 * @property {GeminiContent[]} contents - Message contents
 * @property {{temperature: number, maxOutputTokens: number}} generationConfig - Generation config
 */

/**
 * @typedef {Object} GeminiResponse
 * @property {Array<{content?: {parts?: Array<{text?: string}>}}>} [candidates] - Response candidates
 */

/**
 * Type guard to validate chat message array
 * @param {unknown} value - Value to validate
 * @returns {value is ChatMessage[]} Whether value is a valid chat message array
 */
function isChatMessageArray(value) {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const msg = item;
    const validRole = msg.role === "user" || msg.role === "assistant" || msg.role === "system";
    return validRole && typeof msg.content === "string";
  });
}

/**
 * POST /api/chat
 * Proxies chat messages to Gemini API
 * 
 * Request body:
 * {
 *   messages: ChatMessage[]
 * }
 * 
 * Response:
 * {
 *   text: string - The response from Gemini
 * }
 * 
 * @param {Request} req - The request
 * @returns {Promise<NextResponse>} Response from Gemini API
 */
export async function POST(req) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 },
      );
    }

    let payload;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }

    if (!isChatMessageArray(payload.messages)) {
      return NextResponse.json(
        { error: "Field `messages` must be an array of chat messages." },
        { status: 400 },
      );
    }

    const messages = payload.messages;
    const systemMessage = messages.find((msg) => msg.role === "system")?.content;

    /** @type {GeminiContent[]} */
    const contents = messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({
        parts: [{ text: msg.content }],
        role: msg.role === "assistant" ? "model" : "user",
      }));

    if (systemMessage) {
      contents.unshift({
        parts: [{ text: systemMessage }],
        role: "user",
      });
    }

    /** @type {GeminiRequest} */
    const body = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 50000,
      },
    };

    const upstream = await fetch(
      `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!upstream.ok) {
      const details = await upstream.text();
      return NextResponse.json(
        {
          error: "Gemini API request failed",
          upstreamStatus: upstream.status,
          details,
        },
        { status: upstream.status },
      );
    }

    const data = await upstream.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: "No response from Gemini API" },
        { status: 502 },
      );
    }

    return NextResponse.json({ text }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Chat request failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
