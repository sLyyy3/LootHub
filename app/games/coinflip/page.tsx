'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Coins, TrendingUp, TrendingDown } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

export default function CoinflipPage() {
  const { user, isLoading, refreshUser, updateUser } = useUser()
  const router = useRouter()
  const [betAmount, setBetAmount] = useState(100)
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails'>('heads')
  const [isFlipping, setIsFlipping] = useState(false)
  const [result, setResult] = useState<'heads' | 'tails' | null>(null)
  const [won, setWon] = useState<boolean | null>(null)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

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
            toast.success(`🎉 You won ${formatNumber(betAmount * 2)} coins!`, {
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

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient-gold">Coinflip</span>
          </h1>
          <p className="text-gray-400">Choose heads or tails and double your bet!</p>
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
              <div className="flex justify-center items-center min-h-[300px]">
                <div className="relative w-64 h-64">
                  <style jsx>{`
                    @keyframes flipHeads {
                      0% { transform: rotateY(0deg); }
                      100% { transform: rotateY(1800deg); }
                    }
                    @keyframes flipTails {
                      0% { transform: rotateY(0deg); }
                      100% { transform: rotateY(1980deg); }
                    }
                    .coin {
                      transform-style: preserve-3d;
                      transition: transform 3s cubic-bezier(0.34, 1.56, 0.64, 1);
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
                      justify-content: center;
                      font-size: 4rem;
                      font-weight: bold;
                      box-shadow: 0 0 40px rgba(234, 179, 8, 0.6),
                                  inset 0 0 20px rgba(0, 0, 0, 0.3);
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
                        : ''
                    }`}
                    style={{
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                    }}
                  >
                    <div className="coin-face coin-heads">
                      <span className="text-white drop-shadow-lg">H</span>
                    </div>
                    <div className="coin-face coin-tails">
                      <span className="text-white drop-shadow-lg">T</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Result Display */}
              {showResult && won !== null && (
                <div className={`text-center p-6 rounded-lg ${
                  won
                    ? 'bg-gradient-to-r from-green-500/20 to-green-600/20 border-2 border-green-500'
                    : 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-2 border-red-500'
                } animate-pulse`}>
                  <div className={`text-3xl font-bold mb-2 ${won ? 'text-green-500' : 'text-red-500'}`}>
                    {won ? '🎉 YOU WON! 🎉' : '💔 YOU LOST 💔'}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-2xl font-bold">
                    {won ? (
                      <>
                        <TrendingUp className="w-8 h-8 text-green-500" />
                        <span className="text-green-500">+{formatNumber(betAmount * 2)} coins</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-8 h-8 text-red-500" />
                        <span className="text-red-500">-{formatNumber(betAmount)} coins</span>
                      </>
                    )}
                  </div>
                  <div className="mt-2 text-gray-400">
                    Result: <span className="font-bold text-white uppercase">{result}</span>
                  </div>
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
                        ? 'border-yellow-500 bg-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                        : 'border-game-border bg-game-card hover:border-yellow-500/50'
                    } ${isFlipping ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="text-4xl mb-2">👑</div>
                    <div className="text-xl font-bold text-yellow-500">HEADS</div>
                    <div className="text-sm text-gray-400 mt-1">50% chance</div>
                  </button>

                  <button
                    onClick={() => !isFlipping && setSelectedSide('tails')}
                    disabled={isFlipping}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      selectedSide === 'tails'
                        ? 'border-red-500 bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                        : 'border-game-border bg-game-card hover:border-red-500/50'
                    } ${isFlipping ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="text-4xl mb-2">🎯</div>
                    <div className="text-xl font-bold text-red-500">TAILS</div>
                    <div className="text-sm text-gray-400 mt-1">50% chance</div>
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
                  className="w-full px-4 py-3 bg-game-card border border-game-border rounded-lg focus:outline-none focus:border-gold transition-colors text-lg"
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBetAmount(user.coins)}
                  disabled={isFlipping}
                  className="w-full mt-2 font-bold text-gold"
                >
                  MAX ({formatNumber(user.coins)})
                </Button>
              </div>

              {/* Play Button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full text-xl py-6"
                onClick={playCoinflip}
                isLoading={isFlipping}
                disabled={betAmount < 10 || betAmount > user.coins || isFlipping}
              >
                <Coins className="w-6 h-6 mr-2" />
                {isFlipping ? 'Flipping...' : `Flip Coin (${formatNumber(betAmount)} coins)`}
              </Button>
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="space-y-6">
            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Game Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-game-bg rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Your Balance</div>
                  <div className="text-xl text-gold font-bold">{formatNumber(user.coins)}</div>
                </div>
                <div className="p-3 bg-game-bg rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Win Chance</div>
                  <div className="text-xl font-bold">50.0%</div>
                </div>
                <div className="p-3 bg-game-bg rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Current Bet</div>
                  <div className="text-xl font-bold">{formatNumber(betAmount)}</div>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Potential Win</div>
                  <div className="text-xl text-green-500 font-bold">
                    +{formatNumber(betAmount * 2)}
                  </div>
                </div>
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
                    <span>Enter your bet amount (min 10 coins)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gold mr-2">3.</span>
                    <span>Click "Flip Coin" and watch the magic!</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gold mr-2">4.</span>
                    <span>Win 2x your bet if you guess correctly!</span>
                  </li>
                </ul>

                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="text-xs text-yellow-500 font-bold mb-1">💡 PRO TIP</div>
                  <div className="text-xs text-gray-300">
                    Start with smaller bets to build your balance safely!
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
