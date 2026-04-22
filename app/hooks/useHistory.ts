import { useEffect, useState } from "react";
import { loadUserHistory } from "../utils";
import type { SessionRecord } from "@/model/new/types";

export function useHistory() {
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Load history from local storage for all users
    loadUserHistory("anonymous").then((userHistory) => {
      setHistory(userHistory);
      setHydrated(true);
    });
  }, []);

  const clearHistory = async (): Promise<void> => {
    try {
      // Clear from local storage instead of Firebase
      localStorage.removeItem("stuck_sessions_v1");
      setHistory([]);
    } catch (error) {
      console.error("Error clearing history:", error);
      throw new Error("Failed to clear history. Please try again.");
    }
  };

  const addToHistory = (newSession: SessionRecord) => {
    const updatedHistory = [newSession, ...history].slice(0, 300);
    setHistory(updatedHistory);
    return updatedHistory;
  };

  return {
    history,
    hydrated,
    clearHistory,
    addToHistory,
  };
}
