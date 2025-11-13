const fs = require('fs');
const path = require('path');

console.log('🎮 CS2 LOOTHUB - AUTO SETUP');
console.log('================================\n');

// Alle Dateien mit ihrem Inhalt
const files = {
  // ==================== CONFIG FILES ====================
  'next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig`,

  // ==================== TYPES ====================
  'types/database.types.ts': `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          display_name: string | null
          avatar_url: string | null
          coins: number
          xp: number
          level: number
          games_played: number
          games_won: number
          win_streak: number
          is_admin: boolean
          created_at: string
        }
      }
    }
  }
}`,

  // ==================== API ROUTES ====================
  'pages/api/game/coinflip.ts': `import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase/client'
import { ProvablyFairRNG } from '@/lib/utils/rng'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, betAmount, choice, clientSeed } = req.body

    if (!userId || !betAmount || !choice) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!user || user.coins < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    const rng = new ProvablyFairRNG(clientSeed)
    const result = rng.generateNumber(0, 1) === 0 ? 'heads' : 'tails'
    const won = result === choice

    const multiplier = won ? 2 : 0
    const profit = won ? betAmount : -betAmount
    const newCoins = user.coins + profit
    const xpEarned = Math.floor(betAmount * 0.1)

    await supabaseAdmin
      .from('users')
      .update({
        coins: newCoins,
        xp: user.xp + xpEarned,
        games_played: user.games_played + 1,
        games_won: won ? user.games_won + 1 : user.games_won,
        win_streak: won ? user.win_streak + 1 : 0,
      })
      .eq('id', userId)

    await supabaseAdmin.from('games').insert({
      type: 'coinflip',
      outcome: won ? 'win' : 'loss',
      player_id: userId,
      bet_amount: betAmount,
      multiplier,
      profit,
      game_data: { choice, result },
      server_seed: rng.getSeeds().serverSeed,
      client_seed: clientSeed,
      xp_earned: xpEarned,
    })

    return res.status(200).json({
      success: true,
      result,
      won,
      profit,
      newBalance: newCoins,
      seeds: rng.getSeeds(),
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}`,

  'pages/api/game/crash.ts': `import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase/client'
import { ProvablyFairRNG } from '@/lib/utils/rng'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, betAmount, cashoutMultiplier, clientSeed } = req.body

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!user || user.coins < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    const rng = new ProvablyFairRNG(clientSeed)
    const crashPoint = Math.max(1.0, 1 + rng.generateFloat() * 9)

    const won = cashoutMultiplier <= crashPoint
    const profit = won 
      ? Math.floor(betAmount * (cashoutMultiplier - 1))
      : -betAmount

    const newCoins = user.coins + profit
    const xpEarned = Math.floor(betAmount * cashoutMultiplier * 0.1)

    await supabaseAdmin
      .from('users')
      .update({
        coins: newCoins,
        xp: user.xp + xpEarned,
        games_played: user.games_played + 1,
        games_won: won ? user.games_won + 1 : user.games_won,
        win_streak: won ? user.win_streak + 1 : 0,
      })
      .eq('id', userId)

    await supabaseAdmin.from('games').insert({
      type: 'crash',
      outcome: won ? 'win' : 'loss',
      player_id: userId,
      bet_amount: betAmount,
      multiplier: cashoutMultiplier,
      profit,
      game_data: { crash_point: crashPoint, cashout: cashoutMultiplier },
      server_seed: rng.getSeeds().serverSeed,
      client_seed: clientSeed,
      xp_earned: xpEarned,
    })

    return res.status(200).json({
      success: true,
      crashPoint: Number(crashPoint.toFixed(2)),
      won,
      profit,
      newBalance: newCoins,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}`,

  'pages/api/user/claimDaily.ts': `import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body

    const { data: claim } = await supabaseAdmin
      .from('daily_claims')
      .select('*')
      .eq('user_id', userId)
      .single()

    const now = new Date()
    const baseReward = 500

    if (claim) {
      const lastClaim = new Date(claim.last_claimed_at)
      const hoursSince = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60)

      if (hoursSince < 20) {
        return res.status(400).json({ error: 'Already claimed today' })
      }

      const newStreak = hoursSince < 48 ? claim.streak + 1 : 1
      const reward = baseReward * newStreak

      await supabaseAdmin
        .from('daily_claims')
        .update({
          last_claimed_at: now.toISOString(),
          streak: newStreak,
          total_claims: claim.total_claims + 1,
        })
        .eq('user_id', userId)

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('coins')
        .eq('id', userId)
        .single()

      await supabaseAdmin
        .from('users')
        .update({ coins: user!.coins + reward })
        .eq('id', userId)

      await supabaseAdmin.from('transactions').insert({
        type: 'daily_bonus',
        amount: reward,
        user_id: userId,
        description: \`Daily bonus - Streak \${newStreak}\`,
      })

      return res.status(200).json({
        success: true,
        reward,
        streak: newStreak,
      })
    } else {
      const reward = baseReward

      await supabaseAdmin.from('daily_claims').insert({
        user_id: userId,
        last_claimed_at: now.toISOString(),
        streak: 1,
        total_claims: 1,
      })

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('coins')
        .eq('id', userId)
        .single()

      await supabaseAdmin
        .from('users')
        .update({ coins: user!.coins + reward })
        .eq('id', userId)

      return res.status(200).json({
        success: true,
        reward,
        streak: 1,
      })
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}`,

  'pages/api/ai/generateLoot.ts': `import { NextApiRequest, NextApiResponse } from 'next'

const rarityValues: Record<string, { min: number; max: number }> = {
  common: { min: 50, max: 200 },
  uncommon: { min: 200, max: 500 },
  rare: { min: 500, max: 1500 },
  epic: { min: 1500, max: 5000 },
  legendary: { min: 5000, max: 15000 },
  mythic: { min: 15000, max: 50000 },
}

const weaponTypes = ['AK-47', 'M4A4', 'AWP', 'Desert Eagle', 'Glock-18', 'USP-S', 'P90', 'MP9']
const skinNames = ['Dragon Lore', 'Fade', 'Asiimov', 'Hypnotic', 'Redline', 'Neon Revolution', 'Howl', 'Fire Serpent']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { rarity } = req.body

    if (!rarity || !rarityValues[rarity]) {
      return res.status(400).json({ error: 'Invalid rarity' })
    }

    const weapon = weaponTypes[Math.floor(Math.random() * weaponTypes.length)]
    const skin = skinNames[Math.floor(Math.random() * skinNames.length)]
    const name = \`\${weapon} | \${skin}\`

    const { min, max } = rarityValues[rarity]
    const marketValue = Math.floor(Math.random() * (max - min + 1)) + min

    const loot = {
      name,
      description: \`A \${rarity} \${weapon} with \${skin} finish\`,
      rarity,
      image_url: '/assets/items/default.png',
      market_value: marketValue,
      base_value: marketValue,
      traits: {
        weapon_type: weapon,
        skin_name: skin,
      },
    }

    return res.status(200).json({
      success: true,
      loot,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}`,

  // ==================== GAME PAGES ====================
  'app/games/coinflip/page.tsx': `'use client'

import { useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { useUserStore } from '@/lib/stores/userStore'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { motion, AnimatePresence } from 'framer-motion'
import { Coins } from 'lucide-react'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'

export default function CoinflipPage() {
  const { user, refreshUser } = useUser()
  const { updateCoins, updateXP } = useUserStore()
  const [betAmount, setBetAmount] = useState(100)
  const [choice, setChoice] = useState<'heads' | 'tails'>('heads')
  const [isFlipping, setIsFlipping] = useState(false)
  const [result, setResult] = useState<'heads' | 'tails' | null>(null)

  const flip = async () => {
    if (!user) return
    if (betAmount < 10 || betAmount > user.coins) {
      toast.error('Invalid bet amount')
      return
    }

    setIsFlipping(true)
    setResult(null)

    try {
      const response = await fetch('/api/game/coinflip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          betAmount,
          choice,
          clientSeed: Math.random().toString(36).substring(7),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      await new Promise((resolve) => setTimeout(resolve, 1500))
      setResult(data.result)

      updateCoins(data.profit)
      updateXP(Math.floor(betAmount * 0.1))

      if (data.won) {
        toast.success(\`You won \${Math.abs(data.profit)} coins!\`)
        confetti({ particleCount: 100, spread: 70 })
      } else {
        toast.error(\`You lost \${Math.abs(data.profit)} coins!\`)
      }

      await refreshUser()
    } catch (error: any) {
      toast.error(error.message || 'Failed to flip')
    } finally {
      setIsFlipping(false)
    }
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2">Coinflip</h1>
        <p className="text-gray-400">Choose heads or tails and double your coins!</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ scale: 0, rotate: 0 }}
                    animate={{ scale: 1, rotate: 360 }}
                    className={\`text-8xl mb-4 \${result === choice ? 'text-green-win' : 'text-red-win'}\`}
                  >
                    {result === 'heads' ? '👑' : '🎯'}
                  </motion.div>
                )}
              </AnimatePresence>
              {!result && (
                <div className="text-8xl mb-4">
                  <Coins className="w-32 h-32 mx-auto text-gold" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <Button
                variant={choice === 'heads' ? 'primary' : 'secondary'}
                size="lg"
                onClick={() => setChoice('heads')}
                disabled={isFlipping}
              >
                👑 Heads
              </Button>
              <Button
                variant={choice === 'tails' ? 'primary' : 'secondary'}
                size="lg"
                onClick={() => setChoice('tails')}
                disabled={isFlipping}
              >
                🎯 Tails
              </Button>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={flip}
              isLoading={isFlipping}
              disabled={betAmount < 10 || betAmount > user.coins}
            >
              Flip Coin
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bet Amount</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="w-full px-4 py-3 bg-game-bg border border-game-border rounded-lg"
              min={10}
              max={user.coins}
              disabled={isFlipping}
            />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setBetAmount(Math.floor(user.coins / 2))} className="flex-1">
                1/2
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setBetAmount(user.coins)} className="flex-1">
                Max
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}`,

  'app/inventory/page.tsx': `'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'
import { Package, Coins } from 'lucide-react'
import { formatNumber, getRarityColor } from '@/lib/utils/formatters'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function InventoryPage() {
  const { user, refreshUser } = useUser()
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) loadInventory()
  }, [user])

  const loadInventory = async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('owner_id', user?.id)
      .eq('status', 'owned')
      .order('market_value', { ascending: false })

    if (data) setItems(data)
    setIsLoading(false)
  }

  const sellItem = async (itemId: string, value: number) => {
    if (!user) return

    try {
      await supabase
        .from('items')
        .update({ status: 'sold' })
        .eq('id', itemId)

      await supabase
        .from('users')
        .update({ coins: user.coins + value })
        .eq('id', user.id)

      toast.success(\`Sold for \${value} coins!\`)
      await refreshUser()
      loadInventory()
    } catch (error) {
      toast.error('Failed to sell item')
    }
  }

  if (!user || isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>
  }

  const totalValue = items.reduce((sum, item) => sum + item.market_value, 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2">Inventory</h1>
        <p className="text-gray-400">{items.length} items • Total value: {formatNumber(totalValue)} 🪙</p>
      </motion.div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-gray-400">Your inventory is empty. Open some cases!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card>
                <CardContent className="p-4">
                  {item.image_url && (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      width={200}
                      height={200}
                      className="w-full h-40 object-contain mb-3 rounded"
                    />
                  )}
                  <h3 className={\`font-bold mb-2 \${getRarityColor(item.rarity)}\`}>
                    {item.name}
                  </h3>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gold font-bold">{formatNumber(item.market_value)} 🪙</span>
                    <span className="text-xs text-gray-500">{item.rarity}</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => sellItem(item.id, item.market_value)}
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    Sell
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}`,

  'app/leaderboard/page.tsx': `'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { motion } from 'framer-motion'
import { Trophy, Coins, Star, Crown } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import Link from 'next/link'

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([])

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from('leaderboard_coins')
      .select('*')
      .limit(50)

    if (data) setLeaderboard(data)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2">Leaderboard</h1>
        <p className="text-gray-400">Top players on CS2 LootHub!</p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-gold" />
            <span>Top 50 - Richest Players</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={\`/profile/\${player.id}\`}>
                    <Card className="hover:border-gold/50 transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 flex items-center justify-center">
                            {index === 0 && <Crown className="w-6 h-6 text-yellow-400" />}
                            {index === 1 && <Trophy className="w-6 h-6 text-gray-300" />}
                            {index === 2 && <Trophy className="w-6 h-6 text-orange-400" />}
                            {index > 2 && <span className="text-lg font-bold text-gray-500">#{index + 1}</span>}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-lg">{player.username}</div>
                            <div className="text-sm text-gray-400">Level {player.level}</div>
                          </div>
                          <div className="text-2xl font-bold text-gold">
                            {formatNumber(player.coins)} 🪙
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}`,

  'app/chat/page.tsx': `'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { motion } from 'framer-motion'
import { MessageSquare, Send } from 'lucide-react'
import { formatTimeAgo } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'

export default function ChatPage() {
  const { user } = useUser()
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      loadMessages()
      setupRealtimeSubscription()
    }
  }, [user])

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('channel', 'global')
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) setMessages(data.reverse())
  }

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('global-chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'channel=eq.global',
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newMessage.trim()) return

    try {
      await supabase.from('messages').insert({
        channel: 'global',
        content: newMessage.trim(),
        sender_id: user.id,
        sender_username: user.username,
      })

      setNewMessage('')
    } catch (error) {
      toast.error('Failed to send message')
    }
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2">Global Chat</h1>
        <p className="text-gray-400">Connect with other players!</p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-6 h-6" />
            <span>Global Chat</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-[500px] overflow-y-auto bg-game-bg rounded-lg p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={\`flex \${message.sender_id === user.id ? 'justify-end' : 'justify-start'}\`}
              >
                <div
                  className={\`max-w-[70%] rounded-lg p-3 \${
                    message.sender_id === user.id
                      ? 'bg-gold/20 text-white'
                      : 'bg-game-card text-gray-200'
                  }\`}
                >
                  <div className="flex items-baseline space-x-2 mb-1">
                    <span className="font-semibold text-sm">{message.sender_username}</span>
                    <span className="text-xs text-gray-500">{formatTimeAgo(message.created_at)}</span>
                  </div>
                  <p className="break-words">{message.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 bg-game-bg border border-game-border rounded-lg focus:outline-none focus:border-gold/50"
              maxLength={500}
            />
            <Button type="submit" variant="primary" size="lg" disabled={!newMessage.trim()}>
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}`,
};

// Funktion zum Erstellen der Dateien
function createFiles() {
  let created = 0;
  let errors = 0;

  for (const [filePath, content] of Object.entries(files)) {
    try {
      const dir = path.dirname(filePath);
      
      // Erstelle Verzeichnis falls nicht vorhanden
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Schreibe Datei
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Created: ${filePath}`);
      created++;
    } catch (error) {
      console.error(`❌ Error creating ${filePath}:`, error.message);
      errors++;
    }
  }

  console.log(`\n================================`);
  console.log(`✅ Created: ${created} files`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`\n🎮 Next Steps:`);
  console.log(`1. npm install`);
  console.log(`2. Setup Supabase (see README.md)`);
  console.log(`3. Add .env.local with your keys`);
  console.log(`4. npm run dev`);
}

createFiles();