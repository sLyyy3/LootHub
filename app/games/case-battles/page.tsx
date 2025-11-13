'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Package, Users, Swords, Trophy, Plus } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

const cases = [
  { id: 'starter', name: 'Starter Case', price: 100 },
  { id: 'premium', name: 'Premium Case', price: 500 },
  { id: 'elite', name: 'Elite Case', price: 1000 },
]

const modes = [
  { players: 2, name: '1v1', icon: '⚔️' },
  { players: 3, name: '1v1v1', icon: '🔥' },
  { players: 4, name: '1v1v1v1', icon: '💥' },
]

interface Battle {
  id: string
  mode: number
  caseId: string
  caseName: string
  casePrice: number
  rounds: number
  creator: string
  players: string[]
  maxPlayers: number
  status: 'waiting' | 'active' | 'finished'
  winner?: string
}

export default function CaseBattlesPage() {
  const { user, isLoading, refreshUser } = useUser()
  const router = useRouter()
  const [battles, setBattles] = useState<Battle[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCase, setSelectedCase] = useState(cases[0])
  const [selectedMode, setSelectedMode] = useState(modes[0])
  const [rounds, setRounds] = useState(1)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    loadBattles()
  }, [])

  const loadBattles = async () => {
    // In a real app, this would fetch from database
    // For now, we'll simulate with local state
    const mockBattles: Battle[] = [
      {
        id: '1',
        mode: 2,
        caseId: 'premium',
        caseName: 'Premium Case',
        casePrice: 500,
        rounds: 3,
        creator: 'Player1',
        players: ['Player1'],
        maxPlayers: 2,
        status: 'waiting',
      },
      {
        id: '2',
        mode: 3,
        caseId: 'elite',
        caseName: 'Elite Case',
        casePrice: 1000,
        rounds: 5,
        creator: 'ProGamer',
        players: ['ProGamer', 'NoobMaster'],
        maxPlayers: 3,
        status: 'waiting',
      },
    ]
    setBattles(mockBattles)
  }

  const createBattle = async () => {
    if (!user) return

    const totalCost = selectedCase.price * rounds
    if (totalCost > user.coins) {
      toast.error('Insufficient coins')
      return
    }

    const newBattle: Battle = {
      id: Date.now().toString(),
      mode: selectedMode.players,
      caseId: selectedCase.id,
      caseName: selectedCase.name,
      casePrice: selectedCase.price,
      rounds,
      creator: user.username || user.email,
      players: [user.username || user.email],
      maxPlayers: selectedMode.players,
      status: 'waiting',
    }

    // In real app, save to database
    setBattles([newBattle, ...battles])
    setShowCreateModal(false)
    toast.success('Battle created! Waiting for players...')

    // Deduct coins
    try {
      const { error } = await supabase
        .from('users')
        .update({ coins: user.coins - totalCost })
        .eq('id', user.id)

      if (error) throw error
      await refreshUser()
    } catch (error) {
      toast.error('Failed to create battle')
    }
  }

  const joinBattle = async (battle: Battle) => {
    if (!user) return

    const totalCost = battle.casePrice * battle.rounds
    if (totalCost > user.coins) {
      toast.error('Insufficient coins')
      return
    }

    if (battle.players.length >= battle.maxPlayers) {
      toast.error('Battle is full')
      return
    }

    // Add player to battle
    const updatedBattle = {
      ...battle,
      players: [...battle.players, user.username || user.email],
    }

    // If battle is now full, start it
    if (updatedBattle.players.length === updatedBattle.maxPlayers) {
      updatedBattle.status = 'active'
      toast.success('Battle started!')
    } else {
      toast.success('Joined battle! Waiting for more players...')
    }

    setBattles(battles.map((b) => (b.id === battle.id ? updatedBattle : b)))

    // Deduct coins
    try {
      const { error } = await supabase
        .from('users')
        .update({ coins: user.coins - totalCost })
        .eq('id', user.id)

      if (error) throw error
      await refreshUser()
    } catch (error) {
      toast.error('Failed to join battle')
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-gradient-gold">Case Battles</span>
            </h1>
            <p className="text-gray-400">Compete against other players to win the highest value!</p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowCreateModal(true)}
            className="text-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Battle
          </Button>
        </div>

        {/* Create Battle Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Create Case Battle</span>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Select Case */}
                <div>
                  <label className="block text-sm font-medium mb-3">Select Case</label>
                  <div className="grid grid-cols-3 gap-4">
                    {cases.map((caseItem) => (
                      <button
                        key={caseItem.id}
                        onClick={() => setSelectedCase(caseItem)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedCase.id === caseItem.id
                            ? 'border-gold bg-gold/10 shadow-[0_0_20px_rgba(234,179,8,0.3)]'
                            : 'border-game-border bg-game-card hover:border-gold/50'
                        }`}
                      >
                        <Package className="w-12 h-12 mx-auto mb-2 text-gold" />
                        <p className="font-bold text-sm mb-1">{caseItem.name}</p>
                        <p className="text-gold text-xs">{formatNumber(caseItem.price)} coins</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Select Mode */}
                <div>
                  <label className="block text-sm font-medium mb-3">Battle Mode</label>
                  <div className="grid grid-cols-3 gap-4">
                    {modes.map((mode) => (
                      <button
                        key={mode.players}
                        onClick={() => setSelectedMode(mode)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedMode.players === mode.players
                            ? 'border-gold bg-gold/10 shadow-[0_0_20px_rgba(234,179,8,0.3)]'
                            : 'border-game-border bg-game-card hover:border-gold/50'
                        }`}
                      >
                        <div className="text-3xl mb-2">{mode.icon}</div>
                        <p className="font-bold">{mode.name}</p>
                        <p className="text-xs text-gray-400">{mode.players} players</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of Rounds */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Number of Rounds (1-10)
                  </label>
                  <input
                    type="number"
                    value={rounds}
                    onChange={(e) => setRounds(Math.min(10, Math.max(1, Number(e.target.value))))}
                    min={1}
                    max={10}
                    className="w-full px-4 py-3 bg-game-card border border-game-border rounded-lg focus:outline-none focus:border-gold transition-colors text-lg"
                  />
                  <div className="flex gap-2 mt-2">
                    {[1, 3, 5, 10].map((num) => (
                      <Button
                        key={num}
                        variant="ghost"
                        size="sm"
                        onClick={() => setRounds(num)}
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Total Cost */}
                <div className="p-4 bg-game-bg rounded-lg border border-game-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Total Cost:</span>
                    <span className="text-2xl font-bold text-gold">
                      {formatNumber(selectedCase.price * rounds)} coins
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Your Balance:</span>
                    <span className={user.coins >= selectedCase.price * rounds ? 'text-green-500' : 'text-red-500'}>
                      {formatNumber(user.coins)} coins
                    </span>
                  </div>
                </div>

                {/* Create Button */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full text-xl py-6"
                  onClick={createBattle}
                  disabled={user.coins < selectedCase.price * rounds}
                >
                  <Swords className="w-6 h-6 mr-2" />
                  Create Battle
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Battles */}
        <div className="grid grid-cols-1 gap-6">
          {battles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Swords className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 mb-4">No active battles</p>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                  Create the first battle
                </Button>
              </CardContent>
            </Card>
          ) : (
            battles.map((battle) => (
              <Card
                key={battle.id}
                className={`border-2 ${
                  battle.status === 'waiting'
                    ? 'border-green-500/30 bg-green-500/5'
                    : battle.status === 'active'
                    ? 'border-gold/30 bg-gold/5'
                    : 'border-gray-500/30'
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        battle.status === 'waiting'
                          ? 'bg-green-500 text-white'
                          : battle.status === 'active'
                          ? 'bg-gold text-black'
                          : 'bg-gray-500 text-white'
                      }`}>
                        {battle.status.toUpperCase()}
                      </div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-6 h-6 text-gold" />
                        {battle.caseName} - {modes.find((m) => m.players === battle.mode)?.name}
                      </CardTitle>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Total Prize Pool</div>
                      <div className="text-2xl font-bold text-gold">
                        {formatNumber(battle.casePrice * battle.rounds * battle.maxPlayers)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Battle Info */}
                    <div className="md:col-span-3">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-3 bg-game-bg rounded-lg">
                          <div className="text-xs text-gray-400 mb-1">Rounds</div>
                          <div className="text-lg font-bold">{battle.rounds}</div>
                        </div>
                        <div className="p-3 bg-game-bg rounded-lg">
                          <div className="text-xs text-gray-400 mb-1">Cost per Player</div>
                          <div className="text-lg font-bold text-gold">
                            {formatNumber(battle.casePrice * battle.rounds)}
                          </div>
                        </div>
                        <div className="p-3 bg-game-bg rounded-lg">
                          <div className="text-xs text-gray-400 mb-1">Players</div>
                          <div className="text-lg font-bold">
                            {battle.players.length} / {battle.maxPlayers}
                          </div>
                        </div>
                      </div>

                      {/* Players */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Array.from({ length: battle.maxPlayers }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border-2 text-center ${
                              idx < battle.players.length
                                ? 'border-gold bg-gold/10'
                                : 'border-game-border bg-game-card border-dashed'
                            }`}
                          >
                            {idx < battle.players.length ? (
                              <>
                                <Users className="w-6 h-6 mx-auto mb-1 text-gold" />
                                <p className="text-sm font-bold truncate">
                                  {battle.players[idx]}
                                </p>
                                {idx === 0 && (
                                  <p className="text-xs text-gray-400">Creator</p>
                                )}
                              </>
                            ) : (
                              <>
                                <Users className="w-6 h-6 mx-auto mb-1 text-gray-600" />
                                <p className="text-xs text-gray-400">Waiting...</p>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Join Button */}
                    <div className="flex items-center">
                      {battle.status === 'waiting' && !battle.players.includes(user.username || user.email) ? (
                        <Button
                          variant="primary"
                          size="lg"
                          className="w-full h-full text-lg"
                          onClick={() => joinBattle(battle)}
                          disabled={user.coins < battle.casePrice * battle.rounds}
                        >
                          <Swords className="w-5 h-5 mr-2" />
                          Join Battle
                        </Button>
                      ) : battle.status === 'waiting' ? (
                        <div className="w-full h-full flex items-center justify-center bg-game-bg rounded-lg">
                          <div className="text-center">
                            <div className="text-lg font-bold text-gold mb-2">Waiting...</div>
                            <div className="text-xs text-gray-400">
                              {battle.maxPlayers - battle.players.length} more players needed
                            </div>
                          </div>
                        </div>
                      ) : battle.status === 'active' ? (
                        <div className="w-full h-full flex items-center justify-center bg-gold/10 rounded-lg border-2 border-gold">
                          <div className="text-center">
                            <Trophy className="w-12 h-12 mx-auto mb-2 text-gold animate-bounce" />
                            <div className="text-lg font-bold text-gold">In Progress</div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-game-bg rounded-lg">
                          <div className="text-center">
                            <Trophy className="w-12 h-12 mx-auto mb-2 text-gold" />
                            <div className="text-sm font-bold mb-1">Winner:</div>
                            <div className="text-lg font-bold text-gold">{battle.winner}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How Case Battles Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold mb-3 text-gold">Game Rules</h3>
                <ul className="text-gray-400 space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-gold mr-2">•</span>
                    <span>Create or join a battle with 2-4 players</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gold mr-2">•</span>
                    <span>All players open cases simultaneously for X rounds</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gold mr-2">•</span>
                    <span>The player with the highest total item value wins ALL items</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gold mr-2">•</span>
                    <span>Winner takes the entire prize pool!</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-3 text-gold">Battle Modes</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-game-bg rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">⚔️</span>
                      <span className="font-bold">1v1</span>
                    </div>
                    <p className="text-xs text-gray-400">Head-to-head battle, winner takes all</p>
                  </div>
                  <div className="p-3 bg-game-bg rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">🔥</span>
                      <span className="font-bold">1v1v1</span>
                    </div>
                    <p className="text-xs text-gray-400">Three-way showdown for the bravest</p>
                  </div>
                  <div className="p-3 bg-game-bg rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">💥</span>
                      <span className="font-bold">1v1v1v1</span>
                    </div>
                    <p className="text-xs text-gray-400">Four-player chaos, may the best win!</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
