'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowUp, Star, TrendingUp, Target, DollarSign, History, Sparkles, Zap } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

interface InventoryItem {
  id: string
  name: string
  value: number
  rarity: string
}

interface UpgradeHistory {
  fromValue: number
  toValue: number
  chance: number
  result: 'win' | 'loss'
  profit: number
  timestamp: Date
}

const rarityColors: Record<string, string> = {
  common: 'border-gray-600',
  uncommon: 'border-green-500',
  rare: 'border-blue-rare',
  epic: 'border-purple-epic',
  legendary: 'border-gold',
  mythic: 'border-red-win',
  divine: 'border-pink-500',
}

const rarityTextColors: Record<string, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-500',
  rare: 'text-blue-rare',
  epic: 'text-purple-epic',
  legendary: 'text-gold',
  mythic: 'text-red-win',
  divine: 'text-pink-500',
}

const rarityGradients: Record<string, string> = {
  common: 'from-gray-600 to-gray-800',
  uncommon: 'from-green-500 to-green-700',
  rare: 'from-blue-500 to-blue-700',
  epic: 'from-purple-500 to-purple-700',
  legendary: 'from-yellow-400 to-yellow-600',
  mythic: 'from-red-500 to-red-700',
  divine: 'from-pink-400 to-purple-600',
}

const weaponEmojis: Record<string, string> = {
  'P250': '🔫',
  'Glock-18': '🔫',
  'USP-S': '🔫',
  'M4A4': '⚔️',
  'M4A1-S': '⚔️',
  'AK-47': '💥',
  'AWP': '🎯',
  'Desert Eagle': '🔥',
  'Butterfly Knife': '🗡️',
  'Karambit': '🗡️',
  'Bayonet': '🗡️',
  'M9 Bayonet': '🗡️',
  'Talon Knife': '🗡️',
  'Ursus Knife': '🗡️',
  'Knife': '🔪',
}

const getWeaponIcon = (name: string) => {
  for (const [weapon, icon] of Object.entries(weaponEmojis)) {
    if (name.includes(weapon)) return icon
  }
  return '⚔️'
}

export default function UpgraderPage() {
  const { user, isLoading, updateUser, refreshUser } = useUser()
  const router = useRouter()

  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [targetValue, setTargetValue] = useState(0)
  const [upgradeChance, setUpgradeChance] = useState(50)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [upgradeResult, setUpgradeResult] = useState<'win' | 'loss' | null>(null)
  const [upgradeHistory, setUpgradeHistory] = useState<UpgradeHistory[]>([])
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState({
    totalUpgrades: 0,
    successfulUpgrades: 0,
    totalProfit: 0,
    biggestWin: 0,
  })

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      loadInventory()
      loadStats()
    }
  }, [user])

  useEffect(() => {
    if (selectedItem) {
      calculateTargetValue()
    }
  }, [selectedItem, upgradeChance])

  const loadInventory = async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', user.id)
        .order('value', { ascending: false })

      if (data) {
        setInventory(data)
      }
    } catch (error) {
      console.error('Error loading inventory:', error)
    }
  }

  const loadStats = async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('player_id', user.id)
        .eq('type', 'upgrader')
        .order('created_at', { ascending: false })

      if (data) {
        const totalUpgrades = data.length
        const successfulUpgrades = data.filter(g => g.result === 'win').length
        const totalProfit = data.reduce((sum, g) => sum + (g.payout - g.bet_amount), 0)
        const biggestWin = Math.max(...data.filter(g => g.result === 'win').map(g => g.payout - g.bet_amount), 0)

        setStats({ totalUpgrades, successfulUpgrades, totalProfit, biggestWin })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const calculateTargetValue = () => {
    if (!selectedItem) return

    // Calculate target value based on chance (with house edge)
    // Formula: targetValue = fromValue * (100 / chance) * 0.95 (5% house edge)
    const multiplier = (100 / upgradeChance) * 0.95
    const target = Math.floor(selectedItem.value * multiplier)
    setTargetValue(target)
  }

  const performUpgrade = async () => {
    if (!user || !selectedItem || isUpgrading) return

    setIsUpgrading(true)
    setUpgradeResult(null)
    setProgress(0)

    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 2
      })
    }, 30)

    // Determine if upgrade is successful
    const random = Math.random() * 100
    const success = random < upgradeChance

    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 2000))

    setUpgradeResult(success ? 'win' : 'loss')

    if (success) {
      // Successful upgrade
      try {
        // Delete old item from inventory
        await supabase
          .from('inventory')
          .delete()
          .eq('id', selectedItem.id)

        // Add coins equal to target value
        const newBalance = user.coins + targetValue
        const newXp = user.xp + Math.floor(targetValue / 10)

        await supabase
          .from('users')
          .update({
            coins: newBalance,
            xp: newXp,
            games_won: user.games_won + 1,
            games_played: user.games_played + 1,
            total_winnings: user.total_winnings + targetValue
          })
          .eq('id', user.id)

        updateUser({
          coins: newBalance,
          xp: newXp,
          games_won: user.games_won + 1,
          games_played: user.games_played + 1,
          total_winnings: user.total_winnings + targetValue
        })

        // Save win to database
        await supabase.from('games').insert({
          player_id: user.id,
          type: 'upgrader',
          bet_amount: selectedItem.value,
          result: 'win',
          payout: targetValue,
        })

        // Record transaction
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'game_win',
          amount: targetValue - selectedItem.value,
          description: `Upgrader win - ${upgradeChance}% chance`,
        })

        const profit = targetValue - selectedItem.value
        toast.success(`🎉 Upgrade successful! Gained ${formatNumber(profit)} coins!`)

        const history: UpgradeHistory = {
          fromValue: selectedItem.value,
          toValue: targetValue,
          chance: upgradeChance,
          result: 'win',
          profit,
          timestamp: new Date(),
        }
        setUpgradeHistory(prev => [history, ...prev.slice(0, 9)])
      } catch (error) {
        console.error('Error processing upgrade:', error)
        toast.error('Error processing upgrade')
      }
    } else {
      // Failed upgrade - lose item
      try {
        // Delete item
        await supabase
          .from('inventory')
          .delete()
          .eq('id', selectedItem.id)

        const newXp = user.xp + Math.floor(selectedItem.value / 20)

        await supabase
          .from('users')
          .update({
            xp: newXp,
            games_played: user.games_played + 1,
          })
          .eq('id', user.id)

        updateUser({
          xp: newXp,
          games_played: user.games_played + 1,
        })

        // Save loss to database
        await supabase.from('games').insert({
          player_id: user.id,
          type: 'upgrader',
          bet_amount: selectedItem.value,
          result: 'loss',
          payout: 0,
        })

        // Record transaction
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'game_loss',
          amount: -selectedItem.value,
          description: `Upgrader loss - ${upgradeChance}% chance`,
        })

        toast.error(`❌ Upgrade failed! Lost ${selectedItem.name}`)

        const history: UpgradeHistory = {
          fromValue: selectedItem.value,
          toValue: targetValue,
          chance: upgradeChance,
          result: 'loss',
          profit: -selectedItem.value,
          timestamp: new Date(),
        }
        setUpgradeHistory(prev => [history, ...prev.slice(0, 9)])
      } catch (error) {
        console.error('Error processing upgrade:', error)
        toast.error('Error processing upgrade')
      }
    }

    await refreshUser()
    await loadInventory()
    await loadStats()

    setSelectedItem(null)
    setIsUpgrading(false)

    // Clear result after delay
    setTimeout(() => {
      setUpgradeResult(null)
      setProgress(0)
    }, 3000)
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12" />
      </div>
    )
  }

  const successRate = stats.totalUpgrades > 0
    ? ((stats.successfulUpgrades / stats.totalUpgrades) * 100).toFixed(1)
    : '0.0'

  const potentialProfit = selectedItem ? targetValue - selectedItem.value : 0

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Zap className="w-10 h-10 text-purple-500" />
            <span className="bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
              Upgrader
            </span>
          </h1>
          <p className="text-gray-400">Upgrade your items for higher value! Higher risk = higher reward.</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-xs text-gray-400">Total Upgrades</p>
                  <p className="text-xl font-bold">{stats.totalUpgrades}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-xs text-gray-400">Success Rate</p>
                  <p className="text-xl font-bold text-green-400">{successRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-xs text-gray-400">Total Profit</p>
                  <p className={`text-xl font-bold ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.totalProfit >= 0 ? '+' : ''}{formatNumber(stats.totalProfit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-xs text-gray-400">Biggest Win</p>
                  <p className="text-xl font-bold text-yellow-400">{formatNumber(stats.biggestWin)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upgrader Area */}
          <div className="lg:col-span-2">
            {/* Upgrade Display */}
            <Card className="mb-6 bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30">
              <CardContent className="p-8">
                <div className="grid grid-cols-3 gap-6 items-center">
                  {/* From Item */}
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-4 font-semibold">From Item</p>
                    {selectedItem ? (
                      <Card className={`${rarityColors[selectedItem.rarity]} border-2 bg-gradient-to-br ${rarityGradients[selectedItem.rarity]} transition-all hover:scale-105 animate-slideIn`}>
                        <CardContent className="p-6">
                          <div className="text-6xl mb-3">{getWeaponIcon(selectedItem.name)}</div>
                          <p className={`font-bold mb-2 text-sm ${rarityTextColors[selectedItem.rarity]}`}>
                            {selectedItem.name}
                          </p>
                          <div className="flex items-center justify-center gap-1 text-yellow-400 font-bold text-xl">
                            <DollarSign className="w-5 h-5" />
                            {formatNumber(selectedItem.value)}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-12 bg-game-bg/50">
                        <p className="text-gray-500 text-5xl mb-2">?</p>
                        <p className="text-gray-500 text-xs">Select an item</p>
                      </div>
                    )}
                  </div>

                  {/* Arrow & Progress */}
                  <div className="text-center relative">
                    <div className={`
                      w-24 h-24 mx-auto rounded-full flex items-center justify-center relative overflow-hidden
                      ${isUpgrading ? 'bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 animate-spin-slow' : 'bg-gradient-to-r from-purple-600 to-blue-600'}
                      ${upgradeResult === 'win' ? 'bg-gradient-to-r from-green-400 to-green-600 animate-bounce' : ''}
                      ${upgradeResult === 'loss' ? 'bg-gradient-to-r from-red-400 to-red-600 animate-pulse' : ''}
                      transition-all duration-500
                    `}>
                      <ArrowUp className="w-12 h-12 text-white relative z-10" />
                      {isUpgrading && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                      )}
                    </div>

                    {isUpgrading && (
                      <div className="mt-4">
                        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300 animate-pulse"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Upgrading... {progress}%</p>
                      </div>
                    )}

                    {selectedItem && !isUpgrading && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-400">Success Chance</p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                          {upgradeChance}%
                        </p>
                      </div>
                    )}

                    {upgradeResult && (
                      <div className="mt-4">
                        <p className={`text-lg font-bold ${upgradeResult === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                          {upgradeResult === 'win' ? '✅ SUCCESS!' : '❌ FAILED!'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* To Item */}
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-4 font-semibold">Upgraded Item</p>
                    {selectedItem ? (
                      <Card className={`
                        border-2 transition-all
                        ${upgradeResult === 'win' ? 'border-green-400 bg-gradient-to-br from-green-600 to-green-800 scale-110 animate-bounce' :
                          upgradeResult === 'loss' ? 'border-red-400 bg-gradient-to-br from-red-600 to-red-800 opacity-50' :
                          'border-purple-500 bg-gradient-to-br from-purple-700 to-blue-700'}
                      `}>
                        <CardContent className="p-6">
                          {upgradeResult === 'win' ? (
                            <>
                              <div className="text-6xl mb-3 animate-bounce">🎉</div>
                              <p className="font-bold mb-2 text-green-400 text-sm">
                                Upgraded Success!
                              </p>
                              <div className="flex items-center justify-center gap-1 text-yellow-400 font-bold text-xl">
                                <DollarSign className="w-5 h-5" />
                                {formatNumber(targetValue)}
                              </div>
                              <p className="text-green-400 text-sm mt-2 font-bold">
                                +{formatNumber(potentialProfit)} profit!
                              </p>
                            </>
                          ) : upgradeResult === 'loss' ? (
                            <>
                              <div className="text-6xl mb-3">💔</div>
                              <p className="font-bold mb-2 text-red-400 text-sm">
                                Upgrade Failed
                              </p>
                              <div className="flex items-center justify-center gap-1 text-gray-500 font-bold text-xl">
                                <DollarSign className="w-5 h-5" />
                                0
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-6xl mb-3">✨</div>
                              <p className="font-bold mb-2 text-purple-400 text-sm">
                                Potential Win
                              </p>
                              <div className="flex items-center justify-center gap-1 text-yellow-400 font-bold text-xl">
                                <DollarSign className="w-5 h-5" />
                                {formatNumber(targetValue)}
                              </div>
                              {potentialProfit > 0 && (
                                <p className="text-green-400 text-sm mt-2 font-bold">
                                  +{formatNumber(potentialProfit)}
                                </p>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-12 bg-game-bg/50">
                        <p className="text-gray-500 text-5xl mb-2">?</p>
                        <p className="text-gray-500 text-xs">Unknown</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedItem && (
                  <div className="mt-8">
                    <div className="mb-6 bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-6 rounded-xl border border-purple-500/30">
                      <div className="flex justify-between text-sm mb-3">
                        <span className="text-gray-300 font-semibold">Upgrade Chance: {upgradeChance}%</span>
                        <span className="text-gray-300 font-semibold">Target Value: {formatNumber(targetValue)}</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="95"
                        step="5"
                        value={upgradeChance}
                        onChange={(e) => setUpgradeChance(parseInt(e.target.value))}
                        disabled={isUpgrading}
                        className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span>🎲 5% (High Risk, High Reward)</span>
                        <span>🛡️ 95% (Low Risk, Low Reward)</span>
                      </div>

                      <div className="mt-4 p-4 bg-black/30 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs text-gray-400">Potential Profit</p>
                            <p className={`text-2xl font-bold ${potentialProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {potentialProfit >= 0 ? '+' : ''}{formatNumber(potentialProfit)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Multiplier</p>
                            <p className="text-2xl font-bold text-purple-400">
                              {(targetValue / selectedItem.value).toFixed(2)}x
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      className="w-full text-lg py-6 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-500 hover:via-blue-500 hover:to-purple-500 font-bold shadow-lg shadow-purple-500/50 transition-all hover:scale-105"
                      onClick={performUpgrade}
                      disabled={isUpgrading}
                    >
                      {isUpgrading ? (
                        <>
                          <Zap className="w-6 h-6 mr-2 animate-spin" />
                          Upgrading...
                        </>
                      ) : (
                        <>
                          <ArrowUp className="w-6 h-6 mr-2" />
                          Upgrade Item
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upgrade History */}
            <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 border-gray-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Upgrade History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upgradeHistory.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No upgrades yet - select an item to start!</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {upgradeHistory.map((upgrade, index) => (
                      <div
                        key={index}
                        className={`
                          p-4 rounded-lg transition-all hover:scale-102 animate-slideIn
                          ${upgrade.result === 'win'
                            ? 'bg-gradient-to-r from-green-900/30 to-green-800/20 border border-green-500/40'
                            : 'bg-gradient-to-r from-red-900/30 to-red-800/20 border border-red-500/40'}
                        `}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-lg">
                            {upgrade.result === 'win' ? '✅' : '❌'}
                            <span className="mx-2">{formatNumber(upgrade.fromValue)}</span>
                            →
                            <span className="mx-2">{formatNumber(upgrade.toValue)}</span>
                          </span>
                          <span className={`font-bold text-lg ${upgrade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {upgrade.profit >= 0 ? '+' : ''}{formatNumber(upgrade.profit)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>{upgrade.chance}% chance · {(upgrade.toValue / upgrade.fromValue).toFixed(2)}x multiplier</span>
                          <span className={upgrade.result === 'win' ? 'text-green-400' : 'text-red-400'}>
                            {upgrade.result === 'win' ? 'SUCCESS' : 'FAILED'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Inventory */}
          <div>
            <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 border-gray-700/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Your Inventory</span>
                  <span className="text-purple-400">({inventory.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inventory.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">📦</div>
                    <p className="text-gray-400 mb-4">No items in inventory</p>
                    <Button
                      variant="primary"
                      onClick={() => router.push('/games/cases')}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                    >
                      Open Cases
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[800px] overflow-y-auto pr-2">
                    {inventory.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        disabled={isUpgrading}
                        className={`
                          w-full p-4 rounded-lg border-2 transition-all text-left
                          ${selectedItem?.id === item.id
                            ? `${rarityColors[item.rarity]} bg-gradient-to-r ${rarityGradients[item.rarity]} scale-105 shadow-lg`
                            : 'border-gray-700 bg-game-bg hover:border-gray-600'}
                          ${isUpgrading ? 'cursor-not-allowed opacity-50' : 'hover:scale-105 cursor-pointer'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{getWeaponIcon(item.name)}</div>
                          <div className="flex-1">
                            <p className={`font-bold text-sm ${rarityTextColors[item.rarity]}`}>
                              {item.name}
                            </p>
                            <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                              <DollarSign className="w-3 h-3" />
                              {formatNumber(item.value)}
                            </div>
                          </div>
                          {selectedItem?.id === item.id && (
                            <Sparkles className="w-5 h-5 text-purple-400 animate-spin" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
        @keyframes shimmer {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1s ease-in-out infinite;
        }
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #a855f7, #3b82f6);
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
        }
        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #a855f7, #3b82f6);
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
          border: none;
        }
      `}</style>
    </div>
  )
}
