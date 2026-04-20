import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  className?: string;
  onClick?: () => void;
}

const formatTime = (sec: number) => {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const VideoPlayer = ({ src, className, onClick }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => setDuration(v.duration);
    const onTime = () => setCurrent(v.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [src]);

  const scheduleHide = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowControls(false), 2500);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const seek = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + delta));
  };

  const onSliderChange = (vals: number[]) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = vals[0];
    setCurrent(vals[0]);
  };

  const goFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative bg-black rounded-lg overflow-hidden group", className)}
      onMouseMove={() => { setShowControls(true); scheduleHide(); }}
      onMouseLeave={() => setShowControls(false)}
      onTouchStart={() => { setShowControls(true); scheduleHide(); }}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full max-h-[70vh] object-contain bg-black"
        playsInline
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
      />

      {/* Big center play button when paused */}
      {!playing && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          aria-label="Play"
        >
          <div className="bg-primary/90 rounded-full p-4 shadow-lg">
            <Play className="h-8 w-8 text-primary-foreground fill-current" />
          </div>
        </button>
      )}

      {/* Controls bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 transition-opacity",
          showControls || !playing ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrubber */}
        <div className="flex items-center gap-2 mb-1">
          <Slider
            value={[current]}
            max={duration || 1}
            step={0.1}
            onValueChange={onSliderChange}
            className="flex-1"
          />
        </div>
        <div className="flex items-center justify-between gap-1 text-white">
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={togglePlay}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => seek(-10)} aria-label="Back 10s">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => seek(10)} aria-label="Forward 10s">
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={toggleMute}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <span className="text-xs ml-1 tabular-nums">{formatTime(current)} / {formatTime(duration)}</span>
          </div>
          <div className="flex items-center gap-1">
            {onClick && (
              <Button type="button" variant="ghost" size="sm" className="h-8 text-white hover:bg-white/20 text-xs" onClick={onClick}>
                More
              </Button>
            )}
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={goFullscreen}>
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
