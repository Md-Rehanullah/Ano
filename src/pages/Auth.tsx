import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { X, Loader2, Phone, Mail } from "lucide-react";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);
const GitHubIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

type Mode = "signin" | "signup";

const Auth = () => {
  const [mode, setMode] = useState<Mode>("signin");
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");

  // Email fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Phone fields
  const [phoneDigits, setPhoneDigits] = useState(""); // 10 digits, no +91
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
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

  // ---- Email handlers ----
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" }); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast({ title: "Error", description: "Email and password are required", variant: "destructive" }); return; }
    if (password.length < 6) { toast({ title: "Password too short", description: "Use at least 6 characters", variant: "destructive" }); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: displayName.trim() ? { display_name: displayName.trim() } : undefined,
      },
    });
    if (error) toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    else toast({ title: "Account created", description: "Check your email to confirm your account." });
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast({ title: "Error", description: "Please enter your email", variant: "destructive" }); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Check your email" }); setShowForgotPassword(false); }
    setLoading(false);
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setSocialLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + '/' } });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setSocialLoading(null);
  };

  // ---- Phone handlers ----
  const isValidIndianPhone = (d: string) => /^[6-9]\d{9}$/.test(d);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidIndianPhone(phoneDigits)) {
      toast({ title: "Invalid number", description: "Enter a 10-digit Indian mobile number starting with 6-9.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("phone-otp-send", {
      body: { phone: `+91${phoneDigits}` },
    });
    if (error || (data as any)?.error) {
      const msg = (data as any)?.error || error?.message || "Failed to send OTP";
      toast({ title: "Couldn't send OTP", description: msg, variant: "destructive" });
    } else {
      setOtpSent(true);
      toast({ title: "OTP sent", description: `Code sent to +91 ${phoneDigits}` });
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      toast({ title: "Invalid code", description: "Enter the 6-digit code.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("phone-otp-verify", {
      body: { phone: `+91${phoneDigits}`, code: otp },
    });
    if (error || (data as any)?.error || !(data as any)?.session) {
      const msg = (data as any)?.error || error?.message || "Verification failed";
      toast({ title: "Verification failed", description: msg, variant: "destructive" });
      setLoading(false);
      return;
    }
    const { session } = data as { session: { access_token: string; refresh_token: string } };
    const { error: setErr } = await supabase.auth.setSession(session);
    if (setErr) {
      toast({ title: "Sign-in failed", description: setErr.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome to Bridge!" });
      navigate("/");
    }
    setLoading(false);
  };

  const resetPhone = () => { setOtpSent(false); setOtp(""); };

  if (user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md relative">
        <Button variant="ghost" size="icon" className="absolute right-2 top-2 rounded-full" onClick={() => navigate("/")} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
        <CardHeader className="text-center pt-8">
          <CardTitle className="text-2xl font-bold">Bridge</CardTitle>
          <CardDescription>Join our community of curious minds</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Sign In / Sign Up tabs side-by-side */}
          <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setShowForgotPassword(false); resetPhone(); }} className="w-full mb-5">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Social */}
          <div className="space-y-2 mb-5">
            <Button variant="outline" className="w-full" onClick={() => handleSocialLogin('google')} disabled={socialLoading !== null}>
              <GoogleIcon /><span className="ml-2">{socialLoading === 'google' ? 'Connecting...' : 'Continue with Google'}</span>
            </Button>
            <Button variant="outline" className="w-full" onClick={() => handleSocialLogin('github')} disabled={socialLoading !== null}>
              <GitHubIcon /><span className="ml-2">{socialLoading === 'github' ? 'Connecting...' : 'Continue with GitHub'}</span>
            </Button>
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
          </div>

          {/* Method switcher: Email vs Phone, side-by-side */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Button type="button" variant={authMethod === "email" ? "default" : "outline"} size="sm" onClick={() => setAuthMethod("email")}>
              <Mail className="h-4 w-4 mr-1.5" /> Email
            </Button>
            <Button type="button" variant={authMethod === "phone" ? "default" : "outline"} size="sm" onClick={() => setAuthMethod("phone")}>
              <Phone className="h-4 w-4 mr-1.5" /> Phone
            </Button>
          </div>

          {authMethod === "email" && !showForgotPassword && mode === "signin" && (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signin-email">Email</Label>
                <Input id="signin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signin-password">Password</Label>
                <Input id="signin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in...</> : "Sign In"}
              </Button>
              <Button type="button" variant="link" className="w-full text-sm text-muted-foreground" onClick={() => setShowForgotPassword(true)}>
                Forgot password?
              </Button>
            </form>
          )}

          {authMethod === "email" && showForgotPassword && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sending..." : "Send Reset Link"}</Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgotPassword(false)}>Back</Button>
            </form>
          )}

          {authMethod === "email" && mode === "signup" && (
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="su-name">Display Name (optional)</Label>
                <Input id="su-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-password">Password</Label>
                <Input id="su-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                <p className="text-xs text-muted-foreground">At least 6 characters.</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating account...</> : "Create Account"}
              </Button>
            </form>
          )}

          {authMethod === "phone" && !otpSent && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Indian mobile number</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground select-none">
                    +91
                  </span>
                  <Input
                    id="phone" type="tel" inputMode="numeric" autoComplete="tel-national"
                    placeholder="10-digit mobile number"
                    value={phoneDigits}
                    onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="rounded-l-none"
                    maxLength={10}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Only +91 numbers are supported. We'll send a 6-digit OTP.</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading || !isValidIndianPhone(phoneDigits)}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending OTP...</> : "Send OTP"}
              </Button>
            </form>
          )}

          {authMethod === "phone" && otpSent && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="otp">Enter the 6-digit code</Label>
                <Input
                  id="otp" type="text" inputMode="numeric" autoComplete="one-time-code"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="text-center tracking-[0.5em] text-lg"
                  required
                />
                <p className="text-xs text-muted-foreground">Sent to +91 {phoneDigits}. Code expires in 5 minutes.</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</> : "Verify & Continue"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={resetPhone}>Use a different number</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
