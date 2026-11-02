/*
  Link previews for product links.

  A link like  https://yourshop.example/p/prod-123  is opened by this small Worker first.
  It reads the product from your Firebase catalog and adds the product's name, price and photo
  to the page's <head>. That is what WhatsApp, Facebook and Instagram read to draw the
  preview card (photo + title) when someone sends the link.
  The page itself is your normal shop, and the shop opens that product's popup.
*/

const DEFAULT_TITLE_SUFFIX = 'Order on WhatsApp';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/p\/([^/]+)\/?$/);
    if (!match || request.method !== 'GET') return env.ASSETS.fetch(request);

    const id = safeDecode(match[1]);
    const page = await env.ASSETS.fetch(new Request(url.origin + '/', { headers: request.headers }));
    if (!page.ok) return page;

    let meta = '';
    let title = '';
    try {
      const { product, settings } = await loadProduct(env, url.origin, id);
      if (product) {
        title = `${product.name} | ${settings.storeName || DEFAULT_TITLE_SUFFIX}`;
        meta = buildMeta(product, settings, url.origin);
      }
    } catch (err) {
      // If Firebase can't be reached, the visitor still gets the normal shop page.
    }
    if (!meta) return page;

    const rewritten = new HTMLRewriter()
      .on('title', { element(el) { if (title) el.setInnerContent(title); } })
      .on('head', { element(el) { el.append(meta, { html: true }); } })
      .transform(page);

    const out = new Response(rewritten.body, rewritten);
    out.headers.set('cache-control', 'public, max-age=120');
    return out;
  }
};

function safeDecode(value) {
  try { return decodeURIComponent(value); } catch (e) { return value; }
}

async function loadProduct(env, origin, id) {
  // Reuse the keys already in firebase-config.js so they only live in one place
  const cfgRes = await env.ASSETS.fetch(new Request(origin + '/firebase-config.js'));
  const cfgText = await cfgRes.text();
  const projectId = (cfgText.match(/projectId:\s*"([^"]+)"/) || [])[1];
  const apiKey = (cfgText.match(/apiKey:\s*"([^"]+)"/) || [])[1];
  if (!projectId) throw new Error('No Firebase project id');

  const api = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/store/catalog` +
    (apiKey ? `?key=${apiKey}` : '');
  const res = await fetch(api, { cf: { cacheTtl: 60, cacheEverything: true } });
  if (!res.ok) throw new Error('Catalog not available');
  const doc = await res.json();
  const data = decodeFields(doc.fields || {});
  const product = (data.products || []).find(p => p && p.id === id) || null;
  return { product, settings: data.settings || {} };
}

// Firestore's REST format wraps every value, e.g. {"stringValue": "x"}. This unwraps it.
export function decodeValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  return null;
}

export function decodeFields(fields) {
  const out = {};
  for (const key of Object.keys(fields)) out[key] = decodeValue(fields[key]);
  return out;
}

function escapeAttr(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// A square, white-padded copy of the photo looks right inside a WhatsApp preview card
function previewImage(product, settings) {
  const list = Array.isArray(product.images) && product.images.length ? product.images : [product.image];
  const first = list.find(u => /^https?:\/\//i.test(u || '')) || (/^https?:\/\//i.test(settings.storeLogo || '') ? settings.storeLogo : '');
  if (!first) return '';
  if (first.includes('res.cloudinary.com') && first.includes('/image/upload/')) {
    return first.replace('/image/upload/', '/image/upload/f_jpg,q_auto,w_800,h_800,c_pad,b_white/');
  }
  return first;
}

export function buildMeta(product, settings, origin) {
  const currency = settings.currency || '';
  const price = Number(product.price) || 0;
  const desc = String(product.description || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const title = `${product.name} - ${currency}${price.toLocaleString('en-US')}`;
  const image = previewImage(product, settings);
  const tags = [
    `<meta property="og:type" content="product">`,
    `<meta property="og:site_name" content="${escapeAttr(settings.storeName || '')}">`,
    `<meta property="og:title" content="${escapeAttr(title)}">`,
    `<meta property="og:description" content="${escapeAttr(desc)}">`,
    `<meta property="og:url" content="${escapeAttr(origin + '/p/' + encodeURIComponent(product.id))}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${escapeAttr(title)}">`
  ];
  if (image) {
    tags.push(`<meta property="og:image" content="${escapeAttr(image)}">`, `<meta name="twitter:image" content="${escapeAttr(image)}">`);
  }
  return tags.join('\n');
}
