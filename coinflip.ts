import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase/client'
import { ProvablyFairRNG } from '@/lib/utils/rng'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, betAmount, choice, clientSeed } = req.body

    if (!userId || !betAmount || !choice) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!user || user.coins < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    const rng = new ProvablyFairRNG(clientSeed)
    const result = rng.generateNumber(0, 1) === 0 ? 'heads' : 'tails'
    const won = result === choice

    const multiplier = won ? 2 : 0
    const profit = won ? betAmount : -betAmount
    const newCoins = user.coins + profit
    const xpEarned = Math.floor(betAmount * 0.1)

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
      type: 'coinflip',
      outcome: won ? 'win' : 'loss',
      player_id: userId,
      bet_amount: betAmount,
      multiplier,
      profit,
      game_data: { choice, result },
      server_seed: rng.getSeeds().serverSeed,
      client_seed: clientSeed,
      xp_earned: xpEarned,
    })

    return res.status(200).json({
      success: true,
      result,
      won,
      profit,
      newBalance: newCoins,
      seeds: rng.getSeeds(),
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}