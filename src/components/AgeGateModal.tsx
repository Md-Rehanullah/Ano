import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const KEY = (uid: string) => `bridge_age_confirmed_${uid}`;

/**
 * Shows a one-time modal after a user first signs in, requiring them to
 * confirm they are 13 years or older. Required by Google Play policy for
 * social apps that are not opted into "Designed for Families".
 */
const AgeGateModal = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    try {
      const confirmed = localStorage.getItem(KEY(user.id));
      if (!confirmed) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [user]);

  const confirm = () => {
    if (!user) return;
    try { localStorage.setItem(KEY(user.id), new Date().toISOString()); } catch {}
    setOpen(false);
  };

  const decline = async () => {
    toast({ title: "Age requirement not met", description: "You must be 13 or older to use Bridge." });
    try { await supabase.auth.signOut(); } catch {}
    setOpen(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={() => { /* forced choice */ }}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Age confirmation required</DialogTitle>
          <DialogDescription>
            Bridge is intended for users who are 13 years of age or older. Please confirm your age to continue.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          By tapping "I am 13 or older" you confirm that you meet the minimum age requirement and agree to our Terms and Privacy Policy.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={decline}>I am under 13</Button>
          <Button onClick={confirm}>I am 13 or older</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AgeGateModal;
