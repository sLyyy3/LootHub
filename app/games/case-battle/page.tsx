'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Users, Trophy, Plus, Bot, Play, Star, Sword, Swords, Target, Crosshair, Zap } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

interface Player {
  id: string
  name: string
  isBot: boolean
  isUser: boolean
  totalValue: number
  items: any[]
}

const weaponEmojis: Record<string, string> = {
  'P250': '🔫',
  'Glock-18': '🔫',
  'USP-S': '🔫',
  'M4A4': '⚔️',
  'AWP': '🎯',
  'Butterfly Knife': '🗡️',
  'Karambit': '🗡️',
  'Bayonet': '🗡️',
  'M9 Bayonet': '🗡️',
}

const getWeaponIcon = (name: string) => {
  for (const [weapon, icon] of Object.entries(weaponEmojis)) {
    if (name.includes(weapon)) return icon
  }
  return '⚔️'
}

const cases = [
  {
    id: 'beginner',
    name: 'Beginner Case',
    price: 50,
    icon: '📦',
    items: [
      { name: 'P250 | Sand Dune', rarity: 'common', value: 30, chance: 45 },
      { name: 'Glock-18 | Fade', rarity: 'uncommon', value: 80, chance: 35 },
      { name: 'USP-S | Guardian', rarity: 'rare', value: 150, chance: 15 },
      { name: 'M4A4 | Asiimov', rarity: 'epic', value: 300, chance: 4 },
      { name: 'AWP | Dragon Lore', rarity: 'legendary', value: 800, chance: 1 },
    ],
  },
  {
    id: 'premium',
    name: 'Premium Case',
    price: 500,
    icon: '💎',
    items: [
      { name: '★ Butterfly Knife | Vanilla', rarity: 'uncommon', value: 400, chance: 40 },
      { name: '★ Karambit | Fade', rarity: 'rare', value: 900, chance: 35 },
      { name: 'M4A4 | Howl', rarity: 'epic', value: 2000, chance: 20 },
      { name: 'AWP | Medusa', rarity: 'legendary', value: 4500, chance: 4 },
      { name: 'AWP | Dragon Lore (Souvenir)', rarity: 'mythic', value: 12000, chance: 1 },
    ],
  },
  {
    id: 'elite',
    name: 'Elite Case',
    price: 1000,
    icon: '⚡',
    items: [
      { name: '★ Bayonet | Doppler', rarity: 'rare', value: 1200, chance: 45 },
      { name: '★ Karambit | Tiger Tooth', rarity: 'epic', value: 2500, chance: 35 },
      { name: '★ M9 Bayonet | Crimson Web', rarity: 'legendary', value: 6000, chance: 15 },
      { name: '★ Butterfly Knife | Doppler Sapphire', rarity: 'mythic', value: 18000, chance: 4 },
      { name: 'AWP | Dragon Lore (Factory New)', rarity: 'divine', value: 60000, chance: 1 },
    ],
  },
]

const rarityColors: Record<string, string> = {
  common: 'from-gray-500 to-gray-700',
  uncommon: 'from-green-500 to-green-700',
  rare: 'from-blue-500 to-blue-700',
  epic: 'from-purple-500 to-purple-700',
  legendary: 'from-yellow-500 to-yellow-700',
  mythic: 'from-red-500 to-red-700',
  divine: 'from-pink-500 via-purple-500 to-blue-500',
}

const rarityGlow: Record<string, string> = {
  common: 'shadow-gray-500/50',
  uncommon: 'shadow-green-500/50',
  rare: 'shadow-blue-500/50',
  epic: 'shadow-purple-500/50',
  legendary: 'shadow-yellow-500/50',
  mythic: 'shadow-red-500/50',
  divine: 'shadow-pink-500/50',
}

const botNames = [
  'ShadowBot', 'SniperBot', 'ProGamerX', 'LuckyBot', 'NinjaBot',
  'DragonSlayer', 'PhoenixBot', 'TitanBot', 'VortexBot', 'CyberBot'
]

export default function CaseBattlePage() {
  const { user, isLoading, updateCoins, refreshUser } = useUser()
  const router = useRouter()

  const [battleMode, setBattleMode] = useState<'1v1' | '1v1v1' | '2v2'>('1v1')
  const [selectedCases, setSelectedCases] = useState<any[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [battleActive, setBattleActive] = useState(false)
  const [currentRound, setCurrentRound] = useState(0)
  const [winner, setWinner] = useState<Player | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [revealedItems, setRevealedItems] = useState<any[]>([])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  const getTotalPlayers = () => {
    return battleMode === '1v1' ? 2 : battleMode === '1v1v1' ? 3 : 4
  }

  const addCase = (caseItem: any) => {
    if (selectedCases.length >= 5) {
      toast.error('Maximum 5 cases per battle')
      return
    }
    setSelectedCases([...selectedCases, caseItem])
    toast.success(`Added ${caseItem.name}!`)
  }

  const removeCase = (index: number) => {
    setSelectedCases(selectedCases.filter((_, i) => i !== index))
  }

  const fillWithBots = () => {
    if (!user) return

    const totalPlayers = getTotalPlayers()
    const newPlayers: Player[] = [
      {
        id: user.id,
        name: user.username,
        isBot: false,
        isUser: true,
        totalValue: 0,
        items: [],
      },
    ]

    // Fill remaining slots with bots
    for (let i = 1; i < totalPlayers; i++) {
      newPlayers.push({
        id: `bot-${i}`,
        name: botNames[Math.floor(Math.random() * botNames.length)],
        isBot: true,
        isUser: false,
        totalValue: 0,
        items: [],
      })
    }

    setPlayers(newPlayers)
    toast.success(`Battle created! ${totalPlayers - 1} bot${totalPlayers > 2 ? 's' : ''} joined`, {
      icon: '🤖',
    })
  }

  const determineWonItem = (caseItem: any) => {
    const random = Math.random() * 100
    let cumulativeChance = 0

    for (const item of caseItem.items) {
      cumulativeChance += item.chance
      if (random <= cumulativeChance) {
        return { ...item }
      }
    }
    return { ...caseItem.items[0] }
  }

  const startBattle = async () => {
    if (!user || selectedCases.length === 0) {
      toast.error('Please add at least one case')
      return
    }

    if (players.length === 0) {
      toast.error('Please fill battle with bots first')
      return
    }

    const totalCost = selectedCases.reduce((sum, c) => sum + c.price, 0)
    if (totalCost > user.coins) {
      toast.error('Insufficient coins')
      return
    }

    // Deduct cost
    updateCoins(user.coins - totalCost)
    try {
      await supabase
        .from('users')
        .update({ coins: user.coins - totalCost })
        .eq('id', user.id)
    } catch (error) {
      console.error('Error updating coins:', error)
    }

    setBattleActive(true)
    setWinner(null)
    setCurrentRound(0)
    setRevealedItems([])

    // Reset player totals
    const resetPlayers = players.map(p => ({ ...p, totalValue: 0, items: [] }))
    setPlayers(resetPlayers)

    // Open each case for each player
    for (let round = 0; round < selectedCases.length; round++) {
      setCurrentRound(round + 1)
      setIsAnimating(true)

      const caseToOpen = selectedCases[round]

      // Each player opens the case
      const roundItems: any[] = []
      for (let i = 0; i < resetPlayers.length; i++) {
        const item = determineWonItem(caseToOpen)
        roundItems.push(item)
      }

      setRevealedItems(roundItems)

      // Animate opening
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Update players with items
      setPlayers(prev => prev.map((player, idx) => ({
        ...player,
        items: [...player.items, roundItems[idx]],
        totalValue: player.totalValue + roundItems[idx].value,
      })))

      setIsAnimating(false)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Determine winner AFTER all updates are complete
    await new Promise(resolve => setTimeout(resolve, 500))

    setPlayers(prevPlayers => {
      const winningPlayer = prevPlayers.reduce((max, p) => p.totalValue > max.totalValue ? p : max)

      // Set winner OUTSIDE of setState
      setTimeout(() => {
        setWinner(winningPlayer)
        handleBattleResult(prevPlayers, winningPlayer, totalCost)
      }, 0)

      return prevPlayers
    })

    setBattleActive(false)
  }

  const handleBattleResult = async (allPlayers: Player[], winningPlayer: Player, totalCost: number) => {
    if (!user) return

    const userPlayer = allPlayers.find(p => p.isUser)
    if (!userPlayer) return

    const isWin = userPlayer.id === winningPlayer.id
    const payout = isWin ? userPlayer.totalValue : 0

    try {
      // Save game to database
      await supabase.from('games').insert({
        player_id: user.id,
        type: 'case_battle',
        bet_amount: totalCost,
        result: isWin ? 'win' : 'loss',
        payout,
      })

      if (isWin) {
        // Add items to inventory
        const inventoryItems = userPlayer.items.map((item: any) => ({
          user_id: user.id,
          item_name: item.name,
          item_rarity: item.rarity,
          item_value: item.value,
        }))

        if (inventoryItems.length > 0) {
          await supabase.from('inventory').insert(inventoryItems)
        }

        // Update coins
        const newBalance = user.coins + payout
        await supabase.from('users').update({ coins: newBalance }).eq('id', user.id)
        updateCoins(newBalance)

        toast.success(`🏆 You won the battle! +${formatNumber(payout)} coins`, {
          duration: 5000,
          icon: '🎉',
        })
      } else {
        toast.error(`You lost the battle. Winner: ${winningPlayer.name}`, {
          duration: 4000,
        })
      }

      await refreshUser()
    } catch (error) {
      console.error('Error handling battle result:', error)
      toast.error('Error saving battle result')
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12" />
      </div>
    )
  }

  const totalCost = selectedCases.reduce((sum, c) => sum + c.price, 0)
  const canAfford = user.coins >= totalCost

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Swords className="w-10 h-10 text-red-500" />
            <span className="text-gradient-gold">Case Battle</span>
          </h1>
          <p className="text-gray-400">Battle against bots! Highest total value wins all items.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Battle Setup */}
          <div className="lg:col-span-2 space-y-6">
            {/* Battle Mode Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Battle Mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <Button
                    variant={battleMode === '1v1' ? 'primary' : 'secondary'}
                    onClick={() => setBattleMode('1v1')}
                    disabled={battleActive}
                    className="flex flex-col items-center p-6"
                  >
                    <Users className="w-8 h-8 mb-2" />
                    <span className="text-lg font-bold">1v1</span>
                  </Button>
                  <Button
                    variant={battleMode === '1v1v1' ? 'primary' : 'secondary'}
                    onClick={() => setBattleMode('1v1v1')}
                    disabled={battleActive}
                    className="flex flex-col items-center p-6"
                  >
                    <Users className="w-8 h-8 mb-2" />
                    <span className="text-lg font-bold">1v1v1</span>
                  </Button>
                  <Button
                    variant={battleMode === '2v2' ? 'primary' : 'secondary'}
                    onClick={() => setBattleMode('2v2')}
                    disabled={battleActive}
                    className="flex flex-col items-center p-6"
                  >
                    <Users className="w-8 h-8 mb-2" />
                    <span className="text-lg font-bold">2v2</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Case Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Cases (Max 5)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {cases.map(caseItem => (
                    <button
                      key={caseItem.id}
                      onClick={() => addCase(caseItem)}
                      disabled={battleActive || selectedCases.length >= 5}
                      className="p-4 bg-game-card rounded-lg border-2 border-game-border hover:border-gold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="text-5xl mb-2">{caseItem.icon}</div>
                      <h3 className="font-bold mb-1">{caseItem.name}</h3>
                      <p className="text-gold font-bold">{formatNumber(caseItem.price)}</p>
                    </button>
                  ))}
                </div>

                {/* Selected Cases */}
                {selectedCases.length > 0 && (
                  <div>
                    <h4 className="font-bold mb-3">Selected Cases:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCases.map((caseItem, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-4 py-2 bg-game-bg rounded-lg border border-gold"
                        >
                          <span className="text-2xl">{caseItem.icon}</span>
                          <span className="font-bold">{caseItem.name}</span>
                          <button
                            onClick={() => removeCase(idx)}
                            disabled={battleActive}
                            className="ml-2 text-red-500 hover:text-red-400 disabled:opacity-50"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Battle Arena */}
            {players.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-gold" />
                    Battle Arena
                    {currentRound > 0 && (
                      <span className="ml-auto text-sm">Round {currentRound}/{selectedCases.length}</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {players.map((player, idx) => (
                      <div
                        key={player.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          winner?.id === player.id
                            ? 'border-gold bg-gold/10 animate-pulse'
                            : battleActive
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-game-border bg-game-card'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          {player.isBot ? (
                            <Bot className="w-5 h-5 text-purple-500" />
                          ) : (
                            <Star className="w-5 h-5 text-gold" />
                          )}
                          <span className="font-bold truncate">{player.name}</span>
                        </div>

                        <div className="space-y-2">
                          {player.items.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className={`p-2 rounded bg-gradient-to-r ${rarityColors[item.rarity]} animate-slideIn`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{getWeaponIcon(item.name)}</span>
                                <div className="flex-1">
                                  <p className="text-xs font-bold truncate">{item.name}</p>
                                  <p className="text-xs text-white/80">{formatNumber(item.value)}</p>
                                </div>
                              </div>
                            </div>
                          ))}

                          {isAnimating && revealedItems[idx] && (
                            <div className="p-2 rounded bg-gradient-to-r from-gold/30 to-gold/10 animate-spin-slow">
                              <div className="text-center text-2xl">✨</div>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-700">
                          <p className="text-sm text-gray-400">Total Value</p>
                          <p className="text-xl font-bold text-gold">{formatNumber(player.totalValue)}</p>
                        </div>

                        {winner?.id === player.id && (
                          <div className="mt-2 text-center">
                            <span className="text-2xl animate-bounce inline-block">🏆</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Battle Info */}
            <Card>
              <CardHeader>
                <CardTitle>Battle Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Mode</p>
                  <p className="text-lg font-bold">{battleMode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Players</p>
                  <p className="text-lg font-bold">{players.length}/{getTotalPlayers()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Cases Selected</p>
                  <p className="text-lg font-bold">{selectedCases.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Cost</p>
                  <p className={`text-2xl font-bold ${canAfford ? 'text-gold' : 'text-red-500'}`}>
                    {formatNumber(totalCost)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={fillWithBots}
                  disabled={battleActive || players.length > 0}
                  variant="secondary"
                  className="w-full"
                >
                  <Bot className="w-5 h-5 mr-2" />
                  Fill with Bots
                </Button>
                <Button
                  onClick={startBattle}
                  disabled={battleActive || selectedCases.length === 0 || players.length === 0 || !canAfford}
                  variant="primary"
                  className="w-full"
                >
                  {battleActive ? (
                    <>
                      <div className="spinner w-5 h-5 mr-2" />
                      Battle in Progress...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Start Battle
                    </>
                  )}
                </Button>
                {!canAfford && totalCost > 0 && (
                  <p className="text-sm text-red-500 text-center">Insufficient coins!</p>
                )}
              </CardContent>
            </Card>

            {/* How to Play */}
            <Card>
              <CardHeader>
                <CardTitle>How to Play</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-400">
                  <li>Choose battle mode (1v1, 1v1v1, or 2v2)</li>
                  <li>Select 1-5 cases to open</li>
                  <li>Fill remaining slots with bots</li>
                  <li>Each player opens all cases</li>
                  <li>Highest total value wins ALL items!</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.5s ease-out;
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
    </div>
  )
}
