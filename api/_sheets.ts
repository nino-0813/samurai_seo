import * as googleapis from 'googleapis';
import type { sheets_v4 } from 'googleapis';
import { env } from './_config';

export const SHEET_HEADERS = [
  '作成日時',
  '案件名',
  '売上(円)',
  'コスト内訳',
  'コスト合計',
  '利益(円)',
  '利益率(%)',
] as const;

export type SheetRow = {
  createdAt: string;
  title: string;
  orderAmount: string;
  costsDetail: string;
  totalCost: string;
  profit: string;
  margin: string;
};

export type SaveRowInput = {
  title: string;
  orderAmount: number;
  costsSummary: string;
  totalCost: number;
  profit: number;
  profitMarginPct: number;
};

function looksLikeJson(s: string): boolean {
  const t = s.trim();
  return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'));
}

function getServiceAccountJson(): string {
  const jsonRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonRaw) return jsonRaw;

  // 互換: 間違って GOOGLE_APPLICATION_CREDENTIALS に JSON を貼ってしまうケースを救済
  const maybe = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (maybe && looksLikeJson(maybe)) return maybe;

  throw new Error(
    'GOOGLE_SERVICE_ACCOUNT_JSON が未設定です（Vercel の Env に貼り付けてください）。' +
      '※ いま GOOGLE_APPLICATION_CREDENTIALS に JSON を貼っている場合は GOOGLE_SERVICE_ACCOUNT_JSON に移してください。'
  );
}

export function getSheets(): sheets_v4.Sheets {
  const jsonRaw = getServiceAccountJson();
  let credentials: object;
  try {
    credentials = JSON.parse(jsonRaw) as object;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`GOOGLE_SERVICE_ACCOUNT_JSON の JSON 解析に失敗しました: ${msg}`);
  }

  const auth = new googleapis.google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return googleapis.google.sheets({ version: 'v4', auth });
}

export async function ensureHeaderRow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  const range = `${sheetName}!A1:G1`;
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  const first = data.values?.[0]?.[0];
  if (first == null || String(first).trim() === '') {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [SHEET_HEADERS as unknown as string[]] },
    });
  }
}

export async function readJsonBody<T>(req: any): Promise<T> {
  if (req.body && typeof req.body === 'object') return req.body as T;
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve());
    req.on('error', reject);
  });
  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw) as T;
}

