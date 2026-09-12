"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Session, SupabaseClient, createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const authEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!authEnabled) return null;
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseInstance;
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
    client.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .catch((err) => {
        console.error("Failed to retrieve Supabase session:", err);
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: sub } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signInWithGoogle: async () => {
        if (!client) {
          throw new Error("Authentication is not configured");
        }
        const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
        const { error } = await client.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: redirectUrl },
        });
        if (error) {
          throw error;
        }
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
