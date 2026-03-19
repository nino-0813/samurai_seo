export function env(name: string, fallback?: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || fallback;
}

export function getConfig() {
  const spreadsheetId = env('SPREADSHEET_ID');
  const sheetName = env('SHEET_NAME', 'シート1')!;
  return { spreadsheetId, sheetName };
}

