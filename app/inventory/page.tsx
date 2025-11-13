'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Package, Coins, Star, Trash2 } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

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

export default function InventoryPage() {
  const { user, isLoading, refreshUser } = useUser()
  const router = useRouter()
  const [inventory, setInventory] = useState<any[]>([])
  const [selectedRarity, setSelectedRarity] = useState<string>('all')
  const [isLoadingInventory, setIsLoadingInventory] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      loadInventory()
    }
  }, [user])

  const loadInventory = async () => {
    if (!user) return

    setIsLoadingInventory(true)
    try {
      let query = supabase
        .from('items')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (selectedRarity !== 'all') {
        query = query.eq('rarity', selectedRarity)
      }

      const { data } = await query

      if (data) {
        setInventory(data)
      }
    } catch (error) {
      console.error('Error loading inventory:', error)
    } finally {
      setIsLoadingInventory(false)
    }
  }

  const sellItem = async (item: any) => {
    if (!user) return

    try {
      // Delete item
      const { error: deleteError } = await supabase
        .from('items')
        .delete()
        .eq('id', item.id)

      if (deleteError) throw deleteError

      // Add coins to user
      const { error: updateError } = await supabase
        .from('users')
        .update({ coins: user.coins + item.value })
        .eq('id', user.id)

      if (updateError) throw updateError

      toast.success(`Sold ${item.name} for ${formatNumber(item.value)} coins!`)
      await refreshUser()
      await loadInventory()
    } catch (error) {
      toast.error('Failed to sell item')
    }
  }

  const sellAllDuplicates = async () => {
    if (!user || inventory.length === 0) return

    try {
      // Find duplicates (same name)
      const nameCount: Record<string, number> = {}
      const itemsToSell: any[] = []

      inventory.forEach((item) => {
        if (nameCount[item.name]) {
          itemsToSell.push(item)
        } else {
          nameCount[item.name] = 1
        }
      })

      if (itemsToSell.length === 0) {
        toast.error('No duplicate items found')
        return
      }

      const totalValue = itemsToSell.reduce((sum, item) => sum + item.value, 0)
      const itemIds = itemsToSell.map(item => item.id)

      // Delete all duplicates
      const { error: deleteError } = await supabase
        .from('items')
        .delete()
        .in('id', itemIds)

      if (deleteError) throw deleteError

      // Add coins
      const { error: updateError } = await supabase
        .from('users')
        .update({ coins: user.coins + totalValue })
        .eq('id', user.id)

      if (updateError) throw updateError

      toast.success(`Sold ${itemsToSell.length} duplicates for ${formatNumber(totalValue)} coins!`)
      await refreshUser()
      await loadInventory()
    } catch (error) {
      toast.error('Failed to sell duplicates')
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12" />
      </div>
    )
  }

  const rarities = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
  const totalValue = inventory.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-gradient-gold">Inventory</span>
            </h1>
            <p className="text-gray-400">{inventory.length} items • {formatNumber(totalValue)} total value</p>
          </div>
          <Button variant="danger" onClick={sellAllDuplicates}>
            <Trash2 className="w-5 h-5 mr-2" />
            Sell All Duplicates
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Items</p>
                  <p className="text-2xl font-bold">{inventory.length}</p>
                </div>
                <Package className="w-10 h-10 text-blue-rare opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Value</p>
                  <p className="text-2xl font-bold text-gold">{formatNumber(totalValue)}</p>
                </div>
                <Coins className="w-10 h-10 text-gold opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Legendary+</p>
                  <p className="text-2xl font-bold text-gold">
                    {inventory.filter((i) => ['legendary', 'mythic'].includes(i.rarity)).length}
                  </p>
                </div>
                <Star className="w-10 h-10 text-gold opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Your Balance</p>
                  <p className="text-2xl font-bold text-gold">{formatNumber(user.coins)}</p>
                </div>
                <Coins className="w-10 h-10 text-gold opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rarity Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {rarities.map((rarity) => (
            <Button
              key={rarity}
              variant={selectedRarity === rarity ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setSelectedRarity(rarity)
                loadInventory()
              }}
              className="capitalize"
            >
              {rarity}
            </Button>
          ))}
        </div>

        {/* Inventory Grid */}
        {isLoadingInventory ? (
          <div className="flex justify-center py-12">
            <div className="spinner w-12 h-12" />
          </div>
        ) : inventory.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-24 h-24 mx-auto mb-4 text-gray-600" />
              <h3 className="text-2xl font-bold mb-2">No Items Yet</h3>
              <p className="text-gray-400 mb-6">Open some cases to get started!</p>
              <Button variant="primary" onClick={() => router.push('/games/cases')}>
                Open Cases
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {inventory.map((item) => (
              <Card key={item.id} className={`${rarityColors[item.rarity]} border-2`}>
                <CardHeader>
                  <CardTitle className={`${rarityTextColors[item.rarity]} text-lg`}>
                    {item.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="w-full h-32 bg-game-bg rounded-lg flex items-center justify-center mb-3">
                      <Star className={`w-16 h-16 ${rarityTextColors[item.rarity]}`} />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Rarity:</span>
                        <span className={`font-bold capitalize ${rarityTextColors[item.rarity]}`}>
                          {item.rarity}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Value:</span>
                        <span className="font-bold text-gold">{formatNumber(item.value)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Acquired:</span>
                        <span className="text-gray-400 text-xs">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full"
                    onClick={() => sellItem(item)}
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    Sell for {formatNumber(item.value)}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
