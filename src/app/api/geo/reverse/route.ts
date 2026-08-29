import { NextResponse } from "next/server";

/** Reverse-geocode lat/lng via OpenStreetMap Nominatim (no API key). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "TheCraftedHome/1.0 (checkout location; jiacraft.com)",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Could not reverse-geocode location" },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = data.address || {};

    const line1 = [a.house_number, a.road || a.pedestrian || a.residential]
      .filter(Boolean)
      .join(" ")
      .trim();

    return NextResponse.json({
      lat,
      lon,
      displayName: data.display_name || "",
      address: {
        shippingAddress: line1 || a.suburb || a.neighbourhood || "",
        shippingCity: a.city || a.town || a.village || a.suburb || "",
        shippingState: a.state || a.region || "",
        shippingZip: a.postcode || "",
        shippingCountry: a.country_code
          ? a.country_code.toUpperCase()
          : a.country || "",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
