// Modified: use Supabase OAuth directly instead of the Lovable preview broker,
// which only works on lovable.app/lovableproject.com domains.
import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft" | "lovable",
      opts?: SignInOptions
    ) => {
      if (provider !== "google") {
        return { error: new Error(`Provider "${provider}" not supported outside Lovable preview.`) };
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: opts?.redirect_uri ?? window.location.origin,
        },
      });
      if (error) {
        return { error };
      }
      // Supabase handles the redirect itself; the browser navigates away here.
      return { redirected: true };
    },
  },
};
