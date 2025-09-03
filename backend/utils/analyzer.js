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
  
  console.warn('Unexpected data structure:', data);
  return [];
}

function flattenStringListData(userArray) {
  if (!Array.isArray(userArray)) {
    return [];
  }
  
  return userArray.map(user => {
    // Skip null or undefined entries
    if (!user || typeof user !== 'object') {
      return null;
    }
    
    // Handle new format with string_list_data
    if (user.string_list_data && Array.isArray(user.string_list_data)) {
      // Handle cases where string_list_data might be empty or have multiple entries
      if (user.string_list_data.length === 0) {
        console.warn('Empty string_list_data found, skipping entry');
        return null;
      }
      
      // For multiple entries, we'll take the first one (most common case)
      // but log a warning so users know
      if (user.string_list_data.length > 1) {
        console.warn('Multiple entries in string_list_data, using first entry');
      }
      
      const stringData = user.string_list_data[0];
      
      // Skip if the string data entry is null or missing required fields
      if (!stringData || typeof stringData !== 'object' || !stringData.value) {
        console.warn('Invalid or missing string_list_data entry, skipping');
        return null;
      }
      
      return {
        value: stringData.value,
        username: stringData.value, // For backward compatibility
        href: stringData.href,
        timestamp: stringData.timestamp
      };
    }
    
    // Handle old format - user already has value/username directly
    // Skip if missing required username field
    if (!user.value && !user.username) {
      console.warn('User entry missing username/value field, skipping');
      return null;
    }
    
    return user;
  }).filter(user => user !== null); // Remove null entries
}

module.exports = { analyzeFollowers };