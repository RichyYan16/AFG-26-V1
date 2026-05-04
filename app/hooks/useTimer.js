/**
 * Custom hook for managing timer state
 */

import { useEffect, useState } from "react";

/**
 * @typedef {Object} UseTimerReturn
 * @property {number} secondsLeft
 * @property {boolean} running
 * @property {Function} start
 * @property {Function} toggle
 * @property {Function} reset
 * @property {Function} stop
 */

/**
 * Hook for managing a countdown timer
 * @returns {UseTimerReturn}
 */
export function useTimer() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) {
      return;
    }

    const timerId = window.setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          setRunning(false);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [running]);

  /**
   * Start the timer with specified minutes
   * @param {number} minutes
   */
  const start = (minutes) => {
    setSecondsLeft(minutes * 60);
    setRunning(true);
  };

  /**
   * Toggle timer running state
   */
  const toggle = () => {
    setRunning((previous) => !previous);
  };

  /**
   * Reset the timer
   * @param {number} totalMinutes
   */
  const reset = (totalMinutes) => {
    setSecondsLeft(totalMinutes * 60);
    setRunning(false);
  };

  /**
   * Stop the timer
   */
  const stop = () => {
    setSecondsLeft(0);
    setRunning(false);
  };

  return {
    secondsLeft,
    running,
    start,
    toggle,
    reset,
    stop,
  };
}
