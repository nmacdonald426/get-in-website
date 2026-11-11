"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";
import { directionsUrl } from "../lib/geo";
import {
  formatDate,
  formatPrice,
  formatTime,
  type Claim,
  type Profile,
} from "../lib/types";

interface MyBookingsProps {
  profile: Profile;
}

interface ClaimWithOpening extends Claim {
  openingTitle: string;
  openingDate: string;
  openingStart: string;
  openingEnd: string;
  openingPrice: number;
  providerName: string;
  providerAddress: string;
}

export default function MyBookings({ profile }: MyBookingsProps) {
  const [claims, setClaims] = useState<ClaimWithOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const supabase = getSupabase();
    const { data, error: fetchError } = await supabase
      .from("claims")
      .select(
        "*, openings!inner(title, date, start_time, end_time, regular_price_cents, deal_price_cents, providers!inner(business_name, display_address))"
      )
      .eq("client_id", profile.id)
      .order("created_at", { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as Array<
      Claim & {
        openings: {
          title: string;
          date: string;
          start_time: string;
          end_time: string;
          regular_price_cents: number;
          deal_price_cents: number | null;
          providers: { business_name: string; display_address: string };
        };
      }
    >;
    setClaims(
      rows.map((row) => ({
        ...row,
        openingTitle: row.openings.title,
        openingDate: row.openings.date,
        openingStart: row.openings.start_time,
        openingEnd: row.openings.end_time,
        openingPrice:
          row.openings.deal_price_cents ?? row.openings.regular_price_cents,
        providerName: row.openings.providers.business_name,
        providerAddress: row.openings.providers.display_address,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  async function handleCancel(claim: ClaimWithOpening) {
    const supabase = getSupabase();
    // Cancelling your claim frees the opening so someone else can book it.
    const { error: claimError } = await supabase
      .from("claims")
      .update({ status: "cancelled" })
      .eq("id", claim.id);
    if (claimError) {
      setError(claimError.message);
      return;
    }
    await supabase
      .from("openings")
      .update({ status: "open" })
      .eq("id", claim.opening_id);
    setMessage("Booking cancelled. The opening is free for someone else now.");
    await load();
  }

  if (loading) return <p className="muted center">Loading your bookings…</p>;

  return (
    <section>
      <div className="hero">
        <p className="script">Hello Gorgeous</p>
        <h1>My bookings</h1>
        <p className="muted">The appointments you have claimed, soonest first.</p>
      </div>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
      {claims.length === 0 ? (
        <div className="card">
          <p className="muted">
            You have not claimed anything yet. Find an opening on the home page
            and claim it in one tap.
          </p>
        </div>
      ) : (
        claims.map((claim) => (
          <article key={claim.id} className="card opening-card">
            <h3>{claim.openingTitle}</h3>
            <p className="muted">
              {claim.providerName} · {claim.providerAddress}
            </p>
            <p>
              {formatDate(claim.openingDate)} · {formatTime(claim.openingStart)} –{" "}
              {formatTime(claim.openingEnd)}
            </p>
            <p className="price">
              <strong>{formatPrice(claim.openingPrice)}</strong> ·{" "}
              <span className={`status status-${claim.status}`}>{claim.status}</span>
            </p>
            <div className="btn-row">
              <a
                className="btn-secondary"
                href={directionsUrl(claim.providerAddress)}
                target="_blank"
                rel="noreferrer"
              >
                Directions
              </a>
              {claim.status === "claimed" && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleCancel(claim)}
                >
                  Cancel booking
                </button>
              )}
            </div>
          </article>
        ))
      )}
    </section>
  );
}
