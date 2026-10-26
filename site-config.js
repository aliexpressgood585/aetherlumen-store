/**
 * Store settings. Edit this file, then redeploy.
 * Leave a value as "" or null when you do not want it shown.
 * Do not invent a founding year, a customer count, a promo, or stock.
 *
 * Placeholders still to replace:
 *   businessName  [BUSINESS_LEGAL_NAME]
 *   storeEmail    [STORE_EMAIL]
 *   jurisdiction  [JURISDICTION]
 */
const SITE_CONFIG = {
  brandName: "AetherLumen",
  businessName: "[BUSINESS_LEGAL_NAME]",
  storeEmail: "[STORE_EMAIL]",
  jurisdiction: "[JURISDICTION]",
  siteUrl: "https://aetherlumen-store.netlify.app",

  // Optional. Empty hides the line. Do not guess these.
  foundedYear: "",
  customerCount: "",

  /**
   * Promo banner. Shown only when enabled is true, discountPercent is 1–90,
   * and endDate is a real ISO timestamp still in the future.
   * After endDate the banner hides itself. It does not reset the next day.
   * The same rules are applied again on the server when a Stripe session is created.
   */
  promo: {
    enabled: false,
    label: "",
    discountPercent: 0,
    endDate: "",
  },

  /**
   * Stock by product id.
   * null  = do not show a count
   * 0     = out of stock, add to cart disabled
   * 1+    = show "Only N left" and cap the quantity
   */
  stock: {
    "led-face-mask": null,
    "massage-gun": null,
    "posture-corrector": null,
    "red-light-belt": null,
    "sunrise-alarm": null,
    "scalp-massager": null,
    "jade-roller-set": null,
  },

  /**
   * Flat shipping in US cents charged at checkout.
   * 0 means the customer is not charged a separate shipping fee.
   * Confirm this matches what you actually pay the supplier before taking live orders.
   * freeShippingOverCents: set a number, or null if there is no free-shipping threshold.
   */
  shippingFlatCents: 0,
  freeShippingOverCents: null,
  shippingEstimateMinDays: 7,
  shippingEstimateMaxDays: 21,

  returnsWindowDays: 30,
  maxQtyPerProduct: 10,

  shipTo: ["US", "CA", "GB", "AU", "NZ", "IE", "DE", "FR", "NL", "SE", "NO", "DK", "FI", "ES", "IT", "PT", "BE", "AT", "CH"],
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = SITE_CONFIG;
}
if (typeof window !== "undefined") {
  window.SITE_CONFIG = SITE_CONFIG;
}
