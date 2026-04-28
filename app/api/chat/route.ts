import { NextResponse } from "next/server";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface GeminiContent {
  parts: Array<{ text: string }>;
  role?: "user" | "model";
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

interface GroqContent {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

function isChatMessageArray(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const msg = item as Record<string, unknown>;
    const validRole =
      msg.role === "user" || msg.role === "assistant" || msg.role === "system";
    return validRole && typeof msg.content === "string";
  });
}

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 },
      );
    }

    let payload: { messages?: unknown };
    try {
      payload = (await req.json()) as { messages?: unknown };
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

    const contents: GeminiContent[] = messages
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

    const body: GeminiRequest = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 50000,
      },
    };

    // Add retry logic for 503 errors at the API route level
    const maxRetries = 3;
    const baseDelay = 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
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
          
          // Handle 503 Service Unavailable with retry logic
          if (upstream.status === 503 && attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
            console.warn(`Gemini API 503 error, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          return NextResponse.json(
            {
              error: "Gemini API request failed",
              upstreamStatus: upstream.status,
              details,
            },
            { status: upstream.status },
          );
        }

        const data = (await upstream.json()) as GeminiResponse;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
          return NextResponse.json(
            { error: "No response from Gemini API" },
            { status: 502 },
          );
        }

        return NextResponse.json({ text }, { status: 200 });
      } catch (error) {
        console.error(`Gemini API error (attempt ${attempt}/${maxRetries}):`, error);
        
        // If this is the last attempt, return error response
        if (attempt === maxRetries) {
          return NextResponse.json(
            {
              error: "Gemini API request failed after retries",
              message: error instanceof Error ? error.message : String(error),
            },
            { status: 503 },
          );
        }
        
        // For network errors or other issues, also retry with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`Network error, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should never be reached, but TypeScript needs it
    return NextResponse.json(
      { error: "Max retries exceeded" },
      { status: 503 },
    );
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
