# AetherLumen store

Static shop for seven at-home wellness devices. Netlify publishes the `dist` folder produced by `npm run build`. Stripe Checkout runs only in test mode, and only through a Netlify Function. Card numbers are never posted to this site.

## Owner checklist

Edit `site-config.js`, then redeploy. Do not invent the optional numbers.

| Setting | Current value | What to do |
| --- | --- | --- |
| `businessName` | `[BUSINESS_LEGAL_NAME]` | Legal name of the seller. Shown on policies and the photo-consent line. |
| `storeEmail` | `[STORE_EMAIL]` | Real support inbox. Policies and the footer use it. A value that starts with `[` is shown as a placeholder, not a mailto link. |
| `jurisdiction` | `[JURISDICTION]` | Governing law and venue, for example a state or country. |
| `foundedYear` | empty | Optional. Leave empty to hide the line. |
| `customerCount` | empty | Optional. Leave empty to hide the line. This is an order count you can document, not a slogan. |
| `promo.enabled` | `false` | Turn on only for a real offer. |
| `promo.discountPercent` | `0` | Integer from 1 to 90 while the promo is on. `0` or anything above 90 keeps the promo hidden. |
| `promo.endDate` | empty | Fixed ISO time, for example `2026-11-30T23:59:00Z`. The banner hides at that instant and does not come back the next day. |
| `promo.label` | empty | Short label prefixed to the banner. |
| `stock` | all `null` | `null` hides the count. A positive integer shows "Only N left" and caps quantity. `0` shows out of stock. |
| `shippingFlatCents` | `0` | Customer is not charged a separate shipping fee. Set the real flat fee in cents if the supplier charges shipping you need to pass on. |
| `freeShippingOverCents` | `null` | No threshold. Set a cent amount to waive the flat fee above that merchandise subtotal. |
| `shippingEstimateMinDays` / `shippingEstimateMaxDays` | `7` / `21` | Shown as an estimate, not a guarantee. |
| `shipTo` | country codes on the checkout form | Remove any country you do not actually ship to. |
| `STRIPE_SECRET_KEY` | not in the repo | Netlify env var. Must be an `sk_test_...` key. |
| `STRIPE_PUBLISHABLE_KEY` | not in the repo | Netlify env var. Must be a `pk_test_...` key. |

Live Stripe keys (`sk_live_` / `pk_live_`) are refused. The payment step then says payments are not yet enabled, and no charge is created. That is deliberate so a live key cannot bill a shopper until you change `netlify/functions/stripe-mode.js` and you have fulfillment ready. Test mode does not ship a product.

Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC, any postal code. A paid test session is labeled test mode on the confirmation page and is not a fulfillment order.

Set both variables in Netlify under Site configuration → Environment variables, for Functions (and Builds if you split scopes). Redeploy after saving them. `netlify.toml` cannot hold these secrets.

## Reviews and customer photos

`data/reviews.json` is empty. Each product page says "No reviews yet. Be the first." and offers a Netlify Form (`product-review`) with an optional photo. Submissions are not published by themselves.

`data/ugc-approved.json` is an empty array. The home section "Share your AetherLumen moment" collects name, email, caption, photo, and consent through the `ugc-moment` form. The stock photos under that form are captioned as brand imagery.

To publish a real submission:

1. Open the submission in the Netlify Forms dashboard.
2. For a review, add an object to that product's array in `data/reviews.json` with `author`, `rating` (1–5), `body`, and `date`.
3. For a photo, add the image file under `images/` and append `{ "name", "caption", "image", "date" }` to `data/ugc-approved.json`.
4. Redeploy. Product structured data includes `aggregateRating` only when that product's review array has real ratings.

## Scripts

```bash
npm install
npm run build
```

The build writes `dist/`, minifies CSS and JavaScript, and runs the tests. `npm test` expects `dist/` to exist.

Local preview after a build:

```bash
npx serve dist
```

Functions are not part of that static preview. Use `netlify dev` when you want `/.netlify/functions/*` locally, with the test keys in a `.env` file that is gitignored.

## Policies

Shipping, returns, privacy, and terms are generated from `site-config.js` during the build. The 30-day return window is `returnsWindowDays`. Shipping copy follows `shippingFlatCents`. Placeholders stay visible until you replace them.

## Catalog images

See `IMAGES_CREDITS.md`. Product images are WebP conversions of the photos this store already referenced. Width and height are set in the HTML. Below-the-fold images use `loading="lazy"`. The open product photo is preloaded.
