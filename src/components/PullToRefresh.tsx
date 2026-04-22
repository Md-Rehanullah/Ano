import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pull-to-refresh: drag down from the top of the page to trigger onRefresh.
 * Only activates when window.scrollY === 0 and the user starts a touch drag downward.
 * Works on touch devices (mobile/native). No-op on desktop pointer scrolls.
 */
interface Props {
  onRefresh: () => Promise<void> | void;
  /** Pixels of pull required to trigger a refresh */
  threshold?: number;
}

const PullToRefresh = ({ onRefresh, threshold = 70 }: Props) => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const tracking = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshing) return;
      startY.current = e.touches[0].clientY;
      tracking.current = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!tracking.current || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // Resistance curve so it doesn't track 1:1
      const resisted = Math.min(threshold * 1.6, dy * 0.5);
      setPull(resisted);
    };
    const onTouchEnd = async () => {
      if (!tracking.current) return;
      tracking.current = false;
      startY.current = null;
      if (pull >= threshold && !refreshing) {
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, refreshing, threshold, onRefresh]);

  const visible = pull > 4 || refreshing;
  const progress = Math.min(1, pull / threshold);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed left-1/2 -translate-x-1/2 z-50 flex items-center justify-center",
        "h-10 w-10 rounded-full bg-card shadow-lg border transition-opacity",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{
        top: 12,
        transform: `translate(-50%, ${Math.min(pull, 80)}px)`,
      }}
    >
      <RefreshCw
        className={cn("h-5 w-5 text-primary", refreshing && "animate-spin")}
        style={{ transform: refreshing ? undefined : `rotate(${progress * 270}deg)` }}
      />
    </div>
  );
};

export default PullToRefresh;
