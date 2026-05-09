/**
 * History Hook Module
 * 
 * Manages persistent storage and retrieval of student session history.
 * Handles localStorage synchronization, session caching, and history
 * lifecycle management (add, delete, clear).
 * 
 * @module app/hooks/useHistory
 */

import { useEffect, useState } from "react";
import { loadUserHistory } from "../utils";
import { STORAGE_KEY } from "../constants";
import type { SessionRecord } from "@/model/new/types";

/**
 * Custom React hook for managing session history with persistent storage
 * 
 * Provides state management for student session history with automatic
 * persistence to localStorage. Handles async loading, data synchronization,
 * and history operations (add, delete, clear).
 * 
 * @returns {Object} History state and control functions
 * @returns {SessionRecord[]} returns.history - Array of session records
 * @returns {boolean} returns.hydrated - Whether history has loaded from storage
 * @returns {Function} returns.clearHistory - Clear all session history
 * @returns {Function} returns.addToHistory - Add new session to history
 * @returns {Function} returns.deleteSession - Delete specific session from history
 * 
 * @example
 * const { history, hydrated, addToHistory, clearHistory } = useHistory();
 * 
 * if (hydrated) {
 *   // History is ready to use
 *   const recentSessions = history.slice(0, 5);
 * }
 */
export function useHistory() {
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Load history from local storage
    loadUserHistory().then((userHistory) => {
      setHistory(userHistory);
      setHydrated(true);
    });
  }, []);

  const clearHistory = async (): Promise<void> => {
    try {
      // Clear from local storage instead of Firebase
      localStorage.removeItem(STORAGE_KEY);
      setHistory([]);
    } catch (error) {
      console.error("Error clearing history:", error);
      throw new Error("Failed to clear history. Please try again.");
    }
  };

  const saveHistory = (updatedHistory: SessionRecord[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("Error saving history to localStorage:", error);
    }
  };

  const addToHistory = (newSession: SessionRecord) => {
    const updatedHistory = [newSession, ...history].slice(0, 300);
    setHistory(updatedHistory);
    saveHistory(updatedHistory);
    return updatedHistory;
  };

  const deleteSession = (sessionId: string) => {
    const updatedHistory = history.filter(session => session.id !== sessionId);
    setHistory(updatedHistory);
    saveHistory(updatedHistory);
    return updatedHistory;
  };

  return {
    history,
    hydrated,
    clearHistory,
    addToHistory,
    saveHistory,
    deleteSession,
  };
}
