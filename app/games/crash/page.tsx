'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TrendingUp } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

export default function CrashPage() {
  const { user, isLoading, refreshUser } = useUser()
  const router = useRouter()
  const [betAmount, setBetAmount] = useState(100)
  const [multiplier, setMultiplier] = useState(1.00)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasCashedOut, setHasCashedOut] = useState(false)
  const [crashPoint, setCrashPoint] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isPlaying && !hasCashedOut) {
      interval = setInterval(() => {
        setMultiplier((prev) => {
          const increase = Math.random() * 0.1 + 0.05
          const newMultiplier = prev + increase

          // Random crash between 1.5x and 10x
          if (crashPoint && newMultiplier >= crashPoint) {
            handleCrash()
            return prev
          }

          return newMultiplier
        })
      }, 100)
    }

    return () => clearInterval(interval)
  }, [isPlaying, hasCashedOut, crashPoint])

  const startGame = () => {
    if (!user || betAmount > user.coins || betAmount < 10) {
      toast.error('Invalid bet amount')
      return
    }

    // Generate crash point (between 1.5x and 10x, weighted towards lower values)
    const random = Math.random()
    const crash = random < 0.5 ? 1.5 + random * 2 : 3.5 + random * 6.5

    setCrashPoint(crash)
    setMultiplier(1.00)
    setIsPlaying(true)
    setHasCashedOut(false)
  }

  const cashOut = async () => {
    if (!user || !isPlaying || hasCashedOut) return

    setHasCashedOut(true)
    setIsPlaying(false)

    const winnings = Math.floor(betAmount * multiplier)
    const profit = winnings - betAmount
    const xpGain = Math.floor(profit / 10)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          coins: user.coins + profit,
          xp: user.xp + xpGain,
        })
        .eq('id', user.id)

      if (error) throw error

      await supabase.from('game_history').insert([
        {
          user_id: user.id,
          game_type: 'crash',
          bet_amount: betAmount,
          result: 'win',
          payout: winnings,
          multiplier: multiplier,
        },
      ])

      toast.success(`Cashed out at ${multiplier.toFixed(2)}x! Won ${formatNumber(winnings)} coins!`)
      await refreshUser()
    } catch (error) {
      toast.error('Failed to cash out')
    }
  }

  const handleCrash = async () => {
    if (!user) return

    setIsPlaying(false)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          coins: user.coins - betAmount,
          xp: user.xp + Math.floor(betAmount / 20),
        })
        .eq('id', user.id)

      if (error) throw error

      await supabase.from('game_history').insert([
        {
          user_id: user.id,
          game_type: 'crash',
          bet_amount: betAmount,
          result: 'loss',
          payout: 0,
          multiplier: crashPoint,
        },
      ])

      toast.error(`Crashed at ${crashPoint?.toFixed(2)}x! Lost ${formatNumber(betAmount)} coins`)
      await refreshUser()
    } catch (error) {
      toast.error('Failed to process game')
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient-gold">Crash</span>
          </h1>
          <p className="text-gray-400">Cash out before it crashes!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Game Card */}
          <Card>
            <CardHeader>
              <CardTitle>Current Game</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Multiplier Display */}
              <div className="text-center">
                <div
                  className={`text-6xl font-bold mb-4 ${
                    isPlaying && !hasCashedOut ? 'text-green-win animate-pulse' :
                    hasCashedOut ? 'text-gold' :
                    'text-gray-400'
                  }`}
                >
                  {multiplier.toFixed(2)}x
                </div>
                {isPlaying && !hasCashedOut && (
                  <p className="text-gray-400">
                    Potential win: {formatNumber(Math.floor(betAmount * multiplier))} coins
                  </p>
                )}
                {hasCashedOut && (
                  <p className="text-gold font-bold">
                    Cashed out successfully!
                  </p>
                )}
                {!isPlaying && crashPoint && (
                  <p className="text-red-win font-bold">
                    Crashed at {crashPoint.toFixed(2)}x
                  </p>
                )}
              </div>

              {/* Bet Amount */}
              {!isPlaying && (
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
                    className="w-full px-4 py-3 bg-game-card border border-game-border rounded-lg focus:outline-none focus:border-gold transition-colors"
                  />
                  <div className="flex gap-2 mt-2">
                    {[100, 500, 1000, 5000].map((amount) => (
                      <Button
                        key={amount}
                        variant="ghost"
                        size="sm"
                        onClick={() => setBetAmount(amount)}
                        disabled={amount > user.coins}
                      >
                        {formatNumber(amount)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              {!isPlaying ? (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={startGame}
                  disabled={betAmount < 10 || betAmount > user.coins}
                >
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Start Game
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="lg"
                  className="w-full"
                  onClick={cashOut}
                  disabled={hasCashedOut}
                >
                  Cash Out ({formatNumber(Math.floor(betAmount * multiplier))})
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Rules Card */}
          <Card>
            <CardHeader>
              <CardTitle>Game Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-bold mb-2">How to Play</h3>
                <ul className="text-gray-400 space-y-2 text-sm">
                  <li>• Place your bet and start the game</li>
                  <li>• The multiplier starts at 1.00x and increases</li>
                  <li>• Cash out before it crashes to win</li>
                  <li>• The longer you wait, the higher the multiplier</li>
                  <li>• If you don't cash out before crash, you lose your bet</li>
                </ul>
              </div>

              <div className="border-t border-game-border pt-4">
                <h3 className="font-bold mb-2">Your Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Balance:</span>
                    <span className="text-gold font-bold">{formatNumber(user.coins)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Bet:</span>
                    <span className="font-bold">{formatNumber(betAmount)}</span>
                  </div>
                  {isPlaying && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Potential Win:</span>
                      <span className="text-green-win font-bold">
                        {formatNumber(Math.floor(betAmount * multiplier))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
