'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Coins, TrendingUp, TrendingDown, History, Flame, Target } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

interface FlipHistory {
  result: 'heads' | 'tails'
  won: boolean
  amount: number
  time: Date
}

export default function CoinflipPage() {
  const { user, isLoading, refreshUser, updateUser } = useUser()
  const router = useRouter()
  const [betAmount, setBetAmount] = useState(100)
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails'>('heads')
  const [isFlipping, setIsFlipping] = useState(false)
  const [result, setResult] = useState<'heads' | 'tails' | null>(null)
  const [won, setWon] = useState<boolean | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [flipHistory, setFlipHistory] = useState<FlipHistory[]>([])
  const [currentStreak, setCurrentStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [totalFlips, setTotalFlips] = useState(0)
  const [totalWins, setTotalWins] = useState(0)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    loadStats()
  }, [user])

  const loadStats = async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('player_id', user.id)
        .eq('type', 'coinflip')
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) {
        setTotalFlips(data.length)
        setTotalWins(data.filter(g => g.result === 'win').length)

        // Calculate best streak
        let streak = 0
        let maxStreak = 0
        data.reverse().forEach(game => {
          if (game.result === 'win') {
            streak++
            maxStreak = Math.max(maxStreak, streak)
          } else {
            streak = 0
          }
        })
        setBestStreak(maxStreak)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const playCoinflip = async () => {
    if (!user || betAmount > user.coins || betAmount < 10) {
      toast.error('Invalid bet amount')
      return
    }

    setIsFlipping(true)
    setResult(null)
    setWon(null)
    setShowResult(false)

    try {
      // Simulate coin flip
      const flipResult: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails'
      const didWin = flipResult === selectedSide

      // Wait for animation to complete
      setTimeout(() => {
        setResult(flipResult)
        setWon(didWin)
        setShowResult(true)

        // Update history
        const newHistory: FlipHistory = {
          result: flipResult,
          won: didWin,
          amount: betAmount,
          time: new Date(),
        }
        setFlipHistory(prev => [newHistory, ...prev.slice(0, 9)])

        // Update streak
        if (didWin) {
          setCurrentStreak(prev => {
            const newStreak = prev + 1
            setBestStreak(current => Math.max(current, newStreak))
            return newStreak
          })
          setTotalWins(prev => prev + 1)
        } else {
          setCurrentStreak(0)
        }
        setTotalFlips(prev => prev + 1)
      }, 3000) // Coin flip animation duration

      // Update database after animation
      setTimeout(async () => {
        const newCoins = didWin ? user.coins + betAmount : user.coins - betAmount
        const xpGain = didWin ? Math.floor(betAmount / 10) : Math.floor(betAmount / 20)
        const newXp = user.xp + xpGain

        // Optimistically update UI
        updateUser({ coins: newCoins, xp: newXp })

        try {
          const { error } = await supabase
            .from('users')
            .update({
              coins: newCoins,
              xp: newXp,
            })
            .eq('id', user.id)

          if (error) throw error

          // Save game history
          await supabase.from('games').insert([
            {
              player_id: user.id,
              type: 'coinflip',
              bet_amount: betAmount,
              result: didWin ? 'win' : 'loss',
              payout: didWin ? betAmount * 2 : 0,
            },
          ])

          if (didWin) {
            const streakBonus = currentStreak >= 3 ? ` 🔥 ${currentStreak + 1} Win Streak!` : ''
            toast.success(`🎉 You won ${formatNumber(betAmount * 2)} coins!${streakBonus}`, {
              duration: 3000,
              icon: '💰',
            })
          } else {
            toast.error(`You lost ${formatNumber(betAmount)} coins`, {
              duration: 3000,
            })
          }
        } catch (error) {
          toast.error('Failed to play game')
          // Revert on error
          await refreshUser()
        } finally {
          setIsFlipping(false)
        }
      }, 3500)
    } catch (error) {
      toast.error('Failed to play game')
      setIsFlipping(false)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12" />
      </div>
    )
  }

  const winRate = totalFlips > 0 ? ((totalWins / totalFlips) * 100).toFixed(1) : '0.0'

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient-gold">Coinflip</span>
          </h1>
          <p className="text-gray-400">Choose heads or tails and double your bet!</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-game-card border border-game-border rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Total Flips</div>
            <div className="text-2xl font-bold">{totalFlips}</div>
          </div>
          <div className="bg-game-card border border-game-border rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Win Rate</div>
            <div className="text-2xl font-bold text-green-win">{winRate}%</div>
          </div>
          <div className="bg-game-card border border-game-border rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Current Streak</div>
            <div className="text-2xl font-bold text-gold flex items-center gap-1">
              {currentStreak > 0 && <Flame className="w-5 h-5 text-orange-500" />}
              {currentStreak}
            </div>
          </div>
          <div className="bg-game-card border border-game-border rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Best Streak</div>
            <div className="text-2xl font-bold text-purple-epic">{bestStreak}</div>
          </div>
          <div className="bg-game-card border border-game-border rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Balance</div>
            <div className="text-2xl font-bold text-gold">{formatNumber(user.coins)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Place Your Bet</span>
                <span className="text-gold text-lg">{formatNumber(user.coins)} coins</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 3D Coin Display */}
              <div className="flex justify-center items-center min-h-[320px] bg-gradient-to-b from-game-bg via-game-card to-game-bg rounded-lg p-8">
                <div className="relative w-64 h-64">
                  <style jsx>{`
                    @keyframes flipHeads {
                      0% { transform: rotateY(0deg) rotateX(0deg); }
                      50% { transform: rotateY(900deg) rotateX(20deg) scale(1.1); }
                      100% { transform: rotateY(1800deg) rotateX(0deg) scale(1); }
                    }
                    @keyframes flipTails {
                      0% { transform: rotateY(0deg) rotateX(0deg); }
                      50% { transform: rotateY(990deg) rotateX(20deg) scale(1.1); }
                      100% { transform: rotateY(1980deg) rotateX(0deg) scale(1); }
                    }
                    @keyframes float {
                      0%, 100% { transform: translateY(0px); }
                      50% { transform: translateY(-10px); }
                    }
                    .coin {
                      transform-style: preserve-3d;
                      transition: transform 0.3s ease;
                    }
                    .coin.idle {
                      animation: float 3s ease-in-out infinite;
                    }
                    .coin.flipping-heads {
                      animation: flipHeads 3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    }
                    .coin.flipping-tails {
                      animation: flipTails 3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    }
                    .coin-face {
                      position: absolute;
                      width: 100%;
                      height: 100%;
                      backface-visibility: hidden;
                      border-radius: 50%;
                      display: flex;
                      align-items: center;
                      justify-center: center;
                      font-size: 5rem;
                      font-weight: bold;
                      box-shadow: 0 10px 60px rgba(234, 179, 8, 0.4),
                                  inset 0 0 30px rgba(0, 0, 0, 0.3);
                      border: 8px solid rgba(234, 179, 8, 0.3);
                    }
                    .coin-heads {
                      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
                      transform: rotateY(0deg);
                    }
                    .coin-tails {
                      background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%);
                      transform: rotateY(180deg);
                    }
                  `}</style>

                  <div
                    className={`coin ${
                      isFlipping && result
                        ? result === 'heads'
                          ? 'flipping-heads'
                          : 'flipping-tails'
                        : 'idle'
                    }`}
                    style={{
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                    }}
                  >
                    <div className="coin-face coin-heads">
                      <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">H</span>
                    </div>
                    <div className="coin-face coin-tails">
                      <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">T</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Result Display */}
              {showResult && won !== null && (
                <div className={`text-center p-6 rounded-lg border-2 ${
                  won
                    ? 'bg-gradient-to-r from-green-500/10 via-green-600/10 to-green-500/10 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]'
                    : 'bg-gradient-to-r from-red-500/10 via-red-600/10 to-red-500/10 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                } animate-pulse-slow`}>
                  <div className={`text-4xl font-bold mb-3 ${won ? 'text-green-500' : 'text-red-500'}`}>
                    {won ? '🎉 YOU WON! 🎉' : '💔 YOU LOST 💔'}
                  </div>
                  <div className="flex items-center justify-center gap-3 text-3xl font-bold mb-2">
                    {won ? (
                      <>
                        <TrendingUp className="w-10 h-10 text-green-500" />
                        <span className="text-green-500">+{formatNumber(betAmount * 2)} coins</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-10 h-10 text-red-500" />
                        <span className="text-red-500">-{formatNumber(betAmount)} coins</span>
                      </>
                    )}
                  </div>
                  <div className="mt-3 text-gray-300">
                    The coin landed on <span className="font-bold text-white uppercase text-xl">{result}</span>
                  </div>
                  {won && currentStreak >= 2 && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-orange-500">
                      <Flame className="w-6 h-6" />
                      <span className="font-bold text-lg">{currentStreak} Win Streak!</span>
                      <Flame className="w-6 h-6" />
                    </div>
                  )}
                </div>
              )}

              {/* Side Selection */}
              <div>
                <label className="block text-sm font-medium mb-3">Choose Your Side</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => !isFlipping && setSelectedSide('heads')}
                    disabled={isFlipping}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      selectedSide === 'heads'
                        ? 'border-yellow-500 bg-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.4)] scale-105'
                        : 'border-game-border bg-game-card hover:border-yellow-500/50 hover:scale-102'
                    } ${isFlipping ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="text-5xl mb-3">👑</div>
                    <div className="text-2xl font-bold text-yellow-500 mb-1">HEADS</div>
                    <div className="text-sm text-gray-400">50% chance • 2x payout</div>
                  </button>

                  <button
                    onClick={() => !isFlipping && setSelectedSide('tails')}
                    disabled={isFlipping}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      selectedSide === 'tails'
                        ? 'border-red-500 bg-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.4)] scale-105'
                        : 'border-game-border bg-game-card hover:border-red-500/50 hover:scale-102'
                    } ${isFlipping ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="text-5xl mb-3">🎯</div>
                    <div className="text-2xl font-bold text-red-500 mb-1">TAILS</div>
                    <div className="text-sm text-gray-400">50% chance • 2x payout</div>
                  </button>
                </div>
              </div>

              {/* Bet Amount */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Bet Amount (10 - {formatNumber(user.coins)})
                </label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  min={10}
                  max={user.coins}
                  className="w-full px-4 py-4 bg-game-card border-2 border-game-border rounded-lg focus:outline-none focus:border-gold transition-colors text-xl font-bold text-center"
                  disabled={isFlipping}
                />
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[100, 500, 1000, 5000].map((amount) => (
                    <Button
                      key={amount}
                      variant="ghost"
                      size="sm"
                      onClick={() => setBetAmount(amount)}
                      disabled={isFlipping || amount > user.coins}
                      className="font-bold"
                    >
                      {formatNumber(amount)}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBetAmount(Math.floor(user.coins / 2))}
                    disabled={isFlipping}
                    className="font-bold"
                  >
                    1/2
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBetAmount(Math.floor(user.coins / 4))}
                    disabled={isFlipping}
                    className="font-bold"
                  >
                    1/4
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBetAmount(user.coins)}
                    disabled={isFlipping}
                    className="font-bold text-gold"
                  >
                    MAX
                  </Button>
                </div>
              </div>

              {/* Play Button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full text-2xl py-8 shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:shadow-[0_0_40px_rgba(234,179,8,0.5)] transition-all"
                onClick={playCoinflip}
                isLoading={isFlipping}
                disabled={betAmount < 10 || betAmount > user.coins || isFlipping}
              >
                <Coins className="w-8 h-8 mr-3" />
                {isFlipping ? 'Flipping...' : `Flip Coin (${formatNumber(betAmount)} coins)`}
              </Button>

              {/* Potential Win/Loss Display */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">If you win</div>
                  <div className="text-2xl font-bold text-green-500">
                    +{formatNumber(betAmount * 2)}
                  </div>
                </div>
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">If you lose</div>
                  <div className="text-2xl font-bold text-red-500">
                    -{formatNumber(betAmount)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-gold" />
                  Your Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-game-bg rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Balance</div>
                  <div className="text-xl text-gold font-bold">{formatNumber(user.coins)}</div>
                </div>
                <div className="p-3 bg-game-bg rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Win Rate</div>
                  <div className="text-xl font-bold">{winRate}%</div>
                </div>
                <div className="p-3 bg-game-bg rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Total Flips</div>
                  <div className="text-xl font-bold">{totalFlips}</div>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Potential Win</div>
                  <div className="text-xl text-green-500 font-bold">
                    +{formatNumber(betAmount * 2)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Flips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-rare" />
                  Recent Flips
                </CardTitle>
              </CardHeader>
              <CardContent>
                {flipHistory.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">No flips yet</p>
                ) : (
                  <div className="space-y-2">
                    {flipHistory.map((flip, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          flip.won
                            ? 'bg-green-500/10 border border-green-500/30'
                            : 'bg-red-500/10 border border-red-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">
                            {flip.result === 'heads' ? '👑' : '🎯'}
                          </span>
                          <div>
                            <p className="font-bold text-sm uppercase">{flip.result}</p>
                            <p className="text-xs text-gray-400">
                              {flip.time.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className={`font-bold ${flip.won ? 'text-green-500' : 'text-red-500'}`}>
                          {flip.won ? '+' : '-'}{formatNumber(flip.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rules Card */}
            <Card>
              <CardHeader>
                <CardTitle>How to Play</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-gray-400 space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-gold mr-2">1.</span>
                    <span>Choose Heads 👑 or Tails 🎯</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gold mr-2">2.</span>
                    <span>Enter your bet (min 10 coins)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gold mr-2">3.</span>
                    <span>Watch the coin flip!</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gold mr-2">4.</span>
                    <span>Win 2x your bet if correct!</span>
                  </li>
                </ul>

                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="text-xs text-yellow-500 font-bold mb-1 flex items-center gap-1">
                    <Flame className="w-4 h-4" />
                    WIN STREAKS
                  </div>
                  <div className="text-xs text-gray-300">
                    Build streaks for extra glory! Your best: {bestStreak}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
