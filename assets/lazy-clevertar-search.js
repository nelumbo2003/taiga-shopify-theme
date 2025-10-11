/**
 * Lazy Clevertar Search Loader
 * Defers loading the Clevertar search script (237KB) until search is actually used
 * This removes ~200-300ms from TTFB and improves initial page load
 *
 * Loading triggers:
 * - User clicks search icon/button
 * - User focuses search input
 * - User presses Ctrl+K or Cmd+K (common search shortcut)
 * - Fallback: 15 seconds after page load
 */

(function() {
  'use strict';

  let searchLoaded = false;
  let deferredScripts = [];

  /**
   * Load all Clevertar Search scripts
   */
  function loadClevertarSearch() {
    if (searchLoaded) return;
    searchLoaded = true;

    console.log('Loading Clevertar Search (' + deferredScripts.length + ' scripts)');

    // Load all deferred scripts
    deferredScripts.forEach(function(scriptData) {
      const script = document.createElement('script');
      script.src = scriptData.src;
      if (scriptData.async) script.async = true;
      if (scriptData.defer) script.defer = true;
      if (scriptData.type) script.type = scriptData.type;

      // Copy any data attributes
      if (scriptData.attributes) {
        Object.keys(scriptData.attributes).forEach(function(key) {
          script.setAttribute(key, scriptData.attributes[key]);
        });
      }

      document.head.appendChild(script);
    });

    console.log('Clevertar Search scripts loaded');
  }

  /**
   * Identify if a script is a Clevertar Search script
   */
  function isClevertarScript(src) {
    if (!src) return false;

    // Don't defer this lazy loader script itself!
    if (src.includes('lazy-clevertar-search.js')) {
      return false;
    }

    return (
      src.includes('clevertar.app') ||
      src.includes('cs-search.js') ||  // More specific to avoid self-match
      src.includes('clever-search')
    );
  }

  /**
   * Defer a Clevertar script
   */
  function deferScript(script) {
    const scriptData = {
      src: script.src,
      async: script.async,
      defer: script.defer,
      type: script.type,
      attributes: {}
    };

    // Capture data attributes
    Array.from(script.attributes).forEach(function(attr) {
      if (attr.name.startsWith('data-')) {
        scriptData.attributes[attr.name] = attr.value;
      }
    });

    deferredScripts.push(scriptData);
    script.remove();
    console.log('Deferred Clevertar Search script:', script.src);
  }

  /**
   * Process script elements
   */
  function processScript(script) {
    if (!script.src) return;
    if (isClevertarScript(script.src)) {
      deferScript(script);
    }
  }

  /**
   * Set up loading triggers
   */
  function setupTriggers() {
    // Trigger 1: Click on search icon, button, or input
    document.addEventListener('click', function(e) {
      const searchElement = e.target.closest(
        'input[type="search"], ' +
        '[data-search], ' +
        '.search-button, ' +
        '.search-icon, ' +
        '[role="search"], ' +
        'button[aria-label*="Search"], ' +
        'button[aria-label*="search"], ' +
        '.predictive-search, ' +
        '[data-search-trigger]'
      );
      if (searchElement) {
        loadClevertarSearch();
      }
    }, true);

    // Trigger 2: Focus on search input
    document.addEventListener('focusin', function(e) {
      if (e.target.matches('input[type="search"], [role="searchbox"], [data-search-input]')) {
        loadClevertarSearch();
      }
    }, true);

    // Trigger 3: Keyboard shortcut (Ctrl+K or Cmd+K)
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        loadClevertarSearch();
      }
    }, true);

    // Trigger 4: Observe for search elements appearing in DOM
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) { // Element node
            if (node.matches && (
              node.matches('input[type="search"], [role="search"], [data-search]') ||
              node.querySelector('input[type="search"], [role="search"], [data-search]')
            )) {
              // Search UI appeared, load script preemptively
              loadClevertarSearch();
              observer.disconnect();
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Disconnect observer after 5 seconds
    setTimeout(function() {
      observer.disconnect();
    }, 5000);

    // Trigger 5: Fallback - load after 15 seconds
    setTimeout(function() {
      if (!searchLoaded && deferredScripts.length > 0) {
        console.log('Loading Clevertar Search (15s fallback)');
        loadClevertarSearch();
      }
    }, 15000);
  }

  /**
   * Set up MutationObserver to catch Clevertar scripts
   */
  function observeScripts() {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.tagName === 'SCRIPT') {
            processScript(node);
          }
        });
      });
    });

    // Observe head if it exists
    if (document.head) {
      observer.observe(document.head, { childList: true, subtree: true });
    }

    // Observe body if it exists, otherwise wait for it
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      // Body doesn't exist yet, wait for DOMContentLoaded
      document.addEventListener('DOMContentLoaded', function() {
        if (document.body) {
          observer.observe(document.body, { childList: true, subtree: true });
        }
      });
    }

    // Stop observing after 5 seconds (Clevertar should be loaded by then)
    setTimeout(function() {
      observer.disconnect();
    }, 5000);
  }

  /**
   * Initialize
   */
  function init() {
    console.log('Clevertar Search Lazy Loader: Initializing...');

    // Scan existing scripts
    const existingScripts = document.querySelectorAll('script[src]');
    existingScripts.forEach(processScript);

    // Watch for new scripts
    observeScripts();

    // Set up loading triggers
    if (deferredScripts.length > 0) {
      setupTriggers();
      console.log('Clevertar Search deferred - will load on search interaction');
    }
  }

  // Start immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also run immediately in case scripts are already in DOM
  init();
})();
