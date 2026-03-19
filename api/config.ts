import { getConfig } from './_config';

export default function handler(_req: any, res: any) {
  try {
    const { spreadsheetId, sheetName } = getConfig();
    if (!spreadsheetId) {
      return res.status(503).json({ error: 'SPREADSHEET_ID が未設定です' });
    }
    res.status(200).json({ spreadsheetId, sheetName });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
}

