// Types that match the Supabase tables created in Phase 1 exactly.
// Prices are stored in cents in the database ($60 = 6000) and shown in
// dollars on the screen.

export const SERVICES = [
  "hair",
  "facials",
  "nails",
  "brows & lashes",
  "massage",
  "makeup",
  "barbering",
] as const;

export type Service = (typeof SERVICES)[number];

export interface Profile {
  id: string;
  role: "provider" | "client";
  display_name: string;
  phone: string;
}

export interface Provider {
  id: string;
  owner_id: string;
  business_name: string;
  contact_name: string;
  phone: string;
  address: string;
  display_address: string;
  lat: number;
  lng: number;
  categories: string[];
  note: string;
  subscription_status: string;
}

export interface Opening {
  id: string;
  provider_id: string;
  service: string;
  title: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  regular_price_cents: number;
  deal_price_cents: number | null;
  note: string;
  status: "open" | "claimed" | "cancelled" | "completed";
  providers?: Provider | null;
}

export interface Claim {
  id: string;
  opening_id: string;
  client_id: string;
  client_name: string;
  client_phone: string;
  status: string;
  created_at: string;
  openings?: Opening | null;
}

export function dollarsToCents(dollars: string): number {
  const n = Number.parseFloat(dollars);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

export function formatPrice(cents: number): string {
  return "$" + centsToDollars(cents);
}

/** Whole-number discount percent, e.g. 25 for 25% off. Null when no deal. */
export function discountPercent(
  regularCents: number,
  dealCents: number | null
): number | null {
  if (dealCents === null || dealCents >= regularCents || regularCents <= 0) {
    return null;
  }
  return Math.round((1 - dealCents / regularCents) * 100);
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function formatDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function todayIso(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function isoPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
