// Distance and address helpers for Get in.
// Client search is by straight-line distance from the address they type
// (or their current location) to the salon's saved coordinates.

export interface LatLng {
  lat: number;
  lng: number;
}

/** Miles between two points on the Earth (haversine formula). */
export function distanceMiles(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
}

/**
 * Turn a typed address into coordinates using OpenStreetMap's Nominatim
 * service, in the visitor's own browser. Returns null when the address
 * cannot be found.
 */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  // Ask for several matches and pick a real town or city, not a county.
  // "Fulton NY" on its own first returns Fulton County (near Albany),
  // about 100 miles from the City of Fulton — that hid every real
  // Fulton opening from search and put vague addresses in the wrong place.
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&countrycodes=us&q=" +
    encodeURIComponent(address);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data: Array<{
    lat: string;
    lon: string;
    addresstype?: string;
    address?: { postcode?: string };
  }> = await res.json();
  if (!data || data.length === 0) return null;
  // A real town or city has a postcode; counties and regions do not.
  // Fall back to a town/city/village type, then to the first result.
  const place =
    data.find((d) => Boolean(d.address?.postcode)) ??
    data.find((d) =>
      ["city", "town", "village", "hamlet", "municipality"].includes(
        d.addresstype ?? ""
      )
    ) ??
    data[0];
  return { lat: Number(place.lat), lng: Number(place.lon) };
}

/** The visitor's current location, when they allow it. */
export function currentLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("Location permission was not given.")),
      { timeout: 10000 }
    );
  });
}

/** Google Maps directions link for a salon address. */
export function directionsUrl(address: string): string {
  return (
    "https://www.google.com/maps/dir/?api=1&destination=" +
    encodeURIComponent(address)
  );
}
