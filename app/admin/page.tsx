'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Shield,
  Users,
  TrendingUp,
  Coins,
  Package,
  Ban,
  UserPlus,
  Search,
  DollarSign,
  Activity,
} from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

export default function AdminPage() {
  const { user, isLoading } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGames: 0,
    totalCoins: 0,
    totalCasesOpened: 0,
  })
  const [users, setUsers] = useState<any[]>([])
  const [recentGames, setRecentGames] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState<'overview' | 'users' | 'games'>('overview')

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login')
      } else if (!user.is_admin) {
        toast.error('Access denied! Admin only.')
        router.push('/dashboard')
      } else {
        loadData()
      }
    }
  }, [user, isLoading, router])

  const loadData = async () => {
    try {
      // Load stats
      const { data: usersData } = await supabase.from('users').select('*')
      const { data: gamesData } = await supabase.from('games').select('*')

      if (usersData) {
        setUsers(usersData)
        setStats(prev => ({
          ...prev,
          totalUsers: usersData.length,
          totalCoins: usersData.reduce((sum, u) => sum + u.coins, 0),
          totalCasesOpened: usersData.reduce((sum, u) => sum + (u.cases_opened || 0), 0),
        }))
      }

      if (gamesData) {
        setStats(prev => ({ ...prev, totalGames: gamesData.length }))
        setRecentGames(gamesData.slice(0, 20))
      }
    } catch (error) {
      console.error('Error loading admin data:', error)
    }
  }

  const giveCoins = async (userId: string, amount: number) => {
    try {
      const targetUser = users.find(u => u.id === userId)
      if (!targetUser) return

      const { error } = await supabase
        .from('users')
        .update({ coins: targetUser.coins + amount })
        .eq('id', userId)

      if (error) throw error

      toast.success(`Gave ${formatNumber(amount)} coins successfully!`)
      await loadData()
    } catch (error) {
      toast.error('Failed to give coins')
    }
  }

  const toggleBan = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_banned: !currentStatus })
        .eq('id', userId)

      if (error) throw error

      toast.success(`User ${!currentStatus ? 'banned' : 'unbanned'} successfully!`)
      await loadData()
    } catch (error) {
      toast.error('Failed to toggle ban')
    }
  }

  if (isLoading || !user || !user.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12" />
      </div>
    )
  }

  const filteredUsers = users.filter(
    u =>
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-10 h-10 text-red-500" />
            <h1 className="text-4xl font-bold">
              <span className="text-gradient-gold">Admin Panel</span>
            </h1>
          </div>
          <p className="text-gray-400">Manage users, monitor games, and control the platform</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Users</p>
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="w-12 h-12 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Games</p>
                  <p className="text-3xl font-bold">{formatNumber(stats.totalGames)}</p>
                </div>
                <Activity className="w-12 h-12 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Coins</p>
                  <p className="text-3xl font-bold text-gold">{formatNumber(stats.totalCoins)}</p>
                </div>
                <Coins className="w-12 h-12 text-gold opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Cases Opened</p>
                  <p className="text-3xl font-bold">{formatNumber(stats.totalCasesOpened)}</p>
                </div>
                <Package className="w-12 h-12 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={selectedTab === 'overview' ? 'primary' : 'secondary'}
            onClick={() => setSelectedTab('overview')}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={selectedTab === 'users' ? 'primary' : 'secondary'}
            onClick={() => setSelectedTab('users')}
          >
            <Users className="w-4 h-4 mr-2" />
            Users ({stats.totalUsers})
          </Button>
          <Button
            variant={selectedTab === 'games' ? 'primary' : 'secondary'}
            onClick={() => setSelectedTab('games')}
          >
            <Activity className="w-4 h-4 mr-2" />
            Recent Games
          </Button>
        </div>

        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-game-bg rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Avg Coins per User</p>
                    <p className="text-2xl font-bold text-gold">
                      {formatNumber(Math.floor(stats.totalCoins / (stats.totalUsers || 1)))}
                    </p>
                  </div>
                  <div className="p-4 bg-game-bg rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Games per User</p>
                    <p className="text-2xl font-bold">
                      {(stats.totalGames / (stats.totalUsers || 1)).toFixed(1)}
                    </p>
                  </div>
                  <div className="p-4 bg-game-bg rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Active Players</p>
                    <p className="text-2xl font-bold text-green-500">
                      {users.filter(u => u.games_played > 0).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Players */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Richest Players</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {users
                    .sort((a, b) => b.coins - a.coins)
                    .slice(0, 10)
                    .map((u, idx) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-3 bg-game-bg rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-gold">#{idx + 1}</span>
                          <div>
                            <p className="font-bold">{u.username}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gold">{formatNumber(u.coins)}</p>
                          <p className="text-xs text-gray-400">Level {u.level}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {selectedTab === 'users' && (
          <div className="space-y-6">
            {/* Search */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users by username or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-game-card border border-game-border rounded-lg focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users List */}
            <Card>
              <CardHeader>
                <CardTitle>
                  All Users ({filteredUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        u.is_banned ? 'bg-red-500/10 border border-red-500/30' : 'bg-game-bg'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center text-xl font-bold">
                          {u.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold">{u.username}</p>
                            {u.is_admin && (
                              <span className="px-2 py-0.5 bg-red-500 text-xs rounded">ADMIN</span>
                            )}
                            {u.is_banned && (
                              <span className="px-2 py-0.5 bg-red-500 text-xs rounded">BANNED</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{u.email}</p>
                          <p className="text-xs text-gray-500">
                            Level {u.level} • {formatNumber(u.xp)} XP
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold text-gold">{formatNumber(u.coins)}</p>
                          <p className="text-xs text-gray-400">
                            {u.games_played || 0} games played
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const amount = parseInt(prompt('How many coins to give?', '1000') || '0')
                              if (amount > 0) giveCoins(u.id, amount)
                            }}
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={u.is_banned ? 'primary' : 'danger'}
                            size="sm"
                            onClick={() => toggleBan(u.id, u.is_banned)}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Games Tab */}
        {selectedTab === 'games' && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Games</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentGames.map((game) => {
                  const gameUser = users.find(u => u.id === game.player_id)
                  return (
                    <div
                      key={game.id}
                      className="flex items-center justify-between p-3 bg-game-bg rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${game.result === 'win' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="font-bold capitalize">{game.type}</p>
                          <p className="text-sm text-gray-400">
                            {gameUser?.username || 'Unknown'} • {new Date(game.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">Bet: {formatNumber(game.bet_amount)}</p>
                        <p className={`text-sm ${game.result === 'win' ? 'text-green-500' : 'text-red-500'}`}>
                          {game.result === 'win' ? '+' : '-'}
                          {formatNumber(game.result === 'win' ? game.payout - game.bet_amount : game.bet_amount)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
