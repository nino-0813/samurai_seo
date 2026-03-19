export type SheetRow = {
  createdAt: string;
  title: string;
  orderAmount: string;
  costsDetail: string;
  totalCost: string;
  profit: string;
  margin: string;
};

export interface SaveRowInput {
  title: string;
  orderAmount: number;
  costsSummary: string;
  totalCost: number;
  profit: number;
  profitMarginPct: number;
}

function gasBaseUrl(): string | null {
  const raw = (import.meta.env.VITE_GAS_WEBAPP_URL as string | undefined) || '';
  const url = raw.trim();
  return url ? url.replace(/\/+$/, '') : null;
}

function gasToken(): string | null {
  const raw = (import.meta.env.VITE_GAS_TOKEN as string | undefined) || '';
  const t = raw.trim();
  return t ? t : null;
}

function withToken(url: string): string {
  const token = gasToken();
  if (!token) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

export function isGasEnabled(): boolean {
  return Boolean(gasBaseUrl());
}

export async function checkGasHealth(): Promise<boolean> {
  const gas = gasBaseUrl();
  if (!gas) return false;
  try {
    const res = await fetch(withToken(`${gas}?action=health`));
    const data = (await res.json()) as { ok?: boolean };
    return Boolean(res.ok && data && data.ok);
  } catch {
    return false;
  }
}

export async function fetchSheetConfig(): Promise<{ spreadsheetId: string; sheetName: string } | null> {
  try {
    const gas = gasBaseUrl();
    if (gas) {
      const res = await fetch(withToken(`${gas}?action=config`));
      const data = (await res.json()) as { ok?: boolean; spreadsheetId?: string; sheetName?: string };
      if (!res.ok || !data.ok) return null;
      if (!data.spreadsheetId || !data.sheetName) return null;
      return { spreadsheetId: data.spreadsheetId, sheetName: data.sheetName };
    } else {
      const res = await fetch('/api/config');
      if (!res.ok) return null;
      return res.json();
    }
  } catch {
    return null;
  }
}

export async function fetchCalculationRows(): Promise<SheetRow[]> {
  const gas = gasBaseUrl();
  if (gas) {
    const res = await fetch(withToken(`${gas}?action=rows`));
    const data = (await res.json()) as { ok?: boolean; rows?: SheetRow[]; error?: string };
    if (!res.ok || !data.ok) throw new Error(data.error || '一覧の取得に失敗しました');
    return Array.isArray(data.rows) ? data.rows : [];
  } else {
    const res = await fetch('/api/rows');
    const data = (await res.json()) as SheetRow[] | { error?: string };
    if (!res.ok) {
      throw new Error(
        typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
          ? data.error
          : '一覧の取得に失敗しました'
      );
    }
    return Array.isArray(data) ? data : [];
  }
}

export async function appendCalculationRow(row: SaveRowInput): Promise<void> {
  const gas = gasBaseUrl();
  if (gas) {
    const res = await fetch(withToken(gas), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'append', ...row }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) throw new Error(data.error || '保存に失敗しました');
  } else {
    const res = await fetch('/api/append', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) {
      throw new Error(data.error || '保存に失敗しました');
    }
  }
}

export function spreadsheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}
