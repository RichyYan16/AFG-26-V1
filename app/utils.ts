import type {
  DiagnosticAnswers,
  SessionRecord,
  DiagnoseResponse,
} from "@/model/new/types";
import { STORAGE_KEY } from "./constants";

/**
 * File containing utility functions for the application, including data validation, local storage management, and API request handling.
 * @param answers 
 * @returns answers if all required fields are present, otherwise null
 */

export function asCompleteAnswers(
  answers: Partial<DiagnosticAnswers>,
): DiagnosticAnswers | null {
  if (
    answers.internalVoice &&
    answers.eightyPercentThought &&
    answers.whyBestWork &&
    answers.avoidanceDuration &&
    answers.helpSeeking
  ) {
    return answers as DiagnosticAnswers;
  }

  return null;
}

export async function loadUserHistory(userId?: string): Promise<SessionRecord[]> {
  try {
    // Load from local storage instead of Firebase
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading user history:", error);
    return [];
  }
}

export async function requestAssessment(
  answers: Partial<DiagnosticAnswers>,
  history: SessionRecord[],
): Promise<DiagnoseResponse> {
  const response = await fetch("/api/stuck/diagnose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers, history }),
  });

  if (!response.ok) {
    throw new Error("Assessment request failed.");
  }

  return (await response.json()) as DiagnoseResponse;
}
