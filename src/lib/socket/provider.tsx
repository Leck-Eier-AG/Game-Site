'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'
import { getSocket } from './client'

interface BalanceChange {
  amount: number
  timestamp: number
}

interface SocketContextValue {
  socket: Socket | null
  isConnected: boolean
  userId: string | null
  balance: number | null
  balanceChange: BalanceChange | null
  fetchBalance: () => void
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  userId: null,
  balance: null,
  balanceChange: null,
  fetchBalance: () => {},
})

export function useSocket() {
  return useContext(SocketContext)
}

interface SocketProviderProps {
  children: React.ReactNode
  userId: string
}

export function SocketProvider({ children, userId }: SocketProviderProps) {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [balanceChange, setBalanceChange] = useState<BalanceChange | null>(null)

  // Function to fetch balance from server
  const fetchBalance = useCallback(() => {
    const socket = socketRef.current
    if (!socket) return

    socket.emit('wallet:get-balance', (response: any) => {
      if (response?.success) {
        setBalance(response.balance)
      }
    })
  }, [])

  useEffect(() => {
    // Get the singleton socket instance
    const socket = getSocket()
    socketRef.current = socket

    // Event handlers
    const onConnect = () => {
      console.log('Socket.IO connected')
      setIsConnected(true)
      socket.emit('request-state')
      // Fetch balance on connect
      fetchBalance()
    }

    const onDisconnect = () => {
      console.log('Socket.IO disconnected')
      setIsConnected(false)
    }

    const onReconnect = (attemptNumber: number) => {
      console.log('Socket.IO reconnected after', attemptNumber, 'attempts')
      fetchBalance()
    }

    const onReconnectAttempt = (attemptNumber: number) => {
      console.log('Socket.IO reconnection attempt', attemptNumber)
    }

    const onConnectError = (error: Error) => {
      console.error('Socket.IO connection error:', error.message)
    }

    const onBalanceUpdated = (data: { newBalance?: number; balance?: number; change?: number; description?: string }) => {
      // Accept both { newBalance } (emitBalanceUpdate) and { balance } (legacy) formats
      const newBal = data.newBalance ?? data.balance
      if (newBal == null) return

      setBalance(newBal)
      if (data.change != null) {
        setBalanceChange({ amount: data.change, timestamp: Date.now() })
        setTimeout(() => setBalanceChange(null), 1000)
      }
    }

    // Register event handlers
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('reconnect', onReconnect)
    socket.on('reconnect_attempt', onReconnectAttempt)
    socket.on('connect_error', onConnectError)
    socket.on('balance:updated', onBalanceUpdated)

    // If already connected (singleton shared across routes), sync state
    if (socket.connected) {
      setIsConnected(true)
      fetchBalance()
    } else {
      socket.connect()
    }

    // Cleanup: unregister handlers but do NOT disconnect the singleton socket
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('reconnect', onReconnect)
      socket.off('reconnect_attempt', onReconnectAttempt)
      socket.off('connect_error', onConnectError)
      socket.off('balance:updated', onBalanceUpdated)
    }
  }, [])

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        userId,
        balance,
        balanceChange,
        fetchBalance,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
