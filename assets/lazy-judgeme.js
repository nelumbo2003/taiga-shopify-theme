/**
 * Lazy Judge.me Reviews Loader
 * Defers loading of Judge.me reviews widget until user is likely to interact with it
 * Improves initial page load performance by reducing blocking JavaScript
 */

(function() {
  'use strict';

  let reviewsLoaded = false;

  /**
   * Initialize Judge.me reviews when needed
   */
  function loadReviews() {
    if (reviewsLoaded) return;
    reviewsLoaded = true;

    // Trigger Judge.me initialization if available
    if (window.jdgm) {
      if (window.jdgm.init) {
        window.jdgm.init();
      }
      if (window.jdgm.customizeBadges) {
        window.jdgm.customizeBadges();
      }
    }

    // Dispatch event for other scripts that may depend on reviews
    const event = new CustomEvent('jdgm:loaded');
    document.dispatchEvent(event);

    console.log('Judge.me reviews loaded');
  }

  // Strategy 1: ONLY load on explicit user interaction (click on reviews tab/link)
  // This prevents the 206ms main thread task from blocking initial page load
  document.addEventListener('click', function(e) {
    if (e.target.closest('[data-reviews-tab], [href*="review"], [href*="#reviews"], .jdgm-widget, [class*="judge"]')) {
      loadReviews();
    }
  }, true);

  // Strategy 2: NO timeout fallback - reviews only load when needed
  // This ensures reviews ONLY load when user explicitly wants to see them

  // Strategy 3: Load when scrolling near reviews section (SMALLER margin for later loading)
  document.addEventListener('DOMContentLoaded', function() {
    const reviewsWidget = document.querySelector(
      '[data-judge-me-widget], .jdgm-widget, [id*="judge-me"], [id*="judgeme"]'
    );

    if (!reviewsWidget) {
      console.log('No Judge.me widget found on page');
      return;
    }

    // Use IntersectionObserver with MINIMAL margin (100px)
    // This loads reviews only when user is very close to the reviews section
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          loadReviews();
          observer.disconnect();
        }
      });
    }, {
      rootMargin: '100px' // Minimal margin - extremely conservative loading
    });

    observer.observe(reviewsWidget);
  });
})();
