// Zaim API は OAuth 1.0 なので、ブラウザから直接呼ぶには
// CORS制約があるため、Supabase Edge Function をプロキシとして使用する。
// しかし Edge Function のデプロイが不要な簡易構成として、
// Supabase の database function + RPC を使う方法もある。
//
// ここでは最もシンプルな構成として、
// ローカルのNode.jsプロキシサーバー or Supabase Edge Functionを経由する設計。
// 開発中はViteのproxyを使ってCORSを回避する。

export interface ZaimTransaction {
  id: number;
  amount: number;
  date: string;
  category_id: number;
  genre_id: number;
  comment: string;
  place: string;
  mode: 'payment' | 'income' | 'transfer';
}

export interface ZaimCategory {
  id: number;
  name: string;
  mode: string;
}

export interface ZaimGenre {
  id: number;
  name: string;
  category_id: number;
}

// Vite dev proxy経由でZaim APIを呼ぶ
// production環境では Supabase Edge Function に置き換える
const ZAIM_API_BASE = '/zaim-api';

export async function fetchZaimMoney(startDate: string, endDate: string): Promise<ZaimTransaction[]> {
  const allTransactions: ZaimTransaction[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      mode: 'payment',
      mapping: '1',
      page: String(page),
    });

    const res = await fetch(`${ZAIM_API_BASE}/v2/home/money?${params}`);
    if (!res.ok) throw new Error(`Zaim API error: ${res.status}`);
    const json = await res.json();
    const money: ZaimTransaction[] = json.money || [];

    if (money.length === 0) break;

    allTransactions.push(...money);
    page++;
  }

  return allTransactions;
}

export async function fetchZaimCategories(): Promise<ZaimCategory[]> {
  const res = await fetch(`${ZAIM_API_BASE}/v2/home/category`);
  if (!res.ok) throw new Error(`Zaim API error: ${res.status}`);
  const json = await res.json();
  return json.categories || [];
}

export async function fetchZaimGenres(): Promise<ZaimGenre[]> {
  const res = await fetch(`${ZAIM_API_BASE}/v2/home/genre`);
  if (!res.ok) throw new Error(`Zaim API error: ${res.status}`);
  const json = await res.json();
  return json.genres || [];
}

export function isZaimConfigured(): boolean {
  return !!(
    import.meta.env.VITE_ZAIM_CONSUMER_KEY &&
    import.meta.env.VITE_ZAIM_ACCESS_TOKEN
  );
}
