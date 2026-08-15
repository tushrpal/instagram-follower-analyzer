export function getLocalAnalysis(sessionId) {
  try {
    const value = sessionStorage.getItem(`session_${sessionId}`);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function paginate(items, page = 1, limit = 20) {
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    totalItems: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / limit)),
  };
}
