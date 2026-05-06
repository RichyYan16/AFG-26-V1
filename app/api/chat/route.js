import { NextResponse } from "next/server";

const OPENROUTER_API_URL = "https://openrouter.io/api/v1/chat/completions";

/**
 * @typedef {Object} ChatMessage
 * @property {"user" | "assistant" | "system"} role - Message role
 * @property {string} content - Message content
 */

/**
 * @typedef {Object} OpenRouterMessage
 * @property {"user" | "assistant" | "system"} role - Message role
 * @property {string} content - Message content
 */

/**
 * @typedef {Object} OpenRouterRequest
 * @property {string} model - Model name
 * @property {OpenRouterMessage[]} messages - Message array
 * @property {{temperature: number, max_tokens: number}} - Generation config
 */

/**
 * @typedef {Object} OpenRouterResponse
 * @property {Array<{message?: {content?: string}}>} [choices] - Response choices
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
 * Proxies chat messages to OpenRouter API
 * 
 * Request body:
 * {
 *   messages: ChatMessage[]
 * }
 * 
 * Response:
 * {
 *   text: string - The response from OpenRouter
 * }
 * 
 * @param {Request} req - The request
 * @returns {Promise<NextResponse>} Response from OpenRouter API
 */
export async function POST(req) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured" },
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

    /** @type {OpenRouterMessage[]} */
    const messages = payload.messages;

    /** @type {OpenRouterRequest} */
    const body = {
      model: "openrouter/auto",
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
    };

    console.log("OpenRouter request details:", {
      url: OPENROUTER_API_URL,
      method: "POST",
      hasApiKey: !!process.env.OPENROUTER_API_KEY,
      apiKeyPrefix: process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.substring(0, 10) : "none",
      model: body.model,
      messagesCount: messages.length,
    });

    const upstream = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://afgstudents.org",
        "X-Title": "AFG - Academic Focus Guardian",
      },
      body: JSON.stringify(body),
    });

    console.log("OpenRouter response status:", upstream.status);

    if (!upstream.ok) {
      const details = await upstream.text();
      console.error("OpenRouter API error:", {
        status: upstream.status,
        statusText: upstream.statusText,
        details: details,
        apiUrl: OPENROUTER_API_URL,
        requestBody: JSON.stringify(body).substring(0, 200),
      });
      return NextResponse.json(
        {
          error: "OpenRouter API request failed",
          upstreamStatus: upstream.status,
          details,
        },
        { status: upstream.status },
      );
    }

    const data = await upstream.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      console.error("No response text in OpenRouter response:", data);
      return NextResponse.json(
        { error: "No response from OpenRouter API" },
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
