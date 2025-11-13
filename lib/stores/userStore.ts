import { create } from 'zustand'

interface UserState {
  coins: number
  xp: number
  level: number
  updateCoins: (amount: number) => void
  updateXP: (amount: number) => void
  setUser: (coins: number, xp: number, level: number) => void
}

export const useUserStore = create<UserState>((set) => ({
  coins: 0,
  xp: 0,
  level: 1,
  updateCoins: (amount) => set((state) => ({ coins: state.coins + amount })),
  updateXP: (amount) => set((state) => ({ 
    xp: state.xp + amount,
    level: Math.floor(Math.sqrt((state.xp + amount) / 100))
  })),
  setUser: (coins, xp, level) => set({ coins, xp, level }),
}))