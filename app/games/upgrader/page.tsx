'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowUp, Star, TrendingUp, Target, DollarSign, History, Sparkles } from 'lucide-react'
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
}

const rarityTextColors: Record<string, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-500',
  rare: 'text-blue-rare',
  epic: 'text-purple-epic',
  legendary: 'text-gold',
  mythic: 'text-red-win',
}

export default function UpgraderPage() {
  const { user, isLoading, updateCoins, refreshUser } = useUser()
  const router = useRouter()

  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [targetValue, setTargetValue] = useState(0)
  const [upgradeChance, setUpgradeChance] = useState(50)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [upgradeResult, setUpgradeResult] = useState<'win' | 'loss' | null>(null)
  const [upgradeHistory, setUpgradeHistory] = useState<UpgradeHistory[]>([])
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
        .from('items')
        .select('*')
        .eq('owner_id', user.id)
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
        .eq('game_type', 'upgrader')
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

    // Simulate upgrade animation delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Determine if upgrade is successful
    const random = Math.random() * 100
    const success = random < upgradeChance

    setUpgradeResult(success ? 'win' : 'loss')

    if (success) {
      // Successful upgrade
      try {
        // Delete old item
        await supabase
          .from('items')
          .delete()
          .eq('id', selectedItem.id)

        // Add coins equal to target value
        const newBalance = user.coins + targetValue
        await supabase
          .from('users')
          .update({ coins: newBalance })
          .eq('id', user.id)

        updateCoins(newBalance)

        // Save win to database
        await supabase.from('games').insert({
          player_id: user.id,
          game_type: 'upgrader',
          bet_amount: selectedItem.value,
          result: 'win',
          payout: targetValue,
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
          .from('items')
          .delete()
          .eq('id', selectedItem.id)

        // Save loss to database
        await supabase.from('games').insert({
          player_id: user.id,
          game_type: 'upgrader',
          bet_amount: selectedItem.value,
          result: 'loss',
          payout: 0,
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
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient-gold">Upgrader</span>
          </h1>
          <p className="text-gray-400">Upgrade your items for higher value! Higher risk = higher reward.</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-blue-rare" />
                <div>
                  <p className="text-xs text-gray-400">Total Upgrades</p>
                  <p className="text-xl font-bold">{stats.totalUpgrades}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-green-win" />
                <div>
                  <p className="text-xs text-gray-400">Success Rate</p>
                  <p className="text-xl font-bold text-green-win">{successRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-gold" />
                <div>
                  <p className="text-xs text-gray-400">Total Profit</p>
                  <p className={`text-xl font-bold ${stats.totalProfit >= 0 ? 'text-green-win' : 'text-red-win'}`}>
                    {formatNumber(stats.totalProfit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-purple-epic" />
                <div>
                  <p className="text-xs text-gray-400">Biggest Win</p>
                  <p className="text-xl font-bold text-purple-epic">{formatNumber(stats.biggestWin)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upgrader Area */}
          <div className="lg:col-span-2">
            {/* Upgrade Display */}
            <Card className="mb-6">
              <CardContent className="p-8">
                <div className="grid grid-cols-3 gap-6 items-center">
                  {/* From Item */}
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-4">From</p>
                    {selectedItem ? (
                      <Card className={`${rarityColors[selectedItem.rarity]} border-2`}>
                        <CardContent className="p-6">
                          <Star className={`w-20 h-20 mx-auto mb-3 ${rarityTextColors[selectedItem.rarity]}`} />
                          <p className={`font-bold mb-2 ${rarityTextColors[selectedItem.rarity]}`}>
                            {selectedItem.name}
                          </p>
                          <p className="text-gold font-bold text-xl">
                            {formatNumber(selectedItem.value)}
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-12 bg-game-bg">
                        <p className="text-gray-500">Select an item</p>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="text-center">
                    <div className={`
                      w-20 h-20 mx-auto rounded-full flex items-center justify-center
                      ${isUpgrading ? 'animate-spin bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-gradient-gold'}
                      ${upgradeResult === 'win' ? 'bg-green-win animate-pulse' : ''}
                      ${upgradeResult === 'loss' ? 'bg-red-win animate-pulse' : ''}
                    `}>
                      <ArrowUp className="w-10 h-10 text-white" />
                    </div>
                    {selectedItem && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-400">Chance</p>
                        <p className="text-2xl font-bold text-purple-epic">{upgradeChance}%</p>
                      </div>
                    )}
                  </div>

                  {/* To Item */}
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-4">To</p>
                    {selectedItem ? (
                      <Card className={`border-2 ${upgradeResult === 'win' ? 'border-green-win' : upgradeResult === 'loss' ? 'border-red-win' : 'border-purple-epic'}`}>
                        <CardContent className="p-6">
                          <Star className={`w-20 h-20 mx-auto mb-3 ${upgradeResult === 'win' ? 'text-green-win' : upgradeResult === 'loss' ? 'text-red-win' : 'text-purple-epic'}`} />
                          <p className={`font-bold mb-2 ${upgradeResult === 'win' ? 'text-green-win' : upgradeResult === 'loss' ? 'text-red-win' : 'text-purple-epic'}`}>
                            {upgradeResult === 'loss' ? 'Failed' : 'Upgraded Item'}
                          </p>
                          <p className="text-gold font-bold text-xl">
                            {upgradeResult === 'loss' ? '0' : formatNumber(targetValue)}
                          </p>
                          {!upgradeResult && potentialProfit > 0 && (
                            <p className="text-green-win text-sm mt-2">
                              +{formatNumber(potentialProfit)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-12 bg-game-bg">
                        <p className="text-gray-500">?</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedItem && (
                  <div className="mt-8">
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Upgrade Chance: {upgradeChance}%</span>
                        <span>Target: {formatNumber(targetValue)}</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="95"
                        step="5"
                        value={upgradeChance}
                        onChange={(e) => setUpgradeChance(parseInt(e.target.value))}
                        disabled={isUpgrading}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>5% (High Risk)</span>
                        <span>95% (Low Risk)</span>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      className="w-full text-lg py-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                      onClick={performUpgrade}
                      disabled={isUpgrading}
                    >
                      {isUpgrading ? '⏳ Upgrading...' : '⬆️ Upgrade Item'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upgrade History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Upgrade History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upgradeHistory.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">No upgrades yet</p>
                ) : (
                  <div className="space-y-2">
                    {upgradeHistory.map((upgrade, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${upgrade.result === 'win' ? 'bg-green-win/10 border border-green-win/30' : 'bg-red-win/10 border border-red-win/30'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold">
                            {upgrade.result === 'win' ? '✅' : '❌'} {formatNumber(upgrade.fromValue)} → {formatNumber(upgrade.toValue)}
                          </span>
                          <span className={`font-bold ${upgrade.profit >= 0 ? 'text-green-win' : 'text-red-win'}`}>
                            {upgrade.profit >= 0 ? '+' : ''}{formatNumber(upgrade.profit)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {upgrade.chance}% chance
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
            <Card>
              <CardHeader>
                <CardTitle>Your Inventory ({inventory.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {inventory.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">No items in inventory</p>
                    <Button variant="primary" onClick={() => router.push('/games/cases')}>
                      Open Cases
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[800px] overflow-y-auto">
                    {inventory.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        disabled={isUpgrading}
                        className={`
                          w-full p-3 rounded-lg border-2 transition-all text-left
                          ${selectedItem?.id === item.id ? `${rarityColors[item.rarity]} bg-opacity-20` : 'border-gray-700 bg-game-bg'}
                          ${isUpgrading ? 'cursor-not-allowed opacity-50' : 'hover:scale-105 cursor-pointer'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <Star className={`w-8 h-8 ${rarityTextColors[item.rarity]}`} />
                          <div className="flex-1">
                            <p className={`font-bold text-sm ${rarityTextColors[item.rarity]}`}>
                              {item.name}
                            </p>
                            <p className="text-gold text-xs">{formatNumber(item.value)}</p>
                          </div>
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
    </div>
  )
}
