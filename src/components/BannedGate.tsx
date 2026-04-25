import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, LogOut } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BanInfo {
  reason: string;
  banned_until: string | null;
  created_at: string;
}

const BannedGate = () => {
  const { user, signOut } = useAuth();
  const [ban, setBan] = useState<BanInfo | null>(null);

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
  const untilText = ban.banned_until
    ? `until ${new Date(ban.banned_until).toLocaleString()} (${formatDistanceToNow(new Date(ban.banned_until), { addSuffix: true })})`
    : "permanently";

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
            <span className="block">
              {permanent
                ? "Your account has been permanently banned from Bridge."
                : `Your account is temporarily suspended ${untilText}.`}
            </span>
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
          <AlertDialogAction asChild>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/#/contact"}>
              Contact support
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BannedGate;
