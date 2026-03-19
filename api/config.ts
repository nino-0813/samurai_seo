import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getConfig } from './_sheets';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const { spreadsheetId, sheetName } = getConfig();
  if (!spreadsheetId) {
    return res.status(503).json({ error: 'SPREADSHEET_ID が未設定です' });
  }
  res.status(200).json({ spreadsheetId, sheetName });
}

