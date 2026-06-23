import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface TickerItem {
	symbol: string;
	price: number;
	change24h: number;
}

let cache: { data: TickerItem[]; fetchedAt: number } | null = null;
const CACHE_TTL = 60_000;

async function fetchCrypto(): Promise<TickerItem[]> {
	try {
		const res = await fetch(
			'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,usd-coin&vs_currencies=usd&include_24hr_change=true',
			{ signal: AbortSignal.timeout(8000) }
		);
		if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
		const data = await res.json();
		const map: Record<string, string> = {
			bitcoin: 'BTC',
			ethereum: 'ETH',
			solana: 'SOL',
			'usd-coin': 'USDC',
		};
		return Object.entries(map).map(([id, symbol]) => ({
			symbol,
			price: data[id]?.usd ?? 0,
			change24h: data[id]?.usd_24h_change ?? 0,
		}));
	} catch {
		return [
			{ symbol: 'BTC', price: 104820, change24h: 1.42 },
			{ symbol: 'ETH', price: 3945, change24h: -0.33 },
			{ symbol: 'SOL', price: 178.5, change24h: 3.21 },
			{ symbol: 'USDC', price: 1.0, change24h: 0.01 },
		];
	}
}

async function fetchStocks(): Promise<TickerItem[]> {
	// TODO: Replace with real Finnhub API call.
	// 1. Get free key at https://finnhub.io/register
	// 2. Add FINNHUB_API_KEY=your_key to app/.env
	// 3. Uncomment the fetch below and delete the mock return.
	//
	// const key = env.FINNHUB_API_KEY;
	// if (!key) return mockStocks;
	// const symbols = ['AAPL', 'TSLA', 'NVDA'];
	// return Promise.all(symbols.map(async (sym) => {
	//   const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${key}`);
	//   const d = await res.json();
	//   return { symbol: sym, price: d.c, change24h: d.dp };
	// }));

	return [
		{ symbol: 'AAPL', price: 198.11, change24h: 1.24 },
		{ symbol: 'TSLA', price: 342.87, change24h: -0.58 },
		{ symbol: 'NVDA', price: 135.40, change24h: 2.31 },
	];
}

export const GET: RequestHandler = async () => {
	const now = Date.now();
	if (cache && now - cache.fetchedAt < CACHE_TTL) {
		return json(cache.data, { headers: { 'Cache-Control': 'public, max-age=30' } });
	}
	const [crypto, stocks] = await Promise.all([fetchCrypto(), fetchStocks()]);
	const data = [...crypto, ...stocks];
	cache = { data, fetchedAt: now };
	return json(data, { headers: { 'Cache-Control': 'public, max-age=30' } });
};
