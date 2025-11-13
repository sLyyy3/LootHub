'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Bomb, Gem, TrendingUp, Target, DollarSign, History, Sparkles, Skull } from 'lucide-react'
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
  const { user, isLoading, updateUser, refreshUser } = useUser()
  const router = useRouter()

  const [betAmount, setBetAmount] = useState(100)
  const [minesCount, setMinesCount] = useState(5)
  const [tiles, setTiles] = useState<Tile[]>([])
  const [gameActive, setGameActive] = useState(false)
  const [revealedCount, setRevealedCount] = useState(0)
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0)
  const [minePositions, setMinePositions] = useState<number[]>([])
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([])
  const [revealingTile, setRevealingTile] = useState<number | null>(null)
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
        .eq('type', 'mines')
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

    toast.success(`💎 Game started! ${minesCount} mines hidden among ${25 - minesCount} gems.`)
  }

  const revealTile = async (tileId: number) => {
    if (!gameActive || tiles[tileId].revealed) return

    // Animate tile flip
    setRevealingTile(tileId)
    await new Promise(resolve => setTimeout(resolve, 200))

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
    setRevealingTile(null)

    if (isMine) {
      // Hit a mine - game over
      setGameActive(false)

      // Reveal all mines with delay
      await new Promise(resolve => setTimeout(resolve, 500))
      const allRevealed = newTiles.map((tile, idx) => ({
        ...tile,
        revealed: true,
        isMine: minePositions.includes(idx),
        isSafe: !minePositions.includes(idx),
      }))
      setTiles(allRevealed)

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
          type: 'mines',
          bet_amount: betAmount,
          result: 'loss',
          payout: 0,
          multiplier: currentMultiplier,
        })

        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'game_loss',
          amount: -betAmount,
          description: `Mines loss - ${minesCount} mines, ${revealedCount} gems found`,
        })
      } catch (error) {
        console.error('Error saving game:', error)
      }

      toast.error(`💣 Mine hit! Lost ${formatNumber(betAmount)} coins after revealing ${revealedCount} gems`)

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

      toast.success(`💎 Gem found! Multiplier: ${newMultiplier.toFixed(2)}x • Win: ${formatNumber(Math.floor(betAmount * newMultiplier))}`)

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
    const allRevealed = tiles.map((tile, idx) => ({
      ...tile,
      revealed: true,
      isMine: minePositions.includes(idx),
      isSafe: !minePositions.includes(idx),
    }))
    setTiles(allRevealed)

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
        type: 'mines',
        bet_amount: betAmount,
        result: 'win',
        payout: winAmount,
        multiplier: finalMultiplier,
      })

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'game_win',
        amount: profit,
        description: `Mines win - ${minesCount} mines, ${finalRevealed} gems found (${finalMultiplier.toFixed(2)}x)`,
      })
    } catch (error) {
      console.error('Error saving game:', error)
    }

    const message = autoWin
      ? `🎉 Perfect game! All ${finalRevealed} gems found! Won ${formatNumber(winAmount)} coins! (+${formatNumber(profit)})`
      : `💰 Cashed out with ${finalRevealed} gems! Won ${formatNumber(winAmount)} coins! (+${formatNumber(profit)})`

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
  const progressPercent = (revealedCount / (25 - minesCount)) * 100

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Gem className="w-10 h-10 text-cyan-400" />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Mines
            </span>
          </h1>
          <p className="text-gray-400">Reveal gems to increase your multiplier. Cash out before hitting a mine!</p>
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
                <Gem className="w-8 h-8 text-green-400" />
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

          <Card className="bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 border-cyan-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-xs text-gray-400">Best Multiplier</p>
                  <p className="text-xl font-bold text-cyan-400">{stats.bestMultiplier.toFixed(2)}x</p>
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
              <Card className="mb-6 bg-gradient-to-br from-cyan-900/30 to-purple-900/20 border-cyan-500/40 animate-fadeIn">
                <CardContent className="p-6">
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300 font-semibold">Gems Found</span>
                      <span className="text-cyan-400 font-bold">{revealedCount} / {25 - minesCount}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden border-2 border-cyan-500/30">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-500 animate-pulse"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-black/30 p-4 rounded-lg border border-cyan-500/20">
                      <p className="text-sm text-gray-400 mb-1">Gems Found</p>
                      <p className="text-3xl font-bold text-cyan-400">{revealedCount}</p>
                    </div>
                    <div className="bg-black/30 p-4 rounded-lg border border-purple-500/20">
                      <p className="text-sm text-gray-400 mb-1">Multiplier</p>
                      <p className="text-3xl font-bold text-purple-400">{currentMultiplier.toFixed(2)}x</p>
                    </div>
                    <div className="bg-black/30 p-4 rounded-lg border border-green-500/20">
                      <p className="text-sm text-gray-400 mb-1">Current Profit</p>
                      <p className={`text-3xl font-bold ${currentProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {currentProfit >= 0 ? '+' : ''}{formatNumber(currentProfit)}
                      </p>
                    </div>
                  </div>

                  {revealedCount > 0 && revealedCount < 25 - minesCount && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-500/30">
                      <p className="text-sm text-center">
                        Next gem: <span className="text-blue-400 font-bold">{nextMultiplier.toFixed(2)}x</span> multiplier •
                        Potential win: <span className="text-green-400 font-bold">{formatNumber(Math.floor(betAmount * nextMultiplier))}</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Mines Grid */}
            <Card className="bg-gradient-to-br from-cyan-900/20 to-purple-900/10 border-cyan-500/30">
              <CardContent className="p-6">
                {!gameActive && tiles.length === 0 && (
                  <div className="text-center py-20">
                    <Gem className="w-20 h-20 mx-auto mb-4 text-cyan-500/50 animate-pulse" />
                    <p className="text-2xl font-bold text-gray-400 mb-2">Ready to Mine Gems?</p>
                    <p className="text-gray-500">Select mine count and bet amount to start</p>
                  </div>
                )}

                {tiles.length > 0 && (
                  <>
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {tiles.map((tile) => {
                        const isRevealing = revealingTile === tile.id

                        return (
                          <button
                            key={tile.id}
                            onClick={() => revealTile(tile.id)}
                            disabled={!gameActive || tile.revealed}
                            className={`
                              aspect-square rounded-lg font-bold relative overflow-hidden
                              transition-all duration-300 transform
                              ${!tile.revealed && gameActive ? 'hover:scale-110 hover:shadow-xl hover:shadow-cyan-500/30 cursor-pointer bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-600 hover:border-cyan-500 animate-fadeIn' : ''}
                              ${tile.revealed && tile.isMine ? 'bg-gradient-to-br from-red-600 to-red-900 border-2 border-red-400 scale-105 shadow-lg shadow-red-500/50 animate-shake' : ''}
                              ${tile.revealed && tile.isSafe ? 'bg-gradient-to-br from-cyan-600 to-blue-700 border-2 border-cyan-400 scale-105 shadow-lg shadow-cyan-500/50 animate-bounce' : ''}
                              ${isRevealing ? 'animate-flip' : ''}
                              disabled:cursor-not-allowed
                            `}
                          >
                            {!tile.revealed && gameActive && (
                              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent animate-shimmer" />
                            )}
                            {tile.revealed && tile.isMine && (
                              <Bomb className="w-full h-full p-2 text-red-300 animate-pulse" />
                            )}
                            {tile.revealed && tile.isSafe && (
                              <Gem className="w-full h-full p-2 text-cyan-300 animate-pulse" />
                            )}
                            {!tile.revealed && !gameActive && minePositions.includes(tile.id) && (
                              <Skull className="w-full h-full p-2 text-gray-600/50" />
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {canCashOut && (
                      <Button
                        variant="primary"
                        className="w-full text-lg py-6 bg-gradient-to-r from-green-600 via-green-500 to-green-600 hover:from-green-500 hover:via-green-400 hover:to-green-500 font-bold shadow-lg shadow-green-500/50 transition-all hover:scale-105 animate-pulse-slow"
                        onClick={() => cashOut()}
                      >
                        <DollarSign className="w-6 h-6 mr-2" />
                        Cash Out • Win {formatNumber(Math.floor(betAmount * currentMultiplier))} coins
                      </Button>
                    )}
                  </>
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
                  <Gem className="w-5 h-5 text-cyan-500" />
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
                    className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none transition-all font-bold text-lg"
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
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium">Mines</label>
                    <span className="text-sm font-bold text-cyan-400">{minesCount}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={minesCount}
                    onChange={(e) => setMinesCount(parseInt(e.target.value))}
                    disabled={gameActive}
                    className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>🟢 1 (Easy)</span>
                    <span>🔴 20 (Hard)</span>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-cyan-900/20 to-purple-900/20 rounded-lg border border-cyan-500/30">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Safe gems:</span>
                      <span className="text-cyan-400 font-bold">{25 - minesCount} / 25</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mines:</span>
                      <span className="text-red-400 font-bold">{minesCount} / 25</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">First gem multiplier:</span>
                      <span className="text-purple-400 font-bold">{calculateMultiplier(1, minesCount).toFixed(2)}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max payout (all gems):</span>
                      <span className="text-green-400 font-bold">
                        {formatNumber(Math.floor(betAmount * calculateMultiplier(25 - minesCount, minesCount)))}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full text-lg py-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 font-bold shadow-lg shadow-cyan-500/30 transition-all hover:scale-105"
                  onClick={startGame}
                  disabled={gameActive}
                >
                  {gameActive ? (
                    <>
                      <Sparkles className="w-6 h-6 mr-2 animate-spin" />
                      Game Active
                    </>
                  ) : (
                    <>
                      <Gem className="w-6 h-6 mr-2" />
                      Start Mining
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
                  <p className="text-center text-gray-400 py-8">No games played yet - start mining!</p>
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
                            <span className="text-xl">{game.result === 'win' ? '💎' : '💣'}</span>
                            <span className="font-bold">{formatNumber(game.bet)}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-sm">{game.mines} mines</span>
                          </div>
                          <span className={`font-bold text-lg ${game.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {game.profit >= 0 ? '+' : ''}{formatNumber(game.profit)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>{game.tilesRevealed} gems found</span>
                          <span className={game.result === 'win' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                            {game.result === 'win' ? 'CASHED OUT' : 'HIT MINE'}
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
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(1.02); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        @keyframes shake {
          0%, 100% { transform: rotate(0deg) scale(1.05); }
          25% { transform: rotate(-5deg) scale(1.05); }
          75% { transform: rotate(5deg) scale(1.05); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes flip {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(180deg); }
        }
        .animate-flip {
          animation: flip 0.2s ease-in-out;
        }
        @keyframes shimmer {
          from { transform: translateX(-100%) translateY(-100%); }
          to { transform: translateX(100%) translateY(100%); }
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
        }
        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
          border: none;
        }
      `}</style>
    </div>
  )
}
