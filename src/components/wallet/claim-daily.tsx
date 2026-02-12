'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Gift, Star } from 'lucide-react'
import { claimDaily } from '@/lib/actions/wallet'
import { useSocket } from '@/lib/socket/provider'
import { toast } from 'sonner'
import type { DailyClaimInfo } from '@/lib/wallet/daily-allowance'

interface ClaimDailyProps {
  dailyClaimInfo: DailyClaimInfo
}

export function ClaimDaily({ dailyClaimInfo: initialClaimInfo }: ClaimDailyProps) {
  const [claimInfo, setClaimInfo] = useState(initialClaimInfo)
  const [isLoading, setIsLoading] = useState(false)
  const { fetchBalance } = useSocket()

  const handleClaim = async () => {
    setIsLoading(true)

    try {
      const result = await claimDaily()

      if ('error' in result) {
        toast.error(result.error)
      } else {
        const bonusText = result.type === 'WEEKLY_BONUS' ? ' (+ Wochenbonus!)' : ''
        toast.success(`${result.amount} Chips abgeholt${bonusText}`, {
          description: `Aktivitätsbonus: ${Math.round(result.multiplier * 100)}%`,
        })

        // Update claim info to reflect claimed state
        setClaimInfo({
          canClaim: false,
          amount: result.amount,
          multiplier: result.multiplier,
          nextBonusIn: result.type === 'WEEKLY_BONUS' ? 7 : claimInfo.nextBonusIn - 1,
          isWeeklyBonus: false,
        })

        // Update sidebar balance in real-time
        fetchBalance()
      }
    } catch (error) {
      toast.error('Fehler beim Abholen des täglichen Guthabens')
      console.error('Claim daily error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const isWeeklyBonus = claimInfo.isWeeklyBonus

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Gift className="h-5 w-5 text-green-500" />
        Tägliches Guthaben
      </h3>

      <div className="space-y-4">
        {isWeeklyBonus && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-semibold text-yellow-400">Wochenbonus verfügbar!</span>
          </div>
        )}

        <Button
          onClick={handleClaim}
          disabled={!claimInfo.canClaim || isLoading}
          className="w-full"
          size="lg"
          variant={claimInfo.canClaim ? 'default' : 'secondary'}
        >
          {claimInfo.canClaim ? (
            <>
              Tägliches Guthaben abholen ({claimInfo.amount} Chips)
            </>
          ) : (
            'Bereits abgeholt'
          )}
        </Button>

        {!claimInfo.canClaim && (
          <p className="text-sm text-gray-400 text-center">Morgen wieder verfügbar</p>
        )}

        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Dein Aktivitätsbonus:</span>
            <span className="font-semibold text-green-500">
              {Math.round(claimInfo.multiplier * 100)}%
            </span>
          </div>

          {!isWeeklyBonus && claimInfo.nextBonusIn > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Nächster Wochenbonus in:</span>
              <span className="font-semibold text-yellow-500">
                {claimInfo.nextBonusIn} {claimInfo.nextBonusIn === 1 ? 'Abholung' : 'Abholungen'}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
