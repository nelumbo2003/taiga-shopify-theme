if (customElements.get('quick-buy') === undefined) {

  customElements.define('quick-buy', class QuickBuy extends HTMLElement {
    constructor() {
      'use strict';
      super();

      this.processingModal = false;
      this.button = this.querySelector('a[href*="modal"]');
      this.targetModalId = this.button.getAttribute('href').substring(1);
      this.quickBuyProductHandle = this.button.dataset.productHandle;
      this.button.addEventListener('click', this.onModalRequestOpen.bind(this))
    }

    async onModalRequestOpen(event) {
      event.preventDefault();
      if (this.processingModal === true) {
        return;
      }

      const modal = document.getElementById(this.targetModalId);

      if (modal) {
        Woolman.ModalsAndDrawers.showModalOrDrawer(this.targetModalId);
        return;
      };

      this.processingModal = true;

      document.querySelectorAll('[data-quick-buy-modal]').forEach((modal) => {
        modal.remove();
      })

      const rootUrl = window.routes.root == '/' ? '/' : window.routes.root + '/'; // if user has selected locale convert root url from /en-gb to /en-gb/
      const res = await fetch(`${rootUrl}products/${this.quickBuyProductHandle}?view=ajax-modal`)
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const modalElement = doc.body.firstChild;
      document.body.appendChild(modalElement);
      Woolman.ModalsAndDrawers.showModalOrDrawer(this.targetModalId);

      this.modal = modalElement;
      this.hookEvents();
    }

    hookEvents() {
      this.updateOptions();

      this.modal.querySelector('.product-modal__radios').addEventListener('change', this.onVariantChange.bind(this));
      this.modal.querySelector('[data-close]').addEventListener('click', Woolman.ModalsAndDrawers.closeModalOrDrawerOrDrawerFromEvent);
      this.modal.querySelector('[data-overlay]').addEventListener('click', Woolman.ModalsAndDrawers.closeModalOrDrawerOrDrawerFromEvent);

      const productForm = document.getElementById(`product-form-${this.dataset.product}`);
      productForm.addEventListener('submit', this.handleSubmit.bind(this));

      this.processingModal = false;
    }

    onVariantChange() {
      this.updateOptions();
      this.updateMasterId();
      this.toggleAddButton(true, '', false);

      if (!this.currentVariant) {
        this.toggleAddButton(true, '', true);
        this.setUnavailable();
      } else {
        this.updateVariantInput();
        this.renderProductInfo();
      }
    }

    updateOptions() {
      const fieldsets = Array.from(this.modal.querySelectorAll('fieldset'));
      this.options = fieldsets.map((fieldset) => {
        return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
      });
    }

    toggleAddButton(disable = true, text, modifyClass = true) {
      const productForm = document.getElementById(`product-form-${this.dataset.product}`);
      if (!productForm) return;
      const addButton = productForm.querySelector('[name="add"]');
      const addButtonText = productForm.querySelector('[name="add"] > span');
      if (!addButton) return;

      if (disable) {
        addButton.setAttribute('disabled', 'disabled');
        if (text) addButtonText.textContent = text;
      } else {
        addButton.removeAttribute('disabled');
        if (this.modal.dataset.isPreorder == 'true') {
          addButtonText.textContent = window.variantStrings.preOrder;
        } else {
          addButtonText.textContent = window.variantStrings.addToCart;
        }
      }

      if (!modifyClass) return;
    }

    renderProductInfo() {
      fetch(`${this.dataset.url}?variant=${this.currentVariant.id}&view=ajax-modal`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html')
          const destination = document.getElementById(`price-${this.dataset.product}`);
          const source = html.getElementById(`price-${this.dataset.product}`);

          if (source && destination) destination.innerHTML = source.innerHTML;

          const price = document.getElementById(`price-${this.dataset.product}`);

          if (price) price.classList.remove('hidden');
          this.toggleAddButton(!this.currentVariant.available, window.variantStrings.soldOut);
        });
    }

    updateMasterId() {
      this.currentVariant = this.getVariantData().find((variant) => {
        return !variant.options.map((option, index) => {
          return this.options[index] === option;
        }).includes(false);
      });
    }

    updateVariantInput() {
      const productForms = document.querySelectorAll(`#product-form-${this.dataset.product}, #product-form-installment-${this.dataset.product}`);
      productForms.forEach((productForm) => {
        const input = productForm.querySelector('input[name="id"]');
        input.value = this.currentVariant.id;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    setUnavailable() {
      const button = document.getElementById(`product-form-${this.dataset.product}`);
      const addButton = button.querySelector('[name="add"]');
      const addButtonText = button.querySelector('[name="add"] > span');
      const price = document.getElementById(`price-${this.dataset.product}`);
      if (!addButton) return;
      addButtonText.textContent = window.variantStrings.unavailable;
      if (price) price.classList.add('hidden');
    }

    getVariantData() {
      this.variantData = this.variantData || JSON.parse(this.modal.querySelector('[type="application/json"]').textContent);
      return this.variantData;
    }

    async handleSubmit() {
      const overlay = this.modal.querySelector('[data-overlay]');
      overlay.click();
      Woolman.ModalsAndDrawers.closeModalOrDrawer(this.targetModalId);
    }
  })

  customElements.define('modal-radios', class ModalRadios extends HTMLElement {
    constructor() {
    super();
      this.addEventListener('change', this.onVariantChange);
    }

    onVariantChange(e) {
      this.updateOptions();
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
  });

}