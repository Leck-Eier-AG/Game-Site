'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  Dice5,
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  Star,
  Shield,
  Trophy,
  Ban,
} from 'lucide-react'
import { TransactionType } from '@prisma/client'
import type { TransactionWithDetails } from '@/lib/wallet/types'
import { getTransactions } from '@/lib/actions/wallet'

interface TransactionListProps {
  initialTransactions: TransactionWithDetails[]
}

type FilterType = 'all' | 'gains' | 'losses' | 'transfers' | 'admin'

const FILTER_CONFIG: Record<
  FilterType,
  { label: string; types?: TransactionType[] }
> = {
  all: { label: 'Alle' },
  gains: {
    label: 'Gewinne',
    types: [
      TransactionType.GAME_WIN,
      TransactionType.DAILY_CLAIM,
      TransactionType.WEEKLY_BONUS,
      TransactionType.TRANSFER_RECEIVED,
      TransactionType.ADMIN_CREDIT,
    ],
  },
  losses: {
    label: 'Verluste',
    types: [
      TransactionType.BET_PLACED,
      TransactionType.BET_FORFEIT,
      TransactionType.TRANSFER_SENT,
      TransactionType.ADMIN_DEBIT,
    ],
  },
  transfers: {
    label: 'Transfers',
    types: [TransactionType.TRANSFER_SENT, TransactionType.TRANSFER_RECEIVED],
  },
  admin: {
    label: 'Admin',
    types: [TransactionType.ADMIN_CREDIT, TransactionType.ADMIN_DEBIT],
  },
}

function getTransactionIcon(type: TransactionType) {
  switch (type) {
    case TransactionType.GAME_WIN:
      return <Trophy className="h-4 w-4 text-yellow-500" />
    case TransactionType.BET_PLACED:
    case TransactionType.BET_FORFEIT:
      return <Dice5 className="h-4 w-4 text-blue-500" />
    case TransactionType.TRANSFER_SENT:
      return <ArrowUpRight className="h-4 w-4 text-orange-500" />
    case TransactionType.TRANSFER_RECEIVED:
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />
    case TransactionType.DAILY_CLAIM:
      return <Gift className="h-4 w-4 text-green-500" />
    case TransactionType.WEEKLY_BONUS:
      return <Star className="h-4 w-4 text-yellow-500" />
    case TransactionType.ADMIN_CREDIT:
    case TransactionType.ADMIN_DEBIT:
      return <Shield className="h-4 w-4 text-purple-500" />
    default:
      return <Ban className="h-4 w-4 text-gray-500" />
  }
}

function formatTransactionTime(date: Date): string {
  if (isToday(date)) {
    return formatDistanceToNow(date, { addSuffix: true, locale: de })
  }
  return format(date, 'HH:mm', { locale: de })
}

function groupTransactionsByDay(transactions: TransactionWithDetails[]) {
  const groups = new Map<string, TransactionWithDetails[]>()

  for (const transaction of transactions) {
    const date = new Date(transaction.createdAt)
    let dayKey: string

    if (isToday(date)) {
      dayKey = 'Heute'
    } else if (isYesterday(date)) {
      dayKey = 'Gestern'
    } else {
      dayKey = format(date, 'd. MMMM yyyy', { locale: de })
    }

    if (!groups.has(dayKey)) {
      groups.set(dayKey, [])
    }
    groups.get(dayKey)!.push(transaction)
  }

  return Array.from(groups.entries())
}

export function TransactionList({ initialTransactions }: TransactionListProps) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [filter, setFilter] = useState<FilterType>('all')
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Filter transactions based on selected filter
  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactions

    const allowedTypes = FILTER_CONFIG[filter].types
    if (!allowedTypes) return transactions

    return transactions.filter((tx) => allowedTypes.includes(tx.type))
  }, [transactions, filter])

  // Group filtered transactions by day
  const groupedTransactions = useMemo(
    () => groupTransactionsByDay(filteredTransactions),
    [filteredTransactions]
  )

  const handleLoadMore = async () => {
    if (transactions.length === 0) return

    setIsLoadingMore(true)
    try {
      const lastTransaction = transactions[transactions.length - 1]
      const moreTransactions = await getTransactions({
        cursor: lastTransaction.createdAt.toISOString(),
        limit: 50,
      })

      if (moreTransactions.length > 0) {
        setTransactions([...transactions, ...moreTransactions])
      }
    } catch (error) {
      console.error('Failed to load more transactions:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Transaktionen</h3>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="mb-4">
        <TabsList className="w-full">
          {Object.entries(FILTER_CONFIG).map(([key, { label }]) => (
            <TabsTrigger key={key} value={key} className="flex-1">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Transaction list */}
      <div className="space-y-6 max-h-[600px] overflow-y-auto">
        {groupedTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Keine Transaktionen gefunden</p>
            {filter !== 'all' && (
              <p className="text-sm mt-2">Versuche einen anderen Filter</p>
            )}
          </div>
        ) : (
          groupedTransactions.map(([day, dayTransactions]) => (
            <div key={day}>
              <h4 className="text-sm font-semibold text-gray-400 mb-2 sticky top-0 bg-zinc-900 py-1">
                {day}
              </h4>
              <div className="space-y-2">
                {dayTransactions.map((transaction) => {
                  const creditTypes: TransactionType[] = [
                    TransactionType.INITIAL,
                    TransactionType.DAILY_CLAIM,
                    TransactionType.WEEKLY_BONUS,
                    TransactionType.GAME_WIN,
                    TransactionType.TRANSFER_RECEIVED,
                    TransactionType.ADMIN_CREDIT,
                    TransactionType.BET_REFUND,
                  ]
                  const isCredit = creditTypes.includes(transaction.type)
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTransactionTime(new Date(transaction.createdAt))}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <span
                          className={`text-sm font-semibold ${
                            isCredit ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                          {new Intl.NumberFormat('de-DE').format(transaction.amount)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load more button */}
      {transactions.length >= 50 && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <Button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            variant="outline"
            className="w-full"
          >
            {isLoadingMore ? 'Lädt...' : 'Mehr laden'}
          </Button>
        </div>
      )}
    </Card>
  )
}
