const { describeStripeEnv, paymentsNotice } = require("./stripe-mode");
const { jsonResponse, requestOrigin } = require("./http");

exports.handler = async function (event) {
  const origin = requestOrigin(event);
  if (event.httpMethod === "OPTIONS") return jsonResponse(204, {}, origin);
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" }, origin);
  }

  const stripeEnv = describeStripeEnv(process.env);
  if (!stripeEnv.enabled) {
    return jsonResponse(503, {
      error: "payments_not_enabled",
      reason: stripeEnv.reason,
      message: paymentsNotice(stripeEnv.reason),
    }, origin);
  }

  const params = event.queryStringParameters || {};
  let sessionId = params.session_id || "";
  if (!sessionId && event.body) {
    try {
      sessionId = JSON.parse(event.body).session_id || "";
    } catch (err) {
      sessionId = "";
    }
  }
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return jsonResponse(400, { error: "missing_session", message: "No Stripe session was provided, so there is no order to show." }, origin);
  }

  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === "paid";
    return jsonResponse(200, {
      paid: paid,
      livemode: session.livemode === true,
      orderNumber: session.id,
      amountTotal: session.amount_total,
      currency: session.currency,
      email: session.customer_details && session.customer_details.email ? session.customer_details.email : "",
    }, origin);
  } catch (err) {
    console.error("stripe_retrieve_failed", err && err.message ? err.message : "unknown");
    return jsonResponse(404, { error: "not_found", message: "That payment could not be verified. Nothing on this page is an order." }, origin);
  }
};
