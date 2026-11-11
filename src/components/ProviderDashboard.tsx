"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";
import { geocodeAddress } from "../lib/geo";
import {
  SERVICES,
  discountPercent,
  dollarsToCents,
  formatDate,
  formatPrice,
  formatTime,
  todayIso,
  type Claim,
  type Opening,
  type Profile,
  type Provider,
} from "../lib/types";

interface ProviderDashboardProps {
  profile: Profile;
}

interface OpeningWithClaim extends Opening {
  claim: Claim | null;
}

export default function ProviderDashboard({ profile }: ProviderDashboardProps) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Profile form
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Opening form
  const [service, setService] = useState<string>("hair");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayIso());
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [regularPrice, setRegularPrice] = useState("");
  const [dealPrice, setDealPrice] = useState("");
  const [openingNote, setOpeningNote] = useState("");
  const [posting, setPosting] = useState(false);

  const [openings, setOpenings] = useState<OpeningWithClaim[]>([]);

  async function loadAll() {
    const supabase = getSupabase();
    const { data: providerData, error: providerError } = await supabase
      .from("providers")
      .select("*")
      .eq("owner_id", profile.id)
      .maybeSingle();
    if (providerError) {
      setError(providerError.message);
      setLoading(false);
      return;
    }
    const found = (providerData as Provider | null) ?? null;
    setProvider(found);
    if (found) {
      setBusinessName(found.business_name);
      setContactName(found.contact_name);
      setPhone(found.phone);
      setAddress(found.address);
      setCategories(found.categories ?? []);
      setNote(found.note ?? "");
      const { data: openingData } = await supabase
        .from("openings")
        .select("*")
        .eq("provider_id", found.id)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });
      const rows = (openingData ?? []) as Opening[];
      const withClaims: OpeningWithClaim[] = [];
      for (const row of rows) {
        const { data: claimData } = await supabase
          .from("claims")
          .select("*")
          .eq("opening_id", row.id)
          .maybeSingle();
        withClaims.push({ ...row, claim: (claimData as Claim | null) ?? null });
      }
      setOpenings(withClaims);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (categories.length === 0) {
      setError("Please pick at least one service you offer.");
      return;
    }
    setSavingProfile(true);
    try {
      const coords = await geocodeAddress(address.trim());
      if (!coords) {
        setError(
          "We could not find that address on the map. Check the spelling, or add the town and state."
        );
        return;
      }
      const supabase = getSupabase();
      const payload = {
        owner_id: profile.id,
        business_name: businessName.trim(),
        contact_name: contactName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        display_address: address.trim(),
        lat: coords.lat,
        lng: coords.lng,
        categories,
        note: note.trim(),
      };
      if (provider) {
        const { error: updateError } = await supabase
          .from("providers")
          .update(payload)
          .eq("id", provider.id);
        if (updateError) throw new Error(updateError.message);
        setMessage("Your business profile is saved.");
      } else {
        const { data, error: insertError } = await supabase
          .from("providers")
          .insert(payload)
          .select()
          .single();
        if (insertError) throw new Error(insertError.message);
        setProvider(data as Provider);
        setMessage("Your business profile is saved. Now post your first opening below.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving did not work. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePostOpening(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!provider) {
      setError("Save your business profile first.");
      return;
    }
    const regularCents = dollarsToCents(regularPrice);
    const dealCents = dealPrice.trim() === "" ? null : dollarsToCents(dealPrice);
    if (regularCents <= 0) {
      setError("Please enter a regular price above $0.");
      return;
    }
    if (dealCents !== null && dealCents >= regularCents) {
      setError("The deal price must be lower than the regular price.");
      return;
    }
    if (endTime <= startTime) {
      setError("The end time must be after the start time.");
      return;
    }
    setPosting(true);
    try {
      const supabase = getSupabase();
      const { error: insertError } = await supabase.from("openings").insert({
        provider_id: provider.id,
        service,
        title: title.trim() || `${service} appointment`,
        date,
        start_time: startTime,
        end_time: endTime,
        regular_price_cents: regularCents,
        deal_price_cents: dealCents,
        note: openingNote.trim(),
        status: "open",
      });
      if (insertError) throw new Error(insertError.message);
      setMessage("Your opening is posted — clients can now find and claim it.");
      setTitle("");
      setRegularPrice("");
      setDealPrice("");
      setOpeningNote("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Posting did not work. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function handleCancelOpening(opening: Opening) {
    const supabase = getSupabase();
    const { error: updateError } = await supabase
      .from("openings")
      .update({ status: "cancelled" })
      .eq("id", opening.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage("Opening cancelled. It will no longer show in search.");
    await loadAll();
  }

  if (loading) return <p className="muted center">Loading your dashboard…</p>;

  return (
    <section>
      <div className="hero">
        <p className="script">Hello Gorgeous</p>
        <h1>Your provider dashboard</h1>
        <p className="muted">
          Signed in as {profile.display_name || "provider"}. Post an opening
          when you have a slow hour, and clients nearby can claim it.
        </p>
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <div className="card">
        <h2>{provider ? "Your business profile" : "Set up your business profile"}</h2>
        <p className="muted">
          This is what clients see. Your address is used to work out how far
          away you are from each client.
        </p>
        <form onSubmit={handleSaveProfile}>
          <div className="field">
            <label htmlFor="biz-name">Business name</label>
            <input
              id="biz-name"
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Glow Studio"
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="contact-name">Your name</label>
              <input
                id="contact-name"
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="biz-phone">Phone</label>
              <input
                id="biz-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="biz-address">Salon address</label>
            <input
              id="biz-address"
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, town, state"
            />
          </div>
          <div className="field">
            <label>Services you offer</label>
            <div className="chip-row">
              {SERVICES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={categories.includes(s) ? "chip selected" : "chip"}
                  onClick={() => toggleCategory(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="biz-note">A short note for clients (optional)</label>
            <input
              id="biz-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Free parking behind the salon"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={savingProfile}>
            {savingProfile ? "Saving…" : provider ? "Save changes" : "Save my profile"}
          </button>
        </form>
      </div>

      {provider && (
        <div className="card">
          <h2>Post an opening</h2>
          <p className="muted">
            One opening is one empty slot. Clients see it soonest-first, with
            your distance and any discount.
          </p>
          <form onSubmit={handlePostOpening}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="opening-service">Service</label>
                <select
                  id="opening-service"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                >
                  {SERVICES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="opening-date">Date</label>
                <input
                  id="opening-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="opening-title">Title</label>
              <input
                id="opening-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Haircut and blow-dry"
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="opening-start">Starts</label>
                <input
                  id="opening-start"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="opening-end">Ends</label>
                <input
                  id="opening-end"
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="opening-regular">Regular price ($)</label>
                <input
                  id="opening-regular"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={regularPrice}
                  onChange={(e) => setRegularPrice(e.target.value)}
                  placeholder="60"
                />
              </div>
              <div className="field">
                <label htmlFor="opening-deal">Deal price ($) — optional</label>
                <input
                  id="opening-deal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={dealPrice}
                  onChange={(e) => setDealPrice(e.target.value)}
                  placeholder="45"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="opening-note">Note for clients (optional)</label>
              <input
                id="opening-note"
                type="text"
                value={openingNote}
                onChange={(e) => setOpeningNote(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={posting}>
              {posting ? "Posting…" : "Post this opening"}
            </button>
          </form>
        </div>
      )}

      {provider && (
        <div className="card">
          <h2>Your openings</h2>
          {openings.length === 0 ? (
            <p className="muted">
              No openings yet. Post your first one above and it will show here.
            </p>
          ) : (
            openings.map((opening) => {
              const pct = discountPercent(
                opening.regular_price_cents,
                opening.deal_price_cents
              );
              return (
                <article key={opening.id} className="opening-row">
                  <div>
                    <strong>{opening.title}</strong> · {opening.service}
                    <br />
                    <span className="muted">
                      {formatDate(opening.date)} · {formatTime(opening.start_time)} –{" "}
                      {formatTime(opening.end_time)} ·{" "}
                      {opening.deal_price_cents !== null
                        ? `${formatPrice(opening.deal_price_cents)} (was ${formatPrice(opening.regular_price_cents)})`
                        : formatPrice(opening.regular_price_cents)}
                      {pct !== null && ` · ${pct}% OFF`}
                    </span>
                    <br />
                    <span className={`status status-${opening.status}`}>
                      {opening.status}
                    </span>
                    {opening.claim && (
                      <span className="claim-line">
                        {" "}Claimed by {opening.claim.client_name} —{" "}
                        {opening.claim.client_phone}
                      </span>
                    )}
                  </div>
                  {opening.status === "open" && (
                    <button
                      type="button"
                      className="btn-secondary small"
                      onClick={() => handleCancelOpening(opening)}
                    >
                      Cancel
                    </button>
                  )}
                </article>
              );
            })
          )}
          <p className="muted small">
            Prices are shown in dollars here and stored safely in cents. In
            this test version there is no $9 monthly charge — that comes later.
          </p>
        </div>
      )}
    </section>
  );
}
