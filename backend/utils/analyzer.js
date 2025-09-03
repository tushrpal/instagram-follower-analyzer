function analyzeFollowers(followersData, followingData) {
  console.log('🔍 Starting follower analysis...');
  
  // Extract usernames from the data structures
  const followers = extractUsers(followersData);
  const following = extractUsers(followingData);
  
  console.log(`📊 Found ${followers.length} followers and ${following.length} following`);
  
  // Create sets for efficient lookup
  const followerUsernames = new Set(followers.map(f => f.value || f.username));
  const followingUsernames = new Set(following.map(f => f.value || f.username));
  
  // Analyze relationships
  const mutual = [];
  const followersOnly = [];
  const followingOnly = [];
  
  // Find mutual followers
  followers.forEach(follower => {
    const username = follower.value || follower.username;
    if (followingUsernames.has(username)) {
      mutual.push(follower);
    } else {
      followersOnly.push(follower);
    }
  });
  
  // Find following only (people you follow but don't follow you back)
  following.forEach(followedUser => {
    const username = followedUser.value || followedUser.username;
    if (!followerUsernames.has(username)) {
      followingOnly.push(followedUser);
    }
  });
  
  console.log(`✅ Analysis complete: ${mutual.length} mutual, ${followersOnly.length} followers only, ${followingOnly.length} following only`);
  
  return {
    followers,
    following,
    mutual,
    followersOnly,
    followingOnly
  };
}

function extractUsers(data) {
  // Handle different Instagram export formats
  if (Array.isArray(data)) {
    return data;
  }
  
  // Some exports have the data nested under different keys
  if (data.relationships_followers) {
    return data.relationships_followers;
  }
  
  if (data.relationships_following) {
    return data.relationships_following;
  }
  
  // Look for any array property
  for (const key in data) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
  }
  
  console.warn('Unexpected data structure:', data);
  return [];
}

module.exports = { analyzeFollowers };