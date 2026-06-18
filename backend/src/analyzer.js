import * as db from "./db.js";

export async function analyzeFollowers(env, followersData, followingData, previousSessionId, currentSessionId = null) {
  const followers = extractUsers(followersData);
  const following = extractUsers(followingData);

  const followerUsernames = new Set(followers.map((f) => f.value || f.username));
  const followingUsernames = new Set(following.map((f) => f.value || f.username));

  const mutual = [], followersOnly = [], followingOnly = [];

  followers.forEach((follower) => {
    const username = follower.value || follower.username;
    if (followingUsernames.has(username)) mutual.push(follower);
    else followersOnly.push(follower);
  });

  following.forEach((followedUser) => {
    const username = followedUser.value || followedUser.username;
    if (!followerUsernames.has(username)) followingOnly.push(followedUser);
  });

  // Detect unfollowed profiles vs previous session
  if (previousSessionId && currentSessionId) {
    const previousUsers = await db.getUsers(env, previousSessionId, "following_only");
    const currentFollowingSet = new Set(following.map((f) => f.value || f.username));
    for (const prevUser of previousUsers) {
      if (!currentFollowingSet.has(prevUser.username)) {
        try {
          await db.addUnfollowedProfile(env, currentSessionId, prevUser.username, "following", prevUser.href, Math.floor(Date.now() / 1000), "detected");
        } catch {}
      }
    }
  }

  return { followers, following, mutual, followersOnly, followingOnly };
}

function extractUsers(data) {
  if (Array.isArray(data)) return flattenStringListData(data);
  if (data?.relationships_followers) return flattenStringListData(data.relationships_followers);
  if (data?.relationships_following) return flattenStringListData(data.relationships_following);
  for (const key in data) {
    if (Array.isArray(data[key])) return flattenStringListData(data[key]);
  }
  return [];
}

function flattenStringListData(userArray) {
  if (!Array.isArray(userArray)) return [];
  return userArray.map((user) => {
    if (!user || typeof user !== "object") return null;
    if (user.string_list_data && Array.isArray(user.string_list_data)) {
      const stringData = user.string_list_data[0] || {};
      const username = user.title || stringData.value || null;
      if (!username) return null;
      return { value: username, username, href: stringData.href || null, timestamp: stringData.timestamp || null };
    }
    if (Array.isArray(user.label_values)) {
      const usernameEntry = user.label_values.find((lv) => lv.label === "Username");
      const urlEntry = user.label_values.find((lv) => lv.label === "URL");
      const username = usernameEntry?.value || null;
      if (!username) return null;
      return { value: username, username, href: urlEntry?.value || null, timestamp: user.timestamp || null };
    }
    if (user.title) return { value: user.title, username: user.title, href: user.href || null, timestamp: user.timestamp || null };
    if (user.value || user.username) return { value: user.value || user.username, username: user.value || user.username, href: user.href || null, timestamp: user.timestamp || null };
    return null;
  }).filter(Boolean);
}
