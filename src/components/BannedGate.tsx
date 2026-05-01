import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, LogOut, Mail, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const SUPPORT_EMAIL = "atlasthoughthelp@gmail.com";

interface BanInfo {
  reason: string;
  banned_until: string | null;
  created_at: string;
}

const BannedGate = () => {
  const { user, signOut } = useAuth();
  const [ban, setBan] = useState<BanInfo | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const { toast } = useToast();

  const checkBan = async (userId: string) => {
    const { data } = await supabase
      .from("user_bans")
      .select("reason, banned_until, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && (!data.banned_until || new Date(data.banned_until) > new Date())) {
      setBan(data);
    } else {
      setBan(null);
    }
  };

  useEffect(() => {
    if (!user) { setBan(null); return; }
    checkBan(user.id);

    // Realtime: react if a ban is added/lifted while the app is open
    const channel = supabase
      .channel(`bans:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_bans", filter: `user_id=eq.${user.id}` },
        () => checkBan(user.id),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  if (!user || !ban) return null;

  const permanent = !ban.banned_until;
  // Compute remaining time for temporary suspensions
  let durationText = "";
  let endsText = "";
  if (ban.banned_until) {
    const end = new Date(ban.banned_until);
    const now = new Date();
    const msLeft = Math.max(0, end.getTime() - now.getTime());
    const totalMinutes = Math.floor(msLeft / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
    if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
    if (parts.length === 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
    durationText = parts.join(" and ");
    endsText = `${end.toLocaleString()} (${formatDistanceToNow(end, { addSuffix: true })})`;
  }

  return (
    <AlertDialog open>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center">
            {permanent ? "Your account has been banned" : "Your account is suspended"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-3">
            {permanent ? (
              <span className="block">Your account has been permanently banned from Bridge.</span>
            ) : (
              <span className="block space-y-1">
                <span className="block">
                  Your account is suspended for <span className="font-semibold text-destructive">{durationText}</span>.
                </span>
                <span className="block text-xs text-muted-foreground">Ends on {endsText}</span>
              </span>
            )}
            <span className="block bg-muted/50 rounded-md p-3 text-left text-foreground text-sm">
              <span className="font-medium block mb-1">Reason for {permanent ? "ban" : "suspension"}:</span>
              <span className="block whitespace-pre-wrap">{ban.reason?.trim() || "No reason was provided by the moderator."}</span>
            </span>
            <span className="block text-xs">
              {permanent
                ? "You can no longer post, comment, or interact on this account. If you believe this is a mistake, please contact support."
                : "You cannot post, comment, or interact until the suspension ends. If you believe this is a mistake, please contact support."}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <Button variant="destructive" className="w-full" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out of this account
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setSupportOpen(true)}>
            <Mail className="h-4 w-4 mr-2" /> Contact support
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>

      {/* Inline support popup with email */}
      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Contact support</DialogTitle>
            <DialogDescription>
              Email us with your appeal. Tap the address to open your mail app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                permanent ? "Appeal: account banned" : "Appeal: account suspended",
              )}&body=${encodeURIComponent(
                [
                  `Hello Bridge support team,`,
                  ``,
                  `My account (${user.email || "unknown"}) has been ${
                    permanent ? "permanently banned" : `suspended${durationText ? ` for ${durationText}` : ""}`
                  }.`,
                  ``,
                  `Reason given: ${ban.reason?.trim() || "No reason provided."}`,
                  ``,
                  `I would like to appeal this decision because:`,
                  ``,
                ].join("\n"),
              )}`}
              className="block w-full text-center rounded-md border p-3 font-medium text-primary hover:bg-muted/50 break-all"
            >
              {SUPPORT_EMAIL}
            </a>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(SUPPORT_EMAIL);
                  toast({ title: "Email copied" });
                } catch {
                  toast({ title: "Couldn't copy", variant: "destructive" });
                }
              }}
            >
              <Copy className="h-4 w-4 mr-2" /> Copy email address
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              We typically respond within 24–48 hours.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </AlertDialog>
  );
};

export default BannedGate;
