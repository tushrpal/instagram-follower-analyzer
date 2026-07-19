import JSZip from "jszip";
import { filterDeletedAccounts, isDeletedAccount } from "./instagramExport";

// ── Field extractors ──────────────────────────────────────────────────────────

function extractUsername(item) {
  if (!item || typeof item !== "object") return null;
  const sld = item.string_list_data?.[0];
  if (sld?.value) return sld.value;
  if (item.title) return item.title;
  if (Array.isArray(item.label_values)) {
    const e = item.label_values.find((lv) => lv.label === "Username");
    if (e?.value) return e.value;
  }
  return item.value || item.username || null;
}

function extractTimestamp(item) {
  if (!item || typeof item !== "object") return null;
  const sld = item.string_list_data?.[0];
  if (sld && (sld.timestamp || sld.timestamp === 0)) return sld.timestamp;
  return item.timestamp ?? null;
}

function extractUrl(item) {
  if (!item || typeof item !== "object") return null;
  const sld = item.string_list_data?.[0];
  if (sld?.href) return sld.href;
  if (item.href) return item.href;
  if (Array.isArray(item.label_values)) {
    const e = item.label_values.find((lv) => lv.label === "URL");
    if (e?.value) return e.value;
  }
  return null;
}

function extractDisplayName(item) {
  if (!item || typeof item !== "object") return null;
  if (Array.isArray(item.label_values)) {
    const e = item.label_values.find((lv) => lv.label === "Name");
    if (e?.value) return e.value;
  }
  return null;
}

function tryParseJson(content) {
  const s = typeof content === "string" ? content.trim() : "";
  if (!s) return null;
  try { return JSON.parse(s); } catch {}
  const idx = s.search(/[{[]/);
  if (idx !== -1) {
    try { return JSON.parse(s.slice(idx)); } catch {}
  }
  return null;
}

function normalizeList(list) {
  const seen = new Map();
  for (const item of list) {
    const u = extractUsername(item);
    if (!u) continue;
    const ts = extractTimestamp(item) || 0;
    if (!seen.has(u) || (seen.get(u).ts || 0) > ts) seen.set(u, { item, ts });
  }
  return Array.from(seen.values())
    .sort((a, b) => a.ts - b.ts)
    .map((v) => v.item);
}

// ── ZIP parser ────────────────────────────────────────────────────────────────

const RELATIONSHIP_MAP = {
  "close_friends.json": "close_friend",
  "blocked_profiles.json": "blocked",
  "hide_story_from.json": "hidden_story",
  "restricted_profiles.json": "restricted",
  "profiles_you've_favorited.json": "favorited",
  "removed_suggestions.json": "removed_suggestion",
  "follow_requests_you've_received.json": "received_request",
  "recent_follow_requests.json": "recent_request",
};

const BINARY_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".woff", ".woff2", ".ttf"]);

async function processFile(filename, file, out) {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (BINARY_EXTS.has(ext)) return;

  const content = await file.async("string");
  const data = tryParseJson(content);
  if (!data) return;

  const basename = filename.split("/").pop().toLowerCase();

  if (basename.startsWith("followers_") && basename.endsWith(".json") && Array.isArray(data)) {
    out.followers.push(...data.filter(extractUsername));
  }

  if (basename === "following.json") {
    const raw = Array.isArray(data) ? data
      : data?.relationships_following ?? data?.following ?? [];
    out.following.push(...raw.filter(extractUsername));
  }

  if (basename === "pending_follow_requests.json") {
    const raw = Array.isArray(data) ? data : (data?.relationships_follow_requests_sent || []);
    out.pendingRequests.push(...raw.filter(extractUsername));
  }

  if (basename === "recently_unfollowed_profiles.json") {
    const raw = Array.isArray(data) ? data : (data?.relationships_unfollowed_users || []);
    out.unfollowedProfiles.push(
      ...raw.filter(extractUsername).map((item) => ({
        username: extractUsername(item),
        href: extractUrl(item),
        timestamp: extractTimestamp(item),
      }))
    );
  }

  const listType = RELATIONSHIP_MAP[basename];
  if (listType) {
    const entries = Array.isArray(data) ? data : [data];
    out.relationshipProfiles.push(
      ...entries
        .filter((item) => item && typeof item === "object" && extractUsername(item))
        .map((item) => ({
          username: extractUsername(item),
          displayName: extractDisplayName(item),
          listType,
          profileUrl: extractUrl(item),
          fbid: item.fbid || null,
          timestamp: extractTimestamp(item),
        }))
    );
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function parseAndAnalyzeZip(file, onProgress) {
  onProgress("Reading ZIP file…");

  const arrayBuffer = await file.arrayBuffer();
  const zip = new JSZip();
  const zipContents = await zip.loadAsync(arrayBuffer);

  onProgress("Parsing follower data files…");

  const raw = { followers: [], following: [], pendingRequests: [], unfollowedProfiles: [], relationshipProfiles: [] };

  await Promise.all(
    Object.entries(zipContents.files)
      .filter(([, f]) => !f.dir)
      .map(([name, f]) => processFile(name, f, raw))
  );

  onProgress("Normalizing data…");

  raw.followers = normalizeList(raw.followers);
  raw.following = normalizeList(raw.following);
  raw.pendingRequests = normalizeList(raw.pendingRequests);
  raw.unfollowedProfiles = raw.unfollowedProfiles.filter(
    (p) => !isDeletedAccount(p.username, p.href)
  );

  const exportFollowersCount = raw.followers.length;
  const exportFollowingCount = raw.following.length;

  const followersFiltered = filterDeletedAccounts(raw.followers, extractUsername, extractUrl);
  const followingFiltered = filterDeletedAccounts(raw.following, extractUsername, extractUrl);
  raw.followers = followersFiltered.active;
  raw.following = followingFiltered.active;

  if (!raw.followers.length && !raw.following.length && !raw.pendingRequests.length) {
    throw new Error("No valid Instagram data found in the ZIP. Make sure you exported 'Followers and Following' in JSON format.");
  }

  onProgress(`Analyzing ${raw.followers.length} followers and ${raw.following.length} following…`);

  const followerSet = new Set(raw.followers.map(extractUsername));
  const followingSet = new Set(raw.following.map(extractUsername));

  const mutual = [], followersOnly = [], followingOnly = [];

  for (const f of raw.followers) {
    const u = extractUsername(f);
    const ts = extractTimestamp(f) || null;
    (followingSet.has(u) ? mutual : followersOnly).push({ username: u, href: extractUrl(f) || `https://www.instagram.com/${u}/`, timestamp: ts });
  }
  for (const f of raw.following) {
    const u = extractUsername(f);
    if (!followerSet.has(u)) followingOnly.push({ username: u, href: extractUrl(f) || `https://www.instagram.com/${u}/`, timestamp: extractTimestamp(f) || null });
  }

  const pendingRequests = raw.pendingRequests.map((item) => ({
    username: extractUsername(item),
    profileUrl: extractUrl(item) || null,
    requestDate: extractTimestamp(item) ? new Date(extractTimestamp(item) * 1000).toISOString() : null,
    status: "Pending",
  }));

  onProgress("Done!");

  return {
    summary: {
      totalFollowers: raw.followers.length,
      totalFollowing: raw.following.length,
      exportFollowersCount,
      exportFollowingCount,
      deletedFollowersCount: followersFiltered.deletedCount,
      deletedFollowingCount: followingFiltered.deletedCount,
      mutualCount: mutual.length,
      followersOnlyCount: followersOnly.length,
      followingOnlyCount: followingOnly.length,
      pendingRequestsCount: pendingRequests.length,
      unfollowedCount: raw.unfollowedProfiles.length,
    },
    mutual,
    followersOnly,
    followingOnly,
    pendingRequests,
    unfollowedProfiles: raw.unfollowedProfiles,
    relationshipProfiles: raw.relationshipProfiles,
  };
}
