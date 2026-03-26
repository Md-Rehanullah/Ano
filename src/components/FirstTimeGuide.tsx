import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ThumbsUp, MessageCircle, Bookmark, Share2, Eye, PenSquare, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const steps = [
  { icon: PenSquare, title: "Create Posts", desc: "Share questions, ideas, or knowledge with the community. Click the 'Write Content' card on the homepage." },
  { icon: ThumbsUp, title: "Like Posts", desc: "Show appreciation by liking posts and comments that you find helpful." },
  { icon: MessageCircle, title: "Comment", desc: "Share your thoughts by commenting on posts. Engage in meaningful discussions." },
  { icon: Bookmark, title: "Save Posts", desc: "Bookmark posts to save them for later. Access them from the sidebar." },
  { icon: Eye, title: "View Count", desc: "See how many people have viewed each post." },
  { icon: Search, title: "Explore", desc: "Browse All Posts to discover content by category — General, Technology, Education, Lifestyle, and more." },
  { icon: Share2, title: "Share", desc: "Share interesting posts with friends using the share button." },
];

const FirstTimeGuide = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const checkGuide = async () => {
      const { data } = await supabase.from('user_guide_seen').select('id').eq('user_id', user.id).maybeSingle();
      if (!data) setOpen(true);
    };
    checkGuide();
  }, [user]);

  const handleClose = async () => {
    setOpen(false);
    if (user) {
      await supabase.from('user_guide_seen').insert({ user_id: user.id });
    }
  };

  const Icon = steps[step].icon;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Welcome to Bridge! 🌉</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center text-center py-6 space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">{steps[step].title}</h3>
          <p className="text-sm text-muted-foreground max-w-xs">{steps[step].desc}</p>
          <div className="flex gap-1 pt-2">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={handleClose}>Skip</Button>
          <div className="flex gap-2">
            {step > 0 && <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>Back</Button>}
            {step < steps.length - 1 ? (
              <Button size="sm" onClick={() => setStep(s => s + 1)}>Next</Button>
            ) : (
              <Button size="sm" onClick={handleClose}>Get Started</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FirstTimeGuide;
