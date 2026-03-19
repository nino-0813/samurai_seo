export const config = {
  runtime: 'nodejs',
};

function env(name, fallback = '') {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function json(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function gasUrl() {
  const raw = env('VITE_GAS_WEBAPP_URL') || env('GAS_WEBAPP_URL');
  return raw ? raw.replace(/\/+$/, '') : '';
}

function gasToken() {
  return env('VITE_GAS_TOKEN') || env('GAS_TOKEN') || '';
}

function withToken(url) {
  const token = gasToken();
  if (!token) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

async function readBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  return await new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  const base = gasUrl();
  if (!base) {
    return json(res, 503, {
      ok: false,
      error: 'VITE_GAS_WEBAPP_URL が未設定です',
      env: {
        hasViteGasWebappUrl: Boolean(process.env.VITE_GAS_WEBAPP_URL),
        hasGasWebappUrl: Boolean(process.env.GAS_WEBAPP_URL),
        hasViteGasToken: Boolean(process.env.VITE_GAS_TOKEN),
        hasGasToken: Boolean(process.env.GAS_TOKEN),
      },
    });
  }

  try {
    if (req.method === 'GET') {
      const action = String((req.query && req.query.action) || 'health');
      const target = withToken(`${base}?action=${encodeURIComponent(action)}`);
      const upstream = await fetch(target, { method: 'GET' });
      const text = await upstream.text();
      const isJsonish = text.trim().startsWith('{') || text.trim().startsWith('[');
      if (!isJsonish) {
        return json(res, 502, {
          ok: false,
          error: 'GAS から JSON 以外が返りました',
          status: upstream.status,
          body: text.slice(0, 500),
        });
      }
      res.status(upstream.status);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(text);
      return;
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const target = withToken(base);
      const upstream = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const text = await upstream.text();
      const isJsonish = text.trim().startsWith('{') || text.trim().startsWith('[');
      if (!isJsonish) {
        return json(res, 502, {
          ok: false,
          error: 'GAS から JSON 以外が返りました',
          status: upstream.status,
          body: text.slice(0, 500),
        });
      }
      res.status(upstream.status);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(text);
      return;
    }

    return json(res, 405, { ok: false, error: 'Method Not Allowed' });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

