'use client'

import { Button } from '@/components/ui/button'
import { Gamepad2, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface LobbyHeaderProps {
  roomCount: number
  onCreateRoom: () => void
  isConnected: boolean
}

export function LobbyHeader({ roomCount, onCreateRoom, isConnected }: LobbyHeaderProps) {
  const t = useTranslations()

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-green-500/10 rounded-xl">
          <Gamepad2 className="h-8 w-8 text-green-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">
            {t('lobby.title')}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {isConnected ? (
              <>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                {t('nav.connectionOnline')} • {roomCount} {roomCount === 1 ? 'Raum' : 'Räume'}
              </>
            ) : (
              <>
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                {t('nav.connectionOffline')}
              </>
            )}
          </p>
        </div>
      </div>

      <Button
        onClick={onCreateRoom}
        disabled={!isConnected}
        className="bg-green-600 hover:bg-green-700"
        size="lg"
      >
        <Plus className="h-5 w-5 mr-2" />
        {t('room.create')}
      </Button>
    </div>
  )
}
