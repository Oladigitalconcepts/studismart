// Coin economy helpers — wraps the `wallets`, `coin_transactions` and
// `adjust_coins` RPC. Emits `wallet-updated` so any header/balance pill
// refreshes immediately after a spend or earn.
import { supabase } from "@/integrations/supabase/client";

export interface Wallet {
  user_id: string;
  coins: number;
  xp: number;
  level: number;
  streak_days: number;
  last_login_date: string | null;
}

export const COSTS = {
  unlock_skill: 2,
  generate_test: 2,
  ai_tutor: 1,
  summarize_notes: 2,
  create_quiz_for_others: 3,
} as const;

export type SpendReason = keyof typeof COSTS;

const broadcast = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("wallet-updated"));
  }
};

export async function ensureWallet(): Promise<Wallet | null> {
  const { data, error } = await supabase.rpc("ensure_wallet");
  if (error) {
    console.error("ensureWallet", error);
    return null;
  }
  return data as Wallet;
}

export async function getWallet(): Promise<Wallet | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return ensureWallet();
  return data as Wallet;
}

export async function earn(amount: number, reason: string, meta: Record<string, unknown> = {}) {
  const { data, error } = await supabase.rpc("adjust_coins", {
    _amount: amount, _kind: "earn", _reason: reason, _meta: meta,
  });
  if (error) throw error;
  broadcast();
  return data as Wallet;
}

export async function spend(reason: SpendReason, meta: Record<string, unknown> = {}) {
  const cost = COSTS[reason];
  const { data, error } = await supabase.rpc("adjust_coins", {
    _amount: -cost, _kind: "spend", _reason: reason, _meta: meta,
  });
  if (error) throw error;
  broadcast();
  return data as Wallet;
}

export async function purchase(amount: number, reason: string, meta: Record<string, unknown> = {}) {
  const { data, error } = await supabase.rpc("adjust_coins", {
    _amount: amount, _kind: "purchase", _reason: reason, _meta: meta,
  });
  if (error) throw error;
  broadcast();
  return data as Wallet;
}

// ---- Locale-aware currency for coin packs ----
export function detectCurrency(): "NGN" | "USD" {
  try {
    const lang = (navigator.language || "").toLowerCase();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (lang.includes("ng") || tz.includes("Lagos")) return "NGN";
  } catch { /* noop */ }
  return "USD";
}

export interface CoinPack {
  id: string;
  coins: number;
  bonus?: string;
  best?: boolean;
  prices: { NGN: number; USD: number };
}

export const COIN_PACKS: CoinPack[] = [
  { id: "pack_100",  coins: 100,  prices: { NGN: 100,  USD: 0.99 } },
  { id: "pack_500",  coins: 500,  bonus: "+20% Bonus", best: true, prices: { NGN: 200,  USD: 3.99 } },
  { id: "pack_1000", coins: 1000, bonus: "+30% Bonus", prices: { NGN: 500,  USD: 6.99 } },
  { id: "pack_2500", coins: 2500, bonus: "+40% Bonus", prices: { NGN: 1000, USD: 13.99 } },
];

export function formatPrice(amount: number, ccy: "NGN" | "USD") {
  if (ccy === "NGN") return `₦${amount.toLocaleString()}`;
  return `$${amount.toFixed(2)}`;
}
