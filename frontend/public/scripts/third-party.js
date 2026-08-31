// Defer third-party scripts until after first paint and idle time
// Use requestIdleCallback for better performance
(function() {
  function loadThirdParty() {
    // Google Analytics (gtag.js) - load only after user interaction or idle
    var ga = document.createElement('script');
    ga.async = true;
    ga.defer = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-E5S7H7M7LJ';
    document.head.appendChild(ga);

    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', 'G-E5S7H7M7LJ');

    // Google AdSense - load after idle time
    var ads = document.createElement('script');
    ads.async = true;
    ads.defer = true;
    ads.crossOrigin = 'anonymous';
    ads.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7401169722110446';
    document.head.appendChild(ads);
  }

  // Load after page is fully loaded and idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadThirdParty, { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(loadThirdParty, 1000);
  }
})();
