/**
 * Lazy Analytics Loader
 * Defers loading of Google Tag Manager, Google Analytics, and other tracking scripts
 *
 * Strategy:
 * - CookieYes loads immediately via head_custom_liquid (GDPR compliance)
 * - GTM/GA defer until user interaction/idle/timeout (performance optimization)
 *
 * Performance Impact:
 * - Addresses GT Metrix findings: GTM (263ms) + GA (338ms) = ~600ms TBT
 * - Expected improvement: -1,400ms LCP, -500-600ms TTI on initial load
 */

(function() {
  'use strict';

  let analyticsLoaded = false;
  let pendingScripts = [];

  /**
   * Identify and capture analytics scripts before they execute
   */
  function captureAnalyticsScripts() {
    // Look for GTM/GA scripts in the DOM
    const analyticsScripts = document.querySelectorAll('script[src*="googletagmanager.com"], script[src*="google-analytics.com"], script[src*="gtag"]');

    analyticsScripts.forEach(function(script) {
      if (script.src) {
        pendingScripts.push({
          src: script.src,
          async: script.async,
          defer: script.defer
        });
        // Remove original script to prevent immediate execution
        script.remove();
      }
    });
  }

  /**
   * Load all deferred analytics scripts
   */
  function loadAnalytics() {
    if (analyticsLoaded) return;
    analyticsLoaded = true;

    console.log('Loading deferred analytics scripts...');

    // Load GTM/GA scripts
    pendingScripts.forEach(function(scriptData) {
      const script = document.createElement('script');
      script.src = scriptData.src;
      script.async = scriptData.async || true;
      if (scriptData.defer) script.defer = true;
      document.head.appendChild(script);
    });

    // Also look for inline GTM initialization
    if (window.dataLayer) {
      console.log('GTM dataLayer detected, analytics loaded');
    }

    // Dispatch event for other scripts that may depend on analytics
    const event = new CustomEvent('analytics:loaded');
    document.dispatchEvent(event);
  }

  /**
   * Strategy 1: Load on first user interaction (click, scroll, touch)
   * Most effective for capturing engaged users
   */
  function loadOnInteraction() {
    const events = ['click', 'scroll', 'touchstart', 'mousemove', 'keydown'];

    events.forEach(function(eventName) {
      document.addEventListener(eventName, function handler() {
        loadAnalytics();
        // Remove listeners after first trigger
        events.forEach(function(e) {
          document.removeEventListener(e, handler);
        });
      }, { once: true, passive: true });
    });
  }

  /**
   * Strategy 2: Load when browser is idle
   * Best for performance - loads during CPU downtime
   */
  function loadOnIdle() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(function() {
        loadAnalytics();
      }, { timeout: 10000 }); // Max 10 seconds wait
    } else {
      // Fallback: Load after 5 seconds
      setTimeout(loadAnalytics, 5000);
    }
  }

  /**
   * Strategy 3: Failsafe timeout
   * Ensures analytics eventually loads even if user doesn't interact
   */
  function loadAfterTimeout() {
    setTimeout(loadAnalytics, 15000); // 15 seconds failsafe
  }

  /**
   * Initialize deferred loading strategies
   */
  function init() {
    // Capture existing analytics scripts
    captureAnalyticsScripts();

    // Use MutationObserver to catch GTM/GA scripts added by content_for_header
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.tagName === 'SCRIPT' && node.src) {
            // IMPORTANT: Don't defer CookieYes - it manages consent and must load first
            // CookieYes now loads directly via head_custom_liquid (independent from GTM)
            if (node.src.includes('cookieyes.com')) {
              return; // Let CookieYes load immediately
            }

            // Defer all GTM/GA scripts (CookieYes now loads independently)
            if (node.src.includes('googletagmanager.com') ||
                node.src.includes('google-analytics.com') ||
                node.src.includes('gtag')) {

              // Store script data
              pendingScripts.push({
                src: node.src,
                async: node.async || true,
                defer: node.defer || false
              });

              // Remove to prevent immediate execution
              node.remove();
              console.log('Deferred analytics script (CookieYes loads independently):', node.src);
            }
          }
        });
      });
    });

    // Observe head and body for dynamically added scripts
    observer.observe(document.head, { childList: true, subtree: true });
    observer.observe(document.body, { childList: true, subtree: true });

    // Disconnect observer after content_for_header is fully processed
    setTimeout(function() {
      observer.disconnect();
    }, 3000);

    // Apply loading strategies
    loadOnInteraction();
    loadOnIdle();
    loadAfterTimeout();
  }

  // Start immediately - needs to intercept scripts from content_for_header
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
