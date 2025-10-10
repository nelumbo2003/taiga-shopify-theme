/**
 * Lazy Trustpilot Widget Loader
 * Defers loading Trustpilot script until footer is near viewport
 * Addresses GT Metrix finding: 109ms task at 4.4s
 * Expected improvement: -100-110ms TTI
 */

(function() {
  'use strict';

  let trustpilotLoaded = false;

  /**
   * Load Trustpilot bootstrap script and initialize widgets
   */
  function loadTrustpilot() {
    if (trustpilotLoaded) return;
    trustpilotLoaded = true;

    // Load Trustpilot bootstrap script dynamically
    const script = document.createElement('script');
    script.src = '//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';
    script.async = true;
    script.onload = function() {
      // Initialize any Trustpilot widgets on the page
      if (window.Trustpilot && window.Trustpilot.loadFromElement) {
        const widgets = document.querySelectorAll('.trustpilot-widget');
        widgets.forEach(function(widget) {
          window.Trustpilot.loadFromElement(widget, true);
        });
      }
    };
    document.head.appendChild(script);

    console.log('Trustpilot widget script loaded');
  }

  // Strategy 1: Load when footer/widget approaches viewport (Primary - most common)
  document.addEventListener('DOMContentLoaded', function() {
    // Look for footer or Trustpilot widget
    const footer = document.querySelector('footer, [role="contentinfo"], .trustpilot-widget');

    if (!footer) {
      console.log('No Trustpilot widget or footer found');
      return;
    }

    // Use IntersectionObserver to detect when footer is approaching
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          loadTrustpilot();
          observer.disconnect();
        }
      });
    }, {
      rootMargin: '400px' // Start loading 400px before footer enters viewport
    });

    observer.observe(footer);
  });

  // Strategy 2: Load after user scrolls past 50% of page (Backup)
  let scrollThreshold = false;
  window.addEventListener('scroll', function() {
    if (scrollThreshold) return;

    const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    if (scrollPercent > 50) {
      scrollThreshold = true;
      loadTrustpilot();
    }
  }, { passive: true });

  // Strategy 3: Load after 15 seconds as failsafe (Ensures it eventually loads)
  setTimeout(loadTrustpilot, 15000);
})();
