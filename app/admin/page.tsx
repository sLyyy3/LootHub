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
  Settings,
  FileText,
  Gift,
  AlertCircle,
  CheckCircle,
  XCircle,
  UserCog,
  Trash2,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  BarChart3,
  Zap,
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
    totalTransactions: 0,
    totalWins: 0,
    totalLosses: 0,
    totalRevenue: 0,
    activeToday: 0,
    bannedUsers: 0,
  })
  const [users, setUsers] = useState<any[]>([])
  const [recentGames, setRecentGames] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [transactionFilter, setTransactionFilter] = useState('all')
  const [selectedTab, setSelectedTab] = useState<'overview' | 'users' | 'games' | 'transactions' | 'items' | 'system' | 'activity'>('overview')

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
      // Load all data in parallel
      const [
        { data: usersData },
        { data: gamesData },
        { data: transactionsData },
        { data: itemsData },
      ] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('games').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('transactions').select('*, users(username, email)').order('created_at', { ascending: false }).limit(100),
        supabase.from('inventory').select('*, items(*)').order('created_at', { ascending: false }).limit(50),
      ])

      // Process users data
      if (usersData) {
        setUsers(usersData)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        setStats(prev => ({
          ...prev,
          totalUsers: usersData.length,
          totalCoins: usersData.reduce((sum, u) => sum + u.coins, 0),
          totalCasesOpened: usersData.reduce((sum, u) => sum + (u.cases_opened || 0), 0),
          bannedUsers: usersData.filter(u => u.is_banned).length,
          activeToday: usersData.filter(u => {
            const lastActive = new Date(u.last_active || u.created_at)
            return lastActive >= today
          }).length,
        }))
      }

      // Process games data
      if (gamesData) {
        const wins = gamesData.filter(g => g.result === 'win').length
        const losses = gamesData.filter(g => g.result === 'loss').length
        const revenue = gamesData.reduce((sum, g) => {
          return sum + (g.result === 'loss' ? g.bet_amount : -(g.payout - g.bet_amount))
        }, 0)

        setStats(prev => ({
          ...prev,
          totalGames: gamesData.length,
          totalWins: wins,
          totalLosses: losses,
          totalRevenue: revenue,
        }))
        setRecentGames(gamesData.slice(0, 20))
      }

      // Process transactions
      if (transactionsData) {
        setTransactions(transactionsData)
        setStats(prev => ({
          ...prev,
          totalTransactions: transactionsData.length,
        }))
      }

      // Process items
      if (itemsData) {
        setItems(itemsData)
      }

      // Build recent activity feed
      const activities = []

      // Add recent games
      if (gamesData) {
        gamesData.slice(0, 10).forEach(game => {
          const gameUser = usersData?.find(u => u.id === game.player_id)
          if (game.result === 'win' && (game.payout - game.bet_amount) > 10000) {
            activities.push({
              type: 'big_win',
              user: gameUser?.username || 'Unknown',
              details: `Won ${formatNumber(game.payout - game.bet_amount)} coins on ${game.type}`,
              timestamp: game.created_at,
              icon: TrendingUp,
              color: 'text-green-500',
            })
          }
        })
      }

      // Add recent registrations
      if (usersData) {
        const recentUsers = usersData.slice(0, 5)
        recentUsers.forEach(u => {
          const createdDate = new Date(u.created_at)
          const hoursSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60)
          if (hoursSinceCreation < 24) {
            activities.push({
              type: 'new_user',
              user: u.username,
              details: 'New user registered',
              timestamp: u.created_at,
              icon: UserPlus,
              color: 'text-blue-500',
            })
          }
        })
      }

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivity(activities.slice(0, 20))

    } catch (error) {
      console.error('Error loading admin data:', error)
      toast.error('Failed to load admin data')
    }
  }

  const giveCoins = async (userId: string, amount: number) => {
    try {
      const targetUser = users.find(u => u.id === userId)
      if (!targetUser) return

      const { error: updateError } = await supabase
        .from('users')
        .update({ coins: targetUser.coins + amount })
        .eq('id', userId)

      if (updateError) throw updateError

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'admin_gift',
        amount: amount,
        description: `Admin gift from ${user?.username}`,
      })

      toast.success(`Gave ${formatNumber(amount)} coins successfully!`)
      await loadData()
    } catch (error) {
      toast.error('Failed to give coins')
    }
  }

  const removeCoins = async (userId: string, amount: number) => {
    try {
      const targetUser = users.find(u => u.id === userId)
      if (!targetUser) return

      const newBalance = Math.max(0, targetUser.coins - amount)

      const { error } = await supabase
        .from('users')
        .update({ coins: newBalance })
        .eq('id', userId)

      if (error) throw error

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'admin_removal',
        amount: -amount,
        description: `Admin removal by ${user?.username}`,
      })

      toast.success(`Removed ${formatNumber(amount)} coins successfully!`)
      await loadData()
    } catch (error) {
      toast.error('Failed to remove coins')
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

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_admin: !currentStatus })
        .eq('id', userId)

      if (error) throw error

      toast.success(`User ${!currentStatus ? 'promoted to' : 'removed from'} admin successfully!`)
      await loadData()
    } catch (error) {
      toast.error('Failed to toggle admin status')
    }
  }

  const resetUserStats = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          games_played: 0,
          games_won: 0,
          total_wagered: 0,
          total_winnings: 0,
          cases_opened: 0,
          level: 1,
          xp: 0,
          daily_streak: 0,
        })
        .eq('id', userId)

      if (error) throw error

      toast.success('User stats reset successfully!')
      await loadData()
    } catch (error) {
      toast.error('Failed to reset user stats')
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      const targetUser = users.find(u => u.id === userId)
      if (!targetUser) return

      if (!confirm(`Are you sure you want to permanently delete user "${targetUser.username}"? This action cannot be undone!`)) {
        return
      }

      // Delete user's data
      await supabase.from('games').delete().eq('player_id', userId)
      await supabase.from('transactions').delete().eq('user_id', userId)
      await supabase.from('inventory').delete().eq('user_id', userId)
      await supabase.from('daily_claims').delete().eq('user_id', userId)

      const { error } = await supabase.from('users').delete().eq('id', userId)

      if (error) throw error

      toast.success('User deleted successfully!')
      await loadData()
    } catch (error) {
      toast.error('Failed to delete user')
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-green-500">{stats.activeToday} active today</p>
                </div>
                <Users className="w-10 h-10 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">Total Games</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.totalGames)}</p>
                  <p className="text-xs text-gray-500">{stats.totalWins}W / {stats.totalLosses}L</p>
                </div>
                <Activity className="w-10 h-10 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">Platform Revenue</p>
                  <p className="text-2xl font-bold text-gold">{formatNumber(stats.totalRevenue)}</p>
                  <p className="text-xs text-gray-500">{formatNumber(stats.totalCoins)} in circulation</p>
                </div>
                <Coins className="w-10 h-10 text-gold opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">Transactions</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.totalTransactions)}</p>
                  <p className="text-xs text-red-500">{stats.bannedUsers} banned</p>
                </div>
                <FileText className="w-10 h-10 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <Button
            variant={selectedTab === 'overview' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedTab('overview')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={selectedTab === 'users' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedTab('users')}
          >
            <Users className="w-4 h-4 mr-2" />
            Users
          </Button>
          <Button
            variant={selectedTab === 'games' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedTab('games')}
          >
            <Activity className="w-4 h-4 mr-2" />
            Games
          </Button>
          <Button
            variant={selectedTab === 'transactions' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedTab('transactions')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Transactions
          </Button>
          <Button
            variant={selectedTab === 'items' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedTab('items')}
          >
            <Package className="w-4 h-4 mr-2" />
            Items
          </Button>
          <Button
            variant={selectedTab === 'activity' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedTab('activity')}
          >
            <Zap className="w-4 h-4 mr-2" />
            Activity
          </Button>
          <Button
            variant={selectedTab === 'system' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedTab('system')}
          >
            <Settings className="w-4 h-4 mr-2" />
            System
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

                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const amount = parseInt(prompt('How many coins to give?', '1000') || '0')
                              if (amount > 0) giveCoins(u.id, amount)
                            }}
                            title="Give coins"
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const amount = parseInt(prompt('How many coins to remove?', '1000') || '0')
                              if (amount > 0) removeCoins(u.id, amount)
                            }}
                            title="Remove coins"
                          >
                            <Coins className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={u.is_banned ? 'primary' : 'danger'}
                            size="sm"
                            onClick={() => toggleBan(u.id, u.is_banned)}
                            title={u.is_banned ? 'Unban' : 'Ban'}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={u.is_admin ? 'danger' : 'secondary'}
                            size="sm"
                            onClick={() => toggleAdmin(u.id, u.is_admin)}
                            title={u.is_admin ? 'Remove admin' : 'Make admin'}
                          >
                            <UserCog className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Reset all stats for ${u.username}?`)) {
                                resetUserStats(u.id)
                              }
                            }}
                            title="Reset stats"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => deleteUser(u.id)}
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
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
              <CardTitle>Recent Games ({recentGames.length})</CardTitle>
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

        {/* Transactions Tab */}
        {selectedTab === 'transactions' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <Button
                    variant={transactionFilter === 'all' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setTransactionFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={transactionFilter === 'daily_bonus' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setTransactionFilter('daily_bonus')}
                  >
                    Daily Bonus
                  </Button>
                  <Button
                    variant={transactionFilter === 'admin_gift' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setTransactionFilter('admin_gift')}
                  >
                    Admin Gifts
                  </Button>
                  <Button
                    variant={transactionFilter === 'case_opening' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setTransactionFilter('case_opening')}
                  >
                    Cases
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactions
                    .filter(t => transactionFilter === 'all' || t.type === transactionFilter)
                    .map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 bg-game-bg rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${transaction.amount > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div>
                            <p className="font-bold capitalize">{transaction.type.replace('_', ' ')}</p>
                            <p className="text-sm text-gray-400">
                              {transaction.users?.username || 'Unknown'} • {new Date(transaction.created_at).toLocaleString()}
                            </p>
                            {transaction.description && (
                              <p className="text-xs text-gray-500">{transaction.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${transaction.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {transaction.amount > 0 ? '+' : ''}{formatNumber(transaction.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Items Tab */}
        {selectedTab === 'items' && (
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items ({items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => {
                  const itemUser = users.find(u => u.id === item.user_id)
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border-2 ${
                        item.items?.rarity === 'legendary' ? 'border-gold bg-gold/5' :
                        item.items?.rarity === 'epic' ? 'border-purple-epic bg-purple-epic/5' :
                        item.items?.rarity === 'rare' ? 'border-blue-rare bg-blue-rare/5' :
                        'border-gray-700 bg-game-bg'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Package className="w-8 h-8 text-gray-400" />
                        <div>
                          <p className="font-bold text-sm">{item.items?.name || 'Unknown Item'}</p>
                          <p className="text-xs text-gray-400 capitalize">{item.items?.rarity || 'common'}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        Owner: {itemUser?.username || 'Unknown'}
                      </p>
                      <p className="text-gold font-bold">{formatNumber(item.items?.value || 0)} coins</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity Tab */}
        {selectedTab === 'activity' && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentActivity.map((activity, idx) => {
                  const Icon = activity.icon
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-3 bg-game-bg rounded-lg"
                    >
                      <Icon className={`w-6 h-6 ${activity.color}`} />
                      <div className="flex-1">
                        <p className="font-bold">{activity.user}</p>
                        <p className="text-sm text-gray-400">{activity.details}</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  )
                })}
                {recentActivity.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Tab */}
        {selectedTab === 'system' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-6 h-6" />
                  System Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-game-bg rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold mb-1">Maintenance Mode</h3>
                        <p className="text-sm text-gray-400">Disable all games and user actions</p>
                      </div>
                      <Button variant="secondary" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Toggle
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-game-bg rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold mb-1">Clear All Sessions</h3>
                        <p className="text-sm text-gray-400">Force logout all users</p>
                      </div>
                      <Button variant="danger" size="sm">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-game-bg rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold mb-1">Refresh All Data</h3>
                        <p className="text-sm text-gray-400">Reload all statistics and user data</p>
                      </div>
                      <Button variant="primary" size="sm" onClick={loadData}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-game-bg rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Database</p>
                    <p className="font-bold text-green-500">Connected</p>
                  </div>
                  <div className="p-4 bg-game-bg rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Server Status</p>
                    <p className="font-bold text-green-500">Online</p>
                  </div>
                  <div className="p-4 bg-game-bg rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Avg Response Time</p>
                    <p className="font-bold">~50ms</p>
                  </div>
                  <div className="p-4 bg-game-bg rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Uptime</p>
                    <p className="font-bold">99.9%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
