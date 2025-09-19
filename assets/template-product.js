class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
  }

  onVariantChange(e) {
    const { isCombinedProduct, targetUrl } = this.combinedListingCheck(e);

    this.toggleAddButton(true, '', false);

    if (isCombinedProduct) {
      this.fetchProductSection(targetUrl);
      return;  // Stop execution if false
    }

    this.updateOptions();
    this.updateMasterId();
    this.updatePickupAvailability();
    this.updateInventoryStatus();
    this.removeErrorMessage();
    this.updateVariantStatuses();

    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
    }
  }

  combinedListingCheck(e) {
    const currentUrl = window.location.pathname;
    const targetUrl = e.target.dataset.productUrl;
    let isCombinedProduct = false;

    if (targetUrl != undefined && currentUrl != targetUrl) {
      isCombinedProduct = true;
    }

    return { isCombinedProduct, targetUrl };
  }

  async fetchProductSection(newProductUrl) {
    const productElement = this.closest('.main-product');
    const productSectionId = this.dataset.section;
    let params = `section_id=${productSectionId}&`;

    const selectedOptionValues = Array.from(this.querySelectorAll('fieldset input:checked')).map((element) => element.dataset.optionValueId).join(',');
      params += `option_values=${selectedOptionValues}`;

    fetch(`${newProductUrl}?${params}`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        productElement.innerHTML = html.querySelector('.main-product').innerHTML;
        window.history.replaceState({ }, '', `${newProductUrl}`);
      });
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options.map((option, index) => {
        return this.options[index] === option;
      }).includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;
    if (typeof variantImageAutomator === 'function') return;

    const mediaGridySlider = document.getElementById(`slider-${this.dataset.section}`);
    const thumbnailsGridySlider = document.getElementById(`thumbnail-slider-${this.dataset.section}`);

    if (mediaGridySlider) {
      mediaGridySlider.scrollToSlideByID(
        `item-${this.currentVariant.featured_media.id}`
      );
    }

    if (thumbnailsGridySlider) {
      thumbnailsGridySlider.scrollToSlideByID(`thumbnail-item-${this.currentVariant.featured_media.id}`)
    }

    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    const isGrid = mediaGridySlider.dataset.desktopEnabled === 'false' ? true : false;
    if (isDesktop && isGrid) {
      document.getElementById(`item-${this.currentVariant.featured_media.id}`)?.scrollIntoView();
    }
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({ }, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateShareUrl() {
    const shareButton = document.getElementById(`Share-${this.dataset.section}`);
    if (!shareButton || !shareButton.updateUrl) return;
    shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}, #product-form-${this.dataset.section}-product-buy-bar`);
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(variant => this.querySelector(':checked').value === variant.option1);
    const inputWrappers = [...this.querySelectorAll('.product-form__input')];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [...option.querySelectorAll('input[type="radio"], option')]
      const previousOptionSelected = inputWrappers[index - 1].querySelector(':checked').value;
      const availableOptionInputsValue = selectedOptionOneVariants.filter(variant => variant.available && variant[`option${ index }`] === previousOptionSelected).map(variantOption => variantOption[`option${ index + 1 }`]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue)
    });
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach(input => {
      if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
        input.innerText = input.getAttribute('value');
      } else {
        input.innerText = window.variantStrings.unavailable_with_option.replace('[value]', input.getAttribute('value'));
      }
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }

  updateInventoryStatus() {
    this.productInventoryNode = document.querySelector('[data-product-inventory]');

    if (!this.productInventoryNode || !window.inventories || !window.inventories[this.dataset.productId]) return;

    this.inventoryThreshold = parseInt(this.productInventoryNode.dataset.threshold);
    this.showQuantityInStock = this.productInventoryNode.dataset.showQuantityInStock;

    const variantInventoryObject = window.inventories[this.dataset.productId][this.currentVariant?.id];

    if (!this.currentVariant || !this.currentVariant.inventory_management) {
      this.toggleInventoryQuantity(false);
      this.toggleIncomingInventory(false);

      return;
    }

    if (this.currentVariant.inventory_management === 'shopify') {
      if (variantInventoryObject.quantity <= 0 && variantInventoryObject.incoming === 'true' && variantInventoryObject.quantity < this.inventoryThreshold) {
        this.toggleInventoryQuantity(false);
        this.toggleIncomingInventory(true, variantInventoryObject.next_incoming_date);
      } else {
        this.toggleInventoryQuantity(true, variantInventoryObject.quantity);
        this.toggleIncomingInventory(false);
      }
    }
  }

  toggleInventoryQuantity(show, quantity) {
    if (show === false) {
      this.productInventoryNode.classList.add('hide');
      return;
    }

    this.productInventoryNode.classList.remove('inventory-status--in-stock', 'inventory-status--low', 'inventory-status--sold-out', 'inventory-status--sold-out-continue-selling');

    if (this.currentVariant && this.currentVariant.available && parseInt(quantity) <= parseInt(this.inventoryThreshold) && parseInt(quantity) > 0) {
      this.productInventoryNode.classList.add('inventory-status--low');
      if (this.showQuantityInStock === 'true') {
        this.productInventoryNode.firstElementChild.textContent = window.variantStrings.inventory.few_left_with_quantity.replace('[quantity]', quantity);
      } else {
        this.productInventoryNode.firstElementChild.textContent = window.variantStrings.inventory.few_left;
      }
    } else if (this.currentVariant && this.currentVariant.available && parseInt(quantity) > parseInt(this.inventoryThreshold)) {
      this.productInventoryNode.classList.add('inventory-status--in-stock');
      if (this.showQuantityInStock === 'true') {
        this.productInventoryNode.firstElementChild.textContent = window.variantStrings.inventory.in_stock_with_quantity.replace('[quantity]', quantity);
      } else {
        this.productInventoryNode.firstElementChild.textContent = window.variantStrings.inventory.in_stock;
      }
    } else if (this.currentVariant && this.currentVariant.available && parseInt(quantity) < 1) {
      this.productInventoryNode.classList.add('inventory-status--sold-out-continue-selling');
      this.productInventoryNode.firstElementChild.textContent = window.variantStrings.inventory.out_of_stock_continue_selling;
    } else {
      this.productInventoryNode.classList.add('inventory-status--sold-out');
      this.productInventoryNode.firstElementChild.textContent = window.variantStrings.inventory.out_of_stock;
    }

    this.productInventoryNode.classList.remove('hide');
  }

  toggleIncomingInventory(show, date) {
    const incomingInventoryNode = document.querySelector('[data-incoming-inventory]');
    if (!incomingInventoryNode) return;

    if (show == false && incomingInventoryNode) {
      incomingInventoryNode.classList.add('hide');

      return;
    }

    let string = !date ?
      window.variantStrings.inventory.waiting_for_stock :
      window.variantStrings.inventory.will_be_in_stock_after.replace('[date]', date);

    incomingInventoryNode.classList.remove('hide');
    incomingInventoryNode.firstElementChild.textContent = string;
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    const productForm = section.querySelector('product-form');
    if (productForm) productForm.handleErrorMessage();
  }

  renderProductInfo() {
    fetch(`${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const destination = document.getElementById(`price-${this.dataset.section}`);
        const skuSource = html.getElementById(
          `Sku-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );
        const skuDestination = document.getElementById(`Sku-${this.dataset.section}`);
        const destinationBuyBarInfo = document.getElementById(
          `buy-bar-info-${this.dataset.section}`
        );
        const source = html.getElementById(`price-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`);
        const buyBarInfoSource = html.getElementById(`buy-bar-info-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`);
        if (source && destination) destination.innerHTML = source.innerHTML;
        if (source && destinationBuyBarInfo) destinationBuyBarInfo.innerHTML = buyBarInfoSource.innerHTML;

        if (skuSource && skuDestination) {
          skuDestination.innerHTML = skuSource.innerHTML;
          skuDestination.classList.toggle('hidden', skuSource.classList.contains('hidden'));
        }

        const price = document.getElementById(`price-${this.dataset.section}`);

        if (price) price.classList.remove('hidden');
        this.toggleAddButton(!this.currentVariant.available, window.variantStrings.soldOut);
      });

      // update the quantity box prices
      console.log("variant changed");
      setTimeout(() => {
        const priceElement = document.querySelector('span.price-item.price-item--regular');
        if (priceElement) {
          const priceText = priceElement.textContent.trim();
          const price = parseFloat(priceText.replace(/[^0-9.,]/g, '').replace(',', '.'));
      
          if (!isNaN(price)) {
            const box1Pr = document.querySelector('#box-1 p.prc');
            const box2Pr = document.querySelector('#box-2 p.prc');
            const box3Pr = document.querySelector('#box-3 p.prc');
      
            if (box1Pr) box1Pr.textContent = `€ ${price.toFixed(2)}`;
            if (box2Pr) box2Pr.textContent = `€ ${(2 * price * 0.95).toFixed(2)}`;
            if (box3Pr) box3Pr.textContent = `€ ${(3 * price * 0.90).toFixed(2)}`;
          }
        }
      }, 500);
      


  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(`product-form-${this.dataset.section}`);
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    const multiplyButtons = productForm.querySelectorAll('.btn--add-multiplier');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text) addButtonText.textContent = text;
      if (multiplyButtons) {
        multiplyButtons.forEach(button => {
          button.disabled = true;
        });
      }
    } else {
      addButton.removeAttribute('disabled');
      if (this.dataset.isPreorder == 'true') {
        addButtonText.textContent = window.variantStrings.preOrder;
      } else {
        addButtonText.textContent = window.variantStrings.addToCart;
      }
      if (multiplyButtons) {
        multiplyButtons.forEach(button => {
          button.removeAttribute('disabled');
        });
      }
    }

    const productForm_BuyBar = document.getElementById(
      `product-form-${this.dataset.section}-product-buy-bar`
    );
    if (productForm_BuyBar) {
      const addButton_BuyBar = productForm_BuyBar.querySelector('[name="add"]');
      const addButtonText_BuyBar = productForm_BuyBar.querySelector(
        '[name="add"] > span'
      );

      if (disable) {
        addButton_BuyBar.setAttribute("disabled", "disabled");
        if (text) addButtonText_BuyBar.textContent = text;
      } else {
        addButton_BuyBar.removeAttribute("disabled");
        if (this.dataset.isPreorder == "true") {
          addButtonText_BuyBar.textContent = window.variantStrings.preOrder;
        } else {
          addButtonText_BuyBar.textContent = window.variantStrings.addToCart;
        }
      }
    }

    if (!modifyClass) return;
  }

  setUnavailable() {
    const button = document.getElementById(`product-form-${this.dataset.section}`);
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add('hidden');

    const button_BuyBar = document.getElementById(
      `product-form-${this.dataset.section}-product-buy-bar`
    );
    const addButton_BuyBar = button_BuyBar.querySelector('[name="add"]');
    const addButtonText_BuyBar = button_BuyBar.querySelector(
      '[name="add"] > span'
    );
    const price_BuyBar = document.getElementById(
      `price-${this.dataset.section}-product-buy-bar`
    );
    if (!addButton_BuyBar) return;
    addButtonText_BuyBar.textContent = window.variantStrings.unavailable;
    if (price_BuyBar) price_BuyBar.classList.add("hidden");
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}

customElements.define('variant-selects', VariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach(input => {
      if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
        input.classList.remove('disabled');
      } else {
        input.classList.add('disabled');
      }
    });
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
    });

    this.updateLegends();
  }

  updateLegends() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    fieldsets.forEach((fieldset) => {
      const legend = fieldset.querySelector('legend [data-variant-legend]');
      const selectedOption = Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked);
      legend.textContent = selectedOption.getAttribute('value');
    });
  }
}

customElements.define('variant-radios', VariantRadios);

class FloatingAddToCart {
  constructor() {
    this.floatingButton = document.querySelector('.floating-add-to-cart');
    this.addToCartBtn = document.querySelector('.floating-add-to-cart-btn');
    this.cartBadge = document.querySelector('.cart-count-badge');
    this.productForm = document.querySelector('.product-form');

    if (this.addToCartBtn && this.productForm) {
      this.init();
    }
  }

  init() {
    // Add click event listener to floating button
    this.addToCartBtn.addEventListener('click', this.handleAddToCart.bind(this));

    // Listen for cart updates using same events as header cart blip
    document.addEventListener('ajaxProduct:added', this.updateCartBadge.bind(this));
    document.addEventListener('cart:update', this.updateCartBadge.bind(this));
  }

  async handleAddToCart(evt) {
    evt.preventDefault();

    if (this.addToCartBtn.disabled) return;

    // Get current variant from main product form
    const variantInput = this.productForm.querySelector('[name="id"]');
    const quantityInput = this.productForm.querySelector('[name="quantity"]') || { value: 1 };

    if (!variantInput || !variantInput.value) {
      console.error('No variant selected');
      return;
    }

    // Disable button and show loading state
    this.addToCartBtn.disabled = true;
    this.addToCartBtn.style.opacity = '0.7';

    try {
      const formData = new FormData();
      formData.append('id', variantInput.value);
      formData.append('quantity', quantityInput.value || 1);

      const response = await fetch(window.routes.cart_add_url + '.js', {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        this.onAddToCartSuccess(result);
      } else {
        const error = await response.json();
        this.onAddToCartError(error);
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      this.onAddToCartError(error);
    } finally {
      // Re-enable button
      this.addToCartBtn.disabled = false;
      this.addToCartBtn.style.opacity = '1';
    }
  }

  onAddToCartSuccess(item) {
    // Trigger the same event that existing cart system uses
    document.dispatchEvent(new CustomEvent('ajaxProduct:added', { detail: item }));

    // Show brief success feedback
    this.showSuccessFeedback();

    // Open cart drawer to show the added item
    this.openCartDrawer();
  }

  onAddToCartError(error) {
    console.error('Failed to add to cart:', error);
    // Could show error feedback here
  }

  async updateCartBadge(e) {
    // Use exact same logic as header cart blip in global.js
    const cart = e.detail && e.detail.cart && e.detail.cart.item_count || await (async function () {
      const res = await fetch('/cart.json');
      const cart = await res.json();
      return cart;
    })();

    if (this.cartBadge) {
      this.cartBadge.textContent = cart.item_count || 0;
      if (cart && cart.item_count == 0) {
        this.cartBadge.setAttribute('hidden', true);
      } else {
        this.cartBadge.removeAttribute('hidden');
      }
    }
  }

  openCartDrawer() {
    // Find the cart link and trigger it to open the drawer
    const cartLink = document.querySelector('a[href="#drawer-cart"]');
    if (cartLink) {
      cartLink.click();
    } else {
      // Fallback: directly trigger drawer opening
      const drawer = document.getElementById('drawer-cart');
      if (drawer) {
        drawer.classList.add('is-open');
        drawer.style.opacity = '1';
        drawer.style.display = 'block';
        document.body.classList.add('overflow-hidden');
      }
    }
  }

  showSuccessFeedback() {
    // Brief scale animation to show success
    this.addToCartBtn.style.transform = 'scale(1.2)';
    setTimeout(() => {
      this.addToCartBtn.style.transform = '';
    }, 200);
  }
}

// Initialize floating add to cart when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new FloatingAddToCart();
});

class UpsellCard extends HTMLElement {
  constructor() {
    super();
    this.select = this.querySelector('select');
    this.image = this.querySelector('.card-media img');

    if (this.select) {
      this.select.addEventListener('change', (event) => {
        const selectedOption = event.target.options[event.target.selectedIndex];
        const newImgSrc = selectedOption.getAttribute('data-variant-img-src');
        if (newImgSrc) { this.updateImage(newImgSrc) }
      });
    }
  }

  updateImage(newImgSrc) {
    if (this.image) {
      this.image.src = newImgSrc;
    }
  }
}

customElements.define('upsell-card', UpsellCard);