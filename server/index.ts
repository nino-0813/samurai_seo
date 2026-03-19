import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { google, sheets_v4 } from 'googleapis';
import type { SaveRowInput, SheetRow } from './sheets.js';
import { SHEET_HEADERS } from './sheets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID?.trim();
const SHEET_NAME = (process.env.SHEET_NAME || 'シート1').trim();
const API_PORT = Number(process.env.API_PORT) || 8788;
const isProd = process.env.NODE_ENV === 'production';
const LISTEN_PORT = isProd ? Number(process.env.PORT) || 3000 : API_PORT;

function getSheets(): sheets_v4.Sheets {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const jsonRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!keyFile && !jsonRaw) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS（JSONキーのパス）または GOOGLE_SERVICE_ACCOUNT_JSON を .env に設定してください。'
    );
  }
  const keyPath = keyFile
    ? path.isAbsolute(keyFile)
      ? keyFile
      : path.join(rootDir, keyFile)
    : undefined;
  const auth = new google.auth.GoogleAuth({
    ...(keyPath ? { keyFile: keyPath } : {}),
    ...(jsonRaw ? { credentials: JSON.parse(jsonRaw) as object } : {}),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function ensureHeaderRow(sheets: sheets_v4.Sheets): Promise<void> {
  if (!SPREADSHEET_ID) return;
  const range = `${SHEET_NAME}!A1:G1`;
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  const first = data.values?.[0]?.[0];
  if (first == null || String(first).trim() === '') {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [SHEET_HEADERS as unknown as string[]] },
    });
  }
}

const app = express();
app.use(express.json({ limit: '256kb' }));

app.get('/api/config', (_req, res) => {
  if (!SPREADSHEET_ID) {
    return res.status(503).json({ error: 'SPREADSHEET_ID が未設定です' });
  }
  res.json({ spreadsheetId: SPREADSHEET_ID, sheetName: SHEET_NAME });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, configured: Boolean(SPREADSHEET_ID) });
});

app.get('/api/rows', async (_req, res) => {
  if (!SPREADSHEET_ID) {
    return res.status(503).json({ error: 'SPREADSHEET_ID を .env に設定してください' });
  }
  try {
    const sheets = getSheets();
    const range = `${SHEET_NAME}!A2:G1000`;
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
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
    res.json(mapped);
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/append', async (req, res) => {
  if (!SPREADSHEET_ID) {
    return res.status(503).json({ error: 'SPREADSHEET_ID を .env に設定してください' });
  }
  const body = req.body as SaveRowInput;
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
    await ensureHeaderRow(sheets);
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
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:G`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

if (isProd) {
  const dist = path.join(rootDir, 'dist');
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.listen(LISTEN_PORT, () => {
  console.log(
    `[sheets-api] http://127.0.0.1:${LISTEN_PORT}${isProd ? ' (本番: dist 配信)' : ''}  SPREADSHEET_ID=${SPREADSHEET_ID ? 'OK' : '未設定'}  シート=${SHEET_NAME}`
  );
});
