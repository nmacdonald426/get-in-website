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
  /** Which tab the panel opens on (defaults to sign-up). */
  initialMode?: "signin" | "signup";
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
  initialMode,
}: AuthPanelProps) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(
    initialMode ?? "signup"
  );
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

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Please enter your email address first.");
      return;
    }
    setBusy(true);
    try {
      const { error: resetError } =
        await getSupabase().auth.resetPasswordForEmail(email.trim(), {
          redirectTo: "https://get-in-website.vercel.app",
        });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setMessage("Check your email — we sent you a reset link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card auth-card">
      <h2>{needsProfile ? "Finish your profile" : mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back"}</h2>
      <p className="muted">
        {needsProfile
          ? "You are signed in. Tell us a little more so your bookings have a name on them."
          : mode === "signup"
            ? "Clients are always free. Providers will pay $9 a month later — nothing is charged in this test version."
            : mode === "forgot"
              ? "Enter the email you signed up with and we will send you a link to choose a new password."
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

      <form onSubmit={mode === "forgot" ? handleForgotSubmit : handleSubmit}>
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
            {mode !== "forgot" && (
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
            )}
            {mode === "signin" && (
              <p className="muted center">
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    setMode("forgot");
                    setError("");
                    setMessage("");
                  }}
                >
                  Forgot password?
                </button>
              </p>
            )}
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
                : mode === "forgot"
                  ? "Send reset link"
                  : "Sign in"}
        </button>
      </form>

      {!needsProfile && (
        <p className="muted center">
          {mode === "forgot" ? (
            <button
              type="button"
              className="link"
              onClick={() => {
                setMode("signin");
                setError("");
                setMessage("");
              }}
            >
              ← Back to sign in
            </button>
          ) : mode === "signup" ? (
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
