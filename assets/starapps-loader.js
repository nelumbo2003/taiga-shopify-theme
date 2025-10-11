/**
 * Star Apps Loader - CLS Prevention
 *
 * Detects when all Star Apps have finished loading and reveals product content
 * Prevents cumulative layout shift from sequential app loading
 *
 * Active Apps:
 * - Variant Descriptions King (VDK)
 * - Variant Image King (VIA)
 * - Swatch King (VSK)
 */

(function() {
  'use strict';

  // Only run on product pages
  if (!document.documentElement.classList.contains('template-product')) {
    return;
  }

  const appDetectors = {
    vdk: false,  // Variant Descriptions King
    via: false,  // Variant Image King
    vsk: false   // Swatch King
  };

  let checkInterval;
  let attempts = 0;
  const maxAttempts = 40; // Check for 2 seconds (50ms * 40)

  /**
   * Check if a Star App has loaded by looking for its elements/classes
   */
  function checkAppsLoaded() {
    attempts++;

    // Check Variant Descriptions King (VDK)
    if (!appDetectors.vdk) {
      appDetectors.vdk = !!document.querySelector('[data-starapps-vdk], .starapps-vdk-loaded');
    }

    // Check Variant Image King (VIA)
    if (!appDetectors.via) {
      appDetectors.via = !!document.querySelector('[data-starapps-via], .starapps-via-loaded');
    }

    // Check Swatch King (VSK)
    if (!appDetectors.vsk) {
      appDetectors.vsk = !!document.querySelector('.starapps-vsk, [data-starapps-vsk]');
    }

    // Check if all apps are loaded OR we've tried enough times
    const allLoaded = appDetectors.vdk && appDetectors.via && appDetectors.vsk;
    const shouldReveal = allLoaded || attempts >= maxAttempts;

    if (shouldReveal) {
      revealContent();
    }
  }

  /**
   * Reveal product content with smooth transition
   */
  function revealContent() {
    clearInterval(checkInterval);

    // Add class to trigger CSS fade-in
    document.documentElement.classList.add('starapps-loaded');

    console.log('Star Apps loaded:', {
      VDK: appDetectors.vdk,
      VIA: appDetectors.via,
      VSK: appDetectors.vsk,
      attempts: attempts
    });
  }

  /**
   * Start checking for apps
   */
  function init() {
    // Check immediately
    checkAppsLoaded();

    // Then check every 50ms
    checkInterval = setInterval(checkAppsLoaded, 50);

    // Absolute fallback: Force reveal after 2 seconds
    setTimeout(function() {
      if (!document.documentElement.classList.contains('starapps-loaded')) {
        console.warn('Star Apps timeout - forcing content reveal');
        revealContent();
      }
    }, 2000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
