'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Trophy, TrendingUp, Target, DollarSign, History, Castle, Zap, Crown } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

interface Level {
  id: number
  tiles: Tile[]
  revealed: boolean
}

interface Tile {
  id: number
  isWinning: boolean
  revealed: boolean
}

interface GameHistory {
  bet: number
  difficulty: string
  level: number
  profit: number
  result: 'win' | 'loss'
  timestamp: Date
}

export default function TowerPage() {
  const { user, isLoading, updateUser, refreshUser } = useUser()
  const router = useRouter()

  const [betAmount, setBetAmount] = useState(100)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [levels, setLevels] = useState<Level[]>([])
  const [gameActive, setGameActive] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(0)
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0)
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([])
  const [revealingTile, setRevealingTile] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalGames: 0,
    totalWins: 0,
    totalProfit: 0,
    highestLevel: 0,
  })

  const difficultyConfig = {
    easy: { tiles: 4, winning: 3, levels: 10, name: 'Easy', color: 'green', emoji: '🟢' },
    medium: { tiles: 3, winning: 2, levels: 15, name: 'Medium', color: 'yellow', emoji: '🟡' },
    hard: { tiles: 2, winning: 1, levels: 20, name: 'Hard', color: 'red', emoji: '🔴' },
  }

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user])

  const loadStats = async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('player_id', user.id)
        .eq('type', 'tower')
        .order('created_at', { ascending: false })

      if (data) {
        const totalGames = data.length
        const totalWins = data.filter(g => g.result === 'win').length
        const totalProfit = data.reduce((sum, g) => sum + (g.payout - g.bet_amount), 0)
        const highestLevel = Math.max(...data.map(g => g.multiplier || 0), 0)

        setStats({ totalGames, totalWins, totalProfit, highestLevel })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const calculateMultiplier = (level: number, diff: 'easy' | 'medium' | 'hard') => {
    const config = difficultyConfig[diff]
    const probability = config.winning / config.tiles

    // Calculate compound multiplier with house edge
    let multiplier = 1.0
    for (let i = 0; i <= level; i++) {
      multiplier *= (1 / probability) * 0.97 // 97% RTP
    }

    return multiplier
  }

  const generateLevel = (levelNum: number): Level => {
    const config = difficultyConfig[difficulty]
    const tiles: Tile[] = []

    // Create tiles and randomly assign winning tiles
    const winningIndices: number[] = []
    while (winningIndices.length < config.winning) {
      const index = Math.floor(Math.random() * config.tiles)
      if (!winningIndices.includes(index)) {
        winningIndices.push(index)
      }
    }

    for (let i = 0; i < config.tiles; i++) {
      tiles.push({
        id: i,
        isWinning: winningIndices.includes(i),
        revealed: false,
      })
    }

    return {
      id: levelNum,
      tiles,
      revealed: false,
    }
  }

  const startGame = async () => {
    if (!user) return

    if (betAmount < 10) {
      toast.error('Minimum bet is 10 coins')
      return
    }

    if (betAmount > user.coins) {
      toast.error('Insufficient balance')
      return
    }

    // Deduct bet immediately
    const newBalance = user.coins - betAmount
    updateUser({ coins: newBalance })
    await supabase.from('users').update({ coins: newBalance }).eq('id', user.id)

    // Generate all levels
    const config = difficultyConfig[difficulty]
    const newLevels: Level[] = []
    for (let i = 0; i < config.levels; i++) {
      newLevels.push(generateLevel(i))
    }

    setLevels(newLevels)
    setGameActive(true)
    setCurrentLevel(0)
    setCurrentMultiplier(1.0)

    toast.success(`🏰 Tower started! Climb ${config.levels} levels to win ${calculateMultiplier(config.levels, difficulty).toFixed(2)}x!`)
  }

  const selectTile = async (tileId: number) => {
    if (!gameActive) return

    const level = levels[currentLevel]
    const tile = level.tiles[tileId]

    if (tile.revealed) return

    // Animate tile reveal
    setRevealingTile(`${currentLevel}-${tileId}`)
    await new Promise(resolve => setTimeout(resolve, 300))

    // Reveal tile
    const newLevels = [...levels]
    newLevels[currentLevel].tiles[tileId].revealed = true

    if (tile.isWinning) {
      // Correct tile - move to next level
      newLevels[currentLevel].revealed = true
      const newLevel = currentLevel + 1
      const newMultiplier = calculateMultiplier(newLevel, difficulty)

      setLevels(newLevels)
      setCurrentLevel(newLevel)
      setCurrentMultiplier(newMultiplier)
      setRevealingTile(null)

      toast.success(`✅ Correct! Level ${newLevel} • ${newMultiplier.toFixed(2)}x multiplier`)

      // Check if completed all levels
      if (newLevel === difficultyConfig[difficulty].levels) {
        await completeGame(newMultiplier, newLevel, true)
      }
    } else {
      // Wrong tile - game over
      setLevels(newLevels)
      setGameActive(false)
      setRevealingTile(null)

      // Reveal all tiles in current level
      await new Promise(resolve => setTimeout(resolve, 500))
      const revealed = [...levels]
      revealed[currentLevel].tiles.forEach(t => {
        t.revealed = true
      })
      setLevels(revealed)

      // Save loss to database
      try {
        const newXp = user.xp + Math.floor(betAmount / 10)
        await supabase.from('users').update({
          xp: newXp,
          games_played: user.games_played + 1,
        }).eq('id', user.id)

        updateUser({
          xp: newXp,
          games_played: user.games_played + 1,
        })

        await supabase.from('games').insert({
          player_id: user!.id,
          type: 'tower',
          bet_amount: betAmount,
          result: 'loss',
          payout: 0,
          multiplier: currentLevel,
        })

        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'game_loss',
          amount: -betAmount,
          description: `Tower loss at level ${currentLevel} - ${difficulty}`,
        })
      } catch (error) {
        console.error('Error saving game:', error)
      }

      toast.error(`❌ Wrong tile! Lost ${formatNumber(betAmount)} coins at level ${currentLevel}`)

      const history: GameHistory = {
        bet: betAmount,
        difficulty: difficultyConfig[difficulty].name,
        level: currentLevel,
        profit: -betAmount,
        result: 'loss',
        timestamp: new Date(),
      }
      setGameHistory(prev => [history, ...prev.slice(0, 9)])

      await refreshUser()
      await loadStats()
    }
  }

  const cashOut = async () => {
    if (!user || !gameActive || currentLevel === 0) return

    await completeGame(currentMultiplier, currentLevel, false)
  }

  const completeGame = async (multiplier: number, level: number, perfectWin: boolean) => {
    if (!user) return

    const winAmount = Math.floor(betAmount * multiplier)
    const profit = winAmount - betAmount

    setGameActive(false)

    // Update coins
    const newBalance = user.coins + winAmount
    const newXp = user.xp + Math.floor(winAmount / 10)

    updateUser({
      coins: newBalance,
      xp: newXp,
      games_won: user.games_won + 1,
      games_played: user.games_played + 1,
      total_winnings: user.total_winnings + winAmount,
    })

    // Save win to database
    try {
      await supabase.from('users').update({
        coins: newBalance,
        xp: newXp,
        games_won: user.games_won + 1,
        games_played: user.games_played + 1,
        total_winnings: user.total_winnings + winAmount,
      }).eq('id', user.id)

      await supabase.from('games').insert({
        player_id: user.id,
        type: 'tower',
        bet_amount: betAmount,
        result: 'win',
        payout: winAmount,
        multiplier: level,
      })

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'game_win',
        amount: profit,
        description: `Tower win at level ${level} - ${difficulty}`,
      })
    } catch (error) {
      console.error('Error saving game:', error)
    }

    const message = perfectWin
      ? `👑 Perfect climb! Reached the top! Won ${formatNumber(winAmount)} coins! (+${formatNumber(profit)})`
      : `💰 Cashed out at level ${level}! Won ${formatNumber(winAmount)} coins! (+${formatNumber(profit)})`

    toast.success(message)

    const history: GameHistory = {
      bet: betAmount,
      difficulty: difficultyConfig[difficulty].name,
      level,
      profit,
      result: 'win',
      timestamp: new Date(),
    }
    setGameHistory(prev => [history, ...prev.slice(0, 9)])

    await refreshUser()
    await loadStats()
  }

  const quickBet = (multiplier: number) => {
    if (user) {
      setBetAmount(Math.min(Math.floor(user.coins * multiplier), user.coins))
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12" />
      </div>
    )
  }

  const currentConfig = difficultyConfig[difficulty]
  const currentProfit = Math.floor(betAmount * currentMultiplier) - betAmount
  const nextMultiplier = calculateMultiplier(currentLevel + 1, difficulty)
  const canCashOut = gameActive && currentLevel > 0
  const progressPercent = (currentLevel / currentConfig.levels) * 100

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Castle className="w-10 h-10 text-yellow-500" />
            <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Tower
            </span>
          </h1>
          <p className="text-gray-400">Climb the tower by selecting winning tiles. Cash out anytime or reach the top for maximum payout!</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-xs text-gray-400">Total Games</p>
                  <p className="text-xl font-bold">{stats.totalGames}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-xs text-gray-400">Wins</p>
                  <p className="text-xl font-bold text-green-400">{stats.totalWins}</p>
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
                <Crown className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-xs text-gray-400">Highest Level</p>
                  <p className="text-xl font-bold text-yellow-400">{stats.highestLevel}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Area */}
          <div className="lg:col-span-2">
            {/* Current Game Info */}
            {gameActive && (
              <Card className="mb-6 bg-gradient-to-br from-yellow-900/30 to-orange-900/20 border-yellow-500/40 animate-fadeIn">
                <CardContent className="p-6">
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300 font-semibold">Tower Progress</span>
                      <span className="text-yellow-400 font-bold">{currentLevel} / {currentConfig.levels}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden border-2 border-yellow-500/30">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 transition-all duration-500 animate-pulse"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-black/30 p-4 rounded-lg border border-yellow-500/20">
                      <p className="text-sm text-gray-400 mb-1">Current Level</p>
                      <p className="text-3xl font-bold text-yellow-400">{currentLevel}</p>
                    </div>
                    <div className="bg-black/30 p-4 rounded-lg border border-orange-500/20">
                      <p className="text-sm text-gray-400 mb-1">Multiplier</p>
                      <p className="text-3xl font-bold text-orange-400">{currentMultiplier.toFixed(2)}x</p>
                    </div>
                    <div className="bg-black/30 p-4 rounded-lg border border-green-500/20">
                      <p className="text-sm text-gray-400 mb-1">Current Profit</p>
                      <p className={`text-3xl font-bold ${currentProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {currentProfit >= 0 ? '+' : ''}{formatNumber(currentProfit)}
                      </p>
                    </div>
                  </div>

                  {currentLevel < currentConfig.levels && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/30">
                      <p className="text-sm text-center">
                        Next level: <span className="text-purple-400 font-bold">{nextMultiplier.toFixed(2)}x</span> multiplier •
                        Potential win: <span className="text-green-400 font-bold">{formatNumber(Math.floor(betAmount * nextMultiplier))}</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tower */}
            <Card className="bg-gradient-to-b from-yellow-900/20 to-orange-900/10 border-yellow-500/30">
              <CardContent className="p-6">
                {!gameActive && levels.length === 0 && (
                  <div className="text-center py-20">
                    <Castle className="w-20 h-20 mx-auto mb-4 text-yellow-500/50" />
                    <p className="text-2xl font-bold text-gray-400 mb-2">Ready to Climb?</p>
                    <p className="text-gray-500">Select your difficulty and bet amount to start</p>
                  </div>
                )}

                {levels.length > 0 && (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-yellow-500/30 scrollbar-track-gray-800">
                    {/* Render levels from top to bottom */}
                    {[...levels].reverse().map((level, reverseIndex) => {
                      const levelIndex = levels.length - 1 - reverseIndex
                      const isCurrentLevel = levelIndex === currentLevel && gameActive
                      const isPastLevel = levelIndex < currentLevel
                      const isFutureLevel = levelIndex > currentLevel

                      return (
                        <div
                          key={level.id}
                          className={`
                            p-4 rounded-lg border-2 transition-all duration-300
                            ${isCurrentLevel ? 'bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-yellow-500 shadow-lg shadow-yellow-500/20 animate-pulse-slow' : ''}
                            ${isPastLevel ? 'bg-gradient-to-r from-green-900/30 to-green-800/20 border-green-500/40' : ''}
                            ${isFutureLevel ? 'bg-gray-800/30 border-gray-700/50' : ''}
                            ${!gameActive ? 'bg-gray-800/30 border-gray-700/50' : ''}
                          `}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {isPastLevel && <span className="text-green-400">✅</span>}
                              {isCurrentLevel && <Zap className="w-4 h-4 text-yellow-400 animate-bounce" />}
                              {isFutureLevel && <span className="text-gray-600">🔒</span>}
                              <span className="text-sm font-bold">
                                Level {levelIndex + 1}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-yellow-400" />
                              <span className="text-sm text-yellow-400 font-bold">
                                {calculateMultiplier(levelIndex + 1, difficulty).toFixed(2)}x
                              </span>
                            </div>
                          </div>

                          <div className={`grid gap-2 ${currentConfig.tiles === 4 ? 'grid-cols-4' : currentConfig.tiles === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                            {level.tiles.map((tile) => {
                              const tileKey = `${levelIndex}-${tile.id}`
                              const isRevealing = revealingTile === tileKey

                              return (
                                <button
                                  key={tile.id}
                                  onClick={() => selectTile(tile.id)}
                                  disabled={!isCurrentLevel || tile.revealed}
                                  className={`
                                    aspect-square rounded-lg font-bold text-2xl transition-all duration-300 relative overflow-hidden
                                    ${isCurrentLevel && !tile.revealed ? 'hover:scale-110 hover:shadow-xl hover:shadow-yellow-500/30 cursor-pointer bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-600 hover:border-yellow-500 animate-fadeIn' : ''}
                                    ${tile.revealed && tile.isWinning ? 'bg-gradient-to-br from-green-600 to-green-800 border-2 border-green-400 text-white scale-105 shadow-lg shadow-green-500/50 animate-bounce' : ''}
                                    ${tile.revealed && !tile.isWinning ? 'bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-400 text-white animate-shake' : ''}
                                    ${isPastLevel && !tile.revealed ? 'bg-gray-800/50 border-2 border-gray-700/30' : ''}
                                    ${isFutureLevel ? 'bg-gray-800/30 border-2 border-gray-700/30 cursor-not-allowed opacity-50' : ''}
                                    ${isRevealing ? 'animate-spin-once' : ''}
                                    disabled:cursor-not-allowed
                                  `}
                                >
                                  {!tile.revealed && isCurrentLevel && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent animate-shimmer" />
                                  )}
                                  {tile.revealed && tile.isWinning && '✅'}
                                  {tile.revealed && !tile.isWinning && '❌'}
                                  {!tile.revealed && isPastLevel && '✓'}
                                  {!tile.revealed && isFutureLevel && '?'}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {canCashOut && (
                  <Button
                    variant="primary"
                    className="w-full mt-4 text-lg py-6 bg-gradient-to-r from-green-600 via-green-500 to-green-600 hover:from-green-500 hover:via-green-400 hover:to-green-500 font-bold shadow-lg shadow-green-500/50 transition-all hover:scale-105 animate-pulse-slow"
                    onClick={cashOut}
                  >
                    <DollarSign className="w-6 h-6 mr-2" />
                    Cash Out • Win {formatNumber(Math.floor(betAmount * currentMultiplier))} coins
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Controls & History */}
          <div className="space-y-6">
            {/* Betting Controls */}
            <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Castle className="w-5 h-5 text-yellow-500" />
                  Game Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Bet Amount</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 0))}
                    disabled={gameActive}
                    className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:border-yellow-500 focus:outline-none transition-all font-bold text-lg"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="secondary" onClick={() => quickBet(0.25)} disabled={gameActive} className="flex-1">
                      1/4
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => quickBet(0.5)} disabled={gameActive} className="flex-1">
                      1/2
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => quickBet(1)} disabled={gameActive} className="flex-1">
                      MAX
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Difficulty</label>
                  <div className="space-y-2">
                    {(['easy', 'medium', 'hard'] as const).map((diff) => {
                      const config = difficultyConfig[diff]
                      return (
                        <button
                          key={diff}
                          onClick={() => setDifficulty(diff)}
                          disabled={gameActive}
                          className={`
                            w-full p-4 rounded-lg border-2 transition-all
                            ${difficulty === diff
                              ? 'border-yellow-500 bg-gradient-to-r from-yellow-900/40 to-orange-900/40 shadow-lg shadow-yellow-500/20'
                              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'}
                            ${gameActive ? 'cursor-not-allowed opacity-50' : 'hover:scale-102 cursor-pointer'}
                          `}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{config.emoji}</span>
                              <span className="font-bold capitalize text-lg">{config.name}</span>
                            </div>
                            {difficulty === diff && <span className="text-yellow-400">✓</span>}
                          </div>
                          <div className="text-sm text-gray-400 flex justify-between">
                            <span>{config.tiles} tiles per level</span>
                            <span>{config.levels} levels total</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg border border-yellow-500/30">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Winning tiles per level:</span>
                      <span className="text-green-400 font-bold">{currentConfig.winning} / {currentConfig.tiles}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Win probability:</span>
                      <span className="text-blue-400 font-bold">
                        {((currentConfig.winning / currentConfig.tiles) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max multiplier:</span>
                      <span className="text-yellow-400 font-bold">
                        {calculateMultiplier(currentConfig.levels, difficulty).toFixed(2)}x
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max payout:</span>
                      <span className="text-green-400 font-bold">
                        {formatNumber(Math.floor(betAmount * calculateMultiplier(currentConfig.levels, difficulty)))}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full text-lg py-6 bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 hover:from-yellow-500 hover:via-orange-500 hover:to-red-500 font-bold shadow-lg shadow-yellow-500/30 transition-all hover:scale-105"
                  onClick={startGame}
                  disabled={gameActive}
                >
                  {gameActive ? (
                    <>
                      <Zap className="w-6 h-6 mr-2 animate-spin" />
                      Game Active
                    </>
                  ) : (
                    <>
                      <Castle className="w-6 h-6 mr-2" />
                      Start Climbing
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Game History */}
            <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Recent Games
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gameHistory.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No games played yet - start climbing!</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {gameHistory.map((game, index) => (
                      <div
                        key={index}
                        className={`
                          p-4 rounded-lg transition-all hover:scale-102 animate-fadeIn
                          ${game.result === 'win'
                            ? 'bg-gradient-to-r from-green-900/30 to-green-800/20 border border-green-500/40'
                            : 'bg-gradient-to-r from-red-900/30 to-red-800/20 border border-red-500/40'}
                        `}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{game.result === 'win' ? '✅' : '❌'}</span>
                            <span className="font-bold">{formatNumber(game.bet)}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-sm">{game.difficulty}</span>
                          </div>
                          <span className={`font-bold text-lg ${game.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {game.profit >= 0 ? '+' : ''}{formatNumber(game.profit)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>Reached level {game.level}</span>
                          <span className={game.result === 'win' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                            {game.result === 'win' ? 'CASHED OUT' : 'LOST'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(1.01); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        @keyframes spin-once {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        .animate-spin-once {
          animation: spin-once 0.3s ease-in-out;
        }
        @keyframes shimmer {
          from { transform: translateX(-100%) translateY(-100%); }
          to { transform: translateX(100%) translateY(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        .scrollbar-thumb-yellow-500\/30 {
          scrollbar-color: rgba(234, 179, 8, 0.3) transparent;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(234, 179, 8, 0.3);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(234, 179, 8, 0.5);
        }
      `}</style>
    </div>
  )
}
