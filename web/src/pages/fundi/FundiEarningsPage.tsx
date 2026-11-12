import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Wallet as WalletIcon } from 'lucide-react';
import { getTransactions, getWallet, type Transaction, type Wallet } from '../../lib/api';

function money(amount: number, currency = 'UGX') {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

function when(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FundiEarningsPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([getWallet(), getTransactions()])
      .then(([w, t]) => {
        if (!alive) return;
        setWallet(w.wallet);
        setTransactions(t.transactions || []);
      })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load earnings'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const currency = wallet?.currency || 'UGX';
  const income = transactions.filter(t => t.type === 'deposit' || t.type === 'payout');
  const inflow = income.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const pending = transactions.filter(t => t.status !== 'completed').reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const summary = [
    { label: 'Wallet balance', value: money(Number(wallet?.balance ?? 0), currency), icon: WalletIcon, up: true },
    { label: 'Recorded inflow', value: money(inflow, currency), icon: ArrowUpRight, up: true },
    { label: 'Pending', value: money(pending, currency), icon: ArrowDownRight, up: false },
  ];

  if (loading) {
    return <div className="max-w-[1100px] mx-auto"><p className="text-sm text-gray-400">Loading earnings…</p></div>;
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-3">Earnings</h1>
      <p className="text-sm text-gray-400 mb-14">Track your wallet and payouts</p>

      {error && <p className="text-sm text-red-500 mb-8">{error}</p>}

      <div className="grid grid-cols-3 gap-8 mb-20">
        {summary.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="py-6">
              <span className={`text-xs font-semibold flex items-center gap-1 mb-3 ${m.up ? 'text-emerald-500' : 'text-amber-500'}`}>
                <Icon size={12} /> {m.up ? 'Available' : 'Processing'}
              </span>
              <div className="text-3xl font-bold text-gray-900">{m.value}</div>
              <div className="text-sm text-gray-400 mt-1">{m.label}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <h2 className="text-lg font-bold text-gray-900 px-8 pt-8 pb-4">Transactions</h2>
        {transactions.length === 0 ? (
          <div className="px-8 pb-12 pt-2 text-center">
            <p className="font-semibold text-gray-900">No transactions yet</p>
            <p className="text-sm text-gray-400 mt-1">Payments recorded against your bookings will appear here.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {['Type', 'Description', 'Status', 'Amount', 'Date'].map(h => (
                  <th key={h} className="text-left px-8 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5 text-sm font-semibold text-gray-900 capitalize">{t.type}</td>
                  <td className="px-8 py-5 text-sm text-gray-500">{t.description || '—'}</td>
                  <td className="px-8 py-5">
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${t.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{t.status || 'pending'}</span>
                  </td>
                  <td className="px-8 py-5 font-bold text-gray-900">{money(Number(t.amount || 0), t.currency || currency)}</td>
                  <td className="px-8 py-5 text-sm text-gray-400">{when(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
