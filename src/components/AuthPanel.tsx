"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";
import type { Profile } from "../lib/types";

interface AuthPanelProps {
  user: User | null;
  profile: Profile | null;
  onProfileReady: (profile: Profile) => void;
  onNavigateHome: () => void;
}

/**
 * Sign up / sign in. At sign-up the visitor picks whether they are a
 * provider or a client — that choice is saved as their profile row.
 * If someone signed in but has no profile row yet (for example they
 * confirmed their email first), they finish their profile here instead.
 */
export default function AuthPanel({
  user,
  profile,
  onProfileReady,
  onNavigateHome,
}: AuthPanelProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"provider" | "client">("client");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const needsProfile = Boolean(user && !profile);

  async function createProfile(
    userId: string,
    chosenRole: "provider" | "client",
    name: string,
    phoneNumber: string
  ): Promise<Profile | null> {
    const supabase = getSupabase();
    const { data, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        role: chosenRole,
        display_name: name,
        phone: phoneNumber,
      })
      .select()
      .single();
    if (insertError) {
      // The row may already exist (created on an earlier attempt).
      const { data: existing } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (existing) return existing as Profile;
      setError("We could not save your profile: " + insertError.message);
      return null;
    }
    return data as Profile;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    const supabase = getSupabase();

    try {
      if (needsProfile && user) {
        if (!displayName.trim()) {
          setError("Please add your name so bookings have a name on them.");
          return;
        }
        const created = await createProfile(
          user.id,
          role,
          displayName.trim(),
          phone.trim()
        );
        if (created) onProfileReady(created);
        return;
      }

      if (mode === "signup") {
        if (!displayName.trim()) {
          setError("Please add your name so bookings have a name on them.");
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        const newUser = data.user;
        if (data.session && newUser) {
          const created = await createProfile(
            newUser.id,
            role,
            displayName.trim(),
            phone.trim()
          );
          if (created) onProfileReady(created);
        } else {
          setMessage(
            "Account created — please check your email and tap the confirmation link, then come back and sign in."
          );
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        // The page reloads the profile from the signed-in session.
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card auth-card">
      <h2>{needsProfile ? "Finish your profile" : mode === "signup" ? "Create your account" : "Welcome back"}</h2>
      <p className="muted">
        {needsProfile
          ? "You are signed in. Tell us a little more so your bookings have a name on them."
          : mode === "signup"
            ? "Clients are always free. Providers will pay $9 a month later — nothing is charged in this test version."
            : "Sign in with the email and password you used before."}
      </p>

      {needsProfile && (
        <div className="field">
          <label>I am a…</label>
          <div className="role-pick">
            <button
              type="button"
              className={role === "client" ? "chip selected" : "chip"}
              onClick={() => setRole("client")}
            >
              Client — I book appointments
            </button>
            <button
              type="button"
              className={role === "provider" ? "chip selected" : "chip"}
              onClick={() => setRole("provider")}
            >
              Provider — I offer appointments
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {!needsProfile && (
          <>
            <div className="field">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
          </>
        )}

        {(mode === "signup" || needsProfile) && (
          <>
            {!needsProfile && (
              <div className="field">
                <label>I am a…</label>
                <div className="role-pick">
                  <button
                    type="button"
                    className={role === "client" ? "chip selected" : "chip"}
                    onClick={() => setRole("client")}
                  >
                    Client — I book appointments
                  </button>
                  <button
                    type="button"
                    className={role === "provider" ? "chip selected" : "chip"}
                    onClick={() => setRole("provider")}
                  >
                    Provider — I offer appointments
                  </button>
                </div>
              </div>
            )}
            <div className="field">
              <label htmlFor="auth-name">Your name</label>
              <input
                id="auth-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>
            <div className="field">
              <label htmlFor="auth-phone">Phone (so providers can reach you)</label>
              <input
                id="auth-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                autoComplete="tel"
              />
            </div>
          </>
        )}

        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy
            ? "Please wait…"
            : needsProfile
              ? "Save my profile"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
        </button>
      </form>

      {!needsProfile && (
        <p className="muted center">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button type="button" className="link" onClick={() => setMode("signin")}>
                Sign in
              </button>
            </>
          ) : (
            <>
              New to Get in?{" "}
              <button type="button" className="link" onClick={() => setMode("signup")}>
                Create an account
              </button>
            </>
          )}
        </p>
      )}

      <p className="muted center">
        <button type="button" className="link" onClick={onNavigateHome}>
          ← Back to search
        </button>
      </p>
    </div>
  );
}
