'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/lib/hooks/useUser'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Gamepad2, Trophy, Package, TrendingUp, Gift } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

export default function DashboardPage() {
  const { user, isLoading, refreshUser } = useUser()
  const router = useRouter()
  const [canClaim, setCanClaim] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    checkDailyReward()
  }, [user])

  const checkDailyReward = async () => {
    if (!user) return

    const { data } = await supabase
      .from('users')
      .select('last_daily_claim')
      .eq('id', user.id)
      .single()

    if (data) {
      const lastClaim = data.last_daily_claim ? new Date(data.last_daily_claim) : null
      const now = new Date()
      const canClaimNow = !lastClaim || (now.getTime() - lastClaim.getTime()) > 24 * 60 * 60 * 1000
      setCanClaim(canClaimNow)
    }
  }

  const claimDailyReward = async () => {
    if (!user || !canClaim) return
    setIsClaiming(true)

    try {
      const reward = 1000
      const { error } = await supabase
        .from('users')
        .update({
          coins: user.coins + reward,
          last_daily_claim: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success(`Claimed ${formatNumber(reward)} coins!`)
      setCanClaim(false)
      await refreshUser()
    } catch (error) {
      toast.error('Failed to claim daily reward')
    } finally {
      setIsClaiming(false)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12" />
      </div>
    )
  }

  const games = [
    {
      title: 'Coinflip',
      description: 'Double or nothing! 50/50 chance to win',
      icon: Gamepad2,
      href: '/games/coinflip',
      color: 'gold',
    },
    {
      title: 'Crash',
      description: 'Cash out before it crashes!',
      icon: TrendingUp,
      href: '/games/crash',
      color: 'red-win',
    },
    {
      title: 'Cases',
      description: 'Open cases for legendary items',
      icon: Package,
      href: '/games/cases',
      color: 'purple-epic',
    },
  ]

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, <span className="text-gradient-gold">{user.username}</span>!
          </h1>
          <p className="text-gray-400">Choose your game and start winning</p>
        </div>

        {/* Daily Reward */}
        {canClaim && (
          <Card className="mb-8 border-gold">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Gift className="w-12 h-12 text-gold" />
                  <div>
                    <h3 className="text-xl font-bold">Daily Reward Available!</h3>
                    <p className="text-gray-400">Claim your free 1,000 coins</p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={claimDailyReward}
                  isLoading={isClaiming}
                >
                  <Gift className="w-5 h-5 mr-2" />
                  Claim Reward
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Balance</p>
                  <p className="text-2xl font-bold text-gold">{formatNumber(user.coins)}</p>
                </div>
                <Package className="w-10 h-10 text-gold opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Level</p>
                  <p className="text-2xl font-bold">{user.level}</p>
                </div>
                <Trophy className="w-10 h-10 text-blue-rare opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Experience</p>
                  <p className="text-2xl font-bold">{formatNumber(user.xp)} XP</p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-win opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Games Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Choose Your Game</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {games.map((game) => (
              <Link key={game.href} href={game.href}>
                <Card className="h-full hover:scale-105 transition-transform cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{game.title}</CardTitle>
                      <game.icon className={`w-8 h-8 text-${game.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 mb-4">{game.description}</p>
                    <Button variant="secondary" className="w-full">
                      Play Now
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/leaderboard">
            <Card className="hover:border-gold transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <Trophy className="w-10 h-10 text-gold" />
                <div>
                  <h3 className="font-bold text-lg">Leaderboard</h3>
                  <p className="text-gray-400 text-sm">See top players</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href={`/profile/${user.id}`}>
            <Card className="hover:border-gold transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <Gamepad2 className="w-10 h-10 text-blue-rare" />
                <div>
                  <h3 className="font-bold text-lg">Your Profile</h3>
                  <p className="text-gray-400 text-sm">View stats & history</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
