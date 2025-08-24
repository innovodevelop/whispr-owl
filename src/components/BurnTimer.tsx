import { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface BurnTimerProps {
  startsAt: string;
  duration: number; // in seconds
  onExpire: () => void;
  className?: string;
}

export const BurnTimer = ({ startsAt, duration, onExpire, className }: BurnTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    const startTime = new Date(startsAt).getTime();
    const endTime = startTime + (duration * 1000);

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const secondsLeft = Math.ceil(remaining / 1000);
      
      setTimeLeft(secondsLeft);
      
      if (secondsLeft <= 0 && !hasExpired) {
        setHasExpired(true);
        onExpire();
      }
    };

    // Update immediately
    updateTimer();
    
    // Update every second
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [startsAt, duration, onExpire, hasExpired]);

  if (hasExpired || timeLeft <= 0) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const getUrgencyColor = () => {
    if (timeLeft <= 10) return "text-red-500";
    if (timeLeft <= 30) return "text-orange-500";
    return "text-orange-400";
  };

  return (
    <div className={cn(
      "flex items-center gap-1 text-xs mt-1 transition-colors",
      getUrgencyColor(),
      className
    )}>
      <Flame className="h-3 w-3 animate-pulse" />
      <span className="font-mono">
        Burns in {formatTime(timeLeft)}
      </span>
    </div>
  );
};