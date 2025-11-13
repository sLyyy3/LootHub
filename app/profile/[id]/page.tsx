'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Trophy, Coins, TrendingUp, GamepadIcon } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import { supabase } from '@/lib/supabase/client'

export default function ProfilePage() {
  const params = useParams()
  const [profile, setProfile] = useState<any>(null)
  const [gameHistory, setGameHistory] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalGames: 0,
    totalWins: 0,
    totalLosses: 0,
    totalWagered: 0,
    totalWon: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadProfile()
    loadGameHistory()
  }, [params.id])

  const loadProfile = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', params.id)
        .single()

      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadGameHistory = async () => {
    try {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('player_id', params.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        setGameHistory(data)

        // Calculate stats
        const totalGames = data.length
        const totalWins = data.filter((g) => g.result === 'win').length
        const totalLosses = data.filter((g) => g.result === 'loss').length
        const totalWagered = data.reduce((sum, g) => sum + g.bet_amount, 0)
        const totalWon = data.reduce((sum, g) => sum + (g.payout || 0), 0)

        setStats({ totalGames, totalWins, totalLosses, totalWagered, totalWon })
      }
    } catch (error) {
      console.error('Error loading game history:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h1 className="text-4xl font-bold">Profile not found</h1>
        </div>
      </div>
    )
  }

  const winRate = stats.totalGames > 0 ? ((stats.totalWins / stats.totalGames) * 100).toFixed(1) : '0.0'

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gradient-gold flex items-center justify-center text-4xl font-bold">
                {profile.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{profile.username}</h1>
                <div className="flex gap-6 text-sm text-gray-400">
                  <span>Level {profile.level}</span>
                  <span>{formatNumber(profile.xp)} XP</span>
                  <span>Member since {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {profile.is_admin && (
                <div className="px-4 py-2 bg-red-win rounded-lg">
                  <span className="font-bold">ADMIN</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-gold" />
                Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gold">{formatNumber(profile.coins)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GamepadIcon className="w-5 h-5 text-blue-rare" />
                Total Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalGames}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-green-win" />
                Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-win">{winRate}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-epic" />
                Net Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${stats.totalWon - stats.totalWagered >= 0 ? 'text-green-win' : 'text-red-win'}`}>
                {formatNumber(stats.totalWon - stats.totalWagered)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Wins:</span>
                <span className="font-bold text-green-win">{stats.totalWins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Losses:</span>
                <span className="font-bold text-red-win">{stats.totalLosses}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Wagered:</span>
                <span className="font-bold">{formatNumber(stats.totalWagered)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Won:</span>
                <span className="font-bold text-gold">{formatNumber(stats.totalWon)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="font-bold">{profile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Level:</span>
                <span className="font-bold">{profile.level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Experience:</span>
                <span className="font-bold">{formatNumber(profile.xp)} XP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Account Status:</span>
                <span className="font-bold text-green-win">Active</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Games */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Games</CardTitle>
          </CardHeader>
          <CardContent>
            {gameHistory.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No games played yet</p>
            ) : (
              <div className="space-y-2">
                {gameHistory.map((game) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-4 bg-game-bg rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${game.result === 'win' ? 'bg-green-win' : 'bg-red-win'}`} />
                      <div>
                        <p className="font-bold capitalize">{game.game_type}</p>
                        <p className="text-sm text-gray-400">
                          {new Date(game.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        Bet: {formatNumber(game.bet_amount)}
                      </p>
                      <p className={`text-sm ${game.result === 'win' ? 'text-green-win' : 'text-red-win'}`}>
                        {game.result === 'win' ? '+' : '-'}
                        {formatNumber(game.result === 'win' ? game.payout - game.bet_amount : game.bet_amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
