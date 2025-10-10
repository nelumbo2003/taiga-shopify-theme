/**
 * Lazy App Block Loader
 * Uses Intersection Observer to load app blocks only when they're about to enter the viewport
 * This significantly improves initial page load performance by deferring non-critical app content
 */

class LazyAppBlockLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: options.rootMargin || '50px 0px', // Start loading 50px before entering viewport
      threshold: options.threshold || 0.01,
      ...options
    };

    this.observer = null;
    this.init();
  }

  init() {
    // Check for Intersection Observer support
    if (!('IntersectionObserver' in window)) {
      // Fallback: load all blocks immediately on older browsers
      this.loadAllBlocks();
      return;
    }

    // Create observer
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      this.options
    );

    // Observe all lazy app blocks
    this.observeBlocks();
  }

  observeBlocks() {
    const lazyBlocks = document.querySelectorAll('[data-lazy-app-block]');

    lazyBlocks.forEach(block => {
      // Mark as pending load
      block.classList.add('lazy-app-block--pending');
      this.observer.observe(block);
    });
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadBlock(entry.target);
        this.observer.unobserve(entry.target);
      }
    });
  }

  loadBlock(block) {
    // Remove pending state
    block.classList.remove('lazy-app-block--pending');
    block.classList.add('lazy-app-block--loading');

    // Trigger load event
    const loadEvent = new CustomEvent('app-block:load', {
      detail: { block }
    });
    block.dispatchEvent(loadEvent);

    // Remove data attribute to mark as loaded
    block.removeAttribute('data-lazy-app-block');
    block.classList.remove('lazy-app-block--loading');
    block.classList.add('lazy-app-block--loaded');
  }

  loadAllBlocks() {
    const lazyBlocks = document.querySelectorAll('[data-lazy-app-block]');
    lazyBlocks.forEach(block => this.loadBlock(block));
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Initialize after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.lazyAppBlockLoader = new LazyAppBlockLoader();
  });
} else {
  window.lazyAppBlockLoader = new LazyAppBlockLoader();
}
