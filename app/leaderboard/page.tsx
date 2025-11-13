'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Trophy, Coins, TrendingUp, Star } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import { supabase } from '@/lib/supabase/client'

type LeaderboardType = 'coins' | 'xp' | 'level' | 'wins'

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('coins')
  const [leaders, setLeaders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [activeTab])

  const loadLeaderboard = async () => {
    setIsLoading(true)
    try {
      let query = supabase.from('users').select('id, username, coins, xp, level, created_at')

      // Order by selected tab
      switch (activeTab) {
        case 'coins':
          query = query.order('coins', { ascending: false })
          break
        case 'xp':
          query = query.order('xp', { ascending: false })
          break
        case 'level':
          query = query.order('level', { ascending: false }).order('xp', { ascending: false })
          break
        case 'wins':
          // For wins, we need to count from game_history
          const { data: gameData } = await supabase
            .from('game_history')
            .select('user_id, result')

          if (gameData) {
            const winCounts = gameData.reduce((acc: any, game) => {
              if (game.result === 'win') {
                acc[game.user_id] = (acc[game.user_id] || 0) + 1
              }
              return acc
            }, {})

            const { data: userData } = await supabase
              .from('users')
              .select('id, username, coins, xp, level, created_at')

            if (userData) {
              const usersWithWins = userData.map((user) => ({
                ...user,
                wins: winCounts[user.id] || 0,
              }))

              usersWithWins.sort((a, b) => b.wins - a.wins)
              setLeaders(usersWithWins.slice(0, 100))
              setIsLoading(false)
              return
            }
          }
          break
      }

      const { data } = await query.limit(100)

      if (data) {
        setLeaders(data)
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { id: 'coins' as LeaderboardType, label: 'Richest', icon: Coins, color: 'text-gold' },
    { id: 'xp' as LeaderboardType, label: 'Most XP', icon: TrendingUp, color: 'text-green-win' },
    { id: 'level' as LeaderboardType, label: 'Highest Level', icon: Star, color: 'text-blue-rare' },
    { id: 'wins' as LeaderboardType, label: 'Most Wins', icon: Trophy, color: 'text-purple-epic' },
  ]

  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'text-gold'
    if (rank === 2) return 'text-gray-400'
    if (rank === 3) return 'text-yellow-700'
    return 'text-gray-600'
  }

  const getValue = (user: any) => {
    switch (activeTab) {
      case 'coins':
        return formatNumber(user.coins)
      case 'xp':
        return formatNumber(user.xp)
      case 'level':
        return user.level
      case 'wins':
        return user.wins || 0
      default:
        return 0
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient-gold">Leaderboard</span>
          </h1>
          <p className="text-gray-400">See who's on top!</p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-lg font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-game-card border-2 border-gold'
                  : 'bg-game-card border-2 border-game-border hover:border-gold/50'
              }`}
            >
              <tab.icon className={`w-6 h-6 mx-auto mb-2 ${tab.color}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
        {!isLoading && leaders.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* 2nd Place */}
            <Card className="mt-8">
              <CardContent className="p-6 text-center">
                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <div className="text-6xl font-bold mb-2">2</div>
                <Link href={`/profile/${leaders[1].id}`}>
                  <p className="font-bold text-lg hover:text-gold">{leaders[1].username}</p>
                </Link>
                <p className="text-2xl font-bold text-gray-400 mt-2">{getValue(leaders[1])}</p>
              </CardContent>
            </Card>

            {/* 1st Place */}
            <Card className="border-gold">
              <CardContent className="p-6 text-center">
                <Trophy className="w-16 h-16 text-gold mx-auto mb-2" />
                <div className="text-7xl font-bold mb-2 text-gradient-gold">1</div>
                <Link href={`/profile/${leaders[0].id}`}>
                  <p className="font-bold text-xl hover:text-gold">{leaders[0].username}</p>
                </Link>
                <p className="text-3xl font-bold text-gold mt-2">{getValue(leaders[0])}</p>
              </CardContent>
            </Card>

            {/* 3rd Place */}
            <Card className="mt-8">
              <CardContent className="p-6 text-center">
                <Trophy className="w-12 h-12 text-yellow-700 mx-auto mb-2" />
                <div className="text-6xl font-bold mb-2">3</div>
                <Link href={`/profile/${leaders[2].id}`}>
                  <p className="font-bold text-lg hover:text-gold">{leaders[2].username}</p>
                </Link>
                <p className="text-2xl font-bold text-yellow-700 mt-2">{getValue(leaders[2])}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Full Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Top 100 Players</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="spinner w-12 h-12" />
              </div>
            ) : (
              <div className="space-y-2">
                {leaders.map((user, index) => (
                  <Link key={user.id} href={`/profile/${user.id}`}>
                    <div className="flex items-center justify-between p-4 bg-game-bg rounded-lg hover:bg-game-card transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-bold w-8 ${getMedalColor(index + 1)}`}>
                          #{index + 1}
                        </div>
                        <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold">{user.username}</p>
                          <p className="text-sm text-gray-400">Level {user.level}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${tabs.find(t => t.id === activeTab)?.color}`}>
                          {getValue(user)}
                        </p>
                        {activeTab === 'coins' && (
                          <p className="text-sm text-gray-400">{formatNumber(user.xp)} XP</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
