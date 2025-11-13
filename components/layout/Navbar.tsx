'use client'

import Link from 'next/link'
import { useUser } from '@/lib/hooks/useUser'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Coins, User, LogOut, Shield } from 'lucide-react'
import { formatNumber } from '@/lib/utils/formatters'
import { useRouter } from 'next/navigation'

export function Navbar() {
  const { user } = useUser()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav className="glass border-b border-game-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-bold text-gradient-gold">
            CS2 LootHub
          </Link>

          {user && (
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-game-card px-4 py-2 rounded-lg">
                <Coins className="w-5 h-5 text-gold" />
                <span className="font-bold text-gold">{formatNumber(user.coins)}</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">Level {user.level}</span>
              </div>

              {user.is_admin && (
                <Link href="/admin">
                  <Button variant="secondary" size="sm">
                    <Shield className="w-4 h-4" />
                  </Button>
                </Link>
              )}

              <Link href={`/profile/${user.id}`}>
                <Button variant="secondary" size="sm">
                  <User className="w-4 h-4" />
                </Button>
              </Link>

              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}