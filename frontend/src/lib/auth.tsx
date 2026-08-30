"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Session, SupabaseClient, createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const authEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export function getSupabase(): SupabaseClient | null {
  if (!authEnabled) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const client = useMemo<SupabaseClient | null>(() => getSupabase(), []);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = client.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signInWithGoogle: async () => {
        if (!client) return;
        await client.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        });
      },
      signOut: async () => {
        if (client) await client.auth.signOut();
      },
    }),
    [session, loading, client],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
