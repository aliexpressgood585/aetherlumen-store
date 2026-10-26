const fs = require("fs");
const path = require("path");
const config = require("../../site-config");
const commerce = require("../../shared/commerce");

const products = JSON.parse(fs.readFileSync(path.join(__dirname, "../../data/products.json"), "utf8"));
const reviews = JSON.parse(fs.readFileSync(path.join(__dirname, "../../data/reviews.json"), "utf8"));
const ugc = JSON.parse(fs.readFileSync(path.join(__dirname, "../../data/ugc-approved.json"), "utf8"));

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
  });
}

function baseUrl() {
  return String(config.siteUrl || "").replace(/\/$/, "");
}

function abs(urlPath) {
  return baseUrl() + urlPath;
}

function money(cents) {
  return commerce.formatMoney(cents);
}

function emailHtml() {
  if (commerce.isPlaceholder(config.storeEmail)) {
    return '<span class="placeholder">' + esc(config.storeEmail || "[STORE_EMAIL]") + "</span>";
  }
  return '<a href="mailto:' + esc(config.storeEmail) + '">' + esc(config.storeEmail) + "</a>";
}

function businessHtml() {
  if (commerce.isPlaceholder(config.businessName)) {
    return '<span class="placeholder">' + esc(config.businessName || "[BUSINESS_LEGAL_NAME]") + "</span>";
  }
  return esc(config.businessName);
}

function jurisdictionHtml() {
  if (commerce.isPlaceholder(config.jurisdiction)) {
    return '<span class="placeholder">' + esc(config.jurisdiction || "[JURISDICTION]") + "</span>";
  }
  return esc(config.jurisdiction);
}

function placeholderNote() {
  const pending = [
    ["Business legal name", config.businessName],
    ["Store email", config.storeEmail],
    ["Jurisdiction", config.jurisdiction],
  ].filter(function (pair) { return commerce.isPlaceholder(pair[1]); });
  if (!pending.length) return "";
  return '<aside class="placeholder-note"><strong>Still to be completed by the store.</strong> These fields are placeholders and are not working contact details yet: ' +
    pending.map(function (pair) { return esc(pair[0]) + " (" + esc(pair[1]) + ")"; }).join("; ") + ".</aside>";
}

function jsonScript(obj) {
  return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, "\\u003c") + "</script>";
}

function orgLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: config.brandName,
    url: baseUrl(),
    logo: abs("/icon-512.png"),
  };
  if (!commerce.isPlaceholder(config.storeEmail)) data.email = config.storeEmail;
  if (!commerce.isPlaceholder(config.businessName)) data.legalName = config.businessName;
  return data;
}

function head(opts) {
  const url = abs(opts.path);
  const image = opts.image || abs("/og-image.png");
  const scripts = (opts.jsonLd || [orgLd()]).map(jsonScript).join("\n");
  const preload = opts.preloadImage ? '<link rel="preload" as="image" href="' + esc(opts.preloadImage) + '">' : "";
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    "<title>" + esc(opts.title) + "</title>\n" +
    '<meta name="description" content="' + esc(opts.description) + '">\n' +
    '<link rel="canonical" href="' + esc(url) + '">\n' +
    '<meta property="og:type" content="' + esc(opts.ogType || "website") + '">\n' +
    '<meta property="og:site_name" content="' + esc(config.brandName) + '">\n' +
    '<meta property="og:title" content="' + esc(opts.title) + '">\n' +
    '<meta property="og:description" content="' + esc(opts.description) + '">\n' +
    '<meta property="og:url" content="' + esc(url) + '">\n' +
    '<meta property="og:image" content="' + esc(image) + '">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<meta name="twitter:title" content="' + esc(opts.title) + '">\n' +
    '<meta name="twitter:description" content="' + esc(opts.description) + '">\n' +
    '<meta name="twitter:image" content="' + esc(image) + '">\n' +
    '<meta name="theme-color" content="#0a3d4d">\n' +
    '<link rel="icon" href="/favicon.ico" sizes="any">\n' +
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n' +
    '<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">\n' +
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n' +
    '<link rel="manifest" href="/site.webmanifest">\n' +
    '<link rel="preload" href="/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>\n' +
    preload + "\n" +
    '<link rel="stylesheet" href="/styles.css">\n' +
    scripts + "\n</head>\n";
}

function header() {
  return '<a class="skip-link" href="#main">Skip to content</a>' +
    '<div class="promo-banner" data-promo hidden></div>' +
    '<header class="site-header"><nav class="navbar" aria-label="Primary">' +
    '<a class="logo" href="/"><span class="logo-mark" aria-hidden="true">A</span>' + esc(config.brandName) + "</a>" +
    '<button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="nav-links" aria-label="Open menu"><span></span><span></span><span></span></button>' +
    '<ul class="nav-links" id="nav-links">' +
    '<li><a href="/">Home</a></li>' +
    '<li><a href="/#products">Shop</a></li>' +
    '<li><a href="/#why">Why choose us</a></li>' +
    '<li><a href="/#story">Our story</a></li>' +
    '<li><a href="/#contact">Contact</a></li>' +
    "</ul>" +
    '<button class="cart-button" type="button" data-cart-open aria-expanded="false" aria-controls="cart-sidebar">Cart <span class="cart-count" data-cart-count>0</span></button>' +
    "</nav></header>";
}

function footer() {
  return '<footer class="site-footer"><div class="wrap footer-grid">' +
    "<div><strong>" + esc(config.brandName) + "</strong><p>At-home wellness devices. Sold by " + businessHtml() + ".</p>" +
    "<p>Contact: " + emailHtml() + "</p></div>" +
    '<div><ul class="footer-links">' +
    '<li><a href="/shipping.html">Shipping</a></li>' +
    '<li><a href="/returns.html">Returns &amp; Refunds</a></li>' +
    '<li><a href="/privacy.html">Privacy</a></li>' +
    '<li><a href="/terms.html">Terms of Service</a></li>' +
    "</ul>" +
    '<ul class="pay-list" aria-label="Accepted payment methods">' +
    "<li>Visa</li><li>Mastercard</li><li>Stripe</li>" +
    "</ul>" +
    '<p class="pay-note">Visa, Mastercard, and Stripe are shown as accepted payment methods only. They are not partnerships, endorsements, or awards. Card details are entered on Stripe when payments are enabled, not on this site.</p>' +
    "<p>© " + new Date().getUTCFullYear() + " " + esc(config.brandName) + ".</p></div></div></footer>";
}

function cartDrawer() {
  return '<div class="cart-backdrop" data-cart-backdrop data-cart-close hidden></div>' +
    '<div id="cart-sidebar" class="cart-sidebar" role="dialog" aria-modal="true" aria-labelledby="cart-heading" hidden>' +
    '<div class="cart-head"><h2 id="cart-heading">Your cart</h2><button class="btn" type="button" data-cart-close>Close</button></div>' +
    '<div class="cart-items" id="cart-items"></div>' +
    '<div class="cart-foot"><p>Subtotal <strong id="cart-subtotal">$0.00</strong></p><p id="cart-ship"></p>' +
    '<a class="btn btn-dark btn-full" href="/checkout.html">Checkout</a></div></div>' +
    '<div id="live" class="sr-only" aria-live="polite"></div>';
}

function scripts() {
  return '<script src="/site-config.js"></script>\n<script src="/commerce.js"></script>\n<script src="/store.js" defer></script>';
}

function layout(opts) {
  return head(opts) + "<body>\n" + header() + '<main id="main">' + opts.body + "</main>\n" + footer() + cartDrawer() + scripts() + "\n</body>\n</html>\n";
}

function productCard(product) {
  const cents = commerce.priceToCents(product.price);
  return '<article class="product-card">' +
    '<a href="/products/' + product.id + '.html">' +
    '<img src="/images/' + product.image + '" alt="' + esc(product.alt) + '" width="' + product.imageWidth + '" height="' + product.imageHeight + '" loading="lazy">' +
    "<h3>" + esc(product.name) + "</h3></a>" +
    '<div class="card-body"><p class="price" data-price-for="' + product.id + '">' + money(cents) + "</p>" +
    '<p class="stock-note" data-stock-for="' + product.id + '" hidden></p>' +
    '<button class="btn btn-dark btn-full" type="button" data-add="' + product.id + '">Add to cart</button></div></article>';
}

function shippingSentence() {
  const flat = Number(config.shippingFlatCents) || 0;
  const min = config.shippingEstimateMinDays;
  const max = config.shippingEstimateMaxDays;
  const fee = flat === 0
    ? "There is no separate shipping fee. Delivery is included in the product price shown on this site."
    : "A flat shipping fee of " + money(flat) + " is added at checkout.";
  const free = config.freeShippingOverCents == null
    ? ""
    : " That fee is waived when the merchandise subtotal is at least " + money(config.freeShippingOverCents) + ".";
  return fee + free + " Delivery estimates of " + min + "–" + max + " business days are estimates, not a guaranteed arrival date. Tracking is sent when the carrier issues a number.";
}

function homePage() {
  const ugcHtml = Array.isArray(ugc) && ugc.length
    ? '<div class="brand-grid">' + ugc.map(function (item) {
      return "<figure><img src=\"" + esc(item.image) + "\" alt=\"" + esc(item.caption || "Customer photo") + "\" loading=\"lazy\"><figcaption>" +
        esc(item.name || "Customer") + (item.caption ? " — " + esc(item.caption) : "") + ". Customer photo, approved by the store.</figcaption></figure>";
    }).join("") + "</div>"
    : '<p class="ugc-empty">No customer photos yet. Share yours below. We publish a photo only after we approve the submission.</p>';

  const body = '<section class="hero"><div class="wrap">' +
    "<h1>At-home light, recovery, and simple tools.</h1>" +
    "<p>Seven devices, with the features we can actually describe. Tracked shipping when a carrier number exists, and a " + config.returnsWindowDays + "-day return window written in the returns policy.</p>" +
    '<div class="hero-actions"><a class="btn btn-primary" href="#products">Shop the collection</a><a class="btn btn-ghost" href="/shipping.html">Read shipping</a></div>' +
    '<div class="trust-row"><span>Secure checkout</span><span>' + config.returnsWindowDays + '-day returns</span><span>Tracked shipping</span></div>' +
    "</div></section>" +
    '<section class="section" id="products"><div class="wrap"><h2>The collection</h2><p class="lede">Each product page lists the specs we have, how to use the item, and an empty review section until a real review is approved.</p>' +
    '<div class="product-grid">' + products.map(productCard).join("") + "</div></div></section>" +
    '<section class="section" id="why"><div class="wrap"><h2>Why choose us</h2><div class="why-grid">' +
    '<article class="why-card"><h3>' + config.returnsWindowDays + '-day returns</h3><p>You can ask for a return within ' + config.returnsWindowDays + ' days of delivery. Conditions, including who pays return postage, are in the <a href="/returns.html">returns policy</a>.</p></article>' +
    '<article class="why-card"><h3>Tracked shipping</h3><p>' + esc(shippingSentence()) + ' Details are on the <a href="/shipping.html">shipping page</a>.</p></article>' +
    '<article class="why-card"><h3>A real inbox, once it is connected</h3><p>Write to ' + emailHtml() + '. Until that placeholder is replaced, it is not a working address. We do not show a phone number we do not have.</p></article>' +
    "</div></div></section>" +
    '<section class="section" id="story"><div class="wrap story"><h2>The store</h2>' +
    "<p>" + esc(config.brandName) + " is an online shop for a small set of at-home wellness devices: light-therapy tools, recovery tools, and simple beauty tools. We list the materials, power, and use notes we actually have. We do not publish star ratings, press logos, or customer counts unless those figures are entered from real records.</p>" +
    '<p class="optional-fact" data-optional="foundedYear" hidden></p>' +
    '<p class="optional-fact" data-optional="customerCount" hidden></p>' +
    "<p>Orders are paid through Stripe when the store owner has turned payments on. Until then, the checkout page says payments are not enabled, and it does not pretend an order was placed.</p></div></section>" +
    '<section class="section" id="moments"><div class="wrap"><h2>Share your AetherLumen moment</h2>' +
    "<p>Send a photo you took with a product from this store. Submissions go to the store owner for review. They are not posted automatically.</p>" +
    ugcHtml +
    "<h3>Brand imagery</h3><p class=\"lede\">The photos in this row are licensed stock images. They are brand imagery, not customer photos, and they may not show the exact unit that ships.</p>" +
    '<div class="brand-grid">' +
    '<figure><img src="/images/brand-led-session.webp" alt="A practitioner fitting an LED face mask in a treatment room" width="1200" height="1800" loading="lazy"><figcaption>Brand imagery, not a customer photo. An LED mask session. Photo by Dinç Tapa on Pexels.</figcaption></figure>' +
    '<figure><img src="/images/brand-gua-sha.webp" alt="A person holding a gua sha stone near their face" width="1200" height="800" loading="lazy"><figcaption>Brand imagery, not a customer photo. A gua sha stone in use. Photo by Tima Miroshnichenko on Pexels.</figcaption></figure>' +
    "</div>" +
    '<form class="form" name="ugc-moment" method="POST" action="/form-received.html" netlify netlify-honeypot="bot-field" enctype="multipart/form-data" style="margin-top:24px">' +
    '<input type="hidden" name="form-name" value="ugc-moment">' +
    '<p class="hp"><label>Leave this empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>' +
    '<label class="field"><span>Name</span><input name="name" required maxlength="80" autocomplete="name"></label>' +
    '<label class="field"><span>Email</span><input type="email" name="email" required maxlength="100" autocomplete="email"></label>' +
    '<label class="field"><span>Caption</span><textarea name="caption" required minlength="10" maxlength="400"></textarea></label>' +
    '<label class="field"><span>Photo</span><input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required></label>' +
    '<label class="check"><input type="checkbox" name="consent" value="yes" required><span>I took this photo, or I have permission to share it, and I allow ' + businessHtml() + ' to display it on this website with my name.</span></label>' +
    '<p class="form-note">We only publish photos we approve. Sending one does not put it on the site by itself.</p>' +
    '<button class="btn btn-dark" type="submit">Submit photo</button></form></div></section>' +
    '<section class="section" id="contact"><div class="wrap"><h2>Contact</h2><p>Questions about a product or an order go to ' + emailHtml() + '.</p>' +
    '<form class="form contact-form" name="contact" method="POST" action="/form-received.html" netlify netlify-honeypot="bot-field">' +
    '<input type="hidden" name="form-name" value="contact">' +
    '<p class="hp"><label>Leave this empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>' +
    '<label class="field"><span>Name</span><input name="name" required maxlength="80" autocomplete="name"></label>' +
    '<label class="field"><span>Email</span><input type="email" name="email" required maxlength="100" autocomplete="email"></label>' +
    '<label class="field"><span>Message</span><textarea name="message" required minlength="10" maxlength="2000"></textarea></label>' +
    '<button class="btn btn-dark" type="submit">Send message</button></form></div></section>';

  return layout({
    title: "AetherLumen | At-home light therapy and recovery",
    description: "Shop seven at-home wellness devices, including an LED face mask, a red-light belt, and recovery tools. Tracked shipping and a 30-day return policy.",
    path: "/",
    body: body,
  });
}

function reviewBlock(product) {
  const list = Array.isArray(reviews[product.id]) ? reviews[product.id] : [];
  if (!list.length) {
    return '<p class="reviews-empty">No reviews yet. Be the first.</p>';
  }
  return list.map(function (review) {
    const rating = Number(review.rating);
    const ratingText = rating >= 1 && rating <= 5 ? "<p>Rating: " + rating + " out of 5</p>" : "";
    return '<article class="panel"><h3>' + esc(review.author || "Customer") + "</h3>" + ratingText +
      "<p>" + esc(review.body || "") + "</p>" +
      (review.date ? '<p class="fine">' + esc(review.date) + "</p>" : "") + "</article>";
  }).join("");
}

function productLd(product) {
  const list = Array.isArray(reviews[product.id]) ? reviews[product.id] : [];
  const stock = commerce.stockState(config.stock ? config.stock[product.id] : null);
  const availability = stock.mode === "out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.description,
    image: [abs("/images/" + product.image), abs("/images/" + product.detail)],
    brand: { "@type": "Brand", name: config.brandName },
    offers: {
      "@type": "Offer",
      url: abs("/products/" + product.id + ".html"),
      priceCurrency: "USD",
      price: Number(product.price).toFixed(2),
      availability: availability,
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  const real = list.filter(function (review) { return review && review.body && review.author; });
  if (real.length) {
    data.review = real.map(function (review) {
      const entry = {
        "@type": "Review",
        author: { "@type": "Person", name: review.author },
        reviewBody: review.body,
      };
      const rating = Number(review.rating);
      if (rating >= 1 && rating <= 5) {
        entry.reviewRating = { "@type": "Rating", ratingValue: rating, bestRating: 5, worstRating: 1 };
      }
      if (review.date) entry.datePublished = review.date;
      return entry;
    });
    const ratings = real.map(function (review) { return Number(review.rating); }).filter(function (n) { return n >= 1 && n <= 5; });
    if (ratings.length) {
      const avg = ratings.reduce(function (sum, n) { return sum + n; }, 0) / ratings.length;
      data.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: avg.toFixed(1),
        reviewCount: String(ratings.length),
      };
    }
  }
  return data;
}

function productPage(product) {
  const cents = commerce.priceToCents(product.price);
  const others = products.filter(function (item) { return item.id !== product.id; }).slice(0, 3);
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: abs("/") },
      { "@type": "ListItem", position: 2, name: "Shop", item: abs("/#products") },
      { "@type": "ListItem", position: 3, name: product.name, item: abs("/products/" + product.id + ".html") },
    ],
  };
  const body = '<div class="wrap"><nav class="breadcrumbs" aria-label="Breadcrumb"><ol>' +
    '<li><a href="/">Home</a></li><li aria-hidden="true">/</li>' +
    '<li><a href="/#products">Shop</a></li><li aria-hidden="true">/</li>' +
    '<li aria-current="page">' + esc(product.name) + "</li></ol></nav>" +
    '<div class="product-layout"><div class="gallery">' +
    '<button class="gallery-main" type="button" data-open-zoom>' +
    '<img data-gallery-main src="/images/' + product.image + '" alt="' + esc(product.alt) + '" width="' + product.imageWidth + '" height="' + product.imageHeight + '" fetchpriority="high">' +
    "</button>" +
    '<div class="thumbs">' +
    '<button type="button" data-gallery-src="/images/' + product.image + '" data-gallery-alt="' + esc(product.alt) + '" data-gallery-w="' + product.imageWidth + '" data-gallery-h="' + product.imageHeight + '" aria-current="true" aria-label="Show the main product photo"><img src="/images/' + product.image + '" alt="" width="' + product.imageWidth + '" height="' + product.imageHeight + '"></button>' +
    '<button type="button" data-gallery-src="/images/' + product.detail + '" data-gallery-alt="' + esc(product.detailAlt) + '" data-gallery-w="' + product.detailWidth + '" data-gallery-h="' + product.detailHeight + '" aria-current="false" aria-label="Show a closer crop of the same photo"><img src="/images/' + product.detail + '" alt="" width="' + product.detailWidth + '" height="' + product.detailHeight + '" loading="lazy"></button>' +
    "</div>" +
    '<p class="caption">Catalog product image. The closer view is a crop of the same photograph, not a second angle. The item that arrives is the product named here; small differences in color can happen with supplier stock.</p>' +
    "</div><div class=\"buybox\">" +
    "<h1>" + esc(product.name) + "</h1>" +
    '<p class="price" data-price-for="' + product.id + '">' + money(cents) + "</p>" +
    '<p class="stock-note" data-stock-for="' + product.id + '" hidden></p>' +
    "<p>" + esc(product.summary) + "</p>" +
    '<p class="secure-line secure-badge">Secure checkout when Stripe is enabled</p>' +
    '<button class="btn btn-dark btn-full" type="button" data-add="' + product.id + '" data-main-add>Add to cart</button>' +
    "<p class=\"fine\">" + esc(shippingSentence()) + "</p>" +
    "</div></div>" +
    "<h2>Specifications</h2><table class=\"specs\"><tbody>" +
    product.specs.map(function (row) { return "<tr><th scope=\"row\">" + esc(row[0]) + "</th><td>" + esc(row[1]) + "</td></tr>"; }).join("") +
    "</tbody></table>" +
    '<div class="expect-grid section"><div><h2>What to expect</h2>' +
    product.whatToExpect.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") +
    "</div><div><h2>How to use</h2><ol>" +
    product.howToUse.map(function (step) { return "<li>" + esc(step) + "</li>"; }).join("") +
    "</ol><p>" + esc(product.description) + "</p></div></div>" +
    '<section id="reviews"><h2>Reviews</h2>' + reviewBlock(product) +
    "<h3>Write a review</h3><p class=\"fine\">A review is published only after the store reads it. The form does not post it on the page by itself, and it does not create a star rating for the product.</p>" +
    '<form class="form" name="product-review" method="POST" action="/form-received.html" netlify netlify-honeypot="bot-field" enctype="multipart/form-data">' +
    '<input type="hidden" name="form-name" value="product-review">' +
    '<input type="hidden" name="product" value="' + esc(product.name) + '">' +
    '<p class="hp"><label>Leave this empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>' +
    '<label class="field"><span>Name</span><input name="name" required maxlength="80"></label>' +
    '<label class="field"><span>Email</span><input type="email" name="email" required maxlength="100"></label>' +
    '<label class="field"><span>Your rating</span><select name="rating" required><option value="">Choose</option><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label>' +
    '<label class="field"><span>Review</span><textarea name="review" required minlength="20" maxlength="2000"></textarea></label>' +
    '<label class="field"><span>Photo, optional</span><input type="file" name="photo" accept="image/jpeg,image/png,image/webp"></label>' +
    '<button class="btn btn-dark" type="submit">Submit review</button></form></section>' +
    '<section class="section"><h2>Related products</h2><div class="product-grid related-grid">' + others.map(productCard).join("") + "</div></section>" +
    "</div>" +
    '<div class="sticky-atc" data-sticky-atc><div><strong>' + esc(product.name) + '</strong><div class="price" data-price-for="' + product.id + '">' + money(cents) + '</div></div>' +
    '<button class="btn btn-dark" type="button" data-add="' + product.id + '">Add to cart</button></div>' +
    '<dialog class="zoom-dialog" data-zoom-dialog><div class="zoom-bar"><button class="btn btn-primary" type="button" data-zoom-toggle>Zoom</button><button class="btn btn-ghost" type="button" data-zoom-close>Close</button></div><div class="zoom-stage"><img alt=""></div></dialog>';

  return layout({
    title: product.name + " | " + config.brandName,
    description: product.summary + " " + money(cents) + ". " + config.returnsWindowDays + "-day returns.",
    path: "/products/" + product.id + ".html",
    image: abs("/images/" + product.image),
    ogType: "product",
    preloadImage: "/images/" + product.image,
    jsonLd: [orgLd(), productLd(product), crumbs],
    body: body,
  });
}

function countryOptions() {
  return ['<option value="">Choose a country</option>'].concat(
    config.shipTo.map(function (code) {
      const name = commerce.COUNTRIES[code] || code;
      return '<option value="' + esc(code) + '">' + esc(name) + "</option>";
    })
  ).join("");
}

function checkoutPage() {
  const body = '<div class="wrap section" id="checkout-root"><h1>Checkout</h1>' +
    '<ol class="steps">' +
    '<li><button type="button" data-step-link="cart">1. Cart</button></li>' +
    '<li><button type="button" data-step-link="shipping">2. Shipping</button></li>' +
    '<li><button type="button" data-step-link="payment" disabled>3. Payment</button></li>' +
    '<li><button type="button" data-step-link="confirmation" disabled>4. Confirmation</button></li>' +
    "</ol>" +
    '<section data-step-panel="cart"><h2>Your cart</h2><div id="checkout-lines"></div><button class="btn btn-dark" type="button" id="to-shipping">Continue to shipping</button></section>' +
    '<section data-step-panel="shipping" hidden><h2>Shipping</h2><p>' + esc(shippingSentence()) + "</p>" +
    '<form class="form" id="shipping-form" novalidate>' +
    '<label class="field"><span>Full name</span><input name="fullName" autocomplete="name" required><p class="field-error" data-error-for="fullName"></p></label>' +
    '<label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" required><p class="field-error" data-error-for="email"></p></label>' +
    '<label class="field"><span>Phone, optional</span><input name="phone" type="tel" autocomplete="tel"><p class="field-error" data-error-for="phone"></p></label>' +
    '<label class="field"><span>Address</span><input name="address1" autocomplete="address-line1" required><p class="field-error" data-error-for="address1"></p></label>' +
    '<label class="field"><span>Apartment, suite, optional</span><input name="address2" autocomplete="address-line2"><p class="field-error" data-error-for="address2"></p></label>' +
    '<label class="field"><span>City</span><input name="city" autocomplete="address-level2" required><p class="field-error" data-error-for="city"></p></label>' +
    '<label class="field"><span>State or region</span><input name="region" autocomplete="address-level1" required><p class="field-error" data-error-for="region"></p></label>' +
    '<label class="field"><span>Postal code</span><input name="postalCode" autocomplete="postal-code" required><p class="field-error" data-error-for="postalCode"></p></label>' +
    '<label class="field"><span>Country</span><select name="country" autocomplete="country" required>' + countryOptions() + '</select><p class="field-error" data-error-for="country"></p></label>' +
    '<label class="check"><input type="checkbox" name="policies"><span>I have read the <a href="/shipping.html">shipping</a> and <a href="/returns.html">returns</a> policies.</span></label><p class="field-error" data-error-for="policies"></p>' +
    '<button class="btn btn-dark" type="submit">Continue to payment</button></form></section>' +
    '<section data-step-panel="payment" hidden><h2>Payment</h2>' +
    '<p class="secure-line secure-badge">Secure checkout. Card numbers are entered on Stripe, not on this site.</p>' +
    '<div id="payment-message" class="notice" hidden></div>' +
    '<p id="payment-address"></p><div id="payment-summary"></div>' +
    '<p class="pay-note" style="color:#5c564c">Accepted here when payments are on: Visa, Mastercard, through Stripe. These are payment-method names, not endorsements.</p>' +
    '<button class="btn btn-dark" type="button" id="pay-button">Continue to Stripe</button></section>' +
    '<section data-step-panel="confirmation" hidden><div id="confirmation-box"></div></section>' +
    "<noscript><p>Checkout uses JavaScript to keep the cart in this browser and to reach Stripe. With JavaScript off, you can still read the policies and email the store.</p></noscript></div>";

  return layout({
    title: "Checkout | " + config.brandName,
    description: "Review your cart, enter a shipping address, and pay with Stripe test checkout when it is enabled. No card data is stored on this site.",
    path: "/checkout.html",
    body: body,
  });
}

function policyLayout(opts) {
  return layout({
    title: opts.title,
    description: opts.description,
    path: opts.path,
    body: '<article class="wrap section policy"><h1>' + opts.heading + "</h1>" + placeholderNote() + "<p class=\"fine\">Last updated 26 October 2026.</p>" + opts.body + "</article>",
  });
}

function shippingPage() {
  const countries = config.shipTo.map(function (code) { return commerce.COUNTRIES[code] || code; }).join(", ");
  return policyLayout({
    title: "Shipping policy | " + config.brandName,
    description: "Flat shipping, tracked delivery estimates, customs, and what happens if an address is wrong.",
    path: "/shipping.html",
    heading: "Shipping",
    body: "<h2>What you pay</h2><p>" + esc(shippingSentence()) + " The checkout total is calculated from this same configuration. If the fee changes, this page is updated when the site is redeployed.</p>" +
      "<h2>Where we ship</h2><p>We currently list these destinations at checkout: " + esc(countries) + ". If your country is not in that list, we cannot create a Stripe shipment for it from this site.</p>" +
      "<h2>When an order leaves</h2><p>An order exists only after Stripe marks the payment as paid. Items are sent by the supplier that fulfills this shop, not from a shop floor we operate ourselves. We do not promise same-day dispatch.</p>" +
      "<h2>Tracking</h2><p>When the carrier creates a tracking number, the store sends it to the email on the order. This website does not invent tracking numbers and does not send an automatic shipping email by itself.</p>" +
      "<h2>Estimates</h2><p>The " + config.shippingEstimateMinDays + "–" + config.shippingEstimateMaxDays + " business-day range is an estimate for planning. Customs, carrier delays, and an incomplete address can make delivery longer. The estimate is not a guarantee and it is not a countdown.</p>" +
      "<h2>Customs and duties</h2><p>If your country charges import tax or duty, that amount is between you and the customs authority. It is not added by this website unless Stripe Tax is later turned on in the owner's Stripe account. It is not turned on in this integration.</p>" +
      "<h2>Addresses</h2><p>You are responsible for the address you type at checkout. If a parcel is returned because the address was incomplete, email " + emailHtml() + " with your order reference and we will tell you the reship cost before anything else is charged.</p>" +
      "<h2>Lost parcels</h2><p>If tracking stops moving for 10 business days past the estimate, email " + emailHtml() + " with the order reference. We will check with the supplier. If the carrier confirms the parcel is lost, we refund the merchandise total you paid, or we send a replacement if you prefer and stock allows it.</p>" +
      "<h2>Questions</h2><p>Shipping questions go to " + emailHtml() + ". Include the Stripe order reference if you have one.</p>",
  });
}

function returnsPage() {
  const days = config.returnsWindowDays;
  return policyLayout({
    title: "Returns and refunds | " + config.brandName,
    description: "How the " + days + "-day return window works, who pays return postage, and when a refund is sent.",
    path: "/returns.html",
    heading: "Returns & refunds",
    body: "<h2>The " + days + "-day window</h2><p>You may request a return within " + days + " days of the delivery date shown by the carrier. Email " + emailHtml() + " with your order reference, the product name, and whether the item is unused. A return does not start until we reply with the address to use.</p>" +
      "<h2>Condition</h2><p>For a change-of-mind return, the item should be unused, with its parts and packaging. If something is missing, we may reduce the refund by the reasonable cost of that part, and we will tell you the amount before we do it.</p>" +
      "<h2>Personal-care items</h2><p>Masks, stones, and massagers that have touched skin can be returned within the " + days + "-day window if they are defective or not the item described on the product page. If you used an item and simply changed your mind, we can refuse the return where resale would be unhygienic. We will say so in the reply to your email, not by silence.</p>" +
      "<h2>Defective or not as described</h2><p>If the item arrives damaged, incomplete, or is a different product from the name on your order, email us within " + days + " days with a photo of the item and the packaging. We will refund what you paid for the merchandise and the shipping fee you paid us, or we will replace it. We will also pay a reasonable return label when we ask you to send the defective item back.</p>" +
      "<h2>Change of mind</h2><p>If the item is unused and you changed your mind, you pay the cost of shipping it back. The original outgoing shipping fee is not refunded when it was a separate charge. When shipping was included in the product price, the refund is the product price you paid, after we receive the return.</p>" +
      "<h2>How the refund is paid</h2><p>Refunds go back to the card or payment method used in Stripe. We start the refund within 10 business days after the return arrives and we have checked it. Your bank can take additional days to show the credit. We do not refund in cash or to a different card.</p>" +
      "<h2>If payments were never taken</h2><p>A cart saved in your browser is not an order. If checkout showed that payments were not enabled, no refund is due because no charge was made.</p>" +
      "<h2>Order reference</h2><p>The reference is the Stripe Checkout session id shown on the confirmation page after a paid session. Keep it. We cannot look up a payment from a name alone if the email does not match the Stripe receipt.</p>",
  });
}

function privacyPage() {
  return policyLayout({
    title: "Privacy policy | " + config.brandName,
    description: "What this store collects at checkout and in forms, how Stripe and Netlify process it, and how to ask for a copy or deletion.",
    path: "/privacy.html",
    heading: "Privacy",
    body: "<h2>Who we are</h2><p>The site " + esc(config.brandName) + " is operated by " + businessHtml() + ". Privacy questions go to " + emailHtml() + ". The governing location named for this shop is " + jurisdictionHtml() + ".</p>" +
      "<h2>What we collect</h2><ul><li>Name, email, phone if you type one, and shipping address, when you check out.</li><li>The products and quantities in the order.</li><li>Messages you send in the contact form.</li><li>Review text, a rating you choose, and an optional photo.</li><li>A customer photo, caption, name, email, and the consent checkbox in the photo form.</li></ul>" +
      "<h2>Card numbers</h2><p>This site does not have a card form. When payments are enabled, you enter the card on Stripe Checkout. Stripe processes the card under its own privacy policy at <a href=\"https://stripe.com/privacy\">stripe.com/privacy</a>. We receive the result of the payment, such as the session id, the email, and the amount. We do not receive the full card number or the security code.</p>" +
      "<h2>Forms and files</h2><p>Contact, review, and photo forms are processed by Netlify Forms, the host of this site. Their privacy notice is at <a href=\"https://www.netlify.com/privacy/\">netlify.com/privacy</a>. Files you upload are stored with that form submission so the owner can moderate them. They are not published on the website unless the owner copies an approved entry into the site data and redeploys.</p>" +
      "<h2>The cart in your browser</h2><p>The cart is stored in localStorage on your device under the key aetherlumen_cart_v1. The shipping address for the current checkout is stored in sessionStorage. We do not receive that cart until you submit it to the payment function. You can clear it by emptying the cart or clearing site data in your browser.</p>" +
      "<h2>Why we use this information</h2><ul><li>To take payment and give the supplier what they need to ship.</li><li>To reply to questions and return requests.</li><li>To moderate a review or photo you asked us to consider.</li><li>To keep tax and accounting records where the law requires them.</li></ul><p>We do not sell personal information. We do not run advertising pixels on this site.</p>" +
      "<h2>Who else receives it</h2><ul><li>Stripe, to process the payment.</li><li>The supplier and the carrier, to deliver the parcel. They receive the shipping name and address.</li><li>Netlify, to host the site and store form submissions.</li></ul>" +
      "<h2>How long it is kept</h2><p>Order details are kept as long as tax and accounting rules that apply to " + jurisdictionHtml() + " require. Form submissions stay in Netlify until the owner deletes them. Approved public reviews and photos stay on the site until the owner removes them. You can ask us to remove a published first name and caption, and we will, unless we must keep a copy of the order itself.</p>" +
      "<h2>Your choices</h2><p>Email " + emailHtml() + " to ask for a copy of the order and form data we hold about you, to correct it, or to delete it. We will respond if the mailbox is a real address. If a placeholder is still shown above, the owner has not connected a mailbox yet, and that request cannot be received. Where the law where you live gives you extra rights, including access or deletion rights, we will follow that law. This page does not claim a certification.</p>" +
      "<h2>Cookies</h2><p>This site does not set its own analytics or advertising cookies. Netlify and Stripe may set cookies that are needed to run hosting, forms, or Checkout on their domains.</p>" +
      "<h2>Children</h2><p>This shop is not directed at children under 16, and we do not knowingly collect their information.</p>" +
      "<h2>Changes</h2><p>If this policy changes, the date at the top of the page changes with the deploy. The previous version remains in the public git history of the website.</p>",
  });
}

function termsPage() {
  return policyLayout({
    title: "Terms of service | " + config.brandName,
    description: "The terms for browsing and ordering from this store, including payment, shipping, returns, and liability.",
    path: "/terms.html",
    heading: "Terms of service",
    body: "<h2>The agreement</h2><p>These terms cover your use of the " + esc(config.brandName) + " website operated by " + businessHtml() + ". By placing a paid order you agree to these terms, the <a href=\"/shipping.html\">shipping policy</a>, and the <a href=\"/returns.html\">returns policy</a>. If you only browse, the acceptable-use and content rules still apply.</p>" +
      "<h2>Not medical advice</h2><p>Products are consumer wellness devices and tools. Nothing on this site is medical advice, a diagnosis, or a promise that a device will treat a condition. Read the manual in the box. Stop using a device that hurts, and talk to a qualified clinician about health questions. We do not claim that a device is cleared or approved by a regulator unless a specific product page says that, and none of them currently do.</p>" +
      "<h2>When an order exists</h2><p>A contract for sale is formed only when Stripe reports the Checkout session as paid. A cart in your browser is not an order. If the payment step says payments are not enabled, we have not offered to sell you the items in that cart and you have not bought them.</p>" +
      "<h2>Prices and promotions</h2><p>Prices are in US dollars. A promotional discount is shown only when it is turned on in the site configuration and the fixed end time has not passed. After that time the discount stops. It does not restart the next day. The price charged is the price on the Stripe page, calculated on the server from the catalog.</p>" +
      "<h2>Payment</h2><p>Payment is taken by Stripe Checkout in test mode until the owner changes that setup. Test mode does not charge a live card and does not create a shipment. You authorize Stripe to charge the payment method you enter for the amount shown. We may cancel an order we cannot supply, and we will refund what you paid.</p>" +
      "<h2>Shipping and risk</h2><p>Shipping terms are in the <a href=\"/shipping.html\">shipping policy</a>. Risk of loss passes to you when the carrier marks the parcel delivered to the address you gave us. Title passes when Stripe marks the payment paid, subject to the returns policy.</p>" +
      "<h2>Returns</h2><p>Returns and refunds follow the <a href=\"/returns.html\">returns policy</a>, including the " + config.returnsWindowDays + "-day window.</p>" +
      "<h2>Reviews and photos you send</h2><p>If you submit a review or a photo, you confirm that the words and the image are yours, or that you have permission to share them, and that they show a real experience with a product from this store. You give " + businessHtml() + " permission to display the text and the image on this website with the name you typed, after we approve them. You can ask us to take a published submission down. We may refuse or remove a submission that we did not approve, that we cannot verify, or that infringes someone else's rights.</p>" +
      "<h2>Acceptable use</h2><p>Do not misuse the forms, attempt to disrupt the site, or submit card data anywhere except the Stripe page. Do not upload a photo of someone else without their permission.</p>" +
      "<h2>Liability</h2><p>To the extent the law of " + jurisdictionHtml() + " allows, we are not liable for indirect or consequential loss, or for a result you hoped a wellness device would produce. Nothing in these terms limits liability that cannot legally be limited, including liability for death or personal injury caused by negligence where that limit is prohibited, or for fraud. If a mandatory consumer law gives you rights, those rights stay in place.</p>" +
      "<h2>Governing law</h2><p>These terms are governed by the laws of " + jurisdictionHtml() + ", excluding conflict-of-law rules that would apply another region's law. Courts in " + jurisdictionHtml() + " are the venue, except where the law where you live does not allow a business to choose that venue. The placeholder is not a real jurisdiction until the owner replaces it.</p>" +
      "<h2>Contact</h2><p>Questions about these terms go to " + emailHtml() + ".</p>",
  });
}

function formReceivedPage() {
  return layout({
    title: "Message received | " + config.brandName,
    description: "Your form was submitted. Reviews and photos are not published until the store approves them.",
    path: "/form-received.html",
    body: '<div class="wrap section"><h1>Received</h1><p>If the form reached the host, the store has your submission. A review or a photo is not on the website until someone approves it and republishes the site. This page is not an order confirmation.</p><p><a href="/">Back to the shop</a></p></div>',
  });
}

function notFoundPage() {
  return layout({
    title: "Page not found | " + config.brandName,
    description: "That page is not on the AetherLumen shop.",
    path: "/404.html",
    body: '<div class="wrap section"><h1>Page not found</h1><p>That address is not a page on this shop.</p><p><a href="/">Go to the home page</a></p></div>',
  });
}

function manifest() {
  return JSON.stringify({
    name: config.brandName,
    short_name: config.brandName,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    theme_color: "#0a3d4d",
    background_color: "#f6f4ef",
    display: "standalone",
    start_url: "/",
  }, null, 2);
}

function sitemap() {
  const paths = ["/", "/checkout.html", "/shipping.html", "/returns.html", "/privacy.html", "/terms.html"]
    .concat(products.map(function (product) { return "/products/" + product.id + ".html"; }));
  const urls = paths.map(function (urlPath) {
    return "  <url><loc>" + abs(urlPath) + "</loc><lastmod>2026-10-26</lastmod></url>";
  }).join("\n");
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "\n</urlset>\n";
}

function robots() {
  return "User-agent: *\nAllow: /\nSitemap: " + abs("/sitemap.xml") + "\n";
}

function pages() {
  const list = [
    { file: "index.html", html: homePage() },
    { file: "checkout.html", html: checkoutPage() },
    { file: "shipping.html", html: shippingPage() },
    { file: "returns.html", html: returnsPage() },
    { file: "privacy.html", html: privacyPage() },
    { file: "terms.html", html: termsPage() },
    { file: "form-received.html", html: formReceivedPage() },
    { file: "404.html", html: notFoundPage() },
  ];
  products.forEach(function (product) {
    list.push({ file: "products/" + product.id + ".html", html: productPage(product) });
  });
  return list;
}

module.exports = { pages, manifest, sitemap, robots };
