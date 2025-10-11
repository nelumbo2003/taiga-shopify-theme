/**
 * Web Vitals Tracker
 * Measures and reports Core Web Vitals (LCP, FID, CLS, INP, TTFB)
 * Helps track LCP75 improvements: Target <2.5s from current 4.5s
 */

(function() {
  'use strict';

  // Load web-vitals library from CDN
  const script = document.createElement('script');
  script.type = 'module';
  script.textContent = `
    import {onLCP, onFID, onCLS, onINP, onTTFB} from 'https://unpkg.com/web-vitals@3/dist/web-vitals.attribution.js';

    function sendToAnalytics(metric) {
      const {name, value, rating, delta, navigationType, attribution} = metric;

      // Format metric data
      const metricData = {
        metric: name,
        value: Math.round(value),
        rating: rating,
        delta: Math.round(delta),
        navigationType: navigationType
      };

      // Console logging with color coding
      const color = rating === 'good' ? '#0cce6b' : rating === 'needs-improvement' ? '#ffa400' : '#ff4e42';
      console.log(
        '%c' + name + ': ' + Math.round(value) + 'ms (' + rating + ')',
        'color: ' + color + '; font-weight: bold; font-size: 14px;'
      );

      // Log additional details for LCP
      if (name === 'LCP' && attribution) {
        console.group('LCP Details:');
        console.log('Element:', attribution.element);
        console.log('URL:', attribution.url || 'N/A');
        console.log('Load Time:', Math.round(attribution.lcpResourceEntry?.loadTime || 0) + 'ms');
        console.log('Render Time:', Math.round(attribution.renderTime || 0) + 'ms');
        console.log('TTFB:', Math.round(attribution.timeToFirstByte || 0) + 'ms');
        console.groupEnd();
      }

      // Send to Google Analytics 4 if available
      if (window.gtag) {
        gtag('event', name, {
          event_category: 'Web Vitals',
          value: Math.round(value),
          metric_rating: rating,
          metric_delta: Math.round(delta),
          metric_nav_type: navigationType,
          non_interaction: true,
        });
      }

      // Send to dataLayer for GTM if available
      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'web-vitals',
          web_vitals_measurement: metricData
        });
      }
    }

    // Track all Core Web Vitals
    onLCP(sendToAnalytics);
    onFID(sendToAnalytics);
    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onTTFB(sendToAnalytics);

    console.log('%cWeb Vitals Tracker Active', 'color: #0cce6b; font-weight: bold; font-size: 16px;');
    console.log('%cTarget: LCP < 2500ms (Good) | Current baseline: ~4500ms', 'color: #666; font-size: 12px;');
    console.log('%cRating Guide: Green=Good | Orange=Needs Improvement | Red=Poor', 'color: #666; font-size: 12px;');
  `;

  document.head.appendChild(script);
})();
