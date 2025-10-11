/**
 * Smart App Extension Deferrer
 * Intelligently defers heavy Shopify app extension scripts based on page context
 *
 * Target apps and their CPU costs (from GT Metrix):
 * - Globo Filter: 642ms (358ms + 284ms + 101ms)
 * - Samita Product Labels: 384ms (334ms + 50ms)
 * - Variant Swatch King: 304ms
 *
 * Total expected TBT reduction: ~1000ms
 */

(function() {
  'use strict';

  const deferredScripts = new Map();
  let observerActive = false;

  /**
   * App-specific loading strategies
   */
  const appStrategies = {
    // Globo Filter / Smart Product Filter: Context-aware with above-fold detection
    globo: {
      patterns: [
        'globo.filter',
        'globoFilter',
        'globo-filter',
        'productfiltersearch.com',
        'filter-eu9.globo.io',
        'smart-product-filter'
      ],
      shouldDefer: function() {
        // Don't defer on collection or search pages (filters needed)
        const template = document.documentElement.className;
        if (template.includes('template-collection') || template.includes('template-search')) {
          return false;
        }

        // On homepage: Check if there are above-fold app sections (New Arrivals, Best Sellers)
        if (template.includes('template-index')) {
          // Look for Smart Product Filter app blocks above fold
          const appSections = document.querySelectorAll(
            '[id*="shopify-block"][id*="smart_product_filter"], ' +
            '[class*="spf-"], ' +
            '.shopify-section[id*="apps"]'
          );

          // Check if any are above fold (within first 800px)
          for (let i = 0; i < appSections.length; i++) {
            const rect = appSections[i].getBoundingClientRect();
            if (rect.top < 800 && rect.top >= 0) {
              console.log('Globo/Smart Product Filter: Above-fold section detected, loading immediately');
              return false; // Don't defer - load immediately
            }
          }
        }

        // Defer on product pages or if no above-fold sections
        return true;
      },
      loadTrigger: function(callback) {
        // Strategy 1: Load when scrolling near product grid
        const productGrid = document.querySelector('.product-grid, .collection-grid, [data-collection]');
        if (productGrid) {
          const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
              if (entry.isIntersecting) {
                callback();
                observer.disconnect();
              }
            });
          }, { rootMargin: '300px' });
          observer.observe(productGrid);
        }

        // Strategy 2: Load on filter button click
        document.addEventListener('click', function(e) {
          if (e.target.closest('[data-filter], .filter-button, .globo-filter-trigger')) {
            callback();
          }
        }, { once: true });

        // Strategy 3: Load after 8 seconds as fallback
        setTimeout(callback, 8000);
      }
    },

    // Samita Product Labels: DISABLED - Block completely (customer confirmed disabled)
    samita: {
      patterns: [
        'samita',
        'ProductLabels',
        'product-labels'
      ],
      shouldDefer: function() {
        // Always block - app is disabled
        return true;
      },
      loadTrigger: function(callback) {
        // NEVER load - app is disabled
        console.log('Samita Labels blocked (app is disabled)');
      }
    },

    // Variant Swatch King: Context-aware loading
    variantSwatch: {
      patterns: [
        'variant-swatch',
        'variant_swatch',
        'variantSwatch'
      ],
      shouldDefer: function() {
        // Don't defer on product pages - swatches are critical for variant selection
        const template = document.documentElement.className;
        if (template.includes('template-product')) {
          return false;  // Load immediately on product pages
        }
        // Defer on collection/homepage - swatches less critical there
        return true;
      },
      loadTrigger: function(callback) {
        // Strategy 1: Load on hover over product card
        document.addEventListener('mouseover', function(e) {
          if (e.target.closest('.product-card, .card--product, [data-product]')) {
            callback();
          }
        }, { once: true, passive: true });

        // Strategy 2: Load on touch (mobile)
        document.addEventListener('touchstart', function(e) {
          if (e.target.closest('.product-card, .card--product, [data-product]')) {
            callback();
          }
        }, { once: true, passive: true });

        // Strategy 3: Load when scrolling near products
        const firstProduct = document.querySelector('.product-card, .card--product, [data-product]');
        if (firstProduct) {
          const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
              if (entry.isIntersecting) {
                callback();
                observer.disconnect();
              }
            });
          }, { rootMargin: '150px' });
          observer.observe(firstProduct);
        }

        // Strategy 4: Fallback after 7 seconds
        setTimeout(callback, 7000);
      }
    }
  };

  /**
   * Determine which app a script belongs to
   */
  function identifyApp(scriptSrc) {
    for (const [appName, strategy] of Object.entries(appStrategies)) {
      for (const pattern of strategy.patterns) {
        if (scriptSrc.includes(pattern)) {
          return appName;
        }
      }
    }
    return null;
  }

  /**
   * Defer a script for later loading
   */
  function deferScript(script, appName) {
    const scriptData = {
      src: script.src,
      async: script.async,
      defer: script.defer,
      type: script.type,
      appName: appName
    };

    // Store for later loading
    if (!deferredScripts.has(appName)) {
      deferredScripts.set(appName, []);
    }
    deferredScripts.get(appName).push(scriptData);

    // Remove from DOM to prevent execution
    script.remove();
    console.log('Deferred app script:', appName, scriptData.src);
  }

  /**
   * Load all deferred scripts for a specific app
   */
  function loadAppScripts(appName) {
    const scripts = deferredScripts.get(appName);
    if (!scripts || scripts.length === 0) return;

    console.log('Loading deferred app scripts:', appName, scripts.length, 'scripts');

    scripts.forEach(function(scriptData) {
      const script = document.createElement('script');
      script.src = scriptData.src;
      if (scriptData.async) script.async = true;
      if (scriptData.defer) script.defer = true;
      if (scriptData.type) script.type = scriptData.type;
      document.head.appendChild(script);
    });

    // Clear loaded scripts
    deferredScripts.set(appName, []);

    // Dispatch event for apps that may need to re-initialize
    const event = new CustomEvent('app-scripts:loaded', {
      detail: { appName: appName }
    });
    document.dispatchEvent(event);
  }

  /**
   * Process a script element
   */
  function processScript(script) {
    if (!script.src) return;

    const appName = identifyApp(script.src);
    if (!appName) return;

    const strategy = appStrategies[appName];
    if (!strategy.shouldDefer()) {
      // Don't defer - let it load normally
      console.log('Not deferring app script (needed now):', appName);
      return;
    }

    // Defer this script
    deferScript(script, appName);

    // Set up loading trigger (only once per app)
    if (deferredScripts.get(appName).length === 1) {
      strategy.loadTrigger(function() {
        loadAppScripts(appName);
      });
    }
  }

  /**
   * Scan existing scripts in the DOM
   */
  function scanExistingScripts() {
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(processScript);
  }

  /**
   * Set up MutationObserver to catch dynamically added scripts
   */
  function observeNewScripts() {
    if (observerActive) return;
    observerActive = true;

    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.tagName === 'SCRIPT' && node.src) {
            processScript(node);
          }
        });
      });
    });

    observer.observe(document.head, { childList: true, subtree: true });
    observer.observe(document.body, { childList: true, subtree: true });

    // Stop observing after 5 seconds (apps should be loaded by then)
    setTimeout(function() {
      observer.disconnect();
      observerActive = false;
    }, 5000);
  }

  /**
   * Initialize
   */
  function init() {
    console.log('Smart App Extension Deferrer: Initializing...');

    // Scan for existing scripts
    scanExistingScripts();

    // Watch for new scripts
    observeNewScripts();
  }

  // Start immediately to catch scripts from content_for_header
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also init on very first moment scripts might be added
  init();
})();
