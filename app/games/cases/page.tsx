'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Package, Star } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

const cases = [
  {
    id: 'starter',
    name: 'Starter Case',
    price: 100,
    color: 'bg-gray-600',
    items: [
      { name: 'Common Item', rarity: 'common', value: 50, chance: 50 },
      { name: 'Uncommon Item', rarity: 'uncommon', value: 150, chance: 30 },
      { name: 'Rare Item', rarity: 'rare', value: 300, chance: 15 },
      { name: 'Epic Item', rarity: 'epic', value: 500, chance: 4 },
      { name: 'Legendary Item', rarity: 'legendary', value: 1000, chance: 1 },
    ],
  },
  {
    id: 'premium',
    name: 'Premium Case',
    price: 500,
    color: 'bg-blue-rare',
    items: [
      { name: 'Uncommon Item', rarity: 'uncommon', value: 300, chance: 40 },
      { name: 'Rare Item', rarity: 'rare', value: 700, chance: 35 },
      { name: 'Epic Item', rarity: 'epic', value: 1500, chance: 20 },
      { name: 'Legendary Item', rarity: 'legendary', value: 3000, chance: 4 },
      { name: 'Mythic Item', rarity: 'mythic', value: 10000, chance: 1 },
    ],
  },
  {
    id: 'elite',
    name: 'Elite Case',
    price: 1000,
    color: 'bg-purple-epic',
    items: [
      { name: 'Rare Item', rarity: 'rare', value: 1000, chance: 45 },
      { name: 'Epic Item', rarity: 'epic', value: 2000, chance: 35 },
      { name: 'Legendary Item', rarity: 'legendary', value: 5000, chance: 15 },
      { name: 'Mythic Item', rarity: 'mythic', value: 15000, chance: 4 },
      { name: 'Divine Item', rarity: 'divine', value: 50000, chance: 1 },
    ],
  },
]

const rarityColors: Record<string, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-500',
  rare: 'text-blue-rare',
  epic: 'text-purple-epic',
  legendary: 'text-gold',
  mythic: 'text-red-win',
  divine: 'text-gradient-gold',
}

export default function CasesPage() {
  const { user, isLoading, refreshUser } = useUser()
  const router = useRouter()
  const [selectedCase, setSelectedCase] = useState(cases[0])
  const [isOpening, setIsOpening] = useState(false)
  const [wonItem, setWonItem] = useState<any>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  const openCase = async () => {
    if (!user || selectedCase.price > user.coins) {
      toast.error('Insufficient coins')
      return
    }

    setIsOpening(true)
    setWonItem(null)

    // Animate opening
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Determine won item based on chances
    const random = Math.random() * 100
    let cumulativeChance = 0
    let item = selectedCase.items[0]

    for (const caseItem of selectedCase.items) {
      cumulativeChance += caseItem.chance
      if (random <= cumulativeChance) {
        item = caseItem
        break
      }
    }

    setWonItem(item)

    try {
      const profit = item.value - selectedCase.price
      const xpGain = Math.floor(selectedCase.price / 10)

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
          game_type: 'cases',
          bet_amount: selectedCase.price,
          result: profit > 0 ? 'win' : 'loss',
          payout: item.value,
          item_name: item.name,
        },
      ])

      if (profit > 0) {
        toast.success(`You won ${item.name}! Profit: ${formatNumber(profit)} coins!`)
      } else {
        toast.error(`You got ${item.name}. Loss: ${formatNumber(Math.abs(profit))} coins`)
      }

      await refreshUser()
    } catch (error) {
      toast.error('Failed to open case')
    } finally {
      setIsOpening(false)
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

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient-gold">Case Opening</span>
          </h1>
          <p className="text-gray-400">Open cases to win valuable items!</p>
        </div>

        {/* Case Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {cases.map((caseItem) => (
            <Card
              key={caseItem.id}
              className={`cursor-pointer transition-all ${
                selectedCase.id === caseItem.id ? 'border-gold scale-105' : ''
              }`}
              onClick={() => setSelectedCase(caseItem)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{caseItem.name}</CardTitle>
                  <Package className={`w-8 h-8 ${caseItem.color.replace('bg-', 'text-')}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className={`text-2xl font-bold ${caseItem.color.replace('bg-', 'text-')}`}>
                    {formatNumber(caseItem.price)} coins
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {caseItem.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className={rarityColors[item.rarity]}>{item.rarity}</span>
                      <span className="text-gray-400">{item.chance}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Opening Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Open {selectedCase.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Result Display */}
              <div className="flex justify-center items-center min-h-[200px]">
                {isOpening ? (
                  <div className="text-center">
                    <Package className="w-24 h-24 text-gold animate-bounce mx-auto mb-4" />
                    <p className="text-gray-400">Opening case...</p>
                  </div>
                ) : wonItem ? (
                  <div className="text-center">
                    <Star className={`w-24 h-24 ${rarityColors[wonItem.rarity]} mx-auto mb-4`} />
                    <h3 className={`text-2xl font-bold ${rarityColors[wonItem.rarity]} mb-2`}>
                      {wonItem.name}
                    </h3>
                    <p className="text-xl text-gold">{formatNumber(wonItem.value)} coins</p>
                    <p className="text-sm text-gray-400 mt-2 capitalize">{wonItem.rarity} rarity</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <Package className="w-24 h-24 mx-auto mb-4 opacity-50" />
                    <p>Click "Open Case" to start!</p>
                  </div>
                )}
              </div>

              {/* Open Button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={openCase}
                isLoading={isOpening}
                disabled={selectedCase.price > user.coins}
              >
                <Package className="w-5 h-5 mr-2" />
                Open Case ({formatNumber(selectedCase.price)} coins)
              </Button>
            </CardContent>
          </Card>

          {/* Possible Items */}
          <Card>
            <CardHeader>
              <CardTitle>Possible Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedCase.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-game-bg rounded-lg"
                  >
                    <div>
                      <p className={`font-bold ${rarityColors[item.rarity]}`}>{item.name}</p>
                      <p className="text-sm text-gray-400 capitalize">{item.rarity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gold">{formatNumber(item.value)}</p>
                      <p className="text-sm text-gray-400">{item.chance}% chance</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-game-bg rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Your Balance:</span>
                  <span className="text-gold font-bold">{formatNumber(user.coins)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Case Price:</span>
                  <span className="font-bold">{formatNumber(selectedCase.price)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
