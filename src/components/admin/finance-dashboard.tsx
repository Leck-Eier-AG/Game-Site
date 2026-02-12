'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Coins, TrendingUp, Users, Activity } from 'lucide-react'

interface EconomyStats {
  totalCirculation: number
  averageBalance: number
  totalWallets: number
  dailyVolume: Array<{
    date: string
    count: number
    total: number
  }>
  topEarners: Array<{
    userId: string
    displayName: string
    username: string
    balance: number
  }>
  topSpenders: Array<{
    userId: string
    displayName: string
    username: string
    totalSpent: number
  }>
  transactionTypeDistribution: Array<{
    type: string
    count: number
  }>
}

interface FinanceDashboardProps {
  stats: EconomyStats
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE').format(value)
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
  }).format(date)
}

export function FinanceDashboard({ stats }: FinanceDashboardProps) {
  // Calculate daily average from last 7 days
  const recentVolume = stats.dailyVolume.slice(-7)
  const dailyAverage =
    recentVolume.length > 0
      ? Math.round(
          recentVolume.reduce((sum, day) => sum + day.total, 0) /
            recentVolume.length
        )
      : 0

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Gesamtumlauf
            </CardTitle>
            <Coins className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(stats.totalCirculation)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Summe aller Guthaben
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Durchschnittsguthaben
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(stats.averageBalance)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Pro aktivem Nutzer
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Aktive Wallets
            </CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(stats.totalWallets)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Nutzer mit Guthaben
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Tagesdurchschnitt
            </CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(dailyAverage)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Letzte 7 Tage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Volume Chart */}
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              Tägliche Transaktionen (30 Tage)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.dailyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => [formatCurrency(Number(value)), 'Volumen']}
                  labelFormatter={(label) => formatDate(String(label))}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transaction Type Distribution */}
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              Transaktionstypen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.transactionTypeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="type"
                  stroke="#9ca3af"
                  style={{ fontSize: '10px' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => [Number(value), 'Anzahl']}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Earners */}
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Top 5 Verdiener</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topEarners.length === 0 ? (
                <p className="text-zinc-500 text-sm">Keine Daten verfügbar</p>
              ) : (
                stats.topEarners.map((earner, index) => (
                  <div
                    key={earner.userId}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 text-green-500 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {earner.displayName}
                        </div>
                        <div className="text-zinc-500 text-xs">
                          @{earner.username}
                        </div>
                      </div>
                    </div>
                    <div className="text-green-500 font-bold">
                      {formatCurrency(earner.balance)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Spenders */}
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Top 5 Ausgeber</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topSpenders.length === 0 ? (
                <p className="text-zinc-500 text-sm">Keine Daten verfügbar</p>
              ) : (
                stats.topSpenders.map((spender, index) => (
                  <div
                    key={spender.userId}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-500 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {spender.displayName}
                        </div>
                        <div className="text-zinc-500 text-xs">
                          @{spender.username}
                        </div>
                      </div>
                    </div>
                    <div className="text-red-500 font-bold">
                      {formatCurrency(spender.totalSpent)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
