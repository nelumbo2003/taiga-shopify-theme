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
  // This prevents the 345ms main thread task from blocking initial page load
  document.addEventListener('click', function(e) {
    if (e.target.closest('[data-reviews-tab], [href*="review"], [href*="#reviews"]')) {
      loadReviews();
    }
  }, true);

  // Strategy 2: Load after 10 seconds as backup (increased from 5s for better initial performance)
  // This ensures reviews eventually load for users who scroll down without clicking
  setTimeout(loadReviews, 10000);

  // Strategy 3: Load when scrolling near reviews section (with larger margin to delay further)
  document.addEventListener('DOMContentLoaded', function() {
    const reviewsWidget = document.querySelector(
      '[data-judge-me-widget], .jdgm-widget, [id*="judge-me"], [id*="judgeme"]'
    );

    if (!reviewsWidget) {
      console.log('No Judge.me widget found on page');
      return;
    }

    // Use IntersectionObserver with SMALLER margin (200px instead of 400px)
    // This loads reviews later, only when user is actively scrolling toward them
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          loadReviews();
          observer.disconnect();
        }
      });
    }, {
      rootMargin: '200px' // Reduced from 400px - more conservative loading
    });

    observer.observe(reviewsWidget);
  });
})();
