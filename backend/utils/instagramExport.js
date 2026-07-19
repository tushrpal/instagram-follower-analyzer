/** Instagram marks deleted/deactivated accounts with __deleted__ in username or href. */
function isDeletedAccount(username, href) {
  const u = (username || "").toLowerCase();
  const h = (href || "").toLowerCase();
  return u.includes("__deleted__") || h.includes("__deleted__");
}

function filterDeletedAccounts(list, extractUsername, extractUrl) {
  const active = [];
  let deletedCount = 0;

  for (const item of list) {
    const username = extractUsername(item);
    const href = extractUrl ? extractUrl(item) : null;
    if (isDeletedAccount(username, href)) {
      deletedCount++;
      continue;
    }
    active.push(item);
  }

  return { active, deletedCount };
}

module.exports = { isDeletedAccount, filterDeletedAccounts };
