import { NextApiRequest, NextApiResponse } from 'next'

const rarityValues: Record<string, { min: number; max: number }> = {
  common: { min: 50, max: 200 },
  uncommon: { min: 200, max: 500 },
  rare: { min: 500, max: 1500 },
  epic: { min: 1500, max: 5000 },
  legendary: { min: 5000, max: 15000 },
  mythic: { min: 15000, max: 50000 },
}

const weaponTypes = ['AK-47', 'M4A4', 'AWP', 'Desert Eagle', 'Glock-18', 'USP-S', 'P90', 'MP9']
const skinNames = ['Dragon Lore', 'Fade', 'Asiimov', 'Hypnotic', 'Redline', 'Neon Revolution', 'Howl', 'Fire Serpent']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { rarity } = req.body

    if (!rarity || !rarityValues[rarity]) {
      return res.status(400).json({ error: 'Invalid rarity' })
    }

    const weapon = weaponTypes[Math.floor(Math.random() * weaponTypes.length)]
    const skin = skinNames[Math.floor(Math.random() * skinNames.length)]
    const name = `${weapon} | ${skin}`

    const { min, max } = rarityValues[rarity]
    const marketValue = Math.floor(Math.random() * (max - min + 1)) + min

    const loot = {
      name,
      description: `A ${rarity} ${weapon} with ${skin} finish`,
      rarity,
      image_url: '/assets/items/default.png',
      market_value: marketValue,
      base_value: marketValue,
      traits: {
        weapon_type: weapon,
        skin_name: skin,
      },
    }

    return res.status(200).json({
      success: true,
      loot,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}