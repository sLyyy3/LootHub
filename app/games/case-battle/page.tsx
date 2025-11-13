'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Users, Trophy, Plus, Bot, Play, Star } from 'lucide-react'
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

const cases = [
  {
    id: 'beginner',
    name: 'Beginner Case',
    price: 50,
    image: '📦',
    items: [
      { name: 'P250 | Sand Dune', rarity: 'common', value: 30, chance: 45, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpopujwezvEYw' },
      { name: 'Glock-18 | Fade', rarity: 'uncommon', value: 80, chance: 35, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbaqKAxf0Ob3djFN79eJnJm0k' },
      { name: 'USP-S | Guardian', rarity: 'rare', value: 150, chance: 15, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpoo6m1FBRp3_bGcjhQ09Sv' },
      { name: 'M4A4 | Asiimov', rarity: 'epic', value: 300, chance: 4, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alDL_Dl' },
      { name: 'AWP | Dragon Lore', rarity: 'legendary', value: 800, chance: 1, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0m_7zO6-fkGRD6dNOh' },
    ],
  },
  {
    id: 'premium',
    name: 'Premium Case',
    price: 500,
    image: '💎',
    items: [
      { name: '★ Butterfly Knife | Vanilla', rarity: 'uncommon', value: 400, chance: 40, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf0ebcZThQ6tCvq4GGqO' },
      { name: '★ Karambit | Fade', rarity: 'rare', value: 900, chance: 35, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLZ' },
      { name: 'M4A4 | Howl', rarity: 'epic', value: 2000, chance: 20, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhjxszFJTwW09-5lpKKqPv9N' },
      { name: 'AWP | Medusa', rarity: 'legendary', value: 4500, chance: 4, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FABz7PLfYQJS5NO0m5O0' },
      { name: 'AWP | Dragon Lore (Souvenir)', rarity: 'mythic', value: 12000, chance: 1, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0m_7zO6_ummpD78A_3L6YoY2h0VHgqkc' },
    ],
  },
  {
    id: 'elite',
    name: 'Elite Case',
    price: 1000,
    image: '⚡',
    items: [
      { name: '★ Bayonet | Doppler', rarity: 'rare', value: 1200, chance: 45, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpotLu8JAllx8zJfAFJ6dO7kZSEk' },
      { name: '★ Karambit | Tiger Tooth', rarity: 'epic', value: 2500, chance: 35, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLZ' },
      { name: '★ M9 Bayonet | Crimson Web', rarity: 'legendary', value: 6000, chance: 15, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf3qr3czxb49KzgL-KkP' },
      { name: '★ Butterfly Knife | Doppler Sapphire', rarity: 'mythic', value: 18000, chance: 4, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf0ebcZThQ6tCvq4GGqP76DLfY' },
      { name: 'AWP | Dragon Lore (Factory New)', rarity: 'divine', value: 60000, chance: 1, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0m_7zO6-fw2pXu8B' },
    ],
  },
]

const rarityColors: Record<string, string> = {
  common: 'from-gray-500 to-gray-600',
  uncommon: 'from-green-500 to-green-600',
  rare: 'from-blue-500 to-blue-600',
  epic: 'from-purple-500 to-purple-600',
  legendary: 'from-yellow-500 to-yellow-600',
  mythic: 'from-red-500 to-red-600',
  divine: 'from-pink-500 via-purple-500 to-blue-500',
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
    toast.success(`Battle created! ${totalPlayers - 1} bot${totalPlayers > 2 ? 's' : ''} joined`)
  }

  const determineWonItem = (caseItem: any) => {
    const random = Math.random() * 100
    let cumulativeChance = 0

    for (const item of caseItem.items) {
      cumulativeChance += item.chance
      if (random <= cumulativeChance) {
        return item
      }
    }
    return caseItem.items[0]
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

    setBattleActive(true)
    setWinner(null)
    setCurrentRound(0)

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
      for (let i = 0; i < players.length; i++) {
        const item = determineWonItem(caseToOpen)
        roundItems.push(item)
      }

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

    // Determine winner
    const finalPlayers = players.map((player, idx) => {
      const totalValue = selectedCases.reduce((sum, _, caseIdx) => {
        const item = determineWonItem(selectedCases[caseIdx])
        return sum + item.value
      }, 0)
      return { ...player, totalValue }
    })

    setPlayers(prevPlayers => {
      const updatedPlayers = prevPlayers.map(p => ({ ...p }))
      const winningPlayer = updatedPlayers.reduce((max, p) => p.totalValue > max.totalValue ? p : max)
      setWinner(winningPlayer)

      // Save to database
      const userPlayer = updatedPlayers.find(p => p.isUser)
      if (userPlayer) {
        const isWin = userPlayer.id === winningPlayer.id
        const payout = isWin ? userPlayer.totalValue : 0
        const totalCost = selectedCases.reduce((sum, c) => sum + c.price, 0)

        supabase.from('games').insert({
          player_id: user!.id,
          game_type: 'case_battle',
          bet_amount: totalCost,
          result: isWin ? 'win' : 'loss',
          payout,
        })

        if (isWin) {
          // Add items to inventory
          const inventoryItems = userPlayer.items.map((item: any) => ({
            owner_id: user!.id,
            name: item.name,
            rarity: item.rarity,
            value: item.value,
          }))
          supabase.from('items').insert(inventoryItems)

          // Update coins
          const newBalance = user!.coins + payout
          supabase.from('users').update({ coins: newBalance }).eq('id', user!.id)
          updateCoins(newBalance)

          toast.success(`🏆 You won the battle! +${formatNumber(payout)} coins`)
        } else {
          toast.error(`You lost the battle. Winner: ${winningPlayer.name}`)
        }

        refreshUser()
      }

      return updatedPlayers
    })

    setBattleActive(false)
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
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient-gold">Case Battle</span>
          </h1>
          <p className="text-gray-400">Battle against bots! Highest total value wins all items.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Battle Setup */}
          <div className="lg:col-span-2">
            {/* Battle Mode Selection */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Battle Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {(['1v1', '1v1v1', '2v2'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setBattleMode(mode)
                        setPlayers([])
                      }}
                      disabled={battleActive}
                      className={`
                        p-4 rounded-lg border-2 transition-all
                        ${battleMode === mode ? 'border-gold bg-gold/10' : 'border-gray-700 bg-game-bg'}
                        ${battleActive ? 'cursor-not-allowed opacity-50' : 'hover:border-gold/50 cursor-pointer'}
                      `}
                    >
                      <Users className="w-8 h-8 mx-auto mb-2" />
                      <p className="font-bold">{mode.toUpperCase()}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Selected Cases */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Selected Cases ({selectedCases.length}/5)</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCases.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No cases selected</p>
                ) : (
                  <div className="grid grid-cols-5 gap-4">
                    {selectedCases.map((caseItem, idx) => (
                      <div key={idx} className="relative">
                        <div className="p-4 rounded-lg bg-game-card border border-gray-700 text-center">
                          <div className="text-4xl mb-2">{caseItem.image}</div>
                          <p className="text-xs font-bold truncate">{caseItem.name}</p>
                          <p className="text-gold text-xs">{formatNumber(caseItem.price)}</p>
                        </div>
                        {!battleActive && (
                          <button
                            onClick={() => removeCase(idx)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-win rounded-full flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-sm text-gray-400">Total Cost:</span>
                  <span className="text-xl font-bold text-gold">{formatNumber(totalCost)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Players */}
            {players.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Battle Participants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`grid ${battleMode === '2v2' ? 'grid-cols-4' : battleMode === '1v1v1' ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
                    {players.map((player) => (
                      <div
                        key={player.id}
                        className={`
                          p-4 rounded-lg border-2
                          ${winner?.id === player.id ? 'border-gold bg-gold/10' : 'border-gray-700 bg-game-bg'}
                        `}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          {player.isBot ? <Bot className="w-5 h-5" /> : <Trophy className="w-5 h-5 text-gold" />}
                          <p className="font-bold truncate">{player.name}</p>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-400">Total Value</p>
                            <p className="text-lg font-bold text-gold">{formatNumber(player.totalValue)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Items: {player.items.length}</p>
                            {player.items.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {player.items.map((item: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="w-12 h-12 rounded bg-gradient-to-br from-gray-700 to-gray-800 p-0.5"
                                  >
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {winner && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-gold/20 to-gold/5 border-2 border-gold rounded-lg text-center">
                      <Trophy className="w-12 h-12 mx-auto mb-2 text-gold" />
                      <p className="text-2xl font-bold mb-2">🏆 {winner.name} Wins!</p>
                      <p className="text-gold text-xl font-bold">Total Value: {formatNumber(winner.totalValue)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Battle Controls */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {players.length === 0 ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={fillWithBots}
                      disabled={battleActive}
                    >
                      <Bot className="w-5 h-5 mr-2" />
                      Fill Battle with Bots
                    </Button>
                  ) : null}

                  <Button
                    variant="primary"
                    className="w-full text-lg py-6"
                    onClick={startBattle}
                    disabled={battleActive || selectedCases.length === 0 || players.length === 0 || !canAfford}
                  >
                    <Play className="w-6 h-6 mr-2" />
                    {battleActive ? `Round ${currentRound}/${selectedCases.length}` : `Start Battle (${formatNumber(totalCost)} coins)`}
                  </Button>

                  {!canAfford && totalCost > 0 && (
                    <p className="text-center text-red-500 font-bold">
                      Insufficient coins! Need {formatNumber(totalCost - user.coins)} more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Case Selection */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Available Cases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cases.map((caseItem) => (
                    <button
                      key={caseItem.id}
                      onClick={() => addCase(caseItem)}
                      disabled={battleActive || selectedCases.length >= 5}
                      className={`
                        w-full p-4 rounded-lg border-2 transition-all text-left
                        ${battleActive ? 'cursor-not-allowed opacity-50' : 'hover:border-gold hover:scale-105 cursor-pointer'}
                        border-gray-700 bg-game-bg
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{caseItem.image}</div>
                        <div className="flex-1">
                          <p className="font-bold">{caseItem.name}</p>
                          <p className="text-gold font-bold">{formatNumber(caseItem.price)}</p>
                        </div>
                        <Plus className="w-6 h-6" />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
