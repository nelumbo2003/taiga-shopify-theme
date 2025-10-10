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

  // Strategy 1: Load when scrolling near reviews section (most common)
  document.addEventListener('DOMContentLoaded', function() {
    const reviewsWidget = document.querySelector(
      '[data-judge-me-widget], .jdgm-widget, [id*="judge-me"], [id*="judgeme"]'
    );

    if (!reviewsWidget) {
      console.log('No Judge.me widget found on page');
      return;
    }

    // Use IntersectionObserver to detect when reviews are approaching viewport
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          loadReviews();
          observer.disconnect();
        }
      });
    }, {
      rootMargin: '400px' // Start loading 400px before widget enters viewport
    });

    observer.observe(reviewsWidget);
  });

  // Strategy 2: Load immediately if user clicks on reviews tab or link
  document.addEventListener('click', function(e) {
    if (e.target.closest('[data-reviews-tab], [href*="review"], [href*="#reviews"]')) {
      loadReviews();
    }
  }, true);

  // Strategy 3: Load after 5 seconds as backup (ensures reviews eventually load)
  setTimeout(loadReviews, 5000);
})();
