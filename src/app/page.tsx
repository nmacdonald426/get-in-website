"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "../lib/supabase";
import type { Profile } from "../lib/types";
import AuthPanel from "../components/AuthPanel";
import ClientSearch from "../components/ClientSearch";
import MyBookings from "../components/MyBookings";
import ProviderDashboard from "../components/ProviderDashboard";
import { DeleteAccountPage, PrivacyPage } from "../components/StaticPages";

type View = "home" | "auth" | "provider" | "bookings" | "privacy" | "delete";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<View>("home");
  const [authLoading, setAuthLoading] = useState(true);

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
    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) await loadProfile(sessionUser.id);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        if (sessionUser) {
          await loadProfile(sessionUser.id);
        } else {
          setProfile(null);
        }
      }
    );
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
