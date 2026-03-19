import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getConfig } from './_config';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const { spreadsheetId } = getConfig();
  res.status(200).json({ ok: true, configured: Boolean(spreadsheetId) });
}

