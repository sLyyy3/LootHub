'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Coins, Flame, History, Target, TrendingUp } from 'lucide-react'
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
}

export default function RoulettePage() {
  const { user, isLoading, refreshUser, updateUser } = useUser()
  const router = useRouter()
  const [betAmount, setBetAmount] = useState(100)
  const [bets, setBets] = useState<Bet[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [history, setHistory] = useState<number[]>([])
  const [rotation, setRotation] = useState(0)

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

    setBets([...bets, { ...bet, amount: betAmount }])
  }

  const clearBets = () => {
    if (!isSpinning) setBets([])
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

    // Generate random result
    const winningNumber = Math.floor(Math.random() * 37)
    const winningSlot = rouletteNumbers.find(n => n.num === winningNumber)!

    // Spin animation
    const spins = 5 + Math.random() * 3 // 5-8 full rotations
    const finalRotation = rotation + (360 * spins) + (winningNumber * (360 / 37))
    setRotation(finalRotation)

    // Wait for spin to complete
    setTimeout(async () => {
      setResult(winningNumber)
      setHistory([winningNumber, ...history.slice(0, 19)])

      // Calculate winnings
      let totalWin = 0
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
          toast.success(`🎉 Won ${formatNumber(totalWin)}! Profit: +${formatNumber(profit)}`, {
            duration: 4000,
            icon: '🎰',
          })
        } else {
          toast.error(`Lost ${formatNumber(totalBet)} coins`)
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
  const redCount = history.filter(n => {
    const slot = rouletteNumbers.find(s => s.num === n)
    return slot?.color === 'red'
  }).length
  const blackCount = history.filter(n => {
    const slot = rouletteNumbers.find(s => s.num === n)
    return slot?.color === 'black'
  }).length

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient-gold">Roulette</span>
          </h1>
          <p className="text-gray-400">Place your bets and spin the wheel!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wheel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Roulette Wheel</span>
                  <span className="text-gold">{formatNumber(user.coins)} coins</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-game-bg via-game-card to-game-bg rounded-lg">
                  {/* Wheel */}
                  <div className="relative w-80 h-80 mb-6">
                    <style jsx>{`
                      .wheel {
                        transition: transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99);
                      }
                    `}</style>

                    {/* Pointer */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
                      <div className="w-0 h-0 border-l-8 border-r-8 border-t-16 border-l-transparent border-r-transparent border-t-gold drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]" />
                    </div>

                    {/* Wheel Circle */}
                    <div
                      className="wheel w-full h-full rounded-full border-8 border-gold relative overflow-hidden shadow-[0_0_60px_rgba(234,179,8,0.4)]"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        background: 'conic-gradient(' +
                          rouletteNumbers.map((slot, idx) => {
                            const startAngle = (idx * 360) / 37
                            const endAngle = ((idx + 1) * 360) / 37
                            const color = slot.color === 'green' ? '#10b981' : slot.color === 'red' ? '#ef4444' : '#1f2937'
                            return `${color} ${startAngle}deg ${endAngle}deg`
                          }).join(', ') + ')',
                      }}
                    >
                      {rouletteNumbers.map((slot, idx) => (
                        <div
                          key={idx}
                          className="absolute left-1/2 top-1/2 origin-left"
                          style={{
                            transform: `rotate(${(idx * 360) / 37}deg) translateX(120px)`,
                          }}
                        >
                          <span className="text-white font-bold text-sm drop-shadow-lg">
                            {slot.num}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Result Display */}
                  {result !== null && (
                    <div className="text-center mb-6">
                      <div
                        className={`inline-block px-8 py-4 rounded-full border-4 ${
                          rouletteNumbers.find(n => n.num === result)?.color === 'red'
                            ? 'bg-red-500 border-red-600'
                            : rouletteNumbers.find(n => n.num === result)?.color === 'green'
                            ? 'bg-green-500 border-green-600'
                            : 'bg-gray-800 border-gray-900'
                        } shadow-[0_0_30px_rgba(234,179,8,0.6)] animate-pulse-slow`}
                      >
                        <span className="text-6xl font-bold text-white">{result}</span>
                      </div>
                      <p className="text-xl font-bold mt-2 text-gray-300 capitalize">
                        {rouletteNumbers.find(n => n.num === result)?.color}
                        {result !== 0 && ` • ${result % 2 === 0 ? 'Even' : 'Odd'}`}
                      </p>
                    </div>
                  )}

                  {/* Spin Button */}
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full max-w-md text-xl py-6"
                    onClick={spin}
                    isLoading={isSpinning}
                    disabled={bets.length === 0 || isSpinning || totalBet > user.coins}
                  >
                    {isSpinning ? 'Spinning...' : `Spin (${formatNumber(totalBet)} coins)`}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Betting Table */}
            <Card>
              <CardHeader>
                <CardTitle>Betting Table</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Bet Amount Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Bet Amount per Chip</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    min={10}
                    max={user.coins}
                    className="w-full px-4 py-3 bg-game-card border border-game-border rounded-lg focus:outline-none focus:border-gold"
                    disabled={isSpinning}
                  />
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {[10, 50, 100, 500, 1000].map((amount) => (
                      <Button
                        key={amount}
                        variant="ghost"
                        size="sm"
                        onClick={() => setBetAmount(amount)}
                        disabled={isSpinning}
                      >
                        {formatNumber(amount)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Outside Bets */}
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-400">Outside Bets (2:1 payout)</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => addBet({ type: 'red', payout: 2 })}
                      disabled={isSpinning}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      RED
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => addBet({ type: 'black', payout: 2 })}
                      disabled={isSpinning}
                      className="bg-gray-800 hover:bg-gray-900"
                    >
                      BLACK
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => addBet({ type: 'odd', payout: 2 })}
                      disabled={isSpinning}
                    >
                      ODD
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => addBet({ type: 'even', payout: 2 })}
                      disabled={isSpinning}
                    >
                      EVEN
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => addBet({ type: 'low', payout: 2 })}
                      disabled={isSpinning}
                    >
                      1-18
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => addBet({ type: 'high', payout: 2 })}
                      disabled={isSpinning}
                    >
                      19-36
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => addBet({ type: 'green', payout: 36 })}
                      disabled={isSpinning}
                      className="bg-green-500 hover:bg-green-600 col-span-2"
                    >
                      GREEN (0) - 36:1
                    </Button>
                  </div>

                  {/* Number Grid */}
                  <p className="text-sm font-bold text-gray-400 mt-4">Straight Up (36:1 payout)</p>
                  <div className="grid grid-cols-6 gap-1">
                    {Array.from({ length: 37 }, (_, i) => i).map((num) => {
                      const slot = rouletteNumbers.find(n => n.num === num)
                      return (
                        <button
                          key={num}
                          onClick={() => addBet({ type: 'number', value: num, payout: 36 })}
                          disabled={isSpinning}
                          className={`p-3 rounded font-bold text-sm ${
                            slot?.color === 'red'
                              ? 'bg-red-500 hover:bg-red-600'
                              : slot?.color === 'green'
                              ? 'bg-green-500 hover:bg-green-600'
                              : 'bg-gray-800 hover:bg-gray-900'
                          } ${isSpinning ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {num}
                        </button>
                      )
                    })}
                  </div>

                  {/* Current Bets */}
                  {bets.length > 0 && (
                    <div className="mt-4 p-4 bg-game-bg rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold">Current Bets</span>
                        <Button variant="danger" size="sm" onClick={clearBets} disabled={isSpinning}>
                          Clear All
                        </Button>
                      </div>
                      <div className="space-y-1 text-sm">
                        {bets.map((bet, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>
                              {bet.type === 'number' ? `#${bet.value}` : bet.type.toUpperCase()}
                              {' '}({bet.payout}:1)
                            </span>
                            <span className="text-gold">{formatNumber(bet.amount)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-game-border mt-2 pt-2 flex justify-between font-bold">
                        <span>Total:</span>
                        <span className="text-gold">{formatNumber(totalBet)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-gold" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-game-bg rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Balance</div>
                  <div className="text-xl text-gold font-bold">{formatNumber(user.coins)}</div>
                </div>
                <div className="p-3 bg-game-bg rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Total Bet</div>
                  <div className="text-xl font-bold">{formatNumber(totalBet)}</div>
                </div>
                <div className="p-3 bg-game-bg rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Last 20 Spins</div>
                  <div className="text-lg font-bold">
                    <span className="text-red-500">{redCount}R</span> /{' '}
                    <span className="text-gray-400">{blackCount}B</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-500" />
                  Recent Numbers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">No spins yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {history.map((num, idx) => {
                      const slot = rouletteNumbers.find(n => n.num === num)
                      return (
                        <div
                          key={idx}
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                            slot?.color === 'red'
                              ? 'bg-red-500'
                              : slot?.color === 'green'
                              ? 'bg-green-500'
                              : 'bg-gray-800'
                          }`}
                        >
                          {num}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Payouts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Straight Up:</span>
                    <span className="font-bold text-gold">36:1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Red/Black:</span>
                    <span className="font-bold">2:1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Odd/Even:</span>
                    <span className="font-bold">2:1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">1-18 / 19-36:</span>
                    <span className="font-bold">2:1</span>
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
