function analyzeFollowers(followersData, followingData) {
  console.log("🔍 Starting follower analysis...");

  // Extract usernames from the data structures
  const followers = extractUsers(followersData);
  const following = extractUsers(followingData);

  // // Debug: print usernames
  // console.log(
  //   "Followers:",
  //   followers.map((f) => f.value || f.username)
  // );
  // console.log(
  //   "Following:",
  //   following.map((f) => f.value || f.username)
  // );

  console.log(
    `📊 Found ${followers.length} followers and ${following.length} following`
  );

  // Create sets for efficient lookup
  const followerUsernames = new Set(
    followers.map((f) => f.value || f.username)
  );
  const followingUsernames = new Set(
    following.map((f) => f.value || f.username)
  );

  // Analyze relationships
  const mutual = [];
  const followersOnly = [];
  const followingOnly = [];

  // Find mutual followers
  followers.forEach((follower) => {
    const username = follower.value || follower.username;
    if (followingUsernames.has(username)) {
      mutual.push(follower);
    } else {
      followersOnly.push(follower);
    }
  });

  // Find following only (people you follow but don't follow you back)
  following.forEach((followedUser) => {
    const username = followedUser.value || followedUser.username;
    if (!followerUsernames.has(username)) {
      followingOnly.push(followedUser);
    }
  });

  console.log(
    `✅ Analysis complete: ${mutual.length} mutual, ${followersOnly.length} followers only, ${followingOnly.length} following only`
  );

  const timelineAnalysis = analyzeUserTimeline(followersData, followingData);

  return {
    followers,
    following,
    mutual,
    followersOnly,
    followingOnly,
    timeline: timelineAnalysis, // Add timeline data to the response
  };
}

function extractUsers(data) {
  // Handle different Instagram export formats
  if (Array.isArray(data)) {
    return flattenStringListData(data);
  }

  // Some exports have the data nested under different keys
  if (data.relationships_followers) {
    return flattenStringListData(data.relationships_followers);
  }

  if (data.relationships_following) {
    return flattenStringListData(data.relationships_following);
  }

  // Look for any array property
  for (const key in data) {
    if (Array.isArray(data[key])) {
      return flattenStringListData(data[key]);
    }
  }

  console.warn("Unexpected data structure:", data);
  return [];
}

function flattenStringListData(userArray) {
  if (!Array.isArray(userArray)) {
    return [];
  }

  return userArray
    .map((user) => {
      // Skip null or undefined entries
      if (!user || typeof user !== "object") {
        return null;
      }

      // Handle new format with string_list_data
      if (user.string_list_data && Array.isArray(user.string_list_data)) {
        // Handle cases where string_list_data might be empty or have multiple entries
        if (user.string_list_data.length === 0) {
          console.warn("Empty string_list_data found, skipping entry");
          return null;
        }

        // For multiple entries, we'll take the first one (most common case)
        // but log a warning so users know
        if (user.string_list_data.length > 1) {
          console.warn(
            "Multiple entries in string_list_data, using first entry"
          );
        }

        const stringData = user.string_list_data[0];

        // Skip if the string data entry is null or missing required fields
        if (
          !stringData ||
          typeof stringData !== "object" ||
          !stringData.value
        ) {
          console.warn("Invalid or missing string_list_data entry, skipping");
          return null;
        }

        return {
          value: stringData.value,
          username: stringData.value, // For backward compatibility
          href: stringData.href,
          timestamp: stringData.timestamp,
        };
      }

      // Handle old format - user already has value/username directly
      // Skip if missing required username field
      if (!user.value && !user.username) {
        console.warn("User entry missing username/value field, skipping");
        return null;
      }

      return user;
    })
    .filter((user) => user !== null); // Remove null entries
}

// Add these new functions after the existing code
function analyzeUserTimeline(followersData, followingData) {
  const timelineData = {
    followEvents: [],
    unfollowEvents: [],
    engagementPatterns: [],
  };

  // Process followers timeline
  followersData.forEach((follower) => {
    const timestamp = follower.string_list_data?.[0]?.timestamp || null;
    if (timestamp) {
      timelineData.followEvents.push({
        type: "follow",
        username: follower.string_list_data[0].value,
        timestamp: new Date(timestamp),
        direction: "follower",
      });
    }
  });

  // Process following timeline
  followingData.forEach((following) => {
    const timestamp = following.string_list_data?.[0]?.timestamp || null;
    if (timestamp) {
      timelineData.followEvents.push({
        type: "follow",
        username: following.string_list_data[0].value,
        timestamp: new Date(timestamp),
        direction: "following",
      });
    }
  });

  // Sort events chronologically
  timelineData.followEvents.sort((a, b) => a.timestamp - b.timestamp);

  // Analyze follow/unfollow patterns
  const patterns = analyzeFollowPatterns(timelineData.followEvents);
  timelineData.engagementPatterns = patterns;

  return timelineData;
}

function analyzeFollowPatterns(events) {
  const patterns = [];
  const timeWindows = {
    daily: {},
    weekly: {},
    monthly: {},
  };

  events.forEach((event) => {
    const date = event.timestamp;
    const dayKey = date.toISOString().split("T")[0];
    const weekKey = getWeekNumber(date);
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

    // Track daily patterns
    timeWindows.daily[dayKey] = timeWindows.daily[dayKey] || {
      follows: 0,
      unfollows: 0,
    };
    timeWindows.daily[dayKey][
      event.type === "follow" ? "follows" : "unfollows"
    ]++;

    // Track weekly patterns
    timeWindows.weekly[weekKey] = timeWindows.weekly[weekKey] || {
      follows: 0,
      unfollows: 0,
    };
    timeWindows.weekly[weekKey][
      event.type === "follow" ? "follows" : "unfollows"
    ]++;

    // Track monthly patterns
    timeWindows.monthly[monthKey] = timeWindows.monthly[monthKey] || {
      follows: 0,
      unfollows: 0,
    };
    timeWindows.monthly[monthKey][
      event.type === "follow" ? "follows" : "unfollows"
    ]++;
  });

  // Analyze growth rate
  const growthPatterns = calculateGrowthPatterns(timeWindows);
  patterns.push(...growthPatterns);

  return patterns;
}

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${weekNo}`;
}

function calculateGrowthPatterns(timeWindows) {
  const patterns = {};

  // Calculate daily growth rate
  const dailyGrowth = Object.entries(timeWindows.daily)
    .map(([date, data]) => ({
      date,
      netGrowth: data.follows - data.unfollows,
      total: data.follows + data.unfollows,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Identify rapid growth or decline periods
  let currentStreak = {
    type: null,
    start: null,
    duration: 0,
    netChange: 0,
  };

  dailyGrowth.forEach((day, index) => {
    if (Math.abs(day.netGrowth) > 10) {
      // Threshold for significant change
      patterns.push({
        date: day.date,
        type: day.netGrowth > 0 ? "rapid_growth" : "rapid_decline",
        change: day.netGrowth,
      });
    }
  });

  return patterns;
}

module.exports = {
  analyzeFollowers,
  analyzeUserTimeline, // Export the new function
};
