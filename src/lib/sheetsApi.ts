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

export async function fetchSheetConfig(): Promise<{ spreadsheetId: string; sheetName: string } | null> {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchCalculationRows(): Promise<SheetRow[]> {
  const res = await fetch('/api/rows');
  const data = (await res.json()) as SheetRow[] | { error?: string };
  if (!res.ok) {
    throw new Error(typeof data === 'object' && data && 'error' in data && typeof data.error === 'string' ? data.error : '一覧の取得に失敗しました');
  }
  return Array.isArray(data) ? data : [];
}

export async function appendCalculationRow(row: SaveRowInput): Promise<void> {
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

export function spreadsheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}
