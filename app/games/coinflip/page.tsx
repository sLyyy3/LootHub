'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Coins } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

export default function CoinflipPage() {
  const { user, isLoading, refreshUser } = useUser()
  const router = useRouter()
  const [betAmount, setBetAmount] = useState(100)
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails'>('heads')
  const [isFlipping, setIsFlipping] = useState(false)
  const [result, setResult] = useState<'heads' | 'tails' | null>(null)
  const [won, setWon] = useState<boolean | null>(null)

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

    try {
      // Simulate coin flip
      const flipResult: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails'
      const didWin = flipResult === selectedSide

      // Animate flip
      await new Promise(resolve => setTimeout(resolve, 1500))

      setResult(flipResult)
      setWon(didWin)

      // Update user coins
      const newCoins = didWin ? user.coins + betAmount : user.coins - betAmount
      const xpGain = didWin ? Math.floor(betAmount / 10) : Math.floor(betAmount / 20)

      const { error } = await supabase
        .from('users')
        .update({
          coins: newCoins,
          xp: user.xp + xpGain,
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
        toast.success(`You won ${formatNumber(betAmount)} coins!`)
      } else {
        toast.error(`You lost ${formatNumber(betAmount)} coins`)
      }

      await refreshUser()
    } catch (error) {
      toast.error('Failed to play game')
    } finally {
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient-gold">Coinflip</span>
          </h1>
          <p className="text-gray-400">Choose heads or tails and double your bet!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Game Card */}
          <Card>
            <CardHeader>
              <CardTitle>Place Your Bet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Coin Display */}
              <div className="flex justify-center">
                <div
                  className={`w-32 h-32 rounded-full bg-gradient-gold flex items-center justify-center text-4xl font-bold shadow-lg ${
                    isFlipping ? 'animate-spin' : ''
                  }`}
                >
                  {result ? (result === 'heads' ? 'H' : 'T') : selectedSide === 'heads' ? 'H' : 'T'}
                </div>
              </div>

              {/* Result Message */}
              {won !== null && (
                <div className={`text-center text-xl font-bold ${won ? 'text-green-win' : 'text-red-win'}`}>
                  {won ? `🎉 You Won ${formatNumber(betAmount * 2)} Coins!` : `😔 You Lost ${formatNumber(betAmount)} Coins`}
                </div>
              )}

              {/* Side Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Choose Side</label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant={selectedSide === 'heads' ? 'primary' : 'secondary'}
                    onClick={() => setSelectedSide('heads')}
                    disabled={isFlipping}
                  >
                    Heads
                  </Button>
                  <Button
                    variant={selectedSide === 'tails' ? 'primary' : 'secondary'}
                    onClick={() => setSelectedSide('tails')}
                    disabled={isFlipping}
                  >
                    Tails
                  </Button>
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
                  className="w-full px-4 py-3 bg-game-card border border-game-border rounded-lg focus:outline-none focus:border-gold transition-colors"
                  disabled={isFlipping}
                />
                <div className="flex gap-2 mt-2">
                  {[100, 500, 1000, 5000].map((amount) => (
                    <Button
                      key={amount}
                      variant="ghost"
                      size="sm"
                      onClick={() => setBetAmount(amount)}
                      disabled={isFlipping || amount > user.coins}
                    >
                      {formatNumber(amount)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Play Button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={playCoinflip}
                isLoading={isFlipping}
                disabled={betAmount < 10 || betAmount > user.coins}
              >
                <Coins className="w-5 h-5 mr-2" />
                Flip Coin
              </Button>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Game Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-bold mb-2">How to Play</h3>
                <ul className="text-gray-400 space-y-2 text-sm">
                  <li>• Choose heads or tails</li>
                  <li>• Place your bet (minimum 10 coins)</li>
                  <li>• If you guess correctly, you win 2x your bet</li>
                  <li>• If you guess wrong, you lose your bet</li>
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
                    <span className="text-gray-400">Win Chance:</span>
                    <span className="font-bold">50%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Potential Win:</span>
                    <span className="text-green-win font-bold">{formatNumber(betAmount * 2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
