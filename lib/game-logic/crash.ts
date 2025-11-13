import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase/client'
import { ProvablyFairRNG } from '@/lib/utils/rng'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, betAmount, cashoutMultiplier, clientSeed } = req.body

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!user || user.coins < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    const rng = new ProvablyFairRNG(clientSeed)
    const crashPoint = Math.max(1.0, 1 + rng.generateFloat() * 9)

    const won = cashoutMultiplier <= crashPoint
    const profit = won 
      ? Math.floor(betAmount * (cashoutMultiplier - 1))
      : -betAmount

    const newCoins = user.coins + profit
    const xpEarned = Math.floor(betAmount * cashoutMultiplier * 0.1)

    await supabaseAdmin
      .from('users')
      .update({
        coins: newCoins,
        xp: user.xp + xpEarned,
        games_played: user.games_played + 1,
        games_won: won ? user.games_won + 1 : user.games_won,
        win_streak: won ? user.win_streak + 1 : 0,
      })
      .eq('id', userId)

    await supabaseAdmin.from('games').insert({
      type: 'crash',
      outcome: won ? 'win' : 'loss',
      player_id: userId,
      bet_amount: betAmount,
      multiplier: cashoutMultiplier,
      profit,
      game_data: { crash_point: crashPoint, cashout: cashoutMultiplier },
      server_seed: rng.getSeeds().serverSeed,
      client_seed: clientSeed,
      xp_earned: xpEarned,
    })

    return res.status(200).json({
      success: true,
      crashPoint: Number(crashPoint.toFixed(2)),
      won,
      profit,
      newBalance: newCoins,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}