import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Sticky banner shown when the device goes offline.
 * Appears above content; uses semantic tokens.
 */
const OfflineBanner = () => {
  const [offline, setOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-30 w-full bg-destructive/10 border-b border-destructive/30 text-destructive text-xs sm:text-sm font-medium"
    >
      <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2">
        <WifiOff className="h-3.5 w-3.5" />
        <span>You're offline — showing the last cached posts. Posting and reactions are paused.</span>
      </div>
    </div>
  );
};

export default OfflineBanner;
