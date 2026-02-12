'use client'

import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipProps,
} from 'recharts'
import type { BalanceHistoryEntry } from '@/lib/wallet/types'

interface BalanceChartProps {
  data: BalanceHistoryEntry[]
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0]
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 shadow-lg">
        <p className="text-xs text-gray-400 mb-1">
          {data.payload?.date && format(new Date(data.payload.date), 'dd.MM.yyyy')}
        </p>
        <p className="text-sm font-bold text-white">
          {new Intl.NumberFormat('de-DE').format(data.value || 0)} Chips
        </p>
      </div>
    )
  }
  return null
}

export function BalanceChart({ data }: BalanceChartProps) {
  // Empty state: need at least 2 data points for a meaningful chart
  if (!data || data.length < 2) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Guthaben-Verlauf (30 Tage)</h3>
        <div className="h-[250px] flex items-center justify-center text-gray-500">
          Noch nicht genug Daten fuer ein Diagramm
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Guthaben-Verlauf (30 Tage)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => format(new Date(date), 'dd.MM')}
            stroke="#71717a"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#71717a"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => new Intl.NumberFormat('de-DE', { notation: 'compact' }).format(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ fill: '#22c55e', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
