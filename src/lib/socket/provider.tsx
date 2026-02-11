'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'
import { getSocket } from './client'

interface SocketContextValue {
  socket: Socket | null
  isConnected: boolean
  userId: string | null
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  userId: null,
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

  useEffect(() => {
    // Get the singleton socket instance
    const socket = getSocket()
    socketRef.current = socket

    // Event handlers
    const onConnect = () => {
      console.log('Socket.IO connected')
      setIsConnected(true)
      socket.emit('request-state')
    }

    const onDisconnect = () => {
      console.log('Socket.IO disconnected')
      setIsConnected(false)
    }

    const onReconnect = (attemptNumber: number) => {
      console.log('Socket.IO reconnected after', attemptNumber, 'attempts')
    }

    const onReconnectAttempt = (attemptNumber: number) => {
      console.log('Socket.IO reconnection attempt', attemptNumber)
    }

    const onConnectError = (error: Error) => {
      console.error('Socket.IO connection error:', error.message)
    }

    // Register event handlers
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('reconnect', onReconnect)
    socket.on('reconnect_attempt', onReconnectAttempt)
    socket.on('connect_error', onConnectError)

    // If already connected (singleton shared across routes), sync state
    if (socket.connected) {
      setIsConnected(true)
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
    }
  }, [])

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        userId,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
