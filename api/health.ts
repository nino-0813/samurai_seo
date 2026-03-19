import { getConfig } from './_config';

export default function handler(_req: any, res: any) {
  try {
    const { spreadsheetId } = getConfig();
    res.status(200).json({
      ok: true,
      configured: Boolean(spreadsheetId),
      // 診断用（秘密は返さない）
      env: {
        hasSpreadsheetId: Boolean(process.env.SPREADSHEET_ID),
        hasSheetName: Boolean(process.env.SHEET_NAME),
        hasServiceAccountJson: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
        hasApplicationCredentials: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(200).json({ ok: true, configured: false, error: msg });
  }
}

