'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Bomb, Gem, TrendingUp, Target, DollarSign, History } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

interface Tile {
  id: number
  revealed: boolean
  isMine: boolean
  isSafe: boolean
}

interface GameHistory {
  bet: number
  mines: number
  tilesRevealed: number
  profit: number
  result: 'win' | 'loss'
  timestamp: Date
}

export default function MinesPage() {
  const { user, isLoading, updateCoins, refreshUser } = useUser()
  const router = useRouter()

  const [betAmount, setBetAmount] = useState(100)
  const [minesCount, setMinesCount] = useState(5)
  const [tiles, setTiles] = useState<Tile[]>([])
  const [gameActive, setGameActive] = useState(false)
  const [revealedCount, setRevealedCount] = useState(0)
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0)
  const [minePositions, setMinePositions] = useState<number[]>([])
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([])
  const [stats, setStats] = useState({
    totalGames: 0,
    totalWins: 0,
    totalProfit: 0,
    bestMultiplier: 0,
  })

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
        .eq('game_type', 'mines')
        .order('created_at', { ascending: false })

      if (data) {
        const totalGames = data.length
        const totalWins = data.filter(g => g.result === 'win').length
        const totalProfit = data.reduce((sum, g) => sum + (g.payout - g.bet_amount), 0)
        const bestMultiplier = Math.max(...data.map(g => g.multiplier || 1), 1)

        setStats({ totalGames, totalWins, totalProfit, bestMultiplier })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const initializeTiles = () => {
    const newTiles: Tile[] = []
    for (let i = 0; i < 25; i++) {
      newTiles.push({
        id: i,
        revealed: false,
        isMine: false,
        isSafe: false,
      })
    }
    return newTiles
  }

  const calculateMultiplier = (revealed: number, mines: number) => {
    const totalTiles = 25
    const safeTiles = totalTiles - mines

    if (revealed === 0) return 1.0

    // Calculate probability-based multiplier
    let multiplier = 1.0
    for (let i = 0; i < revealed; i++) {
      const remainingSafe = safeTiles - i
      const remainingTotal = totalTiles - i
      const probability = remainingSafe / remainingTotal
      multiplier *= (1 / probability) * 0.97 // 97% RTP
    }

    return multiplier
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

    // Generate mine positions
    const positions: number[] = []
    while (positions.length < minesCount) {
      const pos = Math.floor(Math.random() * 25)
      if (!positions.includes(pos)) {
        positions.push(pos)
      }
    }

    setMinePositions(positions)
    setTiles(initializeTiles())
    setGameActive(true)
    setRevealedCount(0)
    setCurrentMultiplier(1.0)

    // Deduct bet
    updateCoins(user.coins - betAmount)

    toast.success(`Game started! ${minesCount} mines hidden.`)
  }

  const revealTile = async (tileId: number) => {
    if (!gameActive || tiles[tileId].revealed) return

    const isMine = minePositions.includes(tileId)
    const newRevealedCount = revealedCount + 1

    // Update tile
    const newTiles = [...tiles]
    newTiles[tileId] = {
      ...newTiles[tileId],
      revealed: true,
      isMine,
      isSafe: !isMine,
    }
    setTiles(newTiles)

    if (isMine) {
      // Hit a mine - game over
      setGameActive(false)

      // Reveal all mines
      const allRevealed = newTiles.map(tile => ({
        ...tile,
        revealed: true,
      }))
      setTiles(allRevealed)

      // Save loss to database
      try {
        await supabase.from('games').insert({
          player_id: user!.id,
          game_type: 'mines',
          bet_amount: betAmount,
          result: 'loss',
          payout: 0,
          multiplier: currentMultiplier,
        })
      } catch (error) {
        console.error('Error saving game:', error)
      }

      toast.error(`💣 Mine hit! You lost ${formatNumber(betAmount)} coins`)

      const history: GameHistory = {
        bet: betAmount,
        mines: minesCount,
        tilesRevealed: newRevealedCount,
        profit: -betAmount,
        result: 'loss',
        timestamp: new Date(),
      }
      setGameHistory(prev => [history, ...prev.slice(0, 9)])

      await refreshUser()
      await loadStats()
    } else {
      // Safe tile
      const newMultiplier = calculateMultiplier(newRevealedCount, minesCount)
      setCurrentMultiplier(newMultiplier)
      setRevealedCount(newRevealedCount)

      toast.success(`💎 Safe! Multiplier: ${newMultiplier.toFixed(2)}x`)

      // Check if all safe tiles revealed
      if (newRevealedCount === 25 - minesCount) {
        await cashOut(newMultiplier, newRevealedCount, true)
      }
    }
  }

  const cashOut = async (multiplier?: number, revealed?: number, autoWin: boolean = false) => {
    if (!user || !gameActive) return

    const finalMultiplier = multiplier || currentMultiplier
    const finalRevealed = revealed || revealedCount
    const winAmount = Math.floor(betAmount * finalMultiplier)
    const profit = winAmount - betAmount

    setGameActive(false)

    // Reveal all tiles
    const allRevealed = tiles.map(tile => ({
      ...tile,
      revealed: true,
    }))
    setTiles(allRevealed)

    // Update coins
    const newBalance = user.coins + winAmount
    updateCoins(newBalance)

    // Save win to database
    try {
      await supabase.from('games').insert({
        player_id: user.id,
        game_type: 'mines',
        bet_amount: betAmount,
        result: 'win',
        payout: winAmount,
        multiplier: finalMultiplier,
      })
    } catch (error) {
      console.error('Error saving game:', error)
    }

    const message = autoWin
      ? `🎉 Perfect game! All safe tiles revealed! Won ${formatNumber(winAmount)} coins!`
      : `💰 Cashed out! Won ${formatNumber(winAmount)} coins!`

    toast.success(message)

    const history: GameHistory = {
      bet: betAmount,
      mines: minesCount,
      tilesRevealed: finalRevealed,
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

  const currentProfit = Math.floor(betAmount * currentMultiplier) - betAmount
  const nextMultiplier = calculateMultiplier(revealedCount + 1, minesCount)
  const canCashOut = gameActive && revealedCount > 0

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient-gold">Mines</span>
          </h1>
          <p className="text-gray-400">Reveal safe tiles to increase your multiplier. Cash out before hitting a mine!</p>
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
                <Gem className="w-8 h-8 text-green-win" />
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
                  <p className="text-xs text-gray-400">Best Multiplier</p>
                  <p className="text-xl font-bold text-purple-epic">{stats.bestMultiplier.toFixed(2)}x</p>
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
                      <p className="text-sm text-gray-400 mb-1">Tiles Revealed</p>
                      <p className="text-3xl font-bold">{revealedCount} / {25 - minesCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Current Multiplier</p>
                      <p className="text-3xl font-bold text-gold">{currentMultiplier.toFixed(2)}x</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Current Profit</p>
                      <p className={`text-3xl font-bold ${currentProfit >= 0 ? 'text-green-win' : 'text-red-win'}`}>
                        {currentProfit >= 0 ? '+' : ''}{formatNumber(currentProfit)}
                      </p>
                    </div>
                  </div>
                  {revealedCount > 0 && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-400">
                        Next tile: <span className="text-purple-epic font-bold">{nextMultiplier.toFixed(2)}x</span> multiplier
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Mines Grid */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {tiles.map((tile) => (
                    <button
                      key={tile.id}
                      onClick={() => revealTile(tile.id)}
                      disabled={!gameActive || tile.revealed}
                      className={`
                        aspect-square rounded-lg text-4xl font-bold
                        transition-all duration-300 transform
                        ${!tile.revealed && gameActive ? 'hover:scale-105 hover:shadow-lg cursor-pointer' : ''}
                        ${tile.revealed && tile.isMine ? 'bg-red-win/20 border-2 border-red-win' : ''}
                        ${tile.revealed && tile.isSafe ? 'bg-green-win/20 border-2 border-green-win' : ''}
                        ${!tile.revealed ? 'bg-game-bg border-2 border-gray-700 hover:border-purple-500' : ''}
                        disabled:cursor-not-allowed
                      `}
                    >
                      {tile.revealed && tile.isMine && <Bomb className="w-full h-full p-3 text-red-win" />}
                      {tile.revealed && tile.isSafe && <Gem className="w-full h-full p-3 text-green-win animate-pulse" />}
                      {!tile.revealed && gameActive && <span className="opacity-0">?</span>}
                      {!tile.revealed && !gameActive && minePositions.includes(tile.id) && (
                        <Bomb className="w-full h-full p-3 text-gray-600" />
                      )}
                    </button>
                  ))}
                </div>

                {canCashOut && (
                  <Button
                    variant="primary"
                    className="w-full text-lg py-6 bg-green-win hover:bg-green-600"
                    onClick={() => cashOut()}
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
                  <label className="block text-sm font-medium mb-2">Mines ({minesCount})</label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={minesCount}
                    onChange={(e) => setMinesCount(parseInt(e.target.value))}
                    disabled={gameActive}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Easy (1)</span>
                    <span>Hard (20)</span>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-sm text-gray-400 mb-2">Safe Tiles: {25 - minesCount}</p>
                  <p className="text-sm text-gray-400 mb-4">
                    First Tile: <span className="text-gold font-bold">{calculateMultiplier(1, minesCount).toFixed(2)}x</span>
                  </p>
                </div>

                <Button
                  variant="primary"
                  className="w-full text-lg py-6"
                  onClick={startGame}
                  disabled={gameActive}
                >
                  {gameActive ? '🎮 Game Active' : '🎮 Start Game'}
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
                            {game.result === 'win' ? '✅' : '💣'} {formatNumber(game.bet)} • {game.mines} mines
                          </span>
                          <span className={`font-bold ${game.profit >= 0 ? 'text-green-win' : 'text-red-win'}`}>
                            {game.profit >= 0 ? '+' : ''}{formatNumber(game.profit)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {game.tilesRevealed} tiles revealed
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
