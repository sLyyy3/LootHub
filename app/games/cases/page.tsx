'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Package, Star, Sparkles, Plus, Minus, ShoppingBag } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

const cases = [
  {
    id: 'beginner',
    name: 'Beginner Case',
    price: 50,
    color: 'bg-gray-600',
    image: '📦',
    items: [
      { name: 'P250 | Sand Dune', rarity: 'common', value: 30, chance: 45, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpopujwezvEYw' },
      { name: 'Glock-18 | Fade', rarity: 'uncommon', value: 80, chance: 35, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbaqKAxf0Ob3djFN79eJnJm0k' },
      { name: 'USP-S | Guardian', rarity: 'rare', value: 150, chance: 15, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpoo6m1FBRp3_bGcjhQ09Sv' },
      { name: 'M4A4 | Asiimov', rarity: 'epic', value: 300, chance: 4, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alDL_Dl' },
      { name: 'AWP | Dragon Lore', rarity: 'legendary', value: 800, chance: 1, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0m_7zO6-fkGRD6dNOh' },
    ],
  },
  {
    id: 'starter',
    name: 'Starter Case',
    price: 100,
    color: 'bg-green-600',
    image: '🎁',
    items: [
      { name: 'AK-47 | Redline', rarity: 'common', value: 80, chance: 50, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqP' },
      { name: 'M4A1-S | Hyper Beast', rarity: 'uncommon', value: 200, chance: 30, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uOxh7-Gw_alfqj' },
      { name: 'AWP | Lightning Strike', rarity: 'rare', value: 400, chance: 15, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7lZKKqPv9NLPF' },
      { name: '★ Karambit | Damascus Steel', rarity: 'epic', value: 800, chance: 4, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLacDBA5ciJlY20k_jkI6_T' },
      { name: 'AK-47 | Fire Serpent', rarity: 'legendary', value: 1500, chance: 1, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV092lnYmGmOHLP7LWnn8fvZNz2e' },
    ],
  },
  {
    id: 'premium',
    name: 'Premium Case',
    price: 500,
    color: 'bg-blue-600',
    image: '💎',
    items: [
      { name: '★ Butterfly Knife | Vanilla', rarity: 'uncommon', value: 400, chance: 40, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf0ebcZThQ6tCvq4GGqO' },
      { name: '★ Karambit | Fade', rarity: 'rare', value: 900, chance: 35, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLZ' },
      { name: 'M4A4 | Howl', rarity: 'epic', value: 2000, chance: 20, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhjxszFJTwW09-5lpKKqPv9N' },
      { name: 'AWP | Medusa', rarity: 'legendary', value: 4500, chance: 4, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FABz7PLfYQJS5NO0m5O0' },
      { name: 'AWP | Dragon Lore (Souvenir)', rarity: 'mythic', value: 12000, chance: 1, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0m_7zO6_ummpD78A_3L6YoY2h0VHgqkc' },
    ],
  },
  {
    id: 'elite',
    name: 'Elite Case',
    price: 1000,
    color: 'bg-purple-600',
    image: '⚡',
    items: [
      { name: '★ Bayonet | Doppler', rarity: 'rare', value: 1200, chance: 45, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpotLu8JAllx8zJfAFJ6dO7kZSEk' },
      { name: '★ Karambit | Tiger Tooth', rarity: 'epic', value: 2500, chance: 35, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLZ' },
      { name: '★ M9 Bayonet | Crimson Web', rarity: 'legendary', value: 6000, chance: 15, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf3qr3czxb49KzgL-KkP' },
      { name: '★ Butterfly Knife | Doppler Sapphire', rarity: 'mythic', value: 18000, chance: 4, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf0ebcZThQ6tCvq4GGqP76DLfY' },
      { name: 'AWP | Dragon Lore (Factory New)', rarity: 'divine', value: 60000, chance: 1, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0m_7zO6-fw2pXu8B' },
    ],
  },
  {
    id: 'vip',
    name: 'VIP Case',
    price: 2500,
    color: 'bg-yellow-600',
    image: '👑',
    items: [
      { name: '★ Karambit | Lore', rarity: 'rare', value: 3000, chance: 45, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLZ' },
      { name: '★ M9 Bayonet | Marble Fade', rarity: 'epic', value: 6000, chance: 35, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf3qr4YzxO_uO1gb-Gw_' },
      { name: '★ Karambit | Fade (Factory New)', rarity: 'legendary', value: 12000, chance: 15, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLZ' },
      { name: 'M4A4 | Howl (StatTrak™ FN)', rarity: 'mythic', value: 30000, chance: 4, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhjxszFJTwW09-5lpKKqPv9NrfQhFRd4cJ5nqe' },
      { name: '★ Karambit | Case Hardened (Blue Gem)', rarity: 'divine', value: 100000, chance: 1, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLZ' },
    ],
  },
  {
    id: 'ultimate',
    name: 'Ultimate Case',
    price: 5000,
    color: 'bg-red-600',
    image: '🔥',
    items: [
      { name: '★ Sport Gloves | Pandora\'s Box', rarity: 'epic', value: 8000, chance: 45, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DAQ1h3LAVbv6mxFABs3OXNYgJR_Nm1nYGHnufj' },
      { name: '★ Karambit | Doppler Ruby', rarity: 'legendary', value: 18000, chance: 35, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLZ' },
      { name: '★ M9 Bayonet | Doppler Sapphire', rarity: 'mythic', value: 40000, chance: 15, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf3qr4YzxO_uO1gb-Gw_alDK' },
      { name: '★ Karambit | Doppler Black Pearl', rarity: 'divine', value: 90000, chance: 4, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLZ' },
      { name: 'AWP | Dragon Lore (Souvenir FN)', rarity: 'divine', value: 250000, chance: 1, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0m_7zO6_Yg' },
    ],
  },
  {
    id: 'godlike',
    name: 'Godlike Case',
    price: 10000,
    color: 'bg-pink-600',
    image: '✨',
    items: [
      { name: '★ Driver Gloves | Crimson Weave', rarity: 'legendary', value: 25000, chance: 45, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DAQ1JmMR1osbaqPQJz7ODYfi9W9eO7lZKMqP' },
      { name: '★ Karambit | Gamma Doppler Emerald', rarity: 'mythic', value: 60000, chance: 35, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLZ' },
      { name: 'Sticker | iBUYPOWER (Holo) | Katowice 2014', rarity: 'divine', value: 150000, chance: 15, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DAR1JbMQNu5Mv' },
      { name: '★ Karambit | Case Hardened 661', rarity: 'divine', value: 350000, chance: 4, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLZ' },
      { name: 'AK-47 | Case Hardened (Souvenir Pink DDPAT)', rarity: 'divine', value: 1000000, chance: 1, image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09Kvg' },
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
  const [casesAmount, setCasesAmount] = useState(1)
  const [isOpening, setIsOpening] = useState(false)
  const [wonItems, setWonItems] = useState<any[]>([])
  const [reelItems, setReelItems] = useState<any[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [currentRound, setCurrentRound] = useState(0)
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

  const determineWonItem = () => {
    const random = Math.random() * 100
    let cumulativeChance = 0

    for (const caseItem of selectedCase.items) {
      cumulativeChance += caseItem.chance
      if (random <= cumulativeChance) {
        return caseItem
      }
    }
    return selectedCase.items[0]
  }

  const openCases = async () => {
    if (!user || selectedCase.price * casesAmount > user.coins) {
      toast.error('Insufficient coins')
      return
    }

    setIsOpening(true)
    setWonItems([])
    setCurrentRound(0)

    const itemsWon = []

    // Open all cases
    for (let i = 0; i < casesAmount; i++) {
      const item = determineWonItem()
      itemsWon.push(item)
    }

    // Animate each round
    for (let round = 0; round < casesAmount; round++) {
      setCurrentRound(round + 1)
      setIsAnimating(false)
      setReelItems([])

      await new Promise(resolve => setTimeout(resolve, 200))

      const items = generateReelItems(itemsWon[round])
      setReelItems(items)

      await new Promise(resolve => setTimeout(resolve, 100))
      setIsAnimating(true)

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 5000))
      setWonItems(prev => [...prev, itemsWon[round]])
      setIsAnimating(false)

      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Save all items to database
    try {
      const totalCost = selectedCase.price * casesAmount
      const totalValue = itemsWon.reduce((sum, item) => sum + item.value, 0)
      const profit = totalValue - totalCost
      const xpGain = Math.floor(totalCost / 10)
      const newCoins = user.coins + profit
      const newXp = user.xp + xpGain

      // Optimistically update UI
      updateUser({ coins: newCoins, xp: newXp })

      // Update user
      const { error: userError } = await supabase
        .from('users')
        .update({
          coins: newCoins,
          xp: newXp,
        })
        .eq('id', user.id)

      if (userError) throw userError

      // Add items to inventory
      const inventoryItems = itemsWon.map(item => ({
        owner_id: user.id,
        name: item.name,
        rarity: item.rarity,
        value: item.value,
        case_id: selectedCase.id,
      }))

      const { error: itemsError } = await supabase
        .from('items')
        .insert(inventoryItems)

      if (itemsError) throw itemsError

      // Save game history
      await supabase.from('games').insert([
        {
          player_id: user.id,
          type: 'cases',
          bet_amount: totalCost,
          result: profit > 0 ? 'win' : 'loss',
          payout: totalValue,
          item_name: itemsWon.map(i => i.name).join(', '),
        },
      ])

      if (profit > 0) {
        toast.success(`🎉 Opened ${casesAmount} case${casesAmount > 1 ? 's' : ''}! Total value: ${formatNumber(totalValue)} | Profit: +${formatNumber(profit)}`, {
          duration: 5000,
          icon: '🔥',
        })
      } else {
        toast.error(`Opened ${casesAmount} case${casesAmount > 1 ? 's' : ''}. Total value: ${formatNumber(totalValue)} | Loss: ${formatNumber(Math.abs(profit))}`, {
          duration: 5000,
        })
      }
    } catch (error) {
      toast.error('Failed to open cases')
      await refreshUser()
    } finally {
      setIsOpening(false)
      setCurrentRound(0)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12" />
      </div>
    )
  }

  const totalCost = selectedCase.price * casesAmount
  const canAfford = user.coins >= totalCost

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-gradient-gold">Case Opening</span>
            </h1>
            <p className="text-gray-400">Open cases to win valuable items!</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => router.push('/inventory')}
            className="flex items-center gap-2"
          >
            <ShoppingBag className="w-5 h-5" />
            View Inventory
          </Button>
        </div>

        {/* Case Selection Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          {cases.map((caseItem) => (
            <button
              key={caseItem.id}
              onClick={() => {
                setSelectedCase(caseItem)
                setWonItems([])
                setReelItems([])
              }}
              disabled={isOpening}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedCase.id === caseItem.id
                  ? 'border-gold bg-gold/10 scale-105 shadow-[0_0_20px_rgba(234,179,8,0.3)]'
                  : 'border-game-border bg-game-card hover:border-gold/50 hover:scale-102'
              } ${isOpening ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-5xl mb-2">{caseItem.image}</div>
              <p className="font-bold text-sm mb-1 truncate">{caseItem.name}</p>
              <p className="text-gold font-bold text-xs">{formatNumber(caseItem.price)}</p>
            </button>
          ))}
        </div>

        {/* Amount Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCasesAmount(Math.max(1, casesAmount - 1))}
                disabled={isOpening || casesAmount <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="flex-1 text-center">
                <div className="text-4xl font-bold text-gold">{casesAmount}</div>
                <div className="text-sm text-gray-400">
                  {casesAmount === 1 ? 'case' : 'cases'} • Total: {formatNumber(totalCost)} coins
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCasesAmount(Math.min(10, casesAmount + 1))}
                disabled={isOpening || casesAmount >= 10}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-5 gap-2 mt-4">
              {[1, 2, 3, 5, 10].map((amount) => (
                <Button
                  key={amount}
                  variant="ghost"
                  size="sm"
                  onClick={() => setCasesAmount(amount)}
                  disabled={isOpening}
                  className="font-bold"
                >
                  {amount}x
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Opening Area */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Open {selectedCase.name}
                {isOpening && currentRound > 0 && ` (${currentRound}/${casesAmount})`}
              </span>
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
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-16 object-contain mb-1"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                          <Star className="w-12 h-12 mb-1 hidden" />
                          <p className="text-xs text-center font-bold truncate w-full">{item.name}</p>
                          <p className="text-xs text-gray-400 capitalize">{item.rarity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-400">
                      <div className="text-6xl mb-4">{selectedCase.image}</div>
                      <p className="text-lg font-bold">Ready to open!</p>
                      <p className="text-sm">Click "Open Cases" to start</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Won Items Display */}
            {wonItems.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-gold" />
                  Items Won ({wonItems.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {wonItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-0.5 rounded-lg bg-gradient-to-br ${rarityColors[item.rarity]} ${rarityGlow[item.rarity]} animate-pulse-slow`}
                    >
                      <div className="bg-game-card rounded-lg p-4 h-full">
                        <div className="w-full h-20 flex items-center justify-center mb-2">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden')
                            }}
                          />
                          <Star className="w-12 h-12 fallback-icon hidden" />
                        </div>
                        <p className={`font-bold text-center mb-1 text-sm bg-gradient-to-r ${rarityColors[item.rarity]} bg-clip-text text-transparent`}>
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-400 text-center capitalize mb-2">{item.rarity}</p>
                        <p className="text-gold font-bold text-center text-lg">{formatNumber(item.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-gradient-to-r from-gold/10 to-gold/5 border border-gold/30 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Total Value:</span>
                    <span className="text-2xl font-bold text-gold">
                      {formatNumber(wonItems.reduce((sum, item) => sum + item.value, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-400">Cost:</span>
                    <span className="text-lg font-bold">{formatNumber(totalCost)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-lg font-bold">Profit/Loss:</span>
                    <span className={`text-2xl font-bold ${wonItems.reduce((sum, item) => sum + item.value, 0) - totalCost >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {wonItems.reduce((sum, item) => sum + item.value, 0) - totalCost >= 0 ? '+' : ''}
                      {formatNumber(wonItems.reduce((sum, item) => sum + item.value, 0) - totalCost)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Open Button */}
            <Button
              variant="primary"
              size="lg"
              className="w-full text-xl py-6"
              onClick={openCases}
              isLoading={isOpening}
              disabled={!canAfford || isOpening}
            >
              <Package className="w-6 h-6 mr-2" />
              {isOpening
                ? `Opening... ${currentRound}/${casesAmount}`
                : `Open ${casesAmount}x ${selectedCase.name} (${formatNumber(totalCost)} coins)`}
            </Button>

            {!canAfford && (
              <p className="text-center text-red-500 mt-2 font-bold">
                Insufficient coins! Need {formatNumber(totalCost - user.coins)} more
              </p>
            )}
          </CardContent>
        </Card>

        {/* Case Details */}
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
                    <div className="w-full h-20 flex items-center justify-center mb-2">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden')
                        }}
                      />
                      <Star className="w-12 h-12 fallback-icon hidden" />
                    </div>
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
