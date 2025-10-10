/**
 * Klaviyo Product Tracking - Add to Cart Events
 * Tracks when users add products to cart for Klaviyo marketing automation
 * Product data should be set in window.klaviyoProductData before this script loads
 */

(function() {
  'use strict';

  // Wait for page load before initializing tracking
  window.addEventListener('load', function() {
    // Ensure Klaviyo queue exists
    window._learnq = window._learnq || [];

    // Check if product data is available
    if (!window.klaviyoProductData) {
      console.warn('Klaviyo product data not found. Tracking disabled.');
      return;
    }

    const productData = window.klaviyoProductData;

    /**
     * Track Add to Cart event
     */
    function trackAddToCart() {
      // Get current quantity from form
      const quantityInput = document.querySelector('[name="quantity"]');
      const quantity = quantityInput ? parseInt(quantityInput.value, 10) : 1;

      // Prepare tracking data
      const item = {
        'ProductName': productData.title,
        'ProductID': productData.id,
        'Price': productData.price,
        'Quantity': quantity,
        'URL': window.location.href
      };

      // Send to Klaviyo
      window._learnq.push(['track', 'Added to Cart', item]);

      console.log('Klaviyo: Tracked Add to Cart', item);
    }

    /**
     * Setup event listeners for Add to Cart button
     */
    function setupTracking() {
      // Track clicks on Add to Cart button
      const addToCartButton = document.querySelector('.product-form__submit');
      if (addToCartButton) {
        addToCartButton.addEventListener('click', function(event) {
          // Small delay to ensure the add happens first
          setTimeout(trackAddToCart, 100);
        });
      }

      // Track cart:updated custom event (fired by theme's cart JavaScript)
      document.addEventListener('cart:updated', function() {
        trackAddToCart();
      });

      console.log('Klaviyo product tracking initialized');
    }

    // Initialize tracking
    setupTracking();
  });
})();
