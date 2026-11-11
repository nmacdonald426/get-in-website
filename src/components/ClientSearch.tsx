"use client";

import { useState } from "react";
import { getSupabase } from "../lib/supabase";
import {
  currentLocation,
  directionsUrl,
  distanceMiles,
  geocodeAddress,
  type LatLng,
} from "../lib/geo";
import {
  SERVICES,
  discountPercent,
  formatDate,
  formatPrice,
  formatTime,
  isoPlusDays,
  todayIso,
  type Opening,
  type Profile,
} from "../lib/types";

interface ClientSearchProps {
  profile: Profile | null;
  onNeedSignIn: () => void;
}

interface SearchResult extends Opening {
  distance: number;
  providerName: string;
  providerAddress: string;
}

export default function ClientSearch({ profile, onNeedSignIn }: ClientSearchProps) {
  const [address, setAddress] = useState("");
  const [radius, setRadius] = useState(25);
  const [service, setService] = useState("any");
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(isoPlusDays(14));
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [claimMessage, setClaimMessage] = useState("");
  const [claimName, setClaimName] = useState("");
  const [claimPhone, setClaimPhone] = useState("");
  const [claimTarget, setClaimTarget] = useState<SearchResult | null>(null);

  async function runSearch(from: LatLng, label: string) {
    setBusy(true);
    setError("");
    setClaimMessage("");
    try {
      const supabase = getSupabase();
      const { data, error: fetchError } = await supabase
        .from("openings")
        .select(
          "*, providers!inner(business_name, display_address, lat, lng, categories)"
        )
        .eq("status", "open")
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });
      if (fetchError) throw new Error(fetchError.message);

      const rows = (data ?? []) as Opening[];
      const matched: SearchResult[] = [];
      for (const row of rows) {
        if (service !== "any" && row.service !== service) continue;
        const provider = row.providers;
        if (!provider) continue;
        const miles = distanceMiles(from, { lat: provider.lat, lng: provider.lng });
        if (miles > radius) continue;
        matched.push({
          ...row,
          distance: miles,
          providerName: provider.business_name,
          providerAddress: provider.display_address || provider.address,
        });
      }
      matched.sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.start_time.localeCompare(b.start_time) ||
          a.distance - b.distance
      );
      setResults(matched);
      setSearched(true);
      if (matched.length === 0) {
        setError(
          `No open appointments found near ${label} in the next ${radius} miles for those dates. Try a wider radius or different dates.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search did not work. Please try again.");
      setResults([]);
      setSearched(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) {
      setError("Please enter an address or town first.");
      return;
    }
    setBusy(true);
    setError("");
    const coords = await geocodeAddress(address.trim());
    if (!coords) {
      setBusy(false);
      setError(
        "We could not find that address. Check the spelling, or try just the town and state."
      );
      return;
    }
    await runSearch(coords, address.trim());
  }

  async function handleUseMyLocation() {
    setBusy(true);
    setError("");
    try {
      const coords = await currentLocation();
      setAddress("Your current location");
      await runSearch(coords, "your location");
    } catch (err) {
      setBusy(false);
      setError(
        err instanceof Error
          ? err.message + " You can type an address instead."
          : "Location did not work. You can type an address instead."
      );
    }
  }

  function startClaim(opening: SearchResult) {
    if (!profile) {
      onNeedSignIn();
      return;
    }
    if (profile.role !== "client") {
      setClaimMessage(
        "This account is a provider account. Claiming needs a client account — sign in with a client account, or create one."
      );
      return;
    }
    setClaimName(profile.display_name || "");
    setClaimPhone(profile.phone || "");
    setClaimTarget(opening);
    setClaimMessage("");
  }

  async function confirmClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!claimTarget || !profile) return;
    if (!claimName.trim() || !claimPhone.trim()) {
      setClaimMessage("Please add your name and phone so the provider can reach you.");
      return;
    }
    setClaimingId(claimTarget.id);
    setClaimMessage("");
    const supabase = getSupabase();
    try {
      // The database only allows one claim per opening, so if someone
      // else claimed it a moment ago this insert fails — and we say so.
      const { error: claimError } = await supabase.from("claims").insert({
        opening_id: claimTarget.id,
        client_id: profile.id,
        client_name: claimName.trim(),
        client_phone: claimPhone.trim(),
      });
      if (claimError) {
        if (
          claimError.message.includes("duplicate") ||
          claimError.code === "23505"
        ) {
          setClaimMessage(
            "Sorry — this opening was just claimed by someone else. Please pick another one."
          );
        } else {
          setClaimMessage("Claiming did not work: " + claimError.message);
        }
        return;
      }
      await supabase
        .from("openings")
        .update({ status: "claimed" })
        .eq("id", claimTarget.id);
      setClaimedIds((prev) => new Set(prev).add(claimTarget.id));
      setResults((prev) =>
        (prev ?? []).filter((r) => r.id !== claimTarget.id)
      );
      setClaimTarget(null);
      setClaimMessage(
        `Booked! ${claimTarget.providerName} on ${formatDate(claimTarget.date)} at ${formatTime(claimTarget.start_time)}. The provider will reach you at ${claimPhone.trim()}.`
      );
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <section>
      <div className="hero">
        <p className="script">Hello Gorgeous</p>
        <h1>Find a beauty opening near you</h1>
        <p className="muted">
          When salons have a slow hour, they post it here. You book it — often
          for less.
        </p>
      </div>

      <form className="card search-card" onSubmit={handleSearch}>
        <div className="field">
          <label htmlFor="search-address">Your address or town</label>
          <input
            id="search-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Hannibal, NY"
            autoComplete="street-address"
          />
          <button
            type="button"
            className="link"
            onClick={handleUseMyLocation}
            disabled={busy}
          >
            Use my current location instead
          </button>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="search-radius">How far you will travel</label>
            <select
              id="search-radius"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            >
              {[5, 10, 15, 20, 25, 30, 40, 50].map((m) => (
                <option key={m} value={m}>
                  {m} miles
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="search-service">Service</label>
            <select
              id="search-service"
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              <option value="any">Any service</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="search-from">From</label>
            <input
              id="search-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="search-to">To</label>
            <input
              id="search-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Searching…" : "Find openings"}
        </button>
        {error && <p className="error">{error}</p>}
        {claimMessage && <p className="success">{claimMessage}</p>}
      </form>

      {claimTarget && (
        <div className="card claim-sheet">
          <h3>Claim this opening?</h3>
          <p>
            <strong>{claimTarget.title}</strong> — {claimTarget.providerName}
            <br />
            {formatDate(claimTarget.date)} · {formatTime(claimTarget.start_time)} –{" "}
            {formatTime(claimTarget.end_time)}
            <br />
            {claimTarget.providerAddress} · {claimTarget.distance.toFixed(1)} miles away
          </p>
          <form onSubmit={confirmClaim}>
            <div className="field">
              <label htmlFor="claim-name">Your name</label>
              <input
                id="claim-name"
                type="text"
                required
                value={claimName}
                onChange={(e) => setClaimName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="claim-phone">Your phone</label>
              <input
                id="claim-phone"
                type="tel"
                required
                value={claimPhone}
                onChange={(e) => setClaimPhone(e.target.value)}
              />
            </div>
            <div className="btn-row">
              <button
                type="submit"
                className="btn-primary"
                disabled={claimingId === claimTarget.id}
              >
                {claimingId === claimTarget.id ? "Claiming…" : "Claim it"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setClaimTarget(null)}
              >
                Not now
              </button>
            </div>
          </form>
        </div>
      )}

      {searched && results && results.length > 0 && (
        <div className="results">
          <h2>
            {results.length} opening{results.length === 1 ? "" : "s"} found
          </h2>
          {results.map((opening) => {
            const pct = discountPercent(
              opening.regular_price_cents,
              opening.deal_price_cents
            );
            const price =
              opening.deal_price_cents !== null
                ? opening.deal_price_cents
                : opening.regular_price_cents;
            return (
              <article key={opening.id} className="card opening-card">
                <div className="opening-top">
                  <div>
                    <h3>{opening.title}</h3>
                    <p className="muted">
                      {opening.providerName} · {opening.service}
                    </p>
                  </div>
                  {pct !== null && (
                    <span className="badge">{pct}% OFF</span>
                  )}
                </div>
                <p>
                  {formatDate(opening.date)} · {formatTime(opening.start_time)} –{" "}
                  {formatTime(opening.end_time)}
                </p>
                <p className="muted">
                  {opening.providerAddress} · {opening.distance.toFixed(1)} miles
                </p>
                <p className="price">
                  <strong>{formatPrice(price)}</strong>{" "}
                  {opening.deal_price_cents !== null && (
                    <span className="old-price">
                      {formatPrice(opening.regular_price_cents)}
                    </span>
                  )}
                </p>
                {opening.note && <p className="muted">{opening.note}</p>}
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => startClaim(opening)}
                    disabled={claimedIds.has(opening.id)}
                  >
                    {claimedIds.has(opening.id) ? "Claimed ✓" : "Claim this opening"}
                  </button>
                  <a
                    className="btn-secondary"
                    href={directionsUrl(opening.providerAddress)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Directions
                  </a>
                </div>
                {!profile && (
                  <p className="muted small">
                    Claiming needs a free client account — you will be asked to
                    sign in first.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {searched && results && results.length === 0 && !error && (
        <p className="muted center">No openings matched. Try a wider radius or different dates.</p>
      )}
    </section>
  );
}
