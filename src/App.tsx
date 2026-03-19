import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus,
  Trash2,
  TrendingUp,
  DollarSign,
  PieChart as PieChartIcon,
  FileSpreadsheet,
  List,
  PenLine,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  appendCalculationRow,
  fetchCalculationRows,
  fetchSheetConfig,
  spreadsheetUrl,
  type SheetRow,
} from './lib/sheetsApi';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount);
};

interface CostItem {
  id: string;
  name: string;
  amount: number;
}

const COLORS = ['#f43f5e', '#f97316', '#eab308', '#8b5cf6', '#ec4899', '#06b6d4'];
const PROFIT_COLOR = '#10b981';

type View = 'new' | 'list';

export default function App() {
  const [view, setView] = useState<View>('new');
  const [sheetConfig, setSheetConfig] = useState<{ spreadsheetId: string; sheetName: string } | null>(null);
  const [apiReady, setApiReady] = useState<boolean | null>(null);

  const [orderAmount, setOrderAmount] = useState<string>('');
  const [caseTitle, setCaseTitle] = useState('');
  const [costs, setCosts] = useState<CostItem[]>([
    { id: '1', name: '外注費', amount: 0 },
    { id: '2', name: 'サーバー代', amount: 0 },
  ]);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const [listRows, setListRows] = useState<SheetRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.ok)
      .then(setApiReady)
      .catch(() => setApiReady(false));
    fetchSheetConfig().then(setSheetConfig);
  }, []);

  const handleOrderAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setOrderAmount(value);
  };

  const handleCostChange = (id: string, field: 'name' | 'amount', value: string) => {
    setCosts((prev) =>
      prev.map((cost) => {
        if (cost.id !== id) return cost;
        if (field === 'amount') {
          const numValue = value.replace(/[^0-9]/g, '');
          return { ...cost, amount: numValue ? parseInt(numValue, 10) : 0 };
        }
        return { ...cost, name: value };
      })
    );
  };

  const addCostItem = () => {
    setCosts((prev) => [...prev, { id: Date.now().toString(), name: '', amount: 0 }]);
  };

  const removeCostItem = (id: string) => {
    setCosts((prev) => prev.filter((cost) => cost.id !== id));
  };

  const parsedOrderAmount = orderAmount ? parseInt(orderAmount, 10) : 0;
  const totalCost = useMemo(() => costs.reduce((sum, cost) => sum + cost.amount, 0), [costs]);
  const profit = parsedOrderAmount - totalCost;
  const profitMargin = parsedOrderAmount > 0 ? (profit / parsedOrderAmount) * 100 : 0;

  const costsSummary = useMemo(
    () =>
      costs
        .filter((c) => c.amount > 0 || c.name.trim())
        .map((c) => `${c.name || '項目'}:${c.amount}`)
        .join(' / ') || '—',
    [costs]
  );

  const chartData = useMemo(() => {
    const data: { name: string; value: number; color: string }[] = [];
    if (profit > 0) data.push({ name: '利益', value: profit, color: PROFIT_COLOR });
    costs.forEach((cost, index) => {
      if (cost.amount > 0) {
        data.push({
          name: cost.name || `コスト ${index + 1}`,
          value: cost.amount,
          color: COLORS[index % COLORS.length],
        });
      }
    });
    if (data.length === 0 && parsedOrderAmount > 0) {
      data.push({ name: '利益', value: parsedOrderAmount, color: PROFIT_COLOR });
    }
    return data;
  }, [profit, costs, parsedOrderAmount]);

  const handleSaveToSheet = async () => {
    setSaveError(null);
    setSaveStatus('saving');
    try {
      await appendCalculationRow({
        title: caseTitle,
        orderAmount: parsedOrderAmount,
        costsSummary,
        totalCost,
        profit,
        profitMarginPct: profitMargin,
      });
      setCaseTitle('');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaveStatus('idle');
    }
  };

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const rows = await fetchCalculationRows();
      setListRows([...rows].reverse());
    } catch (e) {
      setListError(e instanceof Error ? e.message : '一覧を取得できませんでした');
      setListRows([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'list') loadList();
  }, [view, loadList]);

  const busy = saveStatus === 'saving';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-emerald-100 selection:text-emerald-900 flex">
      <aside className="w-56 shrink-0 bg-white border-r border-zinc-200 flex flex-col min-h-screen sticky top-0 self-start">
        <div className="p-4 border-b border-zinc-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-sm">
              <TrendingUp size={18} />
            </div>
            <span className="font-semibold text-sm leading-tight">
              サムライSEO
              <br />
              利益計算
            </span>
          </div>
        </div>
        <nav className="p-2 flex flex-col gap-1 flex-1">
          <button
            type="button"
            onClick={() => setView('new')}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
              view === 'new'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                : 'text-zinc-600 hover:bg-zinc-50 border border-transparent'
            )}
          >
            <PenLine size={18} className={view === 'new' ? 'text-emerald-600' : 'text-zinc-400'} />
            新規作成
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
              view === 'list'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                : 'text-zinc-600 hover:bg-zinc-50 border border-transparent'
            )}
          >
            <List size={18} className={view === 'list' ? 'text-emerald-600' : 'text-zinc-400'} />
            保存一覧
          </button>
        </nav>
        <div className="p-3 border-t border-zinc-100 text-xs text-zinc-500">
          {apiReady === false && (
            <p className="text-amber-800 bg-amber-50 p-2 rounded-lg leading-relaxed">
              API が応答しません。<code className="text-[10px]">npm run dev</code> で API も起動してください。
            </p>
          )}
          {sheetConfig && (
            <p className="text-zinc-400 leading-relaxed">
              連携: <span className="text-zinc-600">{sheetConfig.sheetName}</span>
            </p>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
            <h1 className="text-lg font-semibold tracking-tight truncate">
              {view === 'new' ? '新規作成' : 'スプレッドシートの保存一覧'}
            </h1>
            {sheetConfig?.spreadsheetId && (
              <a
                href={spreadsheetUrl(sheetConfig.spreadsheetId)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 shrink-0"
              >
                <FileSpreadsheet size={16} />
                スプレッドシートを開く
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
          {view === 'list' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={loadList}
                  disabled={listLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
                >
                  {listLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  再読み込み
                </button>
                {sheetConfig && (
                  <span className="text-sm text-zinc-500">
                    タブ: <code className="bg-zinc-100 px-1.5 py-0.5 rounded">{sheetConfig.sheetName}</code>
                  </span>
                )}
              </div>
              {listError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 whitespace-pre-wrap">
                  {listError}
                </p>
              )}
              {listLoading && !listRows.length && !listError ? (
                <div className="flex justify-center py-16 text-zinc-400">
                  <Loader2 size={32} className="animate-spin" />
                </div>
              ) : !listError && listRows.length === 0 ? (
                <p className="text-center text-zinc-500 py-12">まだ保存された行がありません。「新規作成」から保存してください。</p>
              ) : listRows.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        <th className="px-4 py-3 font-semibold text-zinc-700 whitespace-nowrap">作成日時</th>
                        <th className="px-4 py-3 font-semibold text-zinc-700">案件名</th>
                        <th className="px-4 py-3 font-semibold text-zinc-700 text-right whitespace-nowrap">売上</th>
                        <th className="px-4 py-3 font-semibold text-zinc-700 min-w-[180px]">コスト内訳</th>
                        <th className="px-4 py-3 font-semibold text-zinc-700 text-right">利益</th>
                        <th className="px-4 py-3 font-semibold text-zinc-700 text-right">利益率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listRows.map((row, i) => (
                        <tr key={`${row.createdAt}-${i}`} className="border-b border-zinc-100 hover:bg-zinc-50/80">
                          <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{row.createdAt}</td>
                          <td className="px-4 py-3 font-medium">{row.title}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{row.orderAmount}</td>
                          <td className="px-4 py-3 text-zinc-600 text-xs max-w-xs truncate" title={row.costsDetail}>
                            {row.costsDetail}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium">{row.profit}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-zinc-600">{row.margin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="mb-6 p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm flex flex-wrap items-center gap-3">
                <FileSpreadsheet className="text-emerald-600 shrink-0" size={20} />
                <p className="text-sm text-zinc-600 flex-1 min-w-[200px]">
                  保存先は固定の Google スプレッドシート（<strong>シート1</strong> など .env で指定したタブ）です。ブラウザでの Google ログインは不要です。
                </p>
              </div>
              {saveError && (
                <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 whitespace-pre-wrap">
                  {saveError}
                </p>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-6">
                  <section className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100">
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                      <PenLine size={20} className="text-zinc-400" />
                      案件名（スプレッドシートに保存）
                    </h2>
                    <input
                      type="text"
                      value={caseTitle}
                      onChange={(e) => setCaseTitle(e.target.value)}
                      placeholder="例: ○○様 SEO案件 2025年3月"
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </section>

                  <section className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100">
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                      <DollarSign size={20} className="text-zinc-400" />
                      発注金額 (売上)
                    </h2>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">¥</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={orderAmount ? parseInt(orderAmount, 10).toLocaleString() : ''}
                        onChange={handleOrderAmountChange}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <p className="text-sm text-zinc-500 mt-2">案件の総額を入力してください。</p>
                  </section>

                  <section className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-medium flex items-center gap-2">
                        <PieChartIcon size={20} className="text-zinc-400" />
                        かかったコスト
                      </h2>
                      <span className="text-sm font-medium text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-full">
                        合計: {formatCurrency(totalCost)}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <AnimatePresence initial={false}>
                        {costs.map((cost) => (
                          <motion.div
                            key={cost.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-3"
                          >
                            <input
                              type="text"
                              value={cost.name}
                              onChange={(e) => handleCostChange(cost.id, 'name', e.target.value)}
                              placeholder="項目名"
                              className="flex-1 min-w-0 px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                            <div className="relative w-1/3 min-w-[100px]">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">¥</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={cost.amount ? cost.amount.toLocaleString() : ''}
                                onChange={(e) => handleCostChange(cost.id, 'amount', e.target.value)}
                                placeholder="0"
                                className="w-full pl-7 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeCostItem(cost.id)}
                              className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                              aria-label="削除"
                            >
                              <Trash2 size={18} />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    <button
                      type="button"
                      onClick={addCostItem}
                      className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-zinc-300 text-zinc-600 rounded-xl hover:bg-zinc-50 text-sm font-medium"
                    >
                      <Plus size={18} />
                      コストを追加
                    </button>
                  </section>

                  <button
                    type="button"
                    onClick={handleSaveToSheet}
                    disabled={busy || apiReady === false}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-semibold text-base hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    {busy ? <Loader2 size={22} className="animate-spin" /> : <FileSpreadsheet size={22} />}
                    スプレッドシートに保存
                  </button>
                </div>

                <div className="lg:col-span-7 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100">
                      <p className="text-sm font-medium text-zinc-500 mb-1">最終利益</p>
                      <div
                        className={cn(
                          'text-3xl sm:text-4xl font-bold tracking-tight',
                          profit > 0 ? 'text-emerald-600' : profit < 0 ? 'text-red-600' : 'text-zinc-900'
                        )}
                      >
                        {formatCurrency(profit)}
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100">
                      <p className="text-sm font-medium text-zinc-500 mb-1">利益率</p>
                      <div
                        className={cn(
                          'text-3xl sm:text-4xl font-bold tracking-tight',
                          profitMargin > 0 ? 'text-emerald-600' : profitMargin < 0 ? 'text-red-600' : 'text-zinc-900'
                        )}
                      >
                        {profitMargin.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <section className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100">
                    <h2 className="text-lg font-medium mb-6">内訳とグラフ</h2>
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                      <div className="w-full md:w-1/2 h-[240px]">
                        {parsedOrderAmount > 0 || totalCost > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                              >
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{
                                  borderRadius: '12px',
                                  border: 'none',
                                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm bg-zinc-50 rounded-full border border-dashed border-zinc-200">
                            金額を入力するとグラフが表示されます
                          </div>
                        )}
                      </div>
                      <div className="w-full md:w-1/2 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                          <span className="text-zinc-600">発注金額</span>
                          <span className="font-semibold">{formatCurrency(parsedOrderAmount)}</span>
                        </div>
                        <div className="space-y-2">
                          {costs.map(
                            (cost, i) =>
                              cost.amount > 0 && (
                                <div key={cost.id} className="flex justify-between items-center text-sm">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                    />
                                    <span className="text-zinc-500">{cost.name || `コスト ${i + 1}`}</span>
                                  </div>
                                  <span className="text-zinc-700">-{formatCurrency(cost.amount)}</span>
                                </div>
                              )
                          )}
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="font-medium text-zinc-900">最終利益</span>
                          </div>
                          <span
                            className={cn(
                              'font-bold',
                              profit > 0 ? 'text-emerald-600' : profit < 0 ? 'text-red-600' : 'text-zinc-900'
                            )}
                          >
                            {formatCurrency(profit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
