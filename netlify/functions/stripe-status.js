const { describeStripeEnv, paymentsNotice } = require("./stripe-mode");
const { jsonResponse, requestOrigin } = require("./http");

exports.handler = async function (event) {
  const origin = requestOrigin(event);
  if (event.httpMethod === "OPTIONS") return jsonResponse(204, {}, origin);
  if (event.httpMethod !== "GET") return jsonResponse(405, { error: "method_not_allowed" }, origin);
  const status = describeStripeEnv(process.env);
  return jsonResponse(200, {
    enabled: status.enabled,
    reason: status.reason,
    message: status.enabled ? "Stripe test mode is configured. A successful test payment is not a live charge and is not sent to a supplier." : paymentsNotice(status.reason),
  }, origin);
};
