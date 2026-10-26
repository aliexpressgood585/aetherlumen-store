(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.AetherCommerce = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const COUNTRIES = {
    US: "United States",
    CA: "Canada",
    GB: "United Kingdom",
    AU: "Australia",
    NZ: "New Zealand",
    IE: "Ireland",
    DE: "Germany",
    FR: "France",
    NL: "Netherlands",
    SE: "Sweden",
    NO: "Norway",
    DK: "Denmark",
    FI: "Finland",
    ES: "Spain",
    IT: "Italy",
    PT: "Portugal",
    BE: "Belgium",
    AT: "Austria",
    CH: "Switzerland",
  };

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function priceToCents(price) {
    const n = Number(price);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n * 100);
  }

  function formatMoney(cents) {
    const n = Number(cents) || 0;
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(n);
    const dollars = Math.floor(abs / 100);
    const rem = String(abs % 100).padStart(2, "0");
    return sign + "$" + dollars.toLocaleString("en-US") + "." + rem;
  }

  function formatUtc(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const dd = d.getUTCDate();
    const mon = MONTHS[d.getUTCMonth()];
    const y = d.getUTCFullYear();
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return dd + " " + mon + " " + y + ", " + hh + ":" + mm + " UTC";
  }

  function activePromo(config, now) {
    const promo = (config && config.promo) || {};
    if (!promo.enabled) return null;
    const pct = Number(promo.discountPercent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 90) return null;
    const end = Date.parse(promo.endDate);
    if (!Number.isFinite(end)) return null;
    const at = now instanceof Date ? now.getTime() : Date.parse(now);
    if (!Number.isFinite(at) || at >= end) return null;
    return {
      label: typeof promo.label === "string" ? promo.label : "",
      discountPercent: pct,
      endDate: new Date(end).toISOString(),
    };
  }

  function promoMessage(promo) {
    if (!promo) return "";
    const when = formatUtc(promo.endDate);
    const label = promo.label ? promo.label + ". " : "";
    return label + promo.discountPercent + "% off until " + when + ". This end time is fixed and does not reset the next day.";
  }

  function discountedUnitCents(listCents, promo) {
    if (!promo) return listCents;
    return Math.round(listCents * (100 - promo.discountPercent) / 100);
  }

  function stockState(stock) {
    if (stock === null || stock === undefined || stock === "") {
      return { mode: "hidden", n: null, label: "" };
    }
    const n = Number(stock);
    if (!Number.isInteger(n) || n < 0) {
      return { mode: "hidden", n: null, label: "" };
    }
    if (n === 0) return { mode: "out", n: 0, label: "Out of stock" };
    return { mode: "low", n: n, label: "Only " + n + " left" };
  }

  function shippingCents(subtotalCents, config) {
    const flatRaw = config.shippingFlatCents;
    const flat = flatRaw === null || flatRaw === undefined || flatRaw === "" ? 0 : Math.round(Number(flatRaw));
    const safeFlat = Number.isFinite(flat) && flat > 0 ? flat : 0;
    const over = config.freeShippingOverCents;
    if (over !== null && over !== undefined && over !== "" && Number.isFinite(Number(over))) {
      if (subtotalCents >= Math.round(Number(over))) return 0;
    }
    return safeFlat;
  }

  function shippingLabel(config, subtotalCents) {
    const cents = shippingCents(subtotalCents || 0, config);
    if (cents === 0 && (config.shippingFlatCents === 0 || config.shippingFlatCents === "0")) {
      return "No separate shipping fee";
    }
    if (cents === 0 && config.freeShippingOverCents != null && subtotalCents >= Number(config.freeShippingOverCents)) {
      return "Shipping fee waived for this order total";
    }
    return "Tracked shipping " + formatMoney(cents);
  }

  function isPlaceholder(value) {
    return value == null || String(value).trim() === "" || String(value).trim().startsWith("[");
  }

  function validateShipping(input, config) {
    const src = input || {};
    const errors = {};
    const value = {
      fullName: String(src.fullName || "").trim(),
      email: String(src.email || "").trim(),
      phone: String(src.phone || "").trim(),
      address1: String(src.address1 || "").trim(),
      address2: String(src.address2 || "").trim(),
      city: String(src.city || "").trim(),
      region: String(src.region || "").trim(),
      postalCode: String(src.postalCode || "").trim(),
      country: String(src.country || "").trim().toUpperCase(),
    };

    if (value.fullName.length < 2 || value.fullName.length > 80 || !/[A-Za-z]/.test(value.fullName)) {
      errors.fullName = "Enter the recipient's full name.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) || value.email.length > 100) {
      errors.email = "Enter a valid email address.";
    }
    if (value.phone && !/^[0-9+().\-\s]{7,20}$/.test(value.phone)) {
      errors.phone = "Enter a phone number with digits, spaces, or + ( ) . - only, or leave it blank.";
    }
    if (value.address1.length < 5 || value.address1.length > 120) {
      errors.address1 = "Enter a street address.";
    }
    if (value.address2.length > 120) {
      errors.address2 = "Address line 2 is too long.";
    }
    if (value.city.length < 2 || value.city.length > 80) {
      errors.city = "Enter a city.";
    }
    if (value.region.length < 2 || value.region.length > 80) {
      errors.region = "Enter a state, province, or region.";
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9 \-]{2,11}$/.test(value.postalCode)) {
      errors.postalCode = "Enter a postal code.";
    }
    const allowed = (config && config.shipTo) || Object.keys(COUNTRIES);
    if (!allowed.includes(value.country)) {
      errors.country = "Choose a country we ship to.";
    }
    return { ok: Object.keys(errors).length === 0, errors: errors, value: value };
  }

  function quote(items, catalogById, config, now) {
    const promo = activePromo(config, now || new Date());
    const maxDefault = (config && config.maxQtyPerProduct) || 10;
    const lines = [];
    const errors = [];
    const list = Array.isArray(items) ? items : [];
    list.forEach(function (item) {
      if (!item || typeof item.id !== "string") {
        errors.push("A cart line is missing a product.");
        return;
      }
      const product = catalogById[item.id];
      if (!product) {
        errors.push("Unknown product.");
        return;
      }
      const qty = Number(item.qty);
      if (!Number.isInteger(qty) || qty < 1) {
        errors.push("Quantity must be a whole number of at least 1.");
        return;
      }
      const stock = stockState(config.stock ? config.stock[item.id] : null);
      const cap = stock.mode === "hidden" ? maxDefault : Math.min(stock.n, maxDefault);
      if (stock.mode === "out" || qty > cap) {
        errors.push(product.name + " is limited to " + cap + ".");
        return;
      }
      const listUnit = priceToCents(product.price);
      const unit = discountedUnitCents(listUnit, promo);
      lines.push({
        id: product.id,
        name: product.name,
        image: product.image,
        qty: qty,
        listUnitCents: listUnit,
        unitCents: unit,
        lineCents: unit * qty,
      });
    });
    const subtotalCents = lines.reduce(function (sum, line) { return sum + line.lineCents; }, 0);
    const ship = lines.length ? shippingCents(subtotalCents, config) : 0;
    const discountCents = lines.reduce(function (sum, line) {
      return sum + (line.listUnitCents - line.unitCents) * line.qty;
    }, 0);
    return {
      ok: errors.length === 0 && lines.length > 0,
      errors: errors,
      lines: lines,
      promo: promo,
      subtotalCents: subtotalCents,
      shippingCents: ship,
      discountCents: discountCents,
      totalCents: subtotalCents + ship,
    };
  }

  return {
    COUNTRIES: COUNTRIES,
    priceToCents: priceToCents,
    formatMoney: formatMoney,
    formatUtc: formatUtc,
    activePromo: activePromo,
    promoMessage: promoMessage,
    discountedUnitCents: discountedUnitCents,
    stockState: stockState,
    shippingCents: shippingCents,
    shippingLabel: shippingLabel,
    isPlaceholder: isPlaceholder,
    validateShipping: validateShipping,
    quote: quote,
  };
});
