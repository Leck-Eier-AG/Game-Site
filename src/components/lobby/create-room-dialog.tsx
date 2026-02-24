'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/lib/socket/provider'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Coins, Dices, CircleDot, Spade } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { RoomSettings, GameType, KniffelMode, KniffelPreset, ScoreCategory } from '@/types/game'
import { buildKniffelRulesetOverrides } from '@/lib/game/kniffel-ruleset'

interface CreateRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Casino games always use real currency betting on the table
const CASINO_GAMES: GameType[] = ['blackjack', 'roulette', 'poker']

export function CreateRoomDialog({ open, onOpenChange }: CreateRoomDialogProps) {
  const t = useTranslations()
  const router = useRouter()
  const { socket } = useSocket()

  const [gameType, setGameType] = useState<GameType>('kniffel')
  const [kniffelMode, setKniffelMode] = useState<KniffelMode>('classic')
  const [kniffelPreset, setKniffelPreset] = useState<KniffelPreset>('classic')
  const [roomName, setRoomName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState('4')
  const [turnTimer, setTurnTimer] = useState('60')
  const [afkThreshold, setAfkThreshold] = useState('3')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isBetRoom, setIsBetRoom] = useState(false)
  const [betAmount, setBetAmount] = useState<number | undefined>(undefined)
  const [minBet, setMinBet] = useState<number | undefined>(undefined)
  const [maxBet, setMaxBet] = useState<number | undefined>(undefined)
  const [useCustomPayout, setUseCustomPayout] = useState(false)
  const [payoutRatios, setPayoutRatios] = useState([
    { position: 1, percentage: 60 },
    { position: 2, percentage: 30 },
    { position: 3, percentage: 10 }
  ])
  const [isCreating, setIsCreating] = useState(false)

  // Game-specific settings
  const [spinTimer, setSpinTimer] = useState('30')
  const [startingBlinds, setStartingBlinds] = useState('10')
  const [allowScratch, setAllowScratch] = useState(true)
  const [strictStraights, setStrictStraights] = useState(false)
  const [fullHouseUsesSum, setFullHouseUsesSum] = useState(false)
  const [maxRolls, setMaxRolls] = useState('3')
  const [speedModeEnabled, setSpeedModeEnabled] = useState(false)
  const [draftEnabled, setDraftEnabled] = useState(false)
  const [duelEnabled, setDuelEnabled] = useState(false)
  const [categoryRandomizerEnabled, setCategoryRandomizerEnabled] = useState(false)
  const [disabledCategories, setDisabledCategories] = useState<ScoreCategory[]>([])
  const [specialCategories, setSpecialCategories] = useState<ScoreCategory[]>([])

  const isCasinoGame = CASINO_GAMES.includes(gameType)
  const isFixedTeamSize = gameType === 'kniffel' && (kniffelMode === 'team2v2' || kniffelMode === 'team3v3')
  const baseCategoryOptions: ScoreCategory[] = [
    'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
    'threeOfKind', 'fourOfKind', 'fullHouse',
    'smallStraight', 'largeStraight', 'kniffel', 'chance'
  ]
  const specialCategoryOptions: ScoreCategory[] = ['twoPairs', 'allEven', 'sumAtLeast24']

  const toggleCategory = (
    category: ScoreCategory,
    list: ScoreCategory[],
    setList: (value: ScoreCategory[] | ((prev: ScoreCategory[]) => ScoreCategory[])) => void
  ) => {
    setList(list.includes(category)
      ? list.filter(item => item !== category)
      : [...list, category])
  }

  // Auto-set isBetRoom for casino games
  useEffect(() => {
    if (isCasinoGame) {
      setIsBetRoom(true)
    }
  }, [gameType, isCasinoGame])

  useEffect(() => {
    if (gameType !== 'kniffel') return
    if (kniffelMode === 'team2v2') setMaxPlayers('4')
    if (kniffelMode === 'team3v3') setMaxPlayers('6')
  }, [gameType, kniffelMode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!socket) {
      toast.error('Keine Verbindung zum Server')
      return
    }

    // Validate room name
    if (roomName.length < 3 || roomName.length > 30) {
      toast.error('Raumname muss 3-30 Zeichen lang sein')
      return
    }

    // Validate bet settings (only for Kniffel bet rooms)
    if (isBetRoom && !isCasinoGame) {
      if (!betAmount || betAmount <= 0) {
        toast.error('Einsatz muss größer als 0 sein')
        return
      }
      if (minBet && maxBet && minBet > maxBet) {
        toast.error('Minimum-Einsatz kann nicht größer als Maximum-Einsatz sein')
        return
      }
      if (minBet && betAmount < minBet) {
        toast.error('Einsatz kann nicht kleiner als Minimum-Einsatz sein')
        return
      }
      if (maxBet && betAmount > maxBet) {
        toast.error('Einsatz kann nicht größer als Maximum-Einsatz sein')
        return
      }
    }

    // Validate custom payout ratios
    if (isBetRoom && !isCasinoGame && useCustomPayout) {
      const sum = payoutRatios.reduce((acc, r) => acc + r.percentage, 0)
      if (sum !== 100) {
        toast.error('Auszahlungsanteile müssen insgesamt 100% ergeben')
        return
      }
    }

    setIsCreating(true)

    const settings: RoomSettings = {
      name: roomName.trim(),
      gameType,
      kniffelMode: gameType === 'kniffel' ? kniffelMode : undefined,
      kniffelPreset: gameType === 'kniffel' ? kniffelPreset : undefined,
      kniffelRuleset: gameType === 'kniffel'
        ? buildKniffelRulesetOverrides({
          allowScratch,
          strictStraights,
          fullHouseUsesSum,
          maxRolls: parseInt(maxRolls, 10),
          speedModeEnabled,
          categoryRandomizerEnabled,
          disabledCategories,
          specialCategories,
          draftEnabled,
          duelEnabled
        })
        : undefined,
      maxPlayers: parseInt(maxPlayers, 10),
      isPrivate,
      turnTimer: parseInt(turnTimer, 10),
      afkThreshold: parseInt(afkThreshold, 10),
      isBetRoom,
      // Only set kniffel-style bet settings for non-casino games
      betAmount: isBetRoom && !isCasinoGame ? betAmount : undefined,
      minBet: isBetRoom && !isCasinoGame && minBet ? minBet : undefined,
      maxBet: isBetRoom && !isCasinoGame && maxBet ? maxBet : undefined,
      payoutRatios: isBetRoom && !isCasinoGame && useCustomPayout ? payoutRatios : undefined,
      rouletteSettings: gameType === 'roulette' ? {
        spinTimerSec: parseInt(spinTimer, 10)
      } : undefined,
      pokerSettings: gameType === 'poker' ? {
        startingBlinds: parseInt(startingBlinds, 10),
        blindEscalation: false,
        blindInterval: 10,
        allowRebuys: true,
        rebuyLimit: 3,
        minBuyIn: parseInt(startingBlinds, 10) * 20,
        maxBuyIn: parseInt(startingBlinds, 10) * 100
      } : undefined,
      blackjackSettings: gameType === 'blackjack' ? {
        maxHands: 1
      } : undefined
    }

    socket.emit('room:create', settings, (response: { success: boolean; roomId?: string; error?: string }) => {
      setIsCreating(false)

      if (response.success && response.roomId) {
        toast.success('Raum erfolgreich erstellt')
        onOpenChange(false)
        // Reset form
        setGameType('kniffel')
        setKniffelMode('classic')
        setKniffelPreset('classic')
        setRoomName('')
        setMaxPlayers('4')
        setTurnTimer('60')
        setAfkThreshold('3')
        setIsPrivate(false)
        setIsBetRoom(false)
        setBetAmount(undefined)
        setMinBet(undefined)
        setMaxBet(undefined)
        setUseCustomPayout(false)
        setPayoutRatios([
          { position: 1, percentage: 60 },
          { position: 2, percentage: 30 },
          { position: 3, percentage: 10 }
        ])
        setSpinTimer('30')
        setStartingBlinds('10')
        setAllowScratch(true)
        setStrictStraights(false)
        setFullHouseUsesSum(false)
        setMaxRolls('3')
        setSpeedModeEnabled(false)
        setDraftEnabled(false)
        setDuelEnabled(false)
        setCategoryRandomizerEnabled(false)
        setDisabledCategories([])
        setSpecialCategories([])
        // Navigate to game room
        router.push(`/game/${response.roomId}`)
      } else {
        toast.error(response.error || 'Fehler beim Erstellen des Raums')
      }
    })
  }

  // Helper to get max player options based on game type
  const getMaxPlayerOptions = () => {
    switch (gameType) {
      case 'kniffel':
        return [2, 3, 4, 5, 6]
      case 'blackjack':
        return [1, 2, 3, 4, 5, 6, 7]
      case 'roulette':
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      case 'poker':
        return [2, 3, 4, 5, 6, 7, 8, 9]
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-white">{t('room.create')}</DialogTitle>
            <DialogDescription>
              Erstelle einen neuen Spielraum und lade Freunde ein.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Game Type Selector - FIRST FIELD */}
            <div className="space-y-2">
              <Label htmlFor="gameType" className="text-white">
                Spielart
              </Label>
              <Select value={gameType} onValueChange={(val) => setGameType(val as GameType)}>
                <SelectTrigger id="gameType" className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kniffel">🎲 Kniffel</SelectItem>
                  <SelectItem value="blackjack">🃏 Blackjack</SelectItem>
                  <SelectItem value="roulette">🎰 Roulette</SelectItem>
                  <SelectItem value="poker" disabled>♠ Poker (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Room Name */}
            <div className="space-y-2">
              <Label htmlFor="roomName" className="text-white">
                {t('room.roomName')}
              </Label>
              <Input
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Mein Spielraum"
                required
                minLength={3}
                maxLength={30}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {/* Max Players */}
            <div className="space-y-2">
              <Label htmlFor="maxPlayers" className="text-white">
                {t('room.maxPlayers')}
              </Label>
              <Select value={maxPlayers} onValueChange={setMaxPlayers} disabled={isFixedTeamSize}>
                <SelectTrigger id="maxPlayers" className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getMaxPlayerOptions().map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} Spieler
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Game-specific settings */}
            {gameType === 'kniffel' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="kniffelPreset" className="text-white">
                    Preset
                  </Label>
                  <Select value={kniffelPreset} onValueChange={(val) => setKniffelPreset(val as KniffelPreset)}>
                    <SelectTrigger id="kniffelPreset" className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Classic</SelectItem>
                      <SelectItem value="triple" disabled>Triple (Coming Soon)</SelectItem>
                      <SelectItem value="draft" disabled>Draft (Coming Soon)</SelectItem>
                      <SelectItem value="duel" disabled>Duel (Coming Soon)</SelectItem>
                      <SelectItem value="daily" disabled>Daily (Coming Soon)</SelectItem>
                      <SelectItem value="ladder" disabled>Ladder (Coming Soon)</SelectItem>
                      <SelectItem value="roguelite" disabled>Roguelite (Coming Soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kniffelMode" className="text-white">
                    Modus
                  </Label>
                  <Select value={kniffelMode} onValueChange={(val) => setKniffelMode(val as KniffelMode)}>
                    <SelectTrigger id="kniffelMode" className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Klassisch (Jeder gegen jeden)</SelectItem>
                      <SelectItem value="team2v2">Team 2v2</SelectItem>
                      <SelectItem value="team3v3">Team 3v3</SelectItem>
                    </SelectContent>
                  </Select>
                  {isFixedTeamSize && (
                    <p className="text-xs text-gray-400">
                      Team-Modi verwenden feste Spielerzahlen: 2v2 = 4, 3v3 = 6
                    </p>
                  )}
                </div>

                <div className="space-y-2 border border-zinc-800 rounded-lg p-3">
                  <p className="text-sm font-semibold text-white">Regel-Toggles</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <input
                            id="allowScratch"
                            type="checkbox"
                            className="h-4 w-4"
                            checked={allowScratch}
                            onChange={(e) => setAllowScratch(e.target.checked)}
                          />
                          <Label htmlFor="allowScratch" className="text-gray-300">
                            Scratch erlauben
                          </Label>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Erlaubt es, eine Kategorie mit 0 Punkten zu streichen.
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <input
                            id="strictStraights"
                            type="checkbox"
                            className="h-4 w-4"
                            checked={strictStraights}
                            onChange={(e) => setStrictStraights(e.target.checked)}
                          />
                          <Label htmlFor="strictStraights" className="text-gray-300">
                            Strikte Straßen
                          </Label>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Kleine Straße nur 1-2-3-4-5, große Straße nur 2-3-4-5-6.
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <input
                            id="fullHouseSum"
                            type="checkbox"
                            className="h-4 w-4"
                            checked={fullHouseUsesSum}
                            onChange={(e) => setFullHouseUsesSum(e.target.checked)}
                          />
                          <Label htmlFor="fullHouseSum" className="text-gray-300">
                            Full House = Summe
                          </Label>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Full House zählt die Augensumme statt 25 Punkte.
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="maxRolls" className="text-gray-300">
                            Max. Würfe
                          </Label>
                          <Select value={maxRolls} onValueChange={setMaxRolls}>
                            <SelectTrigger id="maxRolls" className="bg-zinc-800 border-zinc-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4 (Risk Roll)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Wie oft pro Runde gewürfelt werden darf (3 oder 4).
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="space-y-2 border border-zinc-800 rounded-lg p-3">
                  <p className="text-sm font-semibold text-white">Speed Mode</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <input
                            id="speedModeEnabled"
                            type="checkbox"
                            className="h-4 w-4"
                            checked={speedModeEnabled}
                            onChange={(e) => setSpeedModeEnabled(e.target.checked)}
                          />
                          <Label htmlFor="speedModeEnabled" className="text-gray-300">
                            Auto-Score bei Timeout
                          </Label>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Wenn die Zeit abläuft, wird automatisch die beste Kategorie gewählt.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="space-y-2 border border-zinc-800 rounded-lg p-3">
                  <p className="text-sm font-semibold text-white">Match Modes</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <input
                            id="draftEnabled"
                            type="checkbox"
                            className="h-4 w-4"
                            checked={draftEnabled}
                            onChange={(e) => setDraftEnabled(e.target.checked)}
                          />
                          <Label htmlFor="draftEnabled" className="text-gray-300">
                            Draft Mode
                          </Label>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Nach jedem Wurf wird der Wurf in einer Draft-Phase beansprucht.
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <input
                            id="duelEnabled"
                            type="checkbox"
                            className="h-4 w-4"
                            checked={duelEnabled}
                            onChange={(e) => setDuelEnabled(e.target.checked)}
                          />
                          <Label htmlFor="duelEnabled" className="text-gray-300">
                            Duel Mode
                          </Label>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Best-of-N-Runden mit begrenztem Kategorien-Pool.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="space-y-2 border border-zinc-800 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <input
                      id="categoryRandomizerEnabled"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={categoryRandomizerEnabled}
                      onChange={(e) => setCategoryRandomizerEnabled(e.target.checked)}
                    />
                    <Label htmlFor="categoryRandomizerEnabled" className="text-gray-300">
                      Category Randomizer
                    </Label>
                  </div>

                  {categoryRandomizerEnabled && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Deaktivierte Kategorien</p>
                        <div className="grid grid-cols-2 gap-2">
                          {baseCategoryOptions.map((category) => (
                            <label key={category} className="flex items-center gap-2 text-xs text-gray-300">
                              <input
                                type="checkbox"
                                className="h-3 w-3"
                                checked={disabledCategories.includes(category)}
                                onChange={() => toggleCategory(category, disabledCategories, setDisabledCategories)}
                              />
                              {category}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Special Categories</p>
                        <div className="grid grid-cols-2 gap-2">
                          {specialCategoryOptions.map((category) => (
                            <label key={category} className="flex items-center gap-2 text-xs text-gray-300">
                              <input
                                type="checkbox"
                                className="h-3 w-3"
                                checked={specialCategories.includes(category)}
                                onChange={() => toggleCategory(category, specialCategories, setSpecialCategories)}
                              />
                              {category}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Turn Timer */}
                <div className="space-y-2">
                  <Label htmlFor="turnTimer" className="text-white">
                    {t('room.turnTimer')}
                  </Label>
                  <Select value={turnTimer} onValueChange={setTurnTimer}>
                    <SelectTrigger id="turnTimer" className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 Sekunden</SelectItem>
                      <SelectItem value="60">60 Sekunden</SelectItem>
                      <SelectItem value="90">90 Sekunden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* AFK Threshold */}
                <div className="space-y-2">
                  <Label htmlFor="afkThreshold" className="text-white">
                    {t('room.afkThreshold')}
                  </Label>
                  <Input
                    id="afkThreshold"
                    type="number"
                    value={afkThreshold}
                    onChange={(e) => setAfkThreshold(e.target.value)}
                    min={1}
                    max={10}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <p className="text-xs text-gray-400">
                    Spieler werden nach dieser Anzahl inaktiver Runden gekickt
                  </p>
                </div>
              </>
            )}

            {gameType === 'roulette' && (
              <div className="space-y-2">
                <Label htmlFor="spinTimer" className="text-white">
                  Spin-Timer
                </Label>
                <Select value={spinTimer} onValueChange={setSpinTimer}>
                  <SelectTrigger id="spinTimer" className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 Sekunden</SelectItem>
                    <SelectItem value="30">30 Sekunden</SelectItem>
                    <SelectItem value="60">60 Sekunden</SelectItem>
                    <SelectItem value="0">Manuell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {gameType === 'poker' && (
              <div className="space-y-2">
                <Label htmlFor="startingBlinds" className="text-white">
                  Startblinds
                </Label>
                <Select value={startingBlinds} onValueChange={setStartingBlinds}>
                  <SelectTrigger id="startingBlinds" className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 / 10</SelectItem>
                    <SelectItem value="10">10 / 20</SelectItem>
                    <SelectItem value="25">25 / 50</SelectItem>
                    <SelectItem value="50">50 / 100</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">
                  Small Blind / Big Blind
                </p>
              </div>
            )}

            {/* Public/Private Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="visibility" className="text-white">
                Sichtbarkeit
              </Label>
              <div className="flex gap-2">
                <Badge
                  variant={!isPrivate ? 'default' : 'outline'}
                  className={`cursor-pointer ${!isPrivate ? 'bg-green-500 hover:bg-green-600' : 'hover:bg-zinc-800'}`}
                  onClick={() => setIsPrivate(false)}
                >
                  {t('room.public')}
                </Badge>
                <Badge
                  variant={isPrivate ? 'default' : 'outline'}
                  className={`cursor-pointer ${isPrivate ? 'bg-yellow-500 hover:bg-yellow-600' : 'hover:bg-zinc-800'}`}
                  onClick={() => setIsPrivate(true)}
                >
                  {t('room.private')}
                </Badge>
              </div>
            </div>

            {/* Free/Bet Toggle — only for Kniffel */}
            {!isCasinoGame && (
              <div className="flex items-center justify-between">
                <Label htmlFor="betType" className="text-white">
                  Spielmodus
                </Label>
                <div className="flex gap-2">
                  <Badge
                    variant={!isBetRoom ? 'default' : 'outline'}
                    className={`cursor-pointer ${!isBetRoom ? 'bg-green-500 hover:bg-green-600' : 'hover:bg-zinc-800'}`}
                    onClick={() => setIsBetRoom(false)}
                  >
                    Kostenlos
                  </Badge>
                  <Badge
                    variant={isBetRoom ? 'default' : 'outline'}
                    className={`cursor-pointer flex items-center gap-1 ${isBetRoom ? 'bg-amber-500 hover:bg-amber-600' : 'hover:bg-zinc-800'}`}
                    onClick={() => setIsBetRoom(true)}
                  >
                    <Coins className="h-3 w-3" />
                    Einsatz
                  </Badge>
                </div>
              </div>
            )}

            {/* Casino game hint */}
            {isCasinoGame && (
              <div className="flex items-center gap-2 p-3 border border-amber-600/30 rounded-lg bg-amber-900/10">
                <Coins className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300">
                  {gameType === 'poker'
                    ? 'Poker verwendet Buy-ins. Einsätze werden am Tisch platziert.'
                    : gameType === 'blackjack'
                    ? 'Einsätze werden jede Runde am Tisch platziert.'
                    : 'Einsätze werden jede Runde am Tisch platziert.'}
                </p>
              </div>
            )}

            {/* Kniffel Bet Amount (shown only for Kniffel bet rooms) */}
            {isBetRoom && !isCasinoGame && (
              <div className="space-y-3 p-4 border border-zinc-800 rounded-lg bg-zinc-800/50">
                <div className="space-y-2">
                  <Label className="text-white">Einsatz pro Spieler</Label>
                  <div className="flex gap-2">
                    {[50, 100, 250, 500].map((preset) => (
                      <Badge
                        key={preset}
                        variant="outline"
                        className={`cursor-pointer px-3 py-1 ${
                          betAmount === preset
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'hover:bg-zinc-700'
                        }`}
                        onClick={() => setBetAmount(preset)}
                      >
                        {preset}
                      </Badge>
                    ))}
                  </div>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      value={betAmount || ''}
                      onChange={(e) => setBetAmount(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      placeholder="Eigener Betrag"
                      min={1}
                      className="bg-zinc-800 border-zinc-700 text-white pl-10"
                    />
                  </div>
                </div>

                {/* Min/Max Bet */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Min. Einsatz</Label>
                    <Input
                      type="number"
                      value={minBet || ''}
                      onChange={(e) => setMinBet(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      placeholder="Kein Minimum"
                      min={0}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Max. Einsatz</Label>
                    <Input
                      type="number"
                      value={maxBet || ''}
                      onChange={(e) => setMaxBet(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      placeholder="Kein Maximum"
                      min={0}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>

                {/* Payout Ratios */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-white text-sm">Auszahlung</Label>
                    <Badge
                      variant="outline"
                      className="cursor-pointer text-xs"
                      onClick={() => setUseCustomPayout(!useCustomPayout)}
                    >
                      {useCustomPayout ? 'Standard verwenden' : 'Benutzerdefiniert'}
                    </Badge>
                  </div>
                  {!useCustomPayout ? (
                    <p className="text-xs text-gray-400">
                      Standard: 60% / 30% / 10%
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {payoutRatios.map((ratio, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-8">{ratio.position}.</span>
                          <Input
                            type="number"
                            value={ratio.percentage}
                            onChange={(e) => {
                              const newRatios = [...payoutRatios]
                              newRatios[idx].percentage = parseInt(e.target.value, 10) || 0
                              setPayoutRatios(newRatios)
                            }}
                            min={0}
                            max={100}
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                          <span className="text-xs text-gray-400">%</span>
                        </div>
                      ))}
                      {payoutRatios.reduce((sum, r) => sum + r.percentage, 0) !== 100 && (
                        <p className="text-xs text-red-500">
                          Summe muss 100% ergeben (aktuell: {payoutRatios.reduce((sum, r) => sum + r.percentage, 0)}%)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !roomName.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCreating ? t('common.loading') : t('room.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
