import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getConfig, getSheets, type SheetRow } from './_sheets';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { spreadsheetId, sheetName } = getConfig();
  if (!spreadsheetId) {
    return res.status(503).json({ error: 'SPREADSHEET_ID が未設定です' });
  }
  try {
    const sheets = getSheets();
    const range = `${sheetName}!A2:G1000`;
    const { data } = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = data.values ?? [];
    const mapped: SheetRow[] = rows
      .filter((r) => r.some((c) => c != null && String(c).trim() !== ''))
      .map((r) => ({
        createdAt: r[0] ?? '',
        title: r[1] ?? '',
        orderAmount: r[2] != null ? String(r[2]) : '',
        costsDetail: r[3] ?? '',
        totalCost: r[4] != null ? String(r[4]) : '',
        profit: r[5] != null ? String(r[5]) : '',
        margin: r[6] ?? '',
      }));
    res.status(200).json(mapped);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
}

