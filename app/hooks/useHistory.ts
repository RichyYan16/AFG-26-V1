import { useEffect, useState } from "react";
import { loadUserHistory } from "../utils";
import { STORAGE_KEY } from "../constants";
import type { SessionRecord } from "@/model/new/types";

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

  return {
    history,
    hydrated,
    clearHistory,
    addToHistory,
    saveHistory,
  };
}
