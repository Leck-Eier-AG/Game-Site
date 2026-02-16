'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface PokerAction {
  playerId: string;
  playerName: string;
  action: 'fold' | 'check' | 'call' | 'raise' | 'all-in' | 'post-blind';
  amount?: number;
  timestamp: number;
}

interface PokerActionHistoryProps {
  actions: PokerAction[];
  maxActions?: number;
}

export function PokerActionHistory({ actions, maxActions = 10 }: PokerActionHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest action
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [actions]);

  // Show only last N actions
  const recentActions = actions.slice(-maxActions);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'fold':
        return '❌';
      case 'check':
        return '✓';
      case 'call':
        return '📞';
      case 'raise':
        return '⬆️';
      case 'all-in':
        return '🎯';
      case 'post-blind':
        return '🎲';
      default:
        return '•';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'fold':
        return 'text-red-400';
      case 'check':
        return 'text-gray-400';
      case 'call':
        return 'text-blue-400';
      case 'raise':
        return 'text-orange-400';
      case 'all-in':
        return 'text-red-500 font-bold';
      case 'post-blind':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getActionText = (action: PokerAction) => {
    switch (action.action) {
      case 'fold':
        return 'gefoldet';
      case 'check':
        return 'gecheckt';
      case 'call':
        return `gecallt $${action.amount?.toLocaleString()}`;
      case 'raise':
        return `erhöht auf $${action.amount?.toLocaleString()}`;
      case 'all-in':
        return `All-In $${action.amount?.toLocaleString()}`;
      case 'post-blind':
        return `Blind $${action.amount?.toLocaleString()}`;
      default:
        return action.action;
    }
  };

  if (recentActions.length === 0) {
    return (
      <div className="w-64 h-full bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <h3 className="text-sm font-bold text-gray-400 mb-3">Aktionen</h3>
        <div className="text-xs text-gray-500 text-center py-8">
          Noch keine Aktionen
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 h-full flex flex-col bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 border border-gray-800 shadow-xl">
      <h3 className="text-sm font-bold text-gray-400 mb-3 shrink-0">Aktionen</h3>
      <div
        ref={scrollRef}
        className="space-y-2 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
      >
        {recentActions.map((action, index) => (
          <div
            key={`${action.playerId}-${action.timestamp}-${index}`}
            className="flex items-start gap-2 text-xs animate-count-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span className="text-base">{getActionIcon(action.action)}</span>
            <div className="flex-1">
              <span className="font-semibold text-gray-300">{action.playerName}</span>
              {' '}
              <span className={cn(getActionColor(action.action))}>
                {getActionText(action)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
