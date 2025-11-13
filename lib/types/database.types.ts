export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type BattleMode = '1v1' | '2v2' | '1v1v1' | '1v1v1v1' | 'crazy'
export type BattleStatus = 'waiting' | 'selecting' | 'active' | 'completed' | 'cancelled'
export type ParticipantType = 'player' | 'bot'

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
          cases_opened: number
          upgrades_success: number
          win_streak: number
          daily_streak: number
          is_admin: boolean
          is_banned: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          coins?: number
          xp?: number
          level?: number
          games_played?: number
          games_won?: number
          cases_opened?: number
          upgrades_success?: number
          win_streak?: number
          daily_streak?: number
          is_admin?: boolean
          is_banned?: boolean
        }
        Update: {
          display_name?: string | null
          avatar_url?: string | null
          coins?: number
          xp?: number
          level?: number
          games_played?: number
          games_won?: number
          cases_opened?: number
          upgrades_success?: number
          win_streak?: number
          daily_streak?: number
        }
      }
      games: {
        Row: {
          id: string
          player_id: string
          type: string
          bet_amount: number
          result: 'win' | 'loss'
          payout: number
          multiplier: number | null
          item_name: string | null
          created_at: string
        }
        Insert: {
          player_id: string
          type: string
          bet_amount: number
          result: 'win' | 'loss'
          payout: number
          multiplier?: number | null
          item_name?: string | null
        }
      }
      items: {
        Row: {
          id: string
          owner_id: string
          name: string
          rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'
          value: number
          image_url: string | null
          created_at: string
        }
        Insert: {
          owner_id: string
          name: string
          rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'
          value: number
          image_url?: string | null
        }
      }
      daily_claims: {
        Row: {
          user_id: string
          last_claimed_at: string
          streak: number
          total_claims: number
          created_at: string
        }
        Insert: {
          user_id: string
          last_claimed_at: string
          streak?: number
          total_claims?: number
        }
        Update: {
          last_claimed_at?: string
          streak?: number
          total_claims?: number
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: 'game_win' | 'game_loss' | 'daily_bonus' | 'admin_adjust' | 'item_sale' | 'item_purchase'
          amount: number
          game_id: string | null
          item_id: string | null
          description: string | null
          metadata: Json
          created_at: string
        }
      }
      messages: {
        Row: {
          id: string
          channel: string
          content: string
          sender_id: string | null
          sender_username: string | null
          recipient_id: string | null
          is_system: boolean
          deleted: boolean
          created_at: string
        }
        Insert: {
          channel?: string
          content: string
          sender_id?: string | null
          sender_username?: string | null
          recipient_id?: string | null
          is_system?: boolean
        }
      }
      cases: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          loot_pool: Json
          times_opened: number
          is_active: boolean
          created_at: string
        }
      }
      case_battles: {
        Row: {
          id: string
          mode: BattleMode
          status: BattleStatus
          max_players: number
          rounds: number
          is_private: boolean
          join_code: string | null
          allow_bots: boolean
          creator_id: string
          created_at: string
          started_at: string | null
          completed_at: string | null
          winner_id: string | null
          winner_type: ParticipantType | null
          battle_results: Json
        }
      }
      battle_participants: {
        Row: {
          id: string
          battle_id: string
          user_id: string | null
          participant_type: ParticipantType
          bot_name: string | null
          bot_difficulty: string | null
          team: number
          slot: number
          selected_cases: Json
          total_investment: number
          total_value: number
          items_won: Json
          profit: number
          joined_at: string
          ready: boolean
        }
      }
      achievements: {
        Row: {
          id: string
          key: string
          name: string
          description: string
          requirement_type: string
          requirement_value: number
          xp_reward: number
          coin_reward: number
          rarity: string
          icon: string | null
          created_at: string
        }
      }
      user_achievements: {
        Row: {
          user_id: string
          achievement_id: string
          unlocked_at: string
          progress: number
        }
      }
    }
    Views: {
      leaderboard_coins: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          coins: number
          level: number
          rank: number
        }
      }
      leaderboard_xp: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          xp: number
          level: number
          rank: number
        }
      }
      leaderboard_winrate: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          games_played: number
          games_won: number
          level: number
          win_rate: number
          rank: number
        }
      }
    }
  }
}
