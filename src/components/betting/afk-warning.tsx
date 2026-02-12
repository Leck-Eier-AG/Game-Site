'use client'

import { useState, useEffect } from 'react'
import { useSocket } from '@/lib/socket/provider'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'

export function AfkWarning() {
  const { socket } = useSocket()
  const [warning, setWarning] = useState<{
    roomId: string
    countdown: number
    message: string
  } | null>(null)

  useEffect(() => {
    if (!socket) return

    const handleAfkWarning = (data: {
      roomId: string
      gracePeriodSec: number
      message: string
    }) => {
      setWarning({
        roomId: data.roomId,
        countdown: data.gracePeriodSec,
        message: data.message,
      })
      toast.error('Inaktivitaet erkannt!', {
        description: data.message,
        duration: data.gracePeriodSec * 1000,
      })
    }

    const handleAfkWarningCancel = () => {
      setWarning(null)
      toast.success('Warnung aufgehoben', {
        description: 'Deine Aktivitaet wurde erkannt.',
        duration: 2000,
      })
    }

    socket.on('bet:afk-warning', handleAfkWarning)
    socket.on('bet:afk-warning-cancel', handleAfkWarningCancel)

    return () => {
      socket.off('bet:afk-warning', handleAfkWarning)
      socket.off('bet:afk-warning-cancel', handleAfkWarningCancel)
    }
  }, [socket])

  // Countdown timer
  useEffect(() => {
    if (!warning) return

    const interval = setInterval(() => {
      setWarning((prev) => {
        if (!prev || prev.countdown <= 1) {
          return null
        }
        return { ...prev, countdown: prev.countdown - 1 }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [warning])

  const handleAcknowledge = () => {
    if (!socket || !warning) return
    // Any action cancels the warning - just emit a dummy event or take a game action
    // The server cancels the warning when detecting activity
    socket.emit('bet:afk-acknowledge', { roomId: warning.roomId })
    setWarning(null)
  }

  if (!warning) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-pulse">
      <div className="bg-red-600 border-2 border-red-400 rounded-lg shadow-2xl p-4 min-w-[400px]">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-white" />
          <div className="flex-1">
            <p className="text-white font-bold text-lg">Inaktivitaet erkannt!</p>
            <p className="text-white text-sm">
              Dein Einsatz verfaellt in{' '}
              <span className="font-bold text-xl">{warning.countdown}</span> Sekunden.
            </p>
          </div>
          <Button
            onClick={handleAcknowledge}
            className="bg-white text-red-600 hover:bg-gray-200 font-bold"
          >
            Ich bin da!
          </Button>
        </div>
      </div>
    </div>
  )
}
