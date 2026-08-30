import { supabase } from "@/integrations/supabase/client";

/**
 * Google Web Client ID (OAuth 2.0 "Web application" client from Google Cloud).
 * This is a PUBLIC identifier — safe to keep in the codebase.
 *
 * This must match the same Web Client ID configured in:
 * - Google Cloud Console
 * - Supabase → Authentication → Providers → Google
 */
export const GOOGLE_WEB_CLIENT_ID =
  String((import.meta as any).env?.VITE_GOOGLE_WEB_CLIENT_ID || "").trim();

export const isNativeApp = (): boolean =>
  !!(window as any).Capacitor?.isNativePlatform?.();

export const isNativeGoogleConfigured = () =>
  GOOGLE_WEB_CLIENT_ID.length > 0 &&
  GOOGLE_WEB_CLIENT_ID.endsWith(".apps.googleusercontent.com");

/**
 * Native Android/iOS Google sign-in.
 * Uses the system Google account picker (no Chrome redirect), gets an ID token
 * and exchanges it with Supabase via signInWithIdToken so the session lives
 * inside the app.
 */
export const nativeGoogleSignIn = async (): Promise<void> => {
  if (!isNativeGoogleConfigured()) {
    throw new Error("Missing valid VITE_GOOGLE_WEB_CLIENT_ID for native Google sign-in.");
  }

  const { SocialLogin } = await import("@capgo/capacitor-social-login");

  await SocialLogin.initialize({
    google: { webClientId: GOOGLE_WEB_CLIENT_ID },
  });

  const res: any = await SocialLogin.login({
    provider: "google",
    options: {},
  });

  const idToken: string | undefined =
    res?.result?.idToken ?? res?.result?.responseType?.idToken ?? res?.idToken;

  if (!idToken) throw new Error("Google did not return an ID token.");

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });
  if (error) throw error;
};
