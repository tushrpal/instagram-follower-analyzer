const { database } = require("../models/database");

/**
 * Analyzes Instagram followers and following data
 * @param {Object|Array} followersData - Raw followers data from Instagram
 * @param {Object|Array} followingData - Raw following data from Instagram
 * @param {string} previousSessionId - Previous session ID for comparison
 * @param {string} currentSessionId - Current session ID (optional, prevents duplicate DB operations)
 * @returns {Object} Analysis results including followers, following, mutual connections and timeline
 */
async function analyzeFollowers(
  followersData,
  followingData,
  previousSessionId,
  currentSessionId = null
) {
  console.log("🔍 Starting follower analysis...");

  // Extract usernames from the data structures
  const followers = extractUsers(followersData);
  const following = extractUsers(followingData);

  // Get previous session data if available
  let previousFollowing = new Set();
  if (previousSessionId) {
    try {
      const previousUsers = await database.getUsers(
        previousSessionId,
        "following"
      );
      previousFollowing = new Set(previousUsers.map((u) => u.username));
    } catch (error) {
      console.error("Error loading previous session data:", error);
    }
  }

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

  // Generate timeline events
  const timeline = {
    followEvents: [],
  };

  // Add follower events with running counts
  let currentFollowers = 0;
  let currentFollowing = 0;

  // Process followers
  followers.forEach((follower) => {
    currentFollowers++;
    timeline.followEvents.push({
      timestamp: follower.timestamp || new Date().toISOString(),
      username: follower.value || follower.username,
      direction: "follower",
      followersCount: currentFollowers,
      followingCount: currentFollowing,
    });
  });

  // Process following
  following.forEach((following) => {
    currentFollowing++;
    timeline.followEvents.push({
      timestamp: following.timestamp || new Date().toISOString(),
      username: following.value || following.username,
      direction: "following",
      followersCount: currentFollowers,
      followingCount: currentFollowing,
    });
  });

  // Sort events by timestamp
  timeline.followEvents.sort((a, b) => {
    const tsA =
      typeof a.timestamp === "number"
        ? a.timestamp
        : new Date(a.timestamp).getTime();
    const tsB =
      typeof b.timestamp === "number"
        ? b.timestamp
        : new Date(b.timestamp).getTime();
    return tsA - tsB;
  });

  // Remove duplicate events
  timeline.followEvents = timeline.followEvents.filter(
    (event, index, self) =>
      index ===
      self.findIndex(
        (e) => e.username === event.username && e.direction === event.direction
      )
  );

  // Detect unfollowed profiles
  if (previousSessionId && currentSessionId) {
    const currentFollowingSet = new Set(
      following.map((f) => f.value || f.username)
    );

    // Get previous session users with their details
    const previousUsers = await database.getUsers(
      previousSessionId,
      "following"
    );

    for (const prevUser of previousUsers) {
      if (!currentFollowingSet.has(prevUser.username)) {
        // This user was in previous following list but not in current, means they were unfollowed
        try {
          await database.addUnfollowedProfile(
            currentSessionId,
            prevUser.username,
            "following",
            prevUser.href,
            Math.floor(Date.now() / 1000),
            "detected"
          );
        } catch (error) {
          console.error("Error saving unfollowed profile:", error);
        }
      }
    }
  }

  // Only save follower events if not called from optimized upload (no currentSessionId means legacy call)
  if (!currentSessionId) {
    console.log("💾 Saving follower events individually (legacy mode)");

    // Save followers events
    for (const follower of followers) {
      try {
        await database.saveFollowerEvent(
          sessionId,
          follower.timestamp,
          followers.length,
          following.length,
          "follower", // Add direction
          follower.value || follower.username
        );
      } catch (error) {
        console.error("Error saving follower event:", error);
      }
    }

    // Save following events
    for (const followedUser of following) {
      try {
        await database.saveFollowerEvent(
          sessionId,
          followedUser.timestamp,
          followers.length,
          following.length,
          "following", // Add direction
          followedUser.value || followedUser.username
        );
      } catch (error) {
        console.error("Error saving following event:", error);
      }
    }
  } else {
    console.log("⚡ Skipping individual saves - using batch processing");
  }

  return {
    followers,
    following,
    mutual,
    followersOnly,
    followingOnly,
    timeline,
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

// Add proper type documentation for the main function
/**
 * Analyzes Instagram followers and following data
 * @param {Object|Array} followersData - Raw followers data from Instagram
 * @param {Object|Array} followingData - Raw following data from Instagram
 * @returns {Object} Analysis results including followers, following, mutual connections and timeline
 */
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

  // Generate timeline events
  const timeline = {
    followEvents: [],
  };

  // Add follower events with running counts
  let currentFollowers = 0;
  let currentFollowing = 0;

  // Process followers
  followers.forEach((follower) => {
    currentFollowers++;
    timeline.followEvents.push({
      timestamp: follower.timestamp || new Date().toISOString(),
      username: follower.value || follower.username,
      direction: "follower",
      followersCount: currentFollowers,
      followingCount: currentFollowing,
    });
  });

  // Process following
  following.forEach((following) => {
    currentFollowing++;
    timeline.followEvents.push({
      timestamp: following.timestamp || new Date().toISOString(),
      username: following.value || following.username,
      direction: "following",
      followersCount: currentFollowers,
      followingCount: currentFollowing,
    });
  });

  // Sort events by timestamp
  timeline.followEvents.sort((a, b) => {
    const tsA =
      typeof a.timestamp === "number"
        ? a.timestamp
        : new Date(a.timestamp).getTime();
    const tsB =
      typeof b.timestamp === "number"
        ? b.timestamp
        : new Date(b.timestamp).getTime();
    return tsA - tsB;
  });

  // Remove duplicate events
  timeline.followEvents = timeline.followEvents.filter(
    (event, index, self) =>
      index ===
      self.findIndex(
        (e) => e.username === event.username && e.direction === event.direction
      )
  );

  return {
    followers,
    following,
    mutual,
    followersOnly,
    followingOnly,
    timeline,
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

// Add this helper function to convert Unix timestamp to Date object
function convertTimestamp(timestamp) {
  if (!timestamp) {
    return new Date();
  }
  // Convert string timestamps to numbers
  const timestampNum =
    typeof timestamp === "string" ? parseInt(timestamp) : timestamp;
  // Check if timestamp is in seconds (10 digits) or milliseconds (13 digits)
  return new Date(
    timestampNum.toString().length === 10 ? timestampNum * 1000 : timestampNum
  );
}

// Modify the timeline data processing in analyzeUserTimeline function
function analyzeUserTimeline(followersData, followingData) {
  const timelineData = {
    followEvents: [],
    unfollowEvents: [],
    engagementPatterns: [],
    statistics: {
      dailyGrowth: {},
      weeklyGrowth: {},
      monthlyGrowth: {},
      totalGrowth: 0,
    },
  };

  const processedFollowers = Array.isArray(followersData)
    ? followersData
    : extractUsers(followersData);
  const processedFollowing = Array.isArray(followingData)
    ? followingData
    : extractUsers(followingData);

  // Process followers timeline
  processedFollowers.forEach((follower) => {
    const timestamp =
      follower.timestamp ||
      follower.string_list_data?.[0]?.timestamp ||
      Date.now() / 1000;

    if (timestamp) {
      timelineData.followEvents.push({
        type: "follow",
        username:
          follower.value ||
          follower.username ||
          follower.string_list_data?.[0]?.value,
        timestamp: convertTimestamp(timestamp),
        direction: "follower",
      });
    }
  });

  // Process following timeline
  processedFollowing.forEach((following) => {
    const timestamp =
      following.timestamp ||
      following.string_list_data?.[0]?.timestamp ||
      Date.now() / 1000;

    if (timestamp) {
      timelineData.followEvents.push({
        type: "follow",
        username:
          following.value ||
          following.username ||
          following.string_list_data?.[0]?.value,
        timestamp: convertTimestamp(timestamp),
        direction: "following",
      });
    }
  });

  // Sort events chronologically
  timelineData.followEvents.sort((a, b) => a.timestamp - b.timestamp);

  // Calculate engagement patterns
  const patterns = analyzeFollowPatterns(timelineData.followEvents);
  timelineData.engagementPatterns = patterns;

  // Calculate statistics
  timelineData.statistics = {
    dailyGrowth: calculateDailyGrowth(timelineData.followEvents),
    weeklyGrowth: calculateWeeklyGrowth(timelineData.followEvents),
    monthlyGrowth: calculateMonthlyGrowth(timelineData.followEvents),
    totalGrowth: timelineData.followEvents.length,
  };

  return timelineData;
}

function calculateDailyGrowth(events) {
  const dailyGrowth = {};
  events.forEach((event) => {
    const date = event.timestamp.toISOString().split("T")[0];
    dailyGrowth[date] =
      (dailyGrowth[date] || 0) + (event.direction === "follower" ? 1 : -1);
  });
  return dailyGrowth;
}

function calculateWeeklyGrowth(events) {
  const weeklyGrowth = {};
  events.forEach((event) => {
    const week = getWeekNumber(event.timestamp);
    weeklyGrowth[week] =
      (weeklyGrowth[week] || 0) + (event.direction === "follower" ? 1 : -1);
  });
  return weeklyGrowth;
}

function calculateMonthlyGrowth(events) {
  const monthlyGrowth = {};
  events.forEach((event) => {
    const month = `${event.timestamp.getFullYear()}-${
      event.timestamp.getMonth() + 1
    }`;
    monthlyGrowth[month] =
      (monthlyGrowth[month] || 0) + (event.direction === "follower" ? 1 : -1);
  });
  return monthlyGrowth;
}

function analyzeFollowPatterns(events) {
  // Ensure events is an array
  if (!Array.isArray(events)) {
    console.warn("Expected events to be an array, received:", typeof events);
    return [];
  }

  const patterns = [];
  const timeWindows = {
    daily: {},
    weekly: {},
    monthly: {},
  };

  // Safely iterate over events
  events.forEach((event) => {
    // Ensure event and timestamp exist
    if (!event || !event.timestamp) {
      console.warn("Invalid event data:", event);
      return;
    }

    try {
      const date = new Date(event.timestamp);
      const dayKey = date.toISOString().split("T")[0];
      const weekKey = getWeekNumber(date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

      // Initialize objects if they don't exist
      timeWindows.daily[dayKey] = timeWindows.daily[dayKey] || {
        follows: 0,
        unfollows: 0,
      };
      timeWindows.weekly[weekKey] = timeWindows.weekly[weekKey] || {
        follows: 0,
        unfollows: 0,
      };
      timeWindows.monthly[monthKey] = timeWindows.monthly[monthKey] || {
        follows: 0,
        unfollows: 0,
      };

      // Increment the appropriate counter
      const eventType = event.type === "follow" ? "follows" : "unfollows";
      timeWindows.daily[dayKey][eventType]++;
      timeWindows.weekly[weekKey][eventType]++;
      timeWindows.monthly[monthKey][eventType]++;
    } catch (error) {
      console.error("Error processing event:", error);
    }
  });

  // Calculate growth patterns
  try {
    // Process daily growth
    Object.entries(timeWindows.daily).forEach(([date, data]) => {
      const netChange = data.follows - data.unfollows;
      if (Math.abs(netChange) > 10) {
        // Significant change threshold
        patterns.push({
          type: netChange > 0 ? "rapid_growth" : "rapid_decline",
          date,
          change: netChange,
        });
      }
    });
  } catch (error) {
    console.error("Error calculating growth patterns:", error);
  }

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

// Add input validation for filterTimelineData
function filterTimelineData(data, timeframe) {
  if (!data || !data.followEvents) {
    console.warn("Invalid timeline data provided");
    return {
      followEvents: [],
      engagementPatterns: [],
      statistics: {
        dailyGrowth: {},
        weeklyGrowth: {},
        monthlyGrowth: {},
        totalGrowth: 0,
      },
    };
  }

  const now = new Date();
  let cutoffDate;

  switch (timeframe) {
    case "week":
      cutoffDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "year":
      cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    case "all":
    default:
      return data; // Return all data for 'all' timeframe
  }

  return {
    ...data,
    followEvents: data.followEvents.filter(
      (event) => new Date(event.timestamp) >= cutoffDate
    ),
  };
}

// Export all utility functions that might be needed elsewhere
module.exports = {
  analyzeFollowers,
  analyzeUserTimeline,
  filterTimelineData,
  convertTimestamp,
};
