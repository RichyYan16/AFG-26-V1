/**
 * Timer Hook Module
 * 
 * Provides countdown timer functionality for intervention step tracking.
 * Manages timer state (seconds remaining, running status) and operations
 * (start, pause, reset, stop).
 * 
 * @module app/hooks/useTimer
 */

import { useEffect, useState } from "react";

/**
 * Custom React hook for managing a countdown timer
 * 
 * Provides state management for a timer that counts down from specified minutes.
 * Automatically stops when reaching zero. Useful for timed interventions and 
 * step-by-step activities.
 * 
 * @returns {Object} Timer state and control functions
 * @returns {number} returns.secondsLeft - Remaining seconds on timer
 * @returns {boolean} returns.running - Whether timer is actively counting
 * @returns {Function} returns.start - Start timer for specified minutes
 * @returns {Function} returns.toggle - Pause/resume timer
 * @returns {Function} returns.reset - Reset timer to specified minutes
 * @returns {Function} returns.stop - Stop and clear timer
 * 
 * @example
 * const { secondsLeft, running, start, toggle, reset, stop } = useTimer();
 * 
 * // Start a 5-minute timer
 * start(5);
 * 
 * // Display remaining time
 * const minutes = Math.floor(secondsLeft / 60);
 * const seconds = secondsLeft % 60;
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

  const start = (minutes: number) => {
    setSecondsLeft(minutes * 60);
    setRunning(true);
  };

  const toggle = () => {
    setRunning((previous) => !previous);
  };

  const reset = (totalMinutes: number) => {
    setSecondsLeft(totalMinutes * 60);
    setRunning(false);
  };

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
