'use client'

import { useActionState } from 'react'
import { updateSystemSettings } from '@/lib/actions/admin-finance'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SystemSettings {
  id: string
  currencyName: string
  startingBalance: number
  dailyAllowanceBase: number
  weeklyBonusAmount: number
  transferMaxAmount: number
  transferDailyLimit: number
  defaultBetPresets: unknown
  defaultPayoutRatios: unknown
  afkGracePeriodSec: number
  alertTransferLimit: number
  alertBalanceDropPct: number
}

interface EconomicSettingsProps {
  settings: SystemSettings
}

export function EconomicSettings({ settings }: EconomicSettingsProps) {
  const [state, formAction, isPending] = useActionState(
    updateSystemSettings,
    undefined
  )

  // Parse JSON values with type guards
  const parsedBetPresets = Array.isArray(settings.defaultBetPresets)
    ? settings.defaultBetPresets.filter((v): v is number => typeof v === 'number')
    : []
  const parsedPayoutRatios = Array.isArray(settings.defaultPayoutRatios)
    ? settings.defaultPayoutRatios.filter(
        (v): v is { position: number; percentage: number } =>
          typeof v === 'object' &&
          v !== null &&
          'position' in v &&
          'percentage' in v
      )
    : []

  const [betPresets, setBetPresets] = useState(
    parsedBetPresets.join(', ')
  )
  const [payoutRatios, setPayoutRatios] = useState(parsedPayoutRatios)

  // Reset form success message after 3 seconds
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        // Don't clear state, just let user see the success message
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [state?.success])

  const handleAddPayoutRatio = () => {
    const maxPosition = Math.max(...payoutRatios.map((r) => r.position), 0)
    setPayoutRatios([...payoutRatios, { position: maxPosition + 1, percentage: 0 }])
  }

  const handleRemovePayoutRatio = (index: number) => {
    setPayoutRatios(payoutRatios.filter((_, i) => i !== index))
  }

  const handlePayoutRatioChange = (
    index: number,
    field: 'position' | 'percentage',
    value: string
  ) => {
    const newRatios = [...payoutRatios]
    newRatios[index] = {
      ...newRatios[index],
      [field]: parseInt(value) || 0,
    }
    setPayoutRatios(newRatios)
  }

  return (
    <Card className="bg-zinc-900 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Wirtschaftseinstellungen</CardTitle>
        <CardDescription className="text-zinc-400">
          Systemweite Parameter für die virtuelle Währung. Änderungen werden sofort wirksam.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-6">
          {/* Success/Error Messages */}
          {state?.success && (
            <Alert className="bg-green-500/10 border-green-500/20 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Einstellungen erfolgreich gespeichert!
              </AlertDescription>
            </Alert>
          )}

          {state?.error && (
            <Alert className="bg-red-500/10 border-red-500/20 text-red-500">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Currency Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Währung</h3>

            <div className="space-y-2">
              <Label htmlFor="currencyName" className="text-zinc-300">
                Währungsname
              </Label>
              <Input
                id="currencyName"
                name="currencyName"
                defaultValue={settings.currencyName}
                required
                className="bg-zinc-800 border-white/10 text-white"
              />
            </div>
          </div>

          {/* Balance Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Guthaben</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startingBalance" className="text-zinc-300">
                  Startguthaben
                </Label>
                <Input
                  id="startingBalance"
                  name="startingBalance"
                  type="number"
                  defaultValue={settings.startingBalance}
                  required
                  min="0"
                  className="bg-zinc-800 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dailyAllowanceBase" className="text-zinc-300">
                  Tägliches Guthaben (Basis)
                </Label>
                <Input
                  id="dailyAllowanceBase"
                  name="dailyAllowanceBase"
                  type="number"
                  defaultValue={settings.dailyAllowanceBase}
                  required
                  min="0"
                  className="bg-zinc-800 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weeklyBonusAmount" className="text-zinc-300">
                  Wöchentlicher Bonus
                </Label>
                <Input
                  id="weeklyBonusAmount"
                  name="weeklyBonusAmount"
                  type="number"
                  defaultValue={settings.weeklyBonusAmount}
                  required
                  min="0"
                  className="bg-zinc-800 border-white/10 text-white"
                />
              </div>
            </div>
          </div>

          {/* Transfer Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Transfers</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transferMaxAmount" className="text-zinc-300">
                  Transfer-Maximum
                </Label>
                <Input
                  id="transferMaxAmount"
                  name="transferMaxAmount"
                  type="number"
                  defaultValue={settings.transferMaxAmount}
                  required
                  min="1"
                  className="bg-zinc-800 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transferDailyLimit" className="text-zinc-300">
                  Tägliches Transfer-Limit
                </Label>
                <Input
                  id="transferDailyLimit"
                  name="transferDailyLimit"
                  type="number"
                  defaultValue={settings.transferDailyLimit}
                  required
                  min="1"
                  className="bg-zinc-800 border-white/10 text-white"
                />
              </div>
            </div>
          </div>

          {/* Betting Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Wetten</h3>

            <div className="space-y-2">
              <Label htmlFor="defaultBetPresets" className="text-zinc-300">
                Standard-Einsätze (kommagetrennt)
              </Label>
              <Input
                id="defaultBetPresets"
                name="defaultBetPresets"
                value={betPresets}
                onChange={(e) => setBetPresets(e.target.value)}
                placeholder="z.B. 10, 25, 50, 100"
                required
                className="bg-zinc-800 border-white/10 text-white"
              />
              <input
                type="hidden"
                name="defaultBetPresets"
                value={JSON.stringify(
                  betPresets
                    .split(',')
                    .map((s) => parseInt(s.trim()))
                    .filter((n) => !isNaN(n))
                )}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">
                Standard-Auszahlungsquoten
              </Label>
              <div className="space-y-2">
                {payoutRatios.map((ratio, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Platz"
                      value={ratio.position}
                      onChange={(e) =>
                        handlePayoutRatioChange(index, 'position', e.target.value)
                      }
                      min="1"
                      className="w-24 bg-zinc-800 border-white/10 text-white"
                    />
                    <Input
                      type="number"
                      placeholder="Prozent"
                      value={ratio.percentage}
                      onChange={(e) =>
                        handlePayoutRatioChange(
                          index,
                          'percentage',
                          e.target.value
                        )
                      }
                      min="0"
                      max="100"
                      className="flex-1 bg-zinc-800 border-white/10 text-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemovePayoutRatio(index)}
                      className="border-white/10 hover:bg-white/5 text-white"
                    >
                      Entfernen
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPayoutRatio}
                  className="border-white/10 hover:bg-white/5 text-white"
                >
                  + Quote hinzufügen
                </Button>
              </div>
              <input
                type="hidden"
                name="defaultPayoutRatios"
                value={JSON.stringify(payoutRatios)}
              />
            </div>
          </div>

          {/* Game Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Spiel</h3>

            <div className="space-y-2">
              <Label htmlFor="afkGracePeriodSec" className="text-zinc-300">
                AFK-Gnadenfrist (Sekunden)
              </Label>
              <Input
                id="afkGracePeriodSec"
                name="afkGracePeriodSec"
                type="number"
                defaultValue={settings.afkGracePeriodSec}
                required
                min="0"
                className="bg-zinc-800 border-white/10 text-white"
              />
            </div>
          </div>

          {/* Alert Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Alarme</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="alertTransferLimit" className="text-zinc-300">
                  Transfer-Alarm Grenze
                </Label>
                <Input
                  id="alertTransferLimit"
                  name="alertTransferLimit"
                  type="number"
                  defaultValue={settings.alertTransferLimit}
                  required
                  min="0"
                  className="bg-zinc-800 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alertBalanceDropPct" className="text-zinc-300">
                  Guthaben-Verlust Alarm (%)
                </Label>
                <Input
                  id="alertBalanceDropPct"
                  name="alertBalanceDropPct"
                  type="number"
                  defaultValue={settings.alertBalanceDropPct}
                  required
                  min="0"
                  max="100"
                  className="bg-zinc-800 border-white/10 text-white"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-green-500 hover:bg-green-600 text-black font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Speichert...
                </>
              ) : (
                'Einstellungen speichern'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
