/**
 * Custom hook for managing session history
 */

import { useEffect, useState } from "react";
import { loadUserHistory } from "../utils.js";

/**
 * @typedef {Object} UseHistoryReturn
 * @property {Array} history
 * @property {boolean} hydrated
 * @property {Function} clearHistory
 * @property {Function} addToHistory
 */

/**
 * Hook for managing session history
 * @returns {UseHistoryReturn}
 */
export function useHistory() {
  const [history, setHistory] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadUserHistory("anonymous").then((userHistory) => {
      setHistory(userHistory);
      setHydrated(true);
    });
  }, []);

  const clearHistory = async () => {
    try {
      localStorage.removeItem("stuck_sessions_v1");
      setHistory([]);
    } catch (error) {
      console.error("Error clearing history:", error);
      throw new Error("Failed to clear history. Please try again.");
    }
  };

  const addToHistory = (newSession) => {
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
