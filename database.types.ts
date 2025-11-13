export type Json =
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
}