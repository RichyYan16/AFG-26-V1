import { useEffect, useState } from "react";

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
