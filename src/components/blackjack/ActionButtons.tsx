'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ActionButtonsProps {
  availableActions: string[];
  onAction: (action: string) => void;
  disabled: boolean;
  currentBet: number;
  balance: number;
}

const ACTION_LABELS: Record<string, string> = {
  hit: 'Ziehen',
  stand: 'Halten',
  double: 'Verdoppeln',
  split: 'Teilen',
  insurance: 'Versicherung',
  surrender: 'Aufgeben',
};

const ACTION_VARIANTS: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
  hit: 'default',
  stand: 'secondary',
  double: 'outline',
  split: 'outline',
  insurance: 'outline',
  surrender: 'destructive',
};

export function ActionButtons({
  availableActions,
  onAction,
  disabled,
  currentBet,
  balance,
}: ActionButtonsProps) {
  if (availableActions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {availableActions.map((action) => {
        // Check if player can afford double/split
        const canAfford =
          action === 'double' || action === 'split'
            ? balance >= currentBet
            : true;

        return (
          <Button
            key={action}
            onClick={() => onAction(action)}
            disabled={disabled || !canAfford}
            variant={ACTION_VARIANTS[action] || 'default'}
            size="lg"
            className={cn(
              'min-w-[120px] font-semibold',
              action === 'hit' && 'bg-green-600 hover:bg-green-700',
              action === 'stand' && 'bg-blue-600 hover:bg-blue-700',
              !canAfford && 'opacity-50 cursor-not-allowed'
            )}
          >
            {ACTION_LABELS[action] || action}
          </Button>
        );
      })}
    </div>
  );
}
