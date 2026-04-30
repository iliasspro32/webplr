const DEFAULT_CONFIG = {
  price: 29,
  currency: "USD",
  productName: "PLR Digital Empire Bundle",
  successUrl: "/success.html?paid=paypal",
  stripePublishableKey: "pk_live_YOUR_STRIPE_PUBLISHABLE_KEY",
  stripePriceId: "price_YOUR_STRIPE_PRICE_ID",
  paypalClientId: "YOUR_PAYPAL_CLIENT_ID",
  paypalMerchantId: "YOUR_PAYPAL_MERCHANT_ID",
  countdownHours: 6,
  downloadUrl: "https://drive.google.com/YOUR_DOWNLOAD_LINK",
  supportEmail: "support@example.com",
  metaPixelId: ""
};

const CONFIG_KEY = "site_config";

export async function onRequestGet({ env }) {
  const config = await readConfig(env);
  return json(sanitizeConfig(config));
}

export async function onRequestPost({ request, env }) {
  const password = request.headers.get("x-admin-password") || "";

  if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
    return json({ error: "Unauthorized." }, 401);
  }

  if (!env.SITE_CONFIG_KV) {
    return json({ error: "Missing SITE_CONFIG_KV binding in Cloudflare Pages." }, 500);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "Invalid configuration payload." }, 400);
  }

  const nextConfig = sanitizeConfig({ ...DEFAULT_CONFIG, ...body });
  await env.SITE_CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));

  return json({ ok: true, config: nextConfig });
}

async function readConfig(env) {
  if (!env.SITE_CONFIG_KV) return DEFAULT_CONFIG;

  const stored = await env.SITE_CONFIG_KV.get(CONFIG_KEY, "json");
  if (!stored || typeof stored !== "object") return DEFAULT_CONFIG;

  return { ...DEFAULT_CONFIG, ...stored };
}

function sanitizeConfig(config) {
  return {
    price: Number(config.price) || DEFAULT_CONFIG.price,
    currency: cleanString(config.currency, 3).toUpperCase() || DEFAULT_CONFIG.currency,
    productName: cleanString(config.productName, 120) || DEFAULT_CONFIG.productName,
    successUrl: cleanString(config.successUrl, 220) || DEFAULT_CONFIG.successUrl,
    stripePublishableKey: cleanString(config.stripePublishableKey, 180),
    stripePriceId: cleanString(config.stripePriceId, 180),
    paypalClientId: cleanString(config.paypalClientId, 260),
    paypalMerchantId: cleanString(config.paypalMerchantId, 160),
    countdownHours: Math.max(1, Math.min(72, Number(config.countdownHours) || DEFAULT_CONFIG.countdownHours)),
    downloadUrl: cleanString(config.downloadUrl, 800),
    supportEmail: cleanString(config.supportEmail, 180),
    metaPixelId: cleanString(config.metaPixelId, 80)
  };
}

function cleanString(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}
