import type {
  DiagnosticAnswers,
  SessionRecord,
  DiagnoseResponse,
} from "@/model/new/types";
import { STORAGE_KEY } from "./constants";

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

export function formatTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
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

export async function requestDiagnosis(
  answers: Partial<DiagnosticAnswers>,
  history: SessionRecord[],
): Promise<DiagnoseResponse> {
  const response = await fetch("/api/stuck/diagnose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers, history }),
  });

  if (!response.ok) {
    throw new Error("Diagnosis request failed.");
  }

  return (await response.json()) as DiagnoseResponse;
}
