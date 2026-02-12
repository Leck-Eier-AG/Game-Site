'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getSuspiciousActivity } from '@/lib/actions/admin-finance'
import { AlertTriangle, Shield, CheckCircle2, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { Button } from '@/components/ui/button'

interface SuspiciousAlert {
  type: 'large_transfer' | 'daily_limit' | 'balance_drop'
  severity: 'warning' | 'critical'
  userId: string
  displayName: string
  details: string
  timestamp: Date
}

export function AlertMonitor() {
  const [alerts, setAlerts] = useState<SuspiciousAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAlerts = async () => {
    try {
      const data = await getSuspiciousActivity()
      setAlerts(data)
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAlerts()

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchAlerts, 60000)

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAlerts()
  }

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'large_transfer':
        return 'Große Überweisung'
      case 'daily_limit':
        return 'Tageslimit überschritten'
      case 'balance_drop':
        return 'Schneller Guthaben-Verlust'
      default:
        return type
    }
  }

  const getAlertIcon = (severity: string) => {
    if (severity === 'critical') {
      return <Shield className="h-5 w-5 text-red-500" />
    }
    return <AlertTriangle className="h-5 w-5 text-amber-500" />
  }

  const getAlertBorderColor = (severity: string) => {
    return severity === 'critical' ? 'border-red-500/50' : 'border-amber-500/50'
  }

  const getAlertBgColor = (severity: string) => {
    return severity === 'critical' ? 'bg-red-500/10' : 'bg-amber-500/10'
  }

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 text-zinc-500 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Verdächtige Aktivitäten</h3>
          <p className="text-sm text-zinc-400">
            Automatische Erkennung ungewöhnlicher Transaktionen
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="border-zinc-700 hover:bg-zinc-800"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Alerts */}
      {alerts.length === 0 ? (
        <Card className="bg-green-600/10 border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-green-200 font-medium text-lg">
                  Keine verdächtigen Aktivitäten
                </p>
                <p className="text-green-300/70 text-sm">
                  Alle Transaktionen im normalen Bereich
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {alerts.map((alert, index) => (
            <Card
              key={index}
              className={`${getAlertBgColor(alert.severity)} border ${getAlertBorderColor(
                alert.severity
              )}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className={`font-semibold ${
                          alert.severity === 'critical' ? 'text-red-200' : 'text-amber-200'
                        }`}
                      >
                        {getAlertTypeLabel(alert.type)}
                      </h4>
                      <Badge
                        variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {alert.severity === 'critical' ? 'Kritisch' : 'Warnung'}
                      </Badge>
                    </div>
                    <p
                      className={`text-sm mb-2 ${
                        alert.severity === 'critical'
                          ? 'text-red-300/90'
                          : 'text-amber-300/90'
                      }`}
                    >
                      <span className="font-medium">{alert.displayName}</span>
                    </p>
                    <p
                      className={`text-sm ${
                        alert.severity === 'critical'
                          ? 'text-red-300/70'
                          : 'text-amber-300/70'
                      }`}
                    >
                      {alert.details}
                    </p>
                    <p
                      className={`text-xs mt-2 ${
                        alert.severity === 'critical'
                          ? 'text-red-400/50'
                          : 'text-amber-400/50'
                      }`}
                    >
                      {formatDistanceToNow(new Date(alert.timestamp), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Legend */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-300">Alarm-Typen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-zinc-300 font-medium">Große Überweisung</p>
              <p className="text-zinc-500 text-xs">
                Einzeltransfer über Alarm-Limit (konfigurierbar in Einstellungen)
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-zinc-300 font-medium">Tageslimit überschritten</p>
              <p className="text-zinc-500 text-xs">
                Gesamtsumme aller Transfers heute über Tageslimit
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-zinc-300 font-medium">Schneller Guthaben-Verlust</p>
              <p className="text-zinc-500 text-xs">
                Guthaben in letzter Stunde um mehr als konfigurierten Prozentsatz gesunken
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
