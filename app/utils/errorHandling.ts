/**
 * Error handling utilities for Gemini API 503 errors and other common issues
 */

export interface ErrorHandlingOptions {
  onRetry?: () => void;
  maxRetries?: number;
  customMessage?: string;
}

/**
 * Extract user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown, options?: ErrorHandlingOptions): string {
  // Handle 503 Service Unavailable errors specifically
  if (error instanceof Error) {
    if (error.message.includes('503')) {
      return options?.customMessage || "The AI service is temporarily unavailable. Please try again in a moment.";
    }
    
    // Handle network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return "Network connection issue. Please check your internet connection and try again.";
    }
    
    // Handle timeout errors
    if (error.message.includes('timeout')) {
      return "The request timed out. Please try again.";
    }
    
    // Handle rate limiting
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return "Too many requests. Please wait a moment and try again.";
    }
    
    // Handle API key issues
    if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('403')) {
      return "Service configuration error. Please contact support if this persists.";
    }
    
    // Return the original error message if it's user-friendly
    if (error.message.length < 100 && !error.message.includes('Stack') && !error.message.includes('trace')) {
      return error.message;
    }
  }
  
  // Default fallback message
  return options?.customMessage || "Something went wrong. Please try again.";
}

/**
 * Check if an error is retryable (503, network errors, timeouts)
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('503') ||
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT')
    );
  }
  return false;
}

/**
 * Enhanced error handler with retry logic
 */
export async function handleAsyncError<T>(
  asyncFn: () => Promise<T>,
  options: ErrorHandlingOptions & {
    onError?: (error: unknown) => void;
    onSuccess?: (result: T) => void;
  } = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = 1000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await asyncFn();
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return { success: true, data: result };
    } catch (error) {
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error);
      
      if (options.onError) {
        options.onError(error);
      }
      
      // Check if we should retry
      if (attempt < maxRetries && isRetryableError(error)) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.warn(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Return error on final attempt or non-retryable error
      return { 
        success: false, 
        error: getErrorMessage(error, options) 
      };
    }
  }
  
  // This should never be reached
  return { 
    success: false, 
    error: "Max retries exceeded" 
  };
}

/**
 * Create a user-friendly error message for specific operations
 */
export const ERROR_MESSAGES = {
  assessment: {
    start: "Could not start assessment. Please try again.",
    process: "Could not process your response. Please try again.",
    generate: "Could not generate follow-up questions. Please try again.",
  },
  intervention: {
    generate: "Failed to generate intervention plans. Please try again.",
  },
  session: {
    save: "Failed to save session. Please try again.",
    load: "Failed to load session. Please try again.",
  },
  network: {
    offline: "You appear to be offline. Please check your internet connection.",
    slow: "Slow connection detected. This may take longer than usual.",
  },
  gemini: {
    unavailable: "The AI service is temporarily unavailable. Using fallback responses.",
    rate_limit: "The AI service is busy. Please wait a moment and try again.",
  }
} as const;
