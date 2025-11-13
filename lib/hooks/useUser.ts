'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useUserStore } from '@/lib/stores/userStore'

export function useUser() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { coins: storeCoins, xp: storeXp, level: storeLevel, setUser: setStoreUser } = useUserStore()

  useEffect(() => {
    loadUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Sync local user state with Zustand store changes
  useEffect(() => {
    if (user && (user.coins !== storeCoins || user.xp !== storeXp || user.level !== storeLevel)) {
      setUser({ ...user, coins: storeCoins, xp: storeXp, level: storeLevel })
    }
  }, [storeCoins, storeXp, storeLevel])

  const loadUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setUser(null)
        setIsLoading(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (userData) {
        setUser(userData)
        setStoreUser(userData.coins, userData.xp, userData.level)
      }
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUser = async () => {
    await loadUser()
  }

  const updateCoins = (newCoins: number) => {
    if (user) {
      setUser({ ...user, coins: newCoins })
      setStoreUser(newCoins, user.xp, user.level)
    }
  }

  const updateUser = (updates: Partial<any>) => {
    if (user) {
      const updatedUser = { ...user, ...updates }
      setUser(updatedUser)
      setStoreUser(updatedUser.coins, updatedUser.xp, updatedUser.level)
    }
  }

  return { user, isLoading, refreshUser, updateCoins, updateUser }
}