import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type State = "loading" | "anonymous" | "new" | "blocked" | "onboarding" | "existing" | "error";

/**
 * Runs once per signed-in session:
 *  - existing users  -> nothing is shown
 *  - new users       -> profile setup (name + age required)
 *  - age <= 13       -> permanently rejected (recorded server-side)
 */
const RegistrationGate = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<State>("loading");
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [college, setCollege] = useState("");
  const [course, setCourse] = useState("");
  const [skills, setSkills] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!user) { setState("anonymous"); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_registration_state" as any);
      if (cancelled) return;
      if (error) { setState("error"); return; }
      const s = String(data);
      if (s === "new") {
        setName(
          (user.user_metadata as any)?.full_name ||
          (user.user_metadata as any)?.name || ""
        );
        setState("new");
      } else if (s === "blocked") {
        setState("blocked");
      } else if (s === "onboarding") {
        setState("onboarding");
      } else if (s === "existing") {
        setState("existing");
      } else {
        setState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const submit = async () => {
    const numericAge = parseInt(age, 10);
    if (name.trim().length < 2) {
      toast({ title: "Name required", description: "Please enter at least 2 characters.", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(numericAge) || numericAge < 1 || numericAge > 120) {
      toast({ title: "Age required", description: "Please enter a valid age.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("complete_registration" as any, {
        p_display_name: name.trim(),
        p_age: numericAge,
        p_avatar_url: (user?.user_metadata as any)?.avatar_url ?? null,
        p_college: college.trim() || null,
        p_course: course.trim() || null,
        p_skills: skills.trim() || null,
        p_bio: bio.trim() || null,
        p_location: null,
      });
      if (error) throw error;
      const result = String(data);
      if (result === "blocked") { setState("blocked"); return; }
      if (result === "ok") { setState("existing"); toast({ title: "Welcome to Bridge!" }); return; }
      setState("error");
      toast({ title: "Unexpected registration response", variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Couldn't complete registration", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => { try { await supabase.auth.signOut(); } catch { /* ignore */ } };

  if (!user || state === "loading" || state === "anonymous" || state === "existing") return null;

  if (state === "blocked") {
    return (
      <Dialog open onOpenChange={() => { /* forced */ }}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>You can't use Bridge yet</DialogTitle>
            <DialogDescription>
              Bridge is only available to people older than 13. Based on the age provided,
              this account cannot be registered.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            If you believe this is a mistake, contact atlasthoughthelp@gmail.com.
          </p>
          <Button onClick={signOut} className="w-full">Sign out</Button>
        </DialogContent>
      </Dialog>
    );
  }

  if (state === "onboarding") {
    return null;
  }

  if (state === "error") {
    return (
      <Dialog open onOpenChange={() => { /* forced */ }}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>We couldn't verify your account setup</DialogTitle>
            <DialogDescription>
              Please try signing out and signing in again. If this keeps happening, contact atlasthoughthelp@gmail.com.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={signOut} className="w-full">Sign out</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={() => { /* forced */ }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Set up your profile</DialogTitle>
          <DialogDescription>Just a few details before you get started. Bridge is for users older than 13.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rg-name">Name / nickname *</Label>
            <Input id="rg-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="How should we call you?" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rg-age">Age *</Label>
            <Input id="rg-age" type="number" inputMode="numeric" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 19" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rg-college">College / school</Label>
              <Input id="rg-college" value={college} onChange={(e) => setCollege(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rg-course">Course / field</Label>
              <Input id="rg-course" value={course} onChange={(e) => setCourse(e.target.value)} maxLength={120} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rg-skills">Skills / interests</Label>
            <Input id="rg-skills" value={skills} onChange={(e) => setSkills(e.target.value)} maxLength={200} placeholder="Physics, Python, design…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rg-bio">Bio</Label>
            <Textarea id="rg-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} className="min-h-20 resize-none" />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={signOut} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="flex-1">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationGate;
