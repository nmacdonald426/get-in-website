"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "../lib/supabase";
import type { Profile } from "../lib/types";
import AuthPanel from "../components/AuthPanel";
import ClientSearch from "../components/ClientSearch";
import MyBookings from "../components/MyBookings";
import ProviderDashboard from "../components/ProviderDashboard";
import { DeleteAccountPage, PrivacyPage } from "../components/StaticPages";

type View = "home" | "auth" | "provider" | "bookings" | "privacy" | "delete" | "reset";

/**
 * Shown when the visitor taps a password-reset link from their email.
 * Supabase fires a PASSWORD_RECOVERY event and gives them a short-lived
 * session, so updateUser can set the new password.
 */
function ResetPasswordPanel({ onDone }: { onDone: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword.length < 6) {
      setError("Your new password needs at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The two passwords do not match. Please type them again.");
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setMessage("Your password is changed — please sign in with your new password.");
      // Leave the short-lived recovery session behind so the next
      // sign-in starts clean.
      await getSupabase().auth.signOut();
      timer.current = setTimeout(onDone, 2500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card auth-card">
      <h2>Choose a new password</h2>
      <p className="muted">
        Pick a new password for your Get in account. It needs at least 6
        characters.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="reset-new-password">New password</label>
          <input
            id="reset-new-password"
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />
        </div>
        <div className="field">
          <label htmlFor="reset-confirm-password">Type it again</label>
          <input
            id="reset-confirm-password"
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Same password again"
            autoComplete="new-password"
          />
        </div>
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
        <button type="submit" className="btn-primary" disabled={busy || Boolean(message)}>
          {busy ? "Please wait…" : message ? "Password changed ✓" : "Save new password"}
        </button>
      </form>
      {message && (
        <p className="muted center">
          <button type="button" className="link" onClick={onDone}>
            Sign in now →
          </button>
        </p>
      )}
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<View>("home");
  const [authLoading, setAuthLoading] = useState(true);
  const [authInitialMode, setAuthInitialMode] = useState<"signin" | "signup">(
    "signup"
  );

  const loadProfile = useCallback(async (userId: string) => {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      setAuthLoading(false);
      return;
    }
    const supabase = getSupabase();
    // If the visitor arrived via a password-reset email link, Supabase puts
    // type=recovery in the page address. Check it right away: the recovery
    // event can fire before our listener below is attached, which used to
    // leave visitors on the sign-up screen instead of the new-password form.
    if (
      typeof window !== "undefined" &&
      window.location.hash.includes("type=recovery")
    ) {
      setView("reset");
    }
    // Subscribe BEFORE asking for the session, so the recovery event (and
    // the initial session) reaches this listener instead of firing early.
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        if (sessionUser) {
          await loadProfile(sessionUser.id);
        } else {
          setProfile(null);
        }
        // A password-reset link was tapped: show the new-password form.
        if (event === "PASSWORD_RECOVERY") {
          setView("reset");
        }
      }
    );
    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) await loadProfile(sessionUser.id);
      setAuthLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  async function handleSignOut() {
    await getSupabase().auth.signOut();
    setProfile(null);
    setUser(null);
    setView("home");
  }

  function handleProfileReady(newProfile: Profile) {
    setProfile(newProfile);
    setView(newProfile.role === "provider" ? "provider" : "home");
  }

  function goAuth() {
    setAuthInitialMode("signin");
    setView("auth");
  }

  function handleResetDone() {
    setAuthInitialMode("signin");
    setView("auth");
  }

  // Signed in but no profile row yet (e.g. confirmed email first):
  // the auth panel becomes a "finish your profile" step.
  const needsProfile = Boolean(user && !profile);

  return (
    <>
      <header className="topbar">
        <button type="button" className="brand" onClick={() => setView("home")}>
          Get <span>in</span>
        </button>
        <nav className="nav">
          <button
            type="button"
            className={view === "home" ? "nav-btn active" : "nav-btn"}
            onClick={() => setView("home")}
          >
            Find openings
          </button>
          {profile?.role === "provider" && (
            <button
              type="button"
              className={view === "provider" ? "nav-btn active" : "nav-btn"}
              onClick={() => setView("provider")}
            >
              Provider dashboard
            </button>
          )}
          {profile?.role === "client" && (
            <button
              type="button"
              className={view === "bookings" ? "nav-btn active" : "nav-btn"}
              onClick={() => setView("bookings")}
            >
              My bookings
            </button>
          )}
          {user ? (
            <>
              <span className="nav-user">
                {profile?.display_name || user.email}
              </span>
              <button type="button" className="nav-btn" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              className={view === "auth" ? "nav-btn active" : "nav-btn"}
              onClick={goAuth}
            >
              Sign in
            </button>
          )}
        </nav>
      </header>

      <main className="main">
        {!supabaseConfigured && (
          <div className="setup-note">
            <strong>This website is not connected yet.</strong>
            <p>
              The owner needs to add two settings in Vercel —{" "}
              <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — and redeploy. See
              DEPLOY.md in the project folder.
            </p>
          </div>
        )}

        {authLoading ? (
          <p className="muted center">Loading Get in…</p>
        ) : view === "auth" || needsProfile ? (
          <AuthPanel
            key={authInitialMode}
            initialMode={authInitialMode}
            user={user}
            profile={profile}
            onProfileReady={handleProfileReady}
            onNavigateHome={() => setView("home")}
          />
        ) : view === "provider" ? (
          profile?.role === "provider" ? (
            <ProviderDashboard profile={profile} />
          ) : (
            <div className="card">
              <h2>Provider dashboard</h2>
              <p>
                This page is for provider accounts. Your account is a client
                account.
              </p>
              <button type="button" className="btn-primary" onClick={() => setView("home")}>
                Back to search
              </button>
            </div>
          )
        ) : view === "bookings" ? (
          profile ? (
            <MyBookings profile={profile} />
          ) : (
            <AuthPanel
              key={authInitialMode}
              initialMode={authInitialMode}
              user={user}
              profile={profile}
              onProfileReady={handleProfileReady}
              onNavigateHome={() => setView("home")}
            />
          )
        ) : view === "privacy" ? (
          <PrivacyPage />
        ) : view === "delete" ? (
          <DeleteAccountPage />
        ) : view === "reset" ? (
          <ResetPasswordPanel onDone={handleResetDone} />
        ) : (
          <ClientSearch profile={profile} onNeedSignIn={goAuth} />
        )}
      </main>

      <footer className="footer">
        <p>
          Get in — beauty openings near you. Clients are always free.
        </p>
        <p>
          <button type="button" className="link" onClick={() => setView("privacy")}>
            Privacy Policy
          </button>
          <button type="button" className="link" onClick={() => setView("delete")}>
            Delete Your Account
          </button>
        </p>
      </footer>
    </>
  );
}
