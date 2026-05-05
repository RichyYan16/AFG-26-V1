import { NextResponse } from "next/server";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}


interface GroqContent {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface OpenRouterContent {
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
    // Check for OpenRouter API key
    const openRouterKey = process.env.OPEN_ROUTER;
    
    if (!openRouterKey) {
      return NextResponse.json(
        { error: "OPEN_ROUTER API key not configured" },
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

    // Use OpenRouter API
    try {
      const response = await callOpenRouter(messages, openRouterKey);
      return response;
    } catch (error) {
      console.error("OpenRouter API failed:", error);
      return NextResponse.json(
        { 
          error: "OpenRouter API failed",
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 503 },
      );
    }
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

async function callOpenRouterWithModel(messages: ChatMessage[], apiKey: string, model: string): Promise<Response> {
  return fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://localhost:3000",
      "X-Title": "Academic Paralysis Assessment",
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 50000,
    }),
  });
}

async function callOpenRouter(messages: ChatMessage[], apiKey: string): Promise<NextResponse> {
  // List of models to try in order of preference
  const models = [
    "meta-llama/llama-3.2-3b-instruct:free",
    "microsoft/phi-3-medium-128k-instruct:free",
    "qwen/qwen-2.5-7b-instruct:free", 
    "deepseek/deepseek-chat:free",
    "google/gemma-2-9b-it:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "huggingfaceh4/zephyr-7b-beta:free",
    "openai/gpt-4o-mini",
    "anthropic/claude-3-haiku"
  ];

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      console.log(`Trying model: ${model}`);
      const response = await callOpenRouterWithModel(messages, apiKey, model);

      if (response.ok) {
        console.log(`Successfully using model: ${model}`);
        const data = (await response.json()) as OpenRouterContent;
        const text = data.choices?.[0]?.message?.content;

        if (!text) {
          throw new Error("No response from OpenRouter API");
        }

        return NextResponse.json({ text }, { status: 200 });
      } else {
        const details = await response.text();
        lastError = new Error(`Model ${model} failed: ${response.status} - ${details}`);
        console.warn(`Model ${model} failed:`, details);
        continue; // Try next model
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Model ${model} error:`, lastError.message);
      continue; // Try next model
    }
  }

  // All models failed
  throw lastError || new Error("All models failed");
}

