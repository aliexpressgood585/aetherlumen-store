/**
 * This store creates Stripe Checkout sessions only with test keys.
 * A live secret key is treated as "not enabled" so a real card is not charged
 * by accident. See README for what the owner must set.
 */
function describeStripeEnv(env) {
  const source = env || {};
  const secret = String(source.STRIPE_SECRET_KEY || "").trim();
  const publishable = String(source.STRIPE_PUBLISHABLE_KEY || "").trim();
  if (!secret || !publishable) {
    return { enabled: false, reason: "missing" };
  }
  if (!secret.startsWith("sk_test_") || !publishable.startsWith("pk_test_")) {
    return { enabled: false, reason: "not_test" };
  }
  return { enabled: true, reason: null };
}

function paymentsNotice(reason) {
  if (reason === "not_test") {
    return "Payments not yet enabled. A Stripe key is set, but this store only accepts test keys (sk_test_ and pk_test_), so a live card is not charged. No payment was taken.";
  }
  return "Payments not yet enabled. Add STRIPE_SECRET_KEY (sk_test_...) and STRIPE_PUBLISHABLE_KEY (pk_test_...) in Netlify, then redeploy. No card form is shown and no order is created until that is done.";
}

module.exports = { describeStripeEnv, paymentsNotice };
