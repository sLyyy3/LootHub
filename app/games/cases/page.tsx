'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Package, Star, Sparkles } from 'lucide-react'
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
      { name: 'Common Skin', rarity: 'common', value: 50, chance: 50 },
      { name: 'Uncommon Knife', rarity: 'uncommon', value: 150, chance: 30 },
      { name: 'Rare AWP', rarity: 'rare', value: 300, chance: 15 },
      { name: 'Epic AK-47', rarity: 'epic', value: 500, chance: 4 },
      { name: 'Legendary Dragon Lore', rarity: 'legendary', value: 1000, chance: 1 },
    ],
  },
  {
    id: 'premium',
    name: 'Premium Case',
    price: 500,
    color: 'bg-blue-rare',
    items: [
      { name: 'Uncommon Glock', rarity: 'uncommon', value: 300, chance: 40 },
      { name: 'Rare M4A4', rarity: 'rare', value: 700, chance: 35 },
      { name: 'Epic Butterfly Knife', rarity: 'epic', value: 1500, chance: 20 },
      { name: 'Legendary Howl', rarity: 'legendary', value: 3000, chance: 4 },
      { name: 'Mythic Karambit', rarity: 'mythic', value: 10000, chance: 1 },
    ],
  },
  {
    id: 'elite',
    name: 'Elite Case',
    price: 1000,
    color: 'bg-purple-epic',
    items: [
      { name: 'Rare USP-S', rarity: 'rare', value: 1000, chance: 45 },
      { name: 'Epic Desert Eagle', rarity: 'epic', value: 2000, chance: 35 },
      { name: 'Legendary Fire Serpent', rarity: 'legendary', value: 5000, chance: 15 },
      { name: 'Mythic Fade', rarity: 'mythic', value: 15000, chance: 4 },
      { name: 'Divine Emerald', rarity: 'divine', value: 50000, chance: 1 },
    ],
  },
]

const rarityColors: Record<string, string> = {
  common: 'from-gray-500 to-gray-600',
  uncommon: 'from-green-500 to-green-600',
  rare: 'from-blue-500 to-blue-600',
  epic: 'from-purple-500 to-purple-600',
  legendary: 'from-yellow-500 to-yellow-600',
  mythic: 'from-red-500 to-red-600',
  divine: 'from-pink-500 via-purple-500 to-blue-500',
}

const rarityGlow: Record<string, string> = {
  common: 'shadow-[0_0_20px_rgba(156,163,175,0.5)]',
  uncommon: 'shadow-[0_0_20px_rgba(34,197,94,0.5)]',
  rare: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
  epic: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
  legendary: 'shadow-[0_0_30px_rgba(234,179,8,0.8)]',
  mythic: 'shadow-[0_0_30px_rgba(239,68,68,0.8)]',
  divine: 'shadow-[0_0_40px_rgba(236,72,153,1)]',
}

export default function CasesPage() {
  const { user, isLoading, refreshUser, updateUser } = useUser()
  const router = useRouter()
  const [selectedCase, setSelectedCase] = useState(cases[0])
  const [isOpening, setIsOpening] = useState(false)
  const [wonItem, setWonItem] = useState<any>(null)
  const [reelItems, setReelItems] = useState<any[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const reelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  const generateReelItems = (winningItem: any) => {
    const items = []
    const totalItems = 50

    // Fill with random items
    for (let i = 0; i < totalItems; i++) {
      const randomItem = selectedCase.items[Math.floor(Math.random() * selectedCase.items.length)]
      items.push({ ...randomItem, id: i })
    }

    // Place winning item at a specific position (around 80% through)
    const winPosition = Math.floor(totalItems * 0.8)
    items[winPosition] = { ...winningItem, id: winPosition }

    return items
  }

  const openCase = async () => {
    if (!user || selectedCase.price > user.coins) {
      toast.error('Insufficient coins')
      return
    }

    setIsOpening(true)
    setWonItem(null)
    setIsAnimating(false)

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

    // Generate reel items with winning item
    const items = generateReelItems(item)
    setReelItems(items)

    // Start animation after a brief delay
    setTimeout(() => {
      setIsAnimating(true)

      // After animation completes
      setTimeout(async () => {
        setWonItem(item)
        setIsAnimating(false)

        try {
          const profit = item.value - selectedCase.price
          const xpGain = Math.floor(selectedCase.price / 10)
          const newCoins = user.coins + profit
          const newXp = user.xp + xpGain

          // Optimistically update UI
          updateUser({ coins: newCoins, xp: newXp })

          const { error } = await supabase
            .from('users')
            .update({
              coins: newCoins,
              xp: newXp,
            })
            .eq('id', user.id)

          if (error) throw error

          await supabase.from('games').insert([
            {
              player_id: user.id,
              type: 'cases',
              bet_amount: selectedCase.price,
              result: profit > 0 ? 'win' : 'loss',
              payout: item.value,
              item_name: item.name,
            },
          ])

          if (profit > 0) {
            toast.success(`🎉 You won ${item.name}! Profit: ${formatNumber(profit)} coins!`, {
              duration: 4000,
              icon: '🔥',
            })
          } else {
            toast.error(`You got ${item.name}. Loss: ${formatNumber(Math.abs(profit))} coins`)
          }
        } catch (error) {
          toast.error('Failed to open case')
          // Revert on error
          await refreshUser()
        } finally {
          setIsOpening(false)
        }
      }, 5000) // Animation duration
    }, 100)
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

      <div className="max-w-7xl mx-auto px-4 py-8">
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
              className={`cursor-pointer transition-all hover:scale-105 ${
                selectedCase.id === caseItem.id ? 'border-gold border-2 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : ''
              }`}
              onClick={() => !isOpening && setSelectedCase(caseItem)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{caseItem.name}</CardTitle>
                  <Package className={`w-8 h-8 ${caseItem.color.replace('bg-', 'text-')}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className={`text-2xl font-bold text-gold`}>
                    {formatNumber(caseItem.price)} coins
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {caseItem.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className={`capitalize font-medium bg-gradient-to-r ${rarityColors[item.rarity]} bg-clip-text text-transparent`}>
                        {item.rarity}
                      </span>
                      <span className="text-gray-400">{item.chance}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Opening Area */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Open {selectedCase.name}</span>
              <span className="text-gold text-lg">{formatNumber(user.coins)} coins</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Reel Container */}
            <div className="mb-6">
              <div className="relative w-full h-48 bg-gradient-to-b from-game-bg via-game-card to-game-bg rounded-lg overflow-hidden">
                {/* Center indicator line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-gold to-transparent z-20 transform -translate-x-1/2" />
                <div className="absolute left-1/2 top-1/2 w-32 h-32 border-4 border-gold rounded-lg transform -translate-x-1/2 -translate-y-1/2 z-10 shadow-[0_0_30px_rgba(234,179,8,0.5)]" />

                {/* Reel */}
                {reelItems.length > 0 ? (
                  <div
                    ref={reelRef}
                    className={`flex absolute left-0 top-1/2 transform -translate-y-1/2 transition-all ${
                      isAnimating ? 'duration-[5000ms] ease-out' : 'duration-0'
                    }`}
                    style={{
                      transform: isAnimating
                        ? `translate(calc(50vw - ${reelItems.length * 0.8 * 150}px), -50%)`
                        : 'translate(50vw, -50%)',
                    }}
                  >
                    {reelItems.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex-shrink-0 w-32 h-32 mx-2 rounded-lg bg-gradient-to-br ${rarityColors[item.rarity]} p-0.5 ${rarityGlow[item.rarity]}`}
                      >
                        <div className="w-full h-full bg-game-card rounded-lg flex flex-col items-center justify-center p-2">
                          <Star className="w-12 h-12 mb-2" />
                          <p className="text-xs text-center font-bold truncate w-full">{item.name}</p>
                          <p className="text-xs text-gray-400 capitalize">{item.rarity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-400">
                      <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Click "Open Case" to start!</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Result Display */}
            {wonItem && !isAnimating && (
              <div className="mb-6 p-6 bg-gradient-to-br from-game-card to-game-bg rounded-lg border-2 border-gold animate-pulse-slow">
                <div className="text-center">
                  <Sparkles className="w-16 h-16 text-gold mx-auto mb-4 animate-bounce" />
                  <h3 className={`text-3xl font-bold mb-2 bg-gradient-to-r ${rarityColors[wonItem.rarity]} bg-clip-text text-transparent`}>
                    {wonItem.name}
                  </h3>
                  <p className="text-2xl text-gold font-bold mb-2">{formatNumber(wonItem.value)} coins</p>
                  <p className="text-sm text-gray-400 capitalize">{wonItem.rarity} rarity</p>
                  <div className="mt-4">
                    {wonItem.value > selectedCase.price ? (
                      <p className="text-green-500 text-xl font-bold">
                        Profit: +{formatNumber(wonItem.value - selectedCase.price)} coins 📈
                      </p>
                    ) : (
                      <p className="text-red-500 text-xl font-bold">
                        Loss: {formatNumber(selectedCase.price - wonItem.value)} coins 📉
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Open Button */}
            <Button
              variant="primary"
              size="lg"
              className="w-full text-xl py-6"
              onClick={openCase}
              isLoading={isOpening}
              disabled={selectedCase.price > user.coins || isOpening}
            >
              <Package className="w-6 h-6 mr-2" />
              {isOpening ? 'Opening...' : `Open Case (${formatNumber(selectedCase.price)} coins)`}
            </Button>
          </CardContent>
        </Card>

        {/* Possible Items Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Possible Items in {selectedCase.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {selectedCase.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-0.5 rounded-lg bg-gradient-to-br ${rarityColors[item.rarity]} ${rarityGlow[item.rarity]} hover:scale-105 transition-transform`}
                >
                  <div className="bg-game-card rounded-lg p-4 h-full">
                    <Star className="w-12 h-12 mx-auto mb-2" />
                    <p className={`font-bold text-center mb-1 bg-gradient-to-r ${rarityColors[item.rarity]} bg-clip-text text-transparent`}>
                      {item.name}
                    </p>
                    <p className="text-sm text-gray-400 text-center capitalize mb-2">{item.rarity}</p>
                    <p className="text-gold font-bold text-center text-lg">{formatNumber(item.value)}</p>
                    <p className="text-xs text-gray-400 text-center">{item.chance}% chance</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
