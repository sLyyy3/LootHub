'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Trophy, TrendingUp, Target, DollarSign, History } from 'lucide-react'
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
  const { user, isLoading, updateCoins, refreshUser } = useUser()
  const router = useRouter()

  const [betAmount, setBetAmount] = useState(100)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [levels, setLevels] = useState<Level[]>([])
  const [gameActive, setGameActive] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(0)
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0)
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([])
  const [stats, setStats] = useState({
    totalGames: 0,
    totalWins: 0,
    totalProfit: 0,
    highestLevel: 0,
  })

  const difficultyConfig = {
    easy: { tiles: 4, winning: 3, levels: 10, name: 'Easy' },
    medium: { tiles: 3, winning: 2, levels: 15, name: 'Medium' },
    hard: { tiles: 2, winning: 1, levels: 20, name: 'Hard' },
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
        .eq('game_type', 'tower')
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

  const startGame = () => {
    if (!user) return

    if (betAmount < 10) {
      toast.error('Minimum bet is 10 coins')
      return
    }

    if (betAmount > user.coins) {
      toast.error('Insufficient balance')
      return
    }

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

    // Deduct bet
    updateCoins(user.coins - betAmount)

    toast.success(`Tower started! Climb ${config.levels} levels to win big!`)
  }

  const selectTile = async (tileId: number) => {
    if (!gameActive) return

    const level = levels[currentLevel]
    const tile = level.tiles[tileId]

    if (tile.revealed) return

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

      toast.success(`✅ Correct! Level ${newLevel} • ${newMultiplier.toFixed(2)}x`)

      // Check if completed all levels
      if (newLevel === difficultyConfig[difficulty].levels) {
        await completeGame(newMultiplier, newLevel, true)
      }
    } else {
      // Wrong tile - game over
      setLevels(newLevels)
      setGameActive(false)

      // Reveal all tiles in current level
      const revealed = [...levels]
      revealed[currentLevel].tiles.forEach(t => {
        t.revealed = true
      })
      setLevels(revealed)

      // Save loss to database
      try {
        await supabase.from('games').insert({
          player_id: user!.id,
          game_type: 'tower',
          bet_amount: betAmount,
          result: 'loss',
          payout: 0,
          multiplier: currentLevel,
        })
      } catch (error) {
        console.error('Error saving game:', error)
      }

      toast.error(`❌ Wrong tile! You lost ${formatNumber(betAmount)} coins`)

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
    updateCoins(newBalance)

    // Save win to database
    try {
      await supabase.from('games').insert({
        player_id: user.id,
        game_type: 'tower',
        bet_amount: betAmount,
        result: 'win',
        payout: winAmount,
        multiplier: level,
      })
    } catch (error) {
      console.error('Error saving game:', error)
    }

    const message = perfectWin
      ? `🏆 Perfect climb! Reached the top! Won ${formatNumber(winAmount)} coins!`
      : `💰 Cashed out at level ${level}! Won ${formatNumber(winAmount)} coins!`

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

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient-gold">Tower</span>
          </h1>
          <p className="text-gray-400">Climb the tower by selecting winning tiles. Cash out anytime or reach the top for maximum payout!</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-blue-rare" />
                <div>
                  <p className="text-xs text-gray-400">Total Games</p>
                  <p className="text-xl font-bold">{stats.totalGames}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-green-win" />
                <div>
                  <p className="text-xs text-gray-400">Wins</p>
                  <p className="text-xl font-bold text-green-win">{stats.totalWins}</p>
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
                  <p className="text-xs text-gray-400">Highest Level</p>
                  <p className="text-xl font-bold text-purple-epic">{stats.highestLevel}</p>
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
              <Card className="mb-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/50">
                <CardContent className="p-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Current Level</p>
                      <p className="text-3xl font-bold">{currentLevel} / {currentConfig.levels}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Multiplier</p>
                      <p className="text-3xl font-bold text-gold">{currentMultiplier.toFixed(2)}x</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Current Profit</p>
                      <p className={`text-3xl font-bold ${currentProfit >= 0 ? 'text-green-win' : 'text-red-win'}`}>
                        {currentProfit >= 0 ? '+' : ''}{formatNumber(currentProfit)}
                      </p>
                    </div>
                  </div>
                  {currentLevel < currentConfig.levels && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-400">
                        Next level: <span className="text-purple-epic font-bold">{nextMultiplier.toFixed(2)}x</span> multiplier
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tower */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
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
                          p-4 rounded-lg border-2 transition-all
                          ${isCurrentLevel ? 'bg-purple-900/20 border-purple-500' : ''}
                          ${isPastLevel ? 'bg-green-900/20 border-green-500/30' : ''}
                          ${isFutureLevel ? 'bg-gray-800/50 border-gray-700' : ''}
                          ${!gameActive ? 'bg-gray-800/50 border-gray-700' : ''}
                        `}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold">
                            Level {levelIndex + 1}
                          </span>
                          <span className="text-sm text-gold font-bold">
                            {calculateMultiplier(levelIndex + 1, difficulty).toFixed(2)}x
                          </span>
                        </div>

                        <div className={`grid gap-2 ${currentConfig.tiles === 4 ? 'grid-cols-4' : currentConfig.tiles === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                          {level.tiles.map((tile) => (
                            <button
                              key={tile.id}
                              onClick={() => selectTile(tile.id)}
                              disabled={!isCurrentLevel || tile.revealed}
                              className={`
                                aspect-square rounded-lg font-bold transition-all duration-300
                                ${isCurrentLevel && !tile.revealed ? 'hover:scale-105 hover:shadow-lg cursor-pointer bg-game-bg border-2 border-gray-700 hover:border-purple-500' : ''}
                                ${tile.revealed && tile.isWinning ? 'bg-green-win/20 border-2 border-green-win text-green-win' : ''}
                                ${tile.revealed && !tile.isWinning ? 'bg-red-win/20 border-2 border-red-win text-red-win' : ''}
                                ${isPastLevel && !tile.revealed ? 'bg-gray-800 border-2 border-gray-700' : ''}
                                ${isFutureLevel ? 'bg-gray-800 border-2 border-gray-700 cursor-not-allowed' : ''}
                                disabled:cursor-not-allowed
                              `}
                            >
                              {tile.revealed && tile.isWinning && '✓'}
                              {tile.revealed && !tile.isWinning && '✗'}
                              {!tile.revealed && isPastLevel && '✓'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {canCashOut && (
                  <Button
                    variant="primary"
                    className="w-full mt-4 text-lg py-6 bg-green-win hover:bg-green-600"
                    onClick={cashOut}
                  >
                    💰 Cash Out • Win {formatNumber(Math.floor(betAmount * currentMultiplier))} coins
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Controls & History */}
          <div className="space-y-6">
            {/* Betting Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Game Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Bet Amount</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 0))}
                    disabled={gameActive}
                    className="w-full px-4 py-2 bg-game-bg border border-gray-700 rounded-lg focus:border-gold focus:outline-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="secondary" onClick={() => quickBet(0.25)} disabled={gameActive}>
                      1/4
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => quickBet(0.5)} disabled={gameActive}>
                      1/2
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => quickBet(1)} disabled={gameActive}>
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
                            w-full p-3 rounded-lg border-2 transition-all
                            ${difficulty === diff ? 'border-gold bg-gold/10' : 'border-gray-700 bg-game-bg'}
                            ${gameActive ? 'cursor-not-allowed opacity-50' : 'hover:border-gold/50 cursor-pointer'}
                          `}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold capitalize">{config.name}</span>
                            <span className="text-sm text-gray-400">
                              {config.tiles} tiles • {config.levels} levels
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-2 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Winning tiles:</span>
                    <span className="text-green-win font-bold">{currentConfig.winning} / {currentConfig.tiles}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max multiplier:</span>
                    <span className="text-gold font-bold">
                      {calculateMultiplier(currentConfig.levels, difficulty).toFixed(2)}x
                    </span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full text-lg py-6"
                  onClick={startGame}
                  disabled={gameActive}
                >
                  {gameActive ? '🎮 Game Active' : '🎮 Start Climbing'}
                </Button>
              </CardContent>
            </Card>

            {/* Game History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Recent Games
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gameHistory.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">No games played yet</p>
                ) : (
                  <div className="space-y-2">
                    {gameHistory.map((game, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${game.result === 'win' ? 'bg-green-win/10 border border-green-win/30' : 'bg-red-win/10 border border-red-win/30'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold">
                            {game.result === 'win' ? '✅' : '❌'} {formatNumber(game.bet)} • {game.difficulty}
                          </span>
                          <span className={`font-bold ${game.profit >= 0 ? 'text-green-win' : 'text-red-win'}`}>
                            {game.profit >= 0 ? '+' : ''}{formatNumber(game.profit)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          Reached level {game.level}
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
    </div>
  )
}
