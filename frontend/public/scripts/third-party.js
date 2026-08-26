// Defer third-party scripts until after page load
window.addEventListener('load', function () {
  // Google Analytics (gtag.js)
  var ga = document.createElement('script');
  ga.async = true;
  ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-E5S7H7M7LJ';
  document.head.appendChild(ga);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', 'G-E5S7H7M7LJ');

  // Google AdSense
  var ads = document.createElement('script');
  ads.async = true;
  ads.crossOrigin = 'anonymous';
  ads.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7401169722110446';
  document.head.appendChild(ads);
});
