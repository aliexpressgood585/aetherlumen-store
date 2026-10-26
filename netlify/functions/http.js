const config = require("../../site-config");

function allowOrigin(header) {
  if (!header) return null;
  let url;
  try {
    url = new URL(header);
  } catch (err) {
    return null;
  }
  let siteHost = "";
  try {
    siteHost = new URL(config.siteUrl).hostname;
  } catch (err) {
    siteHost = "";
  }
  const host = url.hostname;
  if (host === siteHost || host === "localhost" || host === "127.0.0.1" || host.endsWith(".netlify.app")) {
    return url.origin;
  }
  return null;
}

function jsonResponse(status, body, origin) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin || config.siteUrl,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Vary": "Origin",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function requestOrigin(event) {
  const headers = event.headers || {};
  return allowOrigin(headers.origin || headers.Origin || "");
}

function checkoutBase(event) {
  return requestOrigin(event) || process.env.DEPLOY_PRIME_URL || process.env.URL || config.siteUrl;
}

module.exports = { allowOrigin, jsonResponse, requestOrigin, checkoutBase };
