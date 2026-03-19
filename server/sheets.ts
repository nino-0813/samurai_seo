/** スプレッドシートの1行目ヘッダー（空シートのとき自動で書き込み） */
export const SHEET_HEADERS = [
  '作成日時',
  '案件名',
  '売上(円)',
  'コスト内訳',
  'コスト合計',
  '利益(円)',
  '利益率(%)',
] as const;

export interface SaveRowInput {
  title: string;
  orderAmount: number;
  costsSummary: string;
  totalCost: number;
  profit: number;
  profitMarginPct: number;
}

export type SheetRow = {
  createdAt: string;
  title: string;
  orderAmount: string;
  costsDetail: string;
  totalCost: string;
  profit: string;
  margin: string;
};
