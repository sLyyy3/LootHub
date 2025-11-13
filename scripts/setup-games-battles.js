const fs = require('fs');
const path = require('path');

console.log('🎮 CS2 LOOTHUB - GAMES & BATTLES SETUP');
console.log('=========================================\n');

const files = {
  // ==================== GAME PAGES ====================
  'app/games/crash/page.tsx': `'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { useUserStore } from '@/lib/stores/userStore'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'

export default function CrashPage() {
  const { user, refreshUser } = useUser()
  const { updateCoins, updateXP } = useUserStore()
  const [betAmount, setBetAmount] = useState(100)
  const [autoCashout, setAutoCashout] = useState(2.0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [multiplier, setMultiplier] = useState(1.0)
  const [cashedOut, setCashedOut] = useState(false)

  const startGame = async () => {
    if (!user || betAmount < 10 || betAmount > user.coins) {
      toast.error('Invalid bet amount')
      return
    }

    setIsPlaying(true)
    setMultiplier(1.0)
    setCashedOut(false)

    // Simulate multiplier increase
    const interval = setInterval(() => {
      setMultiplier((prev) => {
        const next = prev + 0.01
        if (next >= autoCashout && !cashedOut) {
          clearInterval(interval)
          cashOut(autoCashout)
        }
        return next
      })
    }, 100)

    // Random crash after 2-10 seconds
    const crashTime = 2000 + Math.random() * 8000
    setTimeout(() => {
      clearInterval(interval)
      if (!cashedOut) {
        endGame(false, multiplier)
      }
    }, crashTime)
  }

  const cashOut = async (currentMultiplier: number) => {
    if (cashedOut) return
    setCashedOut(true)
    await endGame(true, currentMultiplier)
  }

  const endGame = async (won: boolean, finalMultiplier: number) => {
    try {
      const response = await fetch('/api/game/crash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          betAmount,
          cashoutMultiplier: finalMultiplier,
          clientSeed: Math.random().toString(36).substring(7),
        }),
      })

      const data = await response.json()

      if (data.success) {
        updateCoins(data.profit)
        updateXP(Math.floor(betAmount * finalMultiplier * 0.1))

        if (won) {
          toast.success(\`Cashed out at \${finalMultiplier.toFixed(2)}x!\`)
          confetti({ particleCount: 100, spread: 70 })
        } else {
          toast.error(\`Crashed at \${data.crashPoint}x!\`)
        }

        await refreshUser()
      }
    } catch (error: any) {
      toast.error('Game error')
    } finally {
      setIsPlaying(false)
    }
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2">Crash</h1>
        <p className="text-gray-400">Cash out before it crashes!</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="text-8xl font-bold mb-4" style={{ 
                color: multiplier > 2 ? '#00FF9C' : multiplier > 1.5 ? '#FFD700' : '#FFFFFF' 
              }}>
                {multiplier.toFixed(2)}x
              </div>
              <TrendingUp className="w-16 h-16 mx-auto text-neon-blue" />
            </div>

            {!isPlaying ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={startGame}
                disabled={betAmount < 10 || betAmount > user.coins}
              >
                Start Game
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => cashOut(multiplier)}
                disabled={cashedOut}
              >
                {cashedOut ? 'Cashed Out!' : 'Cash Out'}
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Bet Amount</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-game-bg border border-game-border rounded-lg"
                  disabled={isPlaying}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Auto Cashout</label>
                <input
                  type="number"
                  value={autoCashout}
                  onChange={(e) => setAutoCashout(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-game-bg border border-game-border rounded-lg"
                  step={0.1}
                  min={1.1}
                  disabled={isPlaying}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}`,

  'app/games/roulette/page.tsx': `'use client'

import { useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { useUserStore } from '@/lib/stores/userStore'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'

export default function RoulettePage() {
  const { user, refreshUser } = useUser()
  const { updateCoins, updateXP } = useUserStore()
  const [betAmount, setBetAmount] = useState(100)
  const [choice, setChoice] = useState<'red' | 'black' | 'green'>('red')
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const spin = async () => {
    if (!user || betAmount < 10 || betAmount > user.coins) {
      toast.error('Invalid bet amount')
      return
    }

    setIsSpinning(true)
    setResult(null)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    try {
      const response = await fetch('/api/game/roulette', {
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

      if (data.success) {
        setResult(data.result)
        updateCoins(data.profit)
        updateXP(Math.floor(betAmount * 0.1))

        if (data.won) {
          toast.success(\`Won \${Math.abs(data.profit)} coins!\`)
          confetti({ particleCount: 150, spread: 80 })
        } else {
          toast.error('Better luck next time!')
        }

        await refreshUser()
      }
    } catch (error) {
      toast.error('Spin failed')
    } finally {
      setIsSpinning(false)
    }
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2">Roulette</h1>
        <p className="text-gray-400">Red, Black, or Green?</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              {result && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className={\`text-8xl font-bold mb-4 \${
                    result === 'red' ? 'text-red-win' : 
                    result === 'black' ? 'text-gray-300' : 
                    'text-green-win'
                  }\`}
                >
                  {result === 'red' ? '🔴' : result === 'black' ? '⚫' : '🟢'}
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <Button
                variant={choice === 'red' ? 'primary' : 'secondary'}
                size="lg"
                onClick={() => setChoice('red')}
                disabled={isSpinning}
                className="bg-red-win/20 border-red-win hover:bg-red-win/30"
              >
                🔴 Red (2x)
              </Button>
              <Button
                variant={choice === 'green' ? 'primary' : 'secondary'}
                size="lg"
                onClick={() => setChoice('green')}
                disabled={isSpinning}
                className="bg-green-win/20 border-green-win hover:bg-green-win/30"
              >
                🟢 Green (14x)
              </Button>
              <Button
                variant={choice === 'black' ? 'primary' : 'secondary'}
                size="lg"
                onClick={() => setChoice('black')}
                disabled={isSpinning}
                className="bg-gray-700/20 border-gray-500 hover:bg-gray-700/30"
              >
                ⚫ Black (2x)
              </Button>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={spin}
              isLoading={isSpinning}
              disabled={betAmount < 10 || betAmount > user.coins}
            >
              Spin
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
              disabled={isSpinning}
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

  'pages/api/game/roulette.ts': `import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase/client'
import { ProvablyFairRNG } from '@/lib/utils/rng'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, betAmount, choice, clientSeed } = req.body

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!user || user.coins < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    const rng = new ProvablyFairRNG(clientSeed)
    const roll = rng.generateNumber(0, 14)

    let result: 'red' | 'black' | 'green'
    if (roll === 0) {
      result = 'green'
    } else if (roll % 2 === 0) {
      result = 'black'
    } else {
      result = 'red'
    }

    const won = result === choice
    let multiplier = 0

    if (won) {
      multiplier = choice === 'green' ? 14 : 2
    }

    const profit = won ? betAmount * (multiplier - 1) : -betAmount
    const newCoins = user.coins + profit
    const xpEarned = Math.floor(betAmount * 0.15)

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
      type: 'roulette',
      outcome: won ? 'win' : 'loss',
      player_id: userId,
      bet_amount: betAmount,
      multiplier,
      profit,
      game_data: { choice, result, roll },
      server_seed: rng.getSeeds().serverSeed,
      client_seed: clientSeed,
      xp_earned: xpEarned,
    })

    return res.status(200).json({
      success: true,
      result,
      roll,
      won,
      profit,
      newBalance: newCoins,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}`,

  'app/games/cases/page.tsx': `'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { motion, AnimatePresence } from 'framer-motion'
import { Box } from 'lucide-react'
import { formatNumber, getRarityColor, getRarityGlow } from '@/lib/utils/formatters'
import Image from 'next/image'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'

export default function CasesPage() {
  const { user, refreshUser } = useUser()
  const [cases, setCases] = useState<any[]>([])
  const [selectedCase, setSelectedCase] = useState<any>(null)
  const [isOpening, setIsOpening] = useState(false)
  const [wonItem, setWonItem] = useState<any>(null)

  useEffect(() => {
    loadCases()
  }, [])

  const loadCases = async () => {
    const { data } = await supabase
      .from('cases')
      .select('*')
      .eq('is_active', true)

    if (data) setCases(data)
  }

  const openCase = async () => {
    if (!user || !selectedCase) return
    if (user.coins < selectedCase.price) {
      toast.error('Insufficient balance')
      return
    }

    setIsOpening(true)
    setWonItem(null)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    try {
      const response = await fetch('/api/game/openCase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          caseId: selectedCase.id,
          clientSeed: Math.random().toString(36).substring(7),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setWonItem(data.item)
        toast.success(\`Won: \${data.item.name}!\`)
        confetti({ particleCount: 200, spread: 100 })
        await refreshUser()
      }
    } catch (error) {
      toast.error('Failed to open case')
    } finally {
      setIsOpening(false)
    }
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2">Cases</h1>
        <p className="text-gray-400">Open cases to get legendary items!</p>
      </motion.div>

      {!selectedCase ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cases.map((caseItem) => (
            <motion.div key={caseItem.id} whileHover={{ scale: 1.05 }}>
              <Card className="cursor-pointer" onClick={() => setSelectedCase(caseItem)}>
                <CardContent className="p-6">
                  <Box className="w-20 h-20 mx-auto mb-4 text-gold" />
                  <h3 className="text-xl font-bold text-center mb-2">{caseItem.name}</h3>
                  <p className="text-sm text-gray-400 text-center mb-4">{caseItem.description}</p>
                  <div className="text-2xl font-bold text-gold text-center">
                    {formatNumber(caseItem.price)} 🪙
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedCase.name}</CardTitle>
                <Button variant="secondary" onClick={() => setSelectedCase(null)}>
                  Back
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <AnimatePresence>
                  {wonItem && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={\`p-6 rounded-lg \${getRarityGlow(wonItem.rarity)}\`}
                    >
                      {wonItem.image_url && (
                        <Image
                          src={wonItem.image_url}
                          alt={wonItem.name}
                          width={200}
                          height={200}
                          className="w-full h-48 object-contain mb-4"
                        />
                      )}
                      <h3 className={\`text-2xl font-bold mb-2 \${getRarityColor(wonItem.rarity)}\`}>
                        {wonItem.name}
                      </h3>
                      <div className="text-3xl font-bold text-gold">
                        {formatNumber(wonItem.market_value)} 🪙
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={openCase}
                isLoading={isOpening}
                disabled={user.coins < selectedCase.price}
              >
                Open Case - {formatNumber(selectedCase.price)} 🪙
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}`,

  'pages/api/game/openCase.ts': `import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase/client'
import { ProvablyFairRNG, selectItemByRarity } from '@/lib/utils/rng'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, caseId, clientSeed } = req.body

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    const { data: caseData } = await supabaseAdmin
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single()

    if (!user || !caseData) {
      return res.status(404).json({ error: 'User or case not found' })
    }

    if (user.coins < caseData.price) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    const rng = new ProvablyFairRNG(clientSeed)
    const selectedRarity = selectItemByRarity(caseData.loot_pool, rng)

    const lootResponse = await fetch(\`\${process.env.NEXT_PUBLIC_APP_URL}/api/ai/generateLoot\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rarity: selectedRarity.rarity }),
    })

    const { loot } = await lootResponse.json()

    const { data: newItem } = await supabaseAdmin
      .from('items')
      .insert({
        ...loot,
        owner_id: userId,
        status: 'owned',
        ai_generated: true,
        obtained_from: 'case',
        wear: Math.random(),
        pattern_id: Math.floor(Math.random() * 999) + 1,
      })
      .select()
      .single()

    const newCoins = user.coins - caseData.price
    const xpEarned = Math.floor(caseData.price * 0.2)

    await supabaseAdmin
      .from('users')
      .update({
        coins: newCoins,
        xp: user.xp + xpEarned,
        games_played: user.games_played + 1,
      })
      .eq('id', userId)

    await supabaseAdmin.from('games').insert({
      type: 'case',
      outcome: 'win',
      player_id: userId,
      bet_amount: caseData.price,
      multiplier: newItem.market_value / caseData.price,
      profit: newItem.market_value - caseData.price,
      game_data: { case_name: caseData.name, item: newItem },
      server_seed: rng.getSeeds().serverSeed,
      client_seed: clientSeed,
      xp_earned: xpEarned,
    })

    return res.status(200).json({
      success: true,
      item: newItem,
      newBalance: newCoins,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}`,

  'app/games/upgrader/page.tsx': `'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { motion } from 'framer-motion'
import { ArrowUp, Sparkles } from 'lucide-react'
import { formatNumber, getRarityColor, getRarityGlow } from '@/lib/utils/formatters'
import Image from 'next/image'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'

const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
const upgradeChances: Record<string, number> = {
  common: 80,
  uncommon: 60,
  rare: 40,
  epic: 25,
  legendary: 15,
  mythic: 5,
}

export default function UpgraderPage() {
  const { user, refreshUser } = useUser()
  const [items, setItems] = useState<any[]>([])
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    if (user) loadItems()
  }, [user])

  const loadItems = async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('owner_id', user?.id)
      .eq('status', 'owned')
      .order('market_value', { ascending: false })

    if (data) setItems(data)
  }

  const upgrade = async () => {
    if (!user || !selectedItem) return

    setIsUpgrading(true)
    setResult(null)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    try {
      const response = await fetch('/api/game/upgrader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          itemId: selectedItem.id,
          clientSeed: Math.random().toString(36).substring(7),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)

        if (data.won) {
          toast.success('Upgrade successful!')
          confetti({ particleCount: 200, spread: 100 })
        } else {
          toast.error('Upgrade failed - item lost!')
        }

        await refreshUser()
        await loadItems()
        setSelectedItem(null)
      }
    } catch (error) {
      toast.error('Upgrade failed')
    } finally {
      setIsUpgrading(false)
    }
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>
  }

  const nextRarity = selectedItem 
    ? rarityOrder[rarityOrder.indexOf(selectedItem.rarity) + 1]
    : null

  const successChance = selectedItem ? upgradeChances[selectedItem.rarity] : 0

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2">Upgrader</h1>
        <p className="text-gray-400">Upgrade your items to higher rarities!</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Item to Upgrade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={\`game-card cursor-pointer p-3 \${
                    selectedItem?.id === item.id ? 'border-gold' : ''
                  }\`}
                >
                  {item.image_url && (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      width={100}
                      height={100}
                      className="w-full h-24 object-contain mb-2"
                    />
                  )}
                  <div className={\`text-sm font-semibold mb-1 \${getRarityColor(item.rarity)}\`}>
                    {item.name}
                  </div>
                  <div className="text-xs text-gold">{formatNumber(item.market_value)} 🪙</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upgrade Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedItem ? (
              <>
                <div className="flex items-center justify-center space-x-6">
                  <div className={\`text-center p-4 rounded-lg \${getRarityGlow(selectedItem.rarity)}\`}>
                    <div className={\`text-lg font-bold mb-2 \${getRarityColor(selectedItem.rarity)}\`}>
                      Current
                    </div>
                    <div className="text-sm">{selectedItem.rarity}</div>
                  </div>

                  <ArrowUp className="w-8 h-8 text-gold" />

                  {nextRarity ? (
                    <div className={\`text-center p-4 rounded-lg \${getRarityGlow(nextRarity)}\`}>
                      <div className={\`text-lg font-bold mb-2 \${getRarityColor(nextRarity)}\`}>
                        Target
                      </div>
                      <div className="text-sm">{nextRarity}</div>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <div className="text-lg font-bold text-gold">MAX RARITY</div>
                    </div>
                  )}
                </div>

                {nextRarity && (
                  <>
                    <div className="text-center">
                      <div className="text-sm text-gray-400 mb-2">Success Chance</div>
                      <div className="text-4xl font-bold text-neon-green">{successChance}%</div>
                    </div>

                    <div className="bg-red-win/20 border border-red-win rounded-lg p-4">
                      <p className="text-sm text-center">
                        ⚠️ Warning: If upgrade fails, item will be destroyed!
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={upgrade}
                      isLoading={isUpgrading}
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Upgrade Item
                    </Button>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <ArrowUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select an item to upgrade</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}`,

  'pages/api/game/upgrader.ts': `import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase/client'
import { ProvablyFairRNG } from '@/lib/utils/rng'

const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
const upgradeChances: Record<string, number> = {
  common: 80,
  uncommon: 60,
  rare: 40,
  epic: 25,
  legendary: 15,
  mythic: 5,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, itemId, clientSeed } = req.body

    const { data: item } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('id', itemId)
      .eq('owner_id', userId)
      .single()

    if (!item) {
      return res.status(404).json({ error: 'Item not found' })
    }

    const currentRarityIndex = rarityOrder.indexOf(item.rarity)
    if (currentRarityIndex === rarityOrder.length - 1) {
      return res.status(400).json({ error: 'Item is already max rarity' })
    }

    const rng = new ProvablyFairRNG(clientSeed)
    const roll = rng.generateNumber(1, 100)
    const won = roll <= upgradeChances[item.rarity]

    let newItem = null

    if (won) {
      const newRarity = rarityOrder[currentRarityIndex + 1]
      const newValue = Math.floor(item.market_value * 2.5)

      const lootResponse = await fetch(\`\${process.env.NEXT_PUBLIC_APP_URL}/api/ai/generateLoot\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rarity: newRarity }),
      })

      const { loot } = await lootResponse.json()

      const { data: created } = await supabaseAdmin
        .from('items')
        .insert({
          ...loot,
          owner_id: userId,
          status: 'owned',
          ai_generated: true,
          obtained_from: 'upgrade',
          wear: Math.random(),
          pattern_id: Math.floor(Math.random() * 999) + 1,
        })
        .select()
        .single()

      newItem = created
    }

    await supabaseAdmin
      .from('items')
      .update({ status: 'sold' })
      .eq('id', itemId)

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    await supabaseAdmin
      .from('users')
      .update({
        xp: user!.xp + (won ? 500 : 100),
        games_played: user!.games_played + 1,
        games_won: won ? user!.games_won + 1 : user!.games_won,
      })
      .eq('id', userId)

    await supabaseAdmin.from('games').insert({
      type: 'upgrader',
      outcome: won ? 'win' : 'loss',
      player_id: userId,
      bet_amount: item.market_value,
      multiplier: won ? 2.5 : 0,
      profit: won ? newItem.market_value - item.market_value : -item.market_value,
      game_data: { old_item: item, new_item: newItem, roll },
      server_seed: rng.getSeeds().serverSeed,
      client_seed: clientSeed,
      xp_earned: won ? 500 : 100,
    })

    return res.status(200).json({
      success: true,
      won,
      old_item: item,
      new_item: newItem,
      roll,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}`,

  // ==================== PROFILE PAGE ====================
  'app/profile/[id]/page.tsx': `'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { motion } from 'framer-motion'
import { User, Trophy, Coins, TrendingUp, Gamepad2, Target, Flame } from 'lucide-react'
import { formatNumber, formatTimeAgo } from '@/lib/utils/formatters'
import Image from 'next/image'

export default function ProfilePage() {
  const params = useParams()
  const userId = params.id as string
  const [profile, setProfile] = useState<any>(null)
  const [recentGames, setRecentGames] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (userId) loadProfile()
  }, [userId])

  const loadProfile = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userData) setProfile(userData)

      const { data: gamesData } = await supabase
        .from('games')
        .select('*')
        .eq('player_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (gamesData) setRecentGames(gamesData)
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <User className="w-16 h-16 mx-auto mb-4 text-gray-500" />
        <h2 className="text-2xl font-bold mb-2">User not found</h2>
      </div>
    )
  }

  const winRate = profile.games_played > 0 ? (profile.games_won / profile.games_played) * 100 : 0

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-gold/20">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              <div className="w-30 h-30 rounded-full bg-gold/20 border-4 border-gold flex items-center justify-center">
                <span className="text-6xl">{profile.username[0]?.toUpperCase()}</span>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-4xl font-bold mb-2">{profile.username}</h1>
                <p className="text-xl text-gray-400 mb-4">@{profile.username}</p>

                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-gold" />
                    <span className="font-semibold">Level {profile.level}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Coins className="w-5 h-5 text-gold" />
                    <span className="font-semibold">{formatNumber(profile.coins)} coins</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Gamepad2 className="w-8 h-8 text-neon-blue mb-2" />
              <div className="text-2xl font-bold">{profile.games_played}</div>
              <div className="text-sm text-gray-400">Games Played</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Trophy className="w-8 h-8 text-neon-green mb-2" />
              <div className="text-2xl font-bold">{profile.games_won}</div>
              <div className="text-sm text-gray-400">Games Won</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Target className="w-8 h-8 text-neon-purple mb-2" />
              <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Win Rate</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Flame className="w-8 h-8 text-red-win mb-2" />
              <div className="text-2xl font-bold">{profile.best_win_streak}</div>
              <div className="text-sm text-gray-400">Best Streak</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Games</CardTitle>
        </CardHeader>
        <CardContent>
          {recentGames.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No games played yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentGames.map((game) => (
                <div
                  key={game.id}
                  className={\`p-3 rounded-lg border \${
                    game.outcome === 'win'
                      ? 'bg-green-win/10 border-green-win/30'
                      : 'bg-red-win/10 border-red-win/30'
                  }\`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold capitalize">{game.type}</div>
                      <div className="text-xs text-gray-400">{formatTimeAgo(game.created_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className={\`font-bold \${game.outcome === 'win' ? 'text-green-win' : 'text-red-win'}\`}>
                        {game.outcome === 'win' ? '+' : ''}{game.profit}
                      </div>
                      <div className="text-xs text-gray-400">{game.multiplier?.toFixed(2)}x</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}`,
};

function createFiles() {
  let created = 0;
  let errors = 0;

  for (const [filePath, content] of Object.entries(files)) {
    try {
      const dir = path.dirname(filePath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, content, 'utf8');
      console.log(\`✅ Created: \${filePath}\`);
      created++;
    } catch (error) {
      console.error(\`❌ Error creating \${filePath}:\`, error.message);
      errors++;
    }
  }

  console.log(\`\n================================\`);
  console.log(\`✅ Created: \${created} files\`);
  console.log(\`❌ Errors: \${errors}\`);
}

createFiles();