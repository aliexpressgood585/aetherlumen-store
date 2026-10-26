const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const commerce = require("../shared/commerce");
const config = require("../site-config");
const products = require("../data/products.json");
const { describeStripeEnv } = require("../netlify/functions/stripe-mode");
const { handler: createCheckout } = require("../netlify/functions/create-checkout-session");
const { handler: stripeStatus } = require("../netlify/functions/stripe-status");

const catalog = Object.fromEntries(products.map(function (product) { return [product.id, product]; }));

test("promo stays off with the default config", function () {
  assert.equal(commerce.activePromo(config, new Date("2026-11-01T00:00:00Z")), null);
  assert.equal(commerce.promoMessage(null), "");
});

test("promo requires a real end date and hides after it", function () {
  const base = {
    promo: { enabled: true, label: "Autumn", discountPercent: 10, endDate: "2026-11-30T23:59:00Z" },
  };
  const before = commerce.activePromo(base, new Date("2026-11-30T23:58:00Z"));
  assert.equal(before.discountPercent, 10);
  assert.match(commerce.promoMessage(before), /30 November 2026, 23:59 UTC/);
  assert.match(commerce.promoMessage(before), /does not reset/);
  assert.equal(commerce.activePromo(base, new Date("2026-12-01T00:00:00Z")), null);
  assert.equal(commerce.activePromo({ promo: { enabled: true, discountPercent: 10, endDate: "" } }, new Date()), null);
  assert.equal(commerce.activePromo({ promo: { enabled: true, discountPercent: 100, endDate: "2026-12-01T00:00:00Z" } }, new Date("2026-11-01")), null);
});

test("stock copy appears only for an integer the owner set", function () {
  assert.equal(commerce.stockState(null).mode, "hidden");
  assert.equal(commerce.stockState(undefined).label, "");
  assert.equal(commerce.stockState("").label, "");
  assert.equal(commerce.stockState(3).label, "Only 3 left");
  assert.equal(commerce.stockState(0).label, "Out of stock");
  assert.equal(commerce.stockState(1.5).mode, "hidden");
});

test("checkout price comes from the catalog, not the browser", function () {
  const promoConfig = {
    promo: { enabled: true, discountPercent: 10, endDate: "2026-12-31T00:00:00Z" },
    stock: { "led-face-mask": 4 },
    shippingFlatCents: 500,
    freeShippingOverCents: null,
    maxQtyPerProduct: 10,
  };
  const priced = commerce.quote(
    [{ id: "led-face-mask", qty: 2, price: 1 }],
    catalog,
    promoConfig,
    new Date("2026-11-01T00:00:00Z")
  );
  assert.equal(priced.ok, true);
  assert.equal(priced.lines[0].listUnitCents, 8900);
  assert.equal(priced.lines[0].unitCents, 8010);
  assert.equal(priced.shippingCents, 500);
  assert.equal(priced.totalCents, 8010 * 2 + 500);
  const over = commerce.quote([{ id: "led-face-mask", qty: 5 }], catalog, promoConfig, new Date("2026-11-01T00:00:00Z"));
  assert.equal(over.ok, false);
});

test("shipping validation rejects an incomplete address", function () {
  const bad = commerce.validateShipping({ fullName: "A", email: "nope", country: "ZZ" }, config);
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.fullName);
  assert.ok(bad.errors.email);
  assert.ok(bad.errors.country);
  const good = commerce.validateShipping({
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "",
    address1: "12 Lamp Street",
    address2: "",
    city: "London",
    region: "London",
    postalCode: "SW1A 1AA",
    country: "GB",
  }, config);
  assert.equal(good.ok, true);
});

test("included shipping is zero until the owner sets a fee", function () {
  assert.equal(config.shippingFlatCents, 0);
  assert.equal(commerce.shippingCents(8900, config), 0);
  const waived = commerce.shippingCents(8000, { shippingFlatCents: 500, freeShippingOverCents: 7500 });
  assert.equal(waived, 0);
  const charged = commerce.shippingCents(1000, { shippingFlatCents: 500, freeShippingOverCents: 7500 });
  assert.equal(charged, 500);
});

test("stripe test keys are required and live keys are refused", async function () {
  const savedSecret = process.env.STRIPE_SECRET_KEY;
  const savedPub = process.env.STRIPE_PUBLISHABLE_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PUBLISHABLE_KEY;
  assert.deepEqual(describeStripeEnv(process.env).reason, "missing");
  const missing = await createCheckout({ httpMethod: "POST", body: "{}", headers: { origin: "http://127.0.0.1:4173" } });
  assert.equal(missing.statusCode, 503);
  assert.match(JSON.parse(missing.body).message, /Payments not yet enabled/);
  process.env.STRIPE_SECRET_KEY = "sk_live_example";
  process.env.STRIPE_PUBLISHABLE_KEY = "pk_live_example";
  const live = await stripeStatus({ httpMethod: "GET", headers: {} });
  assert.equal(JSON.parse(live.body).reason, "not_test");
  assert.match(JSON.parse(live.body).message, /not yet enabled/);
  process.env.STRIPE_SECRET_KEY = "sk_test_example";
  process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_example";
  const ready = await stripeStatus({ httpMethod: "GET", headers: {} });
  assert.equal(JSON.parse(ready.body).enabled, true);
  if (savedSecret === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = savedSecret;
  if (savedPub === undefined) delete process.env.STRIPE_PUBLISHABLE_KEY;
  else process.env.STRIPE_PUBLISHABLE_KEY = savedPub;
});

test("published pages do not invent reviews, ratings, or urgency", function () {
  const dist = path.join(__dirname, "../dist");
  assert.ok(fs.existsSync(path.join(dist, "index.html")), "run npm run build before this test");
  const banned = ["Verified Buyer", "Sarah M.", "James T.", "Emily R.", "aggregateRating", "FDA-cleared", "clinically proven", "2,400", "happy customers", "Only 3 left", "Only 2 left"];
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html")) files.push(full);
    }
  }
  walk(dist);
  const combined = files.map(function (file) { return fs.readFileSync(file, "utf8"); }).join("\n");
  banned.forEach(function (phrase) {
    assert.equal(combined.includes(phrase), false, phrase);
  });
  products.forEach(function (product) {
    const html = fs.readFileSync(path.join(dist, "products", product.id + ".html"), "utf8");
    assert.match(html, /No reviews yet\. Be the first\./);
    assert.match(html, /<link rel="canonical"/);
    assert.match(html, /property="og:title"/);
    assert.match(html, /name="twitter:card"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /loading="lazy"/);
    assert.match(html, new RegExp('width="' + product.imageWidth + '"'));
    assert.match(html, /\.webp/);
    assert.doesNotMatch(html, /aggregateRating/);
    assert.match(html, /name="product-review"/);
    assert.match(html, /netlify/);
  });
  const home = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  assert.match(home, /Share your AetherLumen moment/);
  assert.match(home, /Brand imagery, not a customer photo/);
  assert.match(home, /name="ugc-moment"/);
  assert.match(home, /aria-expanded="false"/);
  assert.match(home, /aria-controls="nav-links"/);
  const sitemap = fs.readFileSync(path.join(dist, "sitemap.xml"), "utf8");
  products.forEach(function (product) {
    assert.match(sitemap, new RegExp("/products/" + product.id + "\\.html"));
  });
  assert.match(fs.readFileSync(path.join(dist, "robots.txt"), "utf8"), /Sitemap:/);
  assert.match(fs.readFileSync(path.join(dist, "shipping.html"), "utf8"), /\[STORE_EMAIL\]/);
  assert.match(fs.readFileSync(path.join(dist, "terms.html"), "utf8"), /\[JURISDICTION\]/);
  assert.match(fs.readFileSync(path.join(dist, "privacy.html"), "utf8"), /\[BUSINESS_LEGAL_NAME\]/);
});
