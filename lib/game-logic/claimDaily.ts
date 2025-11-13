import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body

    const { data: claim } = await supabaseAdmin
      .from('daily_claims')
      .select('*')
      .eq('user_id', userId)
      .single()

    const now = new Date()
    const baseReward = 500

    if (claim) {
      const lastClaim = new Date(claim.last_claimed_at)
      const hoursSince = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60)

      if (hoursSince < 20) {
        return res.status(400).json({ error: 'Already claimed today' })
      }

      const newStreak = hoursSince < 48 ? claim.streak + 1 : 1
      const reward = baseReward * newStreak

      await supabaseAdmin
        .from('daily_claims')
        .update({
          last_claimed_at: now.toISOString(),
          streak: newStreak,
          total_claims: claim.total_claims + 1,
        })
        .eq('user_id', userId)

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('coins')
        .eq('id', userId)
        .single()

      await supabaseAdmin
        .from('users')
        .update({ coins: user!.coins + reward })
        .eq('id', userId)

      await supabaseAdmin.from('transactions').insert({
        type: 'daily_bonus',
        amount: reward,
        user_id: userId,
        description: `Daily bonus - Streak ${newStreak}`,
      })

      return res.status(200).json({
        success: true,
        reward,
        streak: newStreak,
      })
    } else {
      const reward = baseReward

      await supabaseAdmin.from('daily_claims').insert({
        user_id: userId,
        last_claimed_at: now.toISOString(),
        streak: 1,
        total_claims: 1,
      })

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('coins')
        .eq('id', userId)
        .single()

      await supabaseAdmin
        .from('users')
        .update({ coins: user!.coins + reward })
        .eq('id', userId)

      return res.status(200).json({
        success: true,
        reward,
        streak: 1,
      })
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}