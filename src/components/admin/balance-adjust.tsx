'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import {
  adjustUserBalance,
  bulkAdjustBalance,
  getUsersWithWallets,
  freezeWallet,
  unfreezeWallet,
} from '@/lib/actions/admin-finance'
import { toast } from 'sonner'
import { Search, Plus, Minus, Snowflake, Unlock, AlertTriangle } from 'lucide-react'
import { useSocket } from '@/lib/socket/provider'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

interface UserWithWallet {
  userId: string
  displayName: string
  username: string
  email: string
  balance: number
  frozenAt: Date | null
}

export function BalanceAdjust() {
  const { socket } = useSocket()

  // Single adjustment state
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<UserWithWallet[]>([])
  const [selectedUser, setSelectedUser] = useState<UserWithWallet | null>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [searchPending, setSearchPending] = useState(false)
  const [singleAdjustState, singleAdjustAction, singleAdjustPending] = useActionState(
    adjustUserBalance,
    undefined
  )

  // Bulk adjustment state
  const [bulkMode, setBulkMode] = useState<'selected' | 'all'>('selected')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [bulkAmount, setBulkAmount] = useState('')
  const [bulkReason, setBulkReason] = useState('')
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkAdjustState, bulkAdjustAction, bulkAdjustPending] = useActionState(
    bulkAdjustBalance,
    undefined
  )

  // Freeze state
  const [freezePending, setFreezePending] = useState(false)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length >= 2) {
        handleSearch()
      } else if (search.length === 0) {
        setUsers([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  const handleSearch = async () => {
    setSearchPending(true)
    try {
      const results = await getUsersWithWallets(search)
      setUsers(results)
    } catch (error) {
      toast.error('Fehler beim Suchen')
    } finally {
      setSearchPending(false)
    }
  }

  // Handle single adjustment result
  useEffect(() => {
    if (singleAdjustState?.success) {
      toast.success(`Guthaben angepasst: ${singleAdjustState.newBalance}`)

      // Emit socket event to notify affected user
      if (socket && singleAdjustState.userId) {
        socket.emit('admin:balance-adjusted', { userId: singleAdjustState.userId })
      }

      // Reset form
      setAmount('')
      setReason('')
      setSelectedUser(null)
      setSearch('')
      setUsers([])
    } else if (singleAdjustState?.error) {
      toast.error(singleAdjustState.error)
    }
  }, [singleAdjustState, socket])

  // Handle bulk adjustment result
  useEffect(() => {
    if (bulkAdjustState?.success) {
      toast.success(`${bulkAdjustState.affected} Nutzer angepasst`)

      // Emit socket events for all affected users
      if (socket && bulkAdjustState.affectedUserIds) {
        for (const userId of bulkAdjustState.affectedUserIds) {
          socket.emit('admin:balance-adjusted', { userId })
        }
      }

      // Reset form
      setBulkAmount('')
      setBulkReason('')
      setSelectedUserIds([])
    } else if (bulkAdjustState?.error) {
      toast.error(bulkAdjustState.error)
    }
  }, [bulkAdjustState, socket])

  const handleFreeze = async () => {
    if (!selectedUser) return
    setFreezePending(true)
    try {
      const result = await freezeWallet(selectedUser.userId)
      if (result.success) {
        toast.success('Wallet eingefroren')
        setSelectedUser({ ...selectedUser, frozenAt: new Date() })
      } else {
        toast.error(result.error || 'Fehler beim Einfrieren')
      }
    } catch (error) {
      toast.error('Fehler beim Einfrieren')
    } finally {
      setFreezePending(false)
    }
  }

  const handleUnfreeze = async () => {
    if (!selectedUser) return
    setFreezePending(true)
    try {
      const result = await unfreezeWallet(selectedUser.userId)
      if (result.success) {
        toast.success('Wallet freigegeben')
        setSelectedUser({ ...selectedUser, frozenAt: null })
      } else {
        toast.error(result.error || 'Fehler beim Freigeben')
      }
    } catch (error) {
      toast.error('Fehler beim Freigeben')
    } finally {
      setFreezePending(false)
    }
  }

  const handleBulkSubmit = () => {
    if (bulkMode === 'all' || selectedUserIds.length > 0) {
      setBulkConfirmOpen(true)
    }
  }

  const confirmBulkAdjust = () => {
    const formData = new FormData()
    formData.append('userIds', bulkMode === 'all' ? 'all' : JSON.stringify(selectedUserIds))
    formData.append('amount', bulkAmount)
    formData.append('reason', bulkReason)
    bulkAdjustAction(formData)
    setBulkConfirmOpen(false)
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  return (
    <div className="space-y-6">
      {/* Single Adjustment */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Einzelne Anpassung</CardTitle>
          <CardDescription>Guthaben eines Nutzers anpassen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-zinc-300">
              Nutzer suchen
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                id="search"
                placeholder="Name, Nutzername oder E-Mail"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white pl-10"
              />
            </div>
          </div>

          {/* Search Results */}
          {users.length > 0 && !selectedUser && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {users.map((user) => (
                <button
                  key={user.userId}
                  onClick={() => {
                    setSelectedUser(user)
                    setUsers([])
                  }}
                  className="w-full text-left p-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{user.displayName}</p>
                      <p className="text-sm text-zinc-400">@{user.username}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-mono">{user.balance}</p>
                      {user.frozenAt && (
                        <Badge variant="secondary" className="mt-1">
                          <Snowflake className="h-3 w-3 mr-1" />
                          Eingefroren
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected User Card */}
          {selectedUser && (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-medium text-lg">
                        {selectedUser.displayName}
                      </p>
                      <p className="text-sm text-zinc-400">@{selectedUser.username}</p>
                      <p className="text-sm text-zinc-500 mt-1">{selectedUser.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-400">Aktuelles Guthaben</p>
                      <p className="text-2xl font-bold text-white font-mono">
                        {selectedUser.balance}
                      </p>
                    </div>
                  </div>

                  {/* Freeze Status */}
                  {selectedUser.frozenAt && (
                    <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <Snowflake className="h-4 w-4 text-amber-500" />
                      <div className="flex-1">
                        <p className="text-amber-200 text-sm font-medium">
                          Wallet eingefroren
                        </p>
                        <p className="text-amber-300/70 text-xs">
                          {formatDistanceToNow(new Date(selectedUser.frozenAt), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Freeze Actions */}
                  <div className="flex gap-2">
                    {selectedUser.frozenAt ? (
                      <Button
                        type="button"
                        onClick={handleUnfreeze}
                        disabled={freezePending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Unlock className="h-4 w-4 mr-2" />
                        Guthaben freigeben
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleFreeze}
                        disabled={freezePending}
                        variant="outline"
                        className="flex-1 border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                      >
                        <Snowflake className="h-4 w-4 mr-2" />
                        Guthaben einfrieren
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-zinc-500 flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>
                      Eingefrorene Nutzer können spielen aber nicht wetten oder überweisen
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Adjustment Form */}
          {selectedUser && (
            <form
              action={(formData) => {
                formData.append('userId', selectedUser.userId)
                singleAdjustAction(formData)
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-zinc-300">
                  Betrag
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setAmount((prev) => String(-(Math.abs(Number(prev) || 0))))}
                    className="border-zinc-700 hover:bg-zinc-800"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white flex-1"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setAmount((prev) => String(Math.abs(Number(prev) || 0)))}
                    className="border-zinc-700 hover:bg-zinc-800"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-zinc-500">
                  Positiv = Gutschrift, Negativ = Abbuchung
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason" className="text-zinc-300">
                  Grund (optional)
                </Label>
                <Textarea
                  id="reason"
                  name="reason"
                  placeholder="Warum wird das Guthaben angepasst?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(null)
                    setAmount('')
                    setReason('')
                  }}
                  className="border-zinc-700 hover:bg-zinc-800"
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={singleAdjustPending || !amount}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Guthaben anpassen
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Bulk Adjustment */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Massenanpassung</CardTitle>
          <CardDescription>
            Mehrere Nutzer oder alle Nutzer gleichzeitig anpassen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Modus</Label>
            <Select
              value={bulkMode}
              onValueChange={(value: 'selected' | 'all') => {
                setBulkMode(value)
                setSelectedUserIds([])
              }}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="selected">Ausgewählte Nutzer</SelectItem>
                <SelectItem value="all">Alle Nutzer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User Selection (selected mode) */}
          {bulkMode === 'selected' && (
            <div className="space-y-2">
              <Label className="text-zinc-300">Nutzer auswählen</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Name, Nutzername oder E-Mail"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white pl-10"
                />
              </div>

              {/* Selection List */}
              {users.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {users.map((user) => (
                    <button
                      key={user.userId}
                      type="button"
                      onClick={() => toggleUserSelection(user.userId)}
                      className={`w-full text-left p-3 border rounded-lg transition-colors ${
                        selectedUserIds.includes(user.userId)
                          ? 'bg-green-600/20 border-green-500'
                          : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{user.displayName}</p>
                          <p className="text-sm text-zinc-400">@{user.username}</p>
                        </div>
                        <p className="text-white font-mono">{user.balance}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedUserIds.length > 0 && (
                <p className="text-sm text-green-400">
                  {selectedUserIds.length} Nutzer ausgewählt
                </p>
              )}
            </div>
          )}

          {/* All Users Warning */}
          {bulkMode === 'all' && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-200 font-medium">Achtung!</p>
                <p className="text-amber-300/70 text-sm">
                  Änderung wird auf alle Nutzer angewendet
                </p>
              </div>
            </div>
          )}

          {/* Bulk Adjustment Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulkAmount" className="text-zinc-300">
                Betrag
              </Label>
              <Input
                id="bulkAmount"
                type="number"
                placeholder="0"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulkReason" className="text-zinc-300">
                Grund (optional)
              </Label>
              <Textarea
                id="bulkReason"
                placeholder="Warum wird das Guthaben angepasst?"
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={3}
              />
            </div>

            <Button
              type="button"
              onClick={handleBulkSubmit}
              disabled={
                bulkAdjustPending ||
                !bulkAmount ||
                (bulkMode === 'selected' && selectedUserIds.length === 0)
              }
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              Massenanpassung durchführen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Massenanpassung bestätigen
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkMode === 'all'
                ? 'Alle Nutzer werden angepasst.'
                : `${selectedUserIds.length} Nutzer werden angepasst.`}
              <br />
              Betrag: <span className="font-mono font-bold">{bulkAmount}</span>
              <br />
              {bulkReason && (
                <>
                  Grund: <span className="italic">{bulkReason}</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkAdjust}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Bestätigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
