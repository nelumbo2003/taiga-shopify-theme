/*
 * Focus Trap helpers
 */

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

const trapFocusHandlers = {};

function trapFocus(container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (event.target !== container && event.target !== last && event.target !== first) return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if ((event.target === container || event.target === first) && event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  first.focus();
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, wait) {
  let t = false;
  return (...args) => {
    if (!t) {
      fn.apply(this, args)
      t = true;
      setTimeout(() => t = false, wait)
    }
  }
}

/*
 * Woolman Common JS
 */

// Initialize window.Woolman object
if (typeof window.Woolman == 'undefined') {
  window.Woolman = {};
}
Woolman.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

// -------
// Load components / libraries
Woolman.init = function () {
  Woolman.ModalsAndDrawers.init();
  Woolman.Header.init();
  Woolman.DetailsAccordions.init();

   // Attach theme editor listeners
   if (!Shopify || !Shopify.designMode) return;

  let lastSelection = {
    sectionId: undefined,
    blockId: undefined
  };

  // Load is called when something is changed within section settings
  document.addEventListener('shopify:section:load', (evt) => {
    const sectionId = 'shopify-section-' + evt.detail.sectionId
    if (sectionId === Woolman.Header.cache.section.id) {
      Woolman.ModalsAndDrawers.init();
      Woolman.Header.init();
    }

    if (document.querySelector(`[data-modal][data-section-id="${evt.detail.sectionId}"]`)) {
      Woolman.ModalsAndDrawers.showModalOrDrawer(document.querySelector(`[data-modal][data-section-id="${evt.detail.sectionId}"]`).id);
    }

    console.log('shopify:section:load sectionId', evt.detail.sectionId)
    console.log('lastSelection', lastSelection)
  })

  document.addEventListener('shopify:block:select', (evt) => {
    const sectionId = 'shopify-section-' + evt.detail.sectionId
    const blocks = document.getElementById(sectionId).querySelectorAll('[data-shopify-editor-block]')
    const selectedBlock = [...blocks].find(x => JSON.parse(x.dataset.shopifyEditorBlock).id === evt.detail.blockId);
    if (sectionId === Woolman.Header.cache.section.id) {
      if (selectedBlock) {
        // Make sure menu is open
        Woolman.Header.cache.openButton.click();

        // Select menu item
        const accordion = selectedBlock.closest('[data-accordion-item]').querySelector('input');
        const label = selectedBlock.closest('[data-accordion-item]').querySelector('label');
        if (!accordion.checked) label.click();
      }
    } else if (sectionId.includes('modal') && document.getElementById(sectionId).querySelector('[data-modal]')) {
      if (selectedBlock) {
        Woolman.ModalsAndDrawers.showModalOrDrawer(document.getElementById(sectionId).querySelector('[data-modal]').id);
      }
    }

    lastSelection.sectionId = evt.detail.sectionId;
    lastSelection.blockId = evt.detail.blockId;
    console.log('shopify:block:select', evt.detail.sectionId, evt.detail.blockId)
    console.log('lastSelection', lastSelection)
  })

  document.addEventListener('shopify:section:unload', (evt) => {
    console.log('shopify:section:unload sectionId', evt.detail.sectionId)
  })

  document.addEventListener('shopify:section:select', (evt) => {
    console.log('shopify:section:select', evt.detail.sectionId)
    lastSelection = {
      sectionId: evt.detail.sectionId,
      blockId: evt.detail.blockId
    }

    if (evt.detail.sectionId.includes('modal') && document.querySelector(`[data-modal][data-section-id="${evt.detail.sectionId}"]`)) {
      Woolman.ModalsAndDrawers.showModalOrDrawer(document.querySelector(`[data-modal][data-section-id="${evt.detail.sectionId}"]`).id);
    }

    console.log('lastSelection', lastSelection)
  })

  document.addEventListener('shopify:section:deselect', (evt) => {
    console.log('shopify:section:deselect', evt.detail.sectionId)
    lastSelection = {
      sectionId: undefined,
      blockId: undefined
    }

    if (evt.detail.sectionId.includes('modal') && document.querySelector(`[data-modal][data-section-id="${evt.detail.sectionId}"]`)) {
      Woolman.ModalsAndDrawers.closeModalOrDrawer(document.querySelector(`[data-modal][data-section-id="${evt.detail.sectionId}"]`).id);
    }

    console.log('lastSelection', lastSelection)
  })
};

// -------
// Woolman Common JS - Utility library
Woolman.Utils = {
  debugMode: true,
  prepareQueryParams: () => {
    Shopify.queryParams = Shopify.queryParams || {};

    // Preserve existing query parameters
    if (location.search.length) {
      const params = location.search.substr(1).split('&');
      for (let i = 0; i < params.length; i++) {
        const keyValue = params[i].split('=');
        // Spaces are reverted back after the decode, since in component-facets.js we'll use URLSearchParams() method and we don't want to double decode the spaces
        if (keyValue.length) {
          Shopify.queryParams[decodeURIComponent(keyValue[0])] = decodeURIComponent(keyValue[1]).replaceAll('+', ' ');
        }
      }
    }

    return Shopify.queryParams;
  },
  formatMoney(cents, format) {
    const default_money_format = theme.settings.moneyFormat || '€{{amount}}';
    if (typeof cents == 'string') {
      cents = cents.replace('.', '');
    }
    if (window?.Shopify?.currency?.rate) {
      cents = cents * parseFloat(window.Shopify.currency.rate || 1.0);
    }

    var value = '';
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = format || default_money_format;

    function defaultOption(opt, def) {
      return typeof opt == 'undefined' ? def : opt;
    }

    function formatWithDelimiters(number, precision, thousands, decimal) {
      precision = defaultOption(precision, 2);
      thousands = defaultOption(thousands, ',');
      decimal = defaultOption(decimal, '.');

      if (isNaN(number) || number == null) {
        return 0;
      }

      number = (number / 100.0).toFixed(precision);

      var parts = number.split('.'),
        dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands),
        cents = parts[1] ? decimal + parts[1] : '';

      return dollars + cents;
    }

    switch (formatString.match(placeholderRegex)[1]) {
      case 'amount':
        value = formatWithDelimiters(cents, 2);
        break;
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
    }

    return formatString.replace(placeholderRegex, value);
  },
};

// -------
// Woolman Common JS - Header component
Woolman.Header = {
  selectors: {
    header: 'MainHeader',
    cartBlip: '.cart-blip'
  },
  cache: {
    header: undefined,
    cartBlip: undefined,
    section: undefined,
    openButton: undefined
  },

  init: function () {
    this.cache.header = document.getElementById(this.selectors.header);
    this.cache.cartBlip = this.cache.header.querySelector(this.selectors.cartBlip);
    this.cache.section = this.cache.header.closest('.shopify-section');
    this.cache.openButton = this.cache.header.querySelector('[href="#drawer-menu"]')

    // Update cart blip when product is added to cart.
    document.addEventListener('ajaxProduct:added', this.updateCartBlip.bind(this))
    document.addEventListener('cart:update', this.updateCartBlip.bind(this));

    if (this.cache.header.dataset.stickyBehavior === 'none') return;
    this.initStickyBehavior(this.cache.header.dataset.stickyBehavior)
  },

  initStickyBehavior(behaviorType) {
    const stickyConfig = {
      headerHeight: this.cache.header.clientHeight,
      behavior: behaviorType
    }

    document.documentElement.classList.add('sticky-header-initialized', `sticky-header-${behaviorType}`);
    document.documentElement.style.setProperty('--sticky-header-margin-top', `${stickyConfig.headerHeight}px`);

    if (behaviorType === 'scroll' || behaviorType === 'fixed') {
      // Show on scroll fixed header
      let prevScroll = window.scrollY || document.documentElement.scrollTop;
      let curScroll;
      let direction = 0;
      let prevDirection = 0;

      /*
      ** Find the direction of scroll
      ** 0 - initial, 1 - up, 2 - down
      */

      const toggleStickyHeader = (direction, curScroll) => {
        if ((direction === 1) || curScroll < stickyConfig.headerHeight) {
          document.documentElement.classList.remove('sticky-header-hide')
        } else if (direction === 2 && curScroll > stickyConfig.headerHeight) {
          document.documentElement.classList.add('sticky-header-hide')
        }

        prevDirection = direction;
      }

      window.addEventListener('scroll', throttle(() => {
        curScroll = window.scrollY || document.documentElement.scrollTop;

        if (curScroll >= 300) {
          document.documentElement.classList.add('sticky-header-show')
        } else {
          document.documentElement.classList.remove('sticky-header-show');
        }

        if (curScroll > prevScroll) {
          direction = 2; // user scrolling down
        } else {
          direction = 1; // user scrolling up
        }

        if (direction !== prevDirection && behaviorType === 'scroll') {
          toggleStickyHeader(direction, curScroll)
        }

        prevScroll = curScroll
      }, 50))

      setInterval(() => {
        if (direction === 2 && behaviorType === 'scroll' && curScroll >= 900) {
          toggleStickyHeader(direction, curScroll);
        }
        if (window.scrollY === 0) {
          document.documentElement.classList.remove('sticky-header-show', 'sticky-header-hide');
        }
      }, 200)
    }
  },

  async updateCartBlip(e) {
    const cart = e.detail && e.detail.cart && e.detail.cart.item_count || await (async function () {
      const res = await fetch('/cart.json');
      const cart = await res.json();
      return cart;
    })();

    this.cache.cartBlip.textContent = cart.item_count || 0;
    if (cart && cart.item_count == 0) {
      this.cache.cartBlip.setAttribute('hidden', true);
      this.cache.cartBlip.closest('.header-item__link').classList.remove('has-blip-visible');
    } else {
      this.cache.cartBlip.removeAttribute('hidden')
      this.cache.cartBlip.closest('.header-item__link').classList.add('has-blip-visible');
    }

    // Update notification cart amount at the same time (if present)
    const total_in_notification = document.querySelector('#cart-notification-link .cart-total');
    if (total_in_notification) {
      total_in_notification.textContent = cart.item_count;
    }
  }
};

// -------
// Woolman Common JS - Modals & drawers library
Woolman.ModalsAndDrawers = {
  settings: {
    selectors: {
      modalLink: 'a[href*="#modal"]:not(.quick-buy_link)',
      drawerLink: 'a[href*="#drawer"]',
    },
  },
  focusTraps: {},
  init: function () {
    // Init open event listeners
    document.querySelectorAll(this.settings.selectors.modalLink).forEach((modalLink) => {
      modalLink.addEventListener('click', (event) => {
        event.preventDefault();
        const targetId = event.currentTarget.getAttribute('href').substring(1).split('?')[0];
        const slideIndex = event.currentTarget.getAttribute('href').substring(1).split('?slide=')[1];
        const scrollToId = event.currentTarget.getAttribute('href').substring(1).split('?scroll=')[1];
        this.showModalOrDrawer(targetId, parseInt(slideIndex), scrollToId);
      });
    });

    document.querySelectorAll(this.settings.selectors.drawerLink).forEach((drawerLink) => {
      drawerLink.addEventListener('click', (event) => {
        event.preventDefault();
        const targetId = event.currentTarget.getAttribute('href').substring(1).split('?')[0];
        this.showModalOrDrawer(targetId);
      });
    });

    // Init close event listeners
    const closeBtns = document.querySelectorAll('[data-close]');
    if (closeBtns) {
      closeBtns.forEach((closeBtn) => {
        closeBtn.addEventListener('click', this.closeModalOrDrawerOrDrawerFromEvent.bind(this));
      });
    }

    const overlays = document.querySelectorAll('[data-overlay]');
    if (overlays) {
      overlays.forEach((overlay) => {
        overlay.addEventListener('click', this.closeModalOrDrawerOrDrawerFromEvent.bind(this));
      });
    }

    // Escape to close all
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' || event.keyCode === 27) {
        document.querySelectorAll('.drawer').forEach((drawer) => {
          drawer.classList.remove('is-open');
        });
        document.querySelectorAll('.modal').forEach((modal) => {
          modal.classList.remove('is-open');
        });
        document.body.classList.remove('overflow-hidden');
      }
    });
  },
  /**
   *
   * @param {string} targetId - ID of modal or drawer element, e.g. modal-geo, drawer-menu
   * @param {int} slideIndex - Index of a Gridy Slider slide inside the opened modal - (sliding motion)
   * @param {string} scrollToId - ID of a Gridy Slider slide inside the opened modal - (no motion)
   * Traps focus to modal and disables body scrolling.
   */
  showModalOrDrawer: function (targetId, slideIndex, scrollToId) {
    const targetElement = document.getElementById(targetId);
    if (!targetElement && Woolman.Utils.debugMode) {
      console.warn('No modal/drawer element specified');
    }
    if (!targetElement) {
      return;
    }

    if (targetElement.classList.contains('is-open')) return;

    targetElement.classList.add('initialized', 'is-open');
    document.body.classList.add('overflow-hidden');

    setTimeout(() => {
      trapFocus(targetElement);

      // Focus on drawerSearchInput if it exists
      const drawerSearchInput = targetElement.querySelector('#drawerSearchInput');
      if (drawerSearchInput) {
        drawerSearchInput.focus();
      }
    }, 600);

    if (slideIndex) {
      setTimeout(() => {
        const gridySlider = targetElement.querySelector('gridy-slider');
        gridySlider.scrollToSlide(slideIndex - 1);
      }, 600);
    } else if (scrollToId) {
      const scrollToElement = document.getElementById(scrollToId),
            modal_dialog = targetElement.querySelector('.gridy-track');

      modal_dialog.scrollTo({
        top: scrollToElement.offsetTop,
        left: scrollToElement.offsetLeft,
        behavior: "instant"
      });
    }
  },
  closeModalOrDrawer: function(targetId) {
    const targetElement = document.getElementById(targetId);
    targetElement.classList.remove('is-open');
    document.body.classList.remove('overflow-hidden');
  },
  closeModalOrDrawerOrDrawerFromEvent: function (event) {
    event.preventDefault();
    removeTrapFocus();
    const parentElement = event.currentTarget.closest('[data-parent]');
    parentElement.classList.remove('is-open');
    document.body.classList.remove('overflow-hidden');
  }
};

/**
 * Allow us to trigger something when window is actually resized.
 */
let woolman_window_size = window.innerWidth;
window.addEventListener(
  'resize',
  debounce(() => {
    if (window.innerWidth == woolman_window_size) {
      return;
    }
    woolman_window_size = window.innerWidth;
    document.dispatchEvent(new CustomEvent('woolman:resize'));
  }),
  250
);

/**
 * Animated details element
 */
class Accordion {
  constructor(el) {
    this.el = el;
    this.summary = el.querySelector('summary');
    this.content = el.querySelector('.content');

    this.animation = null;
    this.isClosing = false;
    this.isExpanding = false;
    this.summary.addEventListener('click', (e) => this.onClick(e));
    this.toggleByViewport();
    document.addEventListener('woolman:resize', this.toggleByViewport.bind(this));
  }

  onClick(e) {
    e.preventDefault();
    this.el.style.overflow = 'hidden';
    if (this.isClosing || !this.el.open) {
      this.open();
    } else if (this.isExpanding || this.el.open) {
      this.shrink();
    }
  }

  shrink() {
    this.isClosing = true;

    const startHeight = `${this.el.offsetHeight}px`;
    const endHeight = `${this.summary.offsetHeight}px`;

    if (this.animation) {
      this.animation.cancel();
    }

    this.animation = this.el.animate({
      height: [startHeight, endHeight]
    }, {
      duration: 400,
      easing: 'ease-in-out'
    });

    this.animation.onfinish = () => this.onAnimationFinish(false);
    this.animation.oncancel = () => this.isClosing = false;
  }

  open() {
    this.el.style.height = `${this.el.offsetHeight}px`;
    this.el.open = true;
    window.requestAnimationFrame(() => this.expand());
  }

  expand() {
    this.isExpanding = true;
    const startHeight = `${this.el.offsetHeight}px`;
    const endHeight = `${this.summary.offsetHeight + this.content.offsetHeight}px`;

    if (this.animation) {
      this.animation.cancel();
    }

    this.animation = this.el.animate({
      height: [startHeight, endHeight]
    }, {
      duration: 400,
      easing: 'ease-out'
    });
    this.animation.onfinish = () => this.onAnimationFinish(true);
    this.animation.oncancel = () => this.isExpanding = false;
  }

  onAnimationFinish(open) {
    this.el.open = open;
    this.animation = null;
    this.isClosing = false;
    this.isExpanding = false;
    this.el.style.height = this.el.style.overflow = '';
  }

  toggleByViewport() {
    let mobileClose = this.el.dataset.mobileClose != undefined ? JSON.parse(this.el.dataset.mobileClose) : false;
    let desktopOpen = this.el.dataset.desktopOpen != undefined ? JSON.parse(this.el.dataset.desktopOpen) : false;

    if (woolman_window_size >= 768 && desktopOpen) {
      this.el.open = true;
    } else if (mobileClose) {
      this.el.open = false;
    }
  }
};

Woolman.DetailsAccordions = {
  init: function () {
    document.querySelectorAll('details').forEach((el) => {
      new Accordion(el);
    });
  }
};

Woolman.init();

class LocalizationForm extends HTMLElement {
  constructor() {
    super();
    this.elements = {
      input: this.querySelector('input[name="locale_code"], input[name="country_code"]')
    };

    this.querySelectorAll('a').forEach(item => item.addEventListener('click', this.onItemClick.bind(this)));
  }

  onItemClick(event) {
    event.preventDefault();
    const form = this.querySelector('form');
    this.elements.input.value = event.currentTarget.dataset.value;

    // Filter params fix, replace "%2C" with ","
    let return_to_value = form.querySelector('[name="return_to"]').value;
    let indexOfFilters = return_to_value.indexOf("?filter");
    if (indexOfFilters !== -1) {
        let substringAfterFilters = return_to_value.substring(indexOfFilters);
        let replacedSubstring = substringAfterFilters.replace(/%2C/g, ",");
        form.querySelector('[name="return_to"]').value = return_to_value.substring(0, indexOfFilters) + replacedSubstring;
    }

    if (form) form.submit();
  }
}

customElements.define('localization-form', LocalizationForm);

// Custom element that enhances HTML Video Element functionality.
// Usage: <video is="superpowered-video">
class SuperPoweredVideo extends HTMLElement {
  constructor() {
    super();

    this.video = this.querySelector('video') || this.querySelector('iframe');
    this.container = this.closest('.video-container') || null;

    if (this.container) this.attachClickListener(this.closest('.video-container'));

    // check if video is iframe and has a src and that src is youtube
    if (this.video.nodeName === 'IFRAME' && this.video.src && this.video.src.includes('youtube') && !this.container) {
      this.video.addEventListener('load', this.onVideoLoad.bind(this));
    }

    // When video is out of viewport pause it. This is to prevent videos from playing in the background.
    // If video is in viewport play it.
    // Use: Intersection Observer API
    const autoplay = this.dataset.autoplay || false;
    if (!autoplay || this.container) return;

    const videoType = this.video.nodeName === 'VIDEO' ? 'video' : 'iframe';
    const videoHost = this.video.nodeName === 'VIDEO' ? 'shopify' : (this.video.src.includes('youtube') ? 'youtube' : 'vimeo');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (videoType == 'video') {
            this.video.play();
          } else if (videoHost == 'youtube') {
            this.video.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          } else if (videoHost == 'vimeo') {
            this.video.contentWindow.postMessage('{"method":"play"}', '*');
          }
        } else {
          if (videoType == 'video') {
            this.video.pause()
          } else if (videoHost == 'youtube') {
            this.video.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          } else if (videoHost == 'vimeo') {
            this.video.contentWindow.postMessage('{"method":"pause"}', '*');
          }
        }
      });
    } , { threshold: 0.5 });

    observer.observe(this.video);
  }

  attachClickListener(videoContainer) {
    if (!videoContainer) return;
    videoContainer.addEventListener('click', (e) => {
      if (this.video.paused) {
        this.video.play();
      } else {
        this.video.pause();
      }
    });

    this.video.onplay = () => {
      videoContainer.querySelector('button').hidden = true;
    }

    this.video.onpause = () => {
      videoContainer.querySelector('button').hidden = false;
    }
  }

  onVideoLoad() {
    // force youtube to play on mobile
    this.video.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
  }
}
customElements.define('superpowered-video', SuperPoweredVideo);

// Gridy Slider - a custom Woolman built slider.
// Usage: <gridy-slider>
class GridySlider extends HTMLElement {
  constructor() {
    super();

    this.track = this.querySelector('.gridy-track');
    this.slides = this.querySelectorAll('.gridy-track > *');
    const child_count = this.track.childElementCount;

    const data_ipr_desktop = parseInt(this.dataset.iprDesktop, 10) || 1;
    const data_ipr_tablet = parseInt(this.dataset.iprTablet, 10) || data_ipr_desktop;
    const data_ipr_mobile = parseInt(this.dataset.iprMobile, 10) || 1;
    const data_init_scroll_to = this.dataset.initScrollTo;
    const data_autoplay = this.dataset.autoplay != undefined ? JSON.parse(this.dataset.autoplay) : false;
    const data_autoplay_delay = parseInt(this.dataset.autoplayDelay, 10) || 5000;
    const data_is_thumbnails_slider = this.dataset.thumbnailsFor != undefined ? true : false;
    const data_indicator = this.dataset.indicator != undefined ? JSON.parse(this.dataset.indicator) : false;
    const data_sliding_behavior = this.dataset.slidingBehavior;
    const data_thumbnail_slider = document.getElementById(`thumbnail-${this.id}`);
    const data_track_overflow_visible = this.dataset.overflowVisible != undefined ? true : false;

    this.config = {
      slide_count: child_count,
      current_slide: 0,
      active_slide_offset: 0, // used for thubnails slider

      ipr_desktop: data_ipr_desktop,
      ipr_tablet: data_ipr_tablet,
      ipr_mobile: data_ipr_mobile,
      breakpoint_tablet: 768,
      breakpoint_desktop: 1024,

      arrows: true,
      autoplay: data_autoplay || false,
      autoplay_delay: data_autoplay_delay, // in ms
      timer: null,

      // thumbnails related
      is_thumbnails_slider: data_is_thumbnails_slider,
      thumbnails_for: undefined,
      thumbnail_slider: data_thumbnail_slider,

      indicator: data_indicator,
      track_overflow_visible: data_track_overflow_visible,
      sliding_behavior: data_sliding_behavior || 'all'
    }

    // SCROLL ON INIT (with variant URL)
    if (data_init_scroll_to != undefined) {
      this.scrollToSlideByID(data_init_scroll_to);
    }

    // ARROWS INIT
    if (this.config.arrows) {
      this.buttons = this.querySelectorAll('[data-gridy-arrow]');
      this.buttons.forEach((arrowButton) => {
        arrowButton.addEventListener('click', this.onArrowClick.bind(this));
      });
    }

    // AUTOPLAY INIT
    if (this.config.autoplay) {
      this.autoplayGridy();

      // Always pause on hover
      this.addEventListener('mouseenter', this.clearAutoplayTimer);
      this.addEventListener('mouseleave', this.autoplayGridy);

      // Pause for touch devices
      this.addEventListener('touchenter', this.clearAutoplayTimer);
      this.addEventListener('touchleave', this.autoplayGridy);
    }

    // THUMBNAILS INIT
    if (this.config.is_thumbnails_slider) {
      this.config.active_slide_offset =  2,
      this.config.thumbnails_for = document.getElementById(this.dataset.thumbnailsFor);
      this.thumbnail = this.querySelectorAll('[data-thumbnail-btn]');
      this.thumbnail.forEach((thumbnail) => {
        thumbnail.addEventListener('click', this.onThumbnailClick.bind(this));
      });
    }

    // CURRENT SLIDE INDICATORS INIT
    if (this.config.indicator) {
      this.indicator_dots = this.querySelectorAll('[data-indicator-dot]');
      this.indicator_current = this.querySelector('[data-indicator-current]');
    }

    // SCROLL LISTENER (for setting active slide after normal scroll)
    if (!this.config.is_thumbnails_slider) {
      let scrollTimeout;
      this.track.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(this.afterScrollStops.bind(this), 200);
      }.bind(this));
    }
  }

  afterScrollStops() {
    let slideInView = this.firstSlideInView();
    this.config.current_slide = slideInView;
    this.setActiveSlide(this.slides[slideInView + this.config.active_slide_offset]);

    // SYNC BACK TO THUMBNAILS SLIDER
    if (this.config.thumbnail_slider) {
      this.config.thumbnail_slider.scrollToSlide(slideInView);
    }
  }

  autoplayGridy() {
    this.config.timer = setInterval(this.scrollByIPR.bind(this), this.config.autoplay_delay, 'next');
  }

  clearAutoplayTimer() {
    clearInterval(this.config.timer);
    this.config.timer = null;
  }

  onThumbnailClick(event) {
    event.preventDefault();
    this.config.current_slide = Array.from(event.currentTarget.parentNode.children).indexOf(event.currentTarget);
    this.config.thumbnails_for.scrollToSlideByID(event.currentTarget.dataset.itemId);
    this.scrollToSlide(this.config.current_slide);
  }

  onArrowClick(event) {
    this.scrollByIPR(event.currentTarget.dataset.direction);
  }

  scrollByIPR(direction) {
    let currentIPR = this.getCurrentIPR(),
        slideMultiplier = this.config.sliding_behavior == 'all' ? currentIPR : 1,
        newCurrentSlide = this.config.current_slide,
        lastToShow = this.config.slide_count - currentIPR;

    if (direction === 'next') {
      newCurrentSlide = (newCurrentSlide + slideMultiplier);

      // Handle exceptions (Correct flow on next)
      if (this.config.current_slide >= lastToShow) {
        newCurrentSlide = 0; // Loop to start if all shown
      }
    } else if (direction === 'prev') {
      newCurrentSlide = (newCurrentSlide - slideMultiplier);

      // Handle exceptions
      if (this.config.current_slide > 0 && newCurrentSlide < 0) {
        newCurrentSlide = 0; // Must scroll to first item if before looping to the end
      } else if (newCurrentSlide < 0) {
        newCurrentSlide = lastToShow; // Loop to end slide past the first item
      }
    }

    this.config.current_slide = newCurrentSlide;
    this.scrollToSlide(newCurrentSlide);
  }

  scrollToSlide(newPosition) {
    // Needs to use scrollTo() instead of scrollIntoView()
    // since the later affects window scroll and thus cannot
    // be used with autoplay sliders.

    if (isNaN(newPosition)) {
      return;
    }

    // Can show different active slide compared to scrollTo slide for example in thumbnails slider
    let slidePosWithOffset = newPosition - this.config.active_slide_offset,
        newScrollToSlidePos = slidePosWithOffset > 0 ? slidePosWithOffset : 0;

    const slideInNewScrollToPos = this.slides[newScrollToSlidePos];

    let scrollToLeft = slideInNewScrollToPos.offsetLeft,
        scrollToTop = slideInNewScrollToPos.offsetTop;

    // If the track overflow is visible the scroll offset much include the left padding of the track
    // That is calculated with the first child offsetLeft
    if (this.config.track_overflow_visible) {
      scrollToLeft = this.slides[newScrollToSlidePos].offsetLeft - this.slides[0].offsetLeft;
    }

    this.track.scrollTo({
      left: scrollToLeft,
      top: scrollToTop,
      behavior: "smooth",
    });

    this.slides.forEach((item) => { item.classList.remove('active') });
    this.slides[newPosition].classList.add('active');
  }

  scrollToSlideByID(slideID) {
    // Second scrollTo method used with slideID
    // Used through thumbnails and variant change events

    const theSlide = document.getElementById(slideID),
          newPosition = Array.from(theSlide.parentNode.children).indexOf(theSlide);

    this.scrollToSlide(newPosition);
  }

  setActiveSlide(slide) {
    this.slides.forEach((item) => { item.classList.remove('active') });
    slide.classList.add('active');

    if (this.config.indicator) {
      this.indicator_current.textContent = this.config.current_slide + 1;
      this.indicator_dots.forEach((dot) => { dot.classList.remove('active') });
      this.indicator_dots[this.config.current_slide].classList.add('active');
    }
  }

  // Utility, returns items per row value according to current viewport size
  getCurrentIPR() {
    let currentIPR = this.config.ipr_mobile;
    if (woolman_window_size >= this.config.breakpoint_desktop) {
      currentIPR = this.config.ipr_desktop;
    } else if (woolman_window_size >= this.config.breakpoint_tablet) {
      currentIPR = this.config.ipr_tablet;
    }
    return currentIPR;
  }

  // Utility, returns the position of the first slide in view (1..n)
  firstSlideInView() {
    let loopIndex = 0;
    for (const slide of this.slides) {
      if (this.isSlideInView(slide)) {
        return loopIndex;
      }
      ++loopIndex;
    }

    // If visibility check fails return the last known current_slide
    return this.config.current_slide;
  }

  // Element visibility check
  isSlideInView(slide) {
    const containerBounds = this.track.getBoundingClientRect();
    const slideBounds = slide.getBoundingClientRect();

    const isSlideVisible =
    Math.round(slideBounds.top) >= Math.floor(containerBounds.top) &&
    Math.floor(slideBounds.bottom) <= Math.round(containerBounds.bottom) &&
    Math.round(slideBounds.left) >= Math.floor(containerBounds.left) &&
    Math.floor(slideBounds.right) <= Math.round(containerBounds.right);

    return isSlideVisible;
  }

}
customElements.define('gridy-slider', GridySlider);

// QuantityInput for + and - button functionality
// Used in: cart items, upsell items
class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });

    this.querySelectorAll('button').forEach((button) => button.addEventListener('click', this.onButtonClick.bind(this)));
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.target.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
  }
}
customElements.define('quantity-input', QuantityInput);