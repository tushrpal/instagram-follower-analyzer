// Dynamic robots meta tag handler for SPA routes
(function () {
  var path = window.location.pathname;
  var noIndexPrefixes = [
    '/dashboard/', '/processing/', '/unfollow/',
    '/pending-requests/', '/relationships/', '/insights/',
    '/history', '/login', '/register',
    '/forgot-password', '/reset-password'
  ];
  for (var i = 0; i < noIndexPrefixes.length; i++) {
    if (path.indexOf(noIndexPrefixes[i]) === 0) {
      var m = document.getElementById('robots-meta');
      if (m) m.setAttribute('content', 'noindex, nofollow');
      break;
    }
  }
})();
