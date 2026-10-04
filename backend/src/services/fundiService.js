const { getSupabase } = require("../config/supabase");
const { fullName } = require("../controllers/authController");

const PUBLIC_FIELDS = [
  "id", "firstName", "lastName", "role", "skills", "location", "locationLabel", "address",
  "district", "country", "experience", "bio", "profilePhoto", "status",
  "serviceRadius", "availableDays", "availableStartTime", "availableEndTime",
  "onboardingComplete", "created_at",
];

// Skills live on both `users` and `fundiprofiles` and arrive in mixed case
// ("plumbing" from onboarding, "Plumbing" from seeding). Merge + normalise so
// a category filter can never miss a match on casing alone.
function normaliseSkills(user, profile) {
  const fromUser = Array.isArray(user?.skills) ? user.skills : [];
  const fromProfile = Array.isArray(profile?.skills) ? profile.skills : [];
  return [...new Set(
    [...fromUser, ...fromProfile]
      .map((s) => String(s || "").trim())
      .filter(Boolean),
  )];
}

function toFundi(user, profile, { includePortfolio = false } = {}) {
  const base = {};
  PUBLIC_FIELDS.forEach((key) => {
    if (user[key] !== undefined) base[key] = user[key];
  });
  const portfolioImages = [
    ...new Set([
      ...(Array.isArray(user.portfolioImages) ? user.portfolioImages : []),
      ...(Array.isArray(profile?.portfolioImages) ? profile.portfolioImages : []),
    ]),
  ];
  return {
    ...base,
    name: fullName(user),
    skills: normaliseSkills(user, profile),
    // Photos are base64 and can be megabytes — only the profile detail sends them.
    ...(includePortfolio ? { portfolioImages } : {}),
    phone: undefined, // never expose phone numbers to clients
    rating: Number(profile?.rating ?? 0),
    reviewCount: Number(profile?.jobsCompleted ?? 0),
    verified: Boolean(profile?.verified),
    verificationStatus: profile?.verificationStatus || "unverified",
    isAvailable: profile?.isAvailable !== false,
  };
}

// {0,0} is the column default, i.e. "this fundi has never shared a location".
function hasCoords(loc) {
  if (!loc || typeof loc !== "object") return false;
  const lat = Number(loc.lat);
  const lng = Number(loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function distanceKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function matchesCategory(skills, category) {
  const wanted = String(category || "").trim().toLowerCase();
  if (!wanted) return true;
  return (skills || []).some((s) => String(s).trim().toLowerCase() === wanted);
}

// Matches the free-text "Preferred Location" a client typed on their request
// against the area each fundi says they cover. GPS labels arrive comma
// separated ("Nakawa, Kampala, Uganda") — any part of the client's area that
// appears in a fundi's area counts as a match.
function matchesArea(fundi, area) {
  const parts = String(area || "")
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  if (!parts.length) return true;
  const fields = [fundi.locationLabel, fundi.address, fundi.district]
    .map((field) => String(field || "").toLowerCase());
  return fields.some((field) => parts.some((part) => field.includes(part)));
}

async function listFundis({ lat, lng, radius, category, area } = {}) {
  const supabase = getSupabase();
  const [{ data, error }, { data: profiles, error: profileError }] = await Promise.all([
    supabase.from("users").select("*").eq("role", "fundi").eq("status", "active"),
    supabase.from("fundiprofiles").select("*"),
  ]);
  if (error) throw error;
  if (profileError) throw profileError;

  const byUser = new Map((profiles || []).map((p) => [p.userId, p]));
  let rows = (data || []).map((u) => toFundi(u, byUser.get(u.id)));

  if (category) {
    rows = rows.filter((f) => matchesCategory(f.skills, category));
  }

  if (area) {
    rows = rows.filter((f) => matchesArea(f, area));
  }

  const hasOrigin =
    lat !== undefined && lat !== null && lat !== "" &&
    lng !== undefined && lng !== null && lng !== "";

  if (hasOrigin) {
    const origin = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const maxKm = parseFloat(radius) || 10;

    if (Number.isFinite(origin.lat) && Number.isFinite(origin.lng)) {
      rows = rows
        .filter((f) => hasCoords(f.location))
        .map((f) => {
          const km = distanceKm(origin, { lat: Number(f.location.lat), lng: Number(f.location.lng) });
          const ownRadius = Number(f.serviceRadius);
          // A fundi only receives jobs inside the radius they signed up for.
          const willing = !Number.isFinite(ownRadius) || ownRadius <= 0 || km <= ownRadius;
          return { ...f, distanceKm: Math.round(km * 10) / 10, _willing: willing };
        })
        .filter((f) => f.distanceKm <= maxKm && f._willing)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .map(({ _willing, ...f }) => f);
    }
  } else {
    rows.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  return rows;
}

async function getFundi(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .eq("role", "fundi")
    .limit(1);
  if (error) throw error;
  const user = data && data[0];
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("fundiprofiles")
    .select("*")
    .eq("userId", id)
    .limit(1);
  if (profileError) throw profileError;

  return toFundi(user, (profile || [])[0], { includePortfolio: true });
}

module.exports = { listFundis, getFundi, toFundi, distanceKm, hasCoords, matchesCategory, matchesArea, normaliseSkills };
