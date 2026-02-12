'use client'

import { useState } from 'react'
import { getAdminTransactionLog } from '@/lib/actions/admin-finance'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface Transaction {
  id: string
  userId: string
  type: string
  amount: number
  description: string | null
  createdAt: Date
  user: {
    id: string
    displayName: string
    username: string
  }
  relatedUser: {
    id: string
    displayName: string
    username: string
  } | null
}

interface TransactionLogProps {
  initialData: {
    transactions: Transaction[]
    nextCursor: string | null
  }
}

const TRANSACTION_TYPES = [
  'INITIAL',
  'DAILY_CLAIM',
  'WEEKLY_BONUS',
  'GAME_WIN',
  'BET_PLACED',
  'BET_REFUND',
  'BET_FORFEIT',
  'TRANSFER_SENT',
  'TRANSFER_RECEIVED',
  'ADMIN_CREDIT',
  'ADMIN_DEBIT',
]

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    signDisplay: 'always',
  }).format(value)
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

const translateType = (type: string): string => {
  const translations: Record<string, string> = {
    INITIAL: 'Startguthaben',
    DAILY_CLAIM: 'Tägliches Guthaben',
    WEEKLY_BONUS: 'Wochenbonus',
    GAME_WIN: 'Spielgewinn',
    BET_PLACED: 'Wette platziert',
    BET_REFUND: 'Wettrückzahlung',
    BET_FORFEIT: 'Wette verfallen',
    TRANSFER_SENT: 'Transfer gesendet',
    TRANSFER_RECEIVED: 'Transfer erhalten',
    ADMIN_CREDIT: 'Admin Gutschrift',
    ADMIN_DEBIT: 'Admin Abbuchung',
  }
  return translations[type] || type
}

export function TransactionLog({ initialData }: TransactionLogProps) {
  const [transactions, setTransactions] = useState(initialData.transactions)
  const [nextCursor, setNextCursor] = useState(initialData.nextCursor)
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>('')
  const [filterUserId, setFilterUserId] = useState('')

  const loadMore = async () => {
    if (!nextCursor || loading) return

    setLoading(true)
    try {
      const result = await getAdminTransactionLog({
        type: filterType || undefined,
        userId: filterUserId || undefined,
        cursor: nextCursor,
        limit: 50,
      })

      setTransactions((prev) => [...prev, ...result.transactions])
      setNextCursor(result.nextCursor)
    } catch (error) {
      console.error('Failed to load more transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = async () => {
    setLoading(true)
    try {
      const result = await getAdminTransactionLog({
        type: filterType || undefined,
        userId: filterUserId || undefined,
        limit: 50,
      })

      setTransactions(result.transactions)
      setNextCursor(result.nextCursor)
    } catch (error) {
      console.error('Failed to apply filters:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = async () => {
    setFilterType('')
    setFilterUserId('')
    setLoading(true)
    try {
      const result = await getAdminTransactionLog({ limit: 50 })
      setTransactions(result.transactions)
      setNextCursor(result.nextCursor)
    } catch (error) {
      console.error('Failed to reset filters:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-zinc-900 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Transaktionsverlauf</CardTitle>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mt-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full md:w-[200px] bg-zinc-800 border-white/10 text-white">
              <SelectValue placeholder="Alle Typen" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-white/10">
              <SelectItem value="__all__" className="text-white">
                Alle Typen
              </SelectItem>
              {TRANSACTION_TYPES.map((type) => (
                <SelectItem key={type} value={type} className="text-white">
                  {translateType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Nutzer-ID suchen..."
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="w-full md:w-[250px] bg-zinc-800 border-white/10 text-white placeholder:text-zinc-500"
          />

          <div className="flex gap-2">
            <Button
              onClick={applyFilters}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-black"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Filter'
              )}
            </Button>
            <Button
              onClick={resetFilters}
              disabled={loading}
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-white"
            >
              Zurücksetzen
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-zinc-400">Datum</TableHead>
                <TableHead className="text-zinc-400">Typ</TableHead>
                <TableHead className="text-zinc-400">Nutzer</TableHead>
                <TableHead className="text-zinc-400 text-right">Betrag</TableHead>
                <TableHead className="text-zinc-400">Beschreibung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    className="text-center text-zinc-500 py-8"
                  >
                    Keine Transaktionen gefunden
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow
                    key={transaction.id}
                    className="border-white/10 hover:bg-white/5"
                  >
                    <TableCell className="text-white">
                      {formatDate(transaction.createdAt)}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                        {translateType(transaction.type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-white">
                      <div>
                        <div className="font-medium">
                          {transaction.user.displayName}
                        </div>
                        <div className="text-xs text-zinc-500">
                          @{transaction.user.username}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono font-bold ${
                        transaction.amount > 0
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}
                    >
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {transaction.description || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Load More Button */}
        {nextCursor && (
          <div className="mt-6 flex justify-center">
            <Button
              onClick={loadMore}
              disabled={loading}
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Lädt...
                </>
              ) : (
                'Mehr laden'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
