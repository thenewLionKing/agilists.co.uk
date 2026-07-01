/*
 * Cookie consent + Google Analytics (consent-gated) for agilists.co.uk
 *
 * Google Analytics loads ONLY after the visitor clicks "Accept", so no
 * non-essential cookies are set before consent is given (UK PECR compliant).
 * "Reject" stores the choice, disables analytics, and clears any GA cookies.
 * Accept and Reject are given equal visual prominence. The choice is remembered
 * in localStorage and can be changed any time via a "Cookie settings" link
 * (any element with class "js-cookie-settings" reopens the banner).
 *
 * TO ENABLE ANALYTICS: replace GA_MEASUREMENT_ID below with your real GA4
 * Measurement ID (looks like G-XXXXXXXXXX) from https://analytics.google.com.
 * Until then the banner still works; it just doesn't load any analytics.
 */
(function () {
  'use strict';

  var GA_MEASUREMENT_ID = 'G-W4TCJ4GLNJ';        // GA4 Measurement ID
  var STORAGE_KEY = 'agilists_cookie_consent';   // 'accepted' | 'rejected'

  function hasRealGaId() {
    return GA_MEASUREMENT_ID.indexOf('G-') === 0 && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX';
  }

  function loadGoogleAnalytics() {
    if (!hasRealGaId() || window.__agilistsGaLoaded) return;
    window.__agilistsGaLoaded = true;
    window['ga-disable-' + GA_MEASUREMENT_ID] = false;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
  }

  // Withdrawal: stop analytics collecting and remove any cookies it set.
  function disableGoogleAnalytics() {
    window['ga-disable-' + GA_MEASUREMENT_ID] = true;
    var host = location.hostname;
    var domains = ['', host, '.' + host];
    var cookies = document.cookie ? document.cookie.split(';') : [];
    for (var i = 0; i < cookies.length; i++) {
      var name = cookies[i].split('=')[0].trim();
      if (name === '_ga' || name === '_gid' || name.indexOf('_ga_') === 0) {
        for (var d = 0; d < domains.length; d++) {
          document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' +
            (domains[d] ? '; domain=' + domains[d] : '');
        }
      }
    }
  }

  function getConsent() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function saveConsent(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) { /* private mode: choice just won't persist */ }
  }

  var STYLE_ID = 'agilists-consent-style';
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '#agilists-cookie-banner{position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:2147483000;' +
      'max-width:560px;margin:0 auto;background:#0d1b4b;color:#fff;border:1px solid #1e2e7a;border-radius:10px;' +
      'box-shadow:0 12px 44px rgba(0,0,0,.38);padding:1.25rem 1.35rem;' +
      "font-family:'Outfit',system-ui,-apple-system,sans-serif;font-size:.9rem;line-height:1.6;" +
      'opacity:0;transform:translateY(12px);transition:opacity .25s ease,transform .25s ease;}' +
      '#agilists-cookie-banner.is-visible{opacity:1;transform:translateY(0);}' +
      '#agilists-cookie-banner h2{font-size:1rem;margin:0 0 .4rem;font-weight:600;color:#fff;font-family:inherit;}' +
      '#agilists-cookie-banner p{margin:0 0 1rem;color:#e8eeff;}' +
      '#agilists-cookie-banner a{color:#8ea3ff;text-decoration:underline;}' +
      '#agilists-cookie-banner .acb-actions{display:flex;gap:.6rem;flex-wrap:wrap;}' +
      '#agilists-cookie-banner button{font:inherit;font-weight:600;cursor:pointer;border-radius:6px;' +
      'padding:.6rem 1.3rem;border:1px solid transparent;flex:1 1 auto;min-width:130px;transition:background .2s,border-color .2s;}' +
      // Accept and Reject are both solid, high-contrast buttons of equal weight (ICO: no nudging).
      '#agilists-cookie-banner .acb-accept{background:#2451ff;color:#fff;}' +
      '#agilists-cookie-banner .acb-accept:hover{background:#4f72ff;}' +
      '#agilists-cookie-banner .acb-reject{background:#e8eeff;color:#0d1b4b;}' +
      '#agilists-cookie-banner .acb-reject:hover{background:#fff;}' +
      '#agilists-cookie-banner button:focus-visible{outline:2px solid #e8eeff;outline-offset:2px;}' +
      '@media(max-width:480px){#agilists-cookie-banner .acb-actions{flex-direction:column;}}';
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  var banner = null;
  var hideTimer = null;
  var lastTrigger = null;

  function buildBanner() {
    injectStyles();
    var b = document.createElement('div');
    b.id = 'agilists-cookie-banner';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Cookie consent');
    b.innerHTML =
      '<h2>We value your privacy</h2>' +
      '<p>We’d like to use analytics cookies to understand how visitors use our site so we can improve it. ' +
      'These are set only if you accept. See our <a href="/cookies.html">Cookie Policy</a>.</p>' +
      '<div class="acb-actions">' +
      '<button type="button" class="acb-accept">Accept</button>' +
      '<button type="button" class="acb-reject">Reject</button>' +
      '</div>';
    b.querySelector('.acb-accept').addEventListener('click', function () { choose('accepted'); });
    b.querySelector('.acb-reject').addEventListener('click', function () { choose('rejected'); });
    document.body.appendChild(b);
    void b.offsetHeight; // force reflow so the enter transition plays (works in background tabs too)
    b.classList.add('is-visible');
    return b;
  }

  function showBanner(moveFocus) {
    clearTimeout(hideTimer);
    if (!banner) {
      banner = buildBanner();
    } else {
      banner.style.display = '';
      void banner.offsetHeight;
      banner.classList.add('is-visible');
    }
    if (moveFocus) {
      var accept = banner.querySelector('.acb-accept');
      if (accept) accept.focus();
    }
  }

  function hideBanner() {
    if (!banner) return;
    banner.classList.remove('is-visible');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      if (banner && !banner.classList.contains('is-visible')) banner.style.display = 'none';
    }, 250);
  }

  function choose(v) {
    saveConsent(v);
    hideBanner();
    if (v === 'accepted') { loadGoogleAnalytics(); }
    else { disableGoogleAnalytics(); }
    // Return focus to whatever opened the banner (e.g. the settings link).
    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
      lastTrigger = null;
    }
  }

  // Allow the visitor to change their choice later (e.g. a footer link).
  window.openCookieSettings = function () { showBanner(true); };

  function bindSettingsLinks() {
    var links = document.querySelectorAll('.js-cookie-settings');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (e) {
        e.preventDefault();
        lastTrigger = e.currentTarget;
        showBanner(true);
      });
    }
  }

  function init() {
    bindSettingsLinks();
    var c = getConsent();
    if (c === 'accepted') { loadGoogleAnalytics(); }
    else if (c === 'rejected') { window['ga-disable-' + GA_MEASUREMENT_ID] = true; }
    else { showBanner(false); } // first visit: show, but do NOT steal keyboard focus
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
