export async function onRequestPost({ request, env }) {
  try {
    const config = await readConfig(env);
    const stripePriceId = config.stripePriceId || env.STRIPE_PRICE_ID;

    if (!env.STRIPE_SECRET_KEY || !stripePriceId) {
      return json({ error: "Stripe is not configured. Add STRIPE_SECRET_KEY in Cloudflare Pages and Stripe Price ID in admin." }, 500);
    }

    const body = await request.json().catch(() => ({}));
    const url = new URL(request.url);
    const origin = env.SITE_URL || url.origin;
    const locale = body.locale === "ar" ? "ar" : "en";
    const productName = String(body.productName || "PLR Digital Empire Bundle").slice(0, 120);

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("ui_mode", "embedded");
    params.append("locale", locale);
    params.append("line_items[0][price]", stripePriceId);
    params.append("line_items[0][quantity]", "1");
    params.append("return_url", `${origin}/success.html?paid=stripe&session_id={CHECKOUT_SESSION_ID}`);
    params.append("billing_address_collection", "auto");
    params.append("customer_creation", "if_required");
    params.append("metadata[product_name]", productName);

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });

    const session = await response.json();

    if (!response.ok) {
      return json({ error: session.error?.message || "Stripe session could not be created." }, response.status);
    }

    return json({ clientSecret: session.client_secret });
  } catch (error) {
    return json({ error: error.message || "Unexpected checkout error." }, 500);
  }
}

async function readConfig(env) {
  if (!env.SITE_CONFIG_KV) return {};
  const stored = await env.SITE_CONFIG_KV.get("site_config", "json");
  return stored && typeof stored === "object" ? stored : {};
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
