import { env } from './_config';

export const config = {
  runtime: 'nodejs',
};

type Json = Record<string, unknown>;

function json(res: any, status: number, body: Json) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function gasUrl(): string | null {
  const raw = env('VITE_GAS_WEBAPP_URL') || env('GAS_WEBAPP_URL') || '';
  const u = raw.trim().replace(/\/+$/, '');
  return u ? u : null;
}

function gasToken(): string | null {
  const raw = env('VITE_GAS_TOKEN') || env('GAS_TOKEN') || '';
  const t = raw.trim();
  return t ? t : null;
}

function withToken(url: string): string {
  const token = gasToken();
  if (!token) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

async function readBody(req: any): Promise<string> {
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve());
    req.on('error', reject);
  });
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req: any, res: any) {
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

  if (typeof fetch !== 'function') {
    return json(res, 500, { ok: false, error: 'Runtime に fetch がありません（Node ランタイムを確認してください）' });
  }

  try {
    if (req.method === 'GET') {
      const action = String((req.query && req.query.action) || 'health');
      const target = withToken(`${base}?action=${encodeURIComponent(action)}`);
      let r: Response;
      try {
        r = await fetch(target, { method: 'GET' });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return json(res, 502, { ok: false, error: `GAS への通信に失敗しました: ${msg}`, targetBase: base, action });
      }
      const text = await r.text();
      // GAS が HTML を返すケースもあるので、その場合は JSON で包む
      const isJsonish = text.trim().startsWith('{') || text.trim().startsWith('[');
      if (!isJsonish) {
        return json(res, 502, { ok: false, error: 'GAS から JSON 以外が返りました', status: r.status, body: text.slice(0, 500) });
      }
      res.status(r.status);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(text);
      return;
    }

    if (req.method === 'POST') {
      const target = withToken(base);
      const body = await readBody(req);
      let r: Response;
      try {
        r = await fetch(target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return json(res, 502, { ok: false, error: `GAS への通信に失敗しました: ${msg}`, targetBase: base });
      }
      const text = await r.text();
      res.status(r.status);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(text);
      return;
    }

    return json(res, 405, { ok: false, error: 'Method Not Allowed' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(res, 500, { ok: false, error: msg });
  }
}

