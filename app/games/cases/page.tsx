'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Package, Star, Sparkles, Plus, Minus, ShoppingBag, Swords, Users, Trophy, TrendingDown, Zap } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

const cases = [
  {
    id: 'beginner',
    name: 'Beginner Case',
    price: 50,
    emoji: '📦',
    gradient: 'from-gray-600 to-gray-800',
    items: [
      { name: 'P250 | Sand Dune', rarity: 'common', value: 30, chance: 45, emoji: '🔫' },
      { name: 'Glock-18 | Fade', rarity: 'uncommon', value: 80, chance: 35, emoji: '🔫' },
      { name: 'USP-S | Guardian', rarity: 'rare', value: 150, chance: 15, emoji: '🔫' },
      { name: 'M4A4 | Asiimov', rarity: 'epic', value: 300, chance: 4, emoji: '⚔️' },
      { name: 'AWP | Dragon Lore', rarity: 'legendary', value: 800, chance: 1, emoji: '🎯' },
    ],
  },
  {
    id: 'starter',
    name: 'Starter Case',
    price: 100,
    emoji: '🎁',
    gradient: 'from-green-600 to-green-800',
    items: [
      { name: 'AK-47 | Redline', rarity: 'common', value: 80, chance: 50, emoji: '💥' },
      { name: 'M4A1-S | Hyper Beast', rarity: 'uncommon', value: 200, chance: 30, emoji: '⚔️' },
      { name: 'AWP | Lightning Strike', rarity: 'rare', value: 400, chance: 15, emoji: '🎯' },
      { name: '★ Karambit | Damascus Steel', rarity: 'epic', value: 800, chance: 4, emoji: '🗡️' },
      { name: 'AK-47 | Fire Serpent', rarity: 'legendary', value: 1500, chance: 1, emoji: '🔥' },
    ],
  },
  {
    id: 'premium',
    name: 'Premium Case',
    price: 500,
    emoji: '💎',
    gradient: 'from-blue-600 to-blue-800',
    items: [
      { name: '★ Butterfly Knife | Vanilla', rarity: 'uncommon', value: 400, chance: 40, emoji: '🗡️' },
      { name: '★ Karambit | Fade', rarity: 'rare', value: 900, chance: 35, emoji: '🗡️' },
      { name: 'M4A4 | Howl', rarity: 'epic', value: 2000, chance: 20, emoji: '🔥' },
      { name: 'AWP | Medusa', rarity: 'legendary', value: 4500, chance: 4, emoji: '🐍' },
      { name: 'AWP | Dragon Lore (Souvenir)', rarity: 'mythic', value: 12000, chance: 1, emoji: '🐉' },
    ],
  },
  {
    id: 'elite',
    name: 'Elite Case',
    price: 1000,
    emoji: '⚡',
    gradient: 'from-purple-600 to-purple-800',
    items: [
      { name: '★ Bayonet | Doppler', rarity: 'rare', value: 1200, chance: 45, emoji: '🗡️' },
      { name: '★ Karambit | Tiger Tooth', rarity: 'epic', value: 2500, chance: 35, emoji: '🐯' },
      { name: '★ M9 Bayonet | Crimson Web', rarity: 'legendary', value: 6000, chance: 15, emoji: '🕷️' },
      { name: '★ Butterfly Knife | Doppler Sapphire', rarity: 'mythic', value: 18000, chance: 4, emoji: '💎' },
      { name: 'AWP | Dragon Lore (Factory New)', rarity: 'divine', value: 60000, chance: 1, emoji: '👑' },
    ],
  },
  {
    id: 'vip',
    name: 'VIP Case',
    price: 2500,
    emoji: '👑',
    gradient: 'from-yellow-500 to-yellow-700',
    items: [
      { name: '★ Karambit | Lore', rarity: 'rare', value: 3000, chance: 45, emoji: '📜' },
      { name: '★ M9 Bayonet | Marble Fade', rarity: 'epic', value: 6000, chance: 35, emoji: '🎨' },
      { name: '★ Karambit | Fade (Factory New)', rarity: 'legendary', value: 12000, chance: 15, emoji: '🌈' },
      { name: 'M4A4 | Howl (StatTrak™ FN)', rarity: 'mythic', value: 30000, chance: 4, emoji: '🔥' },
      { name: '★ Karambit | Case Hardened (Blue Gem)', rarity: 'divine', value: 100000, chance: 1, emoji: '💠' },
    ],
  },
  {
    id: 'ultimate',
    name: 'Ultimate Case',
    price: 5000,
    emoji: '🔥',
    gradient: 'from-red-600 to-red-800',
    items: [
      { name: '★ Sport Gloves | Pandora\'s Box', rarity: 'epic', value: 8000, chance: 45, emoji: '🧤' },
      { name: '★ Karambit | Doppler Ruby', rarity: 'legendary', value: 18000, chance: 35, emoji: '💎' },
      { name: '★ M9 Bayonet | Doppler Sapphire', rarity: 'mythic', value: 40000, chance: 15, emoji: '💎' },
      { name: '★ Karambit | Doppler Black Pearl', rarity: 'divine', value: 90000, chance: 4, emoji: '🖤' },
      { name: 'AWP | Dragon Lore (Souvenir FN)', rarity: 'divine', value: 250000, chance: 1, emoji: '🏆' },
    ],
  },
  {
    id: 'godlike',
    name: 'Godlike Case',
    price: 10000,
    emoji: '✨',
    gradient: 'from-pink-500 to-purple-700',
    items: [
      { name: '★ Driver Gloves | Crimson Weave', rarity: 'legendary', value: 25000, chance: 45, emoji: '🧤' },
      { name: '★ Karambit | Gamma Doppler Emerald', rarity: 'mythic', value: 60000, chance: 35, emoji: '💚' },
      { name: 'Sticker | iBUYPOWER (Holo) | Katowice 2014', rarity: 'divine', value: 150000, chance: 15, emoji: '🎨' },
      { name: '★ Karambit | Case Hardened 661', rarity: 'divine', value: 350000, chance: 4, emoji: '💎' },
      { name: 'AK-47 | Case Hardened (Souvenir Pink DDPAT)', rarity: 'divine', value: 1000000, chance: 1, emoji: '👑' },
    ],
  },
]

const gameModes = [
  { id: '1v1', name: '1v1 Battle', icon: '⚔️', desc: 'Classic duel - highest value wins', players: 2, teams: false },
  { id: '2v2', name: '2v2 Team Battle', icon: '🤝', desc: 'Team up - combined value, shared pot', players: 4, teams: true },
  { id: '1v1v1', name: '1v1v1 Free-For-All', icon: '👥', desc: 'Three-way showdown', players: 3, teams: false },
  { id: '1+1', name: '1+1 Co-op', icon: '💰', desc: 'Play together, split the pot 50/50', players: 2, teams: true, coop: true },
  { id: '1+1+1', name: '1+1+1 Co-op', icon: '💰', desc: 'Three players, equal split', players: 3, teams: true, coop: true },
  { id: 'reverse', name: 'Reverse Mode', icon: '🔄', desc: 'Lowest value WINS!', players: 2, teams: false, reverse: true },
  { id: 'crazy-jackpot', name: 'Crazy Jackpot', icon: '🎰', desc: 'Wheel of fortune based on your draws', players: 2, jackpot: true },
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
  common: 'shadow-[0_0_15px_rgba(156,163,175,0.4)]',
  uncommon: 'shadow-[0_0_20px_rgba(34,197,94,0.5)]',
  rare: 'shadow-[0_0_20px_rgba(59,130,246,0.6)]',
  epic: 'shadow-[0_0_25px_rgba(168,85,247,0.7)]',
  legendary: 'shadow-[0_0_30px_rgba(234,179,8,0.9)]',
  mythic: 'shadow-[0_0_30px_rgba(239,68,68,0.9)]',
  divine: 'shadow-[0_0_40px_rgba(236,72,153,1)]',
}

export default function CasesPage() {
  const { user, isLoading, refreshUser, updateUser } = useUser()
  const router = useRouter()

  const [selectedCase, setSelectedCase] = useState(cases[0])
  const [selectedMode, setSelectedMode] = useState(gameModes[0])
  const [casesAmount, setCasesAmount] = useState(1)
  const [isOpening, setIsOpening] = useState(false)
  const [playerResults, setPlayerResults] = useState<any[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [winner, setWinner] = useState<any>(null)
  const [wheelRotation, setWheelRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  const determineWonItem = () => {
    const random = Math.random() * 100
    let cumulativeChance = 0

    for (const caseItem of selectedCase.items) {
      cumulativeChance += caseItem.chance
      if (random <= cumulativeChance) {
        return caseItem
      }
    }
    return selectedCase.items[0]
  }

  const simulatePlayer = (playerName: string) => {
    const items = []
    let totalValue = 0

    for (let i = 0; i < casesAmount; i++) {
      const item = determineWonItem()
      items.push(item)
      totalValue += item.value
    }

    return { name: playerName, items, totalValue }
  }

  const openCases = async () => {
    if (!user) return

    const totalCost = selectedCase.price * casesAmount
    if (totalCost > user.coins) {
      toast.error('Insufficient coins')
      return
    }

    // Deduct cost immediately
    const newBalance = user.coins - totalCost
    updateUser({ coins: newBalance })
    await supabase.from('users').update({ coins: newBalance }).eq('id', user.id)

    setIsOpening(true)
    setPlayerResults([])
    setCurrentRound(0)
    setShowResults(false)
    setWinner(null)

    // Simulate all players
    const results = []
    const playerCount = selectedMode.id === 'crazy-jackpot' ? Math.floor(Math.random() * 3) + 2 : selectedMode.players

    // Player 1 (user)
    results.push(simulatePlayer(user.username || 'You'))

    // Other players (AI)
    for (let i = 1; i < playerCount; i++) {
      results.push(simulatePlayer(`Player ${i + 1}`))
    }

    // Animate rounds
    for (let round = 0; round < casesAmount; round++) {
      setCurrentRound(round + 1)
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    setPlayerResults(results)
    await new Promise(resolve => setTimeout(resolve, 500))

    // Determine winner based on mode
    let winnerResult
    if (selectedMode.jackpot) {
      // Crazy Jackpot mode
      await spinJackpotWheel(results)
    } else if (selectedMode.reverse) {
      // Reverse mode - LOWEST wins
      winnerResult = results.reduce((min, p) => p.totalValue < min.totalValue ? p : min)
      setWinner(winnerResult)
    } else if (selectedMode.coop) {
      // Co-op mode - all players win together, pot split
      setWinner({ name: 'Everyone', isCoop: true })
    } else if (selectedMode.teams && selectedMode.id === '2v2') {
      // 2v2 mode - team with higher combined value wins
      const team1Value = results[0].totalValue + results[1].totalValue
      const team2Value = results[2].totalValue + results[3].totalValue
      winnerResult = team1Value > team2Value
        ? { name: 'Team 1', players: [results[0], results[1]], totalValue: team1Value }
        : { name: 'Team 2', players: [results[2], results[3]], totalValue: team2Value }
      setWinner(winnerResult)
    } else {
      // Standard modes - highest wins
      winnerResult = results.reduce((max, p) => p.totalValue > max.totalValue ? p : max)
      setWinner(winnerResult)
    }

    setShowResults(true)

    // Calculate rewards
    try {
      const userResult = results[0]
      const isUserWinner = winnerResult?.name === userResult.name ||
                           (winnerResult as any)?.isCoop ||
                           (winnerResult as any)?.players?.some((p: any) => p.name === userResult.name)

      let reward = 0
      if (isUserWinner) {
        if (selectedMode.coop) {
          // Split pot equally
          const totalPot = results.reduce((sum, p) => sum + p.totalValue, 0)
          reward = Math.floor(totalPot / playerCount)
        } else if (selectedMode.teams && selectedMode.id === '2v2') {
          // Split team pot
          reward = Math.floor((winnerResult as any).totalValue / 2)
        } else {
          // Winner takes all (pot multiplier)
          reward = userResult.totalValue * (playerCount === 2 ? 1.8 : playerCount === 3 ? 2.5 : 3)
        }
      } else {
        reward = 0 // Lost
      }

      const finalBalance = user.coins + reward
      const xpGain = Math.floor(totalCost / 10)
      const newXp = user.xp + xpGain

      updateUser({ coins: finalBalance, xp: newXp })

      await supabase.from('users').update({
        coins: finalBalance,
        xp: newXp,
        games_played: user.games_played + 1,
        games_won: isUserWinner ? user.games_won + 1 : user.games_won,
      }).eq('id', user.id)

      // Save game
      await supabase.from('games').insert({
        player_id: user.id,
        type: 'case_battle',
        bet_amount: totalCost,
        result: isUserWinner ? 'win' : 'loss',
        payout: reward,
        multiplier: playerCount,
      })

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: isUserWinner ? 'game_win' : 'game_loss',
        amount: reward - totalCost,
        description: `Case Battle ${selectedMode.name} - ${isUserWinner ? 'Won' : 'Lost'}`,
      })

      if (isUserWinner) {
        toast.success(`🎉 ${selectedMode.name} Victory! Won ${formatNumber(reward)} coins!`, { duration: 5000 })
      } else {
        toast.error(`Lost ${selectedMode.name}. Better luck next time!`, { duration: 3000 })
      }
    } catch (error) {
      console.error('Error:', error)
      await refreshUser()
    } finally {
      setIsOpening(false)
    }
  }

  const spinJackpotWheel = async (results: any[]) => {
    setIsSpinning(true)

    // Calculate percentages
    const totalValue = results.reduce((sum, p) => sum + p.totalValue, 0)
    const percentages = results.map(p => ({
      ...p,
      percentage: (p.totalValue / totalValue) * 100
    }))

    // Spin wheel
    const spins = 5 + Math.random() * 2
    const winnerIndex = Math.random() * 100
    let cumulative = 0
    let selectedIndex = 0
    for (let i = 0; i < percentages.length; i++) {
      cumulative += percentages[i].percentage
      if (winnerIndex <= cumulative) {
        selectedIndex = i
        break
      }
    }

    const degrees = 360 * spins + (selectedIndex / percentages.length) * 360
    setWheelRotation(degrees)

    await new Promise(resolve => setTimeout(resolve, 5000))
    setWinner(results[selectedIndex])
    setIsSpinning(false)
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12" />
      </div>
    )
  }

  const totalCost = selectedCase.price * casesAmount
  const canAfford = user.coins >= totalCost

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Package className="w-10 h-10 text-yellow-500" />
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Case Battles
              </span>
            </h1>
            <p className="text-gray-400">Choose your mode and battle for glory!</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => router.push('/inventory')}
            className="flex items-center gap-2"
          >
            <ShoppingBag className="w-5 h-5" />
            Inventory
          </Button>
        </div>

        {/* Game Mode Selection */}
        <Card className="mb-6 bg-gradient-to-br from-orange-900/20 to-red-900/10 border-orange-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="w-6 h-6 text-orange-500" />
              Select Battle Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {gameModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode)}
                  disabled={isOpening}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedMode.id === mode.id
                      ? 'border-orange-500 bg-orange-500/20 scale-105 shadow-lg shadow-orange-500/30'
                      : 'border-gray-700 bg-gray-800/50 hover:border-orange-500/50 hover:scale-102'
                  } ${isOpening ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="text-4xl mb-2">{mode.icon}</div>
                  <p className="font-bold text-sm mb-1">{mode.name}</p>
                  <p className="text-xs text-gray-400">{mode.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Case Selection */}
        <Card className="mb-6 bg-gradient-to-br from-purple-900/20 to-blue-900/10 border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-6 h-6 text-purple-500" />
              Select Case
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {cases.map((caseItem) => (
                <button
                  key={caseItem.id}
                  onClick={() => setSelectedCase(caseItem)}
                  disabled={isOpening}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedCase.id === caseItem.id
                      ? 'border-purple-500 bg-purple-500/20 scale-105 shadow-lg shadow-purple-500/30'
                      : 'border-gray-700 bg-gray-800/50 hover:border-purple-500/50 hover:scale-102'
                  } ${isOpening ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="text-5xl mb-2">{caseItem.emoji}</div>
                  <p className="font-bold text-sm mb-1 truncate">{caseItem.name}</p>
                  <p className="text-yellow-400 font-bold text-xs">{formatNumber(caseItem.price)}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rounds Selection */}
        <Card className="mb-6 bg-gradient-to-br from-cyan-900/20 to-blue-900/10 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-cyan-500" />
              Number of Rounds (Cases per player)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                onClick={() => setCasesAmount(Math.max(1, casesAmount - 1))}
                disabled={isOpening || casesAmount <= 1}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <div className="flex-1 text-center">
                <div className="text-5xl font-bold text-cyan-400">{casesAmount}</div>
                <div className="text-sm text-gray-400 mt-2">
                  {casesAmount === 1 ? 'round' : 'rounds'} • Cost: {formatNumber(totalCost)} coins
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setCasesAmount(Math.min(10, casesAmount + 1))}
                disabled={isOpening || casesAmount >= 10}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            <div className="grid grid-cols-5 gap-2 mt-4">
              {[1, 3, 5, 7, 10].map((amount) => (
                <Button
                  key={amount}
                  variant="ghost"
                  onClick={() => setCasesAmount(amount)}
                  disabled={isOpening}
                  className={`font-bold ${casesAmount === amount ? 'bg-cyan-500/20 border-cyan-500' : ''}`}
                >
                  {amount}x
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Battle Arena */}
        {!showResults ? (
          <Card className="mb-6 bg-gradient-to-br from-yellow-900/30 to-orange-900/20 border-yellow-500/40">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  Battle Arena
                  {isOpening && currentRound > 0 && (
                    <span className="text-cyan-400 ml-2">Round {currentRound}/{casesAmount}</span>
                  )}
                </span>
                <span className="text-yellow-400">{formatNumber(user.coins)} coins</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-20">
                <div className="text-8xl mb-6 animate-bounce">{selectedCase.emoji}</div>
                <h2 className="text-3xl font-bold mb-4">
                  {selectedMode.name} - {selectedCase.name}
                </h2>
                <p className="text-gray-400 mb-2">{selectedMode.desc}</p>
                <p className="text-xl text-cyan-400 font-bold mb-8">
                  {casesAmount} rounds • {selectedMode.players} players
                </p>

                <Button
                  variant="primary"
                  size="lg"
                  className="text-xl py-6 px-12 bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 hover:from-yellow-500 hover:via-orange-500 hover:to-red-500 font-bold shadow-lg shadow-yellow-500/30"
                  onClick={openCases}
                  isLoading={isOpening}
                  disabled={!canAfford || isOpening}
                >
                  {isOpening
                    ? `Battle in Progress... Round ${currentRound}/${casesAmount}`
                    : `Start Battle • ${formatNumber(totalCost)} coins`}
                </Button>

                {!canAfford && (
                  <p className="text-red-500 mt-4 font-bold">
                    Need {formatNumber(totalCost - user.coins)} more coins!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Crazy Jackpot Wheel */}
            {selectedMode.jackpot && (
              <Card className="mb-6 bg-gradient-to-br from-purple-900/30 to-pink-900/20 border-pink-500/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-pink-500 animate-spin" />
                    Crazy Jackpot Wheel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative w-full max-w-md mx-auto aspect-square">
                    {/* Wheel */}
                    <div className="absolute inset-0 rounded-full overflow-hidden border-8 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.8)]">
                      <div
                        className="absolute inset-0 transition-transform duration-[5000ms] ease-out"
                        style={{
                          transform: `rotate(${wheelRotation}deg)`,
                          background: `conic-gradient(${playerResults.map((p, idx) => {
                            const totalValue = playerResults.reduce((sum, pl) => sum + pl.totalValue, 0)
                            const percentage = (p.totalValue / totalValue) * 100
                            const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
                            return `${colors[idx % colors.length]} ${idx * (360 / playerResults.length)}deg ${(idx + 1) * (360 / playerResults.length)}deg`
                          }).join(', ')})`,
                        }}
                      >
                        {playerResults.map((player, idx) => {
                          const angle = (idx / playerResults.length) * 360 + (360 / playerResults.length / 2)
                          const totalValue = playerResults.reduce((sum, p) => sum + p.totalValue, 0)
                          const percentage = ((player.totalValue / totalValue) * 100).toFixed(1)
                          return (
                            <div
                              key={idx}
                              className="absolute top-1/2 left-1/2 origin-left"
                              style={{
                                transform: `rotate(${angle}deg) translateX(40%)`,
                              }}
                            >
                              <div className="text-white font-bold text-lg bg-black/50 px-2 py-1 rounded">
                                {player.name}: {percentage}%
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Pointer */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                      <div className="w-6 h-12 bg-yellow-500 clip-triangle shadow-lg"></div>
                    </div>
                  </div>

                  {!isSpinning && winner && (
                    <div className="text-center mt-6">
                      <p className="text-3xl font-bold text-yellow-400 animate-bounce">
                        🎉 {winner.name} wins the jackpot! 🎉
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Battle Results */}
            <Card className="mb-6 bg-gradient-to-br from-green-900/30 to-blue-900/20 border-green-500/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  Battle Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {playerResults.map((player, idx) => {
                    const isWinner = winner?.name === player.name ||
                                   (winner as any)?.isCoop ||
                                   (winner as any)?.players?.some((p: any) => p.name === player.name)

                    return (
                      <div
                        key={idx}
                        className={`p-6 rounded-lg border-2 transition-all ${
                          isWinner
                            ? 'border-yellow-500 bg-gradient-to-br from-yellow-600/30 to-yellow-800/20 scale-105 shadow-lg shadow-yellow-500/50'
                            : 'border-gray-700 bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold">{player.name}</h3>
                          {isWinner && <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />}
                        </div>

                        <div className="space-y-2 mb-4">
                          {player.items.map((item: any, itemIdx: number) => (
                            <div
                              key={itemIdx}
                              className={`p-2 rounded-lg bg-gradient-to-r ${rarityColors[item.rarity]} ${rarityGlow[item.rarity]}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{item.emoji}</span>
                                <div className="flex-1">
                                  <p className="text-xs font-bold truncate">{item.name}</p>
                                  <p className="text-xs text-gray-300">{formatNumber(item.value)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="text-center p-3 bg-black/30 rounded-lg">
                          <p className="text-sm text-gray-400">Total Value</p>
                          <p className="text-2xl font-bold text-yellow-400">
                            {formatNumber(player.totalValue)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="text-center p-6 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/40 rounded-lg">
                  <p className="text-2xl font-bold mb-2">
                    {(winner as any)?.isCoop ? '🤝 Co-op Victory!' :
                     (winner as any)?.players ? `🏆 ${winner.name} Wins!` :
                     `🏆 ${winner?.name} is the Champion!`}
                  </p>
                  <p className="text-gray-400">
                    {selectedMode.coop ? 'Pot split equally among all players' :
                     selectedMode.reverse ? 'Lowest value wins in Reverse Mode!' :
                     selectedMode.jackpot ? 'Decided by the wheel of fortune!' :
                     'Winner takes the glory!'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Case Details */}
        <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 border-gray-700/50">
          <CardHeader>
            <CardTitle>Items in {selectedCase.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {selectedCase.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg bg-gradient-to-br ${rarityColors[item.rarity]} ${rarityGlow[item.rarity]} hover:scale-105 transition-transform`}
                >
                  <div className="text-center">
                    <div className="text-5xl mb-2">{item.emoji}</div>
                    <p className="font-bold text-sm mb-1 truncate">{item.name}</p>
                    <p className="text-xs text-gray-300 capitalize mb-2">{item.rarity}</p>
                    <p className="text-yellow-400 font-bold">{formatNumber(item.value)}</p>
                    <p className="text-xs text-gray-400">{item.chance}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.02); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        .clip-triangle {
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        }
      `}</style>
    </div>
  )
}
