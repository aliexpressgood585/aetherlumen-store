(function () {
  const C = window.AetherCommerce;
  const config = window.SITE_CONFIG || {};
  const CART_KEY = "aetherlumen_cart_v1";
  const SHIP_KEY = "aetherlumen_shipping_v1";
  let products = [];
  let catalog = {};

  function money(cents) { return C.formatMoney(cents); }

  function loadCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (item) {
        return item && typeof item.id === "string" && Number.isInteger(item.qty) && item.qty > 0;
      });
    } catch (err) {
      return [];
    }
  }

  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    renderCart();
  }

  function loadShipping() {
    try {
      return JSON.parse(sessionStorage.getItem(SHIP_KEY) || "null");
    } catch (err) {
      return null;
    }
  }

  function saveShipping(value) {
    sessionStorage.setItem(SHIP_KEY, JSON.stringify(value));
  }

  function announce(text) {
    const live = document.getElementById("live");
    if (live) live.textContent = text;
  }

  function capFor(id) {
    const stock = C.stockState(config.stock ? config.stock[id] : null);
    const maxDefault = config.maxQtyPerProduct || 10;
    if (stock.mode === "out") return 0;
    if (stock.mode === "hidden") return maxDefault;
    return Math.min(stock.n, maxDefault);
  }

  function addToCart(id) {
    const product = catalog[id];
    if (!product) return;
    const cap = capFor(id);
    if (cap < 1) {
      announce(product.name + " is out of stock.");
      return;
    }
    const cart = loadCart();
    const existing = cart.find(function (item) { return item.id === id; });
    if (existing) {
      if (existing.qty >= cap) {
        announce("The most you can add of " + product.name + " is " + cap + ".");
        return;
      }
      existing.qty += 1;
    } else {
      cart.push({ id: id, qty: 1 });
    }
    saveCart(cart);
    announce(product.name + " added to cart.");
  }

  function changeQty(id, delta) {
    const cap = capFor(id);
    const current = loadCart();
    const existing = current.find(function (item) { return item.id === id; });
    if (!existing) return;
    const next = existing.qty + delta;
    if (next > cap) {
      announce("Quantity cannot go above " + cap + ".");
      return;
    }
    const cart = [];
    current.forEach(function (item) {
      if (item.id !== id) {
        cart.push(item);
        return;
      }
      if (next > 0) cart.push({ id: id, qty: next });
    });
    saveCart(cart);
  }

  function renderCart() {
    const cart = loadCart();
    const count = cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
    document.querySelectorAll("[data-cart-count]").forEach(function (el) { el.textContent = String(count); });
    const itemsEl = document.getElementById("cart-items");
    const subEl = document.getElementById("cart-subtotal");
    if (!itemsEl) return;
    const priced = C.quote(cart, catalog, config, new Date());
    if (!cart.length) {
      itemsEl.innerHTML = "<p>Your cart is empty.</p>";
    } else {
      itemsEl.innerHTML = priced.lines.map(function (line) {
        return '<div class="cart-line"><img src="/images/' + line.image + '" alt="" width="64" height="64">' +
          "<div><strong>" + escapeHtml(line.name) + "</strong><div>" + money(line.unitCents) + "</div>" +
          '<div class="qty"><button type="button" data-qty="-1" data-id="' + line.id + '" aria-label="Decrease quantity">−</button>' +
          "<span>" + line.qty + "</span>" +
          '<button type="button" data-qty="1" data-id="' + line.id + '" aria-label="Increase quantity">+</button></div></div></div>';
      }).join("");
    }
    if (subEl) subEl.textContent = money(priced.subtotalCents);
    const shipEl = document.getElementById("cart-ship");
    if (shipEl) shipEl.textContent = C.shippingLabel(config, priced.subtotalCents);
    const checkoutRoot = document.getElementById("checkout-root");
    if (checkoutRoot) renderCheckout();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function initPromo() {
    const promo = C.activePromo(config, new Date());
    const bar = document.querySelector("[data-promo]");
    if (!bar) return;
    if (!promo) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    bar.textContent = C.promoMessage(promo);
    document.querySelectorAll("[data-price-for]").forEach(function (el) {
      const product = catalog[el.getAttribute("data-price-for")];
      if (!product) return;
      const list = C.priceToCents(product.price);
      const sale = C.discountedUnitCents(list, promo);
      el.textContent = "";
      const old = document.createElement("s");
      old.textContent = money(list);
      const now = document.createElement("span");
      now.textContent = money(sale);
      el.appendChild(old);
      el.appendChild(document.createTextNode(" "));
      el.appendChild(now);
    });
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function (script) {
      try {
        const data = JSON.parse(script.textContent);
        if (data["@type"] === "Product" && data.offers && data.offers.price) {
          const list = Math.round(Number(data.offers.price) * 100);
          data.offers.price = (C.discountedUnitCents(list, promo) / 100).toFixed(2);
          script.textContent = JSON.stringify(data);
        }
      } catch (err) { /* leave structured data as published */ }
    });
  }

  function initStock() {
    document.querySelectorAll("[data-stock-for]").forEach(function (el) {
      const id = el.getAttribute("data-stock-for");
      const state = C.stockState(config.stock ? config.stock[id] : null);
      if (state.mode === "hidden") {
        el.hidden = true;
        el.textContent = "";
        return;
      }
      el.hidden = false;
      el.textContent = state.label;
      if (state.mode === "out") {
        document.querySelectorAll('[data-add="' + id + '"]').forEach(function (btn) {
          btn.disabled = true;
          btn.textContent = "Out of stock";
        });
      }
    });
  }

  function initOptionalFacts() {
    document.querySelectorAll("[data-optional]").forEach(function (el) {
      const key = el.getAttribute("data-optional");
      const value = config[key];
      if (C.isPlaceholder(value)) {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      if (key === "foundedYear") el.textContent = "Selling since " + value + ".";
      if (key === "customerCount") el.textContent = value + " orders on record with this store.";
    });
  }

  function initNav() {
    const toggle = document.querySelector("[data-menu-toggle]");
    const nav = document.getElementById("nav-links");
    if (!toggle || !nav) return;
    const mobileQuery = window.matchMedia("(max-width: 800px)");
    function syncInert() {
      const mobile = mobileQuery.matches;
      const open = nav.classList.contains("is-open");
      if (!mobile || open) {
        nav.removeAttribute("inert");
        nav.removeAttribute("aria-hidden");
      } else {
        nav.setAttribute("inert", "");
        nav.setAttribute("aria-hidden", "true");
      }
    }
    function close() {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      document.body.classList.remove("nav-open");
      syncInert();
    }
    function open() {
      nav.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
      syncInert();
      const first = nav.querySelector("a");
      if (first) first.focus();
    }
    toggle.addEventListener("click", function () {
      if (nav.classList.contains("is-open")) close();
      else open();
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        close();
        toggle.focus();
      }
    });
    mobileQuery.addEventListener("change", function () {
      if (!mobileQuery.matches) close();
      syncInert();
    });
    syncInert();
  }

  function initCartDrawer() {
    const drawer = document.getElementById("cart-sidebar");
    const backdrop = document.querySelector("[data-cart-backdrop]");
    if (!drawer) return;
    function open() {
      drawer.hidden = false;
      if (backdrop) backdrop.hidden = false;
      const opener = document.querySelector("[data-cart-open]");
      if (opener) opener.setAttribute("aria-expanded", "true");
      const closeBtn = drawer.querySelector("[data-cart-close]");
      if (closeBtn) closeBtn.focus();
    }
    function close() {
      drawer.hidden = true;
      if (backdrop) backdrop.hidden = true;
      const opener = document.querySelector("[data-cart-open]");
      if (opener) {
        opener.setAttribute("aria-expanded", "false");
        opener.focus();
      }
    }
    document.querySelectorAll("[data-cart-open]").forEach(function (btn) {
      btn.addEventListener("click", open);
    });
    document.querySelectorAll("[data-cart-close]").forEach(function (btn) {
      btn.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !drawer.hidden) close();
    });
    document.body.addEventListener("click", function (event) {
      const add = event.target.closest("[data-add]");
      if (add && !add.disabled) {
        addToCart(add.getAttribute("data-add"));
        return;
      }
      const qty = event.target.closest("[data-qty]");
      if (qty) changeQty(qty.getAttribute("data-id"), Number(qty.getAttribute("data-qty")));
    });
  }

  function initGallery() {
    const main = document.querySelector("[data-gallery-main]");
    const dialog = document.querySelector("[data-zoom-dialog]");
    if (!main) return;
    document.querySelectorAll("[data-gallery-src]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        main.src = btn.getAttribute("data-gallery-src");
        main.alt = btn.getAttribute("data-gallery-alt") || "";
        main.width = btn.getAttribute("data-gallery-w");
        main.height = btn.getAttribute("data-gallery-h");
        document.querySelectorAll("[data-gallery-src]").forEach(function (other) {
          other.setAttribute("aria-current", other === btn ? "true" : "false");
        });
      });
    });
    const openBtn = document.querySelector("[data-open-zoom]");
    if (!dialog || !openBtn) return;
    const zoomImg = dialog.querySelector("img");
    openBtn.addEventListener("click", function () {
      zoomImg.src = main.src;
      zoomImg.alt = main.alt;
      zoomImg.classList.remove("is-zoomed");
      dialog.showModal();
    });
    dialog.querySelector("[data-zoom-close]").addEventListener("click", function () { dialog.close(); });
    dialog.querySelector("[data-zoom-toggle]").addEventListener("click", function () {
      zoomImg.classList.toggle("is-zoomed");
    });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
  }

  function initSticky() {
    const bar = document.querySelector("[data-sticky-atc]");
    const target = document.querySelector("[data-main-add]");
    if (!bar || !target || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(function (entries) {
      const visible = entries[0].isIntersecting;
      bar.classList.toggle("is-visible", !visible);
      document.body.classList.toggle("has-sticky", !visible);
    }, { threshold: 0.4 });
    observer.observe(target);
  }

  function setStep(step) {
    document.querySelectorAll("[data-step-panel]").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-step-panel") !== step;
    });
    document.querySelectorAll("[data-step-link]").forEach(function (btn) {
      const on = btn.getAttribute("data-step-link") === step;
      btn.setAttribute("aria-current", on ? "step" : "false");
    });
    if (step === "payment") loadPaymentStatus();
    if (step === "confirmation") loadConfirmation();
  }

  function renderCheckout() {
    const root = document.getElementById("checkout-lines");
    if (!root) return;
    const priced = C.quote(loadCart(), catalog, config, new Date());
    if (!priced.lines.length) {
      root.innerHTML = "<p>Your cart is empty. <a href='/#products'>Browse products</a>.</p>";
    } else {
      root.innerHTML = priced.lines.map(function (line) {
        return "<div class='summary-line'><span>" + escapeHtml(line.name) + " × " + line.qty + "</span><span>" + money(line.lineCents) + "</span></div>";
      }).join("") +
        (priced.discountCents ? "<div class='summary-line'><span>Discount</span><span>−" + money(priced.discountCents) + "</span></div>" : "") +
        "<div class='summary-line'><span>Subtotal</span><span>" + money(priced.subtotalCents) + "</span></div>" +
        "<div class='summary-line'><span>Shipping</span><span>" + money(priced.shippingCents) + "</span></div>" +
        "<div class='total-line'><span>Total</span><span>" + money(priced.totalCents) + "</span></div>" +
        "<p class='fine'>The amount on the Stripe page, when payments are enabled, is the amount charged. Prices are taken from the catalog, not from this browser.</p>";
    }
    const paySummary = document.getElementById("payment-summary");
    if (paySummary) paySummary.innerHTML = root.innerHTML;
  }

  function showFieldErrors(errors) {
    document.querySelectorAll("[data-error-for]").forEach(function (el) {
      const key = el.getAttribute("data-error-for");
      el.textContent = errors[key] || "";
    });
  }

  function initCheckout() {
    if (!document.getElementById("checkout-root")) return;
    const params = new URLSearchParams(location.search);
    let step = params.get("step") || "cart";
    if (!["cart", "shipping", "payment", "confirmation"].includes(step)) step = "cart";
    setStep(step);
    document.querySelectorAll("[data-step-link]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const next = btn.getAttribute("data-step-link");
        if (next === "payment" || next === "confirmation") return;
        if (next === "shipping" && !loadCart().length) return;
        history.replaceState(null, "", "checkout.html?step=" + next);
        setStep(next);
      });
    });
    const toShipping = document.getElementById("to-shipping");
    if (toShipping) {
      toShipping.addEventListener("click", function () {
        if (!loadCart().length) {
          announce("Your cart is empty.");
          return;
        }
        history.replaceState(null, "", "checkout.html?step=shipping");
        setStep("shipping");
      });
    }
    const form = document.getElementById("shipping-form");
    if (form) {
      const saved = loadShipping();
      if (saved) {
        Object.keys(saved).forEach(function (key) {
          if (form.elements[key]) form.elements[key].value = saved[key];
        });
      }
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const result = C.validateShipping(data, config);
        showFieldErrors(result.errors);
        if (!form.elements.policies.checked) {
          const policyError = document.querySelector('[data-error-for="policies"]');
          if (policyError) policyError.textContent = "Confirm that you have read the shipping and returns policies.";
          result.ok = false;
        }
        if (!result.ok) {
          const first = form.querySelector(".field-error:not(:empty)");
          if (first) first.scrollIntoView({ block: "center" });
          return;
        }
        saveShipping(result.value);
        history.replaceState(null, "", "checkout.html?step=payment");
        setStep("payment");
      });
    }
    const payBtn = document.getElementById("pay-button");
    if (payBtn) {
      payBtn.addEventListener("click", startStripe);
    }
    if (params.get("canceled") === "1") {
      const box = document.getElementById("payment-message");
      if (box) {
        box.hidden = false;
        box.className = "notice";
        box.textContent = "You left Stripe before paying. No charge was made.";
      }
    }
  }

  async function loadPaymentStatus() {
    const box = document.getElementById("payment-message");
    const payBtn = document.getElementById("pay-button");
    const shipping = loadShipping();
    const check = shipping ? C.validateShipping(shipping, config) : { ok: false };
    if (!check.ok || !loadCart().length) {
      if (box) {
        box.hidden = false;
        box.className = "notice";
        box.textContent = "Add a shipping address before payment.";
      }
      if (payBtn) payBtn.hidden = true;
      return;
    }
    const address = document.getElementById("payment-address");
    if (address) {
      address.textContent = shipping.fullName + ", " + shipping.address1 + ", " + shipping.city + ", " + shipping.region + " " + shipping.postalCode + ", " + shipping.country;
    }
    if (payBtn) {
      payBtn.hidden = false;
      payBtn.disabled = true;
      payBtn.textContent = "Checking payment setup…";
    }
    try {
      const res = await fetch("/.netlify/functions/stripe-status");
      const data = await res.json();
      if (data.enabled) {
        if (box) {
          box.hidden = false;
          box.className = "notice";
          box.textContent = data.message;
        }
        if (payBtn) {
          payBtn.disabled = false;
          payBtn.textContent = "Continue to Stripe";
        }
      } else {
        if (box) {
          box.hidden = false;
          box.className = "notice notice-bad";
          box.textContent = data.message || "Payments not yet enabled.";
        }
        if (payBtn) payBtn.hidden = true;
      }
    } catch (err) {
      if (box) {
        box.hidden = false;
        box.className = "notice notice-bad";
        box.textContent = "Payments not yet enabled. The payment service did not respond. On Netlify, set the Stripe test keys and redeploy. No order is created from this page.";
      }
      if (payBtn) payBtn.hidden = true;
    }
  }

  async function startStripe() {
    const payBtn = document.getElementById("pay-button");
    const box = document.getElementById("payment-message");
    const shipping = loadShipping();
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.textContent = "Contacting Stripe…";
    }
    try {
      const res = await fetch("/.netlify/functions/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: loadCart(), shipping: shipping }),
      });
      const data = await res.json();
      if (data.url) {
        location.href = data.url;
        return;
      }
      const detail = data.message || (data.messages || []).join(" ") || "Payments not yet enabled. No charge was made.";
      if (box) {
        box.hidden = false;
        box.className = "notice notice-bad";
        box.textContent = detail;
      }
    } catch (err) {
      if (box) {
        box.hidden = false;
        box.className = "notice notice-bad";
        box.textContent = "Payments not yet enabled. The payment request failed before a charge could be made.";
      }
    }
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.textContent = "Continue to Stripe";
    }
  }

  async function loadConfirmation() {
    const box = document.getElementById("confirmation-box");
    if (!box) return;
    const params = new URLSearchParams(location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) {
      box.innerHTML = "<div class='notice'>No completed payment is attached to this page. If you have not paid, you do not have an order.</div>";
      return;
    }
    box.innerHTML = "<p>Checking the payment with Stripe…</p>";
    try {
      const res = await fetch("/.netlify/functions/get-checkout-session?session_id=" + encodeURIComponent(sessionId));
      const data = await res.json();
      if (!res.ok || !data.paid) {
        box.innerHTML = "<div class='notice notice-bad'>" + escapeHtml(data.message || "This payment is not complete. No order was confirmed.") + "</div>";
        return;
      }
      localStorage.removeItem(CART_KEY);
      renderCart();
      const testNote = data.livemode ? "" : "<p><strong>Stripe test mode.</strong> This is not a live charge, and it is not sent to a supplier for fulfillment.</p>";
      box.innerHTML = "<div class='notice notice-ok'><h2>Payment reference</h2>" + testNote +
        "<p>Order reference: <strong>" + escapeHtml(data.orderNumber) + "</strong></p>" +
        (data.email ? "<p>Email on the Stripe session: " + escapeHtml(data.email) + "</p>" : "") +
        (data.amountTotal != null ? "<p>Amount: " + money(data.amountTotal) + "</p>" : "") +
        "<p>This site does not send an automatic email. Keep the reference above and use the contact address in the footer if you need to write to the store. Tracking is sent only when a carrier number exists.</p></div>";
    } catch (err) {
      box.innerHTML = "<div class='notice notice-bad'>We could not verify a payment. Nothing on this page confirms an order.</div>";
    }
  }

  async function boot() {
    initNav();
    initCartDrawer();
    try {
      const res = await fetch("/data/products.json");
      products = await res.json();
    } catch (err) {
      const inline = document.getElementById("product-data");
      products = inline ? JSON.parse(inline.textContent) : [];
    }
    products.forEach(function (product) { catalog[product.id] = product; });
    initPromo();
    initStock();
    initOptionalFacts();
    initGallery();
    initSticky();
    initCheckout();
    renderCart();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
