import {
  getEconomyStats,
  getSystemSettings,
  getAdminTransactionLog,
  getSuspiciousActivity,
} from '@/lib/actions/admin-finance'
import { requireAdmin } from '@/lib/auth/dal'
import { FinanceDashboard } from '@/components/admin/finance-dashboard'
import { TransactionLog } from '@/components/admin/transaction-log'
import { EconomicSettings } from '@/components/admin/economic-settings'
import { BalanceAdjust } from '@/components/admin/balance-adjust'
import { AlertMonitor } from '@/components/admin/alert-monitor'
import { Coins } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function AdminFinancePage() {
  await requireAdmin()

  // Fetch initial data in parallel
  const [stats, settings, transactionLog, alerts] = await Promise.all([
    getEconomyStats(),
    getSystemSettings(),
    getAdminTransactionLog({ limit: 50 }),
    getSuspiciousActivity(),
  ])

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Coins className="h-8 w-8 text-green-500" />
          <div>
            <h1 className="text-3xl font-bold text-white">Finanzverwaltung</h1>
            <p className="text-zinc-400 mt-1">
              Wirtschaftskontrolle, Transaktionsverlauf und Systemeinstellungen
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full max-w-4xl grid-cols-5 bg-zinc-900 border border-white/10">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="transactions">Transaktionen</TabsTrigger>
            <TabsTrigger value="balance">Guthaben</TabsTrigger>
            <TabsTrigger value="alerts" className="relative">
              Alarme
              {alerts.length > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {alerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">Einstellungen</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <FinanceDashboard stats={stats} />
          </TabsContent>

          <TabsContent value="transactions" className="mt-6">
            <TransactionLog initialData={transactionLog} />
          </TabsContent>

          <TabsContent value="balance" className="mt-6">
            <BalanceAdjust />
          </TabsContent>

          <TabsContent value="alerts" className="mt-6">
            <AlertMonitor />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <EconomicSettings settings={settings} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
