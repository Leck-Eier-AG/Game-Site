'use client'

import { useState, useEffect, useRef, useActionState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Send } from 'lucide-react'
import { transferFunds, searchUsers } from '@/lib/actions/wallet'
import { useSocket } from '@/lib/socket/provider'
import { toast } from 'sonner'

interface TransferFormProps {
  prefillRecipientId?: string
  prefillRecipientName?: string
  onSuccess?: () => void
  maxAmount?: number
  dailyLimit?: number
  currencyName?: string
  isFrozen?: boolean
}

interface User {
  id: string
  username: string
  displayName: string
}

export function TransferForm({
  prefillRecipientId,
  prefillRecipientName,
  onSuccess,
  maxAmount = 10000,
  dailyLimit = 50000,
  currencyName = 'Chips',
  isFrozen = false,
}: TransferFormProps) {
  const [recipientQuery, setRecipientQuery] = useState(prefillRecipientName || '')
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(
    prefillRecipientId && prefillRecipientName
      ? { id: prefillRecipientId, username: '', displayName: prefillRecipientName }
      : null
  )
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [amount, setAmount] = useState('')
  const { socket, fetchBalance } = useSocket()

  const [state, formAction, isPending] = useActionState(transferFunds, undefined)

  // Stable refs for callbacks to avoid re-triggering the state effect
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess
  const fetchBalanceRef = useRef(fetchBalance)
  fetchBalanceRef.current = fetchBalance

  // Debounced user search
  useEffect(() => {
    if (prefillRecipientId) return // Skip search if pre-filled

    if (recipientQuery.length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchUsers(recipientQuery)
        setSearchResults(results)
        setShowDropdown(results.length > 0)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [recipientQuery, prefillRecipientId])

  // Handle form state updates
  useEffect(() => {
    if (state?.success) {
      toast.success('Transfer erfolgreich!')
      // Notify recipient via socket
      if (socket && state?.transactionId && state?.toUserId && state?.amount != null) {
        socket.emit('wallet:transfer-complete', {
          transactionId: state.transactionId,
          toUserId: state.toUserId,
          amount: state.amount,
        })
      }
      // Reset form
      if (!prefillRecipientId) {
        setRecipientQuery('')
        setSelectedRecipient(null)
      }
      setAmount('')
      // Update sidebar balance
      fetchBalanceRef.current()
      // Call success callback (for dialog close)
      onSuccessRef.current?.()
    } else if (state?.error) {
      toast.error(state.error)
    }
  }, [state, prefillRecipientId])

  const handleSelectRecipient = (user: User) => {
    setSelectedRecipient(user)
    setRecipientQuery(user.displayName)
    setShowDropdown(false)
  }

  const handleSubmit = (formData: FormData) => {
    if (!selectedRecipient) {
      toast.error('Bitte wähle einen Empfänger aus')
      return
    }

    // Add recipient ID to form data
    formData.set('toUserId', selectedRecipient.id)
    formAction(formData)
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Send className="h-5 w-5 text-blue-500" />
        Chips senden
      </h3>

      {isFrozen && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-400">
            Dein Wallet ist gesperrt. Transfers sind nicht möglich.
          </p>
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        {/* Recipient field */}
        {!prefillRecipientId && (
          <div className="relative">
            <Label htmlFor="recipient">Empfänger</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="recipient"
                type="text"
                placeholder="Benutzername suchen..."
                value={recipientQuery}
                onChange={(e) => {
                  setRecipientQuery(e.target.value)
                  setSelectedRecipient(null)
                }}
                onFocus={() => setShowDropdown(searchResults.length > 0)}
                className="pl-10"
                disabled={isFrozen}
              />
            </div>

            {/* Search dropdown */}
            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="p-3 text-sm text-gray-400 text-center">Suche...</div>
                ) : (
                  searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectRecipient(user)}
                      className="w-full px-4 py-3 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-b-0"
                    >
                      <p className="text-sm font-semibold text-white">{user.displayName}</p>
                      <p className="text-xs text-gray-400">@{user.username}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Pre-filled recipient display */}
        {prefillRecipientId && (
          <div>
            <Label>Empfänger</Label>
            <div className="mt-1 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <p className="text-sm font-semibold text-white">{prefillRecipientName}</p>
            </div>
          </div>
        )}

        {/* Amount field */}
        <div>
          <Label htmlFor="amount">Betrag</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min="1"
            max={maxAmount}
            placeholder="Betrag eingeben..."
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isFrozen || isPending}
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Max. {new Intl.NumberFormat('de-DE').format(maxAmount)} pro Transfer,{' '}
            {new Intl.NumberFormat('de-DE').format(dailyLimit)} pro Tag
          </p>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          disabled={!selectedRecipient || !amount || isFrozen || isPending}
          className="w-full"
          size="lg"
        >
          {isPending ? 'Sende...' : 'Chips senden'}
        </Button>
      </form>
    </Card>
  )
}
