import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { X, Loader2 } from "lucide-react";

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.2 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 7 29 5 24 5 16.3 5 9.7 9.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 43c5 0 9.5-1.9 12.9-5l-6-4.9c-2 1.4-4.4 2.4-6.9 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 38.6 16.1 43 24 43z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l6 4.9C40.9 35 43.5 30 43.5 24c0-1.2-.1-2.3-.3-3.5z" />
  </svg>
);

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUser(user); navigate("/"); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { setUser(session.user); navigate("/"); } else { setUser(null); }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogle = async () => {
    setLoading(true);
    // On Capacitor the origin is capacitor://localhost, which Google rejects.
    // Use the published web URL so OAuth always lands on a real https origin.
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    const webOrigin = "https://bridge99.lovable.app";
    const redirectTo = isNative ? `${webOrigin}/` : `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  if (user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md relative">
        <Button variant="ghost" size="icon" className="absolute right-2 top-2 rounded-full" onClick={() => navigate("/")} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
        <CardHeader className="text-center pt-8">
          <CardTitle className="text-2xl font-bold">Bridge</CardTitle>
          <CardDescription>Sign in to join the conversation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-8">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 gap-3"
            onClick={handleGoogle}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            <span>Continue with Google</span>
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            By continuing, you agree to our Terms and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
