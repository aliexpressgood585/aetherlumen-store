const { quote, validateShipping } = require("../../shared/commerce");
const products = require("../../data/products.json");
const config = require("../../site-config");
const { describeStripeEnv, paymentsNotice } = require("./stripe-mode");
const { jsonResponse, requestOrigin, checkoutBase } = require("./http");

const catalog = Object.fromEntries(products.map(function (product) { return [product.id, product]; }));

exports.handler = async function (event) {
  const origin = requestOrigin(event);
  if (event.httpMethod === "OPTIONS") return jsonResponse(204, {}, origin);
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "method_not_allowed" }, origin);

  const stripeEnv = describeStripeEnv(process.env);
  if (!stripeEnv.enabled) {
    return jsonResponse(503, {
      error: "payments_not_enabled",
      reason: stripeEnv.reason,
      message: paymentsNotice(stripeEnv.reason),
    }, origin);
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "invalid_json" }, origin);
  }

  const shipping = validateShipping(payload.shipping || {}, config);
  if (!shipping.ok) {
    return jsonResponse(400, { error: "invalid_shipping", fields: shipping.errors }, origin);
  }

  const priced = quote(payload.items || [], catalog, config, new Date());
  if (!priced.ok) {
    return jsonResponse(400, { error: "invalid_cart", messages: priced.errors }, origin);
  }

  const base = String(checkoutBase(event)).replace(/\/$/, "");
  const minDays = Math.max(1, Number(config.shippingEstimateMinDays) || 7);
  let maxDays = Math.max(1, Number(config.shippingEstimateMaxDays) || 21);
  if (maxDays < minDays) maxDays = minDays;

  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: shipping.value.email,
      success_url: base + "/checkout.html?step=confirmation&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: base + "/checkout.html?step=payment&canceled=1",
      line_items: priced.lines.map(function (line) {
        return {
          quantity: line.qty,
          price_data: {
            currency: "usd",
            unit_amount: line.unitCents,
            product_data: {
              name: line.name,
              metadata: { product_id: line.id },
            },
          },
        };
      }),
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: priced.shippingCents, currency: "usd" },
            display_name: priced.shippingCents === 0 ? "Tracked shipping (no separate fee)" : "Tracked shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: minDays },
              maximum: { unit: "business_day", value: maxDays },
            },
          },
        },
      ],
      metadata: {
        items: priced.lines.map(function (line) { return line.id + ":" + line.qty; }).join(",").slice(0, 450),
        phone: shipping.value.phone.slice(0, 40),
      },
      payment_intent_data: {
        shipping: {
          name: shipping.value.fullName,
          address: {
            line1: shipping.value.address1,
            line2: shipping.value.address2 || undefined,
            city: shipping.value.city,
            state: shipping.value.region,
            postal_code: shipping.value.postalCode,
            country: shipping.value.country,
          },
        },
        metadata: {
          items: priced.lines.map(function (line) { return line.id + ":" + line.qty; }).join(",").slice(0, 450),
        },
      },
    });
    if (!session.url) return jsonResponse(502, { error: "stripe_no_url" }, origin);
    return jsonResponse(200, { url: session.url }, origin);
  } catch (err) {
    console.error("stripe_session_failed", err && err.message ? err.message : "unknown");
    return jsonResponse(502, { error: "stripe_error", message: "Stripe did not start a checkout session. No charge was made." }, origin);
  }
};
