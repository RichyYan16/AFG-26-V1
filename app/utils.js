/**
 * Utility functions for the application
 * @typedef {import('@/types.d').DiagnosticAnswers} DiagnosticAnswers
 * @typedef {import('@/types.d').SessionRecord} SessionRecord
 * @typedef {import('@/types.d').DiagnoseResponse} DiagnoseResponse
 */

import { STORAGE_KEY } from "./constants.js";

/**
 * Convert partial answers to complete answers
 * @param {Partial<DiagnosticAnswers>} answers
 * @returns {DiagnosticAnswers|null}
 */
export function asCompleteAnswers(answers) {
  if (
    answers.internalVoice &&
    answers.eightyPercentThought &&
    answers.whyBestWork &&
    answers.avoidanceDuration &&
    answers.helpSeeking
  ) {
    return answers;
  }
  return null;
}

/**
 * Format seconds into MM:SS format
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatTimer(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Load user session history
 * @param {string} userId
 * @returns {Promise<SessionRecord[]>}
 */
export async function loadUserHistory(userId) {
  if (!userId) {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading user history:", error);
    return [];
  }
}

/**
 * Request diagnosis from the API
 * @param {Partial<DiagnosticAnswers>} answers
 * @param {SessionRecord[]} history
 * @returns {Promise<DiagnoseResponse>}
 */
export async function requestDiagnosis(answers, history) {
  const response = await fetch("/api/stuck/diagnose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers, history }),
  });

  if (!response.ok) {
    throw new Error("Diagnosis request failed.");
  }

  return await response.json();
}
