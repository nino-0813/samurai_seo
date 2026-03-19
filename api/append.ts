import { getConfig } from './_config';
import { ensureHeaderRow, getSheets, readJsonBody, type SaveRowInput } from './_sheets';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { spreadsheetId, sheetName } = getConfig();
  if (!spreadsheetId) {
    return res.status(503).json({ error: 'SPREADSHEET_ID が未設定です' });
  }

  let body: SaveRowInput;
  try {
    body = await readJsonBody<SaveRowInput>(req);
  } catch {
    return res.status(400).json({ error: '不正なJSONです' });
  }

  if (
    typeof body?.orderAmount !== 'number' ||
    typeof body?.totalCost !== 'number' ||
    typeof body?.profit !== 'number' ||
    typeof body?.profitMarginPct !== 'number'
  ) {
    return res.status(400).json({ error: '不正なリクエスト' });
  }

  try {
    const sheets = getSheets();
    await ensureHeaderRow(sheets, spreadsheetId, sheetName);
    const created = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const values = [
      [
        created,
        typeof body.title === 'string' && body.title.trim() ? body.title.trim() : '（無題）',
        body.orderAmount,
        typeof body.costsSummary === 'string' ? body.costsSummary : '—',
        body.totalCost,
        body.profit,
        `${body.profitMarginPct.toFixed(1)}%`,
      ],
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:G`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
}

