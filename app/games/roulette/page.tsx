'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Coins, Flame, History, Target, TrendingUp, CircleDot, Sparkles, Zap } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

const rouletteNumbers = [
  { num: 0, color: 'green' },
  { num: 32, color: 'red' },
  { num: 15, color: 'black' },
  { num: 19, color: 'red' },
  { num: 4, color: 'black' },
  { num: 21, color: 'red' },
  { num: 2, color: 'black' },
  { num: 25, color: 'red' },
  { num: 17, color: 'black' },
  { num: 34, color: 'red' },
  { num: 6, color: 'black' },
  { num: 27, color: 'red' },
  { num: 13, color: 'black' },
  { num: 36, color: 'red' },
  { num: 11, color: 'black' },
  { num: 30, color: 'red' },
  { num: 8, color: 'black' },
  { num: 23, color: 'red' },
  { num: 10, color: 'black' },
  { num: 5, color: 'red' },
  { num: 24, color: 'black' },
  { num: 16, color: 'red' },
  { num: 33, color: 'black' },
  { num: 1, color: 'red' },
  { num: 20, color: 'black' },
  { num: 14, color: 'red' },
  { num: 31, color: 'black' },
  { num: 9, color: 'red' },
  { num: 22, color: 'black' },
  { num: 18, color: 'red' },
  { num: 29, color: 'black' },
  { num: 7, color: 'red' },
  { num: 28, color: 'black' },
  { num: 12, color: 'red' },
  { num: 35, color: 'black' },
  { num: 3, color: 'red' },
  { num: 26, color: 'black' },
]

interface Bet {
  type: 'red' | 'black' | 'green' | 'odd' | 'even' | 'low' | 'high' | 'number'
  value?: number
  amount: number
  payout: number
  label: string
}

export default function RoulettePage() {
  const { user, isLoading, refreshUser, updateUser } = useUser()
  const router = useRouter()
  const [betAmount, setBetAmount] = useState(100)
  const [bets, setBets] = useState<Bet[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [resultColor, setResultColor] = useState<string>('')
  const [history, setHistory] = useState<number[]>([])
  const [wheelRotation, setWheelRotation] = useState(0)
  const [ballPosition, setBallPosition] = useState(0)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  const addBet = (bet: Omit<Bet, 'amount'>) => {
    if (isSpinning) return
    if (!user || betAmount > user.coins) {
      toast.error('Insufficient coins')
      return
    }

    const totalBetAfter = bets.reduce((sum, b) => sum + b.amount, 0) + betAmount
    if (totalBetAfter > user.coins) {
      toast.error('Insufficient coins for all bets')
      return
    }

    setBets([...bets, { ...bet, amount: betAmount }])
    toast.success(`Bet placed: ${bet.label} - ${formatNumber(betAmount)}`, { duration: 2000 })
  }

  const clearBets = () => {
    if (!isSpinning) {
      setBets([])
      toast.success('Bets cleared')
    }
  }

  const spin = async () => {
    if (bets.length === 0) {
      toast.error('Place at least one bet!')
      return
    }

    const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0)
    if (!user || totalBet > user.coins) {
      toast.error('Insufficient coins')
      return
    }

    setIsSpinning(true)
    setResult(null)
    setResultColor('')

    // Generate random result
    const winningNumber = Math.floor(Math.random() * 37)
    const winningSlot = rouletteNumbers.find(n => n.num === winningNumber)!
    const winningIndex = rouletteNumbers.findIndex(n => n.num === winningNumber)

    // Spin animation - rotate wheel and ball
    const spins = 5 + Math.random() * 2 // 5-7 full rotations
    const wheelFinalRotation = wheelRotation + (360 * spins)
    const ballFinalPosition = (360 / rouletteNumbers.length) * winningIndex

    setWheelRotation(wheelFinalRotation)
    setBallPosition(wheelFinalRotation + 360 * 2 + ballFinalPosition)

    // Wait for spin to complete
    setTimeout(async () => {
      setResult(winningNumber)
      setResultColor(winningSlot.color)
      setHistory([winningNumber, ...history.slice(0, 19)])

      // Calculate winnings
      let totalWin = 0
      let wonBets = 0

      bets.forEach(bet => {
        let won = false

        if (bet.type === 'number' && bet.value === winningNumber) {
          won = true
          totalWin += bet.amount * bet.payout
        } else if (bet.type === 'red' && winningSlot.color === 'red' && winningNumber !== 0) {
          won = true
          totalWin += bet.amount * bet.payout
        } else if (bet.type === 'black' && winningSlot.color === 'black') {
          won = true
          totalWin += bet.amount * bet.payout
        } else if (bet.type === 'green' && winningNumber === 0) {
          won = true
          totalWin += bet.amount * bet.payout
        } else if (bet.type === 'odd' && winningNumber % 2 === 1 && winningNumber !== 0) {
          won = true
          totalWin += bet.amount * bet.payout
        } else if (bet.type === 'even' && winningNumber % 2 === 0 && winningNumber !== 0) {
          won = true
          totalWin += bet.amount * bet.payout
        } else if (bet.type === 'low' && winningNumber >= 1 && winningNumber <= 18) {
          won = true
          totalWin += bet.amount * bet.payout
        } else if (bet.type === 'high' && winningNumber >= 19 && winningNumber <= 36) {
          won = true
          totalWin += bet.amount * bet.payout
        }

        if (won) wonBets++
      })

      const profit = totalWin - totalBet
      const newCoins = user.coins + profit
      const xpGain = Math.floor(totalBet / 10)
      const newXp = user.xp + xpGain

      // Update UI
      updateUser({ coins: newCoins, xp: newXp })

      try {
        const { error } = await supabase
          .from('users')
          .update({ coins: newCoins, xp: newXp })
          .eq('id', user.id)

        if (error) throw error

        await supabase.from('games').insert([
          {
            player_id: user.id,
            type: 'roulette',
            bet_amount: totalBet,
            result: profit >= 0 ? 'win' : 'loss',
            payout: totalWin,
            multiplier: winningNumber,
          },
        ])

        if (profit > 0) {
          toast.success(
            `🎉 Won ${formatNumber(totalWin)}! Profit: +${formatNumber(profit)} | ${wonBets}/${bets.length} bets hit!`,
            {
              duration: 5000,
              icon: '🎰',
            }
          )
        } else if (profit === 0) {
          toast('Break even!', { icon: '🟡' })
        } else {
          toast.error(`Lost ${formatNumber(totalBet)} coins`, { duration: 3000 })
        }
      } catch (error) {
        toast.error('Failed to play game')
        await refreshUser()
      } finally {
        setIsSpinning(false)
        setBets([])
      }
    }, 5000)
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12" />
      </div>
    )
  }

  const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0)
  const canAfford = user.coins >= totalBet
  const redCount = history.filter(n => {
    const slot = rouletteNumbers.find(s => s.num === n)
    return slot?.color === 'red'
  }).length
  const blackCount = history.filter(n => {
    const slot = rouletteNumbers.find(s => s.num === n)
    return slot?.color === 'black'
  }).length
  const greenCount = history.filter(n => n === 0).length

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <CircleDot className="w-10 h-10 text-red-500" />
            <span className="text-gradient-gold">Roulette</span>
          </h1>
          <p className="text-gray-400">Place your bets and spin the wheel!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Roulette Wheel */}
            <Card>
              <CardContent className="p-8">
                <div className="relative w-full aspect-square max-w-md mx-auto">
                  {/* Wheel Container */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-800 via-gray-900 to-black border-8 border-gold shadow-2xl overflow-hidden">
                    {/* Rotating Wheel */}
                    <div
                      className="absolute inset-4 rounded-full transition-transform duration-[5000ms] ease-out"
                      style={{
                        transform: `rotate(${wheelRotation}deg)`,
                        background: `conic-gradient(
                          ${rouletteNumbers
                            .map((slot, idx) => {
                              const start = (idx / rouletteNumbers.length) * 360
                              const end = ((idx + 1) / rouletteNumbers.length) * 360
                              const color =
                                slot.color === 'red'
                                  ? '#ef4444'
                                  : slot.color === 'green'
                                  ? '#10b981'
                                  : '#1f2937'
                              return `${color} ${start}deg ${end}deg`
                            })
                            .join(', ')}
                        )`,
                      }}
                    >
                      {/* Numbers on wheel */}
                      {rouletteNumbers.map((slot, idx) => {
                        const angle = (idx / rouletteNumbers.length) * 360
                        return (
                          <div
                            key={idx}
                            className="absolute top-1/2 left-1/2 origin-top-left"
                            style={{
                              transform: `rotate(${angle}deg) translateX(45%)`,
                            }}
                          >
                            <span className="text-white font-bold text-xs drop-shadow-lg">
                              {slot.num}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Center Hub */}
                    <div className="absolute inset-[40%] rounded-full bg-gradient-to-br from-gold via-yellow-600 to-yellow-800 border-4 border-yellow-400 shadow-2xl flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-white animate-pulse" />
                    </div>

                    {/* Ball */}
                    <div
                      className="absolute top-[10%] left-1/2 -ml-2 w-4 h-4 transition-transform duration-[5000ms] ease-out"
                      style={{
                        transform: `rotate(${ballPosition}deg) translateX(140px)`,
                      }}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-lg border-2 border-gray-300 animate-pulse" />
                    </div>
                  </div>

                  {/* Result Display */}
                  {result !== null && !isSpinning && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div
                        className={`px-8 py-4 rounded-xl border-4 shadow-2xl animate-bounce ${
                          resultColor === 'red'
                            ? 'bg-red-500 border-red-300'
                            : resultColor === 'green'
                            ? 'bg-green-500 border-green-300'
                            : 'bg-gray-800 border-gray-600'
                        }`}
                      >
                        <p className="text-6xl font-bold text-white drop-shadow-lg">{result}</p>
                      </div>
                    </div>
                  )}

                  {/* Spinning Indicator */}
                  {isSpinning && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="px-6 py-3 bg-gold/90 rounded-xl border-2 border-yellow-300 shadow-xl">
                        <p className="text-2xl font-bold text-white animate-pulse">SPINNING...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Spin Button */}
                <div className="mt-6 text-center">
                  <Button
                    onClick={spin}
                    disabled={isSpinning || bets.length === 0 || !canAfford}
                    variant="primary"
                    className="px-12 py-4 text-xl"
                  >
                    {isSpinning ? (
                      <>
                        <div className="spinner w-6 h-6 mr-2" />
                        Spinning...
                      </>
                    ) : (
                      <>
                        <CircleDot className="w-6 h-6 mr-2" />
                        Spin ({formatNumber(totalBet)} coins)
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Betting Grid */}
            <Card>
              <CardHeader>
                <CardTitle>Place Your Bets</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Bet Amount */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Bet Amount</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
                      disabled={isSpinning}
                      className="flex-1 px-4 py-2 bg-game-card border border-game-border rounded-lg focus:outline-none focus:border-gold"
                      min="10"
                      step="10"
                    />
                    {[100, 500, 1000, 5000].map((amount) => (
                      <Button
                        key={amount}
                        variant="secondary"
                        size="sm"
                        onClick={() => setBetAmount(amount)}
                        disabled={isSpinning}
                      >
                        {formatNumber(amount)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Color Bets */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <button
                    onClick={() => addBet({ type: 'red', payout: 2, label: 'Red (2x)' })}
                    disabled={isSpinning}
                    className="p-6 bg-red-600 hover:bg-red-500 rounded-lg border-2 border-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                  >
                    <div className="text-3xl mb-2">🔴</div>
                    <p className="font-bold text-white">RED</p>
                    <p className="text-sm text-white/80">2x</p>
                  </button>
                  <button
                    onClick={() => addBet({ type: 'green', payout: 14, label: 'Green (14x)' })}
                    disabled={isSpinning}
                    className="p-6 bg-green-600 hover:bg-green-500 rounded-lg border-2 border-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                  >
                    <div className="text-3xl mb-2">🟢</div>
                    <p className="font-bold text-white">GREEN</p>
                    <p className="text-sm text-white/80">14x</p>
                  </button>
                  <button
                    onClick={() => addBet({ type: 'black', payout: 2, label: 'Black (2x)' })}
                    disabled={isSpinning}
                    className="p-6 bg-gray-800 hover:bg-gray-700 rounded-lg border-2 border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                  >
                    <div className="text-3xl mb-2">⚫</div>
                    <p className="font-bold text-white">BLACK</p>
                    <p className="text-sm text-white/80">2x</p>
                  </button>
                </div>

                {/* Range Bets */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => addBet({ type: 'low', payout: 2, label: '1-18 (2x)' })}
                    disabled={isSpinning}
                    className="p-4 bg-blue-600 hover:bg-blue-500 rounded-lg border-2 border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <p className="font-bold text-white">1-18</p>
                    <p className="text-sm text-white/80">Low (2x)</p>
                  </button>
                  <button
                    onClick={() => addBet({ type: 'high', payout: 2, label: '19-36 (2x)' })}
                    disabled={isSpinning}
                    className="p-4 bg-purple-600 hover:bg-purple-500 rounded-lg border-2 border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <p className="font-bold text-white">19-36</p>
                    <p className="text-sm text-white/80">High (2x)</p>
                  </button>
                  <button
                    onClick={() => addBet({ type: 'even', payout: 2, label: 'Even (2x)' })}
                    disabled={isSpinning}
                    className="p-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg border-2 border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <p className="font-bold text-white">EVEN</p>
                    <p className="text-sm text-white/80">2x</p>
                  </button>
                  <button
                    onClick={() => addBet({ type: 'odd', payout: 2, label: 'Odd (2x)' })}
                    disabled={isSpinning}
                    className="p-4 bg-pink-600 hover:bg-pink-500 rounded-lg border-2 border-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <p className="font-bold text-white">ODD</p>
                    <p className="text-sm text-white/80">2x</p>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Current Bets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Your Bets</span>
                  {bets.length > 0 && (
                    <Button variant="danger" size="sm" onClick={clearBets} disabled={isSpinning}>
                      Clear All
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bets.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No bets placed</p>
                ) : (
                  <div className="space-y-2">
                    {bets.map((bet, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-game-bg rounded-lg border border-game-border flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold">{bet.label}</p>
                          <p className="text-sm text-gray-400">Payout: {bet.payout}x</p>
                        </div>
                        <p className="text-gold font-bold">{formatNumber(bet.amount)}</p>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-gray-700">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">Total Bet:</span>
                        <span className={`text-xl font-bold ${canAfford ? 'text-gold' : 'text-red-500'}`}>
                          {formatNumber(totalBet)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Recent Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No history yet</p>
                ) : (
                  <>
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {history.slice(0, 20).map((num, idx) => {
                        const slot = rouletteNumbers.find(s => s.num === num)
                        return (
                          <div
                            key={idx}
                            className={`aspect-square rounded-lg flex items-center justify-center font-bold text-white ${
                              slot?.color === 'red'
                                ? 'bg-red-500'
                                : slot?.color === 'green'
                                ? 'bg-green-500'
                                : 'bg-gray-700'
                            }`}
                          >
                            {num}
                          </div>
                        )
                      })}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-red-500/20 border border-red-500 rounded p-2 text-center">
                        <p className="text-red-400 font-bold">Red: {redCount}</p>
                      </div>
                      <div className="bg-green-500/20 border border-green-500 rounded p-2 text-center">
                        <p className="text-green-400 font-bold">Green: {greenCount}</p>
                      </div>
                      <div className="bg-gray-500/20 border border-gray-500 rounded p-2 text-center">
                        <p className="text-gray-300 font-bold">Black: {blackCount}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Your Coins</span>
                  <span className="text-gold font-bold">{formatNumber(user.coins)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Bets</span>
                  <span className="font-bold">{bets.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Spins</span>
                  <span className="font-bold">{history.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
