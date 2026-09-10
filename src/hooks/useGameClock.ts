import { useEffect, useState } from 'react';

export type GameDuration = 5 | 6 | 8;

interface UseGameClockProps {
  initialDuration?: GameDuration;
  initialPeriod?: number;
  initialPeriodClock?: number;
  initialShotClock?: number;
  initialPossessionClock?: number;
}

export function useGameClock({
  initialDuration = 8,
  initialPeriod = 1,
  initialPeriodClock,
  initialShotClock = 30,
  initialPossessionClock = 30,
}: UseGameClockProps = {}) {
  const [gameDuration, setGameDuration] =
    useState<GameDuration>(initialDuration);

  const [periodClock, setPeriodClock] = useState<number>(
    initialPeriodClock ?? initialDuration * 60
  );

  const [shotClock, setShotClock] = useState<number>(initialShotClock);

  const [possessionClock, setPossessionClock] =
    useState<number>(initialPossessionClock);

  const [period, setPeriod] = useState<number>(initialPeriod);

  const [isRunning, setIsRunning] = useState<boolean>(false);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setPeriodClock((prev) => Math.max(prev - 1, 0));

      setShotClock((prev) => Math.max(prev - 1, 0));

      setPossessionClock((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const resetShotClock = () => {
    setShotClock(30);
    setPossessionClock(30);
  };

  const resetPossessionClock = (seconds: number = 30) => {
    setPossessionClock(seconds);
  };

  const changePeriod = (nextPeriod: number) => {
    setPeriod(nextPeriod);
    setPeriodClock(gameDuration * 60);
    setShotClock(30);
    setPossessionClock(30);
    setIsRunning(false);
  };

  const changeDuration = (duration: GameDuration) => {
    setGameDuration(duration);

    if (!isRunning) {
      setPeriodClock(duration * 60);
    }
  };

  return {
    gameDuration,
    setGameDuration: changeDuration,

    period,
    setPeriod,

    periodClock,
    setPeriodClock,

    shotClock,
    setShotClock,

    possessionClock,
    setPossessionClock,

    isRunning,
    setIsRunning,

    resetShotClock,
    resetPossessionClock,
    changePeriod,
  };
}