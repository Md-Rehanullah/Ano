import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Download, Share2, Flag, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VideoPlayer from "./VideoPlayer";

interface MediaLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  type: "image" | "video";
  postId?: string;
  onReport?: (reason: string) => void;
}

const MediaLightbox = ({ open, onOpenChange, src, type, postId, onReport }: MediaLightboxProps) => {
  const { toast } = useToast();
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const handleDownload = async () => {
    try {
      const res = await fetch(src, { mode: "cors" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = type === "video" ? "mp4" : (src.split(".").pop()?.split("?")[0] || "jpg");
      a.download = `bridge-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Download started" });
    } catch {
      // Fallback: open in new tab so user can long-press / right-click save
      window.open(src, "_blank");
      toast({ title: "Opened in new tab", description: "Long-press or right-click to save." });
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url: src, title: "Bridge media" });
      } else {
        await navigator.clipboard.writeText(src);
        toast({ title: "Link copied!" });
      }
    } catch { /* user cancelled */ }
  };

  const submitReport = () => {
    if (!reportReason.trim()) return;
    onReport?.(reportReason.trim());
    toast({ title: "Report submitted", description: "Thank you for keeping the community safe." });
    setReportReason("");
    setShowReport(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] p-0 bg-background border-border overflow-hidden">
        <div className="relative">
          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-background/60 backdrop-blur-sm hover:bg-background/80 rounded-full"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Media */}
          <div className="bg-black flex items-center justify-center max-h-[75vh] overflow-hidden">
            {type === "image" ? (
              <img src={src} alt="Full view" className="max-w-full max-h-[75vh] object-contain" />
            ) : (
              <VideoPlayer src={src} className="w-full" />
            )}
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-around p-3 border-t bg-background">
            <Button variant="ghost" size="sm" className="flex flex-col h-auto py-2 gap-1" onClick={handleDownload}>
              <Download className="h-5 w-5" />
              <span className="text-xs">Download</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex flex-col h-auto py-2 gap-1" onClick={handleShare}>
              <Share2 className="h-5 w-5" />
              <span className="text-xs">Share</span>
            </Button>
            {onReport && (
              <Button variant="ghost" size="sm" className="flex flex-col h-auto py-2 gap-1 text-destructive hover:text-destructive" onClick={() => setShowReport(s => !s)}>
                <Flag className="h-5 w-5" />
                <span className="text-xs">Report</span>
              </Button>
            )}
          </div>

          {/* Report form */}
          {showReport && onReport && (
            <div className="p-3 border-t bg-muted/30 space-y-2">
              <Textarea
                placeholder="Why are you reporting this media?"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="resize-none min-h-20"
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowReport(false)}>Cancel</Button>
                <Button size="sm" onClick={submitReport} disabled={!reportReason.trim()}>Submit Report</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaLightbox;
