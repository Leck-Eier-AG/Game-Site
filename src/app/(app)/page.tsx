import { Gamepad2 } from 'lucide-react'

export default function LobbyPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="p-6 bg-green-500/10 rounded-2xl">
            <Gamepad2 className="h-16 w-16 text-green-500" />
          </div>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white">Spiele kommen bald</h1>
          <p className="text-gray-400 text-lg">
            Hier werden bald Spieltische erscheinen. Bleib dran!
          </p>
        </div>
      </div>
    </div>
  )
}
