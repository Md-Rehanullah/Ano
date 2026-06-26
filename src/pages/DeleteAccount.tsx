import { useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Loader2 } from "lucide-react";

const DeleteAccount = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState(user?.email || "");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInAppDelete = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to delete your account from inside the app.", variant: "destructive" });
      return;
    }
    if (confirm !== "DELETE") {
      toast({ title: "Type DELETE to confirm", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", { body: { reason } });
      if (error) throw error;
      await signOut();
      toast({ title: "Account deleted", description: "Your account and data have been removed." });
      window.location.hash = "#/";
    } catch (e: any) {
      toast({ title: "Could not delete account", description: e.message || "Please try the email request below.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRequest = async () => {
    if (!email) { toast({ title: "Email required", variant: "destructive" }); return; }
    setLoading(true);
    try {
      await supabase.from("contact_messages").insert({
        name: email.split("@")[0],
        email,
        subject: "Account deletion request",
        message: `Please delete my Bridge account associated with ${email}.\n\nReason: ${reason || "(not provided)"}`,
        category: "account_deletion",
      } as any);
      toast({ title: "Request received", description: "We'll process your deletion within 30 days and email you a confirmation." });
      setReason(""); setConfirm("");
    } catch (e: any) {
      toast({ title: "Could not submit request", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="text-center mb-8">
          <Trash2 className="h-10 w-10 mx-auto mb-3 text-destructive" />
          <h1 className="text-3xl font-bold mb-1">Delete your account</h1>
          <p className="text-sm text-muted-foreground">Permanently remove your Bridge account and associated data.</p>
        </div>

        <Card className="p-6 space-y-4 mb-6">
          <h2 className="font-semibold">What gets deleted</h2>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Your account, profile, avatar and banner</li>
            <li>Your posts, comments, likes, bookmarks and reports</li>
            <li>Notifications addressed to you</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Aggregate, anonymised counters and moderation logs may be retained for safety and legal compliance for up to 90 days.
          </p>
        </Card>

        {user ? (
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Delete now (signed in)</h2>
            <Textarea placeholder="Optional: tell us why you're leaving" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div>
              <label className="text-sm mb-1 block">Type <strong>DELETE</strong> to confirm</label>
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" />
            </div>
            <Button variant="destructive" onClick={handleInAppDelete} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Permanently delete my account
            </Button>
          </Card>
        ) : (
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Request deletion by email</h2>
            <p className="text-sm text-muted-foreground">
              You don't need to install or sign in. Submit your email below and we'll delete your account within 30 days.
              You can also email <a className="underline" href="mailto:atlasthoughthelp@gmail.com?subject=Account%20deletion%20request">atlasthoughthelp@gmail.com</a>.
            </p>
            <Input type="email" placeholder="The email address on your account" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Textarea placeholder="Optional: reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button variant="destructive" onClick={handleEmailRequest} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit deletion request
            </Button>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default DeleteAccount;
