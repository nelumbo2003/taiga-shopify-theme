/**
 * Lazy Carousel Loader for Product Pages
 * Defers loading of product carousels (Best Sellers, Trending, etc.) until they're near viewport
 * This improves initial page load performance by reducing JavaScript execution and API calls
 */

(function() {
  'use strict';

  // Track which carousels have been loaded
  const loadedCarousels = new Set();

  /**
   * Initialize a carousel when it's about to enter viewport
   */
  function loadCarousel(carouselElement) {
    // Prevent duplicate initialization
    const carouselId = carouselElement.id || carouselElement.className;
    if (loadedCarousels.has(carouselId)) return;
    loadedCarousels.add(carouselId);

    // Mark as loading
    carouselElement.classList.add('carousel--loading');

    // Trigger custom event for app-specific initialization
    const loadEvent = new CustomEvent('carousel:load', {
      detail: { element: carouselElement }
    });
    carouselElement.dispatchEvent(loadEvent);

    // Check if Smart Product Filter Search app has initialization methods
    if (window.SPFProductFilters && typeof window.SPFProductFilters.init === 'function') {
      window.SPFProductFilters.init(carouselElement);
    }

    // Check for Globo app initialization
    if (window.GlobalFiltering && typeof window.GlobalFiltering.initBlock === 'function') {
      window.GlobalFiltering.initBlock(carouselElement);
    }

    // Mark as loaded
    carouselElement.classList.remove('carousel--loading');
    carouselElement.classList.add('carousel--loaded');

    console.log('Carousel loaded:', carouselId);
  }

  /**
   * Setup Intersection Observer for all product carousels
   */
  function setupLazyCarousels() {
    // Check for Intersection Observer support
    if (!('IntersectionObserver' in window)) {
      console.log('⚠️ IntersectionObserver not supported, loading all carousels immediately');
      loadAllCarousels();
      return;
    }

    // Find all carousel/app sections on the page
    // These selectors target Smart Product Filter/Search app blocks and carousels
    const carouselSelectors = [
      '[id*="shopify-block"][id*="smart_product_filter"]',
      '[id*="shopify-block"][id*="new_products"]',
      '[id*="shopify-block"][id*="best_sellers"]',
      '[id*="shopify-block"][id*="trending"]',
      '[id*="shopify-block"][id*="globo"]',
      '.shopify-section[id*="apps"]',
      '[data-section-type="apps"]',
      '[class*="spf-"]',
      '.product-carousel',
      '.trending-products',
      '.best-sellers',
      '.bought-together'
    ].join(', ');

    console.log('🔍 Searching for carousels with selectors:', carouselSelectors.split(', ').length, 'patterns');

    const carousels = document.querySelectorAll(carouselSelectors);

    if (carousels.length === 0) {
      console.log('⚠️ No carousels found for lazy loading');
      console.log('📊 Page info:', {
        template: document.documentElement.className,
        sections: document.querySelectorAll('[class*="section"]').length,
        appBlocks: document.querySelectorAll('[id*="shopify-block"]').length
      });
      return;
    }

    // Create observer with 400px margin (start loading before entering viewport)
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          loadCarousel(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '400px 0px', // Start loading 400px before entering viewport
      threshold: 0.01
    });

    // Observe all carousels
    carousels.forEach(function(carousel) {
      // Skip if carousel is above the fold (within first 800px)
      const rect = carousel.getBoundingClientRect();
      const isAboveFold = rect.top < 800;

      if (isAboveFold) {
        // Load immediately if above fold
        loadCarousel(carousel);
      } else {
        // Lazy load if below fold
        carousel.classList.add('carousel--pending');
        observer.observe(carousel);
      }
    });

    console.log('✅ Lazy carousel loading initialized for', carousels.length, 'carousels');
    console.log('📦 Carousel IDs:', Array.from(carousels).map(c => c.id || c.className).slice(0, 3));
  }

  /**
   * Fallback: Load all carousels immediately
   */
  function loadAllCarousels() {
    const carousels = document.querySelectorAll('[id*="shopify-block"]');
    carousels.forEach(loadCarousel);
  }

  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupLazyCarousels);
  } else {
    setupLazyCarousels();
  }
})();
