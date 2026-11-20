"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  supabaseClient,
} from "@/lib/supabase";
import {
  signInOwnerWithPassword,
  signOutOwner,
} from "@/lib/auth";

export type AuthStatus =
  | "LOADING"
  | "UNCONFIGURED"
  | "UNAUTHENTICATED"
  | "AUTHENTICATED";

interface AuthContextValue {
  authStatus: AuthStatus;
  isConfigured: boolean;
  session: Session | null;
  user: User | null;
  sessionExpiredNotice: string | null;
  clearSessionExpiredNotice: () => void;
  loginWithEmailPassword: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? "LOADING" : "UNCONFIGURED"
  );
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabaseClient) {
      setAuthStatus("UNCONFIGURED");
      setSession(null);
      setUser(null);
      return;
    }

    let mounted = true;
    let hadActiveSession = false;

    supabaseClient.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setSession(null);
          setUser(null);
          setAuthStatus("UNAUTHENTICATED");
          if (error.message.toLowerCase().includes("expired")) {
            setSessionExpiredNotice(
              "Sesi login Anda telah kedaluwarsa. Silakan masuk kembali."
            );
          }
          return;
        }

        if (data.session) {
          hadActiveSession = true;
          setSession(data.session);
          setUser(data.session.user);
          setAuthStatus("AUTHENTICATED");
        } else {
          setSession(null);
          setUser(null);
          setAuthStatus("UNAUTHENTICATED");
        }
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
        setUser(null);
        setAuthStatus("UNAUTHENTICATED");
      });

    const { data: listener } = supabaseClient.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;

        if (currentSession) {
          hadActiveSession = true;
          setSession(currentSession);
          setUser(currentSession.user);
          setAuthStatus("AUTHENTICATED");
          setSessionExpiredNotice(null);
        } else {
          if (event === "TOKEN_REFRESHED" || (hadActiveSession && event !== "SIGNED_OUT")) {
            setSessionExpiredNotice(
              "Sesi login Anda telah berakhir atau tidak valid lagi. Silakan masuk kembali."
            );
          }
          hadActiveSession = false;
          setSession(null);
          setUser(null);
          setAuthStatus("UNAUTHENTICATED");
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const loginWithEmailPassword = async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    setSessionExpiredNotice(null);
    return signInOwnerWithPassword(email, password);
  };

  const logout = async (): Promise<void> => {
    setSessionExpiredNotice(null);
    await signOutOwner();
    setSession(null);
    setUser(null);
    setAuthStatus(isSupabaseConfigured ? "UNAUTHENTICATED" : "UNCONFIGURED");
  };

  return (
    <AuthContext.Provider
      value={{
        authStatus,
        isConfigured: isSupabaseConfigured,
        session,
        user,
        sessionExpiredNotice,
        clearSessionExpiredNotice: () => setSessionExpiredNotice(null),
        loginWithEmailPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
