'use client';

import { useEffect, useRef, useState } from 'react';
import { Coins } from 'lucide-react';
import { useSocket } from '@/lib/socket/provider';
import { cn } from '@/lib/utils';

interface GameBalanceProps {
  frozen?: boolean;
  overrideBalance?: number | null;
}

/**
 * Compact balance display for use inside game UIs.
 * Shows current balance with flash animation on changes.
 * When `frozen` is true, holds the displayed value until unfrozen.
 * When `overrideBalance` is provided, uses that instead of socket balance.
 */
export function GameBalance({ frozen = false, overrideBalance }: GameBalanceProps) {
  const { balance: socketBalance } = useSocket();
  const balance = overrideBalance !== undefined ? overrideBalance : socketBalance;
  const displayRef = useRef<number | null>(null);
  const [displayBalance, setDisplayBalance] = useState<number | null>(null);
  const [flash, setFlash] = useState<'positive' | 'negative' | null>(null);

  useEffect(() => {
    if (balance === null) return;

    if (frozen) {
      // Initialize on first render only, then hold value
      if (displayRef.current === null) {
        displayRef.current = balance;
        setDisplayBalance(balance);
      }
      return;
    }

    // Not frozen: catch up to real balance
    const prev = displayRef.current;
    if (prev !== null && balance !== prev) {
      setFlash(balance > prev ? 'positive' : 'negative');
      const t = setTimeout(() => setFlash(null), 800);
      displayRef.current = balance;
      setDisplayBalance(balance);
      return () => clearTimeout(t);
    }
    displayRef.current = balance;
    setDisplayBalance(balance);
  }, [balance, frozen]);

  if (displayBalance === null) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full transition-colors duration-300',
        flash === 'positive' && 'bg-green-600/30',
        flash === 'negative' && 'bg-red-600/30'
      )}
    >
      <Coins className="w-3.5 h-3.5 text-yellow-400" />
      <span className="text-sm font-bold text-white tabular-nums">
        {displayBalance.toLocaleString('de-DE')}
      </span>
    </div>
  );
}
