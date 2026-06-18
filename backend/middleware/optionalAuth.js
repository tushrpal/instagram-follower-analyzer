function optionalAuth(req, res, next) {
  // Allow unauthenticated access; userId will be null for guests
  next();
}

module.exports = optionalAuth;
